import { timestamp } from "./TimeRange";

export const SYNC_POLICY = {
	maxDelayBetweenSamples: timestamp(15 * 60 * 1000), // 15 min
	slowFetchDelayms: 1_000, // fetch each second
} as const;
