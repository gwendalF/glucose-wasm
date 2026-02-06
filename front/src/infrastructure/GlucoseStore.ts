import type { LocalStore } from "@domain/GlucoseStore";
import type { GlucoseValue } from "@domain/GlucoseValue";
import { type TimeRange, type Timestamp, timestamp } from "@domain/TimeRange";
import { SQLocal, type Transaction } from "sqlocal";

export class SQLite implements LocalStore {
	private listeners = new Set<() => void>();

	private CHUNK_SIZE = 500;

	private constructor(
		private db: SQLocal,
		private readonly maxGap: Timestamp,
		private readonly tx?: Transaction["sql"],
	) {}

	private get sql() {
		return this.tx ? this.tx : this.db.sql;
	}

	async addMeasurements(
		measurements: GlucoseValue[],
		cb: (store: LocalStore) => Promise<void>,
	): Promise<void> {
		this.db.transaction(async ({ sql }) => {
			for (let i = 0; i < measurements.length; i += this.CHUNK_SIZE) {
				const batch = measurements.slice(i, i + this.CHUNK_SIZE);

				const placeholders = batch.map(() => "(?, ?)").join(",");
				const params = batch.flatMap((m) => [m.glucose, m.timestamp]);

				await sql(
					`INSERT INTO glucose_values (value, timestamp) 
             VALUES ${placeholders} 
             ON CONFLICT (timestamp) DO NOTHING`,
					...params,
				);
			}

			cb(new SQLite(this.db, this.maxGap, sql));
		});

		this.notify();
	}

	async getKnownRanges(): Promise<TimeRange[]> {
		const rows = await this
			.sql`SELECT start, end from known_ranges ORDER BY start ASC`;
		return rows.map((r) => ({
			from: timestamp(r.start),
			to: timestamp(r.end),
		}));
	}

	async addRanges(ranges: TimeRange[]): Promise<void> {
		await this.ensureCorrectGap();

		this.sql`DELETE FROM known_ranges`;
		const query = ranges.map(() => "(?, ?)").join(", ");
		const params = ranges.flatMap((range) => [range.from, range.to]);
		await this.sql(
			"INSERT INTO known_ranges (start, end) VALUES ".concat(query),
			...params,
		);

		this.notify();
	}

	private async ensureCorrectGap() {
		const row = await this
			.sql`SELECT value FROM config WHERE key = ${"max_gap"}`;
		const previousGap = row[0]?.value;
		if (previousGap !== undefined && previousGap !== this.maxGap) {
			await this.sql`DELETE FROM known_ranges`;
		}

		await this
			.sql`INSERT INTO config (key, value) VALUES (${"max_gap"}, ${this.maxGap})
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
	}

	async loadMeasurements(range: TimeRange): Promise<GlucoseValue[]> {
		const rows = await this
			.sql`SELECT * from glucose_values WHERE timestamp >= ${range.from} AND timestamp <= ${range.to} ORDER BY timestamp ASC`;

		const results: GlucoseValue[] = [];
		for (const row of rows) {
			results.push({ timestamp: row.timestamp, glucose: row.value });
		}

		return results;
	}

	async mean(range: TimeRange): Promise<number> {
		const [row] = await this
			.sql`SELECT AVG(value) AS mean FROM glucose_values WHERE timestamp >= ${range.from} AND timestamp <= ${range.to}`;
		return row.mean;
	}

	subscribe(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	static async create(
		filename: string,
		maxGap: Timestamp = timestamp(15 * 60 * 100),
	) {
		const db = await Promise.race([
			new Promise<SQLocal>((resolve) => {
				const db = new SQLocal({
					databasePath: filename,
					onInit(sql) {
						return [
							sql`CREATE TABLE IF NOT EXISTS glucose_values (id INTEGER PRIMARY KEY, value INTEGER NOT NULL, timestamp INTEGER NOT NULL UNIQUE)`,
							sql`CREATE INDEX IF NOT EXISTS idx_glucose_timestamp ON glucose_values (timestamp)`,

							sql`CREATE TABLE IF NOT EXISTS known_ranges (id INTEGER PRIMARY KEY, start INTEGER NOT NULL, end INTEGER NOT NULL)`,
							sql`CREATE INDEX IF NOT EXISTS idx_known_ranges_start_end ON known_ranges (start, end)`,

							sql`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value)`,

							sql`PRAGMA journal_mode = WAL`,
							sql`PRAGMA synchronous = NORMAL`,
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

		return new SQLite(db, maxGap);
	}

	private notify() {
		this.listeners.forEach((l) => {
			l();
		});
	}

	database() {
		return this.db;
	}
}

// export class InMemoryStore implements LocalStore {
//   private withRandom: boolean;
//   private data: GlucoseValue[];

//   constructor({
//     withRandom = false,
//     data,
//   }: {
//     withRandom?: boolean;
//     data?: GlucoseValue[];
//   }) {
//     this.withRandom = !!withRandom;
//     this.data = data ? data : [];
//   }
//   async addMeasurements(measurements: GlucoseValue[]): Promise<void> {
//     this.data.push(...measurements);
//   }

//   async getKnownRanges(): Promise<TimeRange[]> {
//     return [];
//   }

//   async addRanges(ranges: TimeRange[]): Promise<void> {
//     throw new Error("Method not implemented.");
//   }

//   private fillRandomValues(range: TimeRange) {
//     const numPts = 150;
//     const step = Math.round((range.to - range.from) / numPts);
//     const data = Array.from({ length: numPts }, (_, i) => ({
//       glucose: Math.floor(Math.random() * (180 - 70) + 70),
//       timestamp: timestamp(range.from + i * step),
//     }));
//     if (this.data.length === 0) {
//       this.data = data;
//       return;
//     }

//     const isAfter = range.from >= this.data[this.data.length - 1].timestamp;
//     const isBefore = range.to <= this.data[0].timestamp;
//     if (isAfter) {
//       this.data.push(...data);
//     }

//     if (isBefore) {
//       data.push(...this.data);
//       this.data = data;
//     }
//   }

//   async load(range: TimeRange): Promise<GlucoseValue[]> {
//     if (this.withRandom && this.data.length) {
//       const first = this.data[0].timestamp;
//       const last = this.data[this.data.length - 1].timestamp;
//       if (range.to <= first || range.from >= last) {
//         this.fillRandomValues(range);
//       }
//     } else if (this.withRandom) {
//       this.fillRandomValues(range);
//     }

//     return this.data.filter(
//       (v) => v.timestamp >= range.from && v.timestamp <= range.to,
//     );
//   }
// }
