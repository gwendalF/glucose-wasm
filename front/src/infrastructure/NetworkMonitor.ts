import type { NetworkMonitor } from "@domain/network";

export class BrowserNetworkMonitor implements NetworkMonitor {
	waitForOnline(): Promise<void> {
		return new Promise((resolve) => {
			if (navigator.onLine) resolve();

			addEventListener("online", () => resolve(), { once: true });
		});
	}
}
