import { describe, test } from "vitest";
import { Dashboard } from "./dashboard";
import { fromDate, TimePresets, type TimeRange, timestamp } from "./timeRange";

describe("Dashboard", () => {
	const getFakeRepo = (...values: { time: Date; glucose: number }[]) => {
		return {
			values: values.map(({ time, glucose }) => ({
				timestamp: timestamp(time.getTime()),
				glucose,
			})),
			async getGlucoseValues(_range: TimeRange) {
				return this.values;
			},
		};
	};

	test("call repository when loading data", async ({ expect }) => {
		const repo = getFakeRepo(
			{ time: new Date("2026-01-01T08:00:00.000Z"), glucose: 80 },
			{ time: new Date("2026-01-01T12:00:00.000Z"), glucose: 120 },
			{ time: new Date("2026-01-01T20:00:00.000Z"), glucose: 90 },
		);
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
			async getGlucoseValues(range: TimeRange) {
				timeRange = range;
				return [];
			},
		};
		const dashboard = new Dashboard(repo);

		const end = fromDate(new Date("2026-01-01T12:00:00.000Z"));
		await dashboard.loadData({ end });
		expect(timeRange).toMatchObject({
			start: fromDate(new Date("2025-12-31T12:00:00.000Z")),
			end,
		});
	});

	test("when provided preset given is used for loading data", async ({
		expect,
	}) => {
		let timeRange: TimeRange | undefined;
		const repo = {
			async getGlucoseValues(range: TimeRange) {
				timeRange = range;
				return [];
			},
		};
		const dashboard = new Dashboard(repo);

		const end = fromDate(new Date("2026-01-01T22:00:00.000Z"));
		await dashboard.loadData({ window: TimePresets.Last12Hours, end });
		expect(timeRange).toMatchObject({
			start: fromDate(new Date("2026-01-01T10:00:00.000Z")),
		});
		await dashboard.loadData({ window: TimePresets.Last6Hours, end });
		expect(timeRange).toMatchObject({
			start: fromDate(new Date("2026-01-01T16:00:00.000Z")),
			end,
		});
	});

	test("reload data when changing time window", async ({ expect }) => {
		const repo = getFakeRepo(
			{ time: new Date("2026-01-01T12:00:00.000Z"), glucose: 80 },
			{ time: new Date("2026-01-01T20:00:00.000Z"), glucose: 110 },
		);
		const dashboard = new Dashboard(repo);

		const end = fromDate(new Date("2026-01-02T12:00:00.000Z"));
		await dashboard.loadData({ end });
		expect(dashboard.glucoseValues()).toHaveLength(2);

		repo.values = [{ timestamp: timestamp(1655456464), glucose: 75 }];

		await dashboard.updateEnd(timestamp(165545699));
		expect(dashboard.glucoseValues()).toHaveLength(1);
	});

	test("does not reload data if end does not change", async ({ expect }) => {
		let timeRange: TimeRange | undefined;
		const repo = {
			async getGlucoseValues(range: TimeRange) {
				timeRange = range;
				return [];
			},
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
			async getGlucoseValues(range: TimeRange) {
				timeRange = range;
				return [];
			},
		};
		const dashboard = new Dashboard(repo);

		const end1 = fromDate(new Date("2026-01-02T12:00:00.000Z"));
		const end2 = fromDate(new Date("2026-01-02T18:00:00.000Z"));

		await dashboard.loadData({ window: TimePresets.Last6Hours, end: end1 });
		await dashboard.updateEnd(end2);

		expect(timeRange).toMatchObject({
			start: fromDate(new Date("2026-01-02T12:00:00.000Z")),
			end: end2,
		});
	});
});
