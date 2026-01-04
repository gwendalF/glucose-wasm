import { createResource } from "solid-js";
import { Graph } from "./Graph";
import { useRepository } from "./repository/context";
import { TimePresets, timestamp } from "./timeRange";

export const App = () => {
	const repo = useRepository();
	const [glucose] = createResource(async () => {
		const values = await repo.getGlucoseValues({
			start: timestamp(0),
			end: timestamp(Date.now()),
		});

		return values;
	});

	return <Graph timeWindow={() => TimePresets.Last24Hours} glucose={glucose} />;
};
