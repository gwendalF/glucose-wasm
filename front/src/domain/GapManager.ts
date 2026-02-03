import type { GlucoseValue } from "./GlucoseValue";
import { type TimeRange, type Timestamp, timestamp } from "./TimeRange";

export interface GapManager {
  computeCoveredRange(
    values: readonly GlucoseValue[],
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
    values: readonly GlucoseValue[],
    requestedRange: TimeRange,
    hasMore: boolean,
  ) {
    if (values.length === 0) {
      return { coveredRanges: [] };
    }

    const firstTimestamp = values[0].timestamp;
    const lastTimestamp = values[values.length - 1].timestamp;

    const from =
      firstTimestamp - requestedRange.from <= this.maxGap
        ? requestedRange.from
        : firstTimestamp;

    let to = lastTimestamp;
    if (!hasMore && requestedRange.to - lastTimestamp <= this.maxGap) {
      to = requestedRange.to;
    }

    const nextCursor = hasMore ? timestamp(lastTimestamp + 1) : undefined;

    return {
      coveredRanges: [{ from, to }],
      nextCursor,
    };
  }
}
