import {
	type TimePreset,
	TimePresets,
	type TimeRange,
	type Timestamp,
	timeRangeFor,
} from "./timeRange";

export type GlucoseValue = {
	timestamp: Timestamp;
	glucose: number;
};

export interface Repository {
	getGlucoseValues(range: TimeRange): Promise<GlucoseValue[]>;
}

export class Dashboard {
	private repo: Repository;
	private values: GlucoseValue[] = [];
	private preset: TimePreset;

	constructor(repo: Repository) {
		this.repo = repo;
		this.preset = TimePresets.Last24Hours;
	}

	// Load the glucose value up to end. The start is either end - window if provided or 24hours by default
	loadData = async ({
		window,
		end,
	}: {
		window?: TimePreset;
		end: Timestamp;
	}) => {
		const preset = window ? window : this.preset;
		const range = timeRangeFor(preset, end);

		this.preset = preset;
		const data = await this.repo.getGlucoseValues(range);
		this.values = data;
	};

	updateEnd = async (end: Timestamp) => {
		const range = timeRangeFor(this.preset, end);
		const data = await this.repo.getGlucoseValues(range);
		this.values = data;
	};

	glucoseValues = (): GlucoseValue[] => this.values;
}
