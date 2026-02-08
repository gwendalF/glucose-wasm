import type { GlucoseRepository } from "@domain/GlucoseRepository";
import type { TimeRange } from "@domain/TimeRange";
import type { DataSource } from "./DataSource";

export class GlucoseSyncer {
	private inFlights = new Set<string>();
	private listeners = new Set<() => void>();

	constructor(
		private repo: GlucoseRepository,
		private source: DataSource,
	) {}

	private key(range: TimeRange) {
		return `${range.from}-${range.to}`;
	}

	async fetchMissing(requested: TimeRange) {
		const key = this.key(requested);
		if (this.inFlights.has(key)) return;

		this.inFlights.add(key);

		try {
			const missings = await this.repo.getMissingRanges(requested);
			for (const missing of missings) {
				await this.fetchAndStore(missing);
			}
		} finally {
			this.inFlights.delete(key);
		}
	}

	private notify() {
		this.listeners.forEach((l) => {
			l();
		});
	}

	onChange(cb: () => void) {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	async getMeasurements(range: TimeRange) {
		return this.repo.getData(range);
	}

	private async fetchAndStore(range: TimeRange): Promise<void> {
		let currentFrom = range.from;

		let retryCount = 0;
		while (true) {
			try {
				const { values, hasMore } = await this.source.fetchMeasurements({
					from: currentFrom,
					to: range.to,
				});
				retryCount = 0;

				const { nextCursor } = await this.repo.ingest(
					values,
					{
						from: currentFrom,
						to: range.to,
					},
					hasMore,
				);
				this.notify();
				if (nextCursor && nextCursor < range.to) {
					currentFrom = nextCursor;
				} else {
					break;
				}
			} catch (e) {
				console.warn(e);
				retryCount += 1;

				const delay = 2 ** retryCount * 1000;

				await new Promise((res) => setTimeout(res, delay));
			}
		}
	}
}
