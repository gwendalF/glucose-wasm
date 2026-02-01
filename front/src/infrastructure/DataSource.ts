import type { DataSource } from "@application/DataSource";
import type { GlucoseValue } from "@domain/GlucoseValue";
import { type TimeRange, timestamp } from "@domain/TimeRange";

type ServerResponse = {
	values: number[];
	timestamps: number[];
	has_more: boolean;
};

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

export class HttpDataSource implements DataSource {
	constructor(
		private baseUrl: string,
		private readonly fetcher: HttpClient,
	) {}

	async fetchMeasurements(
		range: TimeRange,
	): Promise<{ values: GlucoseValue[]; hasMore: boolean }> {
		const url = new URL(`${this.baseUrl}/glucose`);
		url.searchParams.append("from", range.from.toString());
		url.searchParams.append("to", range.to.toString());

		const data = await this.fetcher.get<ServerResponse>(url.toString());

		return {
			values: data.timestamps.map((t, i) => ({
				glucose: data.values[i],
				timestamp: timestamp(t),
			})),
			hasMore: !!data.has_more,
		};
	}
}
