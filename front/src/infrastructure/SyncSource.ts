import type { SyncBatch, SyncSource } from "@domain/SyncSource";
import type { TimeRange, Timestamp } from "@domain/TimeRange";

interface HttpClient {
	get<T>(url: string): Promise<T>;
}

export class DefaultClient {
	async get<T>(url: string): Promise<T> {
		const response = await fetch(url);
		const json = await response.json();
		return json;
	}
}

export class HttpSyncSource implements SyncSource {
	private baseUrl: string;

	constructor(
		private readonly client: HttpClient,
		baseUrl: string,
	) {
		this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
	}

	async fetchBatch(range: TimeRange): Promise<SyncBatch> {
		const url = new URL("glucose", this.baseUrl);
		url.searchParams.append("from", range.from.toString());
		url.searchParams.append("to", range.to.toString());

		const response = await this.client.get<{
			complete: boolean;
			covered_range: TimeRange;
			timestamps: Timestamp[];
			values: number[];
		}>(url.toString());

		const items = response.timestamps.map((timestamp, i) => ({
			glucose: response.values[i],
			timestamp,
		}));

		if (response.complete) {
			return {
				status: "complete",
				items,
				coveredRange: response.covered_range,
			};
		}

		return {
			status: "pending",
			items,
		};
	}
}
