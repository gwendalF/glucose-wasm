import type { GlucoseValue } from "@domain/GlucoseValue";
import type { LineSeriesOption } from "echarts/charts";
import type {
	DatasetComponentOption,
	GridComponentOption,
	TitleComponentOption,
	TooltipComponentOption,
} from "echarts/components";
import { type ComposeOption, graphic } from "echarts/core";
import type uPlot from "uplot";

type ECOption = ComposeOption<
	| LineSeriesOption
	| TitleComponentOption
	| TooltipComponentOption
	| GridComponentOption
	| DatasetComponentOption
>;

export const prepareData = (
	data: readonly GlucoseValue[],
): uPlot.AlignedData => {
	const d: [number[], number[]] = [[], []];
	for (const { timestamp, glucose } of data) {
		d[0].push(timestamp);
		d[1].push(glucose);
	}

	return d;
};
