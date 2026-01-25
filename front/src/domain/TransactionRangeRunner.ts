import type { TransactionRangeStore } from "./TransactionRangeStore";

export interface TransactionRangeRunner {
	run<T>(fn: (repo: TransactionRangeStore) => Promise<T>): Promise<T>;
}
