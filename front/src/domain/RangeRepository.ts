import type { TimeRange } from "./TimeRange";

export interface RangeRepository {
	getKnownRanges(): Promise<TimeRange[]>;
	saveRanges(ranges: TimeRange[]): Promise<void>;
}
