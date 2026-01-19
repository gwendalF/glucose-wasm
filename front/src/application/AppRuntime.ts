import type { Dashboard } from "./Dashboard";
import type { SyncCoordinator } from "./SyncCoordinator";

export class AppRuntime {
	constructor(
		private readonly dashboard: Dashboard,
		private readonly coordinator: SyncCoordinator,
	) {}

	start = () => {
		this.dashboard.subscribe((state) => {
			if (!state.range) return;

			this.coordinator.requestRange(state.range);
		});
	};
}
