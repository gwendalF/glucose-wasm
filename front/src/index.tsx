import { render } from "solid-js/web";
import "solid-devtools";
import "virtual:uno.css";
import "@unocss/reset/eric-meyer.css";

import { AppRuntime } from "@application/AppRuntime";
import { SyncCoordinator } from "@application/SyncCoordinator";
import { type GlucoseSyncRepo, SyncRange } from "@domain/SyncRange";
import { HttpSyncSource } from "@infra/SyncSource";
import { Dashboard, type GlucoseRepository } from "./application/Dashboard";
import {
	InMemoryRepository,
	SQLite,
	SQLRepository,
} from "./infrastructure/GlucoseRepository";
import { App } from "./ui/App";
import { DashboardContext } from "./ui/DashboardContext";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

const boostrap = async () => {
	let repository: GlucoseRepository & GlucoseSyncRepo;
	if (import.meta.env.DEV) {
		repository = new InMemoryRepository({ withRandom: true });
	} else {
		const sqlLocal = await SQLite.create(":memory:");
		repository = new SQLRepository(sqlLocal.database());
	}

	const source = new HttpSyncSource();
	const coordinator = new SyncCoordinator(new SyncRange(repository, source));
	const dashboard = new Dashboard(repository);
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
