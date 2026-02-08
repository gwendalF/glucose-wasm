import { type TimeRange, type Timestamp, timestamp } from "./TimeRange";
import type { TypedArray } from "./TypedArray";

export interface GapManager {
	computeCoveredRange(
		timestamps: readonly Timestamp[] | TypedArray,
		requestedRange: TimeRange,
		hasMore: boolean,
	): {
		coveredRanges: TimeRange[];
		nextCursor?: Timestamp;
	};
}

export class GapHandler implements GapManager {
	constructor(private readonly maxGap: Timestamp) {}

	computeCoveredRange(
		timestamps: readonly Timestamp[] | TypedArray,
		requestedRange: TimeRange,
		hasMore: boolean,
	) {
		if (timestamps.length === 0) {
			return { coveredRanges: [] };
		}

		const firstTimestamp = timestamps[0];
		const lastTimestamp = timestamp(timestamps[timestamps.length - 1]);

		const from =
			firstTimestamp - requestedRange.from <= this.maxGap
				? timestamp(requestedRange.from)
				: timestamp(firstTimestamp);

		let to = lastTimestamp;
		if (!hasMore && requestedRange.to - lastTimestamp <= this.maxGap) {
			to = timestamp(requestedRange.to);
		}

		const nextCursor = hasMore ? timestamp(lastTimestamp + 1) : undefined;

		return {
			coveredRanges: [{ from, to }],
			nextCursor,
		};
	}
}
