import { createContext, useContext } from "solid-js";
import type { Repository } from "../dashboard";

export const RepositoryContext = createContext<Repository>();

export const useRepository = () => {
	const repo = useContext(RepositoryContext);
	if (!repo) {
		throw new Error(
			"Repository is undefined in the provider or no provider in the tree",
		);
	}

	return repo;
};
