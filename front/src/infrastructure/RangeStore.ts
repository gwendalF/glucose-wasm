import type { GlucoseDataset } from "@domain/GlucoseRepository";
import type { RangeRepository } from "@domain/RangeRepository";
import { type TimeRange, type Timestamp, timestamp } from "@domain/TimeRange";

export class RangeStore implements RangeRepository {
	private constructor(private knownsRange: TimeRange[]) {}

	static fromDataset(dataset: GlucoseDataset, maxGap: Timestamp): RangeStore {
		const ranges: TimeRange[] = [];
		if (dataset.timestamps.length === 0) return new RangeStore([]);

		let start = dataset.timestamps[0];

		for (let i = 1; i < dataset.timestamps.length; i++) {
			const current = dataset.timestamps[i];
			const previous = dataset.timestamps[i - 1];

			if (current - previous > maxGap) {
				ranges.push({ from: timestamp(start), to: timestamp(previous) });
				start = current;
			}
		}

		ranges.push({
			from: timestamp(start),
			to: timestamp(dataset.timestamps[dataset.timestamps.length - 1]),
		});

		return new RangeStore(ranges);
	}

	async getKnownRanges(): Promise<TimeRange[]> {
		return this.knownsRange;
	}

	async saveRanges(ranges: TimeRange[]): Promise<void> {
		this.knownsRange = ranges;
	}

	async clear(): Promise<void> {
		this.knownsRange = [];
	}
}
