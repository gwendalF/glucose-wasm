import { timestamp } from "@domain/TimeRange";
import { describe, test } from "vitest";
import { prepareData } from "./prepareData";

describe("graph", () => {
	test("empty data", ({ expect }) => {
		expect(prepareData([])).toMatchSnapshot();
	});

	test("prepare data for uplot", ({ expect }) => {
		expect(
			prepareData([
				{ timestamp: timestamp(1234), glucose: 80 },
				{ timestamp: timestamp(102030), glucose: 90 },
			]),
		).toMatchSnapshot();
	});
});
