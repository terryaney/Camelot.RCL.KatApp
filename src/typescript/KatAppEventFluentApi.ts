namespace KatApps {
	export class KatAppEventFluentApi<T extends EventTarget> implements IKatAppEventFluentApi<T> {
		constructor(public elements: Array<T>) { }
		
		public on(events: string, handler: (e: Event) => void): KatAppEventFluentApi<T> {
			var eventTypes = events.split(" ");

			this.elements.forEach(e => {
				eventTypes.forEach(t => e.addEventListener(t, handler));
			});

			return this;
		}

		public off(events: string): KatAppEventFluentApi<T> {
			var eventTypes = events.split(" ");

			this.elements.forEach(e => {
				if (e.kaEventListeners == undefined) return;
				
				eventTypes.forEach(t => {
					const listeners = e.kaEventListeners?.[t];
					if (listeners == undefined) return;
					// Would like to just pass l as second param, but it isn't recognizing that overload option.
					// See comment on the removeEventListener interface declaration in interfaces.d.ts.
					listeners.forEach(l => e.removeEventListener(t, l.listener, l.options));
				});
			});

			return this;
		}
	}
}