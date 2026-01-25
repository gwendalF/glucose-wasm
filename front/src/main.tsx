import { render } from "solid-js/web";
import "solid-devtools";
import "virtual:uno.css";
import "@unocss/reset/eric-meyer.css";

import { AppRuntime } from "@application/AppRuntime";
import { SyncCoordinator } from "@application/SyncCoordinator";
import type { GlucosStore } from "@domain/GlucoseStore";
import type { GlucoseSyncStore } from "@domain/GlucoseSyncStore";
import { SyncRange } from "@domain/SyncRange";
import type { TransactionRangeRunner } from "@domain/TransactionRangeRunner";
import { SqlTransactionRangeRunner } from "@infra/SqlTransactionRangeRunner";
import { HttpSyncSource } from "@infra/SyncSource";
import { Dashboard } from "./application/Dashboard";
import { InMemoryStore, SQLite, SQLStore } from "./infrastructure/GlucoseStore";
import { App } from "./ui/App";
import { DashboardContext } from "./ui/DashboardContext";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

const boostrap = async () => {
	let store: GlucosStore & GlucoseSyncStore;
	let txStore: TransactionRangeRunner;
	if (import.meta.env.DEV) {
		const inMemory = new InMemoryStore({ withRandom: true });
		store = inMemory;
		txStore = {
			run: async (fn) => {
				return fn(inMemory);
			},
		};
	} else {
		const sqlLocal = await SQLite.create(":memory:");
		const sql = new SQLStore(sqlLocal.database());
		store = sql;
		txStore = new SqlTransactionRangeRunner(sql);
	}

	const source = new HttpSyncSource();
	const coordinator = new SyncCoordinator(
		new SyncRange(store, txStore, source),
	);
	const dashboard = new Dashboard(store);
	const runtime = new AppRuntime(dashboard, coordinator);
	runtime.start();

	if (root) {
		render(
			() => (
				<DashboardContext.Provider value={dashboard}>
					<App />
				</DashboardContext.Provider>
			),
			root,
		);
	}
};

boostrap();
