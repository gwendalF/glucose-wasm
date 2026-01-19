import type { GlucoseValue } from "@application/Dashboard";
import type { LineSeriesOption } from "echarts/charts";
import type {
	DatasetComponentOption,
	GridComponentOption,
	TitleComponentOption,
	TooltipComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";

type ECOption = ComposeOption<
	| LineSeriesOption
	| TitleComponentOption
	| TooltipComponentOption
	| GridComponentOption
	| DatasetComponentOption
>;

export const prepareData = (data: readonly GlucoseValue[]): ECOption => {
	const d = [];
	for (const { timestamp, glucose } of data) {
		d.push([timestamp, glucose]);
	}

	return {
		tooltip: { trigger: "axis" },
		xAxis: {
			type: "time",
			axisLabel: {
				formatter: {
					year: "{yyyy}",
					month: "{MMM}",
					day: "{dd}/{MM}",
					hour: "{HH}:{mm}",
					minute: "{HH}:{mm}",
				},
			},
		},
		yAxis: { type: "value" },
		series: [{ name: "Glycémie", type: "line", smooth: true, data: d }],
	};
};
