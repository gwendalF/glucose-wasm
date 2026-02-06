import { describe, test } from "vitest";
import { fromDate, timestamp } from "../src/domain/TimeRange";
import { SQLite } from "../src/infrastructure/GlucoseStore";

describe("SQLite glucose repository", () => {
	const setupRepo = async () => {
		const sqlite = await SQLite.create(":memory:");
		const db = sqlite.database();
		return { repo: sqlite, db };
	};

	test("no values by default", async ({ expect }) => {
		const { repo } = await setupRepo();
		const values = await repo.loadMeasurements({
			from: timestamp(0),
			to: timestamp(Date.now()),
		});
		expect(values).toHaveLength(0);
	});

	test("do not returns rows before start", async ({ expect }) => {
		const { repo, db } = await setupRepo();

		const start = fromDate(new Date("2026-01-02T12:00:00.000Z"));
		await db.sql`INSERT INTO glucose_values (value, timestamp)
	        VALUES  (80, ${start - 10}),
	                (95, ${start + 50})`;

		const values = await repo.loadMeasurements({
			from: start,
			to: timestamp(Date.now()),
		});
		expect(values).toEqual([{ timestamp: start + 50, glucose: 95 }]);
	});

	test("range start and end value are included", async ({ expect }) => {
		const { repo, db } = await setupRepo();
		const start = timestamp(18550555550);
		const end = timestamp(start + 50000007);

		await db.sql`INSERT INTO glucose_values (value, timestamp) VALUES
	  (80,${start - 1}),
	  (80, ${start}),
	  (95,${end}),
	  (95,${end + 1})`;

		const values = await repo.loadMeasurements({ from: start, to: end });
		expect(values).toEqual([
			{ timestamp: start, glucose: 80 },
			{ timestamp: end, glucose: 95 },
		]);
	});

	test("values are sorted by timestamp", async ({ expect }) => {
		const { repo, db } = await setupRepo();

		await db.sql`INSERT INTO glucose_values (value, timestamp) VALUES
	  (80, 12300002544),
	  (85, 156496),
	  (95, 4556466)`;

		const values = await repo.loadMeasurements({
			from: timestamp(0),
			to: timestamp(12300002544),
		});

		expect(values).toEqual([
			{ timestamp: 156496, glucose: 85 },
			{ timestamp: 4556466, glucose: 95 },
			{ timestamp: 12300002544, glucose: 80 },
		]);
	});

	test("when trying to insert duplicate only first is kept", async ({
		expect,
	}) => {
		const { repo } = await setupRepo();

		await repo.addMeasurements(
			[
				{ glucose: 80, timestamp: timestamp(50) },
				{ glucose: 90, timestamp: timestamp(50) },
			],
			async () => {},
		);

		const measurements = await repo.loadMeasurements({
			from: timestamp(45),
			to: timestamp(55),
		});
		expect(measurements).toEqual([{ glucose: 80, timestamp: timestamp(50) }]);
	});
});
