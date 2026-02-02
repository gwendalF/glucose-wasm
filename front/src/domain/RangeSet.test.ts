import { describe, test } from "vitest";
import { RangeSet } from "./RangeSet";
import { type TimeRange, timestamp } from "./TimeRange";

describe("RangeSet", () => {
	test("returns the requested range when no ranges are known", ({ expect }) => {
		const requested = { from: timestamp(10), to: timestamp(20) };
		const set = new RangeSet([], timestamp(0));

		const missings = set.resolveMissingRanges(requested);
		expect(missings).toEqual([{ from: timestamp(10), to: timestamp(20) }]);
	});

	test("ignore known ranges before the requested range", ({ expect }) => {
		const requested = { from: timestamp(15), to: timestamp(100) };
		const known = [{ from: timestamp(5), to: timestamp(15) }];
		const set = new RangeSet(known, timestamp(0));

		const missing = set.resolveMissingRanges(requested);
		expect(missing).toEqual([{ from: timestamp(15), to: timestamp(100) }]);
	});

	test("return no missing range when requested range is fully known", ({
		expect,
	}) => {
		const set = new RangeSet(
			[{ from: timestamp(10), to: timestamp(20) }],
			timestamp(0),
		);
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
		const set = new RangeSet(known, timestamp(0));

		const missing = set.resolveMissingRanges(requested);
		expect(missing).toEqual([{ from: 15, to: 20 }]);
	});

	test("returns the missing range at the beginning when the end is known", ({
		expect,
	}) => {
		const known = [{ from: timestamp(10), to: timestamp(20) }];
		const requested = { from: timestamp(0), to: timestamp(20) };
		const set = new RangeSet(known, timestamp(0));

		const missings = set.resolveMissingRanges(requested);
		expect(missings).toEqual([{ from: timestamp(0), to: timestamp(10) }]);
	});

	test("return 2 mising ranges when known data is inside the requested range", ({
		expect,
	}) => {
		const known = [{ from: timestamp(20), to: timestamp(50) }];
		const requested = { from: timestamp(10), to: timestamp(60) };
		const set = new RangeSet(known, timestamp(0));

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
		const set = new RangeSet(known, timestamp(0));

		const missings = set.resolveMissingRanges(requested);
		expect(missings).toEqual([
			{ from: timestamp(10), to: timestamp(15) },
			{ from: timestamp(20), to: timestamp(30) },
			{ from: timestamp(40), to: timestamp(50) },
		]);
	});

	test("RangeSet exposes missing ranges", ({ expect }) => {
		const set = new RangeSet(
			[{ from: timestamp(15), to: timestamp(20) }],
			timestamp(0),
		);

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
			{ from: timestamp(10), to: timestamp(20) },
			{ from: timestamp(15), to: timestamp(25) },
		];

		const requested = { from: timestamp(5), to: timestamp(30) };

		const set = new RangeSet(ranges, timestamp(0));

		const missing = set.resolveMissingRanges(requested);

		expect(missing).toEqual([
			{ from: timestamp(5), to: timestamp(10) },
			{ from: timestamp(25), to: timestamp(30) },
		]);
	});

	test("returns no range when missing range is lower than maxGap", ({
		expect,
	}) => {
		const ranges = [
			{ from: timestamp(0), to: timestamp(10) },
			{ from: timestamp(15), to: timestamp(50) },
		];

		const requested = { from: timestamp(0), to: timestamp(50) };
		const set = new RangeSet(ranges, timestamp(5));
		const missings = set.resolveMissingRanges(requested);
		expect(missings).toEqual([]);
	});

	test("returns no missing range when missing data but less than maxGap", ({
		expect,
	}) => {
		const range = [{ from: timestamp(20), to: timestamp(50) }];
		const set = new RangeSet(range, timestamp(10));
		const missings = set.resolveMissingRanges({
			from: timestamp(10),
			to: timestamp(60),
		});
		expect(missings).toEqual([]);
	});

	test("merge ranges that overlaps", ({ expect }) => {
		const ranges = [{ from: timestamp(0), to: timestamp(10) }];
		const set = new RangeSet(ranges, timestamp(0));
		const merged = set.consolidate([{ from: timestamp(7), to: timestamp(15) }]);
		expect(merged).toEqual([{ from: timestamp(0), to: timestamp(15) }]);
	});

	test("merge ranges that have less than maxGap diff", ({ expect }) => {
		const ranges = [{ from: timestamp(0), to: timestamp(50) }];
		const set = new RangeSet(ranges, timestamp(10));
		let merged = set.consolidate([{ from: timestamp(60), to: timestamp(100) }]);
		expect(merged).toEqual([{ from: timestamp(0), to: timestamp(100) }]);

		const setNoGap = new RangeSet(ranges, timestamp(9));
		merged = setNoGap.consolidate([
			{ from: timestamp(60), to: timestamp(100) },
		]);
		expect(merged).toEqual([
			{ from: timestamp(0), to: timestamp(50) },
			{ from: timestamp(60), to: timestamp(100) },
		]);
	});

	test("consolidate returns empty set when no ranges are passed", ({
		expect,
	}) => {
		const set = new RangeSet([], timestamp(0));
		expect(set.consolidate([])).toEqual([]);
	});
});
