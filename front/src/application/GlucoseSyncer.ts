import type { GapManager } from "@domain/GapManager";
import type { LocalStore } from "@domain/GlucoseStore";
import type { RangeSetComputer } from "@domain/RangeSet";
import type { TimeRange } from "@domain/TimeRange";
import type { DataSource } from "./DataSource";

export class GlucoseSyncer {
	private inFlights = new Set<string>();

	constructor(
		private store: LocalStore,
		private source: DataSource,
		private gapManager: GapManager,
		private makeRangeSet: (knownRanges: TimeRange[]) => RangeSetComputer,
	) {}

	private key(range: TimeRange) {
		return `${range.from}-${range.to}`;
	}

	async fetchMissing(requested: TimeRange) {
		const key = this.key(requested);
		if (this.inFlights.has(key)) return;

		this.inFlights.add(key);

		try {
			const knowns = await this.store.getKnownRanges();
			const set = this.makeRangeSet(knowns);
			const missings = set.resolveMissingRanges(requested);
			for (const missing of missings) {
				await this.fetchAndStore(missing);
			}
		} finally {
			this.inFlights.delete(key);
		}
	}

	onChange(cb: () => void) {
		return this.store.subscribe(cb);
	}

	async getMeasurements(range: TimeRange) {
		return this.store.loadMeasurements(range);
	}

	private async fetchAndStore(range: TimeRange): Promise<void> {
		let currentFrom = range.from;

		while (true) {
			const { values, hasMore } = await this.source.fetchMeasurements({
				from: currentFrom,
				to: range.to,
			});

			if (values.length > 0) {
				await this.store.addMeasurements(values);
			}

			const { coveredRanges, nextCursor } = this.gapManager.computeCoveredRange(
				values,
				{ from: currentFrom, to: range.to },
				hasMore,
			);

			const allRanges = await this.store.getKnownRanges();
			const set = this.makeRangeSet(allRanges);
			const rangesToInsert = set.consolidate(coveredRanges);
			if (rangesToInsert.length > 0) {
				await this.store.addRanges(rangesToInsert);
			}

			if (nextCursor && nextCursor < range.to) {
				currentFrom = nextCursor;
			} else {
				break;
			}
		}
	}
}
