import { describe, test } from "vitest";
import { prepareData } from "./Graph";
import { timestamp } from "./timeRange";

describe("graph", () => {
	test("empty data return empty array", ({ expect }) => {
		expect(prepareData([])).toEqual([[], []]);
	});

	test.for([
		[
			[
				{ timestamp: timestamp(1234), glucose: 80 },
				{ timestamp: timestamp(102030), glucose: 90 },
			],
			[
				[1234, 102030],
				[80, 90],
			],
		],
	] as const)("%o input -> %o expected", ([glucoses, expected], { expect }) => {
		expect(prepareData(glucoses)).toEqual(expected);
	});
});
