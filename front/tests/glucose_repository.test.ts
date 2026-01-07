import { SQLocal } from "sqlocal";
import { describe, test } from "vitest";
import { fromDate, timestamp } from "../src/core/timeRange";
import { SQLRepository } from "../src/repository/glucose_repository";

describe("SQLite glucose repository", () => {
	const setupRepo = async () => {
		const db = await new Promise<SQLocal>((r) => {
			const sqlLocal = new SQLocal({
				databasePath: ":memory:",
				onConnect: () => r(sqlLocal),
			});
		});

		await db.sql`CREATE TABLE glucose_values (id INTEGER PRIMARY KEY, uuid TEXT NOT NULL, value INTEGER NOT NULL, timestamp INTEGER NOT NULL)`;

		const repo = new SQLRepository(db);
		return { repo, db };
	};

	test("no values by default", async ({ expect }) => {
		const { repo } = await setupRepo();
		const values = await repo.fetch({
			from: timestamp(0),
			to: timestamp(Date.now()),
		});
		expect(values).toHaveLength(0);
	});

	test("do not returns rows before start", async ({ expect }) => {
		const { repo, db } = await setupRepo();

		const start = fromDate(new Date("2026-01-02T12:00:00.000Z"));
		await db.sql`INSERT INTO glucose_values (uuid, value, timestamp)
            VALUES  ('abcde',80, ${start - 10}), 
                    ('efgh', 95, ${start + 50})`;

		const values = await repo.fetch({
			from: start,
			to: timestamp(Date.now()),
		});
		expect(values).toEqual([{ timestamp: start + 50, glucose: 95 }]);
	});

	test("range start and end value are included", async ({ expect }) => {
		const { repo, db } = await setupRepo();
		const start = timestamp(18550555550);
		const end = timestamp(start + 50000007);

		await db.sql`INSERT INTO glucose_values (uuid, value, timestamp) VALUES
      ('a',80,${start - 1}),
      ('b',80, ${start}),
      ('c',95,${end}),
      ('d',95,${end + 1})`;

		const values = await repo.fetch({ from: start, to: end });
		expect(values).toEqual([
			{ timestamp: start, glucose: 80 },
			{ timestamp: end, glucose: 95 },
		]);
	});

	test("values are sorted by timestamp and id order", async ({ expect }) => {
		const { repo, db } = await setupRepo();

		await db.sql`INSERT INTO glucose_values (uuid,value,timestamp) VALUES
      ('a', 80, 12300002544),
      ('b', 85, 156496),
      ('c', 95, 4556466),
      ('d', 120, 12300002544)`;

		const values = await repo.fetch({
			from: timestamp(0),
			to: timestamp(12300002544),
		});

		expect(values).toEqual([
			{ timestamp: 156496, glucose: 85 },
			{ timestamp: 4556466, glucose: 95 },
			{ timestamp: 12300002544, glucose: 80 },
			{ timestamp: 12300002544, glucose: 120 },
		]);
	});
});
