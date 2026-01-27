import { timestamp } from "@domain/TimeRange";
import { describe, expect, test } from "vitest";
import { computeMissingRanges, MergeError, mergeRanges } from "./ranges";

describe("mergeRanges", () => {
	test("returns Err when ranges is empty", ({ expect }) => {
		const result = mergeRanges([]);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBeInstanceOf(MergeError);
			expect(result.error.message).toBe("empty ranges");
		}
	});

	test("returns the same range when only one range is provided", ({
		expect,
	}) => {
		const result = mergeRanges([{ from: timestamp(10), to: timestamp(20) }]);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({ from: timestamp(10), to: timestamp(20) });
		}
	});

	test("merges overlapping ranges", ({ expect }) => {
		const result = mergeRanges([
			{ from: timestamp(10), to: timestamp(20) },
			{ from: timestamp(15), to: timestamp(30) },
			{ from: timestamp(25), to: timestamp(50) },
		]);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({ from: timestamp(10), to: timestamp(50) });
		}
	});

	test("merges non-overlapping ranges into a bounding range", ({ expect }) => {
		const result = mergeRanges([
			{ from: timestamp(50), to: timestamp(60) },
			{ from: timestamp(10), to: timestamp(20) },
			{ from: timestamp(30), to: timestamp(40) },
		]);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({ from: 10, to: 60 });
		}
	});

	test("returns Err when a range is invalid (from > to)", ({ expect }) => {
		const result = mergeRanges([{ from: timestamp(10), to: timestamp(5) }]);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("INVALID_RANGE");
		}
	});

	test("returns Err when a later range is invalid", ({ expect }) => {
		const result = mergeRanges([
			{ from: timestamp(0), to: timestamp(10) },
			{ from: timestamp(20), to: timestamp(15) },
		]);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("INVALID_RANGE");
		}
	});
});

describe("computeMissingRanges", () => {
	test("returns full range if no completed ranges", ({ expect }) => {
		const requested = { from: timestamp(10), to: timestamp(20) };
		expect(computeMissingRanges(requested, [])).toEqual([requested]);
	});

	test.for([
		[
			{ from: timestamp(10), to: timestamp(20) },
			[{ from: timestamp(10), to: timestamp(20) }],
			[],
		],
		[
			{ from: timestamp(15), to: timestamp(20) },
			[{ from: timestamp(5), to: timestamp(25) }],
			[],
		],
		[
			{ from: timestamp(100), to: timestamp(500) },
			[{ from: timestamp(200), to: timestamp(300) }],
			[
				{ from: timestamp(100), to: timestamp(200) },
				{ from: timestamp(300), to: timestamp(500) },
			],
		],
		[
			{ from: timestamp(100), to: timestamp(500) },
			[{ from: timestamp(50), to: timestamp(200) }],
			[{ from: timestamp(200), to: timestamp(500) }],
		],
		[
			{ from: timestamp(10), to: timestamp(500) },
			[
				{ from: timestamp(50), to: timestamp(100) },
				{ from: timestamp(300), to: timestamp(400) },
			],
			[
				{ from: timestamp(10), to: timestamp(50) },
				{ from: timestamp(100), to: timestamp(300) },
				{ from: timestamp(400), to: timestamp(500) },
			],
		],
	] as const)("requested: %o, completed: %o", ([
		requested,
		completed,
		expected,
	]) => {
		expect(computeMissingRanges(requested, completed)).toEqual(expected);
	});
});
