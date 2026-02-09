import type { DateValue } from "@ark-ui/solid";
import { timestamp } from "@domain/TimeRange";
import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { A } from "@solidjs/router";
import { useAnalyser } from "@ui/analyserContext";
import { DatePicker } from "@ui/components/DatePicker";

import { createResource, createSignal } from "solid-js";

export function Analysis() {
	const analyser = useAnalyser();
	const [range, setRange] = createSignal<DateValue[]>([
		new CalendarDate(2025, 12, 1),
		new CalendarDate(2026, 1, 1),
	]);
	const timezone = getLocalTimeZone();

	const getMean = async (range: DateValue[]) => {
		if (range.length !== 2) {
			return;
		}

		const [from, to] = range;
		const data = await analyser.mean({
			from: timestamp(from.toDate(timezone).getTime()),
			to: timestamp(to.toDate(timezone).getTime()),
		});

		return data;
	};

	const [mean] = createResource(range, getMean);

	return (
		<div class="h-screen flex flex-col bg-slate-50 p-4">
			<nav class="flex items-center mb-8">
				<A
					href="/"
					class="group flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all"
				>
					<div class="p-1 rounded-lg group-hover:bg-indigo-50 transition-colors">
						<svg
							class="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							role="img"
							aria-label="gwendal"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</div>
					<span class="text-xs font-bold uppercase tracking-widest">
						Dashboard
					</span>
				</A>
			</nav>

			<div class="flex-1 flex items-center justify-center">
				<div class="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
					<h2 class="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
						Analyse de Glucose
					</h2>
					<div class="flex justify-center">
						<DatePicker
							value={range()}
							selectionMode="range"
							onValueChange={(updated) => {
								setRange(updated.value);
							}}
							readOnlyInput
						/>
					</div>

					<hr class="border-slate-100" />

					<div class="flex flex-col items-center justify-center py-2">
						<span class="text-xs font-medium text-slate-400">
							Moyenne sur la période
						</span>
						<div class="mt-1 flex items-baseline gap-1">
							<span
								class={`text-4xl font-bold tabular-nums ${mean.loading ? "animate-pulse text-slate-300" : "text-indigo-600"}`}
							>
								{mean() ? mean()?.toFixed(2) : "---"}
							</span>
							<span class="text-sm font-medium text-slate-400">mg/dL</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
