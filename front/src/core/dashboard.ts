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

type DashboardStatus = "idle" | "loading" | "ready";

export interface Stream<T> {
	subscribe(cb: (v: T) => void): Unsubcribe;
}

export type DashboardState = {
	status: DashboardStatus;
	values: GlucoseValue[];
	currentEnd?: Timestamp;
};
export interface GlucoseRepository {
	fetch(range: TimeRange): Promise<GlucoseValue[]>;
	watch(range: TimeRange): Stream<GlucoseValue[]>;
}

type Unsubcribe = () => void;
export type GlucoseListener = (state: DashboardState) => void;

export class Dashboard {
	private repo: GlucoseRepository;
	private values: GlucoseValue[] = [];
	private status: DashboardStatus = "idle";

	private currentEnd?: Timestamp;
	private preset: TimePreset = TimePresets.Last24Hours;
	private listeners: Set<GlucoseListener> = new Set();
	private unsubscribeRepo?: Unsubcribe;

	constructor(repo: GlucoseRepository) {
		this.repo = repo;
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
		this.setState({ status: "loading", currentEnd: end });
		const data = await this.repo.fetch(range);
		this.setState({ values: data, status: "ready" });
	};

	updateEnd = async (to: Timestamp) => {
		const range = timeRangeFor(this.preset, to);
		this.setState({ status: "loading", currentEnd: to });
		const data = await this.repo.fetch(range);
		this.setState({ values: data, status: "ready" });
	};

	glucoseValues = (): GlucoseValue[] => this.values;

	getSnapshot = (): DashboardState => {
		return {
			status: this.status,
			values: this.values,
			currentEnd: this.currentEnd,
		};
	};

	subscribe = (cb: (state: DashboardState) => void): Unsubcribe => {
		this.listeners.add(cb);
		cb(this.getSnapshot());
		return () => this.listeners.delete(cb);
	};

	connect = (range: TimeRange) => {
		this.unsubscribeRepo?.();

		this.setState({ status: "loading", currentEnd: range.to });
		const stream = this.repo.watch(range);
		this.unsubscribeRepo = stream.subscribe((values) => {
			this.setState({ status: "ready", values, currentEnd: range.to });
		});
	};

	getEnd = () => {
		return this.currentEnd;
	};

	private setState(s: Partial<DashboardState>) {
		if (s.status) this.status = s.status;
		if (s.values) this.values = s.values;
		if (s.currentEnd !== undefined) this.currentEnd = s.currentEnd;
		this.emit();
	}

	private emit() {
		const snapshot = this.getSnapshot();
		for (const listener of this.listeners) {
			listener(snapshot);
		}
	}
}
