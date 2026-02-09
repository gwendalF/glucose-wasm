import { HOURS, MINUTES, timestamp } from "./TimeRange";

export const SYNC_POLICY = {
	maxDelayBetweenSamples: timestamp(15 * MINUTES), // 15 min
	maxDelayInitialSamples: timestamp(24 * HOURS),
	coalesceDelays: timestamp(30 * 24 * HOURS), // min fetched range
	slowFetchDelayms: 1_000, // fetch each second
	throttleSaveWorkerMs: 500,
} as const;
