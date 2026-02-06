import { useRegisterSW } from "virtual:pwa-register/solid";
import { Show } from "solid-js";
import { Button } from "./ui/button";
import { showToast } from "./ui/toast";

export default function PWAUpdatePrompt() {
	const {
		needRefresh: [needRefresh, setNeedRefresh],
		updateServiceWorker,
	} = useRegisterSW({
		onRegistered(r) {
			if (r) {
				setInterval(r.update, 60 * 60 * 1000);
			}
		},
		onRegisterError(error) {
			showToast({
				title: "Erreur de mise à jour",
				description: error.toString(),
				variant: "error",
			});
		},
	});

	return (
		<Show when={needRefresh()}>
			<div class="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
				<div class="flex flex-col gap-3 p-4 rounded-lg border border-border bg-card text-card-foreground shadow-lg max-w-[300px]">
					<div class="flex flex-col gap-1">
						<h3 class="font-semibold text-sm leading-none tracking-tight">
							Mise à jour disponible
						</h3>
						<p class="text-sm text-muted-foreground">
							Une nouvelle version de Glucose Tracker est prête.
						</p>
					</div>
					<div class="flex gap-2">
						<Button
							onClick={() => updateServiceWorker(true)}
							variant="download"
							class="inline-flex items-center justify-center outline rounded-md text-sm font-medium transition-colors h-9 px-4 py-2"
						>
							Installer
						</Button>
						<Button
							variant="destructive"
							onClick={() => setNeedRefresh(false)}
							class="inline-flex items-center justify-center outline rounded-md text-sm font-medium transition-colors h-9 px-4 py-2"
						>
							Plus tard
						</Button>
					</div>
				</div>
			</div>
		</Show>
	);
}
