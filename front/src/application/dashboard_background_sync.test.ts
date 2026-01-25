import { SyncRange } from "@domain/SyncRange";
import { HOURS, timestamp } from "@domain/TimeRange";
import type { TransactionRangeRunner } from "@domain/TransactionRangeRunner";
import type { TransactionRangeStore } from "@domain/TransactionRangeStore";
import { InMemoryStore } from "@infra/GlucoseStore";
import { describe, test, vi } from "vitest";
import { AppRuntime } from "./AppRuntime";
import { Dashboard } from "./Dashboard";
import { SyncCoordinator } from "./SyncCoordinator";

describe("the dashboard show local data and trigger a background sync to get remote data", () => {
	const makeTxStore = (repo: TransactionRangeStore): TransactionRangeRunner => {
		return {
			run: async (fn) => {
				return fn(repo);
			},
		};
	};

	test("dashboard triggers background sync when changing window", async ({
		expect,
	}) => {
		const repo = new InMemoryStore({ data: [] });
		const sync = new SyncRange(repo, makeTxStore(repo), {
			fetchBatch: async () => ({ items: [], status: "pending" }),
		});

		const dashboard = new Dashboard(repo);
		const coordinator = new SyncCoordinator(sync);
		const spy = vi.spyOn(coordinator, "requestRange");
		const appRuntime = new AppRuntime(dashboard, coordinator);
		appRuntime.start();

		// user change window
		const now = timestamp(Date.now());
		await dashboard.loadData({ end: now });

		expect(spy).toHaveBeenCalledWith({
			from: timestamp(now - 24 * HOURS),
			to: now,
		});
	});

	test("dashboard does not break when SyncCoordinator rejects", async ({
		expect,
	}) => {
		const repo = new InMemoryStore({ data: [] });
		const sync = new SyncRange(repo, makeTxStore(repo), {
			fetchBatch: async () => ({ items: [], status: "pending" }),
		});
		const dashboard = new Dashboard(repo);
		const coordinator = new SyncCoordinator(sync);
		vi.spyOn(coordinator, "requestRange").mockRejectedValueOnce(
			new Error("network"),
		);

		const appRuntime = new AppRuntime(dashboard, coordinator);
		appRuntime.start();

		const now = timestamp(Date.now());
		await expect(dashboard.loadData({ end: now })).resolves.not.toThrow();
	});

	test("dashboard shows local data immediately while background sync runs", async ({
		expect,
	}) => {
		const now = timestamp(Date.now());
		const repo = new InMemoryStore({
			data: [{ timestamp: timestamp(now - 1 * HOURS), glucose: 100 }],
		});
		const sync = new SyncRange(repo, makeTxStore(repo), {
			fetchBatch: async () => ({ items: [], status: "pending" }),
		});
		const dashboard = new Dashboard(repo);
		const coordinator = new SyncCoordinator(sync);
		const appRuntime = new AppRuntime(dashboard, coordinator);
		appRuntime.start();

		await dashboard.loadData({ end: now });

		const snapshot = dashboard.getSnapshot();
		expect(snapshot.values.length).toBeGreaterThan(0);
		expect(snapshot.status).toBe("ready");
	});

	test("dashboard triggers background sync for multiple window changes", async ({
		expect,
	}) => {
		const repo = new InMemoryStore({ data: [] });
		const sync = new SyncRange(repo, makeTxStore(repo), {
			fetchBatch: async () => ({ items: [], status: "pending" }),
		});
		const dashboard = new Dashboard(repo);
		const coordinator = new SyncCoordinator(sync);
		const spy = vi.spyOn(coordinator, "requestRange");
		const appRuntime = new AppRuntime(dashboard, coordinator);
		appRuntime.start();

		const now = timestamp(Date.now());
		const later = timestamp(Date.now() + HOURS);

		await dashboard.loadData({ end: now });
		await dashboard.loadData({ end: later });

		expect(spy).toHaveBeenCalledWith({
			from: timestamp(now - 24 * HOURS),
			to: now,
		});
		expect(spy).toHaveBeenCalledWith({
			from: timestamp(later - 24 * HOURS),
			to: later,
		});
	});
});
