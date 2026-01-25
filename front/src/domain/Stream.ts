export type Unsubcribe = () => void;

export interface Stream<T> {
	subscribe(cb: (v: T) => void): Unsubcribe;
}
