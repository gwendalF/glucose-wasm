import { timestamp } from "@domain/TimeRange";
import { beforeEach, describe, test } from "vitest";
import { InMemoryStore } from "./GlucoseStore";

describe("InMemoryStore - addMeasurements (Merge Logic)", () => {
	let store: InMemoryStore;

	beforeEach(() => {
		store = new InMemoryStore();
	});

	test("should initialize with empty arrays", async ({ expect }) => {
		const data = await store.getData({
			from: timestamp(0),
			to: timestamp(Infinity),
		});
		expect(data.length).toBe(0);
		expect(data.timestamps).toBeInstanceOf(Float64Array);
	});

	test("should handle Case 1: Initial insertion (Empty Store)", async ({
		expect,
	}) => {
		const measurements = [{ timestamp: timestamp(100), glucose: 120 }];
		await store.addMeasurements(measurements);

		const data = await store.getData({
			from: timestamp(0),
			to: timestamp(200),
		});
		expect(data.length).toBe(1);
		expect(data.timestamps[0]).toBe(100);
		expect(data.values[0]).toBe(120);
	});

	test("should handle Case 2: Append (Pure Future)", async ({ expect }) => {
		await store.addMeasurements([{ timestamp: timestamp(100), glucose: 100 }]);
		await store.addMeasurements([{ timestamp: timestamp(200), glucose: 200 }]);

		const data = await store.getData({
			from: timestamp(0),
			to: timestamp(300),
		});
		expect(data.length).toBe(2);
		expect(Array.from(data.timestamps)).toEqual([100, 200]);
		expect(Array.from(data.values)).toEqual([100, 200]);
	});

	test("should handle Case 3: Prepend (Pure History)", async ({ expect }) => {
		await store.addMeasurements([{ timestamp: timestamp(200), glucose: 200 }]);
		await store.addMeasurements([{ timestamp: timestamp(100), glucose: 100 }]);

		const data = await store.getData({
			from: timestamp(0),
			to: timestamp(300),
		});
		expect(Array.from(data.timestamps)).toEqual([100, 200]);
		expect(Array.from(data.values)).toEqual([100, 200]);
	});

	test('should handle Case 4: Middle Insertion (The "Gap" filler)', async ({
		expect,
	}) => {
		await store.addMeasurements([
			{ timestamp: timestamp(100), glucose: 100 },
			{ timestamp: timestamp(300), glucose: 300 },
		]);
		await store.addMeasurements([{ timestamp: timestamp(200), glucose: 200 }]);

		const data = await store.getData({
			from: timestamp(0),
			to: timestamp(400),
		});
		expect(Array.from(data.timestamps)).toEqual([100, 200, 300]);
		expect(Array.from(data.values)).toEqual([100, 200, 300]);
	});

	test("should handle Case 5: Overlap with Duplicates (Last Write Wins)", async ({
		expect,
	}) => {
		// Data initial
		await store.addMeasurements([
			{ timestamp: timestamp(100), glucose: 100 },
			{ timestamp: timestamp(200), glucose: 200 },
		]);
		// Update duplicate
		await store.addMeasurements([
			{ timestamp: timestamp(200), glucose: 255 },
			{ timestamp: timestamp(300), glucose: 300 },
		]);

		const data = await store.getData({
			from: timestamp(0),
			to: timestamp(400),
		});
		expect(data.length).toBe(3);
		expect(data.values[1]).toBe(255);
		expect(Array.from(data.timestamps)).toEqual([100, 200, 300]);
	});

	test("should kill mutants on comparison boundaries (tOld === tNew)", async ({
		expect,
	}) => {
		await store.addMeasurements([{ timestamp: timestamp(100), glucose: 10 }]);
		await store.addMeasurements([{ timestamp: timestamp(100), glucose: 20 }]);

		const data = await store.getData({
			from: timestamp(0),
			to: timestamp(200),
		});
		expect(data.length).toBe(1);
		expect(data.values[0]).toBe(20);
	});

	test("should handle empty input measurements without affecting state", async ({
		expect,
	}) => {
		await store.addMeasurements([{ timestamp: timestamp(100), glucose: 100 }]);
		await store.addMeasurements([]);

		const data = await store.getData({
			from: timestamp(0),
			to: timestamp(200),
		});
		expect(data.length).toBe(1);
	});

	test("should maintain sort order even with chaotic insertion", async ({
		expect,
	}) => {
		await store.addMeasurements([{ timestamp: timestamp(300), glucose: 3 }]);
		await store.addMeasurements([{ timestamp: timestamp(100), glucose: 1 }]);
		await store.addMeasurements([{ timestamp: timestamp(200), glucose: 2 }]);

		const data = await store.getData({
			from: timestamp(0),
			to: timestamp(400),
		});
		const tsArray = Array.from(data.timestamps);
		const sortedArray = [...tsArray].sort((a, b) => a - b);
		expect(tsArray).toEqual(sortedArray);
	});
});
