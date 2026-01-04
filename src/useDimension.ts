import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";

export const useDimension = (ref: Accessor<Element | undefined>) => {
	const [size, setSize] = createSignal<DOMRectReadOnly | undefined>();

	const observer = new ResizeObserver((entries) => {
		for (const entry of entries) {
			setSize(entry.contentRect);
		}
	});

	createEffect(() => {
		const element = ref();
		if (element) observer.observe(element);

		onCleanup(() => {
			if (element) observer.unobserve(element);
		});
	});

	onCleanup(() => observer.disconnect());

	return [size];
};
