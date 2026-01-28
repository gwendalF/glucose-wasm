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
	const [end, setEnd] = createSignal(new Date("2026-01-1"));
	const [preset, _] = createSignal<TimePreset>(TimePresets.Last24Hours);

	const state = useDashboardState(dashboard, () => {
		const currentEnd = end().getTime();
		return {
			from: timestamp(currentEnd - 24 * HOURS),
			to: timestamp(currentEnd),
		};
	});

	return (
		<div class="h-full flex flex-col">
			<Header dashboard={dashboard} preset={preset} end={end} setEnd={setEnd} />
			<Graph
				timeWindow={() => TimePresets.Last24Hours}
				glucose={() => state().values}
				class={() => "grow"}
			/>
		</div>
	);
};

const Header = (props: {
	dashboard: Dashboard;
	preset: () => TimePreset;
	end: () => Date;
	setEnd: (d: Date) => void;
}) => {
	const previous = () => {
		const end = props.dashboard.getEnd() ?? timestamp(Date.now());
		const { from: start } = timeRangeFor(props.preset(), end);
		props.setEnd(new Date(start));
	};

	const next = () => {
		const end = props.dashboard.getEnd() ?? timestamp(Date.now());
		const newEnd = timestamp(end + presetMs(props.preset()));
		props.setEnd(new Date(newEnd));
	};

	return (
		<div class="flex justify-center">
			<div>{props.end().toDateString()}</div>
			<div class="flex h-10 justify-end pr-8 gap-2">
				<button type="button" class="flex items-center" on:click={previous}>
					<Left />
				</button>
				<button type="button" class="flex items-center" on:click={next}>
					<Right />
				</button>
			</div>
		</div>
	);
};
