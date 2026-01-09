import { describe, test, vi } from "vitest";
import type { GlucoseValue } from "./dashboard";
import { fromDate, type TimeRange, timestamp } from "./timeRange";

type SyncBatch = { items: GlucoseValue[] } & (
	| {
			coveredRange: TimeRange;
			status: "complete";
	  }
	| {
			status: "pending";
	  }
);

interface SyncSource {
	fetchBatch(range: TimeRange): Promise<SyncBatch>;
}

interface GlucoseSyncRepo {
	insertItems(items: readonly GlucoseValue[]): Promise<void>;
	markRangeComplete(range: TimeRange): Promise<void>;
	getMissingRanges(requested: TimeRange): Promise<TimeRange[]>;
}

class SyncRange {
	constructor(
		private readonly repo: GlucoseSyncRepo,
		private readonly source: SyncSource,
	) {}

	run = async (range: TimeRange) => {
		const ranges = await this.repo.getMissingRanges(range);
		for (const range of ranges) {
			await this.runOneRange(range);
		}
	};

	private runOneRange = async (range: TimeRange) => {
		let from = range.from;
		while (from < range.to) {
			const batch = await this.fetchAndInsert({ from: from, to: range.to });
			if (batch.status === "complete") {
				const coveredRange = {
					from: from,
					to: batch.coveredRange.to,
				};

				await this.repo.markRangeComplete(coveredRange);
				from = batch.coveredRange.to;
			} else {
				break;
			}
		}
	};

	private fetchAndInsert = async (range: TimeRange) => {
		const batch = await this.source.fetchBatch(range);
		if (batch.items.length > 0) {
			await this.repo.insertItems(batch.items);
		}

		return batch;
	};
}

describe("SyncRange check repo calls", ({ beforeEach }) => {
	let repo: GlucoseSyncRepo;
	beforeEach(() => {
		repo = {
			insertItems: vi.fn(),
			markRangeComplete: vi.fn(),
			getMissingRanges: async (requested) => {
				return [requested];
			},
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
			from: timestamp(1000),
			to: timestamp(2000),
		});

		expect(repo.insertItems).toHaveBeenCalledOnce();
		expect(repo.markRangeComplete).toHaveBeenCalledOnce();
	});

	test("does not fetch data when to is before from", async ({ expect }) => {
		const source = {
			fetchBatch: vi.fn<SyncSource["fetchBatch"]>().mockResolvedValue({
				items: [{ timestamp: timestamp(1234), glucose: 80 }],
				coveredRange: { from: timestamp(1000), to: timestamp(2000) },
				status: "complete",
			}),
		};

		const sync = new SyncRange(repo, source);
		await sync.run({
			from: timestamp(456),
			to: timestamp(123),
		});
		expect(source.fetchBatch).not.toHaveBeenCalled();
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
				status: "pending",
			}),
		};

		const sync = new SyncRange(repo, source);
		await sync.run({
			from: fromDate(new Date("2026-01-01T12:00:00.000Z")),
			to: fromDate(new Date("2026-01-31T12:00:00.000Z")),
		});

		expect(repo.markRangeComplete).not.toHaveBeenCalled();
	});

	test("refetches remaining range if server returns a smaller completed range than requested", async ({
		expect,
	}) => {
		const source = {
			fetchBatch: vi
				.fn<SyncSource["fetchBatch"]>()
				.mockResolvedValueOnce({
					items: [{ timestamp: timestamp(123), glucose: 80 }],
					coveredRange: { from: timestamp(123), to: timestamp(200) },
					status: "complete",
				})
				.mockResolvedValueOnce({
					items: [],
					status: "pending",
				}),
		};

		const sync = new SyncRange(repo, source);

		await sync.run({ from: timestamp(100), to: timestamp(300) });

		expect(source.fetchBatch).toHaveBeenCalledTimes(2);
		expect(repo.insertItems).toHaveBeenCalledTimes(1);
		expect(repo.markRangeComplete).toHaveBeenCalledOnce();
	});

	test("don't refetch already completed ranges", async ({ expect }) => {
		const source = {
			fetchBatch: vi
				.fn<SyncSource["fetchBatch"]>()
				.mockResolvedValueOnce({
					items: [
						{ timestamp: timestamp(100), glucose: 80 },
						{ timestamp: timestamp(200), glucose: 90 },
					],
					coveredRange: { from: timestamp(100), to: timestamp(200) },
					status: "complete",
				})
				.mockResolvedValueOnce({
					items: [],
					status: "pending",
				}),
		};

		let sync = new SyncRange(repo, source);
		await sync.run({ from: timestamp(0), to: timestamp(200) });

		source.fetchBatch.mockClear();
		repo.getMissingRanges = async () => {
			return [];
		};
		sync = new SyncRange(repo, source);

		await sync.run({ from: timestamp(0), to: timestamp(500) });
		expect(source.fetchBatch).not.toHaveBeenCalled();
	});

	test("fetch only missing ranges", async ({ expect }) => {
		const source = {
			fetchBatch: vi
				.fn<SyncSource["fetchBatch"]>()
				.mockResolvedValueOnce({
					items: [
						{ timestamp: timestamp(100), glucose: 80 },
						{ timestamp: timestamp(200), glucose: 90 },
					],
					coveredRange: { from: timestamp(100), to: timestamp(200) },
					status: "complete",
				})
				.mockResolvedValueOnce({
					items: [],
					status: "pending",
				})
				.mockResolvedValueOnce({
					items: [{ timestamp: timestamp(100), glucose: 80 }],
					coveredRange: {
						from: timestamp(0),
						to: timestamp(400),
					},
					status: "complete",
				})
				.mockResolvedValueOnce({
					items: [{ timestamp: timestamp(600), glucose: 120 }],
					coveredRange: { from: timestamp(600), to: timestamp(1000) },
					status: "complete",
				}),
		};

		let sync = new SyncRange(repo, source);
		await sync.run({ from: timestamp(0), to: timestamp(1000) });

		source.fetchBatch.mockClear();
		repo.getMissingRanges = async () => {
			return [
				{ from: timestamp(0), to: timestamp(400) },
				{ from: timestamp(500), to: timestamp(800) },
			];
		};
		sync = new SyncRange(repo, source);

		await sync.run({ from: timestamp(0), to: timestamp(1000) });
		expect(source.fetchBatch).toHaveBeenCalledTimes(2);
	});
});
