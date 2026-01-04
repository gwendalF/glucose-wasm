import { SQLocal } from "sqlocal";
import type { GlucoseValue, Repository } from "../dashboard";
import { type TimeRange, timestamp } from "../timeRange";

export class SQLRepository implements Repository {
	private db: SQLocal;
	constructor(db: SQLocal) {
		this.db = db;
	}

	async getGlucoseValues(range: TimeRange): Promise<GlucoseValue[]> {
		const rows = await this.db.sql`SELECT timestamp,value FROM glucose_values 
      WHERE timestamp >= ${range.start} AND timestamp <= ${range.end}
      ORDER BY timestamp ASC, id ASC`;
		return rows.map((r) => ({
			timestamp: timestamp(r.timestamp),
			glucose: r.value,
		}));
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
							sql`CREATE TABLE IF NOT EXISTS glucose_values (id INTEGER PRIMARY KEY, uuid TEXT NOT NULL, value INTEGER NOT NULL, timestamp INTEGER NOT NULL)`,
						];
					},
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
