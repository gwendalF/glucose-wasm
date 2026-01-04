import { render } from "solid-js/web";
import "solid-devtools";
import "virtual:uno.css";
import "@unocss/reset/eric-meyer.css";

import { App } from "./App";
import { RepositoryContext } from "./repository/context";
import { SQLite, SQLRepository } from "./repository/glucose_repository";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

const boostrap = async () => {
	const sqlLocal = await SQLite.create(":memory:");
	const repository = new SQLRepository(sqlLocal.database());

	if (root) {
		render(
			() => (
				<RepositoryContext.Provider value={repository}>
					<App />
				</RepositoryContext.Provider>
			),
			root,
		);
	}
};

boostrap();
