import { describe, test, vi } from "vitest";
import type { GlucoseValue } from "./dashboard";
import { fromDate, type TimeRange, timestamp } from "./timeRange";

type SyncBatch = {
	items: GlucoseValue[];
	coveredRange: TimeRange;
	status: "partial" | "complete";
};

interface SyncSource {
	fetchBatch(): Promise<SyncBatch>;
}

interface GlucoseSyncRepo {
	insertItems(items: readonly GlucoseValue[]): Promise<void>;
	markRangeComplete(range: TimeRange): Promise<void>;
}

class SyncRange {
	constructor(
		private readonly repo: GlucoseSyncRepo,
		private readonly source: SyncSource,
	) {}

	run = async (range: TimeRange) => {
		const batch = await this.source.fetchBatch();
		if (batch.items.length) {
			await this.repo.insertItems(batch.items);
		}

		if (batch.status === "complete") {
			await this.repo.markRangeComplete(range);
		}
	};
}

describe("SyncRange check repo calls", ({ beforeEach }) => {
	let repo: GlucoseSyncRepo;
	beforeEach(() => {
		repo = {
			insertItems: vi.fn(),
			markRangeComplete: vi.fn(),
		};
	});
	test("insert a single range in the repo", async ({ expect }) => {
		const source = {
			fetchBatch: vi.fn<SyncSource["fetchBatch"]>().mockResolvedValue({
				items: [{ timestamp: timestamp(1234), glucose: 80 }],
				coveredRange: { from: timestamp(1000), to: timestamp(2000) },
				status: "complete",
			}),
		};

		const sync = new SyncRange(repo, source);

		await sync.run({
			from: fromDate(new Date("2026-01-01T12:00:00.000Z")),
			to: fromDate(new Date("2026-01-01T18:00:00.000Z")),
		});

		expect(repo.insertItems).toHaveBeenCalledOnce();
		expect(repo.markRangeComplete).toHaveBeenCalledOnce();
	});

	test("does not insert empty batch", async ({ expect }) => {
		const source = {
			fetchBatch: vi.fn<SyncSource["fetchBatch"]>().mockResolvedValue({
				items: [],
				coveredRange: {
					from: fromDate(new Date("2026-01-01T12:00:00.000Z")),
					to: fromDate(new Date("2026-01-01T18:00:00.000Z")),
				},
				status: "complete",
			}),
		};

		const sync = new SyncRange(repo, source);

		await sync.run({
			from: fromDate(new Date("2026-01-01T12:00:00.000Z")),
			to: fromDate(new Date("2026-01-01T18:00:00.000Z")),
		});

		expect(repo.insertItems).not.toHaveBeenCalled();
		expect(repo.markRangeComplete).toHaveBeenCalledOnce();
	});

	test("does not markRangeComplete if not completed", async ({ expect }) => {
		const source = {
			fetchBatch: vi.fn<SyncSource["fetchBatch"]>().mockResolvedValue({
				items: [],
				coveredRange: {
					from: fromDate(new Date("2026-01-01T12:00:00.000Z")),
					to: fromDate(new Date("2026-01-01T18:00:00.000Z")),
				},
				status: "partial",
			}),
		};

		const sync = new SyncRange(repo, source);
		await sync.run({
			from: fromDate(new Date("2026-01-01T12:00:00.000Z")),
			to: fromDate(new Date("2026-01-31T12:00:00.000Z")),
		});

		expect(repo.markRangeComplete).not.toHaveBeenCalled();
	});

	test("downloads two batches when the first is partial", async ({
		expect,
	}) => {
		const source = {
			fetchBatch: vi
				.fn<SyncSource["fetchBatch"]>()
				.mockResolvedValueOnce({
					items: [{ timestamp: timestamp(123), glucose: 80 }],
					coveredRange: { from: timestamp(123), to: timestamp(200) },
					status: "partial",
				})
				.mockResolvedValueOnce({
					items: [{ timestamp: timestamp(201), glucose: 110 }],
					coveredRange: { from: timestamp(201), to: timestamp(250) },
					status: "complete",
				}),
		};

		const sync = new SyncRange(repo, source);

		await sync.run({ from: timestamp(100), to: timestamp(250) });

		expect(source.fetchBatch).toHaveBeenCalledTimes(2);
		expect(repo.insertItems).toHaveBeenCalledTimes(2);
		expect(repo.markRangeComplete).toHaveBeenCalledOnce();
	});
});
