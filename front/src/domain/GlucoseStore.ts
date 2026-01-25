import type { GlucoseValue } from "@application/Dashboard";
import type { Stream } from "./Stream";
import type { TimeRange } from "./TimeRange";

export interface GlucosStore {
	load(range: TimeRange): Promise<GlucoseValue[]>;
	watch(range: TimeRange): Stream<GlucoseValue[]>;
}
