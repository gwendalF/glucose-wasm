export interface NetworkMonitor {
	waitForOnline(): Promise<void>;
}
