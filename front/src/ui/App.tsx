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
import { Button } from "./components/ui/button";
import { DatePicker } from "./DatePicker";
import { Graph } from "./Graph";
import { useSyncer } from "./syncerContext";

export const App = () => {
	const syncer = useSyncer();
	const [end, setEnd] = createSignal(new Date("2026-01-1"));
	const [preset, setPreset] = createSignal<TimePreset>(TimePresets.Last24Hours);
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
			<Header preset={preset} end={end} setEnd={setEnd} setPreset={setPreset} />
			<Graph
				timeWindow={() => TimePresets.Last24Hours}
				glucose={data}
				class={() => "grow"}
			/>
		</div>
	);
};

function presetLabel(preset: TimePreset): string {
	switch (preset) {
		case "Last3Hours":
			return "3h";
		case "Last6Hours":
			return "6h";
		case "Last12Hours":
			return "12h";
		case "Last24Hours":
			return "24h";
		case "Lastyear":
			return "1 an";
	}
}

const presetLabels = [
	TimePresets.Last3Hours,
	TimePresets.Last6Hours,
	TimePresets.Last12Hours,
	TimePresets.Last24Hours,
];

const Header = (props: {
	preset: () => TimePreset;
	setPreset: (preset: TimePreset) => void;
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
		<div class="flex flex-col md:grid md:grid-cols-[auto_1fr_auto] gap-4 items-center pt-6 mx-2">
			<div class="flex gap-x-2 w-full justify-center md:w-auto md:justify-start">
				<Button onClick={previous} class="flex-1 md:flex-none">
					<Left />
				</Button>
				<Button onClick={next} class="flex-1 md:flex-none">
					<Right />
				</Button>
			</div>

			<div class="w-full flex justify-center">
				<DatePicker value={props.end} onChange={props.setEnd} />
			</div>

			<div class="flex gap-2 w-full justify-center overflow-x-auto pb-2 md:pb-0 md:w-auto md:justify-end">
				{presetLabels.map((preset) => (
					<Button
						variant={props.preset() === preset ? "default" : "outline"}
						onClick={[props.setPreset, preset]}
						class="text-xs h-8"
					>
						{presetLabel(preset)}
					</Button>
				))}
				<Button
					variant="secondary"
					class="ml-auto text-xs font-semibold tracking-tight px-3 py-1 rounded-md"
					// onClick={() => setView("analysis")}
				>
					ANALYSES
				</Button>
			</div>
		</div>
	);
};
