import { render } from "solid-js/web";
import "solid-devtools";
import "virtual:uno.css";
import "@unocss/reset/eric-meyer.css";

import { AppRuntime } from "@application/AppRuntime";
import { SyncCoordinator } from "@application/SyncCoordinator";
import { SyncRange } from "@domain/SyncRange";
import { SqlTransactionRangeRunner } from "@infra/SqlTransactionRangeRunner";
import { DefaultClient, HttpSyncSource } from "@infra/SyncSource";
import { Dashboard } from "./application/Dashboard";
import { SQLite, SQLStore } from "./infrastructure/GlucoseStore";
import { App } from "./ui/App";
import { DashboardContext } from "./ui/DashboardContext";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

const boostrap = async () => {
	let dbName = "gwendal.sqlite";
	if (import.meta.env.DEV) {
		dbName = ":memory:";
	}

	const sqlLocal = await SQLite.create(dbName);
	const sql = new SQLStore(sqlLocal.database());
	const store = sql;
	const txStore = new SqlTransactionRangeRunner(sql);

	const source = new HttpSyncSource(
		new DefaultClient(),
		"http://localhost:4500",
	);
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
