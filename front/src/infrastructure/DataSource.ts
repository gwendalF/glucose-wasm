import type { DataSource } from "@application/DataSource";
import type { GlucoseValue } from "@domain/GlucoseValue";
import { type TimeRange, timestamp } from "@domain/TimeRange";
import { deserialize, type Measurements } from "postcard-bindings";

interface HttpClient {
	get(url: string): Promise<Measurements>;
}

export class DefaultClient implements HttpClient {
	async get<T>(url: string): Promise<T> {
		const response = await fetch(url);
		const json = await response.json();
		return json;
	}
}

export class PostcardClient implements HttpClient {
	async get(url: string) {
		const response = await fetch(url);

		const buffer = await response.arrayBuffer();
		const bytes = new Uint8Array(buffer);
		const data = deserialize("Measurements", bytes);
		return data.value;
	}
}

export class ThrottledClient implements HttpClient {
	private inFlight: (() => Promise<void>) | undefined;

	constructor(
		private delayMs: number,
		private client: HttpClient,
	) {}

	async get(url: string) {
		if (this.inFlight) {
			await this.inFlight();
		}
		await new Promise((r) => setTimeout(r, this.delayMs));
		return this.client.get(url);
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

		const data = await this.fetcher.get(url.toString());

		return {
			values: data.timestamps.map((t, i) => ({
				glucose: data.values[i],
				timestamp: timestamp(Number(t)),
			})),
			hasMore: !!data.has_more,
		};
	}
}
