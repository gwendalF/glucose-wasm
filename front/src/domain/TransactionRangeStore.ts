import type { GlucoseSyncStore } from "./GlucoseSyncStore";
import type { TimeRange } from "./TimeRange";

export interface TransactionRangeStore extends GlucoseSyncStore {
	markRangeComplete(range: TimeRange): Promise<void>;
}
