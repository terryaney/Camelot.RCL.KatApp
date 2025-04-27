namespace KatApps {
	export class Utils {
		public static chunk<T>(array: Array<T>, size: number): Array<Array<T>> {
			const chunks = [];
			for (let i = 0; i < array.length; i += size) {
				chunks.push(array.slice(i, i + size));
			}
			return chunks;
		}

		// https://blog.logrocket.com/4-different-techniques-for-copying-objects-in-javascript-511e422ceb1e/
		// Wanted explicitly 'undefined' properties set to undefined
		public static extend<T>(target: IStringAnyIndexer, ...sources: (IStringAnyIndexer | undefined)[]): T {
			sources.forEach((source) => {
				if (source === undefined) return;
				this.copyProperties(target, source);
			})
			return target as T;
		};

		public static clone<T>(source: IStringAnyIndexer, replacer?: IStringAnyIndexerReplacer): T { // eslint-disable-line @typescript-eslint/no-explicit-any
			return this.copyProperties({}, source, replacer) as T;
		};

		private static copyProperties(target: IStringAnyIndexer, source: IStringAnyIndexer, replacer?: IStringAnyIndexerReplacer): IStringAnyIndexer { // eslint-disable-line @typescript-eslint/no-explicit-any
			Object.keys(source).forEach((key) => {

				const value = replacer != undefined
					? replacer(key, source[key])
					: source[key];

				// Always do deep copy unless hostApplication, then simply assign
				if (
					value != undefined &&
					key != "hostApplication" &&
					typeof value === "object" &&
					!(value instanceof HTMLElement) &&
					!(value instanceof Promise) &&
					!Array.isArray(value)
				) {
					if (target[key] === undefined || typeof target[key] !== "object") {
						target[key] = {};
					}
					this.copyProperties(target[key], value, replacer);
				}
				// If replacer passed in and value is undefined , skip assigning property
				else if (value != undefined || replacer == undefined) {
					target[key] = value;
				}
			})
			return target;
		};

		// https://stackoverflow.com/a/2117523
		public static generateId = function (): string {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
				function (c) {
					const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
					return v.toString(16);
				}
			);
		};

		public static parseQueryString(qs: string | undefined): IStringIndexer<string> {
			const qsValues: IStringIndexer<string> = {};

			if (qs != undefined && qs != "") {
				const paramsArray = (qs.startsWith("?") ? qs.substr(1) : qs).split('&');

				for (let i = 0; i < paramsArray.length; ++i) {
					const param = paramsArray[i]
						.split('=', 2);

					if (param.length !== 2)
						continue;

					qsValues[param[0].toLowerCase()] = decodeURIComponent(param[1].replace(/\+/g, " "));
				}
			}

			return qsValues;
		}
		public static generateQueryString(qsObject: IStringIndexer<string>, allowQs: ((key: string) => boolean) | undefined): string | undefined {

			let qs = "";

			Object.keys(qsObject).forEach((key) => {
				if (allowQs == undefined || allowQs(key)) {
					qs += `${key}=${qsObject[key]}&`;
				}
			});

			return qs.length > 0 ? `?${qs.substring(0, qs.length - 1)}` : undefined;
		}

		public static pageParameters = this.readPageParameters();
		private static _pageParameters: IStringIndexer<string> | undefined;
		private static readPageParameters(): IStringIndexer<string> {
			return this._pageParameters ?? (this._pageParameters = this.parseQueryString(window.location.search));
		}

		public static getObjectFromAttributes(attributes: string): IStringIndexer<string> {
			// https://stackoverflow.com/questions/30420491/javascript-regex-to-get-tag-attribute-value/48396506#48396506
			const regex = new RegExp('[\\s\\r\\t\\n]*([a-z0-9\\-_]+)[\\s\\r\\t\\n]*=[\\s\\r\\t\\n]*([\'"])((?:\\\\\\2|(?!\\2).)*)\\2', 'ig');
			const o: IStringIndexer<string> = {};
			let match: RegExpExecArray | null = null;

			while ((match = regex.exec(attributes))) {
				o[match[1]] = match[3];
			}

			return o;
		}

		public static trace(application: KatApp, callerType: string, methodName: string, message: string, verbosity: TraceVerbosity, ...groupItems: Array<any>): void {
			const verbosityOption = application.options.debug.traceVerbosity ?? TraceVerbosity.None as unknown as ITraceVerbosity;

			if (verbosityOption as unknown as TraceVerbosity >= verbosity) {
				const currentTrace = new Date();
				const origin = `${callerType}\tKatApp Framework`;
				const katApp = application.selector ?? application.id;
				const startTrace = application.traceStart
				const lastTrace = application.traceLast;
				const startDelta = Math.abs(currentTrace.getTime() - startTrace.getTime());
				const lastDelta = Math.abs(currentTrace.getTime() - lastTrace.getTime());
				application.traceLast = currentTrace;
				// Date MillisecondsFromStart MilliscondsFromLastTrace DataGroup KatAppId CallerType CallerMethod Message

				const dt = currentTrace;
				const pad2 = (n: number) => String(n).padStart(2, "0");
				const datePart = [dt.getFullYear(), pad2(dt.getMonth() + 1), pad2(dt.getDate())].join('-');
				const timePart = `${[pad2(dt.getHours()), pad2(dt.getMinutes()), pad2(dt.getSeconds())].join(':')}:${pad2(Math.floor(dt.getMilliseconds() / 10))}`;

				const log = `${datePart} ${timePart}\t${String(startDelta).padStart(5, "0")}\t${String(lastDelta).padStart(5, "0")}\t${application.options.dataGroup}\t${katApp ?? "Unavailable"}\t${origin}\t${methodName}: ${message}`;

				if (groupItems.length > 0) {
					console.group(log);
					groupItems.forEach(i => i instanceof Error ? console.error({ i }) : console.log(i));
					console.groupEnd();
				}
				else {
					console.log(log);
				}
			}
		}

		public static async checkLocalServerAsync(currentOptions: IKatAppRepositoryOptions): Promise<boolean> {
			return (await this.downloadLocalServerAsync(currentOptions.debug.debugResourcesDomain!, "/js/ping.js")) != undefined;
		};

		public static async downloadLocalServerAsync(debugResourcesDomain: string, relativePath: string, secure?: boolean): Promise<any | undefined> {
			const url = "https://" + debugResourcesDomain + relativePath;

			const response = await (async () => {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 1000);
		  
				try {
					const response = await fetch(
						!secure ? url.substring(0, 4) + url.substring(5) : url,
						{ method: "GET", signal: controller.signal }
					);
					clearTimeout(timeoutId);
					return response;
				} catch (error) {
					clearTimeout(timeoutId);
					return { ok: false } as Response;
				}
			})();
		
			if (!response.ok) {
				return !secure
					? await this.downloadLocalServerAsync(debugResourcesDomain, relativePath, true)
					: undefined;
			}

			return await response.text();
		};

		private static getSessionKey(options: string | IKatAppOptions | undefined, key: string): string {
			const prefix = typeof options === "string" ? options : options?.sessionKeyPrefix;
			return `KatApp:${new URL(document.baseURI).pathname}${prefix ?? ""}:${key}`;
		}

		public static setSessionItem(options: IKatAppOptions, key: string, value: any): void {
			const cachValue = typeof value === "string" ? value : "json:" + JSON.stringify(value);
			sessionStorage.setItem(Utils.getSessionKey(options, key), cachValue);
		}
		public static getSessionItem<T = string>(options: IKatAppOptions, key: string, oneTimeUse: boolean = false ): T | undefined {
			const cacheKey = Utils.getSessionKey(options, key);
			const cacheValue = sessionStorage.getItem(cacheKey);
			if (cacheValue == undefined) return undefined;

			if (oneTimeUse) {
				sessionStorage.removeItem(cacheKey);
			}

			return cacheValue.startsWith("json:") ? JSON.parse(cacheValue.substring(5)) : cacheValue as unknown as T;
		}
		public static removeSessionItem(options: IKatAppOptions, key: string): void {
			sessionStorage.removeItem(Utils.getSessionKey(options, key));
		}
		public static clearSession(prefix: string | undefined): void {
			const keyPrefix = Utils.getSessionKey(prefix, "");
			for (let i = sessionStorage.length; i >= 0; i--) {
				const key = sessionStorage.key(i);
				if (key != undefined && key.startsWith(keyPrefix)) {
					sessionStorage.removeItem(key);
				}
			}
		}

		public static formatCurrency(amount: number, style: IRblCurrencyFormat): string {
			// TODO: Should pass this in as options to application instead of camelot dependency
			const l = (window as any).camelot?.configuration?.intl?.locales ?? "en-US";
			const currencyCode = (window as any).camelot?.configuration?.intl?.currencyCode ?? "USD";

			return Intl.NumberFormat(l, {
				style: "currency",
				currency: currencyCode,
				minimumFractionDigits: style == "c2" ? 2 : 0,
				maximumFractionDigits: style == "c2" ? 2 : 0
			}).format(amount);
		}
		
		public static formatNumber(value: number, format: IRblNumberFormat = "n") {
			// TODO: Should pass this in as options to application instead of camelot dependency
			const l = (window as any).camelot?.configuration?.intl?.locales ?? "en-US";
			
			const useGrouping = format.toLowerCase().startsWith("n"); // 'N' for grouping, 'F' for fixed-point
			const decimalPlaces = parseInt(format.slice(1)) || 0; // Extract decimal places from format (e.g., "N2" -> 2)
		
			return Intl.NumberFormat(l, {
				style: "decimal",
				useGrouping: useGrouping,
				minimumFractionDigits: decimalPlaces,
				maximumFractionDigits: decimalPlaces
			}).format(value);
		}

		public static formatPercent(value: number, format: IRblPercentFormat = "p", divideBy100?: boolean) {
			// TODO: Should pass this in as options to application instead of camelot dependency
			const l = (window as any).camelot?.configuration?.intl?.locales ?? "en-US";
			const decimalPlaces = parseInt(format.slice(1)) || 0; // Extract decimal places from format (e.g., "P2" -> 2)
			
			let pValue = value;
			
			if (divideBy100 === true || (pValue > 1 && divideBy100 == undefined)) {
				pValue = pValue / 100;
			}

			return Intl.NumberFormat(l, {
				style: "percent",
				minimumFractionDigits: decimalPlaces,
				maximumFractionDigits: decimalPlaces
			}).format(pValue);
		}

		public static formatDate(value: string | Date, format: IRblDateFormat = "g") {
			const dateValue = value instanceof Date ? value : new Date(value);
			// TODO: Should pass this in as options to application instead of camelot dependency
			const l = (window as any).camelot?.configuration?.intl?.locales ?? "en-US";

			if (format == "s") return dateValue.toISOString().slice(0, 19); // ISO8601 sortable: yyyy-MM-ddTHH:mm:ss
			else if (format == "dv") return dateValue.toISOString().slice(0, 10); // yyyy-MM-dd

			switch (format) {						
				// M/d/yyyy
				case "d": return Intl.DateTimeFormat(l, { year: 'numeric', month: 'numeric', day: 'numeric' }).format(dateValue);
				// h:mm tt
				case "t": return Intl.DateTimeFormat(l, { timeStyle: "short" }).format(dateValue);
				// M/d/yyyy h:mm:ss tt
				case "g": {
					const datePart = Intl.DateTimeFormat(l, { year: 'numeric', month: 'numeric', day: 'numeric' }).format(dateValue);
					const timePart = Intl.DateTimeFormat(l, { timeStyle: "medium" }).format(dateValue);
					return `${datePart} ${timePart}`;
				}
				// yyyy-MM-dd hh:mm:ss:ff
				case "trace": {
					const dt = dateValue;
					const pad2 = (n: number) => String(n).padStart(2, "0");
					const datePart = [dt.getFullYear(), pad2(dt.getMonth() + 1), pad2(dt.getDate())].join('-');
					const timePart = `${[pad2(dt.getHours()), pad2(dt.getMinutes()), pad2(dt.getSeconds())].join(':')}:${pad2(Math.floor(dt.getMilliseconds() / 10))}`;
					return `${datePart} ${timePart}`;
				}
				default: {
					const tokenRegex = /M{1,4}|d{1,4}|y{1,4}/g;
					const matches = [...format.matchAll(tokenRegex)];
					
					const year = (matches.find(m => m["0"].indexOf("y") > -1)?.["0"].length ?? 4) == 2 ? "2-digit" : "numeric";
					const monthLength = (matches.find(m => m["0"].indexOf("M") > -1)?.["0"].length ?? 1);
					const month = monthLength == 1 ? "numeric" : monthLength == 2 ? "2-digit" : monthLength == 3 ? "short" : "long";

					// Currently, there might be a format like dddd, MMMM d, yyyy where 'day' is
					// used multiple times.  Currently only supporting the possibility for that
					// but if I need to support all tokens used multiple times, then I just need to
					// call DateTimeFormat for every match (or figure out a caching/unique detection method).
					const dayPatterns = matches.find(m => m["0"].indexOf("d") > -1)
						? matches.filter(m => m["0"].indexOf("d") > -1).map(m => m["0"])
						: ["d"];

					const partsByPattern = dayPatterns.reduce((map, pattern) => {
						const len = pattern.length;
						const dayOpt = len == 1 ? "numeric" : len == 2 ? "2-digit" : undefined;
						const weekdayOpt = len == 3 ? "short" : len == 4 ? "long" : undefined;
						map[pattern] = Intl.DateTimeFormat(l, {
							year, month, day: dayOpt, weekday: weekdayOpt
						}).formatToParts(dateValue);
						return map;
					}, {} as Record<string, Intl.DateTimeFormatPart[]>);

					// replace each token in one pass, using its exact position
					return format.replace(tokenRegex, token => {
						const parts = partsByPattern[token] || partsByPattern[dayPatterns[0]];
						switch (token[0].toLowerCase()) {
							case "m":
								return parts.find(p => p.type == "month")!.value;
							case "d": {
								const dayPart =
									parts.find(p => p.type == "day") ??
									parts.find(p => p.type == "weekday")!;
								return dayPart.value;
							}
							case "y":
								return parts.find(p => p.type == "year")!.value;
							default:
								return token;
						}
					});
				}
			}
		}
	}
}