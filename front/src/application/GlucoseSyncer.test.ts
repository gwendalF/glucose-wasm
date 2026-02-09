import type { Repository } from "@domain/GlucoseRepository";
import { timestamp } from "@domain/TimeRange";
import { beforeEach, describe, type Mocked, test, vi } from "vitest";
import type { DataSource } from "./DataSource";
import { GlucoseSyncer } from "./GlucoseSyncer";

describe("GlucoseSyncer", () => {
	let repo: Mocked<Repository>;
	let source: Mocked<DataSource>;
	let syncer: GlucoseSyncer;

	beforeEach(() => {
		repo = {
			getMissingRanges: vi.fn(),
			ingest: vi.fn(),
			getData: vi.fn(),
			getKnownRanges: vi.fn(),
		};

		source = {
			fetchMeasurements: vi.fn(),
		};

		syncer = new GlucoseSyncer(
			repo,
			source,
			timestamp(0),
			{
				waitForOnline() {
					return new Promise((r) => r());
				},
			},
			() => {},
		);
	});

	test("does not fetch if all data is already local", async ({ expect }) => {
		const range = { from: timestamp(0), to: timestamp(100) };

		repo.getMissingRanges.mockResolvedValue([]);

		await syncer.fetchMissing(range);

		expect(source.fetchMeasurements).not.toHaveBeenCalled();
	});

	test("fetches data from source if repo reports missing ranges", async ({
		expect,
	}) => {
		const requested = { from: timestamp(0), to: timestamp(100) };

		repo.getMissingRanges.mockResolvedValue([requested]);
		source.fetchMeasurements.mockResolvedValue({ values: [], hasMore: false });
		repo.ingest.mockResolvedValue({});

		await syncer.fetchMissing(requested);

		expect(source.fetchMeasurements).toHaveBeenCalledWith(requested);
		expect(repo.ingest).toHaveBeenCalled();
	});

	test("fetches only missing ranges reported by repo", async ({ expect }) => {
		const requested = { from: timestamp(0), to: timestamp(100) };
		const missing1 = { from: timestamp(20), to: timestamp(50) };
		const missing2 = { from: timestamp(70), to: timestamp(100) };

		repo.getMissingRanges.mockResolvedValue([missing1, missing2]);
		source.fetchMeasurements.mockResolvedValue({ values: [], hasMore: false });
		repo.ingest.mockResolvedValue({});

		await syncer.fetchMissing(requested);

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
		expect(source.fetchMeasurements).toHaveBeenCalledWith(missing1);
		expect(source.fetchMeasurements).toHaveBeenCalledWith(missing2);
	});

	test("when ingest returns a nextCursor, continue polling same range", async ({
		expect,
	}) => {
		const requested = { from: timestamp(0), to: timestamp(100) };
		repo.getMissingRanges.mockResolvedValue([requested]);

		// Premier appel : renvoie un curseur à 50
		source.fetchMeasurements.mockResolvedValueOnce({
			values: [{ timestamp: timestamp(10), glucose: 80 }],
			hasMore: true,
		});
		repo.ingest.mockResolvedValueOnce({ nextCursor: timestamp(50) });

		// Deuxième appel : termine
		source.fetchMeasurements.mockResolvedValueOnce({
			values: [],
			hasMore: false,
		});
		repo.ingest.mockResolvedValueOnce({});

		await syncer.fetchMissing(requested);

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
		expect(source.fetchMeasurements).toHaveBeenNthCalledWith(2, {
			from: timestamp(50),
			to: timestamp(100),
		});
	});

	test("deduplicate concurrent requests for exactly the same range", async ({
		expect,
	}) => {
		const requested = { from: timestamp(0), to: timestamp(100) };
		repo.getMissingRanges.mockResolvedValue([requested]);

		source.fetchMeasurements.mockImplementation(
			() =>
				new Promise((res) =>
					setTimeout(() => res({ values: [], hasMore: false }), 10),
				),
		);
		repo.ingest.mockResolvedValue({});

		const p1 = syncer.fetchMissing(requested);
		const p2 = syncer.fetchMissing(requested);
		await Promise.all([p1, p2]);

		expect(source.fetchMeasurements).toHaveBeenCalledOnce();
	});

	test("allows refetching the same range after the previous call is finished", async ({
		expect,
	}) => {
		const requested = { from: timestamp(0), to: timestamp(100) };
		repo.getMissingRanges.mockResolvedValue([requested]);
		source.fetchMeasurements.mockResolvedValue({ values: [], hasMore: false });
		repo.ingest.mockResolvedValue({});

		await syncer.fetchMissing(requested);
		await syncer.fetchMissing(requested);

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
	});

	test("can fetch different ranges simultaneously", async ({ expect }) => {
		const r1 = { from: timestamp(0), to: timestamp(50) };
		const r2 = { from: timestamp(60), to: timestamp(100) };

		repo.getMissingRanges.mockImplementation(async (r) => [r]);
		source.fetchMeasurements.mockResolvedValue({ values: [], hasMore: false });
		repo.ingest.mockResolvedValue({});

		await Promise.all([syncer.fetchMissing(r1), syncer.fetchMissing(r2)]);

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
	});

	test("exponential backoff on failure", async ({ expect }) => {
		vi.useFakeTimers();
		const requested = { from: timestamp(0), to: timestamp(100) };
		repo.getMissingRanges.mockResolvedValue([requested]);

		source.fetchMeasurements
			.mockRejectedValueOnce(new Error("Network Error"))
			.mockResolvedValueOnce({ values: [], hasMore: false });

		repo.ingest.mockResolvedValue({});

		const promise = syncer.fetchMissing(requested);

		await vi.advanceTimersByTimeAsync(2001);

		await promise;

		expect(source.fetchMeasurements).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});
});
