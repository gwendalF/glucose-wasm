import { GapHandler, type GapManager } from "@domain/GapManager";
import type { LocalStore } from "@domain/GlucoseStore";
import { RangeSet } from "@domain/RangeSet";
import { type TimeRange, timestamp } from "@domain/TimeRange";
import { describe, test, vi } from "vitest";
import { GlucoseSyncer } from "./GlucoseSyncer";

describe("GlucoseSyncer", ({ beforeEach }) => {
	let gapManager: GapManager;
	let rangeSetFactory: (knownRanges: TimeRange[]) => RangeSet;
	const subscribe = () => {
		return () => {};
	};

	let store: LocalStore;

	beforeEach(() => {
		// Always same range
		gapManager = new GapHandler(timestamp(Number.MAX_VALUE));
		rangeSetFactory = (knowns: TimeRange[]) => {
			return new RangeSet(knowns, timestamp(0));
		};

		store = {
			async getKnownRanges() {
				return [];
			},
			async addMeasurements() {},
			async addRanges() {},
			async loadMeasurements() {
				return [];
			},
			subscribe,
			async mean() {
				return 0;
			},
		};
	});

	test("does not fetch if all data is already local", async ({ expect }) => {
		const range = { from: timestamp(0), to: timestamp(100) };

		store.getKnownRanges = async () => {
			return [range];
		};

		const source = {
			fetchMeasurements: vi.fn(),
		};

		const service = new GlucoseSyncer(
			store,
			source,
			gapManager,
			rangeSetFactory,
		);
		await service.fetchMissing(range);

		expect(source.fetchMeasurements).not.toHaveBeenCalled();
	});

	test("fetch data from source if not present", async ({ expect }) => {
		const range = { from: timestamp(0), to: timestamp(100) };

		const source = {
			fetchMeasurements: vi.fn(async () => {
				return { values: [], hasMore: false };
			}),
		};

		const service = new GlucoseSyncer(
			store,
			source,
			gapManager,
			rangeSetFactory,
		);
		await service.fetchMissing(range);

		expect(source.fetchMeasurements).toHaveBeenCalled();
	});

	test("fetches only missing ranges", async ({ expect }) => {
		const requested = { from: timestamp(0), to: timestamp(100) };
		store.getKnownRanges = async () => {
			return [
				{ from: timestamp(0), to: timestamp(20) },
				{ from: timestamp(50), to: timestamp(70) },
			];
		};

		const source = {
			fetchMeasurements: vi.fn(async () => {
				return { values: [], hasMore: false };
			}),
		};
		const service = new GlucoseSyncer(
			store,
			source,
			gapManager,
			(knowns) => new RangeSet(knowns, timestamp(0)),
		);
		await service.fetchMissing(requested);

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
		expect(source.fetchMeasurements).toHaveBeenCalledWith({
			from: timestamp(20),
			to: timestamp(50),
		});
		expect(source.fetchMeasurements).toHaveBeenCalledWith({
			from: timestamp(70),
			to: timestamp(100),
		});
	});

	test("when server respond with hasMore, keep polling", async ({ expect }) => {
		const requested = { from: timestamp(0), to: timestamp(100) };

		const source = {
			fetchMeasurements: vi
				.fn()
				.mockResolvedValueOnce({
					values: [
						{ timestamp: timestamp(50), glucose: 80 },
						{ timestamp: timestamp(80), glucose: 90 },
					],
					hasMore: true,
				})
				.mockResolvedValueOnce({ values: [], hasMore: false }),
		};
		const service = new GlucoseSyncer(
			store,
			source,
			gapManager,
			rangeSetFactory,
		);
		await service.fetchMissing(requested);

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
		expect(source.fetchMeasurements).toHaveBeenCalledWith({
			from: timestamp(0),
			to: timestamp(100),
		});
		expect(source.fetchMeasurements).toHaveBeenCalledWith({
			from: timestamp(81),
			to: timestamp(100),
		});
	});

	test("stop fetching when gapManager does not return cursor or cursor after requested range", async ({
		expect,
	}) => {
		const to = timestamp(100);
		const requested = { from: timestamp(0), to };

		const source = {
			fetchMeasurements: vi
				.fn()
				.mockResolvedValue({ values: [], hasMore: false }),
		};

		const gapManagerMock = {
			computeCoveredRange: vi
				.fn()
				.mockReturnValueOnce({
					coveredRanges: [{ from: timestamp(0), to: timestamp(9) }],
					nextCursor: timestamp(10),
				})
				.mockReturnValue({
					coveredRanges: [],
				}),
		};

		const service = new GlucoseSyncer(
			store,
			source,
			gapManagerMock,
			rangeSetFactory,
		);
		await service.fetchMissing(requested);
		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);

		source.fetchMeasurements.mockClear();
		gapManagerMock.computeCoveredRange = vi.fn().mockReturnValue({
			coveredRanges: [{ from: timestamp(0), to: timestamp(10) }],
			nextCursor: to,
		});

		const serviceSameCursor = new GlucoseSyncer(
			store,
			source,
			gapManagerMock,
			rangeSetFactory,
		);
		await serviceSameCursor.fetchMissing(requested);
		expect(source.fetchMeasurements).toHaveBeenCalledOnce();
	});

	test("deduplicate requests for same range", async ({ expect }) => {
		const requested = { from: timestamp(0), to: timestamp(100) };

		const source = {
			fetchMeasurements: vi.fn().mockResolvedValueOnce({
				values: [],
				hasMore: false,
			}),
		};
		const service = new GlucoseSyncer(
			store,
			source,
			gapManager,
			rangeSetFactory,
		);

		const request1 = service.fetchMissing(requested);
		const request2 = service.fetchMissing(requested);
		await Promise.all([request1, request2]);

		expect(source.fetchMeasurements).toHaveBeenCalledOnce();
	});

	test("allow to refetch same range after the first call is finished", async ({
		expect,
	}) => {
		const requested = { from: timestamp(0), to: timestamp(100) };

		const source = {
			fetchMeasurements: vi.fn().mockResolvedValue({
				values: [],
				hasMore: false,
			}),
		};
		const service = new GlucoseSyncer(
			store,
			source,
			gapManager,
			rangeSetFactory,
		);

		await service.fetchMissing(requested);
		await service.fetchMissing(requested);

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
	});

	test("can fetch different ranges at the same time", async ({ expect }) => {
		const source = {
			fetchMeasurements: vi.fn().mockResolvedValue({
				values: [],
				hasMore: false,
			}),
		};
		const service = new GlucoseSyncer(
			store,
			source,
			gapManager,
			rangeSetFactory,
		);

		const p1 = service.fetchMissing({ from: timestamp(0), to: timestamp(100) });
		const p2 = service.fetchMissing({
			from: timestamp(10),
			to: timestamp(200),
		});
		await Promise.all([p1, p2]);

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
	});

	test("call the gapManager with the range corresponding of the missing range", async ({
		expect,
	}) => {
		const hasMore = false;
		const source = {
			fetchMeasurements: vi.fn().mockResolvedValue({
				values: [],
				hasMore,
			}),
		};

		const gapSpy = vi.spyOn(gapManager, "computeCoveredRange");
		const service = new GlucoseSyncer(
			store,
			source,
			gapManager,
			rangeSetFactory,
		);

		const timeRequest = { from: timestamp(0), to: timestamp(100) };
		await service.fetchMissing(timeRequest);
		expect(gapSpy).toHaveBeenCalledWith([], timeRequest, hasMore);
	});

	test("only call addRanges when there are actually some ranges not covered", async ({
		expect,
	}) => {
		const source = {
			async fetchMeasurements() {
				return {
					hasMore: false,
					values: [
						{ timestamp: timestamp(100), glucose: 80 },
						{ timestamp: timestamp(200), glucose: 90 },
					],
				};
			},
		};

		const addRangesMock = vi.fn();
		store.addRanges = addRangesMock;

		const service = new GlucoseSyncer(
			store,
			source,
			gapManager,
			(knownRanges: TimeRange[]) => {
				return {
					consolidate(toAdd: TimeRange[]) {
						return [...knownRanges, ...toAdd];
					},
					resolveMissingRanges(requested: TimeRange) {
						return [requested];
					},
				};
			},
		);

		const timeRequest = { from: timestamp(0), to: timestamp(100) };
		await service.fetchMissing(timeRequest);
		expect(addRangesMock).toHaveBeenCalledOnce();
		addRangesMock.mockClear();

		const serviceWihtoutConsolidate = new GlucoseSyncer(
			store,
			source,
			gapManager,
			() => {
				return {
					consolidate() {
						return [];
					},
					resolveMissingRanges(requested: TimeRange) {
						return [requested];
					},
				};
			},
		);
		await serviceWihtoutConsolidate.fetchMissing(timeRequest);
		expect(addRangesMock).not.toHaveBeenCalled();
	});

	test("does not call addMeasurements if fetch returns empty", async ({
		expect,
	}) => {
		const requested = { from: timestamp(0), to: timestamp(50) };
		let addMeasurementsCalled = false;

		const store = {
			async getKnownRanges() {
				return [];
			},
			async addMeasurements() {
				addMeasurementsCalled = true;
			},
			async addRanges() {},
			loadMeasurements: vi.fn(),
			subscribe,
			mean: vi.fn(),
		};

		let firstCall = true;
		const source = {
			async fetchMeasurements(_range: TimeRange) {
				if (firstCall) {
					firstCall = false;
					return { values: [], hasMore: false }; // no data
				}

				return {
					values: [{ timestamp: timestamp(25), glucose: 80 }],
					hasMore: false,
				}; // some data
			},
		};

		const syncer = new GlucoseSyncer(
			store,
			source,
			gapManager,
			rangeSetFactory,
		);
		await syncer.fetchMissing(requested);

		expect(addMeasurementsCalled).toBe(false);
		await syncer.fetchMissing(requested); // with some data calls addMeasurements
		expect(addMeasurementsCalled).toBe(true);
	});
});
