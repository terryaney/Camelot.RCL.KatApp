
(function (): void {
	// save the original methods before overwriting them
	Element.prototype._addEventListener = Element.prototype.addEventListener;
	Element.prototype._removeEventListener = Element.prototype.removeEventListener;

	const standardEventTypes = [
		'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 'mousemove', 'mouseenter', 'mouseleave',
		'keydown', 'keyup', 'keypress', 'focus', 'blur', 'change', 'input', 'submit', 'reset', 'load', 'unload',
		'resize', 'scroll', 'contextmenu', 'wheel', 'drag', 'dragstart', 'dragend', 'dragenter', 'dragleave', 'dragover',
		'drop', 'touchstart', 'touchmove', 'touchend', 'touchcancel'
	];
	const getEventType = (type: string): string => standardEventTypes.find(t => t === type.split(".")[0]) ?? type;

	Element.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): ElementEventListener {
		this._addEventListener(getEventType(type), listener, options);

		if (this.kaEventListeners == undefined) this.kaEventListeners = {};
		if (this.kaEventListeners[type] == undefined) this.kaEventListeners[type] = [];
        
		const eListener: ElementEventListener = { type, listener, options };
		this.kaEventListeners[type].push(eListener);

		return eListener;
	};

	Element.prototype.removeEventListener = function (type: ElementEventListener | string, listenerOrEventListener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
        let l: EventListenerOrEventListenerObject;
        let o: boolean | EventListenerOptions | undefined;
		let t: string;

		if (typeof type === 'object') {
			l = type.listener;
			o = type.options;
			t = type.type;
		}
        else {
			l = listenerOrEventListener;
			o = options;
			t = type as string;
        }

		this._removeEventListener(getEventType(t), l, o);

		if (this.kaEventListeners == undefined || this.kaEventListeners[t] == undefined) return;

		// Find the index of the event listener to remove
		const index = this.kaEventListeners[t].findIndex(event => event.listener === l && event.options === o);

		if (index !== -1) {
			this.kaEventListeners[t].splice(index, 1);
        
			if (this.kaEventListeners[t].length == 0) delete this.kaEventListeners[t];
			if (Object.keys(this.kaEventListeners).length == 0) delete this.kaEventListeners;
		}
	};
	
	Element.prototype.cloneWithEvents = function <T extends HTMLElement>(): T {
		// Need to use this when a DOM element with events registered is used for helptip or modal application.
		// Originally, used JQuery `.contents().clone(true)` but Conduent had a code scanner that listed JQuery library 
		// as a security vulnerability.
		//
		// Created custom .on/.off handlers on KatApp and replaced default implementation of addEventListener/removeEventListener
		// to track event listeners similar to JQuery on/off so that when cloned, I could then re-apply the event listeners to
		// the cloned elements.
		// https://stackoverflow.com/questions/15408394/how-to-copy-a-dom-node-with-event-listeners
		// https://github.com/colxi/getEventListeners/tree/master		
		// https://github.com/HubSpot/youmightnotneedjquery/issues/354
		const clone = this.cloneNode(true) as T;
		clone.classList.remove(...clone.classList);
		while (clone.attributes.length > 0) {
			clone.removeAttribute(clone.attributes[0].name);
		}
		
		function walk(original: Element, cloned: Element): void {
			if (original.kaEventListeners !== undefined) {
				Object.keys(original.kaEventListeners).forEach(type => {
					original.kaEventListeners![type].forEach(event => {
						cloned.addEventListener(getEventType(type), event.listener, event.options);
					});
				});
			}

			const originalChildren = original.children;
			const clonedChildren = cloned.children;

			for (let i = 0; i < originalChildren.length; i++) {
				walk(originalChildren[i], clonedChildren[i]);
			}
		}

		walk(this, clone as unknown as Element);

		return clone;
	}

	if (String.compare == undefined) {
		String.compare = function (strA?: string, strB?: string, ignoreCase?: boolean): number {
			if (strA === undefined && strB === undefined) {
				return 0;
			}
			else if (strA === undefined) {
				return -1;
			}
			else if (strB === undefined) {
				return 1;
			}

			if (ignoreCase || false) {
				strA = strA!.toUpperCase();
				strB = strB!.toUpperCase();
			}

			if (strA === strB) {
				return 0;
			}
			else {
				return strA! < strB! ? -1 : 1;
			}
		};
	}

	if (String.formatTokens === undefined) {
		String.formatTokens = function (intl, template, parameters): string {
			// String.formatTokens( "{{greeting}} {{who}}!", {greeting: "Hello", who: "world"} )
			return template.replace(/{{([^}]+)}}/g, function (match, token) {
				const tokenParts = token.split(":");
				const tokenName = tokenParts[0];
				const tokenFormat = tokenParts.length == 2 ? tokenParts[1] : undefined;
				
				const valueType = typeof parameters[tokenName];

				// If class/width/other RBLe custom columns were used, their values
				// would be assigned as attributes, so a #text property on the object would
				// exist, and that is probably what they want.
				let tokenValue = valueType == "object"
					? parameters[tokenName]["#text"] ?? parameters[tokenName]
					: parameters[tokenName];

				if (tokenValue != undefined && tokenFormat != undefined) {
                    const numberRegex = /^-?\d+(\.\d+)?$/;
					const dateRegex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:T.*)?/;
                    const dateMatch = tokenValue.match(dateRegex);
                    if (dateMatch != undefined) {
                        tokenValue = KatApps.Utils.formatDate(intl.currentCulture, new Date(parseInt(dateMatch.groups.year), parseInt(dateMatch.groups.month) - 1, parseInt(dateMatch.groups.day)), tokenFormat);
                    }
                    else if (numberRegex.test(tokenValue)) {
                        const val = parseFloat(tokenValue);
                        if (!isNaN(val)) {
							if (tokenFormat.startsWith("p")) tokenValue = KatApps.Utils.formatPercent(intl.currentCulture, val, tokenFormat);
							else if (tokenFormat.startsWith("c") || tokenFormat.startsWith("n") || tokenFormat.startsWith("f")) tokenValue = KatApps.Utils.formatNumber(intl, val, tokenFormat);
							else throw new Error(`Invalid String.formatTokens format string: ${tokenFormat}, value: ${val}`);
                        }
                    }
				}
		
				// https://stackoverflow.com/a/6024772/166231 - first attempt
				// https://stackoverflow.com/a/13418900/166231
				// Tested this again and was getting $$ in results...seems I don't need to do this replacement since
				// my string.replace takes a 'function' as the second param, without a function, the issue presented itself,
				// without a funciton it seems to just work as expected.
				/*
				if (typeof jsonValue == "string") {
					jsonValue = jsonValue.replace(new RegExp('\\$', 'gm'), '$$$$');
				}
				*/

				// If I didn't want to hard code the $0 check, this answer suggested using a function, but I didn't want the overhead
				// https://stackoverflow.com/a/6024692/166231
				// that = that.replace(re, function() { return json[propertyName]; });

				return tokenValue ?? `{{${token}}}`;
			});
		};
	}
})();