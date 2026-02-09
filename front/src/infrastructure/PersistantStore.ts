import type { GlucoseDataset, LocalStore } from "@domain/GlucoseRepository";
import type { GlucoseValue } from "@domain/GlucoseValue";
import type { TimeRange } from "@domain/TimeRange";
import type { InMemoryStore } from "./GlucoseStore";

export type Message =
	| { type: "SAVE"; payload: GlucoseDataset }
	| { type: "LOAD_ALL"; payload: undefined };

export type WorkerToMain =
	| { type: "READY"; payload: undefined }
	| { type: "LOADED"; payload: GlucoseDataset }
	| { type: "ERROR"; payload: string };

interface PostMessage {
	postMessage(message: Message): void;
}

export class PersistentStore implements LocalStore {
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;
	private static NAME = "worker-name";

	private constructor(
		private inMemory: InMemoryStore,
		private channel: PostMessage,
		private throttleDelaysMs: number,
	) {}

	static async create(
		inMemory: InMemoryStore,
		throttleDelaysMs: number = 100,
	): Promise<PersistentStore> {
		const channel = new BroadcastChannel(PersistentStore.NAME);
		const store = new PersistentStore(inMemory, channel, throttleDelaysMs);

		store.startLeaderElection(channel);
		channel.postMessage({ type: "LOAD_ALL" });
		return store;
	}

	private handleMessage(e: MessageEvent<WorkerToMain>) {
		const { type, payload } = e.data;
		switch (type) {
			case "LOADED":
				this.inMemory.hydrate(payload);
				break;
			case "ERROR":
				console.log("Error", payload);
				break;
		}
	}

	private startLeaderElection(channel: BroadcastChannel) {
		navigator.locks.request(PersistentStore.NAME, async () => {
			const worker = new Worker(new URL("./worker.ts", import.meta.url));

			let ready = false;
			channel.onmessage = (e) => {
				if (ready) {
					worker.postMessage(e.data);
				}
			};

			worker.onmessage = (e: MessageEvent<WorkerToMain>) => {
				switch (e.data.type) {
					case "READY":
						ready = true;
						worker.postMessage({ type: "LOAD_ALL" });
						break;
					default:
						this.handleMessage(e);
				}
			};

			await new Promise(() => {});
		});
	}

	async addMeasurements(measurements: GlucoseValue[]): Promise<void> {
		await this.inMemory.addMeasurements(measurements);

		this.schedulePersistence();
	}

	getData(range: TimeRange): Promise<GlucoseDataset> {
		return this.inMemory.getData(range);
	}

	dataset(): GlucoseDataset {
		return this.inMemory.getAll();
	}

	private schedulePersistence() {
		if (this.saveTimeout) return;

		this.saveTimeout = setTimeout(() => {
			const dataBase = this.inMemory.getAll();

			this.channel.postMessage({
				type: "SAVE",
				payload: dataBase,
			});

			this.saveTimeout = null;
		}, this.throttleDelaysMs);
	}

	getMean(range: TimeRange): Promise<number> {
		return this.inMemory.getMean(range);
	}
}
