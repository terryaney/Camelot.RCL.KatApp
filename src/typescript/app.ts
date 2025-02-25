//	1. IDs: QnA - 011310302, ASU - 011103657
//	1. Demo site
//		- https://oneportal.uxgroup.com/LWConnect/Demo/index.html#/profile/address
//		- https://oneportal.uxgroup.com/LWConnect/Demo/index.html#/theme
//	1. Inspector
//		- channel.pension doesn't work, throws error when turning switch on and off
//		- Common.Profile doesn't work, change from addresses to email and back and get error
//		- what happens for v-ka-template with data source and elements inside?
//	1. v-ka-template
//		- if element assigned is a <template> just replace inline?
//		- look at v-ka-inline to get idea on how to handle

// TODO: Decide on modules vs iife? Modules seems better/recommended practices, but iife and static methods support console debugging better
class KatAppEventFluentApi<T extends HTMLElement> implements IKatAppEventFluentApi<T> {
	constructor(private app: KatApp, private elements: Array<T>) { }
	
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

class KatApp implements IKatApp {
	public static applications: Array<KatApp> = [];
	private static globalEventConfigurations: Array<{ selector: string, events: IKatAppEventsConfiguration }> = [];

	public static getDirty(): Array<IKatApp> {
		return this.applications.filter(a => a.state.isDirty);
	}

	public static remove(item: KatApp): void {
		if (item.isMounted) {
			item.vueApp!.unmount();
		}
		document.querySelector(`template[id$='${item.id}']`)?.remove();
		this.applications = this.applications.filter(a => a.id != item.id);
	}

	public static get(key: string | number | Element): KatApp | undefined {
		if (typeof key == "number") return this.applications[key];

		if (typeof key == 'object') {
			const el = key;
			key = el.closest("[ka-id]")?.getAttribute("ka-id") ?? "";
		}

		if (typeof key == "string" && key != "") {
			const app = this.applications.find(a => a.id == key || a.selector == key);

			if (app != undefined) return app;

			let select = document.querySelectorAll(key);

			if (select.length == 0 && !key.startsWith(".") && !key.startsWith("#")) {
				select = document.querySelectorAll("." + key);
			}

			if (select.length > 1) {
				throw new Error("Unable to find a unique application with the key of " + key);
			}

			if (select.length == 1 && select[0].hasAttribute("ka-id")) {
				return this.applications.find(a => a.id == select[0].getAttribute("ka-id"));
			}
		}

		return undefined;
	}

	public static handleEvents(selector: string, configAction: (config: IKatAppEventsConfiguration) => void): void {
		const config: IKatAppEventsConfiguration = {};
		configAction(config);
		this.globalEventConfigurations.push({ selector: selector, events: config });
	}

	public static async createAppAsync(selector: string, options: IKatAppOptions): Promise<KatApp> {
		let katApp: KatApp | undefined;
		try {
			katApp = new KatApp(selector, options);
			this.applications.push(katApp);
			await katApp.mountAsync();
			return katApp;
		} catch (e) {
			document.querySelector(".kaModal")?.remove();

			if (katApp != undefined) {
				KatApp.remove(katApp);
			}

			throw e;
		}
	}

	public id: string;
	public isCalculating: boolean;
	public lastCalculation?: ILastCalculation;
	public options: IKatAppOptions;
	public state: IState;
	public el: HTMLElement;
	public traceStart: Date;
	public traceLast: Date;
	public missingResources: Array<string> = [];
	public missingLanguageResources: Array<string> = [];

	private applicationCss: string;
	private vueApp?: PetiteVueApp;
	private viewTemplates?: string[];
	private mountedTemplates: IStringIndexer<boolean> = {};
	private isMounted = false;
	private pushToTables: string[] = [];

	private configureOptions: IConfigureOptions | undefined;

	public calcEngines: ICalcEngine[] = [];
	private uiBlockCount = 0;

	private eventConfigurations: Array<IKatAppEventsConfiguration> = [];

	private domElementQueued = false;
	private domElementQueue: Array<HTMLElement> = [];
	private updateDomPromise = Promise.resolve();

	private constructor(public selector: string, options: IKatAppOptions) {
		this.traceStart = this.traceLast = new Date();		
		const id = this.id = "ka" + KatApps.Utils.generateId();
		this.applicationCss = ".katapp-" + this.id.substring(2);
		this.isCalculating = false;

		/*
		// From SubmitApiOptions
		`RefreshCalcEngine` | `boolean` | Whether or not the RBLe Framework should check for an updated CalcEngine the next calculation. This value is determined from the [`options.debug.refreshCalcEngine'](#ikatappoptionsdebugrefreshcalcengine) property.

		// From debug.options
		`refreshCalcEngine` | `boolean` | Whether or not the RBLe Framework should check for an updated CalcEngine every single calculation.  By default, the RBLe Framework only checks every 5 minutes.  A `boolean` value can be passed in or using the querystring of `expireCE=1` will enable the settings.  The default value is `false`.
		*/
		const defaultOptions: IKatAppDefaultOptions = {
			inputCaching: false,
			canProcessExternalHelpTips: false,

			debug: {
				traceVerbosity: ( KatApps.Utils.pageParameters["tracekatapp"] === "1" ? TraceVerbosity.Diagnostic : TraceVerbosity.None ) as unknown as ITraceVerbosity,
				showInspector: KatApps.Utils.pageParameters["showinspector"] ?? ( KatApps.Utils.pageParameters["localserver"] != undefined ? "1" : "0" ),
				// refreshCalcEngine: KatApps.Utils.pageParameters["expireCE"] === "1",
				useTestCalcEngine: KatApps.Utils.pageParameters["test"] === "1",
				useTestView: KatApps.Utils.pageParameters["testview"] === "1",
				debugResourcesDomain: KatApps.Utils.pageParameters["localserver"],
			},
			calculationUrl: "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx",
			katDataStoreUrl: "https://btr.lifeatworkportal.com/services/camelot/datalocker/api/kat-apps/{name}/download",
			kamlVerifyUrl: "api/katapp/verify-katapp",
			encryptCache: data => typeof (data) == "string" ? data : JSON.stringify(data),
			decryptCache: cipher => cipher.startsWith("{") ? JSON.parse(cipher) : cipher
		};

		this.options = KatApps.Utils.extend<IKatAppOptions>(
			{},
			defaultOptions,
			options,
			// for now, I want inspector disabled
			// { debug: { showInspector: "0" } }
		);

		const nc = this.nextCalculation;
		if (nc.trace) {
			// Reassign this if they navigated in case the level changed
			nc.originalVerbosity = this.options.debug.traceVerbosity;
			this.nextCalculation = nc;
			this.options.debug.traceVerbosity = TraceVerbosity.Detailed as unknown as ITraceVerbosity;
		}

		const selectorResults = options.modalAppOptions == undefined ? document.querySelectorAll<HTMLElement>(selector) : undefined;
		if (selectorResults != undefined && selectorResults.length != 1) {
			throw new Error("'selector' of '" + this.selector + "' did not match any elements.");
		}
		else if (selectorResults == undefined && options.modalAppOptions == undefined) {
			throw new Error("No 'selector' or 'modalAppOptions' were provided.");
		}

		this.el = selectorResults?.item(0) ?? this.createModalContainer();

		// Initialize to process entire container one time...
		this.domElementQueue = [this.el];

		this.el.setAttribute("ka-id", this.id);
		this.el.classList.add("katapp-css", this.applicationCss.substring(1));

		if (this.el.getAttribute("v-scope") == undefined) {
			// Supposedly always need this on there...
			this.el.setAttribute("v-scope", "");
		}

		// Not sure why I added ka-cloak ONLY when view/content provided vs content-selector, but if I added content-selector
		// then LWC profile popup width not calculated right with data-bs-offset since hidden, so instead of simply adding all the
		// time if missing, I continued with view/content provided OR if cloneHost was provided (i.e. LWC alert center - which is why
		// I wanted ka-cloak anyway b/c v-pre elements need to process before page looks good)
		if (this.el.getAttribute("ka-cloak") == undefined && (options.view != undefined || options.content != undefined || ( options.cloneHost ?? false ) !== false )) {
			// Hide app until first calc done...
			this.el.setAttribute("ka-cloak", "");
		}

		if (document.querySelector("ka-resources") == undefined) {
			const kaResources = document.createElement("ka-resources");

			kaResources.innerHTML =
`<style>
	ka-resources, [v-cloak], [ka-cloak] { display: none; }
	.kaModalInit { cursor: progress; }
	body.ka-inspector-value .ka-inspector-value { border: 2px dashed #78aff6; }
	body.ka-inspector-api .ka-inspector-api { border: 2px dotted #785900; }
	body.ka-inspector-app .ka-inspector-app { border: 2px dotted #785900; }
	body.ka-inspector-modal .ka-inspector-modal { border: 2px dotted #785900; }
	body.ka-inspector-navigate .ka-inspector-navigate { border: 2px dotted #785900; }
	body.ka-inspector-highcharts .ka-inspector-highcharts { border: 2px dotted #087849; }
	body.ka-inspector-attributes .ka-inspector-attributes { border: 2px dashed #34495E; }
	body.ka-inspector-inline .ka-inspector-inline { border: 2px dashed #fcce00; }
	body.ka-inspector-table .ka-inspector-table { border: 2px dotted #444; }
	body.ka-inspector-rbl-no-calc .ka-inspector-rbl-no-calc, body.ka-inspector-rbl-exclude .ka-inspector-rbl-exclude { border: 2px dotted #f93b1d; }
	body.ka-inspector-unmount-clears-inputs .ka-inspector-unmount-clears-inputs { border: 2px dotted #f93b1d; }
	body.ka-inspector-needs-calc .ka-inspector-needs-calc { border: 2px dotted #f93b1d; }
	body.ka-inspector-template .ka-inspector-template { border: 2px dotted #10a84a; }
	body.ka-inspector-input .ka-inspector-input, body.ka-inspector-input-group .ka-inspector-input-group { border: 2px dotted #770519; }
	body.ka-inspector-on .ka-inspector-on { border: 2px dotted #ff9e76; }
	body.ka-inspector-bind .ka-inspector-bind { border: 2px dotted #78aff6; }
	body.ka-inspector-html .ka-inspector-html { border: 2px dashed #b6de29; }
	body.ka-inspector-text .ka-inspector-text { border: 2px dashed #b6de29; }
	body.ka-inspector-pre .ka-inspector-pre { border: 2px dotted #f93b1d; }
	body.ka-inspector-scope .ka-inspector-scope { border: 2px dotted #57625a; }
	body.ka-inspector-for .ka-inspector-for { border: 2px dotted #f93b1d; }
	body .ka-inspector-if-hidden { display: none; color: #b232c0; }
	body .ka-inspector-show-hidden { display: none; color: #b232c0; }
	body.ka-inspector-if .ka-inspector-if-hidden, body.ka-inspector-show .ka-inspector-show-hidden { display: block; }
	body.ka-inspector-if .ka-inspector-if { border: 2px dotted #b232c0; }
	body.ka-inspector-show .ka-inspector-show { border: 2px dotted #b232c0; }
	body.ka-inspector-resource .ka-inspector-resource { border: 3px dashed #2067b3; }
	body.ka-inspector-resource .ka-inspector-resource.missing { border: 3px dashed #f93b1d; }
	body.ka-inspector-resource .ka-inspector-resource.missing-culture { border: 3px dashed #10a84a; }
</style>`;
		
			document.body.appendChild(kaResources);
		}

		const that = this;

		const getTabDefKey = function(calcEngine?: string, tab?: string) {
			const ce = calcEngine
				? that.calcEngines.find(c => c.key == calcEngine)
				: that.calcEngines[0];

			if (ce == undefined) {
				throw new Error(`Can not find CalcEngine ${calcEngine} in rbl-config.`);
			}

			const tabName = tab ?? ce.resultTabs[0];

			if (ce.resultTabs.indexOf(tabName) == -1) {
				throw new Error(`Can not find Tab ${tabName} for ${calcEngine} in rbl-config.`);
			}

			const key = `${ce.key}.${tabName}`;
			return key;
		}

		const getResultTableRows = function <T extends ITabDefRow>(table: string, calcEngine?: string, tab?: string) {
			const key = getTabDefKey(calcEngine, tab);
			return (that.state.rbl.results[key]?.[table] ?? []) as Array<T>;
		};

		const getValue = function (...args: Array<string | undefined>) {
			const table = args.length == 1 ? "rbl-value" : args[0]!;
			const keyValue = args.length == 1 ? args[0]! : args[1]!;
			const returnField = args.length >= 3 ? args[2] : undefined;
			const keyField = args.length >= 4 ? args[3] : undefined;
			const calcEngine = args.length >= 5 ? args[4] : undefined;
			const tab = args.length >= 6 ? args[5] : undefined;

			return getResultTableRows(table, calcEngine, tab)
					.find(r => r[keyField ?? "id"] == keyValue)?.[returnField ?? "value"];
		}

		const isTrue = (v: any) => {
			if (v == undefined) return true;

			if (typeof (v) == "string") return ["false", "0", "n", "no"].indexOf(v.toLowerCase()) == -1;

			// Convert to boolean
			return !(!v);
		};

		const cloneApplication = this.getCloneApplication(this.options);
		
		let _isDirty: boolean | undefined = false;

		const mergeRowsInternal = function (resultTabDef: ITabDef, table: string, rows: ITabDefRow | Array<ITabDefRow>, isPushTo: boolean = false) {
			if (!isPushTo && resultTabDef["_ka"] == undefined) {
				throw new Error(`Can not use mergeRows on a rbl.results tabDef.  Please use rbl.pushTo instead.`);
			}

			if (resultTabDef[table] == undefined) {
				// See comment in copyTabDefToRblState and commits around 11/27/2024-12/1/2024, seems nextTick inside
				// processTabDefs fixes issues with everything but I commented that I left everything coded for tables
				// based on how https://v2.vuejs.org/v2/guide/reactivity.html#For-Arrays mentions to do it.
				// The problem with this is I reassign resultTabDef which doesn't affect the REAL table in the results
				// it makes a new object.  I had the following:
				//	resultTabDef = Object.assign({}, resultTabDef, { [table]: [] });
				// but I think since resultTabDef is already under reactivity, I am safe to just assign a property to a new array
				resultTabDef[table] = [];
			}
			const t = resultTabDef[table];

			const toPush = rows instanceof Array ? rows : [rows];

			toPush.forEach((row, i) => {
				row.id = row.id ?? "_pushId_" + (t.length + i);

				const index = t.findIndex(r => r.id == row.id);
				if (index > -1) {
					// t[index] = row;
					t.splice(index, 1, row);
				}
				else {
					// t.push(row);
					t.splice(t.length, 0, row);
				}
			});
		};

		const state: IState = {
			kaId: this.id,

			application: this,

			lastInputChange: Date.now(),
			inputsChanged: false,
			get isDirty() {
				return _isDirty ?? this.inputsChanged;
			},
			set isDirty(value: boolean | undefined) {
				_isDirty = value;
				if (!( value ?? true )) {
					this.inputsChanged = false;
				}
			},
			uiBlocked: false,
			canSubmit( whenInputsHaveChanged ) { return ( whenInputsHaveChanged ? this.inputsChanged : this.isDirty! ) && this.errors.filter( r => r.id.startsWith('i')).length == 0 && !this.uiBlocked; },
			needsCalculation: false,

			inputs: KatApps.Utils.extend(
				{
					getOptionText: (inputId: string): string | undefined => that.selectElement(`.${inputId} option:checked`)?.textContent ?? undefined,
					getNumber: (inputId: string): number | undefined => {
						// `^\-?[0-9]+(\\${currencySeparator}[0-9]{1,2})?$`
						
						const currencyString = that.state.inputs[inputId] as string;
						if (currencyString == undefined) return undefined;

						const decimalSeparator = ( Sys.CultureInfo.CurrentCulture as any ).numberFormat.CurrencyDecimalSeparator;
						const numberRegEx = new RegExp(`[^\-0-9${decimalSeparator}]+`, "g");
						// Parse the cleaned string as a float, replacing the French decimal separator with a dot
						var parsedValue = parseFloat(currencyString.replace(numberRegEx, "").replace(decimalSeparator, "."));
						
						return !isNaN(parsedValue) ? parsedValue : undefined;
					}
				},
				this.options.inputs,
				this.getSessionStorageInputs()
			),
			errors: [],
			warnings: [],
			onAll(...values: any[]) {
				return values.find(v => (v ?? "") == "" || !isTrue(v)) == undefined;
			},
			onAny(...values: any[]) {
				return values.find(v => (v ?? "") != "" && isTrue(v)) != undefined;
			},
			rbl: {
				results: cloneApplication ? KatApps.Utils.clone(cloneApplication.state.rbl.results) : {},
				
				mergeRows(resultTabDef, table, rows) {
					mergeRowsInternal(resultTabDef, table, rows, false);
				},

				pushTo(table, rows, calcEngine, tab) {
					const key = getTabDefKey(calcEngine, tab);
					let tabDef = that.state.rbl.results[key];

					if (tabDef == undefined) {
						return;
					}

					mergeRowsInternal(tabDef, table, rows, true);

					that.pushToTables.push(`${key}.${table}`);
				},

				boolean() {
					const argList = Array.from(arguments);
					const stringParams = argList.filter(i => typeof i != "boolean");
					const table = argList[0];

					const v = stringParams.length == 1
						? this.value("rbl-value", table) ?? this.value("rbl-display", table) ?? this.value("rbl-disabled", table) ?? this.value("rbl-skip", table)
						: getValue(...stringParams);

					const valueWhenMissing = argList.find(i => typeof i == "boolean");

					if (v == undefined && valueWhenMissing != undefined) {
						return valueWhenMissing;
					}

					return isTrue(v);
				},
				text() { return that.getLocalizedString(getValue(...arguments)); },
				value() { return getValue(...arguments); },
				number() {
					const v = +(getValue(...arguments) ?? 0);
					return isNaN(v) ? 0 : v;
				},
				source(table, calcEngine, tab, predicate) {
					if (typeof calcEngine == "function") {
						predicate = calcEngine;
						calcEngine = undefined;
					}
					else if (typeof tab == "function") {
						predicate = tab;
						tab = undefined;
					}

					// https://stackoverflow.com/a/74083606/166231
					/*
					type T = typeof predicate extends
						((row: infer T) => boolean) | undefined ? T : never;
					*/
					const result = predicate
						? getResultTableRows<any>(table, calcEngine, tab).filter(r => predicate!(r))
						: getResultTableRows<any>(table, calcEngine, tab);

					return result;
				},
				exists(table, calcEngine, tab, predicate) {
					if (typeof calcEngine == "function") {
						predicate = calcEngine;
						calcEngine = undefined;
					}
					else if (typeof tab == "function") {
						predicate = tab;
						tab = undefined;
					}

					// https://stackoverflow.com/a/74083606/166231
					/*
					type T = typeof predicate extends
						((row: infer T) => boolean) | undefined ? T : never;
					*/

					return predicate
						? getResultTableRows<any>(table, calcEngine, tab).filter(r => predicate!(r)).length > 0
						: getResultTableRows<any>(table, calcEngine, tab).length > 0;
				}
			},

			model: cloneApplication ? KatApps.Utils.clone(cloneApplication.state.model) : {},
			handlers: cloneApplication ? KatApps.Utils.clone(cloneApplication.state.handlers ?? {}) : {},
			components: {},

			// Private
			_domElementMounted(el) {

				// If still rendering the first time...then don't add any elements during the first render
				if (that.el.hasAttribute("ka-cloak")) return;

				if (!that.domElementQueue.includes(that.el) && !that.domElementQueue.includes(el)) {
					let queueElement = true;

					// https://stackoverflow.com/a/9882349
					var i = that.domElementQueue.length;
					while (i--) {
						const q = that.domElementQueue[i];
						if (el.contains(q)) {
							// console.log(`${that.selector} _domElementMounted index ${i} was contained by el, remove ${i}`);
							that.domElementQueue.splice(i, 1);
						}
						else if (q.contains(el)) {
							// console.log(`${that.selector} _domElementMounted index ${i} contained el, don't queue el`);
							queueElement = false;
							i = 0;
						}
					}

					if (queueElement) {
						// console.log(that.selector + " _domElementMounted, count: " + that.domElementQueue.length);
						that.domElementQueue.push(el);
					}
				}
				if (!that.domElementQueued) {
					that.domElementQueued = true;
					that.updateDomPromise.then(async () => await that.processDomElementsAsync.apply(that));
				}
			},
			_templateItemMounted: (templateId, el, scope?) => {
				// Setup a mount event that will put <style> into markup or run <script> appropritately when this template is ever used
				const mode = el.tagName == "STYLE" || el.hasAttribute("setup") ? "setup" : "mount";

				el.removeAttribute("setup");

				if (mode == "setup") {
					const oneTimeId = `${templateId}_${el.tagName}_${id}_mount`;
					if (that.mountedTemplates[oneTimeId] != undefined) {
						el.remove(); // Remove tag just to keep content clean
						return;
					}
					that.mountedTemplates[oneTimeId] = true;
				}

				if (el.tagName == "SCRIPT") {
					new Function("_a", "_s", el.textContent + "\nif ( typeof mounted !== 'undefined' ) mounted(_a, _s);")(that, scope);
					el.remove(); // Remove script tag just to keep content clean
				}
				else if (el.tagName == "STYLE") {
					el.outerHTML = el.outerHTML.replace(/thisApplication/g, this.applicationCss);
				}
			},
			_templateItemUnmounted: (templateId, el, scope?) => {
				const mode = el.hasAttribute("setup") ? "setup" : "mount";

				if (mode == "setup") {
					const oneTimeId = `${templateId}_${el.tagName}_${id}_unmount`;
					if (that.mountedTemplates[oneTimeId] != undefined) {
						el.remove();
						return;
					}
					that.mountedTemplates[oneTimeId] = true;
				}

				new Function("_a", "_s", el.textContent + "\nif ( typeof unmounted !== 'undefined' ) unmounted(_a, _s);")(that, scope);
			}
		};

		this.state = PetiteVue.reactive(state);
	}

	private getCloneApplication(options: IKatAppOptions): IKatApp | undefined {
		const cloneHost = options.cloneHost ?? false;
		const cloneApplication = typeof cloneHost == "string"
			? KatApp.get(cloneHost)
			: cloneHost === true ? this.options.hostApplication : undefined;
		return cloneApplication;
	}

	public async triggerEventAsync(eventName: string, ...args: (object | string | undefined | unknown)[]): Promise<boolean | undefined> {
		 KatApps.Utils.trace(this, "KatApp", "triggerEventAsync", `Start: ${eventName}.`, TraceVerbosity.Detailed);

		try {
			if (eventName == "calculation" || eventName == "configureUICalculation") {
				await PetiteVue.nextTick();
			}

			const isReturnable = (result: false | undefined) => result != undefined && typeof(result) == "boolean" && ["modalAppInitialized", "calculateStart", "apiStart"].indexOf(eventName) > -1 && !result;

			const eventArgs = [...args, this];

			for (const eventConfiguration of this.eventConfigurations.concat(KatApp.globalEventConfigurations.filter( e => e.selector.split(",").map( s => s.trim() ).indexOf(this.selector) > -1).map( e => e.events))) {
				try {
					// Make application.element[0] be 'this' in the event handler
					let delegateResult = (eventConfiguration as IStringAnyIndexer)[eventName]?.apply(this.el, eventArgs);

					if (delegateResult instanceof Promise) {
						delegateResult = await delegateResult;
					}
						
					if ( isReturnable(delegateResult) ) {
						return delegateResult;
					}
	
				} catch (error) {
					// apiAsync already traces error, so I don't need to do again
					if (!(error instanceof ApiError)) {
						 KatApps.Utils.trace(this, "KatApp", "triggerEventAsync", `Error calling ${eventName}: ${error}`, TraceVerbosity.None, error);
						this.addUnexpectedError(error);
					}
				}
			}
			
			return true;
		} finally {
			 KatApps.Utils.trace(this, "KatApp", "triggerEventAsync", `Complete: ${eventName}.`, TraceVerbosity.Detailed);
		}
	}


	public configure(configAction: (config: IConfigureOptions, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp {
		if (this.isMounted) {
			throw new Error("You cannot call 'configure' after the KatApp has been mounted.");
		}

		const config: IConfigureOptions = {
			events: {}
		};

		configAction(config, this.state.rbl, this.state.model, this.state.inputs, this.state.handlers);

		let hasEventHandlers = false;
        for (const propertyName in config.events) {
			hasEventHandlers = true;
			break;
        }
		if (hasEventHandlers) {
			this.eventConfigurations.push(config.events);
		}

		this.configureOptions = config;

		// Fluent api
		return this;
	}

	public handleEvents(configAction: (config: IKatAppEventsConfiguration, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp {
		const config: IKatAppEventsConfiguration = {};
		configAction(config, this.state.rbl, this.state.model, this.state.inputs, this.state.handlers);
		this.eventConfigurations.push(config);
		return this;
	}

	private appendAndExecuteScripts(target: HTMLElement, viewElement: HTMLElement): void {
		// Extract script elements
		const scripts = viewElement.querySelectorAll('script');
		const nonScripts =
			Array.from(viewElement.children)
				.filter(node => node.tagName !== 'SCRIPT');
	
		// Append non-script elements
		nonScripts.forEach(node => target.appendChild(node));
	
		// Append and execute script elements
		scripts.forEach(script => {
			const newScript = document.createElement('script');
			if (script.src) {
				newScript.src = script.src;
			} else {
				newScript.textContent = script.textContent;
			}
			target.appendChild(newScript);
		});
	}
		
	private async mountAsync(): Promise<void> {
		try {
			 KatApps.Utils.trace(this, "KatApp", "mountAsync", `Start`, TraceVerbosity.Detailed);

			if (this.options.view != undefined) {
				this.el.setAttribute("data-view-name", this.options.view);
			}
			
			const viewElement = await this.getViewElementAsync();

			// TODO: Should this just be 'view.kaml' instead of the 'guid' id?
			this.viewTemplates = viewElement != undefined
				? [...(await this.getViewTemplatesAsync(viewElement)), this.id].reverse()
				: [this.id];

			 KatApps.Utils.trace(this, "KatApp", "mountAsync", `View Templates Complete`, TraceVerbosity.Detailed);

			const inputs = this.options.inputs;
			const processInputTokens = (value: string | null): string | null => {
				if (value == undefined) return value;

				return value.replace(/{([^}]+)}/g, function (match, token) {
					return inputs?.[token] as string ?? match;
				});
			};

			const cloneApplication = this.getCloneApplication(this.options);
			this.options.hostApplication = this.options.hostApplication ?? cloneApplication;

			function calcEngineFactory(c: Element, pipelineIndex?: number): ICalcEngine | IPipelineCalcEngine
			{
				var enabled = processInputTokens(c.getAttribute("enabled"));

				return pipelineIndex == undefined
					? {
						key: c.getAttribute("key") ?? "default",
						name: processInputTokens(c.getAttribute("name")) ?? "UNAVAILABLE",
						inputTab: c.getAttribute("input-tab") ?? "RBLInput",
						resultTabs: processInputTokens(c.getAttribute("result-tabs"))?.split(",") ?? ["RBLResult"],
						pipeline: Array.from(c.querySelectorAll("pipeline")).map((p, i) => calcEngineFactory(p, i + 1)),
						allowConfigureUi: c.getAttribute("configure-ui") != "false",
						manualResult: false,
						enabled: ( ( enabled?.startsWith("!!") ?? false ) ? eval(enabled!.substring(2)) : enabled ) != "false"
					} as ICalcEngine
					: {
						key: `pipeline${pipelineIndex}`,
						name: processInputTokens(c.getAttribute("name")) ?? "UNAVAILABLE",
						inputTab: c.getAttribute("input-tab"),
						resultTab: processInputTokens(c.getAttribute("result-tab"))
					} as IPipelineCalcEngine;
			};

			this.calcEngines = cloneApplication == undefined && viewElement != undefined
				? Array.from(viewElement.querySelectorAll("rbl-config > calc-engine")).map( c => calcEngineFactory( c ) as ICalcEngine)
				: cloneApplication ? [...cloneApplication.calcEngines.filter( c => !c.manualResult)] : [];

			 KatApps.Utils.trace(this, "KatApp", "mountAsync", `CalcEngines configured`, TraceVerbosity.Detailed);

			if (this.options.resourceStrings == undefined && this.options.resourceStringsEndpoint != undefined) {
				const apiUrl = this.getApiUrl(this.options.resourceStringsEndpoint);

				try {
					const response = await fetch(apiUrl.url, {
						method: "GET",
						headers: { 'Cache-Control': 'max-age=0' },
						cache: 'default'
					});
					
					if (!response.ok) {
						throw await response.json();
					}
	
					this.options.resourceStrings = await response.json();
					 KatApps.Utils.trace(this, "KatApp", "mountAsync", `Resource Strings downloaded`, TraceVerbosity.Detailed);
				} catch (e) {
					 KatApps.Utils.trace(this, "KatApp", "mountAsync", `Error downloading resourceStrings ${this.options.resourceStringsEndpoint}`, TraceVerbosity.None, e);
				}

				if (this.options.debug.debugResourcesDomain) {
					const currentOptions = this.options as IKatAppRepositoryOptions;
					currentOptions.useLocalRepository = currentOptions.useLocalRepository || await KatApps.Utils.checkLocalServerAsync(this.options);
					if (currentOptions.useLocalRepository) {
						const devResourceStrings = await KatApps.Utils.downloadLocalServerAsync(currentOptions.debug.debugResourcesDomain!, "/js/dev.ResourceStrings.json");
						if (devResourceStrings != undefined) {
							this.options.resourceStrings = KatApps.Utils.extend(this.options.resourceStrings ?? {}, JSON.parse(devResourceStrings));
						}
					}
				}
			}

			if (this.options.manualResults == undefined && this.options.manualResultsEndpoint != undefined) {
				const apiUrl = this.getApiUrl(this.options.manualResultsEndpoint);

				try {
					const response = await fetch(apiUrl.url, {
						method: "GET",
						headers: { 'Cache-Control': 'max-age=0' },
						cache: 'default'
					});
					
					if (!response.ok) {
						throw await response.json();
					}
	
					this.options.manualResults = await response.json();
					KatApps.Utils.trace(this, "KatApp", "mountAsync", `Manual Results downloaded`, TraceVerbosity.Detailed);
				} catch (e) {
					KatApps.Utils.trace(this, "KatApp", "mountAsync", `Error downloading manualResults ${this.options.manualResultsEndpoint}`, TraceVerbosity.None, e);
				}
			}

			if (viewElement != undefined) {
				if (this.options.hostApplication != undefined && this.options.inputs?.iModalApplication == "1") {
					if (this.options.content != undefined) {
						if (typeof this.options.content == "string") {
							this.selectElement(".modal-body")!.innerHTML = this.options.content;
						}
						else {
							this.selectElement(".modal-body")!.append(this.options.content);
						}

						// Even with appending the 'content' object (if selector was provided) the help tips don't function, 
						// so need to remove init flag and let them reprocess
						this.selectElements("[data-bs-toggle='tooltip'], [data-bs-toggle='popover']").forEach( e => e.removeAttribute("ka-init-tip") );

						// There is still an issue with things that used {id} notation (i.e. bootstrap accordians) because now
						// the original ID is baked into the markup, so in the modal when they are expanding an accordian
						// it expands the original hidden markup as well.  So there are still issues to consider before using 
						// contentSelector with showModalAsync.
					}
					else {
						this.appendAndExecuteScripts(this.selectElement(".modal-body")!, viewElement);
					}
				}
				else {
					this.appendAndExecuteScripts(this.el, viewElement);
				}
			}

			KatApps.Components.initializeCoreComponents(this, name => this.getTemplateId(name));

			// Couldn't do this b/c the model passed in during configure() delegate was then reassigned so
			// any references to 'model' in code 'inside' delegate was using old/original model.
			// this.state.model = this.configureOptions?.model ?? {};

			// Couldn't do this b/c any reactivity coded against model was triggered
			// i.e.Nexgen Common.Footer immediately triggered the get searchResults() because searchString was updated, but rbl.source
			// was not yet valid b/c no calculation ran, so it threw an error.
			// KatApps.Utils.extend(this.state.model, this.configureOptions?.model ?? {});		

			// Using below (copied from code in Petite Vue) and it seems to 'modify' model so that code inside configure() delegate that
			// used it always had 'latest' model, but it also didn't trigger reactivity 'at this point'
			Object.defineProperties(this.state.model, Object.getOwnPropertyDescriptors(this.configureOptions?.model ?? {}))
			Object.defineProperties(this.state.handlers, Object.getOwnPropertyDescriptors(this.configureOptions?.handlers ?? {}))

			if (this.configureOptions != undefined) {
				for (const propertyName in this.configureOptions.components) {
					this.state.components[propertyName] = this.configureOptions.components[propertyName];
				}
				if (this.configureOptions.options?.modalAppOptions != undefined && this.state.inputs.iModalApplication == "1") {
					KatApps.Utils.extend(this.options, { modalAppOptions: this.configureOptions.options.modalAppOptions });
				}
				if (this.configureOptions.options?.inputs != undefined) {
					KatApps.Utils.extend(this.state.inputs, this.configureOptions.options.inputs);
				}
			}

			const isModalApplication = this.options.hostApplication != undefined && this.options.inputs?.iModalApplication == "1";
			const isNestedApplication = this.options.hostApplication != undefined && this.options.inputs?.iNestedApplication == "1";
			if (isModalApplication) {

				if (this.options.modalAppOptions?.buttonsTemplate != undefined) {
					this.selectElements(".modal-footer-buttons button").forEach( b => b.remove() );
					this.selectElement(".modal-footer-buttons")?.setAttribute("v-scope", "components.template({name: '" + this.options.modalAppOptions.buttonsTemplate + "'})");
				}

				if (this.options.modalAppOptions?.headerTemplate != undefined) {
					const modalBody = this.selectElement(".modal-body");
					const modalHeader = modalBody?.previousElementSibling; // modal-header - no class to select since it is driven by :class="[]"
						
					if (modalHeader) {
						modalHeader.setAttribute("v-scope", `components.template({name: '${this.options.modalAppOptions.headerTemplate}'})`);
						while (modalHeader.firstChild) {
							modalHeader.removeChild(modalHeader.firstChild);
						}
					}
				}

				await ( this.options.hostApplication as KatApp ).triggerEventAsync("modalAppInitialized", this);
			}
			if (isNestedApplication) {
				await ( this.options.hostApplication as KatApp ).triggerEventAsync("nestedAppInitialized", this);
			}

			await this.triggerEventAsync("initialized");

			if (this.options.manualResults != undefined) {
				const hasCalcEngines = this.calcEngines.length > 0;
				this.calcEngines.push(...this.toCalcEngines(this.options.manualResults));

				const tabDefs = this.options.manualResults.map( r => ({ CalcEngine: r[ "@calcEngine" ], TabDef: r as unknown as IRbleTabDef }))
				const manualResultTabDefs = this.toTabDefs(tabDefs);

				// Some Kaml's without a CE have manual results only.  They will be processed one time during
				// mount since they theoretically never change.  However, resultsProcessing is used to inject some
				// rbl-value rows, so need to call this event to allow that processing to occur
				if (!hasCalcEngines) {
					const getSubmitApiConfigurationResults = await this.getSubmitApiConfigurationAsync(
						async submitApiOptions => {
							await this.triggerEventAsync(
								"updateApiOptions",
								submitApiOptions,
								this.getApiUrl(this.options.calculationUrl).endpoint
							);
						},
						{},
						true
					);

					await this.triggerEventAsync("resultsProcessing", manualResultTabDefs, getSubmitApiConfigurationResults.inputs, getSubmitApiConfigurationResults.configuration);
				}
				await this.processResultsAsync(manualResultTabDefs, undefined);
			}

			this.initializeInspector();

			const isConfigureUICalculation = this.calcEngines.filter(c => c.allowConfigureUi && c.enabled && !c.manualResult).length > 0;

			// initialized event might have called apis and got errors, so we don't want to clear out errors or run calculation
			if (cloneApplication == undefined && this.state.errors.length == 0 && isConfigureUICalculation) {
				this.handleEvents(events => {
					events.calculationErrors = async (key, exception) => {
						if (key == "SubmitCalculation.ConfigureUI") {
							this.addUnexpectedError(exception);
							 KatApps.Utils.trace(this, "KatApp", "mountAsync", isModalApplication ? "KatApp Modal Exception" : "KatApp Exception", TraceVerbosity.None, exception);
						}
					};
				});
				// _iConfigureUI is 'indicator' to calcuateAsync to not trigger events
				await this.calculateAsync({ _iConfigureUI: "1", iConfigureUI: "1", iDataBind: "1" });
			}

			if (isModalApplication) {
				const modalAppInitialized = await this.triggerEventAsync("modalAppInitialized") ?? true;
				if (!modalAppInitialized) {
					this.options.modalAppOptions!.promise.resolve({ confirmed: false, response: undefined, modalApp: this });
					this.el.remove();
					KatApp.remove(this);
					this.options.hostApplication!.unblockUI();
					return; // remove app and element - check close modal and see what it does
				}
			}

			this.state.errors.forEach(error => error.initialization = true);
			const initializationErrors = this.state.errors.length > 0;

			this.vueApp = PetiteVue.createApp(this.state);

			KatApps.Directives.initializeCoreDirectives(this.vueApp, this);

			if (this.configureOptions != undefined) {
				for (const propertyName in this.configureOptions.directives) {
					this.vueApp.directive(propertyName, this.configureOptions.directives[propertyName]);
				}
			}

			this.vueApp.mount(this.selector);
			this.isMounted = true;

			if (!initializationErrors && cloneApplication == undefined) {
				// Now that everything has been processed, can trigger iConfigureUI 'calculation' events
				if (isConfigureUICalculation && this.lastCalculation) {
					await this.triggerEventAsync("configureUICalculation", this.lastCalculation);
					await this.triggerEventAsync("calculation", this.lastCalculation);
					await this.triggerEventAsync("calculateEnd");
				}
				else if (this.calcEngines.find(c => c.manualResult) != undefined) {
					await this.triggerEventAsync("calculation", this.lastCalculation);
				}
			}

			if (isModalApplication) {
				await this.showModalApplicationAsync();
			}
			this.el.removeAttribute("ka-cloak");
			await this.processDomElementsAsync(); // process main application

			this.state.inputsChanged = false; // If needed, rendered can have some logic  set to true if needed
			await this.triggerEventAsync("rendered", initializationErrors ? this.state.errors : undefined);
			
			if (this.options.hostApplication != undefined && this.options.inputs?.iNestedApplication == "1") {
				await ( this.options.hostApplication as KatApp ).triggerEventAsync("nestedAppRendered", this, initializationErrors ? this.state.errors : undefined);
			}
		} catch (ex) {
			if (ex instanceof KatApps.KamlRepositoryError) {
				 KatApps.Utils.trace(this, "KatApp", "mountAsync", "Error during resource download", TraceVerbosity.None,
					...ex.results.map(r => `${r.resource}: ${r.errorMessage}` )
				);
			}

			throw ex;
		}
		finally {
			 KatApps.Utils.trace(this, "KatApp", "mountAsync", `Complete`, TraceVerbosity.Detailed);
		}
	}
	
	private initializeInspector() {
		if (this.options.debug.showInspector != "0") {
			const inspectorKeyDown = (e: KeyboardEvent) => {
				if (e.ctrlKey && e.altKey && e.key == "i") {
					if (document.body.classList.contains("ka-inspector")) {
						Array.from(document.body.classList).forEach(className => {
							if (className.startsWith('ka-inspector')) {
								document.body.classList.remove(className);
							}
						});
					}
					else {
						const inspectorMappings = [
							{ name: "resource", description: "v-ka-resource" },
							{ name: "value", description: "v-ka-value" },
							{ name: "template", description: "v-ka-template" },

							{ name: "for", description: "v-for" },
							{ name: "if", description: "v-if, v-else-if, v-else" },
							{ name: "show", description: "v-show" },

							{ name: "on", description: "v-on:event=, @event=" },
							{ name: "bind", description: "v-bind:attribute=, :attribute=, v-bind={ attribute: }" },
							{ name: "html", description: "v-html" },
							{ name: "text", description: "v-text, {{ }}" },
							{ name: "scope", description: "v-scope" },

							{ name: "navigate", description: "v-ka-navigate" },
							{ name: "app", description: "v-ka-app" },
							{ name: "api", description: "v-ka-api" },
							{ name: "modal", description: "v-ka-modal" },
							{ name: "input", description: "v-ka-input" },
							{ name: "input-group", description: "v-ka-input-group" },

							{ name: "no-calc", description: "v-ka-rbl-no-calc", class: "rbl-no-calc" },
							{ name: "exlude", description: "v-ka-rbl-exclude", class: "rbl-exclude" },
							{ name: "unmount", description: "v-ka-unmount-clears-inputs", class: "unmount-clears-inputs" },
							{ name: "needs-calc", description: "v-ka-needs-calc" },

							{ name: "pre", description: "v-pre" },
							{ name: "highcharts", description: "v-ka-highcharts" },
							{ name: "attributes", description: "v-ka-attributes" },
							{ name: "inline", description: "v-ka-inline" },
							{ name: "table", description: "v-ka-table" },
						]

							const getInspectorOptions = () => {
								const promptMessage =
`What do you want to inspect?

Enter a comma delimitted list of names or numbers.

Type 'help' to see available options displayed in the console.`;
							
							var defaultOptions = (KatApps.Utils.pageParameters["showinspector"] ?? "1") != "1"
								? KatApps.Utils.pageParameters["showinspector"]
								: "resource,value,modal,template,html,text";
							return prompt(promptMessage, defaultOptions);
						};
						const inspectorOptions = inspectorMappings.map((m, i) => `${i}. ${m.name} - ${m.description}`).join("\r\n");
						
						let response = getInspectorOptions();

						if (response == "help") {
							console.log(inspectorOptions);
							response = getInspectorOptions();
						}

						if (response) {
							const options = response.split(",")
								.map(r => r.trim())
								.map(r => isNaN(+r)
									? inspectorMappings.find(m => m.name == r) ?? { name: r, class: `ka-inspector-${r}` }
									: (+r < inspectorMappings.length ? inspectorMappings[+r] : undefined)
								);

							document.body.classList.add('ka-inspector', ...options.filter(o => o != undefined).map(o => `ka-inspector-${o!.class ?? o!.name}`));
						}
					}
				}
			};

			if (document.body.getAttribute("ka-inspector-init") != "1") {
				document.body.setAttribute("ka-inspector-init", "1");
				document.body.addEventListener("keydown", inspectorKeyDown);
			}
		}
	}

	private createModalContainer(): HTMLElement {

		const options = this.options.modalAppOptions = KatApps.Utils.extend(
			{
				labels: {
					cancel: "Cancel",
					continue: "Continue"
				},
				css: {
					cancel: "btn btn-outline-primary",
					continue: "btn btn-primary"
				},
				showCancel: true,
				allowKeyboardDismiss: true,
				size: this.options.view != undefined ? "xl" : undefined,
				scrollable: false,
				calculateOnConfirm: false
			},
			this.options.modalAppOptions
		);

		options.labels!.title = this.getLocalizedString(options.labels!.title);
		options.labels!.continue = this.getLocalizedString(options.labels!.continue);
		options.labels!.cancel = this.getLocalizedString(options.labels!.cancel);

		const cssCancel = options.css!.cancel;
		const cssContinue = options.css!.continue;

		const viewName =
			this.options.view ??
			(this.options.modalAppOptions.contentSelector != undefined ? `selector: ${this.options.modalAppOptions.contentSelector}` : "static content");
		
		const modalHtml =
`<div v-scope class="modal fade kaModal" tabindex="-1" aria-modal="true" aria-labelledby="kaModalLabel" role="dialog" data-bs-backdrop="static"
	:data-bs-keyboard="application.options.modalAppOptions.allowKeyboardDismiss"
	data-view-name="${viewName}">
	
	<div class="modal-dialog">
		<div class="modal-content" v-scope="{
				get hasInitializationError() { return application.state.errors.find( r => r.initialization ) != undefined; },
				get title() { return application.getLocalizedString(application.options.modalAppOptions.labels.title); },
				get hasHeaderTemplate() { return application.options.modalAppOptions.headerTemplate != undefined; }
			}">
			<div v-if="uiBlocked" class="ui-blocker"></div>
			<div v-if="title != undefined || hasHeaderTemplate"
				:class="['modal-header', { 'invalid-content': hasInitializationError, 'valid-content': !hasInitializationError }]">
				<h2 id="kaModalLabel" class="modal-title" v-html="title ?? ''"></h2>
				<button v-if="application.options.modalAppOptions.allowKeyboardDismiss != false" type="button" class="btn-close" :aria-label="application.getLocalizedString('Close')"></button>
			</div>
			<div class="modal-body"></div>
			<div class="modal-footer">
				<div v-if="hasInitializationError" class="modal-invalid-footer-buttons text-center d-none">
					<button type="button" :class="[\'${cssContinue}\', \'continueButton\']">${this.getLocalizedString("Close")}</button>
				</div>
				<div v-if="!hasInitializationError" class="modal-footer-buttons text-center d-none">
					<button v-if="application.options.modalAppOptions.showCancel" type="button" :class="[\'${cssCancel}\', \'cancelButton\', { disabled: uiBlocked}]">${options.labels!.cancel}</button>
					<button type="button" :class="[\'${cssContinue}\', \'continueButton\', { disabled: uiBlocked}]">${options.labels!.continue}</button>
				</div>
			</div>
		</div>
	</div>
</div>`;

		const modalTemplate = document.createElement("template");
		modalTemplate.innerHTML = modalHtml;
		const modal = modalTemplate.content.firstChild as HTMLElement
		
		if (options.scrollable) {
			modal.querySelector(".modal-dialog")!.classList.add("modal-dialog-scrollable");
			modal.querySelector(".modal-body")!.setAttribute("tabindex", "0");
		}
		if (options.size != undefined) {
			modal.querySelector(".modal-dialog")!.classList.add("modal-dialog-centered", "modal-" + options.size);
		}

		if (this.options.modalAppOptions.view != undefined) {
			document.querySelector("[ka-id]")!.after(modal);
		}
		else {
			// If just 'content' for a modal dialog, append inside current application 
			// so that any CSS from current application/view is applied as well.
			this.options.hostApplication!.el.append(modal);
		}

		return modal;
    }

	private async showModalApplicationAsync(): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			if (this.el.classList.contains("show")) {
				console.log("When this is hit, document why condition is there");
				debugger;
				resolve(true);
				return;
			}

			const options = this.options.modalAppOptions!;
			const that = this;
			let katAppModalClosing = false;
	
			const closeModal = function () {
				katAppModalClosing = true;
				KatApps.HelpTips.hideVisiblePopover();
				modalBS5.hide();
				that.el.remove();
				KatApp.remove(that);
				options.triggerLink?.focus();
			}
	
			// If response if of type Event, 'confirmedAsync/cancelled' was just attached to a button and default processing occurred and the first param was
			// click event object.  Just pass undefined back as a response in that scenario.		
			options.confirmedAsync = async response => {
				closeModal();
	
				if (options.calculateOnConfirm != undefined) {
					const calculateOnConfirm = (typeof options.calculateOnConfirm == 'boolean') ? options.calculateOnConfirm : true;
					const calculationInputs = (typeof options.calculateOnConfirm == 'object') ? options.calculateOnConfirm : undefined;
					if (calculateOnConfirm) {
						await that.options.hostApplication!.calculateAsync(calculationInputs, true, undefined, false);
					}
				}
	
				options.promise.resolve({ confirmed: true, response: response instanceof Event ? undefined : response, modalApp: that });
			};
			options.cancelled = response => {
				closeModal();
				options.promise.resolve({ confirmed: false, response: response instanceof Event ? undefined : response, modalApp: that });
			};
	
			// if any errors during initialized event or during iConfigureUI calculation, modal is probably 'dead', show a 'close' button and
			// just trigger a cancelled
			const isInvalid = this.state.errors.length > 0;
			const hasCustomHeader = options.headerTemplate != undefined;
			const hasCustomButtons = options.buttonsTemplate != undefined;
			// If custom buttons, framework should ignore the options (kaml can use them)
			const tryCancelClickOnClose = hasCustomButtons || ( options.showCancel ?? true );
	
			// Could put an options about whether or not to set this
			// this.el.attr("data-bs-keyboard", "false");
	
			const closeButtonClickAsync = async (e: Event) => {
				if (!katAppModalClosing) {
					e.preventDefault();
					if (isInvalid) {
						options.cancelled!();
					}
					else if (options.closeButtonTrigger != undefined) {
						that.selectElement(options.closeButtonTrigger)!.click();
					}
					else if (tryCancelClickOnClose) {
						const cancelButton = that.selectElement<HTMLButtonElement>(".modal-footer-buttons .cancelButton");

						if (cancelButton != undefined) {
							cancelButton.click();
						}
						else {
							options.cancelled!();
						}
					}
					else {
						const continueButton = that.selectElement<HTMLButtonElement>(".modal-footer-buttons .continueButton");
						if (continueButton != undefined) {
							continueButton.click();
						}
						else {
							await options.confirmedAsync!();
						}
					}
				}
			};
	
			this.selectElements(".modal-invalid-footer-buttons .continueButton, .modal-header.invalid-content .btn-close")
				.forEach(b => b.addEventListener("click", e => {
					e.preventDefault();
					options.cancelled!();
				}));
	
			if (!hasCustomHeader && options.allowKeyboardDismiss != false) {
				this.selectElement<HTMLButtonElement>(".modal-header.valid-content .btn-close")?.addEventListener("click", closeButtonClickAsync);
			}
	
			if (!hasCustomButtons) {
				let button = this.selectElement<HTMLButtonElement>(".modal-footer-buttons .cancelButton")
				button?.addEventListener("click", e => {
					e.preventDefault();
					options.cancelled!();
				});

				button = this.selectElement<HTMLButtonElement>(".modal-footer-buttons .continueButton")
				button?.addEventListener("click", async e => {
					e.preventDefault();
					await options.confirmedAsync!();
				});
			}
	
			this.el.addEventListener("shown.bs.modal", () => {
				that.el
					.querySelectorAll(".modal-footer-buttons, .modal-invalid-footer-buttons")
					.forEach(e => e.classList.remove("d-none"));
				resolve(true);
			});
			this.el.addEventListener("hide.bs.modal", async e => {
				// Triggered when ESC is clicked (when programmatically closed, this isn't triggered)
				// After modal is shown, resolve promise to caller to know modal is fully displayed
				if (KatApps.HelpTips.hideVisiblePopover()) {
					e.preventDefault();
					return;
				}
				await closeButtonClickAsync(e);
			})
	
			const modalBS5 = new bootstrap.Modal(this.el);
			modalBS5.show(options.triggerLink);
	
			if (options.triggerLink != undefined) {
				options.triggerLink.removeAttribute("disabled");
				options.triggerLink.classList.remove("disabled", "kaModalInit");
				document.querySelector("body")!.classList.remove("kaModalInit");
			}
	
			this.options.hostApplication!.unblockUI();
		});
	}

	public async navigateAsync(navigationId: string, options?: INavigationOptions) {
		if (options?.inputs != undefined) {
			const cachingKey =
				navigationId == undefined // global
					? "navigationInputs:global"
					: options.persistInputs ?? false
						? "navigationInputs:" + navigationId.split("?")[0] + ":" + (this.options.userIdHash ?? "Everyone")
						: "navigationInputs:" + navigationId.split("?")[0];

			// Shouldn't be previous inputs b/c didn't implement setNavigationInputs method
			/*
			const currentInputs = KatApps.Utils.getSessionItem<ICalculationInputs>(this.options, cachingKey);
			KatApps.Utils.extend(currentInputs, inputs);
			KatApps.Utils.setSessionItem(this.options, cachingKey, currentInputs);
			*/
			KatApps.Utils.setSessionItem(this.options, cachingKey, options.inputs);
		}

		await this.options.katAppNavigate?.(navigationId);
	}

	public async calculateAsync(
		customInputs?: ICalculationInputs,
		processResults = true,
		calcEngines?: ICalcEngine[],
		allowLogging = true
	): Promise<ITabDef[] | void> {
		// First calculation done before application is even mounted, just get the results setup
		const isConfigureUICalculation = customInputs?._iConfigureUI === "1";
		if (!isConfigureUICalculation) {
			this.traceStart = this.traceLast = new Date();
		}
		 KatApps.Utils.trace(this, "KatApp", "calculateAsync", `Start: ${(calcEngines ?? this.calcEngines).map( c => c.name ).join(", ")}`, TraceVerbosity.Detailed);

		try {
			const apiUrl = this.getApiUrl(this.options.calculationUrl);
			const serviceUrl = /* this.options.registerDataWithService 
				? this.options.{what url should this be} 
				: */ apiUrl.url;

			const getSubmitApiConfigurationResults = await this.getSubmitApiConfigurationAsync(
				async submitApiOptions => {
					await this.triggerEventAsync("updateApiOptions", submitApiOptions, apiUrl.endpoint);
				},
				customInputs,
				true
			);

			getSubmitApiConfigurationResults.configuration.allowLogging = allowLogging;

			if (!processResults) {
				const calculationResults = await KatApps.Calculation.calculateAsync(
					this,
					serviceUrl,
					calcEngines ?? this.calcEngines,
					getSubmitApiConfigurationResults.inputs,
					getSubmitApiConfigurationResults.configuration as ISubmitApiConfiguration
				);

				return this.toTabDefs(
					calculationResults.flatMap(r => r.TabDefs.map(t => ({ CalcEngine: r.CalcEngine, TabDef: t })))
				) as Array<ITabDef>;
			}
			else {
				this.isCalculating = true;
				this.blockUI();
				this.state.errors = [];
				this.state.warnings = [];
				this.lastCalculation = undefined;

				try {
					const inputs = getSubmitApiConfigurationResults.inputs;
					const submitApiConfiguration = getSubmitApiConfigurationResults.configuration;
					delete inputs._iConfigureUI;

					const calcStartResult = await this.triggerEventAsync("calculateStart", submitApiConfiguration) ?? true;
					if (!calcStartResult) {
						return;
					}

					const calculationResults = await KatApps.Calculation.calculateAsync(
						this,
						serviceUrl,
						isConfigureUICalculation
							? this.calcEngines.filter(c => c.allowConfigureUi)
							: this.calcEngines,
						inputs,
						submitApiConfiguration as ISubmitApiConfiguration
					);

					const results = this.toTabDefs(
						calculationResults.flatMap(r => r.TabDefs.map(t => ({ CalcEngine: r.CalcEngine, TabDef: t })))
					);

					await this.cacheInputsAsync(inputs);

					await this.triggerEventAsync("resultsProcessing", results, inputs, submitApiConfiguration);

					await this.processResultsAsync(results, getSubmitApiConfigurationResults);

					this.lastCalculation = {
						inputs: inputs,
						results: results as Array<ITabDef>,
						diagnostics: calculationResults.find(r => r.Diagnostics != undefined)
							? calculationResults.flatMap(r => r.Diagnostics)
							: undefined,
						configuration: submitApiConfiguration as ISubmitApiConfiguration
					};

					// If configure UI, Vue not mounted yet, so don't trigger this until after mounting
					if (!isConfigureUICalculation) {
						// Sometimes KAMLs call a iConfigureUI calc at different intervals (outside of the normal 'mount' flow) and if iConfigureUI=1, 
						// but I'm not in the 'mountAsync configureUI calc', then I want to trigger the event
						if (inputs.iConfigureUI == "1") {
							await this.triggerEventAsync("configureUICalculation", this.lastCalculation);
						}
						await this.triggerEventAsync("calculation", this.lastCalculation);
					}

					this.state.needsCalculation = false;
					this.options.debug.traceVerbosity = this.nextCalculation.originalVerbosity;
					this.nextCalculation = undefined;
					return this.lastCalculation.results;
				}
				catch (error) {
					if (!(error instanceof ApiError)) {
						this.addUnexpectedError(error);

						if (!isConfigureUICalculation) {
							// TODO: Check exception.detail: result.startsWith("<!DOCTYPE") and show diff error?
							 KatApps.Utils.trace(this, "KatApp", "calculateAsync", `Exception: ${(error instanceof Error ? error.message : error + "")}`, TraceVerbosity.None, error);
						}
					}

					await this.triggerEventAsync("calculationErrors", "SubmitCalculation" + (isConfigureUICalculation ? ".ConfigureUI" : ""), error instanceof Error ? error : undefined);
				}
				finally {
					// If configure UI, Vue not mounted yet, so don't trigger this until after mounting
					if (!isConfigureUICalculation) {
						await this.triggerEventAsync("calculateEnd");
					}
					delete this.state.inputs.iInputTrigger;
					this.isCalculating = false;
					this.unblockUI();
				}
			}
		} finally {
			 KatApps.Utils.trace(this, "KatApp", "calculateAsync", `Complete: ${(calcEngines ?? this.calcEngines).map(c => c.name).join(", ")}`, TraceVerbosity.Detailed);
		}
	}

	public async notifyAsync(from: KatApp, name: string, information?: IStringAnyIndexer) {
		await this.triggerEventAsync("notification", name, information, from);
	}

	public checkValidity(): boolean {
		let isValid = true;
		this.selectElements("input").forEach(e => {
			if (!(e as HTMLInputElement).checkValidity()) {
				isValid = false;
			}
		});
		return isValid;
	}

	public async apiAsync(endpoint: string, apiOptions?: IApiOptions, trigger?: HTMLElement, calculationSubmitApiConfiguration?: ISubmitApiOptions): Promise<IStringAnyIndexer | undefined> {
		// calculationSubmitApiConfiguration is only passed internally, when apiAsync is called within the calculation pipeline and there is already a configuration determined

		if (!(apiOptions?.skipValidityCheck ?? false) && !this.checkValidity()) {
			/* 
				Issue with reportValidity() not displaying if scroll needed
				https://stackoverflow.com/questions/69015407/html5-form-validation-message-doesnt-show-when-scroll-behaviour-is-set-to-smoo
				https://github.com/gocodebox/lifterlms/issues/2206
				https://stackoverflow.com/questions/57846647/how-can-i-get-the-html5-validation-message-to-show-up-without-scrolling

				Currently, just catching invalid event on inputs and putting into state.errors.
			*/
			throw new ValidityError();
		}

		if (!this.el.hasAttribute("ka-cloak")) {
			this.traceStart = this.traceLast = new Date();
		}

		apiOptions = apiOptions ?? {};

		const isDownload = apiOptions.isDownload ?? false;

		this.blockUI();
		this.state.errors = [];
		this.state.warnings = [];

		let successResponse: IStringAnyIndexer | Blob | undefined = undefined;
		let errorResponse: IApiErrorResponse | undefined = undefined;
		const apiUrl = this.getApiUrl(endpoint);

		try {
			const getSubmitApiConfigurationResults =
				calculationSubmitApiConfiguration ??
				await this.getSubmitApiConfigurationAsync(
					async submitApiOptions => {
						await this.triggerEventAsync("updateApiOptions", submitApiOptions, apiUrl.endpoint);
					},
					apiOptions.calculationInputs,
					false
				);

			const calcEngine = this.calcEngines.find(c => !c.manualResult);

			const inputPropertiesToSkip = ["tables", "getNumber", "getOptionText"];
			const optionPropertiesToSkip = ["manualResults", "manualResultsEndpoint", "resourceStrings", "resourceStringsEndpoint", "modalAppOptions", "hostApplication", "relativePathTemplates", "handlers", "nextCalculation", "katAppNavigate", "decryptCache", "encryptCache"];

			const submitData: ISubmitApiData = {
				inputs: KatApps.Utils.clone(getSubmitApiConfigurationResults.inputs ?? {}, (k, v) => inputPropertiesToSkip.indexOf(k) > -1 ? undefined : v?.toString()),
				inputTables: getSubmitApiConfigurationResults.inputs.tables?.map<ICalculationInputTable>(t => ({ name: t.name, rows: t.rows })),
				apiParameters: apiOptions.apiParameters,
				configuration: KatApps.Utils.extend<ISubmitApiConfiguration>(
					KatApps.Utils.clone(this.options, (k, v) => optionPropertiesToSkip.indexOf(k) > -1 ? undefined : v),
					apiOptions.calculationInputs != undefined ? { inputs: apiOptions.calculationInputs } : undefined,
                    // Endpoints only ever use first calc engine...so reset calcEngines property in case kaml
                    // changed calcEngine in the onCalculationOptions.
					calcEngine != undefined
						? {
							calcEngines: [
								{
									name: calcEngine.name,
									inputTab: calcEngine.inputTab,
									resultTabs: calcEngine.resultTabs,
									pipeline: calcEngine.pipeline
								}
							]
						} as ISubmitApiConfiguration
						: { calcEngines: [] as Array<ISubmitCalculationCalcEngine> } as ISubmitApiConfiguration,
					getSubmitApiConfigurationResults.configuration
				)
			};

			const startResult = await this.triggerEventAsync("apiStart", apiUrl.endpoint, submitData, trigger, apiOptions);
			if (typeof startResult == "boolean" && !startResult) {
				return undefined;
			}

			const formData = new FormData();
			formData.append("inputs", JSON.stringify(submitData.inputs));
			if (submitData.inputTables != undefined) {
				formData.append("inputTables", JSON.stringify(submitData.inputTables));
			}
			if (submitData.apiParameters != undefined) {
				formData.append("apiParameters", JSON.stringify(submitData.apiParameters));
			}
			formData.append("configuration", JSON.stringify(submitData.configuration));
			
			if (apiOptions.files != undefined) {
				Array.from(apiOptions.files)
					.forEach((f,i) => {
						formData.append("postedFiles[" + i + "]", f);
					});
			}

            const response = await fetch(apiUrl.url, {
                method: "POST",
                body: formData
            });
    
			if (!response.ok) {
				throw await response.json();
            }
    
			let successResponse = isDownload ? await response.blob() : undefined;

			if (!isDownload) {
				const responseText = await response.text();
				successResponse = JSON.parse(responseText == "" ? "{}" : responseText);
			}
				
            if (isDownload) {
                const blob = successResponse!;
                let filename = "Download.pdf";
                const disposition = response.headers.get('Content-Disposition');
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    filename = disposition.split('filename=')[1].split(';')[0].replace(/"/g, '');
                }
                this.downloadBlob(blob);
            }
			else if ( apiOptions.calculateOnSuccess != undefined ) {
				const calculateOnSuccess = (typeof apiOptions.calculateOnSuccess == 'boolean') ? apiOptions.calculateOnSuccess : true;
				const calculationInputs = (typeof apiOptions.calculateOnSuccess == 'object') ? apiOptions.calculateOnSuccess : undefined;
				if (calculateOnSuccess) {
					await this.calculateAsync(calculationInputs, true, undefined, false);
				}
			}

			if (!isDownload) {
				await this.triggerEventAsync("apiComplete", apiUrl.endpoint, successResponse, trigger, apiOptions);
				return successResponse;
			}
		} catch (e) {
			errorResponse = e as IApiErrorResponse ?? {};

			if (errorResponse.errors != undefined) {
				for (var id in errorResponse.errors) {
					this.state.errors.push({ id: id, text: this.getLocalizedString(errorResponse.errors[id][0])!, dependsOn: errorResponse.errorsDependsOn?.[id] });
				}
			}

			if (errorResponse.warnings != undefined) {
				for (var id in errorResponse.warnings) {
                    this.state.warnings.push({ id: id, text: this.getLocalizedString(errorResponse.warnings[id][0])!, dependsOn: errorResponse.warningsDependsOn?.[id] });
				}
			}

			if (this.state.errors.length == 0 && this.state.warnings.length == 0) {
				this.addUnexpectedError(errorResponse);
			}

			 KatApps.Utils.trace(this, "KatApp", "apiAsync", "Unable to process " + endpoint, TraceVerbosity.None, errorResponse.errors != undefined ? [errorResponse, this.state.errors] : errorResponse);

			await this.triggerEventAsync("apiFailed", apiUrl.endpoint, errorResponse, trigger, apiOptions);

			throw new ApiError("Unable to complete API submitted to " + endpoint, e instanceof Error ? e : undefined, errorResponse);
		}
		finally {
			// Remove server side only locations, but leave client side ones for 'next' client calculation
			this.nextCalculation.saveLocations = this.nextCalculation.saveLocations.filter(l => !l.serverSideOnly);
			// this.triggerEvent("onActionComplete", endpoint, apiOptions, trigger);
			this.unblockUI();
		}
	}
	
	private addUnexpectedError(errorResponse: any): void {
		this.state.errors.push(
			errorResponse.requestId != undefined
				? { id: "System", text: this.getLocalizedString("KatApps.AddUnexpectedErrorWithRequestId", errorResponse, "We apologize for the inconvenience, but we are unable to process your request at this time. The system has recorded technical details of the issue and our engineers are working on a solution.  Please contact Customer Service and provide the following Request ID: {{requestId}}")! }
				: { id: "System", text: this.getLocalizedString("KatApps.AddUnexpectedError", undefined, "We apologize for the inconvenience, but we are unable to process your request at this time. The system has recorded technical details of the issue and our engineers are working on a solution.")! }
		);
	}

	private downloadBlob(blob: Blob): void {
		const tempEl = document.createElement("a");
		tempEl.classList.add("d-none");
		const url = window.URL.createObjectURL(blob);
		tempEl.href = url;
		tempEl.target = "_blank";
		tempEl.click();
		// Android Webviews throw when revokeObjectURL is called
		// window.URL.revokeObjectURL(url);
	}

	private getApiUrl(endpoint: string): { url: string, endpoint: string } {
		const urlParts = this.options.calculationUrl.split("?");
		const endpointParts = endpoint.split("?");

		var qsAnchored = KatApps.Utils.parseQueryString(this.options.anchoredQueryStrings ?? (urlParts.length == 2 ? urlParts[1] : undefined));
		var qsEndpoint = KatApps.Utils.parseQueryString(endpointParts.length == 2 ? endpointParts[1] : undefined);
		var qsUrl = KatApps.Utils.extend<IStringIndexer<string>>(qsAnchored, qsEndpoint, { katapp: this.selector ?? this.id });


		let url = endpointParts[0];
		Object.keys(qsUrl).forEach((key, index) => {
			url += `${(index == 0 ? "?" : "&")}${key}=${qsUrl[key]}`;
		});

		if (!url.startsWith("api/")) {
			url = "api/" + url;
		}

		return {
			url: this.options.baseUrl ? this.options.baseUrl + url : url,
			endpoint: url.split("?")[0].substring(4)
		};
	}

	private async processDomElementsAsync() {
		// console.log(this.selector + " domUpdated: " + this.domElementQueue.length);
		const addUiBlockerWrapper = function (el: HTMLElement): void {
			if (el.parentElement != undefined) {
				el.parentElement.classList.add("ui-blocker-wrapper");
			}
		};

		for (const el of this.domElementQueue) {
			// Default markup processing...think about creating a public method that triggers calculation
			// in case KAMLs have code that needs to run inside calculation handler? Or create another
			// event that is called from this new public method AND from calculation workflow and then
			// KAML could put code in there...b/c this isn't really 'calculation' if they just call
			// 'processModel'
			const preventDefault = (e: Event) => e.preventDefault();
			
			this.selectElements("a[href='#']")
				.forEach(a => {
					a.removeEventListener("click", preventDefault);
					a.addEventListener("click", preventDefault);
				});

			KatApps.HelpTips.processHelpTips(el);

			const reflowElementCharts = (el: HTMLElement) => {
				el.querySelectorAll<HTMLElement>("[data-highcharts-chart]").forEach(c => {
					const chart = Highcharts.charts[+c.getAttribute("data-highcharts-chart")!];
					chart?.reflow();
				});
			};
			reflowElementCharts(el);

			// Had to move this logic here from Highcharts directive b/c when the directive's
			// effect() was triggering, if the highchart was inside a v-if (especially, maybe even
			// normal rendering) it wasn't yet connected to the DOM (isConnect = false), so trying to 
			// walk up the ancestor tree always failed.  Putting it here was only way to ensure that
			// it was injected in the dom and would correctly work.
			const reflowTabCharts = (e: Event) => {
				var tab = e.target as HTMLElement;
				var pane = this.selectElement(tab.getAttribute("data-bs-target")!)!;
				reflowElementCharts(pane);
			};
			
			el.querySelectorAll<HTMLElement>("[data-highcharts-chart]").forEach(c => {
				// if inside tabs, need to reflow chart when tab is shown
				const navItemId = this.closestElement(c, ".tab-pane, [role='tabpanel']")?.getAttribute("aria-labelledby");
				if (navItemId != undefined) {
					const navItem = this.selectElement("#" + navItemId);
					navItem?.removeEventListener('shown.bs.tab', reflowTabCharts);
					navItem?.addEventListener('shown.bs.tab', reflowTabCharts);
				}
			});

			if (el.classList.contains("ui-blocker")) {
				addUiBlockerWrapper(el);
			}
			else {
				el.querySelectorAll<HTMLElement>(".ui-blocker").forEach(e => addUiBlockerWrapper(e));
			}
		}

		const elementsProcessed = [...this.domElementQueue];
		this.domElementQueue.length = 0;
		this.domElementQueued = false;
		await this.triggerEventAsync("domUpdated", elementsProcessed);
	}

	/* Not sure what this is or if I need this
	public async nextDomUpdate(): Promise<void> {
		await PetiteVue.nextTick();
	}
	*/

	public getInputValue(name: string, allowDisabled = false): string | undefined {
		const inputs = this.selectElements<HTMLInputElement>("." + name);

		if (inputs.length == 0) return undefined;

		if (!allowDisabled && inputs[0].disabled) return undefined;

		if (inputs.length > 1 && inputs[0].getAttribute("type") == "radio") {
			const v = inputs.find(o => o.checked)?.value;
			return v != undefined ? v + '' : undefined;
		}

		if (inputs[0].classList.contains("checkbox-list")) {
			const v = Array.from(inputs[0].querySelectorAll<HTMLInputElement>("input"))
				.filter(c => c.checked)
				.map(c => c.value)
				.join(",");
			return ( v ?? "" ) != "" ? v : undefined;
		}

		if (inputs[0].getAttribute("type") == "checkbox") {
			return inputs[0].checked ? "1" : "0";
		}

		if (inputs[0].getAttribute("type") == "file") {
			const files = inputs[0].files;
			const numFiles = files?.length ?? 1;
			return numFiles > 1 ? numFiles + ' files selected' : inputs[0].value.replace(/\\/g, '/').replace(/.*\//, ''); // remove c:\fakepath
		}

		return inputs[0].value;
	}

	public setInputValue(name: string, value: string | undefined, calculate = false) : Array<HTMLInputElement> | undefined {

		if (value == undefined) {
			delete this.state.inputs[name];
		}
		else {
			this.state.inputs[name] = typeof value == 'boolean'
				? (value ? "1" : "0") // support true/false for checkboxes
				: value;
		}

		let inputs = this.selectElements<HTMLInputElement>("." + name);

		if (inputs.length > 0) {
			const isCheckboxList = inputs[0].classList.contains("checkbox-list");

			if (inputs.length > 0 && inputs[0].getAttribute("type") == "radio") {
				inputs.forEach(i => i.checked = (i.value == value));
			}
			else if (isCheckboxList) {
				const values = value?.split(",")

				inputs = Array.from(inputs[0].querySelectorAll<HTMLInputElement>("input"));

				inputs.forEach(i => {
					i.checked = (values != undefined && values.indexOf(i.value) > -1);
				});
			}
			else if (inputs[0].getAttribute("type") == "checkbox") {
				inputs[0].checked = typeof value == 'boolean' ? value : value == "1";
			}
			else {
				inputs[0].value = value ?? "";
			}


			if (inputs[0].getAttribute("type") == "range") {
				inputs[0].dispatchEvent(new Event('rangeset.ka'));
			}
			if (calculate) {
				const target = inputs[0];
				target.dispatchEvent(new Event('change'));
			}
		}

		return inputs;
	}

	public getInputs(customInputs?: ICalculationInputs): ICalculationInputs {
		const inputs =
			KatApps.Utils.extend<ICalculationInputs>({},
				this.state.inputs,
				customInputs
			);
		
		delete inputs.getNumber;
		delete inputs.getOptionText;
		return inputs;
	}

	private getKatAppId<T extends HTMLElement>(el: T): string | undefined {
		if (el.hasAttribute("ka-id")) return el.getAttribute("ka-id") ?? undefined;

		let p: HTMLElement | null = el;
		while ((p = p.parentElement) && (p as Node) !== document) {
			if (p.hasAttribute("ka-id")) {
				return p.getAttribute("ka-id")!;
			}
		}

		return undefined;
	}

	public on<T extends HTMLElement>(selector: string, events: string, handler: (e: Event) => void, context?: HTMLElement): KatAppEventFluentApi<T> {
		const eventFluentApi = new KatAppEventFluentApi<T>(this, this.selectElements<T>(selector, context));
		eventFluentApi.on(events, handler);
		return eventFluentApi;
	}

 	public off<T extends HTMLElement>(selector: string, events: string, context?: HTMLElement): KatAppEventFluentApi<T> {
		const eventFluentApi = new KatAppEventFluentApi<T>(this, this.selectElements<T>(selector, context));
		eventFluentApi.off(events);
		return eventFluentApi;
	}

	private inputSelectorRegex = /:input([\w\s.:#=\[\]'^$*|~]*)(?=(,|$))/g;
	private replaceInputSelector(selector: string): string {
		return selector.replace(this.inputSelectorRegex, (match, capturedSelectors) => {
			// Split the captured selectors into individual parts (if any)
			const inputTypes = ['input', 'textarea', 'select', 'button'];
			// Apply the captured selectors to each input type
			return inputTypes.map(type => `${type}${capturedSelectors}`).join(', ');
		});
	}

	public selectElement<T extends HTMLElement>(selector: string, context?: HTMLElement): T | undefined {
		const container = context ?? this.el;	
		const result = container.querySelector<T>(this.replaceInputSelector(selector)) ?? undefined;

		if ( result == undefined || context != undefined ) return result;

		var appId = this.getKatAppId(container);
		return this.getKatAppId(result) == appId ? result : undefined;
	}

	public selectElements<T extends HTMLElement>(selector: string, context?: HTMLElement): Array<T> {
		const container = context ?? this.el;	
		const result = Array.from(container.querySelectorAll<T>(this.replaceInputSelector(selector)));

		if (context != undefined) return result;

		var appId = this.getKatAppId(container);
		return result.filter(e => this.getKatAppId(e) == appId);
	}

	public closestElement<T extends HTMLElement>(element: HTMLElement, selector: string): T | undefined {
		const c = element.closest<T>(selector) ?? undefined;
		const cAppId = c != undefined ? this.getKatAppId(c) : undefined;
		return cAppId == this.id ? c : undefined;
	}

	private getResourceString(key: string): string | undefined {
		const currentUICulture = this.options.currentUICulture ?? "en-us";
		const defaultRegionStrings = this.options.resourceStrings?.["en-us"];
		const defaultLanguageStrings = this.options.resourceStrings?.["en"];
		const cultureStrings = this.options.resourceStrings?.[currentUICulture];
		const baseCultureStrings = this.options.resourceStrings?.[currentUICulture.split("-")[0]];

		const cultureResource =
			cultureStrings?.[key] ??
			baseCultureStrings?.[key];
		const resource =
			cultureResource ??
			defaultRegionStrings?.[key] ??
			defaultLanguageStrings?.[key];

		if (resource == undefined) {
			this.missingResources.push(key);
		}
		else if (cultureResource == undefined) {
			this.missingLanguageResources.push(key);
		}
	
		return typeof resource == "object" ? ( resource as { text: string } ).text : resource;;
	}
	
	public getLocalizedString(key: string | undefined, formatObject?: IStringIndexer<string>, defaultValue?: string): string | undefined {
		// OBSOLETE ?? - Would like to remove this...see if there are ever any << >> left in project after resource strings are implemented
		key = key?.replaceAll("<<", "{{").replaceAll(">>", "}}");

		if (key == undefined) return defaultValue;
		
		if (key.startsWith("{") && key.endsWith("}")) {
			formatObject = new Function(`{return (${key as string})}`)();
			key = formatObject!.key;
		}
		
		const hasFormatObject = formatObject != null && Object.keys(formatObject).some(k => k != "key");

		let resourceString = this.getResourceString(key);
		const resourceDefault = ( arguments.length == 3 ? defaultValue : key );
		
		// Support for strings/keys in format of template^arg1^arg2^arg3 where template has {0}, {1} and {2} placeholders
		if (resourceString == undefined && defaultValue == undefined && key.indexOf("^") > -1) {
			const keyParts = key.split("^");
			const templateString = this.getResourceString(keyParts[0]) ?? keyParts[0];
			const templateArgs: Array<string | Date | Number> = keyParts.slice(1);

			const regex = /\{(\d+):([^{}]+)\}/g;
			const dateRegex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:T.*)?/;
			const numberRegex = /^-?\d+(\.\d+)?$/;
			const matches = templateString.matchAll(regex);
			
			for (const match of matches) {
				const index = +match[1];
				
				const arg = templateArgs[index] as string;
				const dateMatch = arg.match(dateRegex);
				if (dateMatch != undefined) {
					templateArgs[index] = new Date(parseInt(dateMatch.groups!.year), parseInt(dateMatch.groups!.month) - 1, parseInt(dateMatch.groups!.day));
				}
                else if (numberRegex.test(arg)) {
                    const number = parseFloat(arg);
                    if (!isNaN(number)) {
                        templateArgs[index] = number;
                    }
                }
			}
			
            resourceString = String.localeFormat(templateString, ...templateArgs);
		}
		
		const resource = resourceString ?? resourceDefault;

		if (resource == undefined) return undefined;
		
		return hasFormatObject
			? String.formatTokens(resource, (formatObject?.keyValueObject as unknown as IStringIndexer<string>) ?? formatObject)
			: resource;
	}

	public getTemplateContent(name: string): DocumentFragment {
		const templateId = this.getTemplateId(name);
		return (document.querySelector(templateId!) as HTMLTemplateElement)!.content;
	}

	private getTemplateId(name: string): string | undefined {
		let templateId: string | undefined;

		// Find template by precedence
		for (let i = 0; i < this.viewTemplates!.length; i++) {
			const viewTemplate = this.viewTemplates![i];
			const tid = "#" + name + "_" + viewTemplate.replace(/\//g, "_");
			if (document.querySelector(tid) != undefined) {
				templateId = tid;
				break;
			}
		}

		if (templateId == undefined && this.options.hostApplication != undefined) {
			templateId = ( this.options.hostApplication as KatApp ).getTemplateId(name);
		}

		if (templateId == undefined) {
			 KatApps.Utils.trace(this, "KatApp", "getTemplateId", `Unable to find template: ${name}.`, TraceVerbosity.Normal);
		}

		return templateId;
	}

	private get nextCalculation(): INextCalculation {
		let app: IKatApp = this;

		// Always get the root application
		while (app.options.hostApplication != undefined) {
			app = app.options.hostApplication;
		}

		const debugNext: INextCalculation =
			KatApps.Utils.getSessionItem<INextCalculation>(app.options, "debugNext:" + app.selector) ??
			{ saveLocations: [], expireCache: false, trace: false, originalVerbosity: app.options.debug.traceVerbosity } as INextCalculation;

		return debugNext;
	}
	private set nextCalculation(value: INextCalculation | undefined) {
		let app: IKatApp = this;

		// Always set in the root application
		while (app.options.hostApplication != undefined) {
			app = app.options.hostApplication;
		}

		const cacheKey = "debugNext:" + app.selector;

		if (value == undefined) {
			KatApps.Utils.removeSessionItem(app.options, cacheKey);
		}
		else {
			KatApps.Utils.setSessionItem(app.options, cacheKey, value);
		}
	}

	public debugNext(saveLocations?: string | boolean, serverSideOnly?: boolean, trace?: boolean, expireCache?: boolean ) {
		const debugNext = this.nextCalculation;

		if (typeof (saveLocations) == "boolean") {
			if (!saveLocations) {
				debugNext.saveLocations = [];
			}
		}
		else if ((saveLocations ?? "") != "") {
			
			const locations = saveLocations!.split(",").map(l => l.trim());

			debugNext.saveLocations = [
				...debugNext.saveLocations.filter(l => locations.indexOf(l.location) == -1),
				...locations.map(l => ({ location: l, serverSideOnly: serverSideOnly ?? false }))
			];
		}

		debugNext.trace = trace ?? false;
		if (debugNext.trace) {
			this.options.debug.traceVerbosity = TraceVerbosity.Detailed as unknown as ITraceVerbosity;
		}
		debugNext.expireCache = expireCache ?? false;
		this.nextCalculation = debugNext;
	}

	public blockUI(): void {
		this.uiBlockCount++;
		this.state.uiBlocked = true;
	}
	public unblockUI(): void {
		this.uiBlockCount--;

		if (this.uiBlockCount <= 0) {
			this.uiBlockCount = 0;
			this.state.uiBlocked = false;
		}
	}

	public allowCalculation(ceKey: string, enabled: boolean): void {
		const ce = this.calcEngines.find(c => c.key == ceKey);
		if (ce != undefined) {
			ce.enabled = enabled;
		}
	}

	// public so HelpTips can call when needed
	public cloneOptions(includeManualResults: boolean): IKatAppOptions {
		const propertiesToSkip = ["handlers", "view", "content", "modalAppOptions", "hostApplication"].concat(includeManualResults ? [] : ["manualResults", "manualResultsEndpoint"]);
		return KatApps.Utils.clone<IKatAppOptions>( this.options, (k, v) => propertiesToSkip.indexOf(k) > -1 ? undefined : v );
	}
	
	public getCloneHostSetting(el: HTMLElement): string | boolean {
		let cloneHost: boolean | string = el.hasAttribute("v-pre");

		if (cloneHost) {
			const hostName = el.getAttribute("v-pre") ?? "";
			if (hostName != "") {
				cloneHost = hostName;
			}
		}

		return cloneHost;
	}

	public async showModalAsync(options: IModalOptions, triggerLink?: HTMLElement): Promise<IModalResponse> {
		let cloneHost: boolean | string = false;

		let selectorContent: HTMLElement | undefined;

		if (options.contentSelector != undefined) {
			await PetiteVue.nextTick(); // Just in case kaml js set property that would trigger updating this content

			const selectContent = this.selectElement(options.contentSelector); // .not("template " + options.contentSelector);

			if (selectContent == undefined) {
				throw new Error(`The content selector (${options.contentSelector}) did not return any content.`);
			}

			cloneHost = this.getCloneHostSetting(selectContent);
			// Need to clone so DOM events remain in place
			selectorContent = selectContent.cloneWithEvents();
		}

		if (selectorContent == undefined && options.content == undefined && options.view == undefined) {
			throw new Error("You must provide content or viewId when using showModal.");
		}
		if (document.querySelector(".kaModal") != undefined) {
			throw new Error("You can not use the showModalAsync method if you have markup on the page already containing the class kaModal.");
		}

		this.blockUI();

		if (triggerLink != undefined) {
			triggerLink.setAttribute("disabled", "true");
			triggerLink.classList.add("disabled", "kaModalInit");
			document.querySelector("body")!.classList.add("kaModalInit");
		}

		try {
			const previousModalApp = KatApp.get(".kaModal");
			if (previousModalApp != undefined) {
				KatApp.remove(previousModalApp);
			}

			return new Promise<IModalResponse>(async (resolve, reject) => {
				const propertiesToSkip = ["content", "view"];
				// Omitting properties that will be picked up from the .extend<> below
				const modalOptions: Omit<IKatAppOptions, 'debug' | 'dataGroup' | 'calculationUrl' | 'katDataStoreUrl' | 'kamlVerifyUrl' | 'inputCaching' | 'canProcessExternalHelpTips' | 'encryptCache' | 'decryptCache'> = {
					view: options.view,
					content: selectorContent ?? options.content,
					currentPage: options.view ?? this.options.currentPage,
					// If modal is launching from a popover, the popover CANNOT be the hostApplication because it
					// is removed, so I have to use passed in host-application or current hostApplication.
					hostApplication: this.selector.startsWith( "#popover" ) ? this.options.hostApplication : this,
					cloneHost: cloneHost,
					modalAppOptions: KatApps.Utils.extend<IModalAppOptions>(
						{ promise: { resolve, reject }, triggerLink: triggerLink },
						KatApps.Utils.clone(options, (k, v) => propertiesToSkip.indexOf(k) > -1 ? undefined : v)
					),
					inputs: {
						iModalApplication: "1"
					}
				};
	
				const modalAppOptions = KatApps.Utils.extend<IKatAppOptions>(
					( modalOptions.hostApplication as KatApp ).cloneOptions(modalOptions.content == undefined || cloneHost !== false ),
					modalOptions,
					options.inputs != undefined ? { inputs: options.inputs } : undefined
				);
	
				if (modalAppOptions.anchoredQueryStrings != undefined && modalAppOptions.inputs != undefined) {
					modalAppOptions.anchoredQueryStrings = KatApps.Utils.generateQueryString(
						KatApps.Utils.parseQueryString(modalAppOptions.anchoredQueryStrings),
						// If showing modal and the url has an input with same name as input passed in, then don't include it...
						key => !key.startsWith("ki-") || modalAppOptions.inputs![ 'i' + key.split('-').slice(1).map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join("") ] == undefined
					);
				}
	
				delete modalAppOptions.inputs!.iNestedApplication;
				await KatApp.createAppAsync(".kaModal", modalAppOptions);
			});
		} catch (e) {
			this.unblockUI();

			if (triggerLink != undefined) {
				triggerLink.removeAttribute("disabled");
				triggerLink.classList.remove("disabled", "kaModalInit");
				document.querySelector("body")!.classList.remove("kaModalInit");
			}

			throw e;
		}
	}

	private async cacheInputsAsync(inputs: ICalculationInputs) {
		if (this.options.inputCaching) {
			const inputCachingKey = "cachedInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "EveryOne");
			const cachedInputs = KatApps.Utils.clone<ICalculationInputs>(inputs);
			await this.triggerEventAsync("inputsCached", cachedInputs);
			KatApps.Utils.setSessionItem(this.options, inputCachingKey, cachedInputs);
		}
    }

	private async getSubmitApiConfigurationAsync(triggerEventAsync: (submitApiOptions: ISubmitApiOptions) => Promise<void>, customInputs?: ICalculationInputs, isCalculation: boolean = false): Promise<ISubmitApiOptions> {
		const currentInputs = this.getInputs(customInputs);

		if (currentInputs.tables == undefined) {
			currentInputs.tables = [];
		}

		const submitApiOptions: ISubmitApiOptions = {
			inputs: currentInputs,
			configuration: {},
			isCalculation: isCalculation
		};
		
		await triggerEventAsync(submitApiOptions);

		const currentOptions = this.options;

		// CalcEngines will be assigned later
		const submitConfiguration: Omit<ISubmitApiConfiguration, 'calcEngines'> = {
			token: /* (currentOptions.registerDataWithService ?? true) ? currentOptions.registeredToken : */ undefined,
			nextCalculation: this.nextCalculation,
			// Should we be using JWT for AuthID, AdminAuthID, Client?
			authID: /* currentOptions.data?.AuthID ?? */ "NODATA",
			adminAuthID: undefined,
			client: currentOptions.dataGroup ?? "KatApp",
			testCE: currentOptions.debug?.useTestCalcEngine ?? false,
			currentPage: currentOptions.currentPage ?? "KatApp:" + (currentOptions.view ?? "UnknownView"),
			requestIP: currentOptions.requestIP ?? "1.1.1.1",
			currentCulture: currentOptions.currentCulture ?? "en-US",
			currentUICulture: currentOptions.currentUICulture ?? "en-US",
			environment: currentOptions.environment ?? "EW.PROD",
			// RefreshCalcEngine: this.nextCalculation.expireCache || (currentOptions.debug?.refreshCalcEngine ?? false),
			allowLogging: true // default, calculateAsync will set this appropriately
		};

		return {
			inputs: submitApiOptions.inputs,
			configuration: KatApps.Utils.extend<ISubmitApiConfiguration>(
				submitConfiguration,
				submitApiOptions.configuration
			),
			isCalculation: isCalculation
		};
	}

	private getCeName(name: string) {
		return name?.split(".")[0].replace("_Test", "") ?? "";
	}

	private toCalcEngines(manualResults: IManualTabDef[] | undefined): ICalcEngine[] {
		if (manualResults != undefined) {
			const mrCalcEngineTabs: IStringIndexer<{ ceKey: string, tabs: string[] }> = {};

			manualResults.forEach(t => {
				const ceKey = t["@calcEngineKey"];
				if (ceKey == undefined) {
					throw new Error("manualResults requires a @calcEngineKey attribute specified.");
				}

				let ceName = this.getCeName(t["@calcEngine"] ?? t["@calcEngineKey"]);
				if (this.calcEngines.find(c => !c.manualResult && c.name.toLowerCase() == ceName!.toLowerCase()) != undefined) {
					// Can't have same CE in manual results as we do in normal results, so prefix with Manual
					ceName = "Manual." + ceName;
				}

				if (mrCalcEngineTabs[ceName] == undefined) {
					mrCalcEngineTabs[ceName] = { ceKey: ceKey, tabs: [] };
				}

				let tabName = t["@name"];
				if (tabName == undefined) {
					tabName = t["@name"] = "RBLResult" + (mrCalcEngineTabs[ceName].tabs.length + 1);
				}
				mrCalcEngineTabs[ceName].tabs.push(tabName);
			});

			const mrCalcEngines: ICalcEngine[] = [];

			for (const ceName in mrCalcEngineTabs) {
				const ceInfo = mrCalcEngineTabs[ceName];

				const ce: ICalcEngine = {
					key: ceInfo.ceKey,
					name: ceName,
					inputTab: "RBLInput",
					resultTabs: ceInfo.tabs,
					manualResult: true,
					allowConfigureUi: true,
					enabled: true
				};

				mrCalcEngines.push(ce);
			}

			return mrCalcEngines;
		}

		return [];
	}

	private toTabDefs(rbleResults: Array<{CalcEngine: string, TabDef: IRbleTabDef}>): IKaTabDef[] {
		const calcEngines = this.calcEngines;
		const defaultCEKey = calcEngines[0].key;

		return rbleResults.map(r => {
			const t = r.TabDef;
			const ceName = this.getCeName(r.CalcEngine);
			const configCe = calcEngines.find(c => c.name.toLowerCase() == ceName.toLowerCase());

			if (configCe == undefined) {
				/*
				// If they run a different CE than is configured via this event handler
				// the CalcEngine might not be in calcEngine options, so find will be 
				// undefined, just treat results as 'primary' CE
                
				updateApiOptions: (submitApiOptions, endpoint, application) => { 
					submitApiOptions.Configuration.CalcEngine = "Conduent_Nexgen_Profile_SE";
				}
				*/
				 KatApps.Utils.trace(this, "KatApp", "toTabDefs", `Unable to find calcEngine: ${ceName}.  Determine if this should be supported.`, TraceVerbosity.None);
			}

			const ceKey = configCe?.key ?? defaultCEKey;
			const name = t["@name"];

			const tabDef: IKaTabDef = {
				_ka: {
					calcEngineKey: ceKey,
					name: name
				}
			};

			Object.keys(t)
				.forEach(k => {
					if (k.startsWith("@")) {
						tabDef[k] = t[k] as string;
					}
					else {
						tabDef[k] = !(t[k] instanceof Array)
							? [t[k] as ITabDefRow]
							: t[k] as ITabDefTable;
					}
				});

			return tabDef;
		});
	}
	
	/*
	Reactivity Bug - Demonstrated with rbl.scope.html

	Situation
	1. Have a v-for rbl.source('anything')
	2. Inside v-for, have a v-scope property that uses BOTH the current iterator row ('coverage' in example) and rbl.value()

	Problem
	1. Normal calculation - populates rbl-value, reactivity triggered, v-for correctly rendered.
	2. User calls pushTo with rbl-value, reactivity triggered, v-scope correctly re-evaluated since v-for source not updated.
	3. Normal Calculation that changes original v-for rbl.source
		1. Touches rbl-value first, reactivity triggered ONLY for v-scope which re-evalates INCORRECTLY because v-for source is not updated yet
		2. Touches rbl.source() table, reactivity triggered ONLY for v-for (and correctly), but does NOT re-evaluate v-scope property (even though the current iterator row has changed).
		3. If issue another calculation, then everything is 'caught up' and evaluates correctly.

	References
	1. https://github.com/vuejs/petite-vue/discussions/228 - Discussion on same type of issue, although solution for Array.Concat does not work.
	2. https://v2.vuejs.org/v2/guide/reactivity.html - No access to Vue.set() in petite-vue, but Object.assign() available and needed (more below in Caveats), and leveraging Array.splice instead of direct assignments
	3. https://enterprisevue.dev/blog/ultimate-guide-to-vue-reactivity/#:~:text=1.%20Array%20Reactivity - Another blog indicating some caveats with reactivity in Vue 3 (which I adopted as well for petite-vue)
	4. https://github.com/vuejs/vue/blob/9e88707940088cb1f4cd7dd210c9168a50dc347c/src/core/observer/index.ts#L221 - Source for Vue 2.x set() method.  petite-vue 'imports' @vue/reactive 3.2.7 ... not sure is same source as this link, but we do NOT have Vue.set() function and this might provide hints as to how reactivity is handled in petite-vue.

	Solution

	I discovered that if inside the calculateAsync I moved rbl-value processing last (after the rbl.source() used in v-for) everything worked as expected.
	As mentioned in the Github discussion metioned above, PetiteVue.nextTick was a possible 'hack' to make things work, and that is leveraged.  It is not
	as much of a hack as mentioned in discussion though, as the user will not have to call that.  KatApp framework will simply call it one time during
	processResultsAsync.  
	
	When rbl.pushTo is used, the ce/table pushedTo will be tracked, then inside any subsequent processResultsAsync calls, any tables that have been pushed to
	will be processed INSIDE a PetiteVue.nextTick method.  This seems to correct the issue with reactivity and things work correctly.

	Caveats
	
	rbl.scope.html (as of 12/1/24) is saved in a working state because it does NOT touch rbl-value on the second normal calculation (via 'Make Election')
	and PetiteVue.nextTick is disabled.

	However, there are some interesting observations.  If, Object.assign() is NOT used in copyTabDefToRblState, reactivity is not correctly processed.  The 
	interator row is still 'behind' in the v-scope property.  However, I did not need Object.assign() or Array.splice() methods in other locations.  
	If copyTabDefToRblState always used Object.assign(), I could toggle any of the other locations in the code and everything still worked.

	Additionally, after implementing the PetiteVue.nextTick solution, I could use all 'direct assignments' (and other bad reactive patterns for arrays) and
	everything still worked, however, I still coded things 'correctly' for now.
	*/

	private copyTabDefToRblState(ce: string, tab: string, rows: ITabDefTable, tableName: string) {
		KatApps.Utils.trace(this, "KatApp", "copyTabDefToRblState", `Copy ${rows.length} rows from ${ce}.${tab}.${tableName}`, TraceVerbosity.Diagnostic);

		const key = `${ce}.${tab}`;
		if (this.state.rbl.results[key] == undefined) {
			// this.state.rbl.results = {};
			this.state.rbl.results = Object.assign({}, this.state.rbl.results, { [key]: {} });
		}

		// this.state.rbl.results[key][tableName] = rows;
		this.state.rbl.results[key] = Object.assign({}, this.state.rbl.results[key], { [tableName]: rows });
	}

	private mergeTableToRblState(ce: string, tab: string, rows: ITabDefTable, tableName: string) {
		KatApps.Utils.trace(this, "KatApp", "mergeTableToRblState", `Merge ${rows.length} rows from ${ce}.${tab}.${tableName}`, TraceVerbosity.Diagnostic);
		if (ce == "_ResultProcessing" && this.calcEngines.length > 0) {
			ce = this.calcEngines[0].key;
			tab = this.calcEngines[0].resultTabs[0];
		}

		const key = `${ce}.${tab}`;
		if (this.state.rbl.results[key] == undefined) {
			// this.state.rbl.results = {};
			this.state.rbl.results = Object.assign({}, this.state.rbl.results, { [key]: {} });
		}
		if (this.state.rbl.results[key][tableName] == undefined) {
			// this.state.rbl.results[key][tableName] = [];
			this.state.rbl.results[key] = Object.assign({}, this.state.rbl.results[key], { [tableName]: [] });
		}
		
		rows.forEach(row => {
			if (tableName == "rbl-skip") {
				row.id = row.key;
				// Legacy support...didn't have ability to turn on and off, so if they don't have value column, imply that it is on
				if (row.value == undefined) {
					row.value = "1";
				}
			}

			const index = this.state.rbl.results[key][tableName].findIndex(r => r.id == row.id);

			// splice - didn't seem needed in rbl.scope, worked with direct assignments/push, but changed anyway
			if (index > -1) {
				// KatApps.Utils.extend(this.state.rbl.results[key][tableName][index], row);
				this.state.rbl.results[key][tableName].splice(index, 1, Object.assign({}, this.state.rbl.results[key][tableName][index], row));
			}
			else {
				// this.state.rbl.results[key][tableName].push(row);
				this.state.rbl.results[key][tableName].splice(this.state.rbl.results[key][tableName].length, 0, row);
			}
		});

		// Think I 'should' be doing this, but seems to work as is...
		// this.state.rbl.results[key] = Object.assign({}, this.state.rbl.results[key], { [tableName]: [] });
		// UPDATE: Removed this, clients using KatApp should no longer set on=0, simply remove the row via splice themselves if needed.
		//			on=0 never makes it out of RBLe api, so this seems wonky to be doing here.
		// this.state.rbl.results[key][tableName] = this.state.rbl.results[key][tableName].filter(r => r.on != "0");
	}

	private async processResultsAsync(results: IKaTabDef[], calculationSubmitApiConfiguration: ISubmitApiOptions | undefined): Promise<void> {
		 KatApps.Utils.trace(this, "KatApp", "processResultsAsync", `Start: ${results.map(r => `${r._ka.calcEngineKey}.${r._ka.name}`).join(", ")}`, TraceVerbosity.Detailed);
		
		const processResultColumn = (row: ITabDefRow, colName: string, isRblInputTable: boolean) => {
			if (typeof (row[colName]) === "object") {
				KatApps.Utils.trace(this, "KatApp", "processResultColumn", `Convert ${colName} from object to string.`, TraceVerbosity.Diagnostic);

				const metaRow: ITabDefMetaRow = row;
				const metaSource = metaRow[colName] as IStringIndexer<string>;
				const metaDest = (metaRow["@" + colName] = {}) as IStringIndexer<string>;

				// For the first row of a table, if there was a width row in CE, then each 'column' has text and @width attribute,
				// so row[columnName] is no longer a string but a { #text: someText, @width: someWidth }.  This happens during process
				// turning the calculation into json.  http://www.newtonsoft.com/json/help/html/convertingjsonandxml.htm
				Object.keys(metaSource)
					.filter(k => k != "#text")
					.forEach(p => {
						metaDest[p.substring(1)] = metaSource[p];
					});

				row[colName] = metaSource["#text"] ?? "";
			}

			const value = row[colName];

			if (isRblInputTable && value == "" && (row["@" + colName] as unknown as IStringIndexer<string>)?.["@text-forced"] != "true") {
				// For rbl-input (which is special table), I want any 'blanks' to be returned as undefined, any other table, I always want '' in there
				// so Kaml Views don't always have to code undefined protection code
				row[colName] = undefined;
			}

			// Make sure every row has every property that is returned in the *first* row of results...b/c RBL service doesn't export blanks after first row
			if (value == undefined && !isRblInputTable) {
				row[colName] = "";
			}
		};

		// Merge these tables into state instead of 'replacing'...
		const tablesToMerge = ["rbl-disabled", "rbl-display", "rbl-skip", "rbl-value", "rbl-listcontrol", "rbl-input"];

		results.forEach(t => {
			Object.keys(t)
				// No idea how ItemDefs is in here, but not supporting going forward, it was returned by IRP CE but the value was null so it blew up the code
				.filter(k => !k.startsWith("@") && k != "_ka" && k != "ItemDefs")
				.forEach(tableName => {
					const rows = (t[tableName] as ITabDefTable ?? []);
					if (rows.length > 0) {
						const isRblInputTable = tableName == "rbl-input";
						const colNames = Object.keys(rows[0]);

						rows.forEach(r => {
							colNames.forEach(c => processResultColumn(r, c, isRblInputTable))

							switch (tableName) {
								case "rbl-defaults":
									this.setInputValue(r.id!, r["value"]);
									break;

								case "rbl-input":
									if (r["value"] != undefined) {
										this.setInputValue(r.id!, r["value"]);
									}
									if ((r["error"] ?? "") != "") {
										const v: IValidationRow = { id: r.id!, text: this.getLocalizedString(r.error)!, dependsOn: r.dependsOn };
										this.state.errors.push(v);
									}
									if ((r["warning"] ?? "") != "") {
										const v: IValidationRow = { id: r.id!, text: this.getLocalizedString(r.warning)!, dependsOn: r.dependsOn };
										this.state.warnings.push(v);
									}
									break;

								case "errors":
									r.text = this.getLocalizedString(r.text)!;
									this.state.errors.push(r as unknown as IValidationRow);
									break;

								case "warnings":
									r.text = this.getLocalizedString(r.text)!;
									this.state.warnings.push(r as unknown as IValidationRow);
									break;

								case "table-output-control":
									// If table control says they want to export, but no rows are returned, then need to re-assign to empty array
									// export = -1 = don't export table and also clear out in Vue state
									// export = 0 = don't export table but leave Vue state
									// export = 1 = try export table and if empty, clear Vue state
									if ((r["export"] == "-1" || r["export"] == "1") && t[r.id!] == undefined) {
										this.copyTabDefToRblState(t._ka.calcEngineKey, t._ka.name, [], r.id!);
									}
									break;
							}
						});
					}
				});

			(t["rbl-input"] as ITabDefTable ?? []).filter(r => (r["list"] ?? "") != "").map(r => ({ input: r.id!, list: r.list! })).concat(
				(t["rbl-listcontrol"] as ITabDefTable ?? []).map(r => ({ input: r.id!, list: r.table! }))
			).forEach(r => {
				if (t[r.list] != undefined) {
					const values = (t[r.list] as Array<IKaInputModelListRow>).map(l => l.key);
					const inputValue: string | undefined = this.state.inputs[r.input] as string;
					if (values.indexOf(inputValue ?? "") == -1) {
						delete this.state.inputs[r.input];
					}
				}
			});
		});

		const processTabDefs = (insideNextTick: boolean) => {
			results.forEach(t => {
				Object.keys(t)
					// No idea how ItemDefs is in here, but not supporting going forward, it was returned by IRP CE but the value was null so it blew up the code
					.filter(k => {
						if (k.startsWith("@") || k == "_ka" || k == "ItemDefs") return false;

						const pushToKey = `${t._ka.calcEngineKey}.${t._ka.name}.${k}`;
						const pushToIndex = this.pushToTables.indexOf(pushToKey);

						if (!insideNextTick && pushToIndex > -1) return false;
						if (insideNextTick && pushToIndex == -1) return false;

						return true;
					})
					.forEach(tableName => {
						const rows = (t[tableName] as ITabDefTable ?? []);
	
						if (tablesToMerge.indexOf(tableName) == -1) {
							this.copyTabDefToRblState(t._ka.calcEngineKey, t._ka.name, rows, tableName);
						}
						else {
							// Pass rows so 'on=0' can be assigned if modified by caller then removed...
							this.mergeTableToRblState(t._ka.calcEngineKey, t._ka.name, rows, tableName);
						}
					});
			});
		}

		processTabDefs(false);
		await PetiteVue.nextTick(() => {
			processTabDefs(true);
		});
		this.pushToTables = [];

		await this.processDataUpdateResultsAsync(results, calculationSubmitApiConfiguration);
		this.processDocGenResults(results);

		 KatApps.Utils.trace(this, "KatApp", "processResultsAsync", `Complete: ${results.map(r => `${r._ka.calcEngineKey}.${r._ka.name}`).join(", ")}`, TraceVerbosity.Detailed);
	}

	private async processDataUpdateResultsAsync(results: IKaTabDef[], calculationSubmitApiConfiguration: ISubmitApiOptions | undefined): Promise<void> {
		const jwtPayload = {
			DataTokens: [] as Array<{ Name: string; Token: string; }>
		};

		results
			.forEach(t => {
				(t["jwt-data"] as ITabDefTable ?? [])
					.filter(r => r.id == "data-updates")
					.forEach(r => {
						jwtPayload.DataTokens.push({ Name: r.id!, Token: r.value! });
					});
			});

		if (jwtPayload.DataTokens.length > 0) {
			 KatApps.Utils.trace(this, "KatApp", "processDataUpdateResultsAsync", `Start (${jwtPayload.DataTokens.length} jwt-data items)`, TraceVerbosity.Detailed);
			await this.apiAsync("rble/jwtupdate", { apiParameters: jwtPayload }, undefined, calculationSubmitApiConfiguration);
			 KatApps.Utils.trace(this, "KatApp", "processDataUpdateResultsAsync", `Complete`, TraceVerbosity.Detailed);
		}
    }

	private processDocGenResults(results: IKaTabDef[]) {
		const base64toBlob = function (base64Data: string, contentType = 'application/octet-stream', sliceSize = 1024): Blob {
			// https://stackoverflow.com/a/20151856/166231                
			const byteCharacters = atob(base64Data);
			const bytesLength = byteCharacters.length;
			const slicesCount = Math.ceil(bytesLength / sliceSize);
			const byteArrays = new Array(slicesCount);

			for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
				const begin = sliceIndex * sliceSize;
				const end = Math.min(begin + sliceSize, bytesLength);

				const bytes = new Array(end - begin);
				for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
					bytes[i] = byteCharacters[offset].charCodeAt(0);
				}
				byteArrays[sliceIndex] = new Uint8Array(bytes);
			}
			return new Blob(byteArrays, { type: contentType });
		}
		/*
		const base64toBlobFetch = (base64 : string, type: string = 'application/octet-stream'): Promise<Blob> => 
			// Can't use in IE :(
			fetch(`data:${type};base64,${base64}`).then(res => res.blob())
		*/

		const docGenInstructions = results.flatMap(t => (t["api-actions"] as ITabDefTable ?? []).filter(r => r["action"] == "DocGen"));

		if (docGenInstructions.length > 0) {
			 KatApps.Utils.trace(this, "KatApp", "processDocGenResults", `Start (${docGenInstructions.length} DocGen items)`, TraceVerbosity.Detailed);

			docGenInstructions.forEach(r => {
				const fileName = r["file-name"];
				if (r.exception != undefined) {
					 KatApps.Utils.trace(this, "KatApp", "processDocGenResults", `DocGen Instruction Exception: ${fileName ?? 'File Not Availble'}, ${r.exception})`, TraceVerbosity.None);
				}
				else {
					const base64 = r.content!;
					const contentType = r["content-type"];
					const blob = base64toBlob(base64, contentType);
					this.downloadBlob(blob);
				}
			});
			 KatApps.Utils.trace(this, "KatApp", "processDocGenResults", `Complete`, TraceVerbosity.Detailed);
		}
	}

	private async getViewElementAsync(): Promise<HTMLElement | undefined> {
		const viewElement: HTMLElement = document.createElement("div");

		if ((this.options.modalAppOptions != undefined || this.options.inputs?.iNestedApplication == "1") && this.options.view != undefined ) {
			const view = this.options.view;

			const apiUrl = this.getApiUrl(`${this.options.kamlVerifyUrl}?applicationId=${view}&currentId=${this.options.hostApplication!.options.currentPage}` );

			try {
				const response = await fetch(apiUrl.url, { method: "GET" });
			  
				if (!response.ok) {
					throw await response.json();
				}
			  
				const data: IKamlVerifyResult = await response.json();
			  
				KatApps.Utils.extend(this.options, { view: data.path, currentPath: view });
				KatApps.Utils.extend(this.state.inputs, data.manualInputs);
			} catch (e) {
				 KatApps.Utils.trace(this, "KatApp", "getViewElementAsync", `Error verifying KatApp ${view}`, TraceVerbosity.None, e);
				throw new KatApps.KamlResourceDownloadError("View verification request failed.", view);
			}
		}

		if (this.options.view != undefined) {
			const viewResource = await KatApps.KamlRepository.getViewResourceAsync(this.options, this.options.view);

			 KatApps.Utils.trace(this, "KatApp", "getViewElementAsync", `Resource Returned`, TraceVerbosity.Detailed);

			const viewContent =
				viewResource[this.options.view]
					.replace(/{id}/g, this.id)
					.replace(/thisApplication/g, this.applicationCss);

			viewElement.innerHTML = viewContent;

			if (viewElement.querySelectorAll("rbl-config").length !== 1) {
				throw new Error("View " + this.options.view + " is missing rbl-config element");
			}
						
			new KatApps.KamlCompiler(this).compileMarkup(viewElement, this.id);

			 KatApps.Utils.trace(this, "KatApp", "getViewElementAsync", `Markup Processed`, TraceVerbosity.Detailed);
		}
		else if (this.options.content == undefined) {
			// just mounting existing html (usually just a help tip is what this was made for)
			return undefined;
		}

		return viewElement;
	}

	private async getViewTemplatesAsync(viewElement: Element): Promise<string[]> {
		var requiredViewTemplates =
			(viewElement.querySelector("rbl-config")?.getAttribute("templates")?.split(",") ?? [])
				.map(r => {
					const resourceNameParts = (r.split(":").length > 1 ? r : "Global:" + r).split("?");

					let resourceName = resourceNameParts[0];
					if (!resourceName.endsWith(".kaml")) {
						resourceName += ".kaml";
					}

					return resourceName;
				});

		const viewTemplateResults = await KatApps.KamlRepository.getTemplateResourcesAsync(this.options, requiredViewTemplates);
		const kamlCompiler = new KatApps.KamlCompiler(this);
		Object.keys(viewTemplateResults).forEach(k => {
			const templateContent = document.createElement("kaml-template");
			templateContent.innerHTML = viewTemplateResults[k];

			kamlCompiler.compileMarkup(templateContent, k.replace(/\./g, "_"));
			KatApps.KamlRepository.resolveTemplate(k);
		});
		return requiredViewTemplates.map(t => {
			const keyParts = t.split(":"); // In case Rel:
			return keyParts[keyParts.length - 1].split("?")[0].replace(/\./g, "_");
		});
	}

	private getSessionStorageInputs(): ICalculationInputs {
		const inputCachingKey = "cachedInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "EveryOne");
		const cachedInputs = KatApps.Utils.getSessionItem<ICalculationInputs>(this.options, inputCachingKey);

		const oneTimeInputsKey = "navigationInputs:" + this.options.currentPage;
		const oneTimeInputs = KatApps.Utils.getSessionItem<ICalculationInputs>(this.options, oneTimeInputsKey, true);

		const persistedInputsKey = "navigationInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "Everyone");
		const persistedInputs = KatApps.Utils.getSessionItem<ICalculationInputs>(this.options, persistedInputsKey);

		const sessionStorageInputs = KatApps.Utils.extend<ICalculationInputs>({}, cachedInputs, persistedInputs, oneTimeInputs);
		return sessionStorageInputs;
	}
}

class ApiError extends Error {
	constructor(message: string, public innerException: Error | undefined, public apiResponse: IApiErrorResponse) {
		super(message);
	}
}
class ValidityError extends Error {
	constructor() {
		super("checkValidity failed on one or more inputs");
	}
}
