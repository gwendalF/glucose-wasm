import type {
	GlucoseRepository,
	GlucoseValue,
	Stream,
} from "@application/Dashboard";
import type { GlucoseSyncRepo } from "@domain/SyncRange";
import { type TimeRange, timestamp } from "@domain/TimeRange";
import { SQLocal } from "sqlocal";

export class SQLRepository implements GlucoseRepository, GlucoseSyncRepo {
	private db: SQLocal;

	constructor(db: SQLocal) {
		this.db = db;
	}

	insertItems = async (items: readonly GlucoseValue[]) => {
		await this.db.sql`INSERT INTO glucose_values `;
	};
	markRangeComplete(range: TimeRange): Promise<void> {
		throw new Error("Method not implemented.");
	}
	getMissingRanges(requested: TimeRange): Promise<TimeRange[]> {
		throw new Error("Method not implemented.");
	}

	// biome-ignore lint/suspicious/noExplicitAny: any type from SQL
	private mapRow = (r: Record<string, any>) => ({
		timestamp: timestamp(r.timestamp),
		glucose: r.value,
	});

	fetch = async (range: TimeRange): Promise<GlucoseValue[]> => {
		const rows = await this.db.sql`SELECT timestamp,value FROM glucose_values 
      WHERE timestamp >= ${range.from} AND timestamp <= ${range.to}
      ORDER BY timestamp ASC, id ASC`;
		return rows.map(this.mapRow);
	};

	watch = (range: TimeRange): Stream<GlucoseValue[]> => {
		const { reactiveQuery } = this.db;
		const steam = reactiveQuery(
			(sql) => sql`SELECT timestamp,value FROM glucose_values 
      WHERE timestamp >= ${range.from} AND timestamp <= ${range.to}
      ORDER BY timestamp ASC, id ASC`,
		);

		return {
			subscribe: (cb: (values: GlucoseValue[]) => void) => {
				const { unsubscribe } = steam.subscribe((rows) => {
					cb(rows.map(this.mapRow));
				});

				return unsubscribe;
			},
		};
	};
}

export class SQLite {
	private db: SQLocal;
	private constructor(db: SQLocal) {
		this.db = db;
	}

	static async create(filename: string) {
		const db = await Promise.race([
			new Promise<SQLocal>((resolve) => {
				const db = new SQLocal({
					databasePath: filename,
					onInit(sql) {
						return [
							sql`CREATE TABLE IF NOT EXISTS glucose_values (id INTEGER PRIMARY KEY, uuid TEXT NOT NULL, value INTEGER NOT NULL, timestamp INTEGER NOT NULL)`,
						];
					},
					reactive: true,
					onConnect: () => resolve(db),
				});
			}),
			new Promise<never>((_, reject) => {
				setTimeout(
					() => reject(new Error("Can't connect to database")),
					10_000,
				);
			}),
		]);

		return new SQLite(db);
	}

	database() {
		return this.db;
	}
}

export class InMemoryRepository implements GlucoseRepository, GlucoseSyncRepo {
	private withRandom: boolean;
	private data: GlucoseValue[];

	constructor({
		withRandom = false,
		data,
	}: { withRandom?: boolean; data?: GlucoseValue[] }) {
		this.withRandom = !!withRandom;
		this.data = data ? data : [];
	}

	private fillRandomValues(range: TimeRange) {
		const numPts = 150;
		const step = Math.round((range.to - range.from) / numPts);
		const data = Array.from({ length: numPts }, (_, i) => ({
			glucose: Math.floor(Math.random() * (180 - 70) + 70),
			timestamp: timestamp(range.from + i * step),
		}));
		if (this.data.length === 0) {
			this.data = data;
			return;
		}

		const isAfter = range.from >= this.data[this.data.length - 1].timestamp;
		const isBefore = range.to <= this.data[0].timestamp;
		if (isAfter) {
			this.data.push(...data);
		}

		if (isBefore) {
			data.push(...this.data);
			this.data = data;
		}
	}

	async fetch(range: TimeRange): Promise<GlucoseValue[]> {
		if (this.withRandom && this.data.length) {
			const first = this.data[0].timestamp;
			const last = this.data[this.data.length - 1].timestamp;
			if (range.to <= first || range.from >= last) {
				this.fillRandomValues(range);
			}
		} else if (this.withRandom) {
			this.fillRandomValues(range);
		}

		return this.data.filter(
			(v) => v.timestamp >= range.from && v.timestamp <= range.to,
		);
	}

	watch(range: TimeRange): Stream<GlucoseValue[]> {
		this.fillRandomValues(range);

		return {
			subscribe: (cb) => {
				cb(
					this.data.filter(
						(v) => v.timestamp >= range.from && v.timestamp <= range.to,
					),
				);

				return () => {};
			},
		};
	}

	async insertItems(items: readonly GlucoseValue[]) {
		this.data.push(...items);
	}

	async markRangeComplete(_range: TimeRange): Promise<void> {}

	async getMissingRanges(requested: TimeRange): Promise<TimeRange[]> {
		return [requested];
	}
}
