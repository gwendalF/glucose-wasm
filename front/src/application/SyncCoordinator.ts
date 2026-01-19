import type { RangeSynchronizer } from "@domain/SyncRange";
import type { TimeRange } from "@domain/TimeRange";

export class SyncCoordinator {
	private runningRanges = new Set<string>();
	private logger: (e: unknown) => void;
	constructor(
		private readonly synchronizer: RangeSynchronizer,
		logger?: (e: unknown) => void,
	) {
		if (logger) {
			this.logger = logger;
		} else {
			this.logger = (e: unknown) => console.warn(e);
		}
	}

	requestRange = async (range: TimeRange) => {
		const key = this.key(range);
		if (this.runningRanges.has(key)) {
			return;
		}

		this.runningRanges.add(key);
		try {
			await this.synchronizer.run(range);
		} catch (e) {
			this.logger(e);
		} finally {
			this.runningRanges.delete(key);
		}
	};

	private key = (range: TimeRange): string => {
		return `${range.from}-${range.to}`;
	};
}
