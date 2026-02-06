import type { GlucoseValue } from "@domain/GlucoseValue";
import type { TimePreset } from "@domain/TimeRange";
import { prepareData } from "@ui/pages/Dashboard/prepareData";
import { useDimension } from "@ui/useDimension";
import { LineChart } from "echarts/charts";
import {
	DatasetComponent,
	GridComponent,
	TitleComponent,
	TooltipComponent,
	TransformComponent,
} from "echarts/components";
import { type ECharts, init, use } from "echarts/core";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { createEffect, createSignal, onCleanup } from "solid-js";
import uPlot from "uplot";

use([
	LineChart,
	TitleComponent,
	TooltipComponent,
	GridComponent,
	DatasetComponent,
	TransformComponent,
	LabelLayout,
	UniversalTransition,
	CanvasRenderer,
]);

interface Props {
	timeWindow(): TimePreset;
	glucose(): GlucoseValue[] | undefined;
}

const options: uPlot.Options = {
	width: 100,
	height: 100,
	scales: { x: { time: true }, y: { range: [30, 300] } },
	series: [{}, { stroke: "#3b82f6", width: 2, points: { show: false } }],
};

export function Graph(props: Props) {
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const [size] = useDimension(ref);

	let chart: uPlot | undefined;

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
			chart = new uPlot(
				{ ...options, width: div.clientWidth, height: div.clientHeight },
				[],
				div,
			);
		}

		chart.setData(prepareData(props.glucose() ?? []));
	});

	onCleanup(() => {
		if (chart) chart.destroy();
	});

	return <div ref={setRef} class="w-full h-full" />;
}
