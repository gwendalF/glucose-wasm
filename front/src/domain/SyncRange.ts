import type { GlucoseSyncStore } from "./GlucoseSyncStore";
import type { SyncSource } from "./SyncSource";
import type { TimeRange } from "./TimeRange";
import type { TransactionRangeRunner } from "./TransactionRangeRunner";

export interface RangeSynchronizer {
	run: (range: TimeRange) => Promise<void>;
}

export class SyncRange implements RangeSynchronizer {
	constructor(
		private readonly store: GlucoseSyncStore,
		private readonly txRunner: TransactionRangeRunner,
		private readonly source: SyncSource,
	) {}

	run = async (range: TimeRange) => {
		const ranges = await this.store.getMissingRanges(range);
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
				await this.txRunner.run(async (txRepo) => {
					await txRepo.markRangeComplete(coveredRange);
				});

				from = batch.coveredRange.to;
			} else {
				break;
			}
		}
	};

	private fetchAndInsert = async (range: TimeRange) => {
		const batch = await this.source.fetchBatch(range);
		if (batch.items.length > 0) {
			await this.store.insertItems(batch.items);
		}

		return batch;
	};
}
