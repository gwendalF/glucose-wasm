/// <reference lib="webworker" />

import type { Message } from "./PersistantStore";

let tsHandle: FileSystemSyncAccessHandle | null = null;
let valHandle: FileSystemSyncAccessHandle | null = null;

async function initialize() {
	try {
		const root = await navigator.storage.getDirectory();

		const tsFile = await root.getFileHandle("timestamps.bin", { create: true });
		const valFile = await root.getFileHandle("values.bin", { create: true });

		tsHandle = await tsFile.createSyncAccessHandle();
		valHandle = await valFile.createSyncAccessHandle();

		self.postMessage({ type: "READY" });
	} catch (error) {
		self.postMessage({
			type: "ERROR",
			payload: `Failed to initialize OPFS: ${error instanceof Error ? error.message : "Unknown error"}`,
		});
	}
}

initialize();

self.onmessage = (e: MessageEvent<Message>) => {
	const { type, payload } = e.data;

	if (!tsHandle || !valHandle) {
		console.warn("Worker received message before initialization was complete.");
		return;
	}

	switch (type) {
		case "SAVE":
			handleOverwrite(payload.timestamps, payload.values);
			break;

		case "LOAD_ALL":
			handleLoadAll();
			break;

		default:
			console.error(`Unknown message type: ${type}`);
	}
};

function handleOverwrite(ts: Float64Array, vs: Uint16Array) {
	if (!tsHandle || !valHandle) return;

	try {
		tsHandle.truncate(0);
		valHandle.truncate(0);

		tsHandle.write(ts, { at: 0 });
		valHandle.write(vs, { at: 0 });

		tsHandle.flush();
		valHandle.flush();
	} catch (error) {
		console.error("Worker failed to overwrite disk:", error);
	}
}

function handleLoadAll() {
	if (!tsHandle || !valHandle) return;

	try {
		const sizeTs = tsHandle.getSize();
		const sizeVs = valHandle.getSize();

		const tsBuffer = new Float64Array(sizeTs / 8);
		const vsBuffer = new Uint16Array(sizeVs / 2);

		tsHandle.read(tsBuffer, { at: 0 });
		valHandle.read(vsBuffer, { at: 0 });

		self.postMessage(
			{
				type: "LOADED",
				payload: { timestamps: tsBuffer, values: vsBuffer },
			},
			[tsBuffer.buffer, vsBuffer.buffer],
		);
	} catch (error) {
		console.error("Worker failed to load data from disk:", error);
	}
}
