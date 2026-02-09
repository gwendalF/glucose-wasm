import type { GapManager } from "@domain/GapManager";
import type {
	GlucoseDataset,
	LocalStore,
	Repository,
} from "@domain/GlucoseRepository";
import type { GlucoseValue } from "@domain/GlucoseValue";
import type { RangeRepository } from "@domain/RangeRepository";
import type { RangeSetComputer } from "@domain/RangeSet";
import type { TimeRange, Timestamp } from "@domain/TimeRange";

export class GlucoseRepository implements Repository {
	constructor(
		private store: LocalStore,
		private rangeStore: RangeRepository,
		private gapManager: GapManager,
		private makeRangeSet: (knwons: TimeRange[]) => RangeSetComputer,
	) {}

	async ingest(
		values: GlucoseValue[],
		fetchedRange: TimeRange,
		hasMore: boolean,
	): Promise<{ nextCursor?: Timestamp }> {
		if (values.length > 0) {
			await this.store.addMeasurements(values);
		}

		const timestamps = values.map((v) => v.timestamp);
		const { coveredRanges, nextCursor } = this.gapManager.computeCoveredRange(
			timestamps,
			fetchedRange,
			hasMore,
		);

		const currentKnowns = await this.rangeStore.getKnownRanges();
		const rangeSet = this.makeRangeSet(currentKnowns);
		const updatedRanges = rangeSet.consolidate(coveredRanges);
		await this.rangeStore.saveRanges(updatedRanges);

		return { nextCursor };
	}

	getData(range: TimeRange): Promise<GlucoseDataset> {
		return this.store.getData(range);
	}

	getKnownRanges(): Promise<TimeRange[]> {
		return this.rangeStore.getKnownRanges();
	}

	async getMissingRanges(request: TimeRange): Promise<TimeRange[]> {
		const knowns = await this.rangeStore.getKnownRanges();
		const set = this.makeRangeSet(knowns);
		return set.resolveMissingRanges(request);
	}
}
