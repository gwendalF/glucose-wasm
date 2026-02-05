import type { GlucoseValue } from "./GlucoseValue";
import type { TimeRange } from "./TimeRange";

export interface LocalStore {
	addMeasurements(measurements: GlucoseValue[]): Promise<void>;
	getKnownRanges(): Promise<TimeRange[]>;
	addRanges(ranges: TimeRange[]): Promise<void>;
	loadMeasurements(range: TimeRange): Promise<GlucoseValue[]>;
	mean(range: TimeRange): Promise<number>;
	subscribe(fn: () => void): () => void;
}
