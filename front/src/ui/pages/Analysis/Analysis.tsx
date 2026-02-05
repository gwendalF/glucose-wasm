import type { DateValue } from "@ark-ui/solid";
import { CalendarDate } from "@internationalized/date";
import { DatePicker } from "@ui/DatePicker";

import { createSignal } from "solid-js";

export function Analysis() {
	const [range, setRange] = createSignal<DateValue[]>([
		new CalendarDate(2026, 1, 1),
		new CalendarDate(2025, 12, 1),
	]);

	return (
		<div class="flex justify-center">
			<DatePicker
				value={range()}
				selectionMode="range"
				onValueChange={(updated) => {
					setRange(updated.value);
				}}
			/>
		</div>
	);
}
