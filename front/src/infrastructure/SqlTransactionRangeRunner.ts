import type { TransactionRangeRunner } from "@domain/TransactionRangeRunner";
import type { TransactionRangeStore } from "@domain/TransactionRangeStore";
import type { SQLStore } from "./GlucoseStore";

export class SqlTransactionRangeRunner implements TransactionRangeRunner {
	constructor(private readonly db: SQLStore) {}

	async run<T>(fn: (repo: TransactionRangeStore) => Promise<T>) {
		return await this.db.runInTx(fn);
	}
}
