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
	HttpDataSource,
	PostcardClient,
	ThrottledClient,
} from "@infra/DataSource";
import { InMemoryStore } from "@infra/GlucoseStore";
import { AnalyserContext } from "@ui/analyserContext";
import { GlucoseSyncerContext } from "@ui/syncerContext";
import { App } from "./ui/App";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

const boostrap = async () => {
	const apiUrl = import.meta.env.VITE_API_URL;

	const store = new InMemoryStore();

	const httpClient = new PostcardClient();
	const source = new HttpDataSource(apiUrl, httpClient);
	const gapManager = new GapHandler(SYNC_POLICY.maxDelayBetweenSamples);
	const anlyser = new Analyser(store);

	const slowClient = new ThrottledClient(
		SYNC_POLICY.slowFetchDelayms,
		httpClient,
	);
	const slowSyncer = new GlucoseSyncer(
		store,
		new HttpDataSource(apiUrl, slowClient),
		gapManager,
		(knownsRanges: TimeRange[]) => {
			return new RangeSet(knownsRanges, SYNC_POLICY.maxDelayBetweenSamples);
		},
	);

	slowSyncer.fetchMissing({ from: timestamp(0), to: timestamp(Date.now()) });

	const glucoseSyncer = new GlucoseSyncer(
		store,
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
