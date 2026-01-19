import { createSignal } from "solid-js";
import Left from "~icons/ant-design/arrow-left-outlined";
import Right from "~icons/ant-design/arrow-right-outlined";
import type { Dashboard } from "../application/Dashboard";
import {
	HOURS,
	presetMs,
	type TimePreset,
	TimePresets,
	timeRangeFor,
	timestamp,
} from "../domain/TimeRange";
import { useDashboard, useDashboardState } from "./DashboardContext";
import { Graph } from "./Graph";

export const App = () => {
	const dashboard = useDashboard();
	const [preset, _] = createSignal<TimePreset>(TimePresets.Last24Hours);
	const state = useDashboardState(dashboard, () => {
		const now = Date.now();
		return {
			from: timestamp(now - 24 * HOURS),
			to: timestamp(now),
		};
	});

	return (
		<div class="h-full flex flex-col">
			<Header dashboard={dashboard} preset={preset} />
			<Graph
				timeWindow={() => TimePresets.Last24Hours}
				glucose={() => state().values}
				class={() => "grow"}
			/>
		</div>
	);
};

const Header = (props: { dashboard: Dashboard; preset: () => TimePreset }) => {
	const previous = () => {
		const end = props.dashboard.getEnd() ?? timestamp(Date.now());
		const { from: start } = timeRangeFor(props.preset(), end);
		props.dashboard.updateEnd(start);
	};

	const next = () => {
		const end = props.dashboard.getEnd() ?? timestamp(Date.now());
		const newEnd = timestamp(end + presetMs(props.preset()));
		props.dashboard.updateEnd(newEnd);
	};

	return (
		<div class="flex h-10 justify-end pr-8 gap-2">
			<button type="button" class="flex items-center" on:click={previous}>
				<Left />
			</button>
			<button type="button" class="flex items-center" on:click={next}>
				<Right />
			</button>
		</div>
	);
};
