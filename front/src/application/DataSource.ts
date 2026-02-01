import type { GlucoseValue } from "@domain/GlucoseValue";
import type { TimeRange } from "@domain/TimeRange";

export interface DataSource {
	fetchMeasurements(
		range: TimeRange,
	): Promise<{ values: GlucoseValue[]; hasMore: boolean }>;
}
