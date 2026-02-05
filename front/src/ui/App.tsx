import { Route, Router } from "@solidjs/router";
import { Analysis } from "./pages/Analysis/Analysis";
import { Dashboard } from "./pages/Dashboard/Dashboard";

export function App() {
	return (
		<Router>
			<Route path="/" component={Dashboard} />
			<Route path="/analysis" component={Analysis} />
		</Router>
	);
}
