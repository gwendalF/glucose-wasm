import { render } from "solid-js/web";
import "solid-devtools";
import "virtual:uno.css";
import "@unocss/reset/eric-meyer.css";

import { GlucoseSyncer } from "@application/GlucoseSyncer";
import type { GlucoseValue } from "@domain/GlucoseValue";
import {
	inferCoveredRanges,
	type TimeRange,
	timestamp,
} from "@domain/TimeRange";
import { DefaultClient, HttpDataSource } from "@infra/DataSource";
import { GlucoseSyncerContext } from "@ui/syncerContext";
import { SQLite } from "./infrastructure/GlucoseStore";
import { App } from "./ui/App";

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

	const maxGap = timestamp(15 * 60 * 1000);
	const sqlLocal = await SQLite.create(dbName, maxGap);
	const inferCoveredRange15min = (values: GlucoseValue[], range: TimeRange) => {
		return inferCoveredRanges(values, range, maxGap);
	};

	const source = new HttpDataSource(
		"http://localhost:4500",
		new DefaultClient(),
	);

	const glucoseSyncer = new GlucoseSyncer(
		sqlLocal,
		source,
		inferCoveredRange15min,
	);

	if (root) {
		render(
			() => (
				<GlucoseSyncerContext.Provider value={glucoseSyncer}>
					<App />
				</GlucoseSyncerContext.Provider>
			),
			root,
		);
	}
};

boostrap();
