import { createEffect, createSignal, onCleanup } from "solid-js";
import uPlot from "uplot";
import "uplot/dist/uplot.min.css";
import type { GlucoseValue } from "./dashboard";
import type { TimePreset } from "./timeRange";
import { useDimension } from "./useDimension";

// https://github.com/leeoniya/uPlot/tree/master/docs#basics
// Data Format

// let data = [
//   [1546300800, 1546387200],    // x-values (timestamps)
//   [        35,         71],    // y-values (series 1)
//   [        90,         15],    // y-values (series 2)
// ];
type uPlotData = [number[], number[]];
export const prepareData = (data: readonly GlucoseValue[]): uPlotData => {
	const timestamps: number[] = [];
	const values: number[] = [];
	for (const { glucose, timestamp } of data) {
		timestamps.push(timestamp);
		values.push(glucose);
	}

	return [timestamps, values];
};

interface Props {
	glucose(): GlucoseValue[] | undefined;
	timeWindow(): TimePreset;
}

export const Graph = (props: Props) => {
	const [ref, setRef] = createSignal<HTMLDivElement>();
	const [size] = useDimension(ref);

	let chart: uPlot | undefined;
	const xAxisHeight = 30;

	createEffect(() => {
		const rect = size();
		if (!rect) return;
		if (!ref()) return;

		if (!chart) {
			chart = new uPlot(
				{
					width: rect.width,
					height: rect.height - 31,
					series: [],
					axes: [
						{
							labelSize: 20,
							size: 50,
						},
					],
				},
				[],
				ref(),
			);
		}
	});

	onCleanup(() => {
		if (chart) chart.destroy();
	});

	return <div ref={setRef} class="w-full h-full" />;
};
