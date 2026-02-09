import type { GlucoseDataset, LocalStore } from "@domain/GlucoseRepository";
import type { GlucoseValue } from "@domain/GlucoseValue";
import type { TimeRange } from "@domain/TimeRange";

export class InMemoryStore implements LocalStore {
	private timestamps: Float64Array<ArrayBufferLike> = new Float64Array();
	private values: Uint16Array<ArrayBufferLike> = new Uint16Array();

	async addMeasurements(measurements: GlucoseValue[]): Promise<void> {
		if (measurements.length === 0) return;

		const oldLen = this.timestamps.length;
		const newLen = measurements.length;
		const tempT = new Float64Array(oldLen + newLen);
		const tempV = new Uint16Array(oldLen + newLen);

		let i = 0,
			j = 0,
			k = 0;

		while (i < oldLen && j < newLen) {
			const tOld = this.timestamps[i];
			const tNew = measurements[j].timestamp;

			if (tOld < tNew) {
				tempT[k] = tOld;
				tempV[k] = this.values[i];
				i++;
			} else if (tNew < tOld) {
				tempT[k] = tNew;
				tempV[k] = measurements[j].glucose;
				j++;
			} else {
				tempT[k] = tNew;
				tempV[k] = measurements[j].glucose;
				i++;
				j++;
			}
			k++;
		}

		if (i < oldLen) {
			const remaining = oldLen - i;
			tempT.set(this.timestamps.subarray(i), k);
			tempV.set(this.values.subarray(i), k);
			k += remaining;
		}

		if (j < newLen) {
			for (; j < newLen; j++, k++) {
				tempT[k] = measurements[j].timestamp;
				tempV[k] = measurements[j].glucose;
			}
		}

		this.timestamps = tempT.slice(0, k);
		this.values = tempV.slice(0, k);
	}

	async getData(range: TimeRange): Promise<GlucoseDataset> {
		const start = this.findIndex(range.from);
		const end = this.findIndex(range.to);

		return {
			length: end - start,
			timestamps: this.timestamps.subarray(start, end),
			values: this.values.subarray(start, end),
		};
	}

	private findIndex(timestamp: number): number {
		let left = 0;
		let right = this.timestamps.length;

		while (left < right) {
			const mid = (left + right) >>> 1;

			if (this.timestamps[mid] < timestamp) {
				left = mid + 1;
			} else {
				right = mid;
			}
		}
		return left;
	}

	getAll(): GlucoseDataset {
		return {
			length: this.timestamps.length,
			timestamps: this.timestamps,
			values: this.values,
		};
	}

	hydrate(data: GlucoseDataset): void {
		this.timestamps = data.timestamps;
		this.values = data.values;
	}

	async getMean(range: TimeRange): Promise<number> {
		const fromIdx = this.findIndex(range.from);
		const toIdx = this.findIndex(range.to);

		const subarray = this.values.subarray(fromIdx, toIdx);
		if (subarray.length === 0) {
			return 0;
		}

		let sum = 0;
		for (let i = 0; i < subarray.length; i++) {
			sum += subarray[i];
		}

		return sum / subarray.length;
	}
}
