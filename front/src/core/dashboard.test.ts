import { describe, test } from "vitest";
import {
	Dashboard,
	type DashboardState,
	type GlucoseValue,
	type Stream,
} from "./dashboard";
import { fromDate, TimePresets, type TimeRange, timestamp } from "./timeRange";

describe("Dashboard", () => {
	type Params = {
		values?: { time: Date; glucose: number }[];
		watch?: (r: TimeRange) => Stream<GlucoseValue[]>;
	};

	const emptyWatch = () => {
		return {
			subscribe: () => {
				return () => {};
			},
		};
	};

	const makeFakeRepo = ({ values, watch }: Params) => {
		const listeners = new Set<(v: GlucoseValue[]) => void>();
		const watchFn =
			watch ??
			(() => {
				return {
					subscribe: (cb: (v: GlucoseValue[]) => void) => {
						listeners.add(cb);
						return () => {};
					},
				};
			});

		let repoValues = (values ?? []).map(({ time, glucose }) => ({
			timestamp: fromDate(time),
			glucose,
		}));
		return {
			updateValues(values: GlucoseValue[]) {
				repoValues = values;
				for (const l of listeners) {
					l(repoValues);
				}
			},
			repo: {
				async fetch(_range: TimeRange) {
					return repoValues;
				},
				watch: watchFn,
			},
		};
	};

	test("call repository when loading data", async ({ expect }) => {
		const { repo } = makeFakeRepo({
			values: [
				{ time: new Date("2026-01-01T08:00:00.000Z"), glucose: 80 },
				{ time: new Date("2026-01-01T12:00:00.000Z"), glucose: 120 },
				{ time: new Date("2026-01-01T20:00:00.000Z"), glucose: 90 },
			],
		});
		const dashboard = new Dashboard(repo);

		const end = fromDate(new Date("2026-01-02T12:00:00.000Z"));
		await dashboard.loadData({ end });

		const glucose = dashboard.glucoseValues();
		expect(glucose).toHaveLength(3);
		expect(glucose[0]).toMatchObject({
			timestamp: fromDate(new Date("2026-01-01T08:00:00.000Z")),
			glucose: 80,
		});
	});

	test("default preset is last24hours", async ({ expect }) => {
		let timeRange: TimeRange | undefined;
		const repo = {
			async fetch(range: TimeRange) {
				timeRange = range;
				return [];
			},
			watch: emptyWatch,
		};
		const dashboard = new Dashboard(repo);

		const end = fromDate(new Date("2026-01-01T12:00:00.000Z"));
		await dashboard.loadData({ end });
		expect(timeRange).toMatchObject({
			from: fromDate(new Date("2025-12-31T12:00:00.000Z")),
			to: end,
		});
	});

	test("when provided preset given is used for loading data", async ({
		expect,
	}) => {
		let timeRange: TimeRange | undefined;
		const repo = {
			async fetch(range: TimeRange) {
				timeRange = range;
				return [];
			},
			watch: emptyWatch,
		};
		const dashboard = new Dashboard(repo);

		const end = fromDate(new Date("2026-01-01T22:00:00.000Z"));
		await dashboard.loadData({ window: TimePresets.Last12Hours, end });
		expect(timeRange).toMatchObject({
			from: fromDate(new Date("2026-01-01T10:00:00.000Z")),
		});
		await dashboard.loadData({ window: TimePresets.Last6Hours, end });
		expect(timeRange).toMatchObject({
			from: fromDate(new Date("2026-01-01T16:00:00.000Z")),
			to: end,
		});
	});

	test("reload data when changing time window", async ({ expect }) => {
		const { repo, updateValues } = makeFakeRepo({
			values: [
				{ time: new Date("2026-01-01T12:00:00.000Z"), glucose: 80 },
				{ time: new Date("2026-01-01T20:00:00.000Z"), glucose: 110 },
			],
		});
		const dashboard = new Dashboard(repo);

		const end = fromDate(new Date("2026-01-02T12:00:00.000Z"));
		await dashboard.loadData({ end });
		expect(dashboard.glucoseValues()).toHaveLength(2);

		updateValues([{ timestamp: timestamp(1655456464), glucose: 75 }]);

		await dashboard.updateEnd(timestamp(165545699));
		expect(dashboard.glucoseValues()).toHaveLength(1);
	});

	test("does not reload data if end does not change", async ({ expect }) => {
		let timeRange: TimeRange | undefined;
		const repo = {
			async fetch(range: TimeRange) {
				timeRange = range;
				return [];
			},
			watch: emptyWatch,
		};
		const dashboard = new Dashboard(repo);

		const end = fromDate(new Date("2026-01-02T12:00:00.000Z"));

		await dashboard.loadData({ end });
		const firstCall = timeRange;

		await dashboard.updateEnd(end);

		expect(timeRange).toEqual(firstCall);
	});

	test("keeps selected window when updating end", async ({ expect }) => {
		let timeRange: TimeRange | undefined;
		const repo = {
			async fetch(range: TimeRange) {
				timeRange = range;
				return [];
			},
			watch: emptyWatch,
		};
		const dashboard = new Dashboard(repo);

		const end1 = fromDate(new Date("2026-01-02T12:00:00.000Z"));
		const end2 = fromDate(new Date("2026-01-02T18:00:00.000Z"));

		await dashboard.loadData({ window: TimePresets.Last6Hours, end: end1 });
		await dashboard.updateEnd(end2);

		expect(timeRange).toMatchObject({
			from: fromDate(new Date("2026-01-02T12:00:00.000Z")),
			to: end2,
		});
	});

	test("initial snapshot is idle and empty", async ({ expect }) => {
		const repo = {
			async fetch(_range: TimeRange) {
				return [];
			},
			watch: emptyWatch,
		};

		const dashboard = new Dashboard(repo);
		const snapshot = dashboard.getSnapshot();
		expect(snapshot).toEqual({ status: "idle", values: [] });
	});

	test("subscribe receives immediate snapshot", ({ expect }) => {
		const repo = {
			async fetch(_range: TimeRange) {
				return [];
			},
			watch: emptyWatch,
		};
		const dashboard = new Dashboard(repo);

		const received: DashboardState[] = [];
		dashboard.subscribe((s) => received.push(s));

		expect(received).toHaveLength(1);
		expect(received[0].status).toBe("idle");
		expect(received[0].values).toEqual([]);
	});

	test("dashboard emits loading and ready snapshots when repo pushes", ({
		expect,
	}) => {
		const { repo, updateValues } = makeFakeRepo({});
		const dashboard = new Dashboard(repo);

		const snapshots: DashboardState[] = [];
		dashboard.subscribe((s) => snapshots.push(s));

		dashboard.connect({
			from: timestamp(0),
			to: timestamp(12223344),
		});

		expect(snapshots[1].status).toBe("loading");

		const values: GlucoseValue[] = [
			{ timestamp: timestamp(10), glucose: 80 },
			{ timestamp: timestamp(20), glucose: 100 },
		];
		// simulate push
		updateValues(values);

		expect(snapshots[snapshots.length - 1]).toMatchObject({
			status: "ready",
			values,
		});
	});

	test("snapshot always replaces previous values, no accumulation", ({
		expect,
	}) => {
		const { repo, updateValues } = makeFakeRepo({});
		const dashboard = new Dashboard(repo);

		const snapshots: DashboardState[] = [];
		dashboard.subscribe((s) => snapshots.push(s));

		dashboard.connect({ from: timestamp(0), to: timestamp(2) });

		updateValues([{ timestamp: timestamp(1), glucose: 80 }]);
		updateValues([
			{ timestamp: timestamp(1), glucose: 80 },
			{ timestamp: timestamp(2), glucose: 90 },
		]);
		updateValues([{ timestamp: timestamp(2), glucose: 90 }]);

		const last = snapshots[snapshots.length - 1];
		expect(last.values).toEqual([{ timestamp: timestamp(2), glucose: 90 }]);
	});

	test("unsubscribe stops receiving updates", ({ expect }) => {
		const { repo, updateValues } = makeFakeRepo({});
		const dashboard = new Dashboard(repo);

		const snapshots: DashboardState[] = [];
		const unsub = dashboard.subscribe((s) => snapshots.push(s));

		dashboard.connect({ from: timestamp(1), to: timestamp(2) });

		updateValues([{ timestamp: timestamp(1), glucose: 80 }]);
		unsub();
		updateValues([{ timestamp: timestamp(2), glucose: 90 }]);

		const last = snapshots[snapshots.length - 1];
		// should not include the last push after unsubscribe
		expect(last.values).toEqual([{ timestamp: timestamp(1), glucose: 80 }]);
	});

	test("when loading data the end is the end of the provided range", async ({
		expect,
	}) => {
		const { repo } = makeFakeRepo({});
		const dashboard = new Dashboard(repo);

		await dashboard.loadData({ end: timestamp(1234) });
		expect(dashboard.getEnd()).toEqual(timestamp(1234));

		await dashboard.loadData({ end: timestamp(123) });
		expect(dashboard.getEnd()).toEqual(123);
	});

	test("the end is updated to the connect range end when connecting", async ({
		expect,
	}) => {
		const { repo } = makeFakeRepo({});
		const dashboard = new Dashboard(repo);

		await dashboard.loadData({ end: timestamp(1234) });
		expect(dashboard.getEnd()).toEqual(timestamp(1234));

		dashboard.connect({ to: timestamp(456), from: timestamp(0) });
		expect(dashboard.getEnd()).toEqual(timestamp(456));
	});

	test("when updating the end, the end is updated", async ({ expect }) => {
		const { repo } = makeFakeRepo({});
		const dashboard = new Dashboard(repo);

		await dashboard.loadData({ end: timestamp(1234) });
		expect(dashboard.getEnd()).toEqual(timestamp(1234));

		dashboard.updateEnd(timestamp(1));
		expect(dashboard.getEnd()).toEqual(timestamp(1));
	});
});
