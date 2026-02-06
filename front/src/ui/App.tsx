import { Route, Router } from "@solidjs/router";
import PWAUpdatePrompt from "./components/Update";
import { Toaster } from "./components/ui/toast";
import { Analysis } from "./pages/Analysis/Analysis";
import { Dashboard } from "./pages/Dashboard/Dashboard";

export function App() {
	return (
		<>
			<PWAUpdatePrompt />
			<Toaster />
			<Router>
				<Route path="/" component={Dashboard} />
				<Route path="/analysis" component={Analysis} />
			</Router>
		</>
	);
}
