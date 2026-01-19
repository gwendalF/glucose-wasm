import {
	createContext,
	createEffect,
	createSignal,
	onCleanup,
	useContext,
} from "solid-js";
import type { Dashboard, DashboardState } from "../application/Dashboard";
import type { TimeRange } from "../domain/TimeRange";

export const DashboardContext = createContext<Dashboard>();

export const useDashboard = () => {
	const dashboard = useContext(DashboardContext);
	if (!dashboard) {
		throw new Error("dashboard is undefined or no dashboard provider");
	}

	return dashboard;
};

export const useDashboardState = (
	dashboard: Dashboard,
	range: () => TimeRange,
) => {
	const [state, setState] = createSignal<DashboardState>(
		dashboard.getSnapshot(),
	);

	let unsub: (() => void) | undefined;

	createEffect(() => {
		unsub?.();
		dashboard.connect(range());
		unsub = dashboard.subscribe(setState);

		onCleanup(() => unsub?.());
	});

	return state;
};
