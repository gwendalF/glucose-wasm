import type { LocalStore } from "@domain/GlucoseStore";
import type { GlucoseValue } from "@domain/GlucoseValue";
import { RangeSet, type TimeRange } from "@domain/TimeRange";
import type { DataSource } from "./DataSource";

export class GlucoseSyncer {
	private inFlights = new Set<string>();

	constructor(
		private store: LocalStore,
		private source: DataSource,
		private readonly inferCoveredRanges: (
			values: GlucoseValue[],
			range: TimeRange,
		) => TimeRange[],
	) {}

	async fetchMissing(requested: TimeRange) {
		const knowns = await this.store.getKnownRanges();
		const set = new RangeSet(knowns);
		const missings = set.resolveMissingRanges(requested);

		for (const missing of missings) {
			await this.syncSingleRange(missing);
		}
	}

	onChange(cb: () => void) {
		return this.store.subscribe(cb);
	}

	async getMeasurements(range: TimeRange) {
		return this.store.loadMeasurements(range);
	}

	private async syncSingleRange(range: TimeRange) {
		let from = range.from;
		while (true) {
			const currentRange = { from, to: range.to };
			const key = this.key(currentRange);
			if (this.inFlights.has(key)) break;
			this.inFlights.add(key);
			const result = await this.fetchAndStore(currentRange);
			this.inFlights.delete(key);
			const { hasMore, lastTimestamp } = result;
			if (!hasMore || !lastTimestamp) break;

			from = lastTimestamp;
		}
	}

	private key(range: TimeRange): string {
		return `${range.from}-${range.to}`;
	}

	private async fetchAndStore(range: TimeRange) {
		const { values, hasMore } = await this.source.fetchMeasurements(range);
		if (values.length === 0) return { hasMore: false };

		await this.store.addMeasurements(values);
		const covered = this.inferCoveredRanges(values, range);
		if (covered.length > 0) {
			await this.store.addRanges(covered);
		}

		return {
			hasMore,
			lastTimestamp: values[values.length - 1].timestamp,
		};
	}
}
