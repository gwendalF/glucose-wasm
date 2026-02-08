import type { GlucoseValue } from "./GlucoseValue";
import type { TimeRange, Timestamp } from "./TimeRange";

export interface LocalStore {
	addMeasurements(measurements: GlucoseValue[]): Promise<void>;
	getData(range: TimeRange): Promise<GlucoseDataset>;
}

export interface GlucoseDataset {
	readonly length: number;
	readonly timestamps: Float64Array;
	readonly values: Uint16Array;
}

export interface GlucoseRepository {
	ingest(
		values: GlucoseValue[],
		fetchedRange: TimeRange,
		hasMore: boolean,
	): Promise<{ nextCursor?: Timestamp }>;

	getData(range: TimeRange): Promise<GlucoseDataset>;
	getKnownRanges(): Promise<TimeRange[]>;
	getMissingRanges(request: TimeRange): Promise<TimeRange[]>;
}
