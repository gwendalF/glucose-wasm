import type { GlucoseValue } from "@domain/GlucoseValue";
import {
	inferCoveredRanges,
	type TimeRange,
	timestamp,
} from "@domain/TimeRange";
import { describe, expect, test, vi } from "vitest";
import { GlucoseSyncer } from "./GlucoseSyncer";

describe("GlucoseSyncer", () => {
	const alwaysContinuous = (values: GlucoseValue[], range: TimeRange) => {
		return inferCoveredRanges(values, range, timestamp(Number.MAX_VALUE));
	};
	const subscribe = () => {
		return () => {};
	};

	test("does not fetch if all data is already local", async ({ expect }) => {
		const range = { from: timestamp(0), to: timestamp(100) };

		const store = {
			async getKnownRanges() {
				return [range];
			},
			async addMeasurements() {},
			async loadMeasurements() {
				return [];
			},
			async addRanges() {},
			subscribe,
		};

		const source = {
			fetchMeasurements: vi.fn(),
		};

		const service = new GlucoseSyncer(store, source, alwaysContinuous);
		await service.fetchMissing(range);

		expect(source.fetchMeasurements).not.toHaveBeenCalled();
	});

	test("fetch data from source if not present", async ({ expect }) => {
		const range = { from: timestamp(0), to: timestamp(100) };

		const store = {
			async getKnownRanges() {
				return [];
			},
			async addMeasurements() {},
			async addRanges() {},
			loadMeasurements: vi.fn(),
			subscribe,
		};

		const source = {
			fetchMeasurements: vi.fn(async () => {
				return { values: [], hasMore: false };
			}),
		};

		const service = new GlucoseSyncer(store, source, alwaysContinuous);
		await service.fetchMissing(range);

		expect(source.fetchMeasurements).toHaveBeenCalled();
	});

	test("fetches only missing ranges", async ({ expect }) => {
		const requested = { from: timestamp(0), to: timestamp(100) };
		const store = {
			async getKnownRanges() {
				return [
					{ from: timestamp(0), to: timestamp(20) },
					{ from: timestamp(50), to: timestamp(70) },
				];
			},
			async addMeasurements() {},
			async addRanges() {},
			async loadMeasurements() {
				return [];
			},
			subscribe,
		};

		const source = {
			fetchMeasurements: vi.fn(async () => {
				return { values: [], hasMore: false };
			}),
		};
		const service = new GlucoseSyncer(store, source, alwaysContinuous);
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

	test("adds measurements and ranges to repo after fetching missing ranges", async ({
		expect,
	}) => {
		const requested = { from: timestamp(0), to: timestamp(100) };
		const addedRanges: TimeRange[] = [];
		const store = {
			async getKnownRanges() {
				return [
					{ from: timestamp(0), to: timestamp(20) },
					{ from: timestamp(50), to: timestamp(70) },
				];
			},
			addMeasurements: vi.fn(),
			async addRanges(ranges: TimeRange[]) {
				addedRanges.push(...ranges);
			},
			loadMeasurements: vi.fn(),
			subscribe,
		};

		const source = {
			async fetchMeasurements(range: TimeRange) {
				return {
					values: [
						{ timestamp: timestamp(range.from), glucose: 80 },
						{ timestamp: timestamp(range.to), glucose: 90 },
					],
					hasMore: false,
				};
			},
		};

		const syncer = new GlucoseSyncer(store, source, alwaysContinuous);
		await syncer.fetchMissing(requested);

		expect(store.addMeasurements).toHaveBeenCalledTimes(2);
		expect(store.addMeasurements).toHaveBeenCalledWith([
			{ timestamp: timestamp(20), glucose: 80 },
			{ timestamp: timestamp(50), glucose: 90 },
		]);
		expect(store.addMeasurements).toHaveBeenCalledWith([
			{ timestamp: timestamp(70), glucose: 80 },
			{ timestamp: timestamp(100), glucose: 90 },
		]);

		expect(addedRanges).toContainEqual({
			from: timestamp(20),
			to: timestamp(50),
		});
		expect(addedRanges).toContainEqual({
			from: timestamp(70),
			to: timestamp(100),
		});
	});

	test("only adds continuous ranges of measurements to the store", async ({
		expect,
	}) => {
		const requested = { from: timestamp(0), to: timestamp(50) };
		const addedRanges: TimeRange[] = [];
		const addedValues: GlucoseValue[] = [];

		const store = {
			async getKnownRanges() {
				return [];
			},
			async addMeasurements(values: GlucoseValue[]) {
				addedValues.push(...values);
			},
			async addRanges(ranges: TimeRange[]) {
				addedRanges.push(...ranges);
			},
			loadMeasurements: vi.fn(),
			subscribe,
		};

		const source = {
			async fetchMeasurements() {
				return {
					values: [
						{ timestamp: timestamp(22), glucose: 80 },
						{ timestamp: timestamp(25), glucose: 80 },
						{ timestamp: timestamp(31), glucose: 80 }, // discontinuous
						{ timestamp: timestamp(48), glucose: 80 },
					],
					hasMore: false,
				};
			},
		};

		const service = new GlucoseSyncer(
			store,
			source,
			(values: GlucoseValue[], range: TimeRange) => {
				return inferCoveredRanges(values, range, timestamp(5));
			},
		);
		await service.fetchMissing(requested);

		expect(addedRanges).not.toEqual([
			{ from: timestamp(0), to: timestamp(100) },
		]);

		expect(addedRanges).toEqual([
			{ from: timestamp(22), to: timestamp(25) },
			{ from: timestamp(31), to: timestamp(31) },
			{ from: timestamp(48), to: timestamp(48) },
		]);
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
		};

		const source = {
			async fetchMeasurements(_range: TimeRange) {
				return { values: [], hasMore: false }; // no data
			},
		};

		const syncer = new GlucoseSyncer(store, source, alwaysContinuous);
		await syncer.fetchMissing(requested);

		expect(addMeasurementsCalled).toBe(false);
	});

	test("does not call addRanges if inferCoveredRanges returns empty", async ({
		expect,
	}) => {
		const requested = { from: timestamp(0), to: timestamp(50) };
		let addRangesCalled = false;

		const store = {
			async getKnownRanges() {
				return [];
			},
			async addMeasurements() {},
			async addRanges() {
				addRangesCalled = true;
			},
			loadMeasurements: vi.fn(),
			subscribe,
		};

		const source = {
			async fetchMeasurements(_range: TimeRange) {
				return {
					values: [{ timestamp: timestamp(10), glucose: 80 }],
					hasMore: false,
				};
			},
		};

		const syncer = new GlucoseSyncer(store, source, () => {
			return []; // empty coveredRange
		});

		await syncer.fetchMissing(requested);

		expect(addRangesCalled).toBe(false);
	});

	test("refetches while backend returns hasMore", async ({ expect }) => {
		const requested = { from: timestamp(0), to: timestamp(100) };

		const store = {
			async getKnownRanges() {
				return [];
			},
			async addMeasurements() {},
			async addRanges() {},
			loadMeasurements: vi.fn(),
			subscribe,
		};

		const source = {
			fetchMeasurements: vi
				.fn()
				.mockResolvedValueOnce({
					values: [{ timestamp: timestamp(10), glucose: 80 }],
					hasMore: true,
				})
				.mockResolvedValueOnce({
					values: [{ timestamp: timestamp(20), glucose: 85 }],
					hasMore: false,
				}),
		};

		const syncer = new GlucoseSyncer(store, source, alwaysContinuous);
		await syncer.fetchMissing(requested);

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
	});

	test("don't call same range simulteneously", async ({ expect }) => {
		const source = {
			fetchMeasurements: vi.fn().mockResolvedValue({
				hasMore: false,
				values: [{ timestamp: timestamp(50), value: 80 }],
			}),
		};

		const store = {
			async getKnownRanges() {
				return [];
			},
			async addMeasurements() {},
			async addRanges() {},
			loadMeasurements: vi.fn(),
			subscribe,
		};

		const syncer = new GlucoseSyncer(store, source, alwaysContinuous);
		const requested = { from: timestamp(10), to: timestamp(80) };
		const p1 = syncer.fetchMissing(requested);
		const p2 = syncer.fetchMissing(requested);

		await Promise.all([p1, p2]);
		expect(source.fetchMeasurements).toHaveBeenCalledOnce();
	});
});
