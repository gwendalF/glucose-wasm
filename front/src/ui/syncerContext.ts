import type { GlucoseSyncer } from "@application/GlucoseSyncer";
import { createContext, useContext } from "solid-js";

export const GlucoseSyncerContext = createContext<GlucoseSyncer>();

export function useSyncer() {
	const syncer = useContext(GlucoseSyncerContext);
	if (!syncer) {
		throw new Error("GlucoseSyncer is undefined or no SyncerProvider");
	}

	return syncer;
}
