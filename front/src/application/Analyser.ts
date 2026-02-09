import type { LocalStore } from "@domain/GlucoseRepository";
import type { TimeRange } from "@domain/TimeRange";

export class Analyser {
	constructor(private store: LocalStore) {}

	async mean(range: TimeRange) {
		const meanValue = await this.store.getMean(range);
		return meanValue;
	}
}
