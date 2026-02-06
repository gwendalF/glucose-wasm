import type { GlucoseValue } from "@domain/GlucoseValue";

import type uPlot from "uplot";

export const prepareData = (
	data: readonly GlucoseValue[],
): uPlot.AlignedData => {
	const timestamps = new Float64Array(data.length);
	const values = new Uint16Array(data.length);

	for (let i = 0; i < data.length; i++) {
		timestamps[i] = Math.ceil(data[i].timestamp / 1000);
		values[i] = data[i].glucose;
	}

	return [timestamps, values];
};
