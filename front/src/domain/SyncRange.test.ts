import { describe, test, vi } from "vitest";
import { type GlucoseSyncRepo, SyncRange } from "./SyncRange";
import type { SyncSource } from "./SyncSource";
import { fromDate, timestamp } from "./TimeRange";

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

	describe("fetch only missing range", () => {
		test("when calling from 0 to 1000 and getting missing range [0..400] and [500..800], call fetchBatch with [0..400] and [500..800]", async ({
			expect,
		}) => {
			const source = {
				fetchBatch: vi
					.fn<SyncSource["fetchBatch"]>()
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

			repo.getMissingRanges = async () => {
				return [
					{ from: timestamp(0), to: timestamp(400) },
					{ from: timestamp(500), to: timestamp(800) },
				];
			};
			const sync = new SyncRange(repo, source);

			await sync.run({ from: timestamp(0), to: timestamp(1000) });
			expect(source.fetchBatch).toHaveBeenCalledTimes(2);
			expect(source.fetchBatch).toHaveBeenCalledWith({
				from: timestamp(0),
				to: timestamp(400),
			});
			expect(source.fetchBatch).toHaveBeenCalledWith({
				from: timestamp(500),
				to: timestamp(800),
			});
		});

		test("when calling [0..1000] and has no missing ranges, do not call fetchBatch", async ({
			expect,
		}) => {
			const source = {
				fetchBatch: vi.fn<SyncSource["fetchBatch"]>(),
			};

			repo.getMissingRanges = async () => {
				return [];
			};
			const sync = new SyncRange(repo, source);
			await sync.run({ from: timestamp(0), to: timestamp(1000) });
			expect(source.fetchBatch).not.toHaveBeenCalled();
		});
	});
});
