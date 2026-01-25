import { timestamp } from "@domain/TimeRange";
import { describe, test } from "vitest";
import { MergeError, mergeRanges } from "./mergeRanges";

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
		]);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual({ from: timestamp(10), to: timestamp(30) });
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
