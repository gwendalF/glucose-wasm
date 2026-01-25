import type { GlucoseValue } from "@application/Dashboard";
import type { GlucosStore } from "@domain/GlucoseStore";
import type { GlucoseSyncStore } from "@domain/GlucoseSyncStore";
import type { Stream } from "@domain/Stream";

import { type TimeRange, timestamp } from "@domain/TimeRange";
import type { TransactionRangeStore } from "@domain/TransactionRangeStore";
import { SQLocal, type Transaction } from "sqlocal";
import { mergeRanges } from "./mergeRanges";

export class SQLStore implements GlucosStore, GlucoseSyncStore {
	private db: SQLocal;
	private tx?: { sql: Transaction["sql"] };

	constructor(
		db: SQLocal,
		tx?: {
			sql: Transaction["sql"];
		},
	) {
		this.db = db;
		this.tx = tx;
	}

	async runInTx<T>(fn: (r: TransactionRangeStore) => Promise<T>): Promise<T> {
		const data = await this.db.transaction(async (tx) => {
			const repo = new SQLStore(this.db, tx);
			const result = await fn(repo);
			return result;
		});

		return data;
	}

	private get sql() {
		return this.tx?.sql ?? this.db.sql;
	}

	async insertItems(items: readonly GlucoseValue[]) {
		const query = "INSERT INTO glucose_values (timestamp, value) VALUES ";
		const toInsert = items.map(() => "(?, ?)").join(", ");
		const params = items.flatMap((item) => [item.timestamp, item.glucose]);
		await this.sql(query.concat(toInsert), params);
	}

	async markRangeComplete(range: TimeRange): Promise<void> {
		const overlaps = await this
			.sql`SELECT * FROM completed_ranges WHERE start <= ${range.to} AND end >= ${range.from}`;

		const overlapsRanges = overlaps.map((r) => {
			return {
				from: timestamp(r.start),
				to: timestamp(r.end),
			};
		});

		let finalRange = range;
		if (overlapsRanges.length > 0) {
			const mergedRange = mergeRanges(overlapsRanges);
			if (!mergedRange.ok) {
				throw mergedRange.error;
			}

			finalRange = mergedRange.value;

			const placeholders = overlaps.map(() => "?").join(",");
			const overlapIds = overlaps.map((r) => r.id);
			const query = `DELETE FROM completed_ranges WHERE id IN (${placeholders})`;
			await this.sql(query, ...overlapIds);
		}

		await this
			.sql`INSERT INTO completed_ranges (start, end) VALUES (${finalRange.from}, ${finalRange.to})`;
	}

	async getMissingRanges(requested: TimeRange): Promise<TimeRange[]> {
		const await this.sql``
		return [requested];
	}

	// biome-ignore lint/suspicious/noExplicitAny: any type from SQL
	private mapRow(r: Record<string, any>) {
		return {
			timestamp: timestamp(r.timestamp),
			glucose: r.value,
		};
	}

	async load(range: TimeRange): Promise<GlucoseValue[]> {
		const rows = await this.sql`SELECT timestamp,value FROM glucose_values 
      WHERE timestamp >= ${range.from} AND timestamp <= ${range.to}
      ORDER BY timestamp ASC, id ASC`;
		return rows.map(this.mapRow);
	}

	watch(range: TimeRange): Stream<GlucoseValue[]> {
		const { reactiveQuery } = this.db;
		const steam = reactiveQuery(
			(sql) => sql`SELECT timestamp, value FROM glucose_values 
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
	}
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
							sql`CREATE TABLE IF NOT EXISTS glucose_values (id INTEGER PRIMARY KEY, value INTEGER NOT NULL, timestamp INTEGER NOT NULL)`,
							sql`CREATE TABLE IF NOT EXISTS completed_ranges (id INTEGER PRIMARY KEY, start INTEGER NOT NULL, end INTEGER NOT NULL)`,
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

export class InMemoryStore implements GlucosStore, GlucoseSyncStore {
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

	async load(range: TimeRange): Promise<GlucoseValue[]> {
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
