import type { Analyser } from "@application/Analyser";
import { createContext, useContext } from "solid-js";

export const AnalyserContext = createContext<Analyser>();

export function useAnalyser() {
	const analyser = useContext(AnalyserContext);
	if (!analyser) {
		throw new Error("Analyser is undefined or no AnalyserProvider");
	}

	return analyser;
}
