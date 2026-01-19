import type { RangeSynchronizer, SyncRange } from "@domain/SyncRange";
import { timestamp } from "@domain/TimeRange";
import { describe, test, vi } from "vitest";
import { SyncCoordinator } from "./SyncCoordinator";

describe("SyncCoordinator", ({ beforeEach }) => {
	const testRange = {
		from: timestamp(0),
		to: timestamp(132),
	};

	let sync: RangeSynchronizer;
	beforeEach(() => {
		sync = {
			run: vi.fn<RangeSynchronizer["run"]>().mockResolvedValue(undefined),
		};
	});

	test("starts a sync when requested for a range", async ({ expect }) => {
		const coordinator = new SyncCoordinator(sync);
		coordinator.requestRange(testRange);

		expect(sync.run).toHaveBeenCalledWith(testRange);
	});

	test("does not start a second sync if the same range is already syncing", async ({
		expect,
	}) => {
		const coordinator = new SyncCoordinator(sync);

		const p1 = coordinator.requestRange(testRange);
		const p2 = coordinator.requestRange(testRange);
		await Promise.all([p1, p2]);

		expect(sync.run).toHaveBeenCalledOnce();
	});

	test("allows syncing a different range while one is already running", async ({
		expect,
	}) => {
		const coordinator = new SyncCoordinator(sync);

		const p1 = coordinator.requestRange(testRange);
		const p2 = coordinator.requestRange({
			from: timestamp(300),
			to: timestamp(500),
		});
		await Promise.all([p1, p2]);

		expect(sync.run).toHaveBeenCalledTimes(2);
		expect(sync.run).toHaveBeenCalledWith(testRange);
		expect(sync.run).toHaveBeenCalledWith({
			from: timestamp(300),
			to: timestamp(500),
		});
	});

	test("allows a range to be synced again after completion", async ({
		expect,
	}) => {
		const coordinator = new SyncCoordinator(sync);

		await coordinator.requestRange(testRange);
		await coordinator.requestRange(testRange);

		expect(sync.run).toHaveBeenCalledTimes(2);
	});

	test("does not throw if sync fails", async ({ expect }) => {
		const sync = {
			run: vi
				.fn<SyncRange["run"]>()
				.mockRejectedValueOnce(new Error("network error")),
		};

		const coordinator = new SyncCoordinator(sync, () => {});

		await expect(coordinator.requestRange(testRange)).resolves.not.toThrow();
	});

	test("can provide custom logger", async ({ expect }) => {
		const err = new Error("network error");
		const sync = {
			run: vi.fn<SyncRange["run"]>().mockRejectedValueOnce(err),
		};

		const warnings: unknown[] = [];
		const logger = (message: unknown) => {
			warnings.push(message);
		};

		const coordinator = new SyncCoordinator(sync, logger);
		await coordinator.requestRange(testRange);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toBe(err);
	});
});
