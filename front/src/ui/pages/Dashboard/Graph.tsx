import type { GlucoseValue } from "@domain/GlucoseValue";
import type { TimePreset } from "@domain/TimeRange";
import { prepareData } from "@ui/pages/Dashboard/prepareData";
import { useDimension } from "@ui/useDimension";

import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

interface Props {
	timeWindow(): TimePreset;
	glucose(): GlucoseValue[] | undefined;
}

const formatFr = {
	hhmm: (date: Date) =>
		date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
	ddmm: (date: Date) =>
		date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
};

const options = (tooltip: HTMLDivElement): uPlot.Options => {
	return {
		width: 100,
		height: 100,

		cursor: {
			y: false,
		},
		scales: {
			x: {
				time: true,
				auto: true,
			},
			y: {
				range: (_, min, max) => [
					Math.min(0.9 * min, 40),
					Math.max(1.1 * max, 300),
				],
			},
		},

		axes: [
			{
				stroke: "#666",
				values: (_, ticks) => {
					return ticks.map((t) => {
						const date = new Date(t * 1000);
						if (date.getHours() === 0 && date.getMinutes() === 0) {
							return formatFr.ddmm(date);
						}

						return formatFr.hhmm(date);
					});
				},
			},
			{ stroke: "#666" },
		],
		series: [
			{},
			{
				stroke: "#3b82f6",
				width: 2,
				points: { show: false },
			},
		],
		hooks: {
			init: [(u) => u.over.appendChild(tooltip)],
			setCursor: [
				(u) => {
					const { idx } = u.cursor;
					if (!idx && idx !== 0) {
						tooltip.classList.add("hidden");
						return;
					}

					const val = u.data[1][idx];
					const time = u.data[0][idx];

					if (typeof val === "number") {
						const x = u.valToPos(time, "x");
						const y = u.valToPos(val, "y");

						const timeStr = new Date(time * 1000).toLocaleTimeString("fr-FR", {
							hour: "2-digit",
							minute: "2-digit",
						});

						tooltip.innerHTML = `<div style="font-size: 0.8em; opacity: 0.8;">${timeStr}</div><div>${val} mg/dL</div>`;
						tooltip.classList.remove("hidden");

						tooltip.style.left = `${x}px`;
						tooltip.style.top = `${y - 45}px`;
						tooltip.style.transform = "translateX(-50%)";
					}
				},
			],
		},
	};
};

export function Graph(props: Props) {
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const [size] = useDimension(ref);

	let chart: uPlot | undefined;
	let tooltip: HTMLDivElement;

	onMount(() => {
		const tooltipClasses =
			"absolute bg-white/95 p-2 border border-blue-500 rounded shadow-md pointer-events-none hidden z-100 text-xs font-bold text-blue-900";

		tooltip = document.createElement("div");
		tooltip.className = tooltipClasses;
	});

	createEffect(() => {
		const refSize = size();
		if (refSize && chart) {
			chart.setSize({ width: refSize.width, height: refSize.height });
		}
	});

	createEffect(() => {
		const div = ref();
		if (!div) return;

		if (!chart) {
			const opts = options(tooltip);
			chart = new uPlot(
				{ ...opts, width: div.clientWidth, height: div.clientHeight },
				undefined,
				div,
			);
		}

		chart.setData(prepareData(props.glucose() ?? []));
	});

	onCleanup(() => {
		if (chart) chart.destroy();
	});

	return (
		<div class="w-full h-full relative overflow-hidden">
			<div ref={setRef} class="absolute inset-0" />
		</div>
	);
}
