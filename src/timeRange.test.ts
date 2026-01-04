import { describe, test } from "vitest";

import { fromDate, TimePresets, timeRangeFor } from "./timeRange";

describe("timeRangeFor", () => {
	const now = fromDate(new Date("2026-01-02T12:00:00.000Z"));

	test.for([
		[TimePresets.Last6Hours, fromDate(new Date("2026-01-02T06:00:00.000Z"))],
		[TimePresets.Last12Hours, fromDate(new Date("2026-01-02T00:00:00.000Z"))],
		[TimePresets.Last24Hours, fromDate(new Date("2026-01-01T12:00:00.000Z"))],
	] as const)("%s -> %s", ([preset, start], { expect }) => {
		const range = timeRangeFor(preset, now);

		expect(range.start).toBe(start);
		expect(range.end).toBe(now);
	});
});
