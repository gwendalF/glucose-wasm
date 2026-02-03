import {
  maxTimestamp,
  minTimestamp,
  type TimeRange,
  type Timestamp,
  timestamp,
} from "./TimeRange";

export type RangeSetComputer = {
  resolveMissingRanges(requested: TimeRange): TimeRange[];
  consolidate(toAdd: TimeRange[]): TimeRange[];
};

export class RangeSet implements RangeSetComputer {
  private knownRanges: TimeRange[];

  constructor(
    knownRanges: readonly TimeRange[],
    private maxGap: Timestamp,
  ) {
    this.knownRanges = [...knownRanges];
  }

  resolveMissingRanges(requested: TimeRange): TimeRange[] {
    const result: TimeRange[] = [];
    let cursor = requested.from;
    for (const known of this.knownRanges) {
      const from = maxTimestamp(known.from, requested.from);
      const to = minTimestamp(known.to, requested.to);

      if (from > cursor + this.maxGap) {
        result.push({ from: cursor, to: from });
      }

      cursor = maxTimestamp(cursor, to);
    }

    if (cursor + this.maxGap < requested.to) {
      result.push({ from: cursor, to: requested.to });
    }

    return result;
  }

  consolidate(toAdd: TimeRange[]): TimeRange[] {
    for (const range of toAdd) {
      //stryker: > and >= give the same output after merge
      const idx = this.knownRanges.findIndex((r) => r.from > range.from);
      if (idx === -1) {
        this.knownRanges.push(range);
        continue;
      }
      this.knownRanges.splice(idx, 0, range);
    }

    if (this.knownRanges.length === 0) return [];

    const merged: TimeRange[] = [];
    let current = this.knownRanges[0];
    for (let i = 1; i < this.knownRanges.length; i++) {
      const next = this.knownRanges[i];
      if (next.from <= timestamp(current.to + this.maxGap)) {
        current = {
          from: current.from,
          to: maxTimestamp(current.to, next.to),
        };
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);
    this.knownRanges = merged;
    return this.knownRanges;
  }
}
