import { describe, test } from "vitest";
import { GapHandler } from "./GapManager";
import { timestamp } from "./TimeRange";

describe("GapHandler", () => {
	const DELTA_T = timestamp(5 * 60 * 1000);

	test("without values returns empty coveredRange", ({ expect }) => {
		const manager = new GapHandler(DELTA_T);
		const result = manager.computeCoveredRange(
			[],
			{ from: timestamp(0), to: timestamp(100) },
			false,
		);
		expect(result.coveredRanges).toEqual([]);
	});

	test.for([
		[
			timestamp(5),
			[timestamp(1005)],
			[{ from: timestamp(1000), to: timestamp(1005) }],
		],
		[
			timestamp(5),
			[timestamp(1000)],
			[{ from: timestamp(1000), to: timestamp(1000) }],
		],
		[
			timestamp(5),
			[timestamp(1006)],
			[{ from: timestamp(1006), to: timestamp(1006) }],
		],
		[
			timestamp(5),
			[timestamp(1005), timestamp(1995)],
			[{ from: timestamp(1000), to: timestamp(2000) }],
		],
	] as const)("should snap to requested start and end", ([
		dt,
		values,
		expected,
	], { expect }) => {
		const manager = new GapHandler(dt);
		const requested = { from: timestamp(1000), to: timestamp(2000) };

		const result = manager.computeCoveredRange(values, requested, false);

		expect(result.coveredRanges).toEqual(expected);
		expect(result.nextCursor).toBeUndefined();
	});

	test("should not snap end boundary and provide next cursor when hasMore is true", ({
		expect,
	}) => {
		const manager = new GapHandler(timestamp(5));
		const requested = { from: timestamp(1000), to: timestamp(2000) };
		const values = [timestamp(1005), timestamp(1100)];

		const result = manager.computeCoveredRange(values, requested, true);

		expect(result.coveredRanges).toEqual([
			{ from: timestamp(1000), to: timestamp(1100) },
		]);
		expect(result.nextCursor).toBe(1101);
	});

	test("should not snap start if first value exceeds deltaT tolerance", ({
		expect,
	}) => {
		const manager = new GapHandler(timestamp(15));
		const requested = { from: timestamp(1000), to: timestamp(2000) };
		const values = [timestamp(1016), timestamp(1984)];

		const result = manager.computeCoveredRange(values, requested, false);

		expect(result.coveredRanges[0]).toEqual({
			from: timestamp(1016),
			to: timestamp(1984),
		});
	});
});
