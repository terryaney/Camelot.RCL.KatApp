export { };

/**
 * @callback IGetKatAppEvents
 * @param {IKatApp|undefined} hostApplication - If the event is being bound to a modal or nested application, the hostApplication will be available.
 * @param {IKatApp|undefined} modalApplication - If the event is being bound to a modal application, the modalApplication will be available.
 * @param {IKatApp|undefined} nestedApplication - If the event is being bound to a nested application, the nestedApplication will be available.
 * @returns {IKatAppEventsConfiguration} - The events to bind to current application.
 */
type IGetKatAppEvents = (
    hostApplication?: IKatApp,
    modalApplication?: IKatApp,
    nestedApplication?: IKatApp
) => IKatAppEventsConfiguration;

declare global {
	interface Window {
		rcl?: { 
			katApp: {
				hideLoader: (hasUnhandledException: boolean) => void;
				showUnexpectedError: (application: IKatApp) => void;
				initializeDebugModal: (modalSelector: string, appSelector: string) => void;
				/**
				 *  Binds events to the main katapp and any modal or nested applications it hosts.
				 *  @param {IGetKatAppEvents} getEvents - Delegate to get custom events based on 'applications' passed in.'.
				 *  @param {string | undefined} [selector=.katapp] - The selector to use to determine which application to bind events to.
				 *  @param {boolean | undefined} [includeContainedApps=true] - Whether or not to bind any contained modal/nested applications
				 */
				bindAllKatApps: (getEvents: IGetKatAppEvents, selector?: string, includeContainedApps?: boolean) => void;
				initializeHostEvents: (selector?: string) => void;
				initializeLoggingEvents: (selector: string) => void;
				initializeReferrerEvents: (primarySelector: string, secondarySelectors: Array<string>, currentPagePrefix: string) => void;
			}
		}
	}

	interface StringConstructor {
		compare: (strA: string | undefined, strB: string | undefined, ignoreCase?: boolean) => number;
		formatTokens(template: string, parameters: IStringAnyIndexer): string;
		localeFormat(format: string, ...args: any[]): string;
	}
	interface Number {
		localeFormat(format: string): string;
	}

	interface EventTarget {
		_addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
		_removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
		// Couldn't figure out how to get this 'overload' defined to work.  I simply wanted an additional overload to 
		// popup for people that referenced KatApp.d.ts, but they can just try to use it without intellisense
		// removeEventListener(type: string, listener: ElementEventListener): void;
		kaEventListeners?: { [type: string]: Array<ElementEventListener> };
	}

	interface Element {
		cloneWithEvents<T extends HTMLElement>(): T;
	}

	interface ElementEventListener { type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions }
}