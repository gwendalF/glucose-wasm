import { Err, Ok, type Result } from "@domain/Result";
import { maxTimestamp, minTimestamp, type TimeRange } from "@domain/TimeRange";

export type MergeErrorCode = "EMPTY_RANGES" | "INVALID_RANGE";

export class MergeError extends Error {
	readonly code: MergeErrorCode;

	constructor(code: MergeErrorCode, message?: string) {
		super(message ?? code);
		this.name = "MergeError";
		this.code = code;
	}
}

export function mergeRanges(
	ranges: TimeRange[],
): Result<TimeRange, MergeError> {
	if (ranges.length === 0) {
		return Err(new MergeError("EMPTY_RANGES", "empty ranges"));
	}

	let from = ranges[0].from;
	let to = ranges[0].to;
	if (from > to) {
		return Err(
			new MergeError("INVALID_RANGE", `Invalid range: ${from} > ${to}`),
		);
	}

	for (let i = 1; i < ranges.length; i++) {
		const { from: rangeFrom, to: rangeTo } = ranges[i];
		if (rangeFrom > rangeTo) {
			return Err(
				new MergeError(
					"INVALID_RANGE",
					`Invalid range: ${rangeFrom} > ${rangeTo}`,
				),
			);
		}

		from = minTimestamp(from, rangeFrom);
		to = maxTimestamp(to, rangeTo);
	}

	return Ok({ from, to });
}
