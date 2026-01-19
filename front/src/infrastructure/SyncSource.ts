import type { SyncBatch, SyncSource } from "@domain/SyncSource";
import type { TimeRange } from "@domain/TimeRange";

export class HttpSyncSource implements SyncSource {
	fetchBatch(range: TimeRange): Promise<SyncBatch> {
		throw new Error("Method not implemented.");
	}
}
