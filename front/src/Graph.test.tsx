import { describe, test } from "vitest";
import { prepareData } from "./core/graph";
import { timestamp } from "./core/timeRange";

describe("graph", () => {
	test("empty data return empty array", ({ expect }) => {
		expect(prepareData([])).toEqual({
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
			series: [
				{
					name: "Glycémie",
					type: "line",
					smooth: true,
					data: [],
				},
			],
		});
	});

	test("prepare data for echarts", ({ expect }) => {
		expect(
			prepareData([
				{ timestamp: timestamp(1234), glucose: 80 },
				{ timestamp: timestamp(102030), glucose: 90 },
			]),
		).toEqual({
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
			series: [
				{
					name: "Glycémie",
					type: "line",
					smooth: true,
					data: [
						[1234, 80],
						[102030, 90],
					],
				},
			],
		});
	});
});
