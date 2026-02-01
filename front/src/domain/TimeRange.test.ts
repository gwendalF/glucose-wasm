import { describe, test } from "vitest";
import { fromDate, TimePresets, timeRangeFor } from "./TimeRange";

describe("timeRangeFor", () => {
	const now = fromDate(new Date("2026-01-02T12:00:00.000Z"));

	test.for([
		[TimePresets.Last6Hours, fromDate(new Date("2026-01-02T06:00:00.000Z"))],
		[TimePresets.Last12Hours, fromDate(new Date("2026-01-02T00:00:00.000Z"))],
		[TimePresets.Last24Hours, fromDate(new Date("2026-01-01T12:00:00.000Z"))],
		[TimePresets.LastYear, fromDate(new Date("2025-01-02T12:00:00.000Z"))],
	] as const)("%s -> %s", ([preset, from], { expect }) => {

		const range = timeRangeFo

eset, now);




	
	expect(range.to).toBe(now);
	});
});

describe("RangeSet", () => {
	test("returns the requested range when no ranges are known", ({ expect }) => {
		const requested = { from: timestamp(10), to: timestamp(20) };
		const known: TimeRange[] = [];
		const set = new RangeSet(known);

		const missings = set.resolveMissingRanges(requested);
		expect(missings).toEqual([{ from: timestamp(10), to: timestamp(20) }]);
	});

	test("ignore known ranges before the requested range", ({ expect }) => {
		const requested = { from: timestamp(15), to: timestamp(100) };
		const known = [{ from: timestamp(5), to: timestamp(15) }];
		const set = new RangeSet(known);

		const missing = set.resolveMissingRanges(requested);
		expect(missing).toEqual([{ from: timestamp(15), to: timestamp(100) }]);
	});

	test("return no missing range when requested range is fully known", ({
		expect,
	}) => {
		const set = new RangeSet([{ from: timestamp(10), to: timestamp(20) }]);
		const missings = set.resolveMissingRanges({
			from: timestamp(10),
			to: timestamp(20),
		});
		expect(missings).toEqual([]);
	});

	test("returns the uncovered tail when the beginning is covered", ({
		expect,
	}) => {
		const known: TimeRange[] = [{ from: timestamp(10), to: timestamp(15) }];
		const requested: TimeRange = { from: timestamp(10), to: timestamp(20) };
		const set = new RangeSet(known);

		const missing = set.resolveMissingRanges(requested);
		expect(missing).toEqual([{ from: 15, to: 20 }]);
	});

	test("returns the missing range at the beginning when the end is known", ({
		expect,
	}) => {
		const known = [{ from: timestamp(10), to: timestamp(20) }];
		const requested = { from: timestamp(0), to: timestamp(20) };
		const set = new RangeSet(known);

		const missings = set.resolveMissingRanges(requested);
		expect(missings).toEqual([{ from: timestamp(0), to: timestamp(10) }]);
	});

	test("return 2 mising ranges when known data is inside the requested range", ({
		expect,
	}) => {
		const known = [{ from: timestamp(20), to: timestamp(50) }];
		const requested = { from: timestamp(10), to: timestamp(60) };
		const set = new RangeSet(known);

		const missings = set.resolveMissingRanges(requested);
		expect(missings).toEqual([
			{ from: timestamp(10), to: timestamp(20) },
			{ from: timestamp(50), to: timestamp(60) },
		]);
	});

	test("handles multiple known ranges inside requested range", ({ expect }) => {
		const known = [
			{ from: timestamp(15), to: timestamp(20) },
			{ from: timestamp(30), to: timestamp(40) },
		];
		const requested = { from: timestamp(10), to: timestamp(50) };
		const set = new RangeSet(known);

		const missings = set.resolveMissingRanges(requested);
		expect(missings).toEqual([
			{ from: timestamp(10), to: timestamp(15) },
			{ from: timestamp(20), to: timestamp(30) },
			{ from: timestamp(40), to: timestamp(50) },
		]);
	});

	test("order pass to constructor does not matter", ({ expect }) => {
		const known = [
			{ from: timestamp(30), to: timestamp(40) },
			{ from: timestamp(15), to: timestamp(20) },
		];

		const requested = { from: timestamp(10), to: timestamp(50) };
		const set = new RangeSet(known);

		const missings = set.resolveMissingRanges(requested);

		expect(missings).toEqual([
			{ from: timestamp(10), to: timestamp(15) },
			{ from: timestamp(20), to: timestamp(30) },
			{ from: timestamp(40), to: timestamp(50) },
		]);
	});

	test("RangeSet exposes missing ranges", ({ expect }) => {
		const set = new RangeSet([{ from: timestamp(15), to: timestamp(20) }]);

		const missings = set.resolveMissingRanges({
			from: timestamp(10),
			to: timestamp(30),
		});

		expect(missings).toEqual([
			{ from: timestamp(10), to: timestamp(15) },
			{ from: timestamp(20), to: timestamp(30) },
		]);
	});

	test("resolveMissingRanges works with overlapping ranges", ({ expect }) => {
		const ranges: TimeRange[] = [
			{ from: timestamp(15), to: timestamp(25) },
			{ from: timestamp(10), to: timestamp(20) },
		];

		const requested = { from: timestamp(5), to: timestamp(30) };

		const set = new RangeSet(ranges);

		const missing = set.resolveMissingRanges(requested);

		expect(missing).toEqual([
			{ from: timestamp(5), to: timestamp(10) },
			{ from: timestamp(25), to: timestamp(30) },
		]);
	});
});

describe("inferCoveredRanges", () => {
	const range = { from: timestamp(0), to: timestamp(50) };

	test("return empty ranges when no values", ({ expect }) => {
		const segments = inferCoveredRanges([], range, timestamp(10));
		expect(segments).toEqual([]);
	});
	test("returns a single segment when all measurements are continous", ({
		expect,
	}) => {
		const values = [
			{ timestamp: timestamp(10), glucose: 80 },
			{ timestamp: timestamp(20), glucose: 80 },
			{ timestamp: timestamp(30), glucose: 80 },
		];

		const segments = inferCoveredRanges(values, range, timestamp(10));
		expect(segments).toEqual([{ from: timestamp(10), to: timestamp(30) }]);
	});

	test("splits measurements into 2 segments if there is a gap larger than maxGap", ({
		expect,
	}) => {
		const values = [
			{ timestamp: timestamp(10), glucose: 80 },
			{ timestamp: timestamp(12), glucose: 85 },
			{ timestamp: timestamp(20), glucose: 90 }, // gap = 8 > maxGap
			{ timestamp: timestamp(21), glucose: 95 },
		];
		const segments = inferCoveredRanges(values, range, timestamp(5));
		expect(segments).toEqual([
			{ from: timestamp(10), to: timestamp(12) },
			{ from: timestamp(20), to: timestamp(21) },
		]);
	});

	test("splits into multiples continuous segments and clamps to requested range", ({
		expect,
	}) => {
		const range = { from: timestamp(10), to: timestamp(50) };
		const values = [
			{ timestamp: timestamp(5), glucose: 80 }, // before range

			{ timestamp: timestamp(10), glucose: 80 },
			{ timestamp: timestamp(12), glucose: 82 },
			{ timestamp: timestamp(20), glucose: 85 },
			{ timestamp: timestamp(21), glucose: 86 },

			{ timestamp: timestamp(60), glucose: 90 }, // after range
		];

		const segments = inferCoveredRanges(values, range, timestamp(5));
		expect(segments).toEqual([
			{ from: timestamp(10), to: timestamp(12) },
			{ from: timestamp(20), to: timestamp(21) },
		]);
	});

	test("split by maxGap", ({ expect }) => {
		const maxGap = timestamp(10);

		let values = [
			{ timestamp: timestamp(10), glucose: 80 },
			{ timestamp: timestamp(20), glucose: 80 }, // gap = 10
			{ timestamp: timestamp(30), glucose: 80 }, // gap = 10
		];

		let segments = inferCoveredRanges(values, range, maxGap);

		// don't split if equal maxGap
		expect(segments).toEqual([{ from: timestamp(10), to: timestamp(30) }]);

		// split if > maxGap
		values = [
			{ timestamp: timestamp(10), glucose: 80 },
			{ timestamp: timestamp(21), glucose: 80 }, // gap = 11
			{ timestamp: timestamp(31), glucose: 80 }, // gap = 10
		];
		segments = inferCoveredRanges(values, range, maxGap);
		expect(segments).toEqual([
			{ from: timestamp(10), to: timestamp(10) },
			{ from: timestamp(21), to: timestamp(31) },
		]);
	});
});
