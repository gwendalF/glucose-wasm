export type TimeRange = {
	from: Timestamp;
	to: Timestamp;
};

export type Timestamp = number & { __brand: "Timestamp" };

export function timestamp(msNumber: number): Timestamp {
	return msNumber as Timestamp;
}

export function minTimestamp(...timestamps: Timestamp[]): Timestamp {
	return timestamp(Math.min(...timestamps));
}

export function maxTimestamp(...timestamps: Timestamp[]): Timestamp {
	return timestamp(Math.max(...timestamps));
}

export function fromDate(date: Date): Timestamp {
	return date.getTime() as Timestamp;
}

export const TimePresets = {
	Last6Hours: "Last6Hours",
	Last12Hours: "Last12Hours",
	Last24Hours: "Last24Hours",
	LastYear: "Lastyear",
} as const;

export const HOURS = 1000 * 60 * 60;

export type TimePreset = (typeof TimePresets)[keyof typeof TimePresets];

export const presetMs = (preset: TimePreset): number => {
	let durationMs: number;
	switch (preset) {
		case "Last6Hours":
			durationMs = 6 * HOURS;
			break;
		case "Last24Hours":
			durationMs = 24 * HOURS;
			break;
		case "Last12Hours":
			durationMs = 12 * HOURS;
			break;
		case "Lastyear":
			durationMs = 365 * 24 * HOURS;
	}

	return durationMs;
};

export const timeRangeFor = (preset: TimePreset, end: Timestamp): TimeRange => {
	const durationMs = presetMs(preset);
	const from = timestamp(end - durationMs);
	return {
		from,
		to: end,
	};
};
