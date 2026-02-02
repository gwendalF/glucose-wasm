import { timestamp } from "./TimeRange";

export const SYNC_POLICY = {
    maxDelayBetweenSamples: timestamp(15*60*1000) // 15 min
} as const