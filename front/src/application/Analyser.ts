import type { LocalStore } from "@domain/GlucoseStore";
import type { TimeRange } from "@domain/TimeRange";

export class Analyser {
	constructor(private store: LocalStore) {}

	async mean(range: TimeRange) {
		const meanValue = await this.store.mean(range);
		return meanValue;
	}
}
