import { render } from "solid-js/web";
import "solid-devtools";
import "virtual:uno.css";
import "@unocss/reset/eric-meyer.css";

import { Analyser } from "@application/Analyser";
import { GlucoseSyncer } from "@application/GlucoseSyncer";
import { GapHandler } from "@domain/GapManager";
import { RangeSet } from "@domain/RangeSet";
import { SYNC_POLICY } from "@domain/syncPolicy";
import { type TimeRange, timestamp } from "@domain/TimeRange";
import {
	DefaultClient,
	HttpDataSource,
	ThrottledClient,
} from "@infra/DataSource";
import { AnalyserContext } from "@ui/analyserContext";
import { GlucoseSyncerContext } from "@ui/syncerContext";
import { SQLocal } from "sqlocal";
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
		dbName = "testing.db";
		const { deleteDatabaseFile } = new SQLocal(dbName);
		await deleteDatabaseFile();
	}

	const apiUrl = import.meta.env.VITE_API_URL;
	const sqlLocal = await SQLite.create(
		dbName,
		SYNC_POLICY.maxDelayBetweenSamples,
	);

	sqlLocal
		.database()
		.reactiveQuery((sql) => sql`SELECT count(*) AS n FROM known_ranges`)
		.subscribe((d) => {
			console.log("Known subs", d);
		});
	const httpClient = new DefaultClient();
	const source = new HttpDataSource(apiUrl, httpClient);
	const gapManager = new GapHandler(SYNC_POLICY.maxDelayBetweenSamples);
	const anlyser = new Analyser(sqlLocal);

	const slowClient = new ThrottledClient(1_000, httpClient);
	const slowSyncer = new GlucoseSyncer(
		sqlLocal,
		new HttpDataSource(apiUrl, slowClient),
		gapManager,
		(knownsRanges: TimeRange[]) => {
			return new RangeSet(knownsRanges, SYNC_POLICY.maxDelayBetweenSamples);
		},
	);

	slowSyncer.fetchMissing({ from: timestamp(0), to: timestamp(Date.now()) });

	const glucoseSyncer = new GlucoseSyncer(
		sqlLocal,
		source,
		gapManager,
		(knownsRanges: TimeRange[]) => {
			return new RangeSet(knownsRanges, SYNC_POLICY.maxDelayBetweenSamples);
		},
	);

	if (root) {
		render(
			() => (
				<GlucoseSyncerContext.Provider value={glucoseSyncer}>
					<AnalyserContext.Provider value={anlyser}>
						<App />
					</AnalyserContext.Provider>
				</GlucoseSyncerContext.Provider>
			),
			root,
		);
	}
};

boostrap();
