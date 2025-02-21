export { };

declare global {
	interface StringConstructor {
		compare: (strA: string | undefined, strB: string | undefined, ignoreCase?: boolean) => number;
		formatTokens(template: string, parameters: IStringAnyIndexer): string;
		localeFormat(format: string, ...args: any[]): string;
	}
	interface Number {
		localeFormat(format: string): string;
	}

	interface Element {
		_addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
		_removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
		// Couldn't figure out how to get this 'overload' defined to work.  I simply wanted an additional overload to 
		// popup for people that referenced KatApp.d.ts, but they can just try to use it without intellisense
		// removeEventListener(type: string, listener: ElementEventListener): void;
		kaEventListeners?: { [type: string]: Array<ElementEventListener> };
		cloneWithEvents<T extends HTMLElement>(): T;
	}

	interface ElementEventListener { type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions }
}