import { parseDate } from "@ark-ui/solid";
import {
	fromDate,
	presetMs,
	type TimePreset,
	TimePresets,
	timeRangeFor,
	timestamp,
} from "@domain/TimeRange";
import { getLocalTimeZone } from "@internationalized/date";
import { A } from "@solidjs/router";
import { DatePicker } from "@ui/components/DatePicker";
import { Button } from "@ui/components/ui/button";
import { useSyncer } from "@ui/syncerContext";
import {
	createEffect,
	createResource,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import Left from "~icons/ant-design/arrow-left-outlined";
import Right from "~icons/ant-design/arrow-right-outlined";
import { Graph } from "./Graph";

export function Dashboard() {
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

	const previous = () => {
		const currentEnd = fromDate(end());
		const { from: start } = timeRangeFor(preset(), currentEnd);
		setEnd(new Date(start));
	};

	const next = () => {
		const currentEnd = fromDate(end());
		const newEnd = timestamp(currentEnd + presetMs(preset()));
		setEnd(new Date(newEnd));
	};

	return (
		<div class="h-screen flex flex-col bg-[#F8FAFC]">
			<header class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
				<span></span>
				<Header
					preset={preset}
					end={end}
					setEnd={setEnd}
					setPreset={setPreset}
				/>

				<A
					href="/analysis"
					class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
				>
					<span class="text-xs font-bold text-slate-500 group-hover:text-indigo-600">
						ANALYSES
					</span>
					<Right class="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
				</A>
			</header>

			<main class="flex-1 p-4 md:p-8 flex flex-col gap-6">
				<div class="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm relative p-6">
					<div class="absolute inset-y-0 left-4 flex items-center z-99">
						<Button
							onClick={previous}
							variant="ghost"
							class="rounded-full h-12 w-12 bg-white/80 backdrop-blur shadow-md hover:scale-110 transition-transform"
						>
							<Left />
						</Button>
					</div>
					<div class="absolute inset-y-0 right-4 flex items-center z-99">
						<Button
							onClick={next}
							variant="ghost"
							class="rounded-full h-12 w-12 bg-white/80 backdrop-blur shadow-md hover:scale-110 transition-transform"
						>
							<Right />
						</Button>
					</div>

					<Graph timeWindow={() => TimePresets.Last24Hours} data={data} />
				</div>
			</main>
		</div>
	);
}

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
	return (
		<div class="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center pt-6 mx-2">
			<div class="grid-col-start-2 flex flex-col gap-4">
				<DatePicker
					value={[parseDate(props.end())]}
					onValueChange={(e) => {
						const changed = e.value[0];
						if (changed) {
							props.setEnd(changed.toDate(getLocalTimeZone()));
						}
					}}
					readOnlyInput
				/>
				<div class="flex gap-2 w-full justify-center overflow-x-auto pb-2 md:pb-0 md:w-auto">
					{presetLabels.map((preset) => (
						<Button
							variant={props.preset() === preset ? "default" : "outline"}
							onClick={[props.setPreset, preset]}
							class="text-xs h-8"
						>
							{presetLabel(preset)}
						</Button>
					))}
				</div>
			</div>
		</div>
	);
};
