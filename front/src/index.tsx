import { render } from "solid-js/web";
import "solid-devtools";
import "virtual:uno.css";
import "@unocss/reset/eric-meyer.css";

import { App } from "./App";
import { Dashboard, type GlucoseRepository } from "./core/dashboard";
import { DashboardContext } from "./dashboard_context";
import {
	InMemoryRepository,
	SQLite,
	SQLRepository,
} from "./repository/glucose_repository";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

const boostrap = async () => {
	let repository: GlucoseRepository;
	if (import.meta.env.DEV && false) {
		repository = new InMemoryRepository({ withRandom: true });
	} else {
		const sqlLocal = await SQLite.create(":memory:");
		repository = new SQLRepository(sqlLocal.database());
	}

	const dashboard = new Dashboard(repository);
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
