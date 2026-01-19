import type { GlucoseValue } from "@application/Dashboard";
import type { SyncSource } from "./SyncSource";
import type { TimeRange } from "./TimeRange";

export interface GlucoseSyncRepo {
	insertItems(items: readonly GlucoseValue[]): Promise<void>;
	markRangeComplete(range: TimeRange): Promise<void>;
	getMissingRanges(requested: TimeRange): Promise<TimeRange[]>;
}

export interface RangeSynchronizer {
	run: (range: TimeRange) => Promise<void>;
}

export class SyncRange implements RangeSynchronizer {
	constructor(
		private readonly repo: GlucoseSyncRepo,
		private readonly source: SyncSource,
	) {}

	run = async (range: TimeRange) => {
		const ranges = await this.repo.getMissingRanges(range);
		for (const range of ranges) {
			await this.runOneRange(range);
		}
	};

	private runOneRange = async (range: TimeRange) => {
		let from = range.from;
		while (from < range.to) {
			const batch = await this.fetchAndInsert({ from: from, to: range.to });
			if (batch.status === "complete") {
				const coveredRange = {
					from,
					to: batch.coveredRange.to,
				};

				await this.repo.markRangeComplete(coveredRange);
				from = batch.coveredRange.to;
			} else {
				break;
			}
		}
	};

	private fetchAndInsert = async (range: TimeRange) => {
		const batch = await this.source.fetchBatch(range);
		if (batch.items.length > 0) {
			await this.repo.insertItems(batch.items);
		}

		return batch;
	};
}
