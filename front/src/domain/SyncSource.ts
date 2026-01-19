import type { GlucoseValue } from "@application/Dashboard";
import type { TimeRange } from "./TimeRange";

export interface SyncSource {
	fetchBatch(range: TimeRange): Promise<SyncBatch>;
}

export type SyncBatch = { items: GlucoseValue[] } & (
	| {
			coveredRange: TimeRange;
			status: "complete";
	  }
	| {
			status: "pending";
	  }
);
