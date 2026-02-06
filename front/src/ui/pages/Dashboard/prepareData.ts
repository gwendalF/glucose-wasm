import type { GlucoseValue } from "@domain/GlucoseValue";
import type { LineSeriesOption } from "echarts/charts";
import type {
	DatasetComponentOption,
	GridComponentOption,
	TitleComponentOption,
	TooltipComponentOption,
} from "echarts/components";
import { type ComposeOption, graphic } from "echarts/core";

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
	// Dans ton composant Graph utilisant ECharts
	const option: ECOption = {
		tooltip: { trigger: "axis" },
		grid: { top: 20, right: 20, bottom: 40, left: 50 },
		xAxis: {
			type: "time",
			splitLine: { show: false },
			axisLine: { lineStyle: { color: "#e2e8f0" } },
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
		yAxis: {
			type: "value",
			splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
			min: 30,
			max(extent) {
				return Math.max(300, Math.ceil(1.1 * extent.max));
			},
		},
		series: [
			{
				type: "line",
				smooth: 0.4, // Lissage de la courbe (adieu les pointes !)
				symbol: "none", // Cache les points par défaut
				lineStyle: { width: 4, color: "#4f46e5" },
				areaStyle: {
					// Dégradé sous la courbe pour le volume
					color: new graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: "rgba(79, 70, 229, 0.2)" },
						{ offset: 1, color: "rgba(79, 70, 229, 0)" },
					]),
				},
				data: d,
			},
		],
	};

	return option;
};
