import {
	createEffect,
	createResource,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import Left from "~icons/ant-design/arrow-left-outlined";
import Right from "~icons/ant-design/arrow-right-outlined";
import {
	fromDate,
	presetMs,
	type TimePreset,
	TimePresets,
	timeRangeFor,
	timestamp,
} from "../domain/TimeRange";
import { Graph } from "./Graph";
import { useSyncer } from "./syncerContext";

export const App = () => {
	const syncer = useSyncer();
	const [end, setEnd] = createSignal(new Date("2026-01-1"));
	const [preset, _] = createSignal<TimePreset>(TimePresets.Last24Hours);
	const range = () => timeRangeFor(preset(), fromDate(end()));
	const [data, { mutate }] = createResource(range, (r) =>
		syncer.getMeasurements(r),
	);

	onMount(() => {
		const unsub = syncer.onChange(async () => {
			const udapted = await syncer.getMeasurements(range());
			mutate(udapted);
		});
		onCleanup(unsub);
	});

	createEffect(() => {
		syncer.fetchMissing(range());
	});

	return (
		<div class="h-full flex flex-col">
			<Header preset={preset} end={end} setEnd={setEnd} />
			<Graph
				timeWindow={() => TimePresets.Last24Hours}
				glucose={data}
				class={() => "grow"}
			/>
		</div>
	);
};

const Header = (props: {
	preset: () => TimePreset;
	end: () => Date;
	setEnd: (d: Date) => void;
}) => {
	const previous = () => {
		const end = fromDate(props.end());
		const { from: start } = timeRangeFor(props.preset(), end);
		props.setEnd(new Date(start));
	};

	const next = () => {
		const end = fromDate(props.end());
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
