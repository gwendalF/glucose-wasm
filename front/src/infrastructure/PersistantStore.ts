import type { GlucoseDataset, LocalStore } from "@domain/GlucoseRepository";
import type { GlucoseValue } from "@domain/GlucoseValue";
import type { TimeRange } from "@domain/TimeRange";
import type { InMemoryStore } from "./GlucoseStore";

export type MainToWorkerMessage =
	| { type: "SAVE"; payload: GlucoseDataset }
	| { type: "LOAD_ALL"; payload: undefined };

export type WorkerToMainMessage =
	| { type: "READY" }
	| { type: "LOADED"; payload: GlucoseDataset }
	| { type: "ERROR"; payload: string };

export class PersistentStore implements LocalStore {
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	private constructor(
		private inMemory: InMemoryStore,
		private worker: Worker,
		private throttleDelaysMs: number,
	) {}

	static async create(
		inMemory: InMemoryStore,
		throttleDelaysMs: number = 100,
	): Promise<PersistentStore> {
		const worker = new Worker(new URL("./worker.ts", import.meta.url), {
			type: "module",
		});

		await new Promise<void>((resolve, reject) => {
			worker.onmessage = (e: MessageEvent<WorkerToMainMessage>) => {
				const msg = e.data;

				if (msg.type === "READY") {
					worker.postMessage({ type: "LOAD_ALL", payload: undefined });
				} else if (msg.type === "LOADED") {
					inMemory.hydrate(msg.payload);
					resolve();
				} else if (msg.type === "ERROR") {
					reject(new Error(msg.payload));
				}
			};

			worker.onerror = (err) => reject(err);
		});

		return new PersistentStore(inMemory, worker, throttleDelaysMs);
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

			this.worker.postMessage({
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
