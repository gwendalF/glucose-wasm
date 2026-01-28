import type { Dashboard } from "./Dashboard";
import type { SyncCoordinator } from "./SyncCoordinator";

export class AppRuntime {
	private lastSyncedKey = "";

	constructor(
		private readonly dashboard: Dashboard,
		private readonly coordinator: SyncCoordinator,
	) {}

	start = () => {
		this.dashboard.subscribe((state) => {
			if (!state.range) {
				return;
			}
			const key = `${state.range.from}-${state.range.to}`;
			const isSameRange = key === this.lastSyncedKey;
			if (isSameRange) {
				return;
			}

			this.lastSyncedKey = key;
			this.coordinator.requestRange(state.range);
		});
	};
}
