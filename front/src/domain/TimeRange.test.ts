import { describe, test } from "vitest";

import {
	fromDate,
	minTimestamp,
	TimePresets,
	timeRangeFor,
	timestamp,
} from "./TimeRange";

describe("timeRangeFor", () => {
	const now = fromDate(new Date("2026-01-02T12:00:00.000Z"));

	test.for([
		[TimePresets.Last6Hours, fromDate(new Date("2026-01-02T06:00:00.000Z"))],
		[TimePresets.Last12Hours, fromDate(new Date("2026-01-02T00:00:00.000Z"))],
		[TimePresets.Last24Hours, fromDate(new Date("2026-01-01T12:00:00.000Z"))],
	] as const)("%s -> %s", ([preset, from], { expect }) => {
		const range = timeRangeFor(preset, now);

		expect(range.from).toBe(from);
		expect(range.to).toBe(now);
	});
});
