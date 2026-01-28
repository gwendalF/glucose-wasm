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
      timestamps: Timestamp[];
      values: number[];
      complete: boolean;
    }>(url.toString());

    const items = response.timestamps.map((timestamp, i) => ({
      glucose: response.values[i],
      timestamp,
    }));

    const hasItems = response.values.length > 0;
    if (response.complete) {
      return {
        status: "complete",
        items,
        coveredRange: {
          from: range.from,
          to: hasItems ? items[items.length - 1].timestamp : range.to,
        },
      };
    }

    return {
      status: "pending",
      items,
    };
  }
}
