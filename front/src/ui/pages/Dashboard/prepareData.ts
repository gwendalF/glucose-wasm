import type { GlucoseDataset } from "@domain/GlucoseRepository";

import type uPlot from "uplot";

export const prepareData = (data: GlucoseDataset): uPlot.AlignedData => {
	return [data.timestamps, data.values];
};
