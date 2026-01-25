import type { GlucoseValue } from "@application/Dashboard";
import type { TimeRange } from "./TimeRange";

export interface GlucoseSyncStore {
	insertItems(items: readonly GlucoseValue[]): Promise<void>;
	getMissingRanges(requested: TimeRange): Promise<TimeRange[]>;
}
