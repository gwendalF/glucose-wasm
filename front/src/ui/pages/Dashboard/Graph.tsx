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

export function Graph(props: Props) {
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const [size] = useDimension(ref);

	let chart: ECharts | undefined;

	createEffect(() => {
		if (size() && chart) {
			chart.resize();
		}
	});

	createEffect(() => {
		if (!ref()) return;

		if (!chart) {
			chart = init(ref());
		}

		chart.setOption(prepareData(props.glucose() ?? []));
	});

	onCleanup(() => {
		if (chart) chart.dispose();
	});

	return <div ref={setRef} class="w-full h-full" />;
}
