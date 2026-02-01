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

		await repo.addMeasurements([
			{ glucose: 80, timestamp: timestamp(50) },
			{ glucose: 90, timestamp: timestamp(50) },
		]);

		const measurements = await repo.loadMeasurements({
			from: timestamp(45),
			to: timestamp(55),
		});
		expect(measurements).toEqual([{ glucose: 80, timestamp: timestamp(50) }]);
	});

	// describe("markRangeComplete", () => {
	// 	test("insert a range when no ranges aleady completed", async ({
	// 		expect,
	// 	}) => {
	// 		const { repo, db } = await setupRepo();

	// 		await repo.markRangeComplete({
	// 			from: timestamp(1234),
	// 			to: timestamp(4567),
	// 		});

	// 		const rows = await db.sql`SELECT * FROM completed_ranges`;
	// 		expect(rows).toMatchObject([{ start: 1234, end: 4567 }]);
	// 	});

	// 	test("merges overlapping ranges", async ({ expect }) => {
	// 		const { repo, db } = await setupRepo();

	// 		await db.sql`INSERT INTO completed_ranges (start, end) VALUES (${timestamp(15)},${timestamp(25)} ), (${timestamp(30)}, ${timestamp(35)})`;

	// 		await repo.markRangeComplete({ from: timestamp(20), to: timestamp(30) });

	// 		const rows = await db.sql`SELECT * FROM completed_ranges`;
	// 		expect(rows).toMatchObject([
	// 			{ start: timestamp(15), end: timestamp(35) },
	// 		]);
	// 	});

	// 	test("handle non-overlapping ranges", async ({ expect }) => {
	// 		const { repo, db } = await setupRepo();
	// 		await db.sql`INSERT INTO completed_ranges (start, end) VALUES (${timestamp(10)}, ${timestamp(15)}), (${timestamp(20)}, ${timestamp(25)})`;

	// 		await repo.markRangeComplete({ from: timestamp(30), to: timestamp(35) });

	// 		const rows = await db.sql`SELECT * FROM completed_ranges`;
	// 		expect(rows).toMatchObject([
	// 			{ start: 10, end: 15 },
	// 			{ start: 20, end: 25 },
	// 			{ start: 30, end: 35 },
	// 		]);
	// 	});
	// });

	// test("when no range return the requested range", async ({ expect }) => {
	// 	const { repo } = await setupRepo();

	// 	const requested = { from: timestamp(10), to: timestamp(50) };
	// 	const ranges = await repo.getMissingRanges(requested);
	// 	expect(ranges).toMatchObject([requested]);
	// });

	// test("return only range not already completed", async ({ expect }) => {
	// 	const { repo, db } = await setupRepo();

	// 	await db.sql`INSERT INTO completed_ranges (start, end) VALUES (${timestamp(1234)}, ${timestamp(4567)})`;

	// 	const ranges = await repo.getMissingRanges({
	// 		from: timestamp(10),
	// 		to: timestamp(3000),
	// 	});
	// 	expect(ranges).toMatchObject([
	// 		{ from: timestamp(10), to: timestamp(1234) },
	// 	]);
	// });

	// test("non intersecting range is irrelevant", async ({ expect }) => {
	// 	const { repo, db } = await setupRepo();

	// 	await db.sql`INSERT INTO completed_ranges (start, end) VALUES (${timestamp(1234)}, ${timestamp(4567)}), (${timestamp(5000)}, ${timestamp(6000)})`;

	// 	const ranges = await repo.getMissingRanges({
	// 		from: timestamp(10),
	// 		to: timestamp(2000),
	// 	});
	// 	expect(ranges).toMatchObject([
	// 		{ from: timestamp(10), to: timestamp(1234) },
	// 	]);
	// });
});
