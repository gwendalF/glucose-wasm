export type TimeRange = {
	start: Timestamp;
	end: Timestamp;
};

export type Timestamp = number & { __brand: "Timestamp" };

export const timestamp = (msNumber: number): Timestamp => {
	return msNumber as Timestamp;
};

export const fromDate = (date: Date): Timestamp => {
	return date.getTime() as Timestamp;
};

export const TimePresets = {
	Last6Hours: "Last6Hours",
	Last12Hours: "Last12Hours",
	Last24Hours: "Last24Hours",
} as const;

export const HOURS = 1000 * 60 * 60;

export type TimePreset = (typeof TimePresets)[keyof typeof TimePresets];

export const timeRangeFor = (preset: TimePreset, now: Timestamp): TimeRange => {
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
	}

	const start = now - timestamp(durationMs);
	return {
		start: start as Timestamp,
		end: now,
	};
};
