"use strict";
class KatApp {
    selector;
    static applications = [];
    static globalEventConfigurations = [];
    static getDirty() {
        return this.applications.filter(a => a.state.isDirty);
    }
    static remove(item) {
        if (item.isMounted) {
            item.vueApp.unmount();
        }
        $("template[id$='" + item.id + "']").remove();
        this.applications = this.applications.filter(a => a.id != item.id);
    }
    static get(key) {
        if (typeof key == "number")
            return this.applications[key];
        if (typeof key == 'object') {
            const el = key;
            key = el.closest("[ka-id]")?.getAttribute("ka-id") ?? "";
        }
        if (typeof key == "string" && key != "") {
            const app = this.applications.find(a => a.id == key || a.selector == key);
            if (app != undefined)
                return app;
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
    static handleEvents(selector, configAction) {
        const config = {};
        configAction(config);
        this.globalEventConfigurations.push({ selector: selector, events: config });
    }
    static async createAppAsync(selector, options) {
        let katApp;
        try {
            katApp = new KatApp(selector, options);
            this.applications.push(katApp);
            await katApp.mountAsync();
            return katApp;
        }
        catch (e) {
            $(".kaModal").remove();
            if (katApp != undefined) {
                KatApp.remove(katApp);
            }
            throw e;
        }
    }
    id;
    isCalculating;
    lastCalculation;
    options;
    state;
    el;
    traceStart;
    traceLast;
    missingResources = [];
    missingLanguageResources = [];
    applicationCss;
    vueApp;
    viewTemplates;
    mountedTemplates = {};
    isMounted = false;
    pushToTables = [];
    configureOptions;
    calcEngines = [];
    uiBlockCount = 0;
    eventConfigurations = [];
    domElementQueued = false;
    domElementQueue = [];
    updateDomPromise = Promise.resolve();
    constructor(selector, options) {
        this.selector = selector;
        this.traceStart = this.traceLast = new Date();
        const id = this.id = "ka" + KatApps.Utils.generateId();
        this.applicationCss = ".katapp-" + this.id.substring(2);
        this.isCalculating = false;
        const defaultOptions = {
            inputCaching: false,
            canProcessExternalHelpTips: false,
            debug: {
                traceVerbosity: KatApps.Utils.pageParameters["tracekatapp"] === "1" ? TraceVerbosity.Diagnostic : TraceVerbosity.None,
                showInspector: KatApps.Utils.pageParameters["showinspector"] ?? (KatApps.Utils.pageParameters["localserver"] != undefined ? "1" : "0"),
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
        this.options = KatApps.Utils.extend({}, defaultOptions, options);
        const nc = this.nextCalculation;
        if (nc.trace) {
            nc.originalVerbosity = this.options.debug.traceVerbosity;
            this.nextCalculation = nc;
            this.options.debug.traceVerbosity = TraceVerbosity.Detailed;
        }
        const selectorResults = options.modalAppOptions == undefined ? $(selector) : undefined;
        if (selectorResults != undefined && selectorResults.length != 1) {
            throw new Error("'selector' of '" + this.selector + "' did not match any elements.");
        }
        else if (selectorResults == undefined && options.modalAppOptions == undefined) {
            throw new Error("No 'selector' or 'modalAppOptions' were provided.");
        }
        this.el = selectorResults ?? this.createModalContainer();
        this.domElementQueue = [this.el[0]];
        this.el.attr("ka-id", this.id);
        this.el.addClass("katapp-css " + this.applicationCss.substring(1));
        if (this.el.attr("v-scope") == undefined) {
            this.el.attr("v-scope", "");
        }
        if (this.el.attr("ka-cloak") == undefined && (options.view != undefined || options.content != undefined || (options.cloneHost ?? false) !== false)) {
            this.el.attr("ka-cloak", "");
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
        const getTabDefKey = function (calcEngine, tab) {
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
        };
        const getResultTableRows = function (table, calcEngine, tab) {
            const key = getTabDefKey(calcEngine, tab);
            return (that.state.rbl.results[key]?.[table] ?? []);
        };
        const getValue = function (...args) {
            const table = args.length == 1 ? "rbl-value" : args[0];
            const keyValue = args.length == 1 ? args[0] : args[1];
            const returnField = args.length >= 3 ? args[2] : undefined;
            const keyField = args.length >= 4 ? args[3] : undefined;
            const calcEngine = args.length >= 5 ? args[4] : undefined;
            const tab = args.length >= 6 ? args[5] : undefined;
            return getResultTableRows(table, calcEngine, tab)
                .find(r => r[keyField ?? "id"] == keyValue)?.[returnField ?? "value"];
        };
        const isTrue = (v) => {
            if (v == undefined)
                return true;
            if (typeof (v) == "string")
                return ["false", "0", "n", "no"].indexOf(v.toLowerCase()) == -1;
            return !(!v);
        };
        const cloneApplication = this.getCloneApplication(this.options);
        let _isDirty = false;
        const mergeRowsInternal = function (resultTabDef, table, rows, isPushTo = false) {
            if (!isPushTo && resultTabDef["_ka"] == undefined) {
                throw new Error(`Can not use mergeRows on a rbl.results tabDef.  Please use rbl.pushTo instead.`);
            }
            if (resultTabDef[table] == undefined) {
                resultTabDef[table] = [];
            }
            const t = resultTabDef[table];
            const toPush = rows instanceof Array ? rows : [rows];
            toPush.forEach((row, i) => {
                row.id = row.id ?? "_pushId_" + (t.length + i);
                const index = t.findIndex(r => r.id == row.id);
                if (index > -1) {
                    t.splice(index, 1, row);
                }
                else {
                    t.splice(t.length, 0, row);
                }
            });
        };
        const state = {
            kaId: this.id,
            application: this,
            lastInputChange: Date.now(),
            inputsChanged: false,
            get isDirty() {
                return _isDirty ?? this.inputsChanged;
            },
            set isDirty(value) {
                _isDirty = value;
                if (!(value ?? true)) {
                    this.inputsChanged = false;
                }
            },
            uiBlocked: false,
            canSubmit(whenInputsHaveChanged) { return (whenInputsHaveChanged ? this.inputsChanged : this.isDirty) && this.errors.filter(r => r.id.startsWith('i')).length == 0 && !this.uiBlocked; },
            needsCalculation: false,
            inputs: KatApps.Utils.extend({
                getOptionText: (inputId) => {
                    return that.select(`.${inputId} option:selected`).text();
                },
                getNumber: (inputId) => {
                    const currencyString = that.state.inputs[inputId];
                    if (currencyString == undefined)
                        return undefined;
                    const decimalSeparator = Sys.CultureInfo.CurrentCulture.numberFormat.CurrencyDecimalSeparator;
                    const numberRegEx = new RegExp(`[^\-0-9${decimalSeparator}]+`, "g");
                    var parsedValue = parseFloat(currencyString.replace(numberRegEx, "").replace(decimalSeparator, "."));
                    return !isNaN(parsedValue) ? parsedValue : undefined;
                }
            }, this.options.inputs, this.getSessionStorageInputs()),
            errors: [],
            warnings: [],
            onAll(...values) {
                return values.find(v => (v ?? "") == "" || !isTrue(v)) == undefined;
            },
            onAny(...values) {
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
                    const result = predicate
                        ? getResultTableRows(table, calcEngine, tab).filter(r => predicate(r))
                        : getResultTableRows(table, calcEngine, tab);
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
                    return predicate
                        ? getResultTableRows(table, calcEngine, tab).filter(r => predicate(r)).length > 0
                        : getResultTableRows(table, calcEngine, tab).length > 0;
                }
            },
            model: cloneApplication ? KatApps.Utils.clone(cloneApplication.state.model) : {},
            handlers: cloneApplication ? KatApps.Utils.clone(cloneApplication.state.handlers ?? {}) : {},
            components: {},
            _domElementMounted(el) {
                if (that.el[0].hasAttribute("ka-cloak"))
                    return;
                if (!that.domElementQueue.includes(that.el[0]) && !that.domElementQueue.includes(el)) {
                    let queueElement = true;
                    var i = that.domElementQueue.length;
                    while (i--) {
                        const q = that.domElementQueue[i];
                        if (el.contains(q)) {
                            that.domElementQueue.splice(i, 1);
                        }
                        else if (q.contains(el)) {
                            queueElement = false;
                            i = 0;
                        }
                    }
                    if (queueElement) {
                        that.domElementQueue.push(el);
                    }
                }
                if (!that.domElementQueued) {
                    that.domElementQueued = true;
                    that.updateDomPromise.then(async () => await that.processDomElementsAsync.apply(that));
                }
            },
            _templateItemMounted: (templateId, el, scope) => {
                const mode = el.tagName == "STYLE" || el.hasAttribute("setup") ? "setup" : "mount";
                el.removeAttribute("setup");
                if (mode == "setup") {
                    const oneTimeId = `${templateId}_${el.tagName}_${id}_mount`;
                    if (that.mountedTemplates[oneTimeId] != undefined) {
                        el.remove();
                        return;
                    }
                    that.mountedTemplates[oneTimeId] = true;
                }
                if (el.tagName == "SCRIPT") {
                    new Function("_a", "_s", el.textContent + "\nif ( typeof mounted !== 'undefined' ) mounted(_a, _s);")(that, scope);
                    el.remove();
                }
                else if (el.tagName == "STYLE") {
                    el.outerHTML = el.outerHTML.replace(/thisApplication/g, this.applicationCss);
                }
            },
            _templateItemUnmounted: (templateId, el, scope) => {
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
    getCloneApplication(options) {
        const cloneHost = options.cloneHost ?? false;
        const cloneApplication = typeof cloneHost == "string"
            ? KatApp.get(cloneHost)
            : cloneHost === true ? this.options.hostApplication : undefined;
        return cloneApplication;
    }
    async triggerEventAsync(eventName, ...args) {
        KatApps.Utils.trace(this, "KatApp", "triggerEventAsync", `Start: ${eventName}.`, TraceVerbosity.Detailed);
        try {
            if (eventName == "calculation" || eventName == "configureUICalculation") {
                await PetiteVue.nextTick();
            }
            const isReturnable = (result) => result != undefined && typeof (result) == "boolean" && ["modalAppInitialized", "calculateStart", "apiStart"].indexOf(eventName) > -1 && !result;
            const eventArgs = [...args, this];
            for (const eventConfiguration of this.eventConfigurations.concat(KatApp.globalEventConfigurations.filter(e => e.selector.split(",").map(s => s.trim()).indexOf(this.selector) > -1).map(e => e.events))) {
                try {
                    let delegateResult = eventConfiguration[eventName]?.apply(this.el, eventArgs);
                    if (delegateResult instanceof Promise) {
                        delegateResult = await delegateResult;
                    }
                    if (isReturnable(delegateResult)) {
                        return delegateResult;
                    }
                }
                catch (error) {
                    if (!(error instanceof ApiError)) {
                        KatApps.Utils.trace(this, "KatApp", "triggerEventAsync", `Error calling ${eventName}: ${error}`, TraceVerbosity.None, error);
                        this.addUnexpectedError(error);
                    }
                }
            }
            return true;
        }
        finally {
            KatApps.Utils.trace(this, "KatApp", "triggerEventAsync", `Complete: ${eventName}.`, TraceVerbosity.Detailed);
        }
    }
    configure(configAction) {
        if (this.isMounted) {
            throw new Error("You cannot call 'configure' after the KatApp has been mounted.");
        }
        const config = {
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
        return this;
    }
    handleEvents(configAction) {
        const config = {};
        configAction(config, this.state.rbl, this.state.model, this.state.inputs, this.state.handlers);
        this.eventConfigurations.push(config);
        return this;
    }
    async mountAsync() {
        try {
            KatApps.Utils.trace(this, "KatApp", "mountAsync", `Start`, TraceVerbosity.Detailed);
            if (this.options.view != undefined) {
                this.el.attr("data-view-name", this.options.view);
            }
            const viewElement = await this.getViewElementAsync();
            this.viewTemplates = viewElement != undefined
                ? [...(await this.getViewTemplatesAsync(viewElement)), this.id].reverse()
                : [this.id];
            KatApps.Utils.trace(this, "KatApp", "mountAsync", `View Templates Complete`, TraceVerbosity.Detailed);
            const inputs = this.options.inputs;
            const processInputTokens = (value) => {
                if (value == undefined)
                    return value;
                return value.replace(/{([^}]+)}/g, function (match, token) {
                    return inputs?.[token] ?? match;
                });
            };
            const cloneApplication = this.getCloneApplication(this.options);
            this.options.hostApplication = this.options.hostApplication ?? cloneApplication;
            function calcEngineFactory(c, pipelineIndex) {
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
                        enabled: ((enabled?.startsWith("!!") ?? false) ? eval(enabled.substring(2)) : enabled) != "false"
                    }
                    : {
                        key: `pipeline${pipelineIndex}`,
                        name: processInputTokens(c.getAttribute("name")) ?? "UNAVAILABLE",
                        inputTab: c.getAttribute("input-tab"),
                        resultTab: processInputTokens(c.getAttribute("result-tab"))
                    };
            }
            ;
            this.calcEngines = cloneApplication == undefined && viewElement != undefined
                ? Array.from(viewElement.querySelectorAll("rbl-config > calc-engine")).map(c => calcEngineFactory(c))
                : cloneApplication ? [...cloneApplication.calcEngines.filter(c => !c.manualResult)] : [];
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
                }
                catch (e) {
                    KatApps.Utils.trace(this, "KatApp", "mountAsync", `Error downloading resourceStrings ${this.options.resourceStringsEndpoint}`, TraceVerbosity.None, e);
                }
                if (this.options.debug.debugResourcesDomain) {
                    const currentOptions = this.options;
                    currentOptions.useLocalRepository = currentOptions.useLocalRepository || await KatApps.Utils.checkLocalServerAsync(this.options);
                    if (currentOptions.useLocalRepository) {
                        const devResourceStrings = await KatApps.Utils.downloadLocalServerAsync(currentOptions.debug.debugResourcesDomain, "/js/dev.ResourceStrings.json");
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
                }
                catch (e) {
                    KatApps.Utils.trace(this, "KatApp", "mountAsync", `Error downloading manualResults ${this.options.manualResultsEndpoint}`, TraceVerbosity.None, e);
                }
            }
            if (viewElement != undefined) {
                if (this.options.hostApplication != undefined && this.options.inputs?.iModalApplication == "1") {
                    if (this.options.content != undefined) {
                        if (typeof this.options.content == "string") {
                            this.select(".modal-body").html(this.options.content);
                        }
                        else {
                            this.select(".modal-body").append(this.options.content);
                        }
                        this.select("[data-bs-toggle='tooltip'], [data-bs-toggle='popover']").removeAttr("ka-init-tip");
                    }
                    else {
                        this.select(".modal-body").append(viewElement);
                    }
                }
                else {
                    $(this.el).append(viewElement);
                }
            }
            KatApps.Components.initializeCoreComponents(this, name => this.getTemplateId(name));
            Object.defineProperties(this.state.model, Object.getOwnPropertyDescriptors(this.configureOptions?.model ?? {}));
            Object.defineProperties(this.state.handlers, Object.getOwnPropertyDescriptors(this.configureOptions?.handlers ?? {}));
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
                    this.select(".modal-footer-buttons button").remove();
                    this.select(".modal-footer-buttons").attr("v-scope", "components.template({name: '" + this.options.modalAppOptions.buttonsTemplate + "'})");
                }
                if (this.options.modalAppOptions?.headerTemplate != undefined) {
                    this.select(".modal-body")
                        .prev()
                        .attr("v-scope", "components.template({name: '" + this.options.modalAppOptions.headerTemplate + "'})")
                        .children().remove();
                }
                await this.options.hostApplication.triggerEventAsync("modalAppInitialized", this);
            }
            if (isNestedApplication) {
                await this.options.hostApplication.triggerEventAsync("nestedAppInitialized", this);
            }
            await this.triggerEventAsync("initialized");
            if (this.options.manualResults != undefined) {
                const hasCalcEngines = this.calcEngines.length > 0;
                this.calcEngines.push(...this.toCalcEngines(this.options.manualResults));
                const tabDefs = this.options.manualResults.map(r => ({ CalcEngine: r["@calcEngine"], TabDef: r }));
                const manualResultTabDefs = this.toTabDefs(tabDefs);
                if (!hasCalcEngines) {
                    const getSubmitApiConfigurationResults = await this.getSubmitApiConfigurationAsync(async (submitApiOptions) => {
                        await this.triggerEventAsync("updateApiOptions", submitApiOptions, this.getApiUrl(this.options.calculationUrl).endpoint);
                    }, {}, true);
                    await this.triggerEventAsync("resultsProcessing", manualResultTabDefs, getSubmitApiConfigurationResults.inputs, getSubmitApiConfigurationResults.configuration);
                }
                await this.processResultsAsync(manualResultTabDefs, undefined);
            }
            this.initializeInspector();
            const isConfigureUICalculation = this.calcEngines.filter(c => c.allowConfigureUi && c.enabled && !c.manualResult).length > 0;
            if (cloneApplication == undefined && this.state.errors.length == 0 && isConfigureUICalculation) {
                this.handleEvents(events => {
                    events.calculationErrors = async (key, exception) => {
                        if (key == "SubmitCalculation.ConfigureUI") {
                            this.addUnexpectedError(exception);
                            KatApps.Utils.trace(this, "KatApp", "mountAsync", isModalApplication ? "KatApp Modal Exception" : "KatApp Exception", TraceVerbosity.None, exception);
                        }
                    };
                });
                await this.calculateAsync({ _iConfigureUI: "1", iConfigureUI: "1", iDataBind: "1" });
            }
            if (isModalApplication) {
                const modalAppInitialized = await this.triggerEventAsync("modalAppInitialized") ?? true;
                if (!modalAppInitialized) {
                    this.options.modalAppOptions.promise.resolve({ confirmed: false, response: undefined, modalApp: this });
                    this.el.remove();
                    KatApp.remove(this);
                    this.options.hostApplication.unblockUI();
                    return;
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
            this.el.removeAttr("ka-cloak");
            await this.processDomElementsAsync();
            this.state.inputsChanged = false;
            await this.triggerEventAsync("rendered", initializationErrors ? this.state.errors : undefined);
            if (this.options.hostApplication != undefined && this.options.inputs?.iNestedApplication == "1") {
                await this.options.hostApplication.triggerEventAsync("nestedAppRendered", this, initializationErrors ? this.state.errors : undefined);
            }
        }
        catch (ex) {
            if (ex instanceof KatApps.KamlRepositoryError) {
                KatApps.Utils.trace(this, "KatApp", "mountAsync", "Error during resource download", TraceVerbosity.None, ...ex.results.map(r => `${r.resource}: ${r.errorMessage}`));
            }
            throw ex;
        }
        finally {
            KatApps.Utils.trace(this, "KatApp", "mountAsync", `Complete`, TraceVerbosity.Detailed);
        }
    }
    initializeInspector() {
        if (this.options.debug.showInspector != "0") {
            $(document.body)
                .off("keydown.ka")
                .on("keydown.ka", function (e) {
                if (e.ctrlKey && e.shiftKey) {
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
                        ];
                        const getInspectorOptions = () => {
                            const promptMessage = `What do you want to inspect?

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
                                : (+r < inspectorMappings.length ? inspectorMappings[+r] : undefined));
                            document.body.classList.add('ka-inspector', ...options.filter(o => o != undefined).map(o => `ka-inspector-${o.class ?? o.name}`));
                        }
                    }
                }
            });
        }
    }
    createModalContainer() {
        const options = this.options.modalAppOptions = KatApps.Utils.extend({
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
        }, this.options.modalAppOptions);
        options.labels.title = this.getLocalizedString(options.labels.title);
        options.labels.continue = this.getLocalizedString(options.labels.continue);
        options.labels.cancel = this.getLocalizedString(options.labels.cancel);
        const cssCancel = options.css.cancel;
        const cssContinue = options.css.continue;
        const viewName = this.options.view ??
            (this.options.modalAppOptions.contentSelector != undefined ? `selector: ${this.options.modalAppOptions.contentSelector}` : "static content");
        const modal = $(`<div v-scope class="modal fade kaModal" tabindex="-1" aria-modal="true" aria-labelledby="kaModalLabel" role="dialog" data-bs-backdrop="static"
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
					<button v-if="application.options.modalAppOptions.showCancel" type="button" :class="[\'${cssCancel}\', \'cancelButton\', { disabled: uiBlocked}]">${options.labels.cancel}</button>
					<button type="button" :class="[\'${cssContinue}\', \'continueButton\', { disabled: uiBlocked}]">${options.labels.continue}</button>
				</div>
			</div>
		</div>
	</div>
</div>`);
        if (options.scrollable) {
            $(".modal-dialog", modal).addClass("modal-dialog-scrollable");
            $(".modal-body", modal).attr("tabindex", "0");
        }
        if (options.size != undefined) {
            $(".modal-dialog", modal).addClass("modal-dialog-centered modal-" + options.size);
        }
        if (this.options.modalAppOptions.view != undefined) {
            $("[ka-id]").first().after(modal);
        }
        else {
            this.options.hostApplication.el.append(modal);
        }
        return modal;
    }
    async showModalApplicationAsync() {
        const d = $.Deferred();
        if (this.el.hasClass("show")) {
            console.log("When this is hit, document why condition is there");
            debugger;
            d.resolve(true);
            return d;
        }
        const options = this.options.modalAppOptions;
        const that = this;
        let katAppModalClosing = false;
        const closeModal = function () {
            katAppModalClosing = true;
            KatApps.HelpTips.hideVisiblePopover();
            modalBS5.hide();
            that.el.remove();
            KatApp.remove(that);
            options.triggerLink?.focus();
        };
        options.confirmedAsync = async (response) => {
            closeModal();
            if (options.calculateOnConfirm != undefined) {
                const calculateOnConfirm = (typeof options.calculateOnConfirm == 'boolean') ? options.calculateOnConfirm : true;
                const calculationInputs = (typeof options.calculateOnConfirm == 'object') ? options.calculateOnConfirm : undefined;
                if (calculateOnConfirm) {
                    await that.options.hostApplication.calculateAsync(calculationInputs, true, undefined, false);
                }
            }
            options.promise.resolve({ confirmed: true, response: response instanceof Event ? undefined : response, modalApp: that });
        };
        options.cancelled = response => {
            closeModal();
            options.promise.resolve({ confirmed: false, response: response instanceof Event ? undefined : response, modalApp: that });
        };
        const isInvalid = this.state.errors.length > 0;
        const hasCustomHeader = options.headerTemplate != undefined;
        const hasCustomButtons = options.buttonsTemplate != undefined;
        const tryCancelClickOnClose = hasCustomButtons || (options.showCancel ?? true);
        const closeButtonClickAsync = async (e) => {
            if (!katAppModalClosing) {
                e.preventDefault();
                if (isInvalid) {
                    options.cancelled();
                }
                else if (options.closeButtonTrigger != undefined) {
                    that.select(options.closeButtonTrigger)[0].click();
                }
                else if (tryCancelClickOnClose) {
                    if (that.select(".modal-footer-buttons .cancelButton").length == 1) {
                        that.select(".modal-footer-buttons .cancelButton")[0].click();
                    }
                    else {
                        options.cancelled();
                    }
                }
                else {
                    if (that.select(".modal-footer-buttons .continueButton").length == 1) {
                        that.select(".modal-footer-buttons .continueButton")[0].click();
                    }
                    else {
                        await options.confirmedAsync();
                    }
                }
            }
        };
        this.select('.modal-invalid-footer-buttons .continueButton, .modal-header.invalid-content .btn-close').on("click.ka", async (e) => {
            e.preventDefault();
            options.cancelled();
        });
        if (!hasCustomHeader && options.allowKeyboardDismiss != false) {
            this.select(".modal-header.valid-content .btn-close").on("click.ka", async (e) => await closeButtonClickAsync(e));
        }
        if (!hasCustomButtons) {
            this.select('.modal-footer-buttons .continueButton').on("click.ka", async (e) => {
                e.preventDefault();
                await options.confirmedAsync();
            });
            this.select('.modal-footer-buttons .cancelButton').on("click.ka", function (e) {
                e.preventDefault();
                options.cancelled();
            });
        }
        this.el
            .on("shown.bs.modal", () => {
            that.select(".modal-footer-buttons, .modal-invalid-footer-buttons").removeClass("d-none");
            d.resolve(true);
        })
            .on("hide.bs.modal", async (e) => {
            if (KatApps.HelpTips.hideVisiblePopover()) {
                e.preventDefault();
                return;
            }
            await closeButtonClickAsync(e);
        });
        const modalBS5 = new bootstrap.Modal(this.el[0]);
        modalBS5.show(options.triggerLink);
        if (options.triggerLink != undefined) {
            options.triggerLink.removeAttribute("disabled");
            options.triggerLink.classList.remove("disabled", "kaModalInit");
            $("body").removeClass("kaModalInit");
        }
        this.options.hostApplication.unblockUI();
        return d;
    }
    async navigateAsync(navigationId, options) {
        if (options?.inputs != undefined) {
            const cachingKey = navigationId == undefined
                ? "katapp:navigationInputs:global"
                : options.persistInputs ?? false
                    ? "katapp:navigationInputs:" + navigationId.split("?")[0] + ":" + (this.options.userIdHash ?? "Everyone")
                    : "katapp:navigationInputs:" + navigationId.split("?")[0];
            sessionStorage.setItem(cachingKey, JSON.stringify(options.inputs));
        }
        await this.options.katAppNavigate?.(navigationId);
    }
    async calculateAsync(customInputs, processResults = true, calcEngines, allowLogging = true) {
        const isConfigureUICalculation = customInputs?._iConfigureUI === "1";
        if (!isConfigureUICalculation) {
            this.traceStart = this.traceLast = new Date();
        }
        KatApps.Utils.trace(this, "KatApp", "calculateAsync", `Start: ${(calcEngines ?? this.calcEngines).map(c => c.name).join(", ")}`, TraceVerbosity.Detailed);
        try {
            const apiUrl = this.getApiUrl(this.options.calculationUrl);
            const serviceUrl = apiUrl.url;
            const getSubmitApiConfigurationResults = await this.getSubmitApiConfigurationAsync(async (submitApiOptions) => {
                await this.triggerEventAsync("updateApiOptions", submitApiOptions, apiUrl.endpoint);
            }, customInputs, true);
            getSubmitApiConfigurationResults.configuration.allowLogging = allowLogging;
            if (!processResults) {
                const calculationResults = await KatApps.Calculation.calculateAsync(this, serviceUrl, calcEngines ?? this.calcEngines, getSubmitApiConfigurationResults.inputs, getSubmitApiConfigurationResults.configuration);
                return this.toTabDefs(calculationResults.flatMap(r => r.TabDefs.map(t => ({ CalcEngine: r.CalcEngine, TabDef: t }))));
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
                    const calculationResults = await KatApps.Calculation.calculateAsync(this, serviceUrl, isConfigureUICalculation
                        ? this.calcEngines.filter(c => c.allowConfigureUi)
                        : this.calcEngines, inputs, submitApiConfiguration);
                    const results = this.toTabDefs(calculationResults.flatMap(r => r.TabDefs.map(t => ({ CalcEngine: r.CalcEngine, TabDef: t }))));
                    await this.cacheInputsAsync(inputs);
                    await this.triggerEventAsync("resultsProcessing", results, inputs, submitApiConfiguration);
                    await this.processResultsAsync(results, getSubmitApiConfigurationResults);
                    this.lastCalculation = {
                        inputs: inputs,
                        results: results,
                        diagnostics: calculationResults.find(r => r.Diagnostics != undefined)
                            ? calculationResults.flatMap(r => r.Diagnostics)
                            : undefined,
                        configuration: submitApiConfiguration
                    };
                    if (!isConfigureUICalculation) {
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
                            KatApps.Utils.trace(this, "KatApp", "calculateAsync", `Exception: ${(error instanceof Error ? error.message : error + "")}`, TraceVerbosity.None, error);
                        }
                    }
                    await this.triggerEventAsync("calculationErrors", "SubmitCalculation" + (isConfigureUICalculation ? ".ConfigureUI" : ""), error instanceof Error ? error : undefined);
                }
                finally {
                    if (!isConfigureUICalculation) {
                        await this.triggerEventAsync("calculateEnd");
                    }
                    delete this.state.inputs.iInputTrigger;
                    this.isCalculating = false;
                    this.unblockUI();
                }
            }
        }
        finally {
            KatApps.Utils.trace(this, "KatApp", "calculateAsync", `Complete: ${(calcEngines ?? this.calcEngines).map(c => c.name).join(", ")}`, TraceVerbosity.Detailed);
        }
    }
    async notifyAsync(from, name, information) {
        await this.triggerEventAsync("notification", name, information, from);
    }
    checkValidity() {
        let isValid = true;
        this.select("input").each((i, e) => {
            if (e.checkValidity() === false) {
                isValid = false;
            }
        });
        return isValid;
    }
    async apiAsync(endpoint, apiOptions, trigger, calculationSubmitApiConfiguration) {
        if (!(apiOptions?.skipValidityCheck ?? false) && !this.checkValidity()) {
            throw new ValidityError();
        }
        if (!this.el[0].hasAttribute("ka-cloak")) {
            this.traceStart = this.traceLast = new Date();
        }
        apiOptions = apiOptions ?? {};
        const isDownload = apiOptions.isDownload ?? false;
        this.blockUI();
        this.state.errors = [];
        this.state.warnings = [];
        let successResponse = undefined;
        let errorResponse = undefined;
        const apiUrl = this.getApiUrl(endpoint);
        try {
            const getSubmitApiConfigurationResults = calculationSubmitApiConfiguration ??
                await this.getSubmitApiConfigurationAsync(async (submitApiOptions) => {
                    await this.triggerEventAsync("updateApiOptions", submitApiOptions, apiUrl.endpoint);
                }, apiOptions.calculationInputs, false);
            const calcEngine = this.calcEngines.find(c => !c.manualResult);
            const inputPropertiesToSkip = ["tables", "getNumber", "getOptionText"];
            const optionPropertiesToSkip = ["manualResults", "manualResultsEndpoint", "resourceStrings", "resourceStringsEndpoint", "modalAppOptions", "hostApplication", "relativePathTemplates", "handlers", "nextCalculation", "katAppNavigate", "decryptCache", "encryptCache"];
            const submitData = {
                inputs: KatApps.Utils.clone(getSubmitApiConfigurationResults.inputs ?? {}, (k, v) => inputPropertiesToSkip.indexOf(k) > -1 ? undefined : v?.toString()),
                inputTables: getSubmitApiConfigurationResults.inputs.tables?.map(t => ({ name: t.name, rows: t.rows })),
                apiParameters: apiOptions.apiParameters,
                configuration: KatApps.Utils.extend(KatApps.Utils.clone(this.options, (k, v) => optionPropertiesToSkip.indexOf(k) > -1 ? undefined : v), apiOptions.calculationInputs != undefined ? { inputs: apiOptions.calculationInputs } : undefined, calcEngine != undefined
                    ? {
                        calcEngines: [
                            {
                                name: calcEngine.name,
                                inputTab: calcEngine.inputTab,
                                resultTabs: calcEngine.resultTabs,
                                pipeline: calcEngine.pipeline
                            }
                        ]
                    }
                    : { calcEngines: [] }, getSubmitApiConfigurationResults.configuration)
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
                    .forEach((f, i) => {
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
                const blob = successResponse;
                let filename = "Download.pdf";
                const disposition = response.headers.get('Content-Disposition');
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    filename = disposition.split('filename=')[1].split(';')[0].replace(/"/g, '');
                }
                this.downloadBlob(blob);
            }
            else if (apiOptions.calculateOnSuccess != undefined) {
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
        }
        catch (e) {
            errorResponse = e ?? {};
            if (errorResponse.errors != undefined) {
                for (var id in errorResponse.errors) {
                    this.state.errors.push({ id: id, text: this.getLocalizedString(errorResponse.errors[id][0]), dependsOn: errorResponse.errorsDependsOn?.[id] });
                }
            }
            if (errorResponse.warnings != undefined) {
                for (var id in errorResponse.warnings) {
                    this.state.warnings.push({ id: id, text: this.getLocalizedString(errorResponse.warnings[id][0]), dependsOn: errorResponse.warningsDependsOn?.[id] });
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
            this.nextCalculation.saveLocations = this.nextCalculation.saveLocations.filter(l => !l.serverSideOnly);
            this.unblockUI();
        }
    }
    addUnexpectedError(errorResponse) {
        this.state.errors.push(errorResponse.requestId != undefined
            ? { id: "System", text: this.getLocalizedString("KatApps.AddUnexpectedErrorWithRequestId", errorResponse, "We apologize for the inconvenience, but we are unable to process your request at this time. The system has recorded technical details of the issue and our engineers are working on a solution.  Please contact Customer Service and provide the following Request ID: {{requestId}}") }
            : { id: "System", text: this.getLocalizedString("KatApps.AddUnexpectedError", undefined, "We apologize for the inconvenience, but we are unable to process your request at this time. The system has recorded technical details of the issue and our engineers are working on a solution.") });
    }
    downloadBlob(blob) {
        const tempEl = document.createElement("a");
        tempEl.classList.add("d-none");
        const url = window.URL.createObjectURL(blob);
        tempEl.href = url;
        tempEl.target = "_blank";
        tempEl.click();
    }
    getApiUrl(endpoint) {
        const urlParts = this.options.calculationUrl.split("?");
        const endpointParts = endpoint.split("?");
        var qsAnchored = KatApps.Utils.parseQueryString(this.options.anchoredQueryStrings ?? (urlParts.length == 2 ? urlParts[1] : undefined));
        var qsEndpoint = KatApps.Utils.parseQueryString(endpointParts.length == 2 ? endpointParts[1] : undefined);
        var qsUrl = KatApps.Utils.extend(qsAnchored, qsEndpoint, { katapp: this.selector ?? this.id });
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
    async processDomElementsAsync() {
        const addUiBlockerWrapper = function (el) {
            if (el.parentElement != undefined) {
                el.parentElement.classList.add("ui-blocker-wrapper");
            }
        };
        for (const el of this.domElementQueue) {
            this.select("a[href='#']", el.tagName == "A" ? el.parentElement : el).off("click.ka").on("click.ka", e => e.preventDefault());
            KatApps.HelpTips.processHelpTips(el);
            this.select('[data-highcharts-chart]', $(el)).each((i, c) => $(c).highcharts().reflow());
            if (el.classList.contains("ui-blocker")) {
                addUiBlockerWrapper(el);
            }
            else {
                this.select(".ui-blocker", $(el)).each((i, e) => {
                    addUiBlockerWrapper(e);
                });
            }
        }
        const elementsProcessed = [...this.domElementQueue];
        this.domElementQueue.length = 0;
        this.domElementQueued = false;
        await this.triggerEventAsync("domUpdated", elementsProcessed);
    }
    getInputValue(name, allowDisabled = false) {
        const el = this.select("." + name);
        if (el.length == 0)
            return undefined;
        if (!allowDisabled && el.prop("disabled"))
            return undefined;
        if (el.length > 1 && el[0].getAttribute("type") == "radio") {
            const v = el.filter((i, o) => o.checked).val();
            return v != undefined ? v + '' : undefined;
        }
        if (el.hasClass("checkbox-list")) {
            const v = Array.from(el.find("input:checked")).map(c => c.value).join(",");
            return (v ?? "") != "" ? v : undefined;
        }
        if (el[0].getAttribute("type") == "checkbox") {
            return el[0].checked ? "1" : "0";
        }
        if (el[0].getAttribute("type") == "file") {
            const files = el[0].files;
            const numFiles = files?.length ?? 1;
            return numFiles > 1 ? numFiles + ' files selected' : el.val().replace(/\\/g, '/').replace(/.*\//, '');
        }
        return el.val();
    }
    setInputValue(name, value, calculate = false) {
        if (value == undefined) {
            delete this.state.inputs[name];
        }
        else {
            this.state.inputs[name] = typeof value == 'boolean'
                ? (value ? "1" : "0")
                : value;
        }
        const el = this.select("." + name);
        if (el.length > 0) {
            const isCheckboxList = el.hasClass("checkbox-list");
            if (el.length > 0 && el[0].getAttribute("type") == "radio") {
                el.prop("checked", false);
                el.filter((i, o) => o.value == value).prop("checked", true);
            }
            else if (isCheckboxList) {
                el.find("input").prop("checked", false);
                if (value != undefined) {
                    const values = value?.split(",");
                    el.find("input:checked").each((i, c) => {
                        if (values.indexOf(c.value)) {
                            c.checked = true;
                        }
                    });
                }
            }
            else if (el[0].getAttribute("type") == "checkbox") {
                el[0].checked = typeof value == 'boolean' ? value : value == "1";
            }
            else {
                el.val(value ?? "");
            }
            if (el[0].getAttribute("type") == "range") {
                el[0].dispatchEvent(new Event('rangeset.ka'));
            }
            if (calculate) {
                const target = isCheckboxList ? el.find("input")[0] : el[0];
                target.dispatchEvent(new Event('change'));
            }
        }
        return el;
    }
    getInputs(customInputs) {
        const inputs = KatApps.Utils.extend({}, this.state.inputs, customInputs);
        delete inputs.getNumber;
        delete inputs.getOptionText;
        return inputs;
    }
    getKatAppId(el) {
        if (el.hasAttribute("ka-id"))
            return el.getAttribute("ka-id") ?? undefined;
        let p = el;
        while ((p = p.parentElement) && p !== document) {
            if (p.hasAttribute("ka-id")) {
                return p.getAttribute("ka-id");
            }
        }
        return undefined;
    }
    on(selector, events, handler, context) {
        const elements = this.select(selector, context);
        elements.on(events, handler);
        return elements;
    }
    off(selector, events, context) {
        const elements = this.select(selector, context);
        elements.off(events);
        return elements;
    }
    inputSelectorRegex = /:input([\w\s.:#=\[\]'^$*|~]*)(?=(,|$))/g;
    replaceInputSelector(selector) {
        return selector.replace(this.inputSelectorRegex, (match, capturedSelectors) => {
            const inputTypes = ['input', 'textarea', 'select', 'button'];
            return inputTypes.map(type => `${type}${capturedSelectors}`).join(', ');
        });
    }
    selectElement(selector, context) {
        const container = context ?? this.el[0];
        const result = container.querySelector(this.replaceInputSelector(selector)) ?? undefined;
        if (result == undefined || context != undefined)
            return result;
        var appId = this.getKatAppId(container);
        return this.getKatAppId(result) == appId ? result : undefined;
    }
    selectElements(selector, context) {
        const container = context ?? this.el[0];
        const result = Array.from(container.querySelectorAll(this.replaceInputSelector(selector)));
        if (context != undefined)
            return result;
        var appId = this.getKatAppId(container);
        return result.filter(e => this.getKatAppId(e) == appId);
    }
    closestElement(element, selector) {
        const c = element.closest(selector) ?? undefined;
        const cAppId = c != undefined ? this.getKatAppId(c) : undefined;
        return cAppId == this.id ? c : undefined;
    }
    select(selector, context) {
        const container = !(context instanceof jQuery) && context != undefined
            ? $(context)
            : context ?? $(this.el);
        var appId = context == undefined
            ? this.id
            : container.attr("ka-id") || container.parents("[ka-id]").attr("ka-id");
        return $(selector, container).filter(function () {
            return $(this).parents("[ka-id]").attr("ka-id") == appId;
        });
    }
    getResourceString(key) {
        const currentUICulture = this.options.currentUICulture ?? "en-us";
        const defaultRegionStrings = this.options.resourceStrings?.["en-us"];
        const defaultLanguageStrings = this.options.resourceStrings?.["en"];
        const cultureStrings = this.options.resourceStrings?.[currentUICulture];
        const baseCultureStrings = this.options.resourceStrings?.[currentUICulture.split("-")[0]];
        const cultureResource = cultureStrings?.[key] ??
            baseCultureStrings?.[key];
        const resource = cultureResource ??
            defaultRegionStrings?.[key] ??
            defaultLanguageStrings?.[key];
        if (resource == undefined) {
            this.missingResources.push(key);
        }
        else if (cultureResource == undefined) {
            this.missingLanguageResources.push(key);
        }
        return typeof resource == "object" ? resource.text : resource;
        ;
    }
    getLocalizedString(key, formatObject, defaultValue) {
        key = key?.replaceAll("<<", "{{").replaceAll(">>", "}}");
        if (key == undefined)
            return defaultValue;
        if (key.startsWith("{") && key.endsWith("}")) {
            formatObject = new Function(`{return (${key})}`)();
            key = formatObject.key;
        }
        const hasFormatObject = formatObject != null && Object.keys(formatObject).some(k => k != "key");
        let resourceString = this.getResourceString(key);
        const resourceDefault = (arguments.length == 3 ? defaultValue : key);
        if (resourceString == undefined && defaultValue == undefined && key.indexOf("^") > -1) {
            const keyParts = key.split("^");
            const templateString = this.getResourceString(keyParts[0]) ?? keyParts[0];
            const templateArgs = keyParts.slice(1);
            const regex = /\{(\d+):([^{}]+)\}/g;
            const dateRegex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:T.*)?/;
            const numberRegex = /^-?\d+(\.\d+)?$/;
            const matches = templateString.matchAll(regex);
            for (const match of matches) {
                const index = +match[1];
                const arg = templateArgs[index];
                const dateMatch = arg.match(dateRegex);
                if (dateMatch != undefined) {
                    templateArgs[index] = new Date(parseInt(dateMatch.groups.year), parseInt(dateMatch.groups.month) - 1, parseInt(dateMatch.groups.day));
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
        if (resource == undefined)
            return undefined;
        return hasFormatObject
            ? String.formatTokens(resource, formatObject?.keyValueObject ?? formatObject)
            : resource;
    }
    getTemplateContent(name) {
        const templateId = this.getTemplateId(name);
        return document.querySelector(templateId).content;
    }
    getTemplateId(name) {
        let templateId;
        for (let i = 0; i < this.viewTemplates.length; i++) {
            const viewTemplate = this.viewTemplates[i];
            const tid = "#" + name + "_" + viewTemplate.replace(/\//g, "_");
            if (document.querySelector(tid) != undefined) {
                templateId = tid;
                break;
            }
        }
        if (templateId == undefined && this.options.hostApplication != undefined) {
            templateId = this.options.hostApplication.getTemplateId(name);
        }
        if (templateId == undefined) {
            KatApps.Utils.trace(this, "KatApp", "getTemplateId", `Unable to find template: ${name}.`, TraceVerbosity.Normal);
        }
        return templateId;
    }
    get nextCalculation() {
        let app = this;
        while (app.options.hostApplication != undefined) {
            app = app.options.hostApplication;
        }
        const cacheValue = sessionStorage.getItem("katapp:debugNext:" + app.selector);
        const debugNext = JSON.parse(cacheValue ?? "{ \"saveLocations\": [], \"expireCache\": false, \"trace\": false }");
        if (cacheValue == undefined) {
            debugNext.originalVerbosity = this.options.debug.traceVerbosity;
        }
        return debugNext;
    }
    set nextCalculation(value) {
        let app = this;
        while (app.options.hostApplication != undefined) {
            app = app.options.hostApplication;
        }
        const cacheKey = "katapp:debugNext:" + app.selector;
        if (value == undefined) {
            sessionStorage.removeItem(cacheKey);
        }
        else {
            sessionStorage.setItem(cacheKey, JSON.stringify(value));
        }
    }
    debugNext(saveLocations, serverSideOnly, trace, expireCache) {
        const debugNext = this.nextCalculation;
        if (typeof (saveLocations) == "boolean") {
            if (!saveLocations) {
                debugNext.saveLocations = [];
            }
        }
        else if ((saveLocations ?? "") != "") {
            const locations = saveLocations.split(",").map(l => l.trim());
            debugNext.saveLocations = [
                ...debugNext.saveLocations.filter(l => locations.indexOf(l.location) == -1),
                ...locations.map(l => ({ location: l, serverSideOnly: serverSideOnly ?? false }))
            ];
        }
        debugNext.trace = trace ?? false;
        if (debugNext.trace) {
            this.options.debug.traceVerbosity = TraceVerbosity.Detailed;
        }
        debugNext.expireCache = expireCache ?? false;
        this.nextCalculation = debugNext;
    }
    blockUI() {
        this.uiBlockCount++;
        this.state.uiBlocked = true;
    }
    unblockUI() {
        this.uiBlockCount--;
        if (this.uiBlockCount <= 0) {
            this.uiBlockCount = 0;
            this.state.uiBlocked = false;
        }
    }
    allowCalculation(ceKey, enabled) {
        const ce = this.calcEngines.find(c => c.key == ceKey);
        if (ce != undefined) {
            ce.enabled = enabled;
        }
    }
    cloneOptions(includeManualResults) {
        const propertiesToSkip = ["handlers", "view", "content", "modalAppOptions", "hostApplication"].concat(includeManualResults ? [] : ["manualResults", "manualResultsEndpoint"]);
        return KatApps.Utils.clone(this.options, (k, v) => propertiesToSkip.indexOf(k) > -1 ? undefined : v);
    }
    getCloneHostSetting(el) {
        let cloneHost = el.hasAttribute("v-pre");
        if (cloneHost) {
            const hostName = el.getAttribute("v-pre") ?? "";
            if (hostName != "") {
                cloneHost = hostName;
            }
        }
        return cloneHost;
    }
    async showModalAsync(options, triggerLink) {
        let cloneHost = false;
        if (options.contentSelector != undefined) {
            await PetiteVue.nextTick();
            const selectContent = this.select(options.contentSelector).first();
            if (selectContent.length == 0) {
                throw new Error(`The content selector (${options.contentSelector}) did not return any content.`);
            }
            cloneHost = this.getCloneHostSetting(selectContent[0]);
            const selectorContent = $("<div/>");
            selectorContent.append(selectContent.contents().clone(true));
            options.content = selectorContent;
        }
        if (options.content == undefined && options.view == undefined) {
            throw new Error("You must provide content or viewId when using showModal.");
        }
        if ($(".kaModal").length > 0) {
            throw new Error("You can not use the showModalAsync method if you have markup on the page already containing the class kaModal.");
        }
        this.blockUI();
        if (triggerLink != undefined) {
            triggerLink.setAttribute("disabled", "true");
            triggerLink.classList.add("disabled", "kaModalInit");
            $("body").addClass("kaModalInit");
        }
        try {
            const previousModalApp = KatApp.get(".kaModal");
            if (previousModalApp != undefined) {
                KatApp.remove(previousModalApp);
            }
            const d = $.Deferred();
            const propertiesToSkip = ["content", "view"];
            const modalOptions = {
                view: options.view,
                content: options.content,
                currentPage: options.view ?? this.options.currentPage,
                hostApplication: this.selector.startsWith("#popover") ? this.options.hostApplication : this,
                cloneHost: cloneHost,
                modalAppOptions: KatApps.Utils.extend({ promise: d, triggerLink: triggerLink }, KatApps.Utils.clone(options, (k, v) => propertiesToSkip.indexOf(k) > -1 ? undefined : v)),
                inputs: {
                    iModalApplication: "1"
                }
            };
            const hostOptions = modalOptions.hostApplication.cloneOptions(options.content == undefined || cloneHost !== false);
            const modalAppOptions = KatApps.Utils.extend(hostOptions, modalOptions, options.inputs != undefined ? { inputs: options.inputs } : undefined);
            if (modalAppOptions.anchoredQueryStrings != undefined && modalAppOptions.inputs != undefined) {
                modalAppOptions.anchoredQueryStrings = KatApps.Utils.generateQueryString(KatApps.Utils.parseQueryString(modalAppOptions.anchoredQueryStrings), key => !key.startsWith("ki-") || modalAppOptions.inputs['i' + key.split('-').slice(1).map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join("")] == undefined);
            }
            delete modalAppOptions.inputs.iNestedApplication;
            await KatApp.createAppAsync(".kaModal", modalAppOptions);
            return d;
        }
        catch (e) {
            this.unblockUI();
            if (triggerLink != undefined) {
                triggerLink.removeAttribute("disabled");
                triggerLink.classList.remove("disabled", "kaModalInit");
                $("body").removeClass("kaModalInit");
            }
            throw e;
        }
    }
    async cacheInputsAsync(inputs) {
        if (this.options.inputCaching) {
            const inputCachingKey = "katapp:cachedInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "EveryOne");
            const cachedInputs = KatApps.Utils.clone(inputs);
            await this.triggerEventAsync("inputsCached", cachedInputs);
            sessionStorage.setItem(inputCachingKey, JSON.stringify(cachedInputs));
        }
    }
    async getSubmitApiConfigurationAsync(triggerEventAsync, customInputs, isCalculation = false) {
        const currentInputs = this.getInputs(customInputs);
        if (currentInputs.tables == undefined) {
            currentInputs.tables = [];
        }
        const submitApiOptions = {
            inputs: currentInputs,
            configuration: {},
            isCalculation: isCalculation
        };
        await triggerEventAsync(submitApiOptions);
        const currentOptions = this.options;
        const submitConfiguration = {
            token: undefined,
            nextCalculation: this.nextCalculation,
            authID: "NODATA",
            adminAuthID: undefined,
            client: currentOptions.dataGroup ?? "KatApp",
            testCE: currentOptions.debug?.useTestCalcEngine ?? false,
            currentPage: currentOptions.currentPage ?? "KatApp:" + (currentOptions.view ?? "UnknownView"),
            requestIP: currentOptions.requestIP ?? "1.1.1.1",
            currentCulture: currentOptions.currentCulture ?? "en-US",
            currentUICulture: currentOptions.currentUICulture ?? "en-US",
            environment: currentOptions.environment ?? "EW.PROD",
            allowLogging: true
        };
        return {
            inputs: submitApiOptions.inputs,
            configuration: KatApps.Utils.extend(submitConfiguration, submitApiOptions.configuration),
            isCalculation: isCalculation
        };
    }
    getCeName(name) {
        return name?.split(".")[0].replace("_Test", "") ?? "";
    }
    toCalcEngines(manualResults) {
        if (manualResults != undefined) {
            const mrCalcEngineTabs = {};
            manualResults.forEach(t => {
                const ceKey = t["@calcEngineKey"];
                if (ceKey == undefined) {
                    throw new Error("manualResults requires a @calcEngineKey attribute specified.");
                }
                let ceName = this.getCeName(t["@calcEngine"] ?? t["@calcEngineKey"]);
                if (this.calcEngines.find(c => !c.manualResult && c.name.toLowerCase() == ceName.toLowerCase()) != undefined) {
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
            const mrCalcEngines = [];
            for (const ceName in mrCalcEngineTabs) {
                const ceInfo = mrCalcEngineTabs[ceName];
                const ce = {
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
    toTabDefs(rbleResults) {
        const calcEngines = this.calcEngines;
        const defaultCEKey = calcEngines[0].key;
        return rbleResults.map(r => {
            const t = r.TabDef;
            const ceName = this.getCeName(r.CalcEngine);
            const configCe = calcEngines.find(c => c.name.toLowerCase() == ceName.toLowerCase());
            if (configCe == undefined) {
                KatApps.Utils.trace(this, "KatApp", "toTabDefs", `Unable to find calcEngine: ${ceName}.  Determine if this should be supported.`, TraceVerbosity.None);
            }
            const ceKey = configCe?.key ?? defaultCEKey;
            const name = t["@name"];
            const tabDef = {
                _ka: {
                    calcEngineKey: ceKey,
                    name: name
                }
            };
            Object.keys(t)
                .forEach(k => {
                if (k.startsWith("@")) {
                    tabDef[k] = t[k];
                }
                else {
                    tabDef[k] = !(t[k] instanceof Array)
                        ? [t[k]]
                        : t[k];
                }
            });
            return tabDef;
        });
    }
    copyTabDefToRblState(ce, tab, rows, tableName) {
        KatApps.Utils.trace(this, "KatApp", "copyTabDefToRblState", `Copy ${rows.length} rows from ${ce}.${tab}.${tableName}`, TraceVerbosity.Diagnostic);
        const key = `${ce}.${tab}`;
        if (this.state.rbl.results[key] == undefined) {
            this.state.rbl.results = Object.assign({}, this.state.rbl.results, { [key]: {} });
        }
        this.state.rbl.results[key] = Object.assign({}, this.state.rbl.results[key], { [tableName]: rows });
    }
    mergeTableToRblState(ce, tab, rows, tableName) {
        KatApps.Utils.trace(this, "KatApp", "mergeTableToRblState", `Merge ${rows.length} rows from ${ce}.${tab}.${tableName}`, TraceVerbosity.Diagnostic);
        if (ce == "_ResultProcessing" && this.calcEngines.length > 0) {
            ce = this.calcEngines[0].key;
            tab = this.calcEngines[0].resultTabs[0];
        }
        const key = `${ce}.${tab}`;
        if (this.state.rbl.results[key] == undefined) {
            this.state.rbl.results = Object.assign({}, this.state.rbl.results, { [key]: {} });
        }
        if (this.state.rbl.results[key][tableName] == undefined) {
            this.state.rbl.results[key] = Object.assign({}, this.state.rbl.results[key], { [tableName]: [] });
        }
        rows.forEach(row => {
            if (tableName == "rbl-skip") {
                row.id = row.key;
                if (row.value == undefined) {
                    row.value = "1";
                }
            }
            const index = this.state.rbl.results[key][tableName].findIndex(r => r.id == row.id);
            if (index > -1) {
                this.state.rbl.results[key][tableName].splice(index, 1, Object.assign({}, this.state.rbl.results[key][tableName][index], row));
            }
            else {
                this.state.rbl.results[key][tableName].splice(this.state.rbl.results[key][tableName].length, 0, row);
            }
        });
    }
    async processResultsAsync(results, calculationSubmitApiConfiguration) {
        KatApps.Utils.trace(this, "KatApp", "processResultsAsync", `Start: ${results.map(r => `${r._ka.calcEngineKey}.${r._ka.name}`).join(", ")}`, TraceVerbosity.Detailed);
        const processResultColumn = (row, colName, isRblInputTable) => {
            if (typeof (row[colName]) === "object") {
                KatApps.Utils.trace(this, "KatApp", "processResultColumn", `Convert ${colName} from object to string.`, TraceVerbosity.Diagnostic);
                const metaRow = row;
                const metaSource = metaRow[colName];
                const metaDest = (metaRow["@" + colName] = {});
                Object.keys(metaSource)
                    .filter(k => k != "#text")
                    .forEach(p => {
                    metaDest[p.substring(1)] = metaSource[p];
                });
                row[colName] = metaSource["#text"] ?? "";
            }
            const value = row[colName];
            if (isRblInputTable && value == "" && row["@" + colName]?.["@text-forced"] != "true") {
                row[colName] = undefined;
            }
            if (value == undefined && !isRblInputTable) {
                row[colName] = "";
            }
        };
        const tablesToMerge = ["rbl-disabled", "rbl-display", "rbl-skip", "rbl-value", "rbl-listcontrol", "rbl-input"];
        results.forEach(t => {
            Object.keys(t)
                .filter(k => !k.startsWith("@") && k != "_ka" && k != "ItemDefs")
                .forEach(tableName => {
                const rows = (t[tableName] ?? []);
                if (rows.length > 0) {
                    const isRblInputTable = tableName == "rbl-input";
                    const colNames = Object.keys(rows[0]);
                    rows.forEach(r => {
                        colNames.forEach(c => processResultColumn(r, c, isRblInputTable));
                        switch (tableName) {
                            case "rbl-defaults":
                                this.setInputValue(r.id, r["value"]);
                                break;
                            case "rbl-input":
                                if (r["value"] != undefined) {
                                    this.setInputValue(r.id, r["value"]);
                                }
                                if ((r["error"] ?? "") != "") {
                                    const v = { id: r.id, text: this.getLocalizedString(r.error), dependsOn: r.dependsOn };
                                    this.state.errors.push(v);
                                }
                                if ((r["warning"] ?? "") != "") {
                                    const v = { id: r.id, text: this.getLocalizedString(r.warning), dependsOn: r.dependsOn };
                                    this.state.warnings.push(v);
                                }
                                break;
                            case "errors":
                                r.text = this.getLocalizedString(r.text);
                                this.state.errors.push(r);
                                break;
                            case "warnings":
                                r.text = this.getLocalizedString(r.text);
                                this.state.warnings.push(r);
                                break;
                            case "table-output-control":
                                if ((r["export"] == "-1" || r["export"] == "1") && t[r.id] == undefined) {
                                    this.copyTabDefToRblState(t._ka.calcEngineKey, t._ka.name, [], r.id);
                                }
                                break;
                        }
                    });
                }
            });
            (t["rbl-input"] ?? []).filter(r => (r["list"] ?? "") != "").map(r => ({ input: r.id, list: r.list })).concat((t["rbl-listcontrol"] ?? []).map(r => ({ input: r.id, list: r.table }))).forEach(r => {
                if (t[r.list] != undefined) {
                    const values = t[r.list].map(l => l.key);
                    const inputValue = this.state.inputs[r.input];
                    if (values.indexOf(inputValue ?? "") == -1) {
                        delete this.state.inputs[r.input];
                    }
                }
            });
        });
        const processTabDefs = (insideNextTick) => {
            results.forEach(t => {
                Object.keys(t)
                    .filter(k => {
                    if (k.startsWith("@") || k == "_ka" || k == "ItemDefs")
                        return false;
                    const pushToKey = `${t._ka.calcEngineKey}.${t._ka.name}.${k}`;
                    const pushToIndex = this.pushToTables.indexOf(pushToKey);
                    if (!insideNextTick && pushToIndex > -1)
                        return false;
                    if (insideNextTick && pushToIndex == -1)
                        return false;
                    return true;
                })
                    .forEach(tableName => {
                    const rows = (t[tableName] ?? []);
                    if (tablesToMerge.indexOf(tableName) == -1) {
                        this.copyTabDefToRblState(t._ka.calcEngineKey, t._ka.name, rows, tableName);
                    }
                    else {
                        this.mergeTableToRblState(t._ka.calcEngineKey, t._ka.name, rows, tableName);
                    }
                });
            });
        };
        processTabDefs(false);
        await PetiteVue.nextTick(() => {
            processTabDefs(true);
        });
        this.pushToTables = [];
        await this.processDataUpdateResultsAsync(results, calculationSubmitApiConfiguration);
        this.processDocGenResults(results);
        KatApps.Utils.trace(this, "KatApp", "processResultsAsync", `Complete: ${results.map(r => `${r._ka.calcEngineKey}.${r._ka.name}`).join(", ")}`, TraceVerbosity.Detailed);
    }
    async processDataUpdateResultsAsync(results, calculationSubmitApiConfiguration) {
        const jwtPayload = {
            DataTokens: []
        };
        results
            .forEach(t => {
            (t["jwt-data"] ?? [])
                .filter(r => r.id == "data-updates")
                .forEach(r => {
                jwtPayload.DataTokens.push({ Name: r.id, Token: r.value });
            });
        });
        if (jwtPayload.DataTokens.length > 0) {
            KatApps.Utils.trace(this, "KatApp", "processDataUpdateResultsAsync", `Start (${jwtPayload.DataTokens.length} jwt-data items)`, TraceVerbosity.Detailed);
            await this.apiAsync("rble/jwtupdate", { apiParameters: jwtPayload }, undefined, calculationSubmitApiConfiguration);
            KatApps.Utils.trace(this, "KatApp", "processDataUpdateResultsAsync", `Complete`, TraceVerbosity.Detailed);
        }
    }
    processDocGenResults(results) {
        const base64toBlob = function (base64Data, contentType = 'application/octet-stream', sliceSize = 1024) {
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
        };
        const docGenInstructions = results.flatMap(t => (t["api-actions"] ?? []).filter(r => r["action"] == "DocGen"));
        if (docGenInstructions.length > 0) {
            KatApps.Utils.trace(this, "KatApp", "processDocGenResults", `Start (${docGenInstructions.length} DocGen items)`, TraceVerbosity.Detailed);
            docGenInstructions.forEach(r => {
                const fileName = r["file-name"];
                if (r.exception != undefined) {
                    KatApps.Utils.trace(this, "KatApp", "processDocGenResults", `DocGen Instruction Exception: ${fileName ?? 'File Not Availble'}, ${r.exception})`, TraceVerbosity.None);
                }
                else {
                    const base64 = r.content;
                    const contentType = r["content-type"];
                    const blob = base64toBlob(base64, contentType);
                    this.downloadBlob(blob);
                }
            });
            KatApps.Utils.trace(this, "KatApp", "processDocGenResults", `Complete`, TraceVerbosity.Detailed);
        }
    }
    async getViewElementAsync() {
        const viewElement = document.createElement("div");
        if ((this.options.modalAppOptions != undefined || this.options.inputs?.iNestedApplication == "1") && this.options.view != undefined) {
            const view = this.options.view;
            const apiUrl = this.getApiUrl(`${this.options.kamlVerifyUrl}?applicationId=${view}&currentId=${this.options.hostApplication.options.currentPage}`);
            try {
                const response = await fetch(apiUrl.url, { method: "GET" });
                if (!response.ok) {
                    throw await response.json();
                }
                const data = await response.json();
                KatApps.Utils.extend(this.options, { view: data.path, currentPath: view });
                KatApps.Utils.extend(this.state.inputs, data.manualInputs);
            }
            catch (e) {
                KatApps.Utils.trace(this, "KatApp", "getViewElementAsync", `Error verifying KatApp ${view}`, TraceVerbosity.None, e);
                throw new KatApps.KamlResourceDownloadError("View verification request failed.", view);
            }
        }
        if (this.options.view != undefined) {
            const viewResource = await KatApps.KamlRepository.getViewResourceAsync(this.options, this.options.view);
            KatApps.Utils.trace(this, "KatApp", "getViewElementAsync", `Resource Returned`, TraceVerbosity.Detailed);
            const viewContent = viewResource[this.options.view]
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
            return undefined;
        }
        return viewElement;
    }
    async getViewTemplatesAsync(viewElement) {
        var requiredViewTemplates = (viewElement.querySelector("rbl-config")?.getAttribute("templates")?.split(",") ?? [])
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
            const keyParts = t.split(":");
            return keyParts[keyParts.length - 1].split("?")[0].replace(/\./g, "_");
        });
    }
    getSessionStorageInputs() {
        const inputCachingKey = "katapp:cachedInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "EveryOne");
        const cachedInputsJson = this.options.inputCaching ? sessionStorage.getItem(inputCachingKey) : undefined;
        const cachedInputs = cachedInputsJson != undefined && cachedInputsJson != null ? JSON.parse(cachedInputsJson) : undefined;
        const oneTimeInputsKey = "katapp:navigationInputs:" + this.options.currentPage;
        const oneTimeInputsJson = sessionStorage.getItem(oneTimeInputsKey);
        const oneTimeInputs = oneTimeInputsJson != undefined ? JSON.parse(oneTimeInputsJson) : undefined;
        sessionStorage.removeItem(oneTimeInputsKey);
        const persistedInputsKey = "katapp:navigationInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "Everyone");
        const persistedInputsJson = sessionStorage.getItem(persistedInputsKey);
        const persistedInputs = persistedInputsJson != undefined ? JSON.parse(persistedInputsJson) : undefined;
        const sessionStorageInputs = KatApps.Utils.extend({}, cachedInputs, persistedInputs, oneTimeInputs);
        return sessionStorageInputs;
    }
}
class ApiError extends Error {
    innerException;
    apiResponse;
    constructor(message, innerException, apiResponse) {
        super(message);
        this.innerException = innerException;
        this.apiResponse = apiResponse;
    }
}
class ValidityError extends Error {
    constructor() {
        super("checkValidity failed on one or more inputs");
    }
}
class CalculationError extends Error {
    failures;
    constructor(message, failures) {
        super(message);
        this.failures = failures;
    }
}
var KatApps;
(function (KatApps) {
    class Calculation {
        static async calculateAsync(application, serviceUrl, calcEngines, inputs, configuration) {
            KatApps.Utils.trace(application, "Calculation", "calculateAsync", "Start", TraceVerbosity.Detailed);
            const submitConfiguration = KatApps.Utils.extend({}, configuration, {
                calcEngines: calcEngines.filter(c => !c.manualResult && c.enabled)
                    .map(c => ({
                    name: c.name,
                    inputTab: c.inputTab,
                    resultTabs: c.resultTabs,
                    pipeline: c.pipeline?.map(p => {
                        const ce = { name: p.name, inputTab: p.inputTab, resultTab: p.resultTab };
                        return ce;
                    })
                }))
            });
            const inputPropertiesToSkip = ["tables", "getNumber", "getOptionText"];
            const submitData = {
                inputs: KatApps.Utils.clone(inputs, (k, v) => inputPropertiesToSkip.indexOf(k) > -1 ? undefined : v?.toString()),
                inputTables: inputs.tables?.map(t => ({ name: t.name, rows: t.rows })),
                configuration: submitConfiguration
            };
            const failedResponses = [];
            const successResponses = [];
            try {
                KatApps.Utils.trace(application, "Calculation", "calculateAsync", "Posting Data", TraceVerbosity.Detailed);
                const calculationResults = await this.submitCalculationAsync(application, serviceUrl, inputs, submitData);
                const cachedResults = calculationResults.Results.filter(r => r.CacheKey != undefined && r.Result == undefined);
                for (var i = 0; i < cachedResults.length; i++) {
                    const r = calculationResults.Results[i];
                    const cacheResult = await this.getCacheAsync(`RBLCache:${r.CacheKey}`, application.options.decryptCache);
                    if (cacheResult == undefined) {
                        KatApps.Utils.trace(application, "Calculation", "calculateAsync", `Cache miss for ${r.CalcEngine} with key ${r.CacheKey}`, TraceVerbosity.Detailed);
                    }
                    else {
                        KatApps.Utils.trace(application, "Calculation", "calculateAsync", `Use cache for ${r.CalcEngine}`, TraceVerbosity.Detailed);
                        r.CacheKey = undefined;
                        r.Result = cacheResult;
                    }
                }
                const invalidCacheResults = calculationResults.Results.filter(r => r.CacheKey != undefined && r.Result == undefined);
                if (invalidCacheResults.length > 0) {
                    const retryCalcEngines = invalidCacheResults.map(r => r.CalcEngine);
                    submitData.configuration.calcEngines = submitData.configuration.calcEngines.filter(c => retryCalcEngines.indexOf(c.name) > -1);
                    submitData.configuration.invalidCacheKeys = invalidCacheResults.map(r => r.CacheKey);
                    const retryResults = await this.submitCalculationAsync(application, serviceUrl, inputs, submitData);
                    for (var i = 0; i < retryResults.Results.length; i++) {
                        const rr = retryResults.Results[i];
                        const position = calculationResults.Results.findIndex(r => r.CalcEngine == rr.CalcEngine);
                        calculationResults.Results[position] = rr;
                    }
                }
                if (calculationResults.Results.filter(r => r.CacheKey != undefined && r.Result == undefined).length > 0) {
                    KatApps.Utils.trace(application, "Calculation", "calculateAsync", `Client side cache is invalid.`, TraceVerbosity.Detailed);
                }
                for (var i = 0; i < calculationResults.Results.length; i++) {
                    var r = calculationResults.Results[i];
                    const cacheKey = r.CacheKey;
                    if (cacheKey != undefined) {
                        if (r.Result.Exception != undefined) {
                            KatApps.Utils.trace(application, "Calculation", "calculateAsync", `(RBL exception) Remove cache for ${r.CalcEngine}`, TraceVerbosity.Detailed);
                            sessionStorage.removeItem(`RBLCache:${cacheKey}`);
                        }
                        else {
                            KatApps.Utils.trace(application, "Calculation", "calculateAsync", `Set cache for ${r.CalcEngine}`, TraceVerbosity.Detailed);
                            await this.setCacheAsync(`RBLCache:${cacheKey}`, r.Result, application.options.encryptCache);
                        }
                    }
                }
                const mergedResults = calculationResults;
                mergedResults.Results.filter(r => r.Result.Exception != undefined).forEach(r => {
                    const response = {
                        calcEngine: r.CalcEngine,
                        diagnostics: r.Result.Diagnostics,
                        configuration: submitConfiguration,
                        inputs: inputs,
                        exceptions: [{
                                message: r.Result.Exception.Message,
                                type: r.Result.Exception.Type,
                                traceId: r.Result.Exception.TraceId,
                                requestId: r.Result.Exception.RequestId,
                                stackTrace: r.Result.Exception.StackTrace
                            }]
                    };
                    failedResponses.push(response);
                });
                mergedResults.Results
                    .filter(r => r.Result.Exception == undefined)
                    .forEach(r => {
                    const tabDefs = r.Result.RBL.Profile.Data.TabDef;
                    successResponses.push({
                        CalcEngine: r.CalcEngine,
                        Diagnostics: r.Result.Diagnostics,
                        TabDefs: tabDefs instanceof Array ? tabDefs : [tabDefs]
                    });
                });
                if (failedResponses.length > 0) {
                    throw new CalculationError("Unable to complete calculation(s)", failedResponses);
                }
                return successResponses;
            }
            catch (e) {
                if (e instanceof CalculationError) {
                    throw e;
                }
                const exception = {
                    message: e instanceof Error ? e.message : e + "Unable to submit Calculation to " + serviceUrl,
                    type: e instanceof Error ? e.name : "Error",
                    stackTrace: e instanceof Error
                        ? e.stack?.split("\n") ?? ["No stack available"]
                        : ["Calculation.calculateAsync (rest is missing)"],
                };
                if (!(e instanceof Error)) {
                    console.log("Original calculation exception (should have been instanceof Error):");
                    console.log({ e });
                }
                throw new CalculationError("Unable to complete calculation(s)", [{
                        calcEngine: submitConfiguration.calcEngines.map(c => c.name).join(", "),
                        inputs: inputs,
                        configuration: submitConfiguration,
                        exceptions: [exception]
                    }]);
            }
        }
        static async submitCalculationAsync(application, serviceUrl, inputs, submitData) {
            try {
                let calculationResults = await fetch(serviceUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(submitData)
                }).then(async (response) => {
                    const responseText = await response.text();
                    const result = responseText == "" ? undefined : JSON.parse(responseText);
                    if (!response.ok) {
                        throw result ?? { exceptions: [{ message: "No additional details available." }] };
                    }
                    return result;
                });
                KatApps.Utils.trace(application, "Calculation", "calculateAsync", "Received Success Response", TraceVerbosity.Detailed);
                return calculationResults;
            }
            catch (e) {
                const errorResponse = e;
                const exceptions = errorResponse.exceptions ?? [];
                const response = {
                    calcEngine: submitData.configuration.calcEngines.map(c => c.name).join(", "),
                    configuration: submitData.configuration,
                    inputs: inputs,
                    exceptions: exceptions.map(ex => ({
                        message: ex.message,
                        type: ex.type ?? "Unknown type",
                        traceId: ex.traceId,
                        requestId: ex.requestId,
                        stackTrace: ex.stackTrace,
                        apiResult: errorResponse.apiResult,
                        apiPayload: errorResponse.apiPayload
                    }))
                };
                throw new CalculationError("Unable to complete calculation(s)", [response]);
            }
        }
        static async setCacheAsync(key, data, encryptCache) {
            var cacheResult = encryptCache(data);
            if (cacheResult instanceof Promise) {
                cacheResult = await cacheResult;
            }
            sessionStorage.setItem(key, cacheResult);
        }
        static async getCacheAsync(key, decryptCache) {
            const data = sessionStorage.getItem(key);
            if (data == undefined)
                return undefined;
            let cacheResult = decryptCache(data);
            if (cacheResult instanceof Promise) {
                cacheResult = await cacheResult;
            }
            return cacheResult;
        }
    }
    KatApps.Calculation = Calculation;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class TemplateBase {
        static templateRenderedCount = {};
        getRenderedId(templateId) {
            if (templateId == undefined) {
                return undefined;
            }
            TemplateBase.templateRenderedCount[templateId] = TemplateBase.templateRenderedCount[templateId] == undefined
                ? 1
                : TemplateBase.templateRenderedCount[templateId] + 1;
            return `${templateId.substring(1)}_${TemplateBase.templateRenderedCount[templateId]}`;
        }
    }
    KatApps.TemplateBase = TemplateBase;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class InputComponentBase extends KatApps.TemplateBase {
        static stringCache = Object.create(null);
        static cacheStringFunction = (fn) => {
            return ((str) => {
                const hit = this.stringCache[str];
                return hit ?? (this.stringCache[str] = fn(str));
            });
        };
        addValidityValidation(application, inputName, label, input) {
            if (input.validationMessage != undefined && input.validationMessage != "" &&
                application.state.errors.find(r => r.id.replace(/ /g, "").split(",").indexOf(inputName) != -1) == undefined) {
                application.state.errors.push({ id: inputName, text: `${label(inputName)}: ${input.validationMessage}` });
            }
        }
        removeValidations(application, inputName) {
            application.state.errors = application.state.errors.filter(r => (r.event == "input" || r.id.replace(/ /g, "").split(",").indexOf(inputName) == -1) && (r.dependsOn ?? "").replace(/ /g, "").split(",").indexOf(inputName) == -1);
            application.state.warnings = application.state.warnings.filter(r => (r.event == "input" || r.id.replace(/ /g, "").split(",").indexOf(inputName) == -1) && (r.dependsOn ?? "").replace(/ /g, "").split(",").indexOf(inputName) == -1);
        }
        validationText(application, validations, inputName) {
            var validation = validations.find(r => r.id.replace(/ /g, "").split(",").indexOf(inputName) > -1);
            return validation != undefined ? application.getLocalizedString(validation.text) : undefined;
        }
        errorText(application, inputName) {
            return this.validationText(application, application.state.errors, inputName);
        }
        warningText(application, inputName) {
            return this.validationText(application, application.state.warnings, inputName);
        }
        unmounted(application, input, clearOnUnmount) {
            if (clearOnUnmount || input.hasAttribute("ka-unmount-clears-inputs") || input.closest("[ka-unmount-clears-inputs]") != undefined) {
                const name = input.getAttribute("name");
                if (name != undefined) {
                    delete application.state.inputs[name];
                }
            }
        }
        mounted(application, scope, name, label, input, defaultValue, isExcluded, noCalc, displayFormat, hasMask, mask, maxLength, keypressRegex, events, refs) {
            input.setAttribute("name", name);
            input.classList.add(name);
            if (!input.isConnected) {
                KatApps.Utils.trace(application, "InputComponent", "mounted", `Skipping input mount on ${name} because the input is not connected, consider the order of model properties being set.`, TraceVerbosity.Diagnostic);
                return;
            }
            const type = input.getAttribute("type");
            const radioValue = type == "radio" && input.hasAttribute("checked") ? input.getAttribute("value") : undefined;
            const checkValue = type == "checkbox" ? (input.hasAttribute("checked") ? "1" : "0") : undefined;
            const textValue = type == "text" ? input.getAttribute("value") : undefined;
            const exclude = isExcluded || input.hasAttribute("ka-rbl-exclude") || application.closestElement(input, "[ka-rbl-exclude]") != undefined;
            const skipCalc = input.hasAttribute("ka-rbl-no-calc") || application.closestElement(input, "[ka-rbl-no-calc]") != undefined;
            if (!exclude) {
                let value = defaultValue(name) ?? checkValue ?? radioValue ?? textValue;
                if (application.state.inputs[name] == undefined && value != undefined) {
                    application.state.inputs[name] = value;
                }
                value = application.state.inputs[name];
                if (value != undefined) {
                    application.setInputValue(name, value);
                }
            }
            const removeError = () => this.removeValidations(application, name);
            let debounceTimeout;
            const inputEventAsync = async (calculate, calculateAfterDelay = false) => {
                removeError();
                if (!exclude) {
                    application.state.lastInputChange = Date.now();
                    application.state.inputsChanged = true;
                    application.state.inputs[name] = application.getInputValue(name);
                    if (!skipCalc && !noCalc(name)) {
                        if (calculate) {
                            application.state.inputs.iInputTrigger = name;
                            if (debounceTimeout) {
                                clearTimeout(debounceTimeout);
                            }
                            debounceTimeout = setTimeout(async () => {
                                await application.calculateAsync(undefined, true, undefined, false);
                            }, calculateAfterDelay ? 750 : 0);
                        }
                        else {
                            application.state.needsCalculation = true;
                        }
                    }
                }
                await application.triggerEventAsync("input", name, calculate, input, scope);
            };
            if (type == "date") {
                this.bindDateEvents(application, name, label, input, removeError, inputEventAsync);
            }
            else if (type == "range") {
                this.bindRangeEvents(name, input, refs, displayFormat, inputEventAsync);
            }
            else {
                this.bindInputEvents(application, name, label, input, type, hasMask, mask, maxLength, keypressRegex, inputEventAsync);
            }
            this.bindCustomEvents(application, input, events, scope);
        }
        bindInputEvents(application, name, label, input, type, hasMask, mask, maxLength, keypressRegex, inputEventAsync) {
            input.addEventListener("change", async () => await inputEventAsync(true));
            if (type != "file" && type != "checkbox" && input.tagName != "SELECT") {
                input.addEventListener("input", async () => await inputEventAsync(false));
                input.addEventListener("blur", () => {
                    if (!application.isCalculating) {
                        application.state.needsCalculation = false;
                    }
                });
                if (type != "radio" && input.tagName == "INPUT") {
                    input.addEventListener("invalid", e => this.addValidityValidation(application, name, label, e.target));
                    const inputKeypressRegex = keypressRegex(name);
                    if (inputKeypressRegex != null) {
                        const kpBeforeInputRegex = new RegExp(`[${inputKeypressRegex}]`);
                        input.addEventListener("beforeinput", (event) => {
                            if (event.inputType == "insertText" && event.data != null && !kpBeforeInputRegex.test(event.data)) {
                                event.preventDefault();
                            }
                        });
                        const kpInputRegex = new RegExp(`[^${inputKeypressRegex}]`, "g");
                        input.addEventListener("input", (event) => {
                            const target = event.target;
                            application.setInputValue(name, target.value = target.value.replace(kpInputRegex, ""), false);
                        });
                    }
                    if (hasMask) {
                        const getNumberMaskInfo = function (inputMask) {
                            const allowNegative = inputMask.startsWith("-");
                            const decimalPlacesString = inputMask.substring(allowNegative ? 7 : 6);
                            const decimalPlaces = decimalPlacesString != "" ? +decimalPlacesString : 2;
                            const currencySeparator = Sys.CultureInfo.CurrentCulture.numberFormat.CurrencyDecimalSeparator;
                            const negRegEx = allowNegative ? `\\-` : "";
                            const sepRegEx = decimalPlaces > 0 ? `\\${currencySeparator}` : "";
                            return {
                                allowNegative: allowNegative,
                                decimalPlaces: decimalPlaces,
                                currencySeparator: currencySeparator,
                                keypressRegEx: new RegExp(`[0-9${negRegEx}${sepRegEx}]`, "g"),
                                inputRegEx: new RegExp(`[^0-9${sepRegEx}]+`, "g")
                            };
                        };
                        input.addEventListener("keypress", (event) => {
                            const target = event.target;
                            const inputMask = mask(name);
                            const isNumber = inputMask != undefined && inputMask.indexOf("number") > -1;
                            switch (isNumber ? "number" : inputMask) {
                                case "email":
                                    {
                                        if (event.key.match(/[A-Za-z0-9.@_-]/) === null) {
                                            event.preventDefault();
                                        }
                                        else if (event.key == "@" && target.value.indexOf("@") > -1) {
                                            event.preventDefault();
                                        }
                                        break;
                                    }
                                case "zip+4":
                                case "#####-####":
                                    {
                                        input.setAttribute("maxlength", "10");
                                        if (event.key.match(/[0-9\-]/) === null) {
                                            event.preventDefault();
                                        }
                                        else if (event.key == "-" && input.value.length != 5) {
                                            event.preventDefault();
                                        }
                                        break;
                                    }
                                case "number":
                                    {
                                        const numberMaskInfo = getNumberMaskInfo(inputMask);
                                        const selectionStart = target.selectionStart;
                                        const selectionEnd = target.selectionEnd;
                                        const testValue = selectionStart != null && selectionEnd != null && selectionStart != selectionEnd
                                            ? input.value.substring(0, selectionStart) + input.value.substring(selectionEnd)
                                            : input.value;
                                        if (event.key.match(numberMaskInfo.keypressRegEx) === null) {
                                            event.preventDefault();
                                        }
                                        else if (event.key == numberMaskInfo.currencySeparator && (testValue.indexOf(numberMaskInfo.currencySeparator) > -1 || input.value == "")) {
                                            event.preventDefault();
                                        }
                                        else if (event.key == "-" && (selectionStart != 0 || testValue.indexOf("-") > -1)) {
                                            event.preventDefault();
                                        }
                                        else if (numberMaskInfo.decimalPlaces > 0 && event.key != numberMaskInfo.currencySeparator && event.key != "-") {
                                            const endValue = selectionStart != selectionEnd
                                                ? testValue
                                                : input.value.substring(0, selectionStart) + event.key + input.value.substring(selectionStart);
                                            const parts = endValue.split(numberMaskInfo.currencySeparator);
                                            if (parts.length == 2 && parts[1].length > numberMaskInfo.decimalPlaces) {
                                                event.preventDefault();
                                            }
                                        }
                                        break;
                                    }
                                case "cc-expire":
                                case "MM/YY":
                                    {
                                        input.setAttribute("maxlength", "5");
                                        if (event.key.match(/[0-9\/]/) === null) {
                                            event.preventDefault();
                                        }
                                        else if (event.key == "/" && input.value.length != 2) {
                                            event.preventDefault();
                                        }
                                        break;
                                    }
                                case "phone":
                                case "(###) ###-####":
                                    {
                                        input.setAttribute("maxlength", "14");
                                        if (event.key.match(/[0-9\(\)\-\s]/) === null) {
                                            event.preventDefault();
                                        }
                                        else if (event.key == "(" && input.value != "") {
                                            event.preventDefault();
                                        }
                                        else if (event.key == ")" && input.value.length != 4) {
                                            event.preventDefault();
                                        }
                                        else if (event.key == "-" && input.value.length != 9) {
                                            event.preventDefault();
                                        }
                                        else if (event.key == " " && input.value.length != 5) {
                                            event.preventDefault();
                                        }
                                        break;
                                    }
                                default:
                                    input.setAttribute("maxlength", maxLength(name).toString());
                                    break;
                            }
                        });
                        const kuEmailRegex = new RegExp(`[^A-Za-z0-9.@_-]`, "g");
                        input.addEventListener("input", (event) => {
                            const target = event.target;
                            const inputMask = mask(name) ?? "";
                            const selectionStart = target.selectionStart;
                            const isBackspace = event.inputType == "deleteContentBackward";
                            const isDelete = event.inputType == "deleteContentForward";
                            if (isBackspace && selectionStart == target.value.length) {
                                return;
                            }
                            const isNumber = inputMask != undefined && inputMask.indexOf("number") > -1;
                            switch (isNumber ? "number" : inputMask) {
                                case "email":
                                    {
                                        application.setInputValue(name, target.value = target.value.replace(kuEmailRegex, ""));
                                        break;
                                    }
                                case "zip+4":
                                case "#####-####":
                                    {
                                        target.setAttribute("maxlength", "10");
                                        let input = target.value;
                                        const hasDash = input.indexOf("-") == 5;
                                        input = input.replace(/\D/g, '').substring(0, 9);
                                        const zip = input.substring(0, 5);
                                        const plus4 = input.substring(5, 9);
                                        application.setInputValue(name, target.value = input.length > 5
                                            ? zip + "-" + plus4
                                            : zip + (hasDash ? "-" : ""));
                                        break;
                                    }
                                case "number":
                                    {
                                        const numberMaskInfo = getNumberMaskInfo(inputMask);
                                        let inputValue = target.value;
                                        const isNegative = numberMaskInfo.allowNegative && inputValue.indexOf("-") == 0;
                                        inputValue = inputValue.replace(numberMaskInfo.inputRegEx, '');
                                        const inputParts = inputValue.split(numberMaskInfo.currencySeparator);
                                        let newValue = isNegative ? "-" : "";
                                        if (inputParts.length > 2) {
                                            newValue += inputParts.slice(0, 2).join(numberMaskInfo.currencySeparator);
                                        }
                                        else {
                                            newValue += inputParts[0];
                                            if (inputParts.length > 1) {
                                                newValue += numberMaskInfo.currencySeparator + inputParts[1].substring(0, numberMaskInfo.decimalPlaces);
                                            }
                                        }
                                        application.setInputValue(name, target.value = newValue);
                                        break;
                                    }
                                case "cc-expire":
                                case "MM/YY":
                                    {
                                        target.setAttribute("maxlength", "5");
                                        let input = target.value;
                                        const hasSlash = input.indexOf("/") == 3;
                                        input = input.replace(/\D/g, '').substring(0, 4);
                                        const month = input.substring(0, 2);
                                        const year = input.substring(2);
                                        application.setInputValue(name, target.value = input.length > 2
                                            ? `${month}/${year}`
                                            : month + (hasSlash ? "/" : ""));
                                        break;
                                    }
                                case "phone":
                                case "(###) ###-####":
                                    {
                                        target.setAttribute("maxlength", "14");
                                        let input = target.value;
                                        input = input.replace(/\D/g, '').substring(0, 10);
                                        const area = input.substring(0, 3);
                                        const middle = input.substring(3, 6);
                                        const last = input.substring(6, 10);
                                        if (input.length >= 6) {
                                            target.value = "(" + area + ") " + middle + "-" + last;
                                        }
                                        else if (input.length >= 3) {
                                            target.value = "(" + area + ") " + middle;
                                        }
                                        else if (input.length > 0) {
                                            target.value = "(" + area;
                                        }
                                        application.setInputValue(name, target.value);
                                        break;
                                    }
                                default:
                                    target.setAttribute("maxlength", maxLength(name).toString());
                            }
                            if (isBackspace || isDelete) {
                                target.selectionStart = target.selectionEnd = selectionStart;
                            }
                            const maxLengthValue = +(target.getAttribute("maxlength"));
                            const value = target.value;
                            if (value.length > maxLengthValue) {
                                application.setInputValue(name, target.value = value.slice(0, maxLengthValue));
                            }
                        });
                    }
                }
            }
        }
        static percentFormat = /([/s/S]*?){0:p\d*}/;
        bindRangeEvents(name, input, refs, displayFormat, inputEventAsync) {
            let bubbleTimer;
            const bubble = refs.bubble != undefined ? $(refs.bubble) : undefined;
            const bubbleValue = refs.bubbleValue != undefined ? $(refs.bubbleValue) : bubble;
            const display = refs.display != undefined ? $(refs.display) : undefined;
            const setRangeValues = (showBubble) => {
                if (bubbleTimer) {
                    clearTimeout(bubbleTimer);
                }
                const range = $(input);
                const value = range.val(), valueFormat = displayFormat(name), displayValue = valueFormat != undefined
                    ? String.localeFormat(valueFormat, valueFormat.match(KatApps.InputComponent.percentFormat) ? +value / 100 : +value)
                    : value.toString(), max = +(range.attr("max")), min = +(range.attr("min")), newValue = Number((+value - min) * 100 / (max - min)), newPosition = 10 - (newValue * 0.2);
                if (display != undefined) {
                    display.html(displayValue);
                }
                if (bubble != undefined) {
                    bubbleValue.html(displayValue);
                    if (showBubble) {
                        let displayWidth = 30;
                        if (display != undefined) {
                            const element = display[0];
                            const cs = getComputedStyle(element);
                            const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
                            const borderX = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
                            displayWidth = 15 + element.offsetWidth - paddingX - borderX;
                        }
                        bubbleValue.css("width", `${displayWidth}px`);
                        bubble
                            .css("left", `calc(${newValue}% + (${newPosition}px))`)
                            .addClass("active");
                    }
                }
                range.css("backgroundSize", `${((+value - min) * 100) / (max - min)}% 100%`);
            };
            setRangeValues(false);
            input.addEventListener("input", async () => {
                await inputEventAsync(false);
                setRangeValues(true);
            });
            input.addEventListener("rangeset.ka", () => setRangeValues(false));
            input.addEventListener("change", async () => await inputEventAsync(true, true));
            if (bubble != undefined) {
                input.addEventListener("mouseenter", () => {
                    bubbleTimer = setTimeout(() => {
                        setRangeValues(true);
                    }, 750);
                });
                input.addEventListener("mouseleave", () => {
                    if (bubbleTimer) {
                        clearTimeout(bubbleTimer);
                    }
                    bubble.removeClass("active");
                });
            }
        }
        bindDateEvents(application, name, label, input, removeError, inputEventAsync) {
            const dateChangeAsync = async (e) => {
                const v = application.getInputValue(name);
                if (application.state.inputs[name] != v) {
                    e.currentTarget.dispatchEvent(new Event('value-ka'));
                    await inputEventAsync(true);
                }
            };
            input.addEventListener("invalid", e => this.addValidityValidation(application, name, label, e.target));
            input.addEventListener("change", dateChangeAsync);
            input.addEventListener("keypress", async (e) => {
                removeError();
                if (e.code == "Enter") {
                    await dateChangeAsync(e);
                }
            });
            input.addEventListener("keydown", () => {
                input.removeEventListener("change", dateChangeAsync);
                input.addEventListener("blur", dateChangeAsync);
            });
            input.addEventListener("click", () => {
                input.removeEventListener("blur", dateChangeAsync);
                input.removeEventListener("change", dateChangeAsync);
                input.addEventListener("change", dateChangeAsync);
            });
            input.addEventListener("blur", () => {
                if (!application.isCalculating) {
                    application.state.needsCalculation = false;
                }
            });
        }
        bindCustomEvents(application, input, events, scope) {
            if (events != undefined) {
                for (const propertyName in events) {
                    let arg = propertyName.split(".")[0];
                    const modifiers = this.getModifiers(propertyName);
                    if (modifiers) {
                        const systemModifiers = ['ctrl', 'shift', 'alt', 'meta'];
                        const modifierGuards = {
                            stop: (e) => e.stopPropagation(),
                            prevent: (e) => e.preventDefault(),
                            self: (e) => e.target !== e.currentTarget,
                            ctrl: (e) => !e.ctrlKey,
                            shift: (e) => !e.shiftKey,
                            alt: (e) => !e.altKey,
                            meta: (e) => !e.metaKey,
                            left: (e) => 'button' in e && e.button !== 0,
                            middle: (e) => 'button' in e && e.button !== 1,
                            right: (e) => 'button' in e && e.button !== 2,
                            exact: (e, modifiers) => systemModifiers.some((m) => e[`${m}Key`] && !modifiers[m])
                        };
                        if (arg === 'click') {
                            if (modifiers.right)
                                arg = 'contextmenu';
                            if (modifiers.middle)
                                arg = 'mouseup';
                        }
                        const hyphenate = InputComponentBase.cacheStringFunction(str => {
                            const hyphenateRE = /\B([A-Z])/g;
                            return str.replace(hyphenateRE, '-$1').toLowerCase();
                        });
                        input.addEventListener(arg, (e) => {
                            if ('key' in e && !(hyphenate(e.key) in modifiers)) {
                                return;
                            }
                            for (const key in modifiers) {
                                const guard = modifierGuards[key];
                                if (guard && guard(e, modifiers)) {
                                    return;
                                }
                            }
                            return events[propertyName](e, application, scope);
                        }, modifiers);
                    }
                    else {
                        input.addEventListener(propertyName, (e) => events[propertyName](e, application, scope));
                    }
                }
            }
        }
        getModifiers(property) {
            if (property.indexOf(".") == -1)
                return undefined;
            const modifiers = {};
            const propParts = property.split(".");
            propParts.shift();
            for (const m in propParts) {
                modifiers[propParts[m]] = true;
            }
            return modifiers;
        }
    }
    KatApps.InputComponentBase = InputComponentBase;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class InputComponent extends KatApps.InputComponentBase {
        props;
        constructor(props) {
            super();
            this.props = props;
        }
        getScope(application, getTemplateId) {
            const props = this.props;
            const that = this;
            const name = props.name;
            const calcEngine = props.ce;
            const tab = props.tab;
            let template = props.template;
            if (template != undefined) {
                const uniqueTemplateId = getTemplateId(template);
                if (uniqueTemplateId == undefined) {
                    console.log(`Unable to find template ${uniqueTemplateId}, ${JSON.stringify(props)}`);
                    return undefined;
                }
                template = uniqueTemplateId;
            }
            const getInputCeValue = function (columnName, legacyTable, legacyId) {
                if (application.calcEngines.length == 0)
                    return undefined;
                return application.state.rbl.value("rbl-input", name, columnName, undefined, calcEngine, tab) ??
                    (legacyTable != undefined && legacyId != undefined ? application.state.rbl.value(legacyTable, legacyId, undefined, undefined, calcEngine, tab) : undefined);
            };
            const inputType = getInputCeValue("type") ?? props.type ?? "text";
            const base = {
                get display() { return getInputCeValue("display", "rbl-display", "v" + name) != "0"; },
                get noCalc() { return getInputCeValue("skip-calc", "rbl-skip", name) == "1"; },
                get disabled() {
                    return getInputCeValue("disabled", "rbl-disabled", name) == "1";
                },
                get error() { return that.errorText(application, name); },
                get warning() { return that.warningText(application, name); }
            };
            const mask = (name) => getInputCeValue("mask") ?? props.mask;
            const hasMask = mask(name) != undefined || typeof Object.getOwnPropertyDescriptor(props, 'mask')?.get === "function";
            const maxLength = (name) => {
                const v = getInputCeValue("max-length");
                return (v != undefined ? +v : undefined) ?? props.maxLength ?? 250;
            };
            const keypressRegex = (name) => getInputCeValue("keypress-regex") ?? props.keypressRegex;
            const defaultValue = (name) => application.state.inputs[name] ?? props.value;
            const label = (name) => application.getLocalizedString(getInputCeValue("label", "rbl-value", "l" + name) ?? props.label ?? "");
            const noCalc = (name) => typeof props.isNoCalc == "boolean" ? props.isNoCalc : props.isNoCalc?.(base) ?? base.noCalc;
            const displayFormat = (name) => {
                let ceFormat = getInputCeValue("display-format") ?? "";
                if (ceFormat == "" && application.calcEngines.length > 0) {
                    const format = application.state.rbl.value("rbl-sliders", name, 'format', undefined, calcEngine, tab);
                    const decimals = application.state.rbl.value("rbl-sliders", name, 'decimals', undefined, calcEngine, tab);
                    if (format != undefined && decimals != undefined) {
                        ceFormat = `{0:${format}${decimals}}`;
                    }
                }
                return ceFormat != "" ? ceFormat : props.displayFormat;
            };
            const scope = {
                $template: template,
                $renderId: this.getRenderedId(template),
                id: name + "_" + application.id,
                name: name,
                type: inputType,
                get value() { return application.state.inputs[name] ?? props.value ?? ""; },
                get disabled() { return typeof props.isDisabled == "boolean" ? props.isDisabled : props.isDisabled?.(base) ?? base.disabled; },
                get display() { return typeof props.isDisplay == "boolean" ? props.isDisplay : props.isDisplay?.(base) ?? base.display; },
                get noCalc() { return noCalc(name); },
                get label() { return label(name); },
                get labelledBy() { return props.labelledBy; },
                get hideLabel() { return getInputCeValue("label") == "-1" || (props.hideLabel ?? false); },
                get placeHolder() {
                    const ph = getInputCeValue("placeholder") ?? props.placeHolder;
                    return ph != undefined ? application.getLocalizedString(ph) : undefined;
                },
                get help() {
                    return {
                        get content() {
                            const help = getInputCeValue("help", "rbl-value", "h" + name) ?? props.help?.content;
                            return help != undefined ? application.getLocalizedString(help) : undefined;
                        },
                        title: application.getLocalizedString(getInputCeValue("help-title", "rbl-value", "h" + name + "Title") ?? props.help?.title ?? ""),
                        width: getInputCeValue("help-width") ?? props?.help?.width?.toString() ?? "350"
                    };
                },
                get iconHtml() { return props.iconHtml ?? ""; },
                get css() {
                    return {
                        input: props?.css?.input ?? "",
                        label: props?.css?.label ?? "",
                        container: props?.css?.container
                    };
                },
                get error() { return base.error; },
                get warning() { return base.warning; },
                get list() {
                    const table = props.list == undefined && application.calcEngines.length > 0
                        ? getInputCeValue("list") ?? application.state.rbl.value("rbl-listcontrol", name, "table", undefined, calcEngine, tab)
                        : undefined;
                    const list = table != undefined
                        ? application.state.rbl.source(table, calcEngine, tab)
                        : props.list ?? [];
                    return list.map(r => ({ key: r.key, text: application.getLocalizedString((r.text).toString()) }));
                },
                get prefix() { return getInputCeValue("prefix") ?? props.prefix; },
                get suffix() { return getInputCeValue("suffix") ?? props.suffix; },
                get maxLength() { return maxLength(name); },
                get min() { return (application.calcEngines.length == 0 ? undefined : getInputCeValue("min") ?? application.state.rbl.value("rbl-sliders", name, "min", undefined, calcEngine, tab)) ?? props.min?.toString(); },
                get max() { return (application.calcEngines.length == 0 ? undefined : getInputCeValue("max") ?? application.state.rbl.value("rbl-sliders", name, "max", undefined, calcEngine, tab)) ?? props.max?.toString(); },
                get step() {
                    const v = application.calcEngines.length == 0
                        ? undefined
                        : getInputCeValue("step") ?? application.state.rbl.value("rbl-sliders", name, "step", undefined, calcEngine, tab);
                    return (v != undefined ? +v : undefined) ?? props.step ?? 1;
                },
                inputUnmounted: (input) => this.unmounted(application, input, props.clearOnUnmount),
                inputMounted: (input, refs) => { },
                uploadAsync: async () => {
                    if (props.uploadEndpoint == undefined) {
                        throw new Error("Cannot use uploadAsync if uploadEndpoint is not set.");
                    }
                    const files = application.select("." + name)[0].files;
                    try {
                        await application.apiAsync(props.uploadEndpoint, { files: files });
                    }
                    catch (e) {
                    }
                    finally {
                        application.setInputValue(name, undefined);
                    }
                }
            };
            scope.inputMounted = (input, refs) => this.mounted(application, scope, name, label, input, defaultValue, props.isExcluded ?? false, noCalc, displayFormat, hasMask, mask, maxLength, keypressRegex, props.events, refs);
            return scope;
        }
    }
    KatApps.InputComponent = InputComponent;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class TemplateComponent extends KatApps.TemplateBase {
        props;
        constructor(props) {
            super();
            this.props = props;
        }
        getScope(application, getTemplateId) {
            if (this.props.name == undefined) {
                throw new Error("You must provide {name:'templateName'} when using v-ka-template.");
            }
            const templateId = getTemplateId(this.props.name);
            if (templateId == undefined) {
                return {};
            }
            if (this.props.source instanceof Array) {
                const that = this;
                return {
                    $template: templateId,
                    $renderId: that.getRenderedId(templateId),
                    application: application,
                    modalAppOptions: application.options.modalAppOptions,
                    get rows() { return that.props.source; }
                };
            }
            else {
                const scope = this.props.source ?? {};
                scope.$template = templateId;
                scope.$renderId = this.getRenderedId(templateId);
                scope.application = application;
                scope.modalAppOptions = application.options.modalAppOptions;
                return scope;
            }
        }
    }
    KatApps.TemplateComponent = TemplateComponent;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class TemplateMultipleInputComponent extends KatApps.InputComponentBase {
        props;
        constructor(props) {
            super();
            this.props = props;
        }
        getScope(application, getTemplateId) {
            const templateId = getTemplateId(this.props.template);
            if (templateId == undefined) {
                return undefined;
            }
            const that = this;
            const props = this.props;
            const names = props.names;
            function fillProperties(source, defaultValue) {
                const defaultFill = source != undefined && source instanceof Array
                    ? source[source.length - 1]
                    : source ?? defaultValue;
                return source instanceof Array
                    ? source.concat(names.slice(0, names.length - source.length).map(n => defaultFill))
                    : names.map(n => defaultFill);
            }
            const values = fillProperties(props.values);
            const labels = fillProperties(props.labels);
            const prefixes = fillProperties(props.prefixes);
            const suffixes = fillProperties(props.suffixes);
            const hideLabels = fillProperties(props.hideLabels);
            const placeHolders = fillProperties(props.placeHolders, '');
            const displayFormats = fillProperties(props.displayFormats);
            const masks = fillProperties(props.masks);
            const keypressRegexs = fillProperties(props.keypressRegexs);
            const helps = fillProperties(props.helps);
            const css = fillProperties(props.css);
            const maxLengths = fillProperties(props.maxLengths);
            const mins = fillProperties(props.mins);
            const maxes = fillProperties(props.maxes);
            const steps = fillProperties(props.steps);
            const calcEngine = props.ce;
            const tab = props.tab;
            const getInputCeValue = function (index, columnName, legacyTable, legacyId) {
                if (application.calcEngines.length == 0)
                    return undefined;
                return application.state.rbl.value("rbl-input", names[index], columnName, undefined, calcEngine, tab) ??
                    (legacyTable != undefined && legacyId != undefined ? application.state.rbl.value(legacyTable, legacyId, undefined, undefined, calcEngine, tab) : undefined);
            };
            const base = {
                name: (index) => names[index],
                display: (index) => getInputCeValue(index, "display", "rbl-display", "v" + names[index]) != "0",
                noCalc: (index) => getInputCeValue(index, "skip-calc", "rbl-skip", names[index]) == "1",
                disabled: (index) => getInputCeValue(index, "disabled", "rbl-disabled", names[index]) == "1",
                error: (index) => that.errorText(application, names[index]),
                warning: (index) => that.errorText(application, names[index])
            };
            const label = function (name) {
                const index = names.indexOf(name);
                return application.getLocalizedString(getInputCeValue(index, "label", "rbl-value", "l" + names[index]) ?? labels[index] ?? "");
            };
            const noCalc = function (name) {
                const index = names.indexOf(name);
                return typeof props.isNoCalc == "boolean" ? props.isNoCalc : props.isNoCalc?.(index, base) ?? base.noCalc(index);
            };
            const defaultValue = function (name) {
                const index = names.indexOf(name);
                return application.state.inputs[names[index]] ?? values[index];
            };
            const mask = function (name) {
                const index = names.indexOf(name);
                return getInputCeValue(index, "mask") ?? masks[index];
            };
            const hasMask = names.some(name => mask(name) !== undefined) || typeof Object.getOwnPropertyDescriptor(props, 'masks')?.get === "function";
            const maxLength = function (name) {
                const index = names.indexOf(name);
                const v = getInputCeValue(index, "max-length");
                return (v != undefined ? +v : undefined) ?? maxLengths[index] ?? 250;
            };
            const keypressRegex = function (name) {
                const index = names.indexOf(name);
                return getInputCeValue(index, "keypressRegex") ?? keypressRegexs[index];
            };
            const displayFormat = function (name) {
                const index = names.indexOf(name);
                let ceFormat = getInputCeValue(index, "display-format") ?? "";
                if (ceFormat == "" && application.calcEngines.length > 0) {
                    const format = application.state.rbl.value("rbl-sliders", name, 'format', undefined, calcEngine, tab);
                    const decimals = application.state.rbl.value("rbl-sliders", name, 'decimals', undefined, calcEngine, tab);
                    if (format != undefined && decimals != undefined) {
                        ceFormat = `{0:${format}${decimals}}`;
                    }
                }
                return ceFormat != "" ? ceFormat : displayFormats[index];
            };
            const inputType = getInputCeValue(0, "type") ?? props.type ?? "text";
            const scope = {
                $template: templateId,
                $renderId: this.getRenderedId(templateId),
                id: (index) => names[index] + "_" + application.id,
                name: (index) => base.name(index),
                type: inputType,
                value: (index) => defaultValue(names[index]) ?? "",
                disabled: (index) => typeof props.isDisabled == "boolean" ? props.isDisabled : props.isDisabled?.(index, base) ?? base.disabled(index),
                display: (index) => typeof props.isDisplay == "boolean" ? props.isDisplay : props.isDisplay?.(index, base) ?? base.display(index),
                noCalc: (index) => noCalc(names[index]),
                label: (index) => label(names[index]),
                placeHolder: (index) => {
                    const ph = getInputCeValue(index, "placeholder", "rbl-value", "ph" + names[index]) ?? placeHolders[index];
                    return ph != undefined ? application.getLocalizedString(ph) : undefined;
                },
                help: (index) => ({
                    get content() {
                        const help = getInputCeValue(index, "help", "rbl-value", "h" + names[index]) ?? helps[index]?.content;
                        return help != undefined ? application.getLocalizedString(help) : undefined;
                    },
                    title: application.getLocalizedString(getInputCeValue(index, "help-title", "rbl-value", "h" + names[index] + "Title") ?? helps[index]?.title ?? ""),
                    width: getInputCeValue(index, "help-width") ?? helps[index]?.width?.toString() ?? "350"
                }),
                css: (index) => ({
                    input: css[index]?.input ?? "",
                    label: css[index]?.label ?? "",
                    container: css[index]?.container
                }),
                error: (index) => base.error(index),
                warning: (index) => base.warning(index),
                list: function (index) {
                    const table = application.calcEngines.length == 0
                        ? undefined
                        : getInputCeValue(index, "list") ?? application.state.rbl.value("rbl-listcontrol", names[index], "table", undefined, calcEngine, tab);
                    const list = table != undefined
                        ? application.state.rbl.source(table, calcEngine, tab)
                        : [];
                    return list.map(r => ({ key: r.key, text: application.getLocalizedString((r.text).toString()) }));
                },
                hideLabel: (index) => { return getInputCeValue(index, "label") == "-1" || (hideLabels[index] ?? false); },
                maxLength: (index) => maxLength(names[index]),
                min: (index) => (application.calcEngines.length == 0 ? undefined : getInputCeValue(index, "min") ?? application.state.rbl.value("rbl-sliders", names[index], "min", undefined, calcEngine, tab)) ?? mins[index],
                max: (index) => (application.calcEngines.length == 0 ? undefined : getInputCeValue(index, "max") ?? application.state.rbl.value("rbl-sliders", names[index], "max", undefined, calcEngine, tab)) ?? maxes[index],
                step: (index) => {
                    const v = application.calcEngines.length == 0 ? undefined : getInputCeValue(index, "step") ?? application.state.rbl.value("rbl-sliders", names[index], "step", undefined, calcEngine, tab);
                    return (v != undefined ? +v : undefined) ?? steps[index];
                },
                prefix: (index) => getInputCeValue(index, "prefix") ?? prefixes[index],
                suffix: (index) => getInputCeValue(index, "suffix") ?? suffixes[index],
                inputUnmounted: (input) => this.unmounted(application, input, props.clearOnUnmount),
                inputMounted: (input, refs) => { }
            };
            scope.inputMounted = (input, refs) => {
                const name = input.getAttribute("name");
                if (name == undefined) {
                    throw new Error("You must assign a name attribute via :name=\"name(index)\".");
                }
                this.mounted(application, scope, name, label, input, defaultValue, props.isExcluded ?? false, noCalc, displayFormat, hasMask, mask, maxLength, keypressRegex, props.events, refs);
            };
            return scope;
        }
    }
    KatApps.TemplateMultipleInputComponent = TemplateMultipleInputComponent;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class Components {
        static initializeCoreComponents(application, getTemplateId) {
            application.state.components["template"] = ((props) => new KatApps.TemplateComponent(props).getScope(application, getTemplateId));
            application.state.components["input"] = ((props) => new KatApps.InputComponent(props).getScope(application, getTemplateId));
            application.state.components["inputGroup"] = ((props) => new KatApps.TemplateMultipleInputComponent(props).getScope(application, getTemplateId));
        }
    }
    KatApps.Components = Components;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaApi {
        name = "ka-api";
        getDefinition(application) {
            return ctx => {
                const scope = ctx.exp.startsWith("{") ? ctx.get() : { endpoint: ctx.exp };
                const endpoint = scope.endpoint;
                const submitApi = async function (e) {
                    e.preventDefault();
                    if (scope.confirm != undefined) {
                        const confirmResponse = await application.showModalAsync(scope.confirm, e.currentTarget);
                        if (!confirmResponse.confirmed) {
                            return;
                        }
                    }
                    try {
                        const propertiesToSkip = ["confirm", "endpoint", "then", "catch"];
                        const response = await application.apiAsync(endpoint, KatApps.Utils.clone(scope, (k, v) => propertiesToSkip.indexOf(k) > -1 ? undefined : v), ctx.el);
                        if (scope.thenAsync != undefined) {
                            await scope.thenAsync(response, application);
                        }
                    }
                    catch (e) {
                        if (scope.catchAsync != undefined) {
                            await scope.catchAsync(e, application);
                        }
                        else {
                            KatApps.Utils.trace(application, "DirectiveKaApi", "submitApi", `API Submit to ${endpoint} failed.`, TraceVerbosity.None, e);
                        }
                    }
                };
                if (ctx.el.tagName == "A") {
                    ctx.el.setAttribute("href", "#");
                }
                $(ctx.el).on("click.ka-api", submitApi);
                return () => {
                    $(ctx.el).off("click.ka-api");
                };
            };
        }
    }
    KatApps.DirectiveKaApi = DirectiveKaApi;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaApp {
        name = "ka-app";
        getDefinition(application) {
            return ctx => {
                const scope = ctx.get();
                const view = scope.view;
                const propertiesToSkip = ["handlers", "view", "modalAppOptions", "hostApplication", "currentPage"];
                const nestedAppOptions = KatApps.Utils.extend(KatApps.Utils.clone(application.options, (k, v) => propertiesToSkip.indexOf(k) > -1 ? undefined : v), {
                    view: view,
                    currentPage: view,
                    hostApplication: application,
                    inputs: KatApps.Utils.extend({ iNestedApplication: "1" }, scope.inputs)
                });
                delete nestedAppOptions.inputs.iModalApplication;
                const selector = scope.selector ?? ".kaNested" + KatApps.Utils.generateId();
                ctx.el.classList.add(selector.substring(1));
                let nestedApp;
                (async () => {
                    try {
                        await PetiteVue.nextTick();
                        nestedApp = await KatApp.createAppAsync(selector, nestedAppOptions);
                    }
                    catch (e) {
                        KatApps.Utils.trace(application, "DirectiveKaApp", "getDefinition", `Nested App ${scope.view} failed.`, TraceVerbosity.None, e);
                    }
                })();
                return () => {
                    if (nestedApp != undefined) {
                        KatApp.remove(nestedApp);
                    }
                };
            };
        }
    }
    KatApps.DirectiveKaApp = DirectiveKaApp;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaAttributes {
        name = "ka-attributes";
        getDefinition(application) {
            return ctx => {
                const attributes = ctx.get();
                if (attributes != undefined && attributes != "") {
                    const attrObject = KatApps.Utils.getObjectFromAttributes(attributes);
                    for (const propertyName in attrObject) {
                        ctx.el.setAttribute(propertyName, attrObject[propertyName]);
                    }
                }
            };
        }
    }
    KatApps.DirectiveKaAttributes = DirectiveKaAttributes;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaHighchart {
        name = "ka-highchart";
        cultureEnsured = false;
        application;
        getDefinition(application) {
            return ctx => {
                this.application = application;
                const navItemId = application.closestElement(ctx.el, ".tab-pane, [role='tabpanel']")?.getAttribute("aria-labelledby");
                if (navItemId != undefined) {
                    const navItem = application.select("#" + navItemId);
                    navItem.on('shown.bs.tab', () => $(ctx.el).highcharts().reflow());
                }
                let highchart;
                ctx.effect(() => {
                    if (typeof Highcharts !== "object") {
                        KatApps.Utils.trace(application, "DirectiveKaHighchart", "getDefinition", `Highcharts javascript is not present.`, TraceVerbosity.None, ctx.exp);
                        return;
                    }
                    const scope = ctx.get();
                    const data = application.state.rbl.source(`HighCharts-${scope.data}-Data`, scope.ce, scope.tab);
                    const optionRows = application.state.rbl.source(`HighCharts-${scope.options ?? scope.data}-Options`, scope.ce, scope.tab);
                    const overrideRows = application.state.rbl.source("HighCharts-Overrides", scope.ce, scope.tab, r => String.compare(r.id, scope.data, true) == 0);
                    const dataRows = data.filter(r => !r.category.startsWith("config-"));
                    const seriesConfigurationRows = data.filter(r => r.category.startsWith("config-"));
                    const exists = (highchart = Highcharts.charts[ctx.el.getAttribute('data-highcharts-chart') ?? -1]) != undefined;
                    if (highchart !== undefined) {
                        highchart.destroy();
                        highchart = undefined;
                    }
                    if (dataRows.length > 0) {
                        this.ensureCulture();
                        const getOptionValue = function (configurationName) {
                            return overrideRows.find(r => String.compare(r.key, configurationName, true) === 0)?.value ??
                                optionRows.find(r => String.compare(r.key, configurationName, true) === 0)?.value;
                        };
                        const configStyle = getOptionValue("config-style");
                        if (configStyle !== undefined) {
                            let renderStyle = ctx.el.getAttribute("style") ?? "";
                            if (renderStyle !== "" && !renderStyle.endsWith(";")) {
                                renderStyle += ";";
                            }
                            ctx.el.setAttribute("style", renderStyle + configStyle);
                        }
                        const chartType = getOptionValue("chart.type");
                        const tooltipFormat = this.removeRBLEncoding(getOptionValue("config-tooltipFormat"));
                        const chartOptions = this.getChartOptions(chartType, tooltipFormat, dataRows, optionRows, overrideRows, seriesConfigurationRows);
                        try {
                            $(ctx.el).highcharts(chartOptions);
                            highchart = Highcharts.charts[ctx.el.getAttribute('data-highcharts-chart')];
                            if (exists) {
                                $(ctx.el).highcharts().reflow();
                            }
                        }
                        catch (error) {
                            KatApps.Utils.trace(application, "DirectiveKaHighchart", "getDefinition", `Error during highchart creation.`, TraceVerbosity.None, ctx.exp, error);
                        }
                    }
                });
                return () => {
                    if (highchart !== undefined) {
                        highchart.destroy();
                    }
                };
            };
        }
        getChartOptions(chartType, tooltipFormat, dataRows, optionRows, overrideRows, seriesConfigurationRows) {
            const chartOptions = {};
            const apiOptions = optionRows.concat(overrideRows).filter(r => !r.key.startsWith("config-"));
            apiOptions.forEach(optionRow => {
                this.setApiOption(chartOptions, optionRow.key, optionRow.value);
            });
            const firstDataRow = dataRows[0];
            const allChartColumns = Object.keys(firstDataRow);
            const seriesColumns = allChartColumns.filter(k => k.startsWith("series"));
            const isXAxisChart = chartType !== "pie" && chartType !== "solidgauge" && chartType !== "scatter3d" && chartType !== "scatter3d";
            chartOptions.series = this.buildSeries(allChartColumns, seriesColumns, seriesConfigurationRows, dataRows, isXAxisChart);
            if (isXAxisChart) {
                chartOptions.xAxis = this.getXAxisOptions(chartOptions.xAxis, dataRows);
            }
            chartOptions.tooltip = this.getTooltipOptions(tooltipFormat, seriesColumns, seriesConfigurationRows) ?? chartOptions.tooltip;
            return chartOptions;
        }
        getTooltipOptions(tooltipFormat, seriesColumns, seriesConfigurationRows) {
            if (tooltipFormat === undefined) {
                return undefined;
            }
            const configFormat = seriesConfigurationRows.find(c => c.category === "config-format");
            const seriesFormats = seriesColumns
                .filter(seriesName => seriesConfigurationRows.filter(c => c.category === "config-visible" && c[seriesName] === "0").length === 0)
                .map(seriesName => configFormat?.[seriesName] ?? "c0");
            return {
                formatter: function () {
                    let s = "";
                    let t = 0;
                    const pointTemplate = Sys.CultureInfo.CurrentCulture.name.startsWith("fr")
                        ? "<br/>{{name}} : {{value}}"
                        : "<br/>{{name}}: {{value}}";
                    this.points.forEach((point, index) => {
                        if (point.y > 0) {
                            s += String.formatTokens(pointTemplate, { name: point.series.name, value: String.localeFormat("{0:" + seriesFormats[index] + "}", point.y) });
                            t += point.y;
                        }
                    });
                    return String.formatTokens(tooltipFormat, { x: this.x, stackTotal: String.localeFormat("{0:" + seriesFormats[0] + "}", t), seriesDetail: s });
                },
                shared: true
            };
        }
        getXAxisOptions(existingOptions, dataRows) {
            const xAxis = existingOptions ?? {};
            xAxis.categories = dataRows.map(d => this.removeRBLEncoding(d.category) ?? "");
            const plotInformation = dataRows
                .map((d, index) => ({ index: index, plotLine: d.plotLine ?? "", plotBand: d.plotBand ?? "" }))
                .filter(r => r.plotLine !== "" || r.plotBand !== "");
            const plotLines = [];
            const plotBands = [];
            plotInformation.forEach(row => {
                if (row.plotLine !== "") {
                    const info = row.plotLine.split("|");
                    const color = info[0];
                    const width = Number(info[1]);
                    const offset = info.length > 2 ? Number(info[2]) : 0;
                    const plotLine = {
                        color: color,
                        value: row.index + offset,
                        width: width,
                        zIndex: 1
                    };
                    plotLines.push(plotLine);
                }
                if (row.plotBand !== "") {
                    const info = row.plotBand.split("|");
                    const color = info[0];
                    const span = info[1];
                    const offset = info.length > 2 ? Number(info[2]) : 0;
                    const from = String.compare(span, "lower", true) === 0 ? -1 : row.index + offset;
                    const to = String.compare(span, "lower", true) === 0 ? row.index + offset :
                        String.compare(span, "higher", true) === 0 ? dataRows.length :
                            row.index + Number(span) + offset;
                    const plotBand = {
                        color: color,
                        from: from,
                        to: to
                    };
                    plotBands.push(plotBand);
                }
            });
            if (plotLines.length > 0) {
                xAxis.plotLines = plotLines;
            }
            if (plotBands.length > 0) {
                xAxis.plotBands = plotBands;
            }
            return xAxis;
        }
        buildSeries(allChartColumns, seriesColumns, seriesConfigurationRows, dataRows, isXAxisChart) {
            const seriesInfo = [];
            seriesColumns.forEach(seriesName => {
                const isVisible = seriesConfigurationRows.filter((c) => c.category === "config-visible" && c[seriesName] === "0").length === 0;
                const isHidden = seriesConfigurationRows.filter((c) => c.category === "config-hidden" && c[seriesName] === "1").length > 0;
                if (isVisible) {
                    const series = {};
                    const properties = seriesConfigurationRows
                        .filter((c) => ["config-visible", "config-hidden", "config-format"].indexOf(c.category) === -1 && c[seriesName] !== undefined)
                        .map(c => ({ key: c.category.substring(7), value: c[seriesName] }));
                    series.data = dataRows.map(d => this.getSeriesDataRow(d, allChartColumns, seriesName, isXAxisChart));
                    properties.forEach(c => {
                        this.setApiOption(series, c.key, c.value);
                    });
                    if (isHidden) {
                        series.visible = false;
                        series.showInLegend = series.showInLegend ?? false;
                    }
                    seriesInfo.push(series);
                }
            });
            return seriesInfo;
        }
        getSeriesDataRow(row, allChartColumns, seriesName, isXAxisChart) {
            const dataRow = { y: +row[seriesName], id: seriesName + "." + row.category };
            if (!isXAxisChart) {
                dataRow.name = row.category;
            }
            const pointColumnHeader = "point." + seriesName + ".";
            allChartColumns.filter(k => k.startsWith(pointColumnHeader)).forEach(k => {
                dataRow[k.substring(pointColumnHeader.length)] = this.getOptionValue(row[k]);
            });
            return dataRow;
        }
        setApiOption(optionsContainer, name, value) {
            let optionJson = optionsContainer;
            const optionNames = name.split(".");
            const optionValue = this.getOptionValue(value);
            for (let k = 0; k < optionNames.length; k++) {
                let optionName = optionNames[k];
                let optionIndex = -1;
                if (optionName.endsWith("]")) {
                    const nameParts = optionName.split("[");
                    optionName = nameParts[0];
                    optionIndex = parseInt(nameParts[1].substring(0, nameParts[1].length - 1));
                }
                const onPropertyValue = k === optionNames.length - 1;
                const newValue = onPropertyValue
                    ? optionValue
                    : {};
                const needsArrayElement = optionIndex > -1 && optionJson[optionName] != undefined && optionJson[optionName].length - 1 < optionIndex;
                if (optionJson[optionName] === undefined) {
                    optionJson[optionName] = optionIndex > -1 ? [newValue] : newValue;
                }
                else if (onPropertyValue || needsArrayElement) {
                    if (optionIndex > -1) {
                        const propertyArray = optionJson[optionName];
                        while (propertyArray.length - 1 < optionIndex) {
                            propertyArray.push(undefined);
                        }
                        propertyArray[optionIndex] = newValue;
                    }
                    else {
                        optionJson[optionName] = newValue;
                    }
                }
                optionJson = optionIndex > -1
                    ? optionJson[optionName][optionIndex]
                    : optionJson[optionName];
            }
        }
        getOptionValue(value) {
            const d = Number(value);
            if (value === undefined || String.compare(value, "null", true) === 0)
                return undefined;
            else if (!isNaN(d) && value !== "")
                return d;
            else if (String.compare(value, "true", true) === 0)
                return true;
            else if (String.compare(value, "false", true) === 0)
                return false;
            else if (value.startsWith("resource:"))
                return this.application?.getLocalizedString(value.substring(9));
            else if (value.startsWith("json:"))
                return JSON.parse(value.substring(5));
            else if (value.startsWith("var ")) {
                const v = value.substring(4);
                return function () { return eval(v); };
            }
            else if (value.startsWith("eval ")) {
                const v = value.substring(5);
                return eval(v);
            }
            else if (value.startsWith("function ")) {
                const f = this.removeRBLEncoding(`function f() ${value.substring(value.indexOf("{"))} f.call(this);`);
                return function () { return eval(f); };
            }
            else {
                return this.removeRBLEncoding(value);
            }
        }
        ensureCulture() {
            if (!this.cultureEnsured) {
                this.cultureEnsured = true;
                const culture = this.application.state.rbl.value("variable", "culture") ?? "en-";
                if (!culture.startsWith("en-")) {
                    Highcharts.setOptions({
                        yAxis: {
                            labels: {
                                formatter: function () {
                                    return String.localeFormat("{0:c0}", this.value);
                                }
                            },
                            stackLabels: {
                                formatter: function () {
                                    return String.localeFormat("{0:c0}", this.value);
                                }
                            }
                        }
                    });
                }
            }
        }
        removeRBLEncoding(value) {
            if (value === undefined)
                return value;
            return value.replace(/<</g, "<")
                .replace(/&lt;&lt;/g, "<")
                .replace(/>>/g, ">")
                .replace(/&gt;&gt;/g, ">")
                .replace(/&quot;/g, "\"")
                .replace(/&amp;nbsp;/g, "&nbsp;");
        }
    }
    KatApps.DirectiveKaHighchart = DirectiveKaHighchart;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaInline {
        name = "ka-inline";
        getDefinition(application) {
            return ctx => {
                const inlineId = ctx.el.getAttribute("v-ka-id") ?? KatApps.Utils.generateId();
                ctx.el.classList.remove("ka-inspector-inline");
                ctx.effect(() => {
                    const scope = ctx.get();
                    if (ctx.el.hasAttribute("v-ka-id")) {
                        document.querySelectorAll(`[v-ka-inline-id='${inlineId}']`).forEach(i => i.remove());
                    }
                    else {
                        ctx.el.setAttribute("v-ka-id", inlineId);
                    }
                    const children = ctx.el.tagName === 'TEMPLATE'
                        ? [...ctx.el.content.children]
                        : [...ctx.el.children];
                    children.forEach(c => {
                        const render = c.cloneNode(true);
                        if (application.options.debug.showInspector != "0") {
                            render.classList.add("ka-inspector-inline");
                        }
                        render.setAttribute("v-ka-inline-id", inlineId);
                        ctx.el.before(render);
                    });
                });
                return () => {
                    document.querySelectorAll(`[v-ka-inline-id='${inlineId}']`).forEach(i => i.remove());
                };
            };
        }
    }
    KatApps.DirectiveKaInline = DirectiveKaInline;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaModal {
        name = "ka-modal";
        getDefinition(application) {
            return ctx => {
                ctx.effect(() => {
                    let scope = ctx.get();
                    try {
                        if (scope.model != undefined) {
                            scope = ctx.get(scope.model);
                        }
                    }
                    catch (e) {
                        KatApps.Utils.trace(application, "DirectiveKaModal", "getDefinition", `Unable to compile 'model' property: ${scope.model}`, TraceVerbosity.None, e);
                    }
                    const showModal = async function (e) {
                        e.preventDefault();
                        try {
                            if (scope.beforeOpenAsync != undefined) {
                                await scope.beforeOpenAsync(application);
                            }
                            const response = await application.showModalAsync(KatApps.Utils.clone(scope, (k, v) => ["beforeOpenAsync", "confirmedAsync", "cancelledAsync", "catchAsync"].indexOf(k) > -1 ? undefined : v), e.currentTarget);
                            if (response.confirmed) {
                                if (scope.confirmedAsync != undefined) {
                                    await scope.confirmedAsync(response.response, application);
                                }
                                else {
                                    KatApps.Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} confirmed.`, TraceVerbosity.Normal, response.response);
                                }
                            }
                            else {
                                if (scope.cancelledAsync != undefined) {
                                    await scope.cancelledAsync(response.response, application);
                                }
                                else {
                                    KatApps.Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} cancelled.`, TraceVerbosity.Normal, response.response);
                                }
                            }
                        }
                        catch (e) {
                            if (scope.catchAsync != undefined) {
                                await scope.catchAsync(e, application);
                            }
                            else {
                                KatApps.Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} failed.`, TraceVerbosity.None, e);
                            }
                        }
                        finally {
                            if (scope.closed != undefined) {
                                scope.closed(application);
                            }
                        }
                    };
                    if (ctx.el.tagName == "A") {
                        ctx.el.setAttribute("href", "#");
                    }
                    $(ctx.el).off("click.ka-modal").on("click.ka-modal", showModal);
                });
                return () => {
                    $(ctx.el).off("click.ka-modal");
                };
            };
        }
    }
    KatApps.DirectiveKaModal = DirectiveKaModal;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaNavigate {
        name = "ka-navigate";
        getDefinition(application) {
            return ctx => {
                let scope = ctx.get();
                try {
                    if (scope.model != undefined) {
                        scope = ctx.get(scope.model);
                    }
                }
                catch (e) {
                    KatApps.Utils.trace(application, "DirectiveKaNavigate", "getDefinition", `Unable to compile 'model' property: ${scope.model}`, TraceVerbosity.None, e);
                }
                const navigationId = scope.view;
                const navigate = async function (e) {
                    e.preventDefault();
                    if (scope.clearDirty ?? false) {
                        application.state.isDirty = false;
                    }
                    if (scope.confirm != undefined) {
                        const confirmResponse = await application.showModalAsync(scope.confirm, e.currentTarget);
                        if (!confirmResponse.confirmed) {
                            return false;
                        }
                    }
                    const inputs = scope.inputs ?? (scope.ceInputs != undefined ? {} : undefined);
                    if (scope.ceInputs != undefined) {
                        const attrObject = KatApps.Utils.getObjectFromAttributes(scope.ceInputs);
                        for (const propertyName in attrObject) {
                            if (propertyName.startsWith("i") || propertyName.startsWith("data-input-")) {
                                const inputName = propertyName.startsWith("i")
                                    ? propertyName
                                    : "i" + propertyName.split("-").slice(2).map(n => n[0].toUpperCase() + n.slice(1)).join("");
                                inputs[inputName] = attrObject[propertyName];
                            }
                        }
                    }
                    await application.navigateAsync(navigationId, { inputs: inputs, persistInputs: scope.persistInputs ?? false });
                    return false;
                };
                if (ctx.el.tagName == "A") {
                    ctx.el.setAttribute("href", "#");
                }
                $(ctx.el).on("click.ka-navigate", navigate);
                return () => {
                    $(ctx.el).off("click.ka-navigate");
                };
            };
        }
    }
    KatApps.DirectiveKaNavigate = DirectiveKaNavigate;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaResource {
        name = "ka-resource";
        getDefinition(application) {
            return ctx => {
                const defaultValue = ctx.el.innerHTML != "" ? ctx.el.innerHTML : undefined;
                ctx.effect(() => {
                    const model = ctx.exp.startsWith("{")
                        ? ctx.get()
                        : { key: (ctx.exp != "" ? ctx.exp : undefined) ?? ctx.el.innerHTML };
                    let key = model.key ?? ctx.el.innerHTML;
                    if (key != undefined && key.indexOf("^") == -1 && model.templateArguments != undefined) {
                        key = [key, ...model.templateArguments].join("^");
                    }
                    ctx.el.innerHTML = defaultValue != undefined
                        ? application.getLocalizedString(key, model, defaultValue)
                        : application.getLocalizedString(key, model);
                    ctx.el.setAttribute("data-resource-key", key);
                    if (application.missingResources.findIndex(x => x == key) != -1) {
                        ctx.el.classList.add("missing");
                    }
                    else {
                        ctx.el.classList.remove("missing");
                    }
                    if (application.missingLanguageResources.findIndex(x => x == key) != -1) {
                        ctx.el.classList.add("missing-culture");
                    }
                    else {
                        ctx.el.classList.remove("missing-culture");
                    }
                });
            };
        }
    }
    KatApps.DirectiveKaResource = DirectiveKaResource;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaTable {
        name = "ka-table";
        getDefinition(application) {
            return ctx => {
                ctx.effect(() => {
                    const scope = ctx.get();
                    const data = application.state.rbl.source(scope.name, scope.ce, scope.tab);
                    $(ctx.el).empty();
                    if (data.length > 0) {
                        let tableCss = scope.css != undefined
                            ? `rbl ${scope.name} ${scope.css}`
                            : `rbl ${scope.name} table table-sm table-hover`;
                        const hasResponsiveTable = tableCss.indexOf("table-responsive") > -1;
                        tableCss = tableCss.replace("table-responsive", "");
                        const tableConfigRow = data[0];
                        const tableColumns = [];
                        const columnConfiguration = {};
                        let hasBootstrapTableWidths = false;
                        Object.keys(tableConfigRow)
                            .filter(k => k.startsWith("text") || k.startsWith("value"))
                            .map(k => ({
                            Name: k,
                            Element: tableConfigRow[k],
                            Meta: tableConfigRow["@" + k] ?? {},
                            Width: tableConfigRow["@" + k]?.[hasResponsiveTable ? "@r-width" : "@width"]
                        }))
                            .forEach(e => {
                            const config = {
                                name: e.Name,
                                isTextColumn: e.Name.startsWith("text"),
                                cssClass: e.Meta["@class"],
                                width: e.Width !== undefined && !e.Width.endsWith("%") ? +e.Width : undefined,
                                widthPct: e.Width !== undefined && e.Width.endsWith("%") ? e.Width : undefined,
                                xsColumns: (e.Meta["@xs-width"] != undefined ? e.Meta["@xs-width"] * 1 : undefined) || (hasResponsiveTable && e.Meta["@width"] != undefined ? e.Meta["@width"] * 1 : undefined),
                                smColumns: e.Meta["@sm-width"] != undefined ? e.Meta["@sm-width"] * 1 : undefined,
                                mdColumns: e.Meta["@md-width"] != undefined ? e.Meta["@md-width"] * 1 : undefined,
                                lgColumns: e.Meta["@lg-width"] != undefined ? e.Meta["@lg-width"] * 1 : undefined
                            };
                            if (config.xsColumns !== undefined || config.smColumns !== undefined || config.mdColumns !== undefined || config.lgColumns !== undefined) {
                                hasBootstrapTableWidths = true;
                            }
                            tableColumns.push(config);
                            columnConfiguration[e.Name] = config;
                        });
                        const isHeaderRow = (row) => {
                            const code = row["code"] ?? "";
                            const id = row.id ?? "";
                            return (code === "h" || code.startsWith("header") || code.startsWith("hdr")) ||
                                (id === "h" || id.startsWith("header") || id.startsWith("hdr"));
                        };
                        const getHeaderSpanCell = (row, isHeader, span, getBootstrapSpanColumnCss) => {
                            if (!isHeader || span != "")
                                return undefined;
                            const keys = Object.keys(row);
                            const values = keys
                                .filter(k => k.startsWith("text") || k.startsWith("value"))
                                .map(k => ({
                                Name: k,
                                Value: row[k] ?? "",
                                Class: `${columnConfiguration[k].isTextColumn ? "text" : "value"} span-${scope.name}-${k} ${getBootstrapSpanColumnCss?.(0, tableColumns.length - 1) ?? ""}`
                            }))
                                .filter(c => c.Value !== "");
                            return values.length === 1 ? values[0] : undefined;
                        };
                        const getSpanItems = (row, span, getBootstrapSpanColumnCss) => {
                            const parts = span.split(":");
                            let currentCol = 0;
                            const spanItems = [];
                            for (let p = 0; p < parts.length; p++) {
                                if (p % 2 === 0) {
                                    const colSpan = +parts[p + 1];
                                    const colSpanName = parts[p];
                                    const spanConfig = columnConfiguration[colSpanName];
                                    const _class = `${spanConfig.isTextColumn ? "text" : "value"} ${spanConfig.cssClass ?? ""} span-${scope.name}-${colSpan} ${getBootstrapSpanColumnCss?.(currentCol, colSpan - 1) ?? ""}`;
                                    spanItems.push({ Value: row[colSpanName] ?? "", Class: _class, Span: colSpan });
                                }
                            }
                            return spanItems;
                        };
                        const addClass = (el, css) => {
                            if (css.trim() != "") {
                                el.classList.add(...css.trim().split(' '));
                            }
                        };
                        const useBootstrapColumnWidths = hasBootstrapTableWidths && !hasResponsiveTable;
                        if (useBootstrapColumnWidths) {
                            const getBootstrapColumnCss = (c) => {
                                let bsClass = c.xsColumns !== undefined ? " col-xs-" + c.xsColumns : "";
                                bsClass += c.smColumns !== undefined ? " col-sm-" + c.smColumns : "";
                                bsClass += c.mdColumns !== undefined ? " col-md-" + c.mdColumns : "";
                                bsClass += c.lgColumns !== undefined ? " col-lg-" + c.lgColumns : "";
                                bsClass += ` ${c.cssClass ?? ""}`;
                                return bsClass.trim();
                            };
                            const getBootstrapSpanColumnCss = (start, length) => {
                                const spanCols = tableColumns.filter((c, i) => i >= start && i <= start + length);
                                const xs = spanCols.reduce((sum, curr) => sum + (curr.xsColumns ?? 0), 0);
                                const sm = spanCols.reduce((sum, curr) => sum + (curr.smColumns ?? 0), 0);
                                const md = spanCols.reduce((sum, curr) => sum + (curr.mdColumns ?? 0), 0);
                                const lg = spanCols.reduce((sum, curr) => sum + (curr.lgColumns ?? 0), 0);
                                let bsClass = xs > 0 ? " col-xs-" + xs : "";
                                bsClass += sm > 0 ? " col-sm-" + sm : "";
                                bsClass += md > 0 ? " col-md-" + md : "";
                                bsClass += lg > 0 ? " col-lg-" + lg : "";
                                return bsClass.trim();
                            };
                            const container = document.createElement("div");
                            data.forEach(r => {
                                const isHeader = isHeaderRow(r);
                                const row = document.createElement("div");
                                addClass(row, `${r["@class"] ?? r["class"] ?? ""} row tr-row ${isHeader ? "h-row" : ""}`);
                                const span = r["span"] ?? "";
                                const headerSpanCell = getHeaderSpanCell(r, isHeader, span, getBootstrapSpanColumnCss);
                                if (headerSpanCell != undefined) {
                                    const col = document.createElement("div");
                                    addClass(col, headerSpanCell.Class);
                                    col.innerHTML = application.getLocalizedString(headerSpanCell.Value);
                                    row.appendChild(col);
                                }
                                else if (span != "") {
                                    row.append(...getSpanItems(r, span, getBootstrapSpanColumnCss)
                                        .map(s => {
                                        const spanCol = document.createElement("div");
                                        addClass(spanCol, s.Class);
                                        spanCol.innerHTML = application.getLocalizedString(s.Value);
                                        return spanCol;
                                    }));
                                }
                                else {
                                    tableColumns.forEach(c => {
                                        const col = document.createElement("div");
                                        addClass(col, `${getBootstrapColumnCss(c)} ${c.isTextColumn ? "text" : "value"} ${scope.name}-${c.name}`);
                                        col.innerHTML = application.getLocalizedString(r[c.name]) ?? "";
                                        row.append(col);
                                    });
                                }
                                container.append(row);
                            });
                            ctx.el.append(container);
                        }
                        else {
                            const getColGroupDef = () => {
                                const colGroupDef = document.createElement("colgroup");
                                tableColumns.forEach(c => {
                                    const width = c.width !== undefined || c.widthPct !== undefined
                                        ? ` width="${c.widthPct ?? (c.width + "px")}"`
                                        : "";
                                    const col = document.createElement("col");
                                    col.setAttribute("class", `${scope.name}-${c.name}`);
                                    if (c.width !== undefined || c.widthPct !== undefined) {
                                        col.setAttribute("width", c.widthPct ?? (c.width + "px"));
                                    }
                                    colGroupDef.append(col);
                                });
                                return colGroupDef;
                            };
                            const table = document.createElement("table");
                            addClass(table, tableCss);
                            table.appendChild(getColGroupDef());
                            let rowContainer = undefined;
                            data.forEach(r => {
                                const isHeader = isHeaderRow(r);
                                if (isHeader && rowContainer == undefined) {
                                    rowContainer = document.createElement("thead");
                                    table.append(rowContainer);
                                }
                                else if (!isHeader && rowContainer?.tagName != "TBODY") {
                                    rowContainer = document.createElement("tbody");
                                    table.append(rowContainer);
                                }
                                const row = document.createElement("tr");
                                addClass(row, `${r["@class"] ?? r["class"] ?? ""} ${isHeader && rowContainer.tagName == "TBODY" ? "h-row" : ""}`);
                                const elementName = isHeader ? "th" : "td";
                                const span = r["span"] ?? "";
                                const headerSpanCell = getHeaderSpanCell(r, isHeader, span);
                                if (headerSpanCell != undefined) {
                                    const col = document.createElement(elementName);
                                    addClass(col, headerSpanCell.Class);
                                    col.innerHTML = application.getLocalizedString(headerSpanCell.Value);
                                    row.appendChild(col);
                                }
                                else if (span != "") {
                                    row.append(...getSpanItems(r, span)
                                        .map(s => {
                                        const spanCol = document.createElement(elementName);
                                        addClass(spanCol, s.Class);
                                        spanCol.setAttribute("colspan", s.Span.toString());
                                        spanCol.innerHTML = application.getLocalizedString(s.Value);
                                        return spanCol;
                                    }));
                                }
                                else {
                                    tableColumns.forEach(c => {
                                        const col = document.createElement(elementName);
                                        addClass(col, `${c.cssClass ?? ""} ${c.isTextColumn ? "text" : "value"} ${scope.name}-${c.name}`);
                                        col.innerHTML = application.getLocalizedString(r[c.name]) ?? "";
                                        row.append(col);
                                    });
                                }
                                rowContainer.append(row);
                            });
                            if (hasResponsiveTable) {
                                const container = document.createElement("div");
                                container.classList.add("table-responsive");
                                container.append(table);
                                ctx.el.append(container);
                            }
                            else {
                                ctx.el.append(table);
                            }
                        }
                    }
                });
            };
        }
    }
    KatApps.DirectiveKaTable = DirectiveKaTable;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class Directives {
        static initializeCoreDirectives(vueApp, application) {
            [
                new KatApps.DirectiveKaAttributes(),
                new KatApps.DirectiveKaInline(),
                new KatApps.DirectiveKaResource(),
                new KatApps.DirectiveKaHighchart(),
                new KatApps.DirectiveKaTable(),
                new KatApps.DirectiveKaValue(),
                new KatApps.DirectiveKaNavigate(),
                new KatApps.DirectiveKaModal(),
                new KatApps.DirectiveKaApp(),
                new KatApps.DirectiveKaApi()
            ].forEach(d => {
                vueApp.directive(d.name, d.getDefinition(application));
            });
        }
    }
    KatApps.Directives = Directives;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class DirectiveKaValue {
        name = "ka-value";
        getDefinition(application) {
            return ctx => {
                const model = ctx.exp.startsWith("{") ? ctx.get() : undefined;
                if (model != undefined && model.table == undefined) {
                    model.table = "rbl-value";
                }
                const selector = ctx.exp.startsWith("{")
                    ? undefined
                    : ctx.exp;
                let selectors = selector?.split(".").map(s => s != "" ? s : undefined) ?? [];
                if (selectors.length == 1) {
                    selectors = ["rbl-value", selectors[0]];
                }
                const getSelector = function (pos) {
                    return selectors.length > pos && selectors[pos] != "" ? selectors[pos] : undefined;
                };
                ctx.effect(() => {
                    ctx.el.innerHTML =
                        application.getLocalizedString(application.state.rbl.value(model?.table ?? getSelector(0), model?.keyValue ?? getSelector(1), model?.returnField ?? getSelector(2), model?.keyField ?? getSelector(3), model?.ce ?? getSelector(4), model?.tab ?? getSelector(5)) ?? ctx.el.innerText);
                });
            };
        }
    }
    KatApps.DirectiveKaValue = DirectiveKaValue;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class HelpTips {
        static currentPopoverTarget;
        static visiblePopover;
        static visiblePopoverApp;
        static visiblePopupContentSource;
        static hideVisiblePopover(selectorPredicate) {
            const visiblePopover = HelpTips.visiblePopover;
            if (visiblePopover?.getAttribute("ka-init-tip") == "true" &&
                (selectorPredicate == undefined || HelpTips.visiblePopoverApp.el[0].matches(selectorPredicate))) {
                bootstrap.Popover.getInstance(visiblePopover).hide();
                return true;
            }
            return false;
        }
        static processHelpTips(container, selector, tipsToProcess) {
            if (document.querySelector("html").getAttribute("ka-init-tip") != "true") {
                let clearTargetTimeout;
                const html = document.querySelector("html");
                html.setAttribute("ka-init-tip", "true");
                html.addEventListener("click", e => {
                    const target = e.target;
                    const targetLink = target.closest("a, button");
                    const isInsideTip = target.closest(".popover-header, .popover-body") != undefined;
                    const processLinkJs = targetLink != undefined && targetLink.classList.contains("ka-ht-js");
                    if (target.tagName == 'BUTTON' || !(processLinkJs || isInsideTip)) {
                        HelpTips.hideVisiblePopover();
                    }
                });
                html.addEventListener("keyup", e => {
                    if (e.key == "Escape") {
                        e.preventDefault();
                        HelpTips.hideVisiblePopover();
                    }
                });
                html.addEventListener("inserted.bs.tooltip", e => {
                    const target = e.target;
                    const tipId = "#" + target.getAttribute("aria-describedby");
                    const tip = document.querySelector(tipId);
                    if (target.classList.contains("error")) {
                        tip?.classList.add("error");
                    }
                    else if (target.classList.contains("warning")) {
                        tip?.classList.add("warning");
                    }
                });
                html.addEventListener("inserted.bs.popover", async (e) => {
                    const target = e.target;
                    const application = KatApp.get(target) ?? KatApp.applications.find(a => a.options.canProcessExternalHelpTips) ?? KatApp.applications[0];
                    const templateId = "#" + target.getAttribute("aria-describedby");
                    document.querySelector(templateId).classList.add("kaPopup");
                    const popupAppOptions = application.cloneOptions(false);
                    let cloneHost = false;
                    if (HelpTips.visiblePopupContentSource != undefined) {
                        cloneHost = application.getCloneHostSetting(HelpTips.visiblePopupContentSource);
                        if (cloneHost === true) {
                            cloneHost = application.selector;
                        }
                        popupAppOptions.cloneHost = cloneHost;
                    }
                    HelpTips.visiblePopoverApp = await KatApp.createAppAsync(templateId, popupAppOptions);
                });
                html.addEventListener("show.bs.popover", e => {
                    if (clearTargetTimeout != undefined) {
                        clearTimeout(clearTargetTimeout);
                        clearTargetTimeout = undefined;
                    }
                    HelpTips.hideVisiblePopover();
                    HelpTips.currentPopoverTarget = e.target;
                });
                html.addEventListener("shown.bs.popover", e => HelpTips.visiblePopover = e.target);
                html.addEventListener("hide.bs.popover", e => {
                    if (HelpTips.visiblePopoverApp != undefined) {
                        KatApp.remove(HelpTips.visiblePopoverApp);
                    }
                    HelpTips.visiblePopover = undefined;
                    HelpTips.visiblePopoverApp = undefined;
                    HelpTips.visiblePopupContentSource = undefined;
                    clearTargetTimeout = setTimeout(() => {
                        HelpTips.currentPopoverTarget = undefined;
                        clearTargetTimeout = undefined;
                    }, 200);
                });
            }
            const selectHelptipInfo = (search, application, context) => $(search, $(context ?? application?.el[0] ?? document));
            const getTipContent = function (h) {
                const dataContentSelector = h.getAttribute('data-bs-content-selector');
                if (dataContentSelector != undefined) {
                    const contentSource = selectHelptipInfo(dataContentSelector, KatApp.get(h));
                    HelpTips.visiblePopupContentSource = contentSource.length > 0 ? contentSource[0] : undefined;
                    if (HelpTips.visiblePopupContentSource == undefined)
                        return undefined;
                    const selectorContent = $("<div/>");
                    selectorContent.append($(HelpTips.visiblePopupContentSource).contents().clone(true));
                    return selectorContent;
                }
                const content = h.getAttribute('data-bs-content') ?? h.nextElementSibling?.innerHTML;
                const labelFix = h.getAttribute("data-label-fix");
                return labelFix != undefined
                    ? content.replace(/\{Label}/g, selectHelptipInfo("." + labelFix, KatApp.get(h))[0].innerHTML)
                    : content;
            };
            const getTipTitle = function (h) {
                if (h.getAttribute('data-bs-toggle') == "tooltip")
                    return getTipContent(h);
                const titleSelector = h.getAttribute('data-bs-content-selector');
                if (titleSelector != undefined) {
                    const title = selectHelptipInfo(titleSelector + "Title", KatApp.get(h));
                    if (title.length > 0 && title[0].innerHTML != "") {
                        return title[0].innerHTML;
                    }
                }
                return "";
            };
            const currentTips = (tipsToProcess != undefined ? $(tipsToProcess) : undefined) ??
                selectHelptipInfo(selector ?? "[data-bs-toggle='tooltip'], [data-bs-toggle='popover']", KatApp.get(container), container.tagName == "A" || container.tagName == "BUTTON"
                    ? container.parentElement
                    : container);
            currentTips.each((i, tip) => {
                if (tip.getAttribute("ka-init-tip") == "true")
                    return;
                const isTooltip = tip.getAttribute("data-bs-toggle") == "tooltip";
                if (tip.parentElement?.tagName == "LABEL" && tip.parentElement?.parentElement?.querySelector("input[type=checkbox]") != undefined) {
                    tip.addEventListener("click", e => {
                        e.stopPropagation();
                        tip.click();
                    });
                }
                const getTipContainer = function () {
                    if (tip.hasAttribute('data-bs-container'))
                        return tip.getAttribute('data-bs-container');
                    if (tip.parentElement != undefined) {
                        let el = tip;
                        while ((el = el.parentElement) && el !== document) {
                            if (el.tagName == "LABEL") {
                                return el.parentElement;
                            }
                        }
                        return tip.parentElement;
                    }
                    return tip;
                };
                const options = {
                    html: true,
                    sanitize: false,
                    trigger: tip.getAttribute('data-bs-trigger') ?? "hover",
                    container: getTipContainer(),
                    template: isTooltip
                        ? '<div class="tooltip katapp-css" role="tooltip"><div class="tooltip-arrow arrow"></div><div class="tooltip-inner"></div></div>'
                        : '<div v-scope class="popover katapp-css" role="tooltip"><div class="popover-arrow arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
                    placement: (tooltip, trigger) => {
                        const dataClass = trigger.getAttribute('data-bs-class');
                        if (dataClass != undefined) {
                            tooltip.classList.add(dataClass);
                        }
                        const dataWidth = `${trigger.getAttribute('data-bs-width') ?? "350"}px`;
                        tooltip.style.width = dataWidth;
                        tooltip.style.maxWidth = dataWidth;
                        const inner = tooltip.querySelector('.tooltip-inner');
                        if (inner != undefined) {
                            inner.style.width = dataWidth;
                            inner.style.maxWidth = dataWidth;
                        }
                        return tip.getAttribute('data-bs-placement') ?? "auto";
                    },
                    fallbackPlacements: tip.getAttribute('data-bs-fallback-placements')?.split(",") ?? ["top", "right", "bottom", "left"],
                    title: function () {
                        return getTipTitle(this);
                    },
                    content: function () {
                        return getTipContent(this);
                    }
                };
                if (isTooltip) {
                    new bootstrap.Tooltip(tip, options);
                }
                else {
                    new bootstrap.Popover(tip, options);
                }
                tip.setAttribute("ka-init-tip", "true");
            });
        }
    }
    KatApps.HelpTips = HelpTips;
})(KatApps || (KatApps = {}));
var TraceVerbosity;
(function (TraceVerbosity) {
    TraceVerbosity[TraceVerbosity["None"] = 0] = "None";
    TraceVerbosity[TraceVerbosity["Quiet"] = 1] = "Quiet";
    TraceVerbosity[TraceVerbosity["Minimal"] = 2] = "Minimal";
    TraceVerbosity[TraceVerbosity["Normal"] = 3] = "Normal";
    TraceVerbosity[TraceVerbosity["Detailed"] = 4] = "Detailed";
    TraceVerbosity[TraceVerbosity["Diagnostic"] = 5] = "Diagnostic";
})(TraceVerbosity || (TraceVerbosity = {}));
var KatApps;
(function (KatApps) {
    class KamlCompiler {
        showInspector;
        applicationId;
        constructor(application) {
            this.showInspector = application.options.debug.showInspector != "0";
            this.applicationId = application.id;
        }
        compileMarkup(kaml, resourceKey) {
            const kaResources = document.querySelector("ka-resources");
            const processingTemplates = resourceKey != this.applicationId;
            if (processingTemplates) {
                const keyParts = resourceKey.split(":");
                const containerId = keyParts[keyParts.length - 1].split("?")[0].replace(/\//g, "_");
                const kamlTemplatesAdded = kaResources.querySelector(`style[ka=${containerId}]`) != undefined;
                kaml.querySelectorAll("style").forEach(s => {
                    if (kamlTemplatesAdded) {
                        s.remove();
                    }
                    else {
                        s.setAttribute("ka", containerId);
                        kaResources.appendChild(s);
                    }
                });
            }
            this.processMarkup(kaml);
            kaml.querySelectorAll("template[id]")
                .forEach(template => {
                const keyParts = resourceKey.split(":");
                const containerId = keyParts[keyParts.length - 1].split("?")[0].replace(/\//g, "_");
                template.id = `${template.id}_${containerId}`;
                if (kaResources.querySelector(`template[id=${template.id}]`) == undefined) {
                    this.processMarkup(template.content);
                    if (template.hasAttribute("input")) {
                        this.mountInputs(template.content);
                        template.removeAttribute("input");
                    }
                    template.content.querySelectorAll("style, script").forEach(templateItem => {
                        this.addMountAttribute(templateItem, "mounted", `_templateItemMounted('${template.id}', $el, $data)`);
                        if (templateItem.tagName == "SCRIPT") {
                            this.addMountAttribute(templateItem, "unmounted", `_templateItemUnmounted('${template.id}', $el, $data)`);
                        }
                    });
                    kaResources.appendChild(template);
                }
                else {
                    template.remove();
                }
            });
        }
        checkVueSyntax(container) {
            let compileError = false;
            container.querySelectorAll("[v-for][v-if]").forEach(directive => {
                console.log(directive);
                compileError = true;
            });
            if (compileError) {
                throw new Error("v-for and v-if on same element.  The v-for should be moved to a child <template v-for/> element.");
            }
            container.querySelectorAll("[v-ka-inline]").forEach(directive => {
                if (directive.tagName != "TEMPLATE" || !directive.hasAttribute("v-html")) {
                    console.log(directive);
                    compileError = true;
                }
            });
            if (compileError) {
                throw new Error("v-ka-inline can only be used on <template/> elements and must have a v-html attribute.");
            }
            container.querySelectorAll("template:not([id])").forEach(template => {
                Array.from(template.content.children).filter(c => c.hasAttribute("v-if")).forEach(invalid => {
                    console.log(invalid);
                    compileError = true;
                });
            });
            if (compileError) {
                throw new Error("A v-if can not be a direct decendent of an inline <template/>.  Wrap the v-if element with a div.");
            }
        }
        processMarkup(container) {
            this.checkVueSyntax(container);
            container.querySelectorAll("[v-ka-input], [v-ka-input-group], [v-ka-template]").forEach(directive => {
                if (directive.hasAttribute("v-ka-input")) {
                    let scope = directive.getAttribute("v-ka-input");
                    if (!scope.startsWith("{")) {
                        scope = `{ name: '${scope}' }`;
                    }
                    if (!this.showInspector) {
                        directive.removeAttribute("v-ka-input");
                    }
                    directive.setAttribute("v-scope", `components.input(${scope})`);
                    if (scope.indexOf("template:") == -1 && scope.indexOf("'template':") == -1) {
                        const isInput = ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(directive.tagName) > -1;
                        if (isInput) {
                            this.mountInput(directive);
                        }
                        else {
                            this.mountInputs(directive);
                        }
                    }
                }
                else if (directive.hasAttribute("v-ka-input-group")) {
                    const scope = directive.getAttribute("v-ka-input-group");
                    if (!this.showInspector) {
                        directive.removeAttribute("v-ka-input-group");
                    }
                    directive.setAttribute("v-scope", `components.inputGroup(${scope})`);
                }
                else {
                    const needsReactiveForRE = /.*?name'?\s*:\s*(?<value>'?[\w\s\.]+'?)/;
                    const exp = directive.getAttribute("v-ka-template");
                    const scope = exp.startsWith("{")
                        ? exp
                        : `{ name: '${exp}' }`;
                    const nameValue = needsReactiveForRE.exec(scope)?.groups.value ?? "";
                    const needsReactiveFor = !directive.hasAttribute("v-for") && !nameValue.startsWith("'");
                    if (needsReactiveFor) {
                        directive.removeAttribute("v-ka-template");
                        directive.setAttribute("v-scope", `components.template({ name: _reactive_template.name, source: _reactive_template.source})`);
                        directive.outerHTML = `<template v-for="_reactive_template in [${scope}]" :key="_reactive_template.name">${directive.outerHTML}<template>`;
                        if (this.showInspector) {
                            directive.setAttribute("v-ka-template", exp);
                        }
                    }
                    else {
                        directive.setAttribute("v-scope", `components.template(${scope})`);
                        if (!this.showInspector) {
                            directive.removeAttribute("v-ka-template");
                        }
                    }
                }
            });
            container.querySelectorAll("[v-ka-inline]").forEach(directive => {
                directive.setAttribute("v-ka-inline", directive.getAttribute("v-html"));
            });
            container.querySelectorAll("[v-ka-highchart], [v-ka-table], [v-ka-api], [v-ka-navigate]").forEach(directive => {
                if (directive.hasAttribute("v-ka-highchart")) {
                    const scope = directive.getAttribute("v-ka-highchart");
                    if (!scope.startsWith("{")) {
                        const chartParts = scope.split('.');
                        const data = chartParts[0];
                        const options = chartParts.length >= 2 ? chartParts[1] : chartParts[0];
                        directive.setAttribute("v-ka-highchart", `{ data: '${data}', options: '${options}' }`);
                    }
                }
                else if (directive.hasAttribute("v-ka-table")) {
                    const scope = directive.getAttribute("v-ka-table");
                    if (!scope.startsWith("{")) {
                        directive.setAttribute("v-ka-table", `{ name: '${scope}' }`);
                    }
                }
                else if (directive.hasAttribute("v-ka-api")) {
                    const scope = directive.getAttribute("v-ka-api");
                    if (!scope.startsWith("{")) {
                        directive.setAttribute("v-ka-api", `{ endpoint: '${scope}' }`);
                    }
                }
                else if (directive.hasAttribute("v-ka-navigate")) {
                    const scope = directive.getAttribute("v-ka-navigate");
                    if (!scope.startsWith("{")) {
                        directive.setAttribute("v-ka-navigate", `{ view: '${scope}' }`);
                    }
                }
            });
            container.querySelectorAll("[v-ka-rbl-no-calc], [v-ka-rbl-exclude], [v-ka-unmount-clears-inputs]").forEach(directive => {
                if (directive.hasAttribute("v-ka-rbl-no-calc")) {
                    directive.removeAttribute("v-ka-rbl-no-calc");
                    directive.setAttribute("ka-rbl-no-calc", "true");
                }
                if (directive.hasAttribute("v-ka-rbl-exclude")) {
                    directive.removeAttribute("v-ka-rbl-exclude");
                    directive.setAttribute("ka-rbl-exclude", "true");
                }
                if (directive.hasAttribute("v-ka-unmount-clears-inputs")) {
                    directive.removeAttribute("v-ka-unmount-clears-inputs");
                    directive.setAttribute("ka-unmount-clears-inputs", "true");
                }
            });
            container.querySelectorAll("button[v-ka-needs-calc], a[v-ka-needs-calc]").forEach(directive => {
                let needsCalcText = directive.getAttribute("v-ka-needs-calc");
                if (needsCalcText == "") {
                    needsCalcText = "<i class='fa-solid fa-rotate-right'></i>&nbsp;Refresh";
                }
                if (!this.showInspector) {
                    directive.removeAttribute("v-ka-needs-calc");
                }
                directive.setAttribute("v-if", "!needsCalculation");
                directive.classList.add("ka-needs-calc");
                const refresh = directive.cloneNode(true);
                refresh.removeAttribute("v-ka-needs-calc");
                for (const { name, value } of [...refresh.attributes]) {
                    if (name.startsWith("@click")) {
                        refresh.attributes.removeNamedItem(name);
                    }
                }
                refresh.innerHTML = needsCalcText;
                refresh.setAttribute("v-if", "needsCalculation");
                directive.after(refresh);
            });
            container.querySelectorAll("[v-for], [v-if], [v-else-if], [v-else]").forEach(directive => {
                this.addMountAttribute(directive, "mounted", `_domElementMounted($el)`);
            });
            if (this.showInspector) {
                container.querySelectorAll("[v-if], [v-show]").forEach(directive => {
                    const condition = directive.getAttribute("v-if") ?? directive.getAttribute("v-show");
                    if (directive.classList.contains("ka-needs-calc") || ["uiBlocked", "!uiBlocked"].indexOf(condition) != -1) {
                        return;
                    }
                    const conditions = [condition];
                    const isIf = directive.hasAttribute("v-if");
                    let createInspectorIndicator = !directive.hasAttribute("v-for");
                    if (createInspectorIndicator && isIf) {
                        let ifElement = directive;
                        while (["v-else-if", "v-else"].some(a => ifElement.nextElementSibling?.hasAttribute(a))) {
                            ifElement = ifElement.nextElementSibling;
                            if (ifElement.hasAttribute("v-else")) {
                                createInspectorIndicator = false;
                            }
                            else {
                                conditions.push(ifElement.getAttribute("v-else-if"));
                            }
                        }
                        ;
                    }
                    if (createInspectorIndicator) {
                        const inspectorIndicator = document.createElement("div");
                        const tagTitle = conditions.length > 1 ? "v-if/v-else-if" : isIf ? "v-if" : "v-show";
                        const expressionTitle = conditions.length > 1 ? "all following expression(s) evaluated to false:" : "the following expression evaluated to false:";
                        inspectorIndicator.innerHTML =
                            `<i class='fa-solid fa-eye'></i>
<!--
Inspector: ${tagTitle} hidden, ${expressionTitle}
${conditions.map(c => `\t${c}`).join("\r\n")}
-->`;
                        inspectorIndicator.setAttribute(isIf ? "v-if" : "v-show", `!(${conditions.join(" && ")})`);
                        inspectorIndicator.classList.add("v-opposite", isIf ? "ka-inspector-if-hidden" : "ka-inspector-show-hidden");
                        directive.before(inspectorIndicator);
                    }
                });
            }
            if (this.showInspector) {
                this.inspectChildren(container);
            }
            container.querySelectorAll("template:not([id])").forEach(template => {
                this.processMarkup(template.content);
            });
        }
        inspectChildren(node) {
            let child = node.firstChild;
            while (child) {
                child = this.inspectChild(child) ?? child.nextSibling;
            }
        }
        delimiters = ['{{', '}}'];
        escapeRegex = (str) => str.replace(/[-.*+?^${}()|[\]\/\\]/g, '\\$&');
        delimitersRE = new RegExp(this.escapeRegex(this.delimiters[0]) + '([^]+?)' + this.escapeRegex(this.delimiters[1]), 'g');
        directiveRE = /^(?:v-|ka-rbl-|ka-unmount-|:|@)/;
        inspectChild(node) {
            if (node.nodeType == 1) {
                const el = node;
                this.inspectChildren(el);
                const isFlag = (name) => ["ka-inspector-rbl-no-calc", "ka-inspector-rbl-exclude", "ka-inspector-unmount-clears-inputs"].indexOf(name) != -1;
                const isComponent = (attribute) => ["v-ka-needs-calc", "v-ka-input", "v-ka-input-group", "v-ka-template"].indexOf(attribute) != -1;
                const directives = {};
                const addClass = (css, attribute, value) => {
                    const propName = isComponent(attribute) ? attribute : css;
                    if (directives[propName] == undefined) {
                        directives[propName] = [];
                        el.classList.add(css);
                        if (attribute == "v-ka-needs-calc") {
                            el.nextElementSibling.classList.add(css);
                        }
                        if (isComponent(attribute)) {
                            el.removeAttribute(attribute);
                        }
                    }
                    directives[propName].push(isComponent(attribute)
                        ? (value == "" && attribute == "v-ka-needs-calc" ? "[default]" : value)
                        : `${attribute}="${value}"`);
                };
                for (const { name, value } of [...el.attributes]) {
                    if (this.directiveRE.test(name) && name !== 'v-cloak') {
                        if (name[0] === '@') {
                            addClass("ka-inspector-on", name, value);
                        }
                        else if (name[0] === ':') {
                            if (!(name == ":key" && el.hasAttribute("v-for"))) {
                                addClass("ka-inspector-bind", name, value);
                            }
                        }
                        else if (name.startsWith("v-ka-")) {
                            addClass(`ka-inspector-${name.substring(5)}`, name, value);
                        }
                        else if (name.startsWith("ka-")) {
                            addClass(`ka-inspector-${name.substring(3)}`, name, value);
                        }
                        else if (["v-else-if", "v-else"].indexOf(name) != -1) {
                            addClass("ka-inspector-if", name, value);
                        }
                        else if (!(name == "v-scope" && (value.startsWith("components.template") || value.startsWith("components.input"))) &&
                            !(name == "v-if" && (["ka-needs-calc", "ka-inspector-if-hidden", "ka-inspector-show-hidden"].some(c => el.classList.contains(c)) || ["uiBlocked", "!uiBlocked"].indexOf(value) > -1)) &&
                            !(name == "v-for" && value.startsWith("_reactive_template")) &&
                            !(name.startsWith("v-on:vue:mounted") && ["_domElementMounted", "inputMounted", "_templateItemMounted"].some(exp => value.startsWith(exp))) &&
                            !(name.startsWith("v-on:vue:unmounted") && ["inputUnmounted", "_templateItemUnmounted"].some(exp => value.startsWith(exp)))) {
                            const dirName = name.split(":")[0];
                            addClass(`ka-inspector-${dirName.substring(2)}`, name, value);
                        }
                    }
                }
                let details = [];
                const addDirectiveDetails = (name, values, directiveIndent) => {
                    if (isFlag(name)) {
                        details.push(`${directiveIndent}${name}: true`);
                    }
                    else if (name != "ka-inspector-pre") {
                        details.push(values.length > 1
                            ? `${directiveIndent}${name} expressions:${"\r\n" + values.map(v => "\t" + v).join("\r\n")}`
                            : `${directiveIndent}${name}: ${values[0]}`);
                    }
                };
                let directiveIndent = "";
                ["ka-inspector-if", "ka-inspector-for"].forEach(d => {
                    if (directives[d] != undefined) {
                        directiveIndent = "\t";
                        addDirectiveDetails(d, directives[d], "");
                    }
                });
                for (const [name, values] of Object.entries(directives).filter(([name, values]) => !["ka-inspector-if", "ka-inspector-for"].includes(name))) {
                    addDirectiveDetails(name, values, directiveIndent);
                }
                if (details.length > 0) {
                    const getPreviousComment = (target) => {
                        const previousComment = target.inspector;
                        if (previousComment != undefined) {
                            const data = previousComment.data.substring(2, previousComment.data.length - 2);
                            target.previousSibling?.remove();
                            delete target.inspector;
                            return data.split("\r\n");
                        }
                        return [];
                    };
                    let target = el;
                    details.push(...getPreviousComment(target).map(c => directives["ka-inspector-if"] != undefined ? "\t" + c : c));
                    if (directives["ka-inspector-if"] != undefined && ["v-else-if", "v-else"].some(a => el.hasAttribute(a))) {
                        let ifElement = el;
                        while ((ifElement = ifElement.previousElementSibling)) {
                            if (ifElement.hasAttribute("v-if")) {
                                target = ifElement;
                                const ifComments = getPreviousComment(target);
                                ifComments.push(...details);
                                details = ifComments;
                                break;
                            }
                        }
                    }
                    target.before(target.inspector = new Comment("\r\n" + details.join("\r\n") + "\r\n"));
                }
            }
            else if (node.nodeType == 3 && node.parentNode.tagName != "SCRIPT") {
                const data = node.data;
                const parent = node.parentElement;
                let textBindings = [];
                let match;
                while ((match = this.delimitersRE.exec(data))) {
                    if (textBindings.length == 0) {
                        parent.classList.add("ka-inspector-text");
                    }
                    textBindings.push(match[0].trim());
                }
                if (textBindings.length > 0) {
                    parent.before(parent.inspector = textBindings.length > 1
                        ? new Comment("\r\nka-inspector-text bindings:\r\n" + textBindings.map(b => "\t" + b).join("\r\n") + "\r\n")
                        : new Comment("\r\nka-inspector-text binding: " + textBindings[0] + "\r\n"));
                }
            }
        }
        mountInputs(container) {
            container.querySelectorAll("input:not([v-ka-nomount]), select:not([v-ka-nomount]), textarea:not([v-ka-nomount])").forEach(input => {
                this.mountInput(input);
            });
            container.querySelectorAll("template[v-for]").forEach(t => {
                this.mountInputs(t.content);
            });
        }
        ;
        mountInput(input) {
            this.addMountAttribute(input, "mounted", "inputMounted($el, $refs)");
            this.addMountAttribute(input, "unmounted", "inputUnmounted($el)");
        }
        ;
        addMountAttribute(el, type, exp, predicate) {
            let mountScript = el.getAttribute("v-on:vue:" + type) ?? el.getAttribute("@vue:" + type) ?? "";
            if (predicate?.(mountScript) ?? true) {
                el.removeAttribute("v-on:vue:" + type);
                el.removeAttribute("@vue:" + type);
                if (mountScript.startsWith("handlers.") && mountScript.indexOf("(") == -1) {
                    mountScript += "($event)";
                }
                el.setAttribute("v-on:vue:" + type, `${mountScript != '' ? mountScript + ';' : ''}${exp}`);
            }
        }
    }
    KatApps.KamlCompiler = KamlCompiler;
})(KatApps || (KatApps = {}));
var KatApps;
(function (KatApps) {
    class KamlRepository {
        static resourceRequests = {};
        static async getViewResourceAsync(options, view) {
            return this.getKamlResourcesAsync(options, [view], true);
        }
        static async getTemplateResourcesAsync(options, resourceArray) {
            return this.getKamlResourcesAsync(options, resourceArray, false);
        }
        static async getKamlResourcesAsync(options, resourceArray, isView) {
            const currentOptions = options;
            const useLocalWebServer = currentOptions.debug.debugResourcesDomain != undefined &&
                (currentOptions.useLocalRepository ?? (currentOptions.useLocalRepository = await KatApps.Utils.checkLocalServerAsync(currentOptions)));
            var resourceResults = await Promise.allSettled(resourceArray.map(resourceKey => {
                if (!isView) {
                    var currentRequest = KamlRepository.resourceRequests[resourceKey];
                    if (currentRequest != undefined) {
                        var currentRequestPromise = $.Deferred();
                        currentRequest.push((errorMessage) => {
                            if (errorMessage != undefined) {
                                currentRequestPromise.reject({
                                    resourceKey: resourceKey,
                                    errorMessage: errorMessage,
                                    processedByOtherApp: true
                                });
                            }
                            else {
                                currentRequestPromise.resolve({
                                    resourceKey: resourceKey,
                                    processedByOtherApp: true
                                });
                            }
                        });
                        return currentRequestPromise;
                    }
                    KamlRepository.resourceRequests[resourceKey] = [];
                }
                return this.getResourceAsync(currentOptions, resourceKey, useLocalWebServer);
            }));
            const rejected = resourceResults
                .filter(r => r.status == "rejected")
                .map(r => r.reason)
                .map(r => ({
                Exception: r instanceof KamlResourceDownloadError ? r : undefined,
                Response: !(r instanceof KamlResourceDownloadError) ? r : undefined
            }))
                .map(r => r.Exception != undefined
                ? {
                    resourceKey: r.Exception.resourceKey,
                    processedByOtherApp: false,
                    errorMessage: r.Exception.message
                }
                : r.Response);
            const resolved = resourceResults
                .filter(r => r.status == "fulfilled")
                .map(r => r.value);
            if (rejected.length > 0) {
                if (!isView) {
                    rejected
                        .filter(r => !r.processedByOtherApp)
                        .forEach(f => {
                        KamlRepository.resourceRequests[f.resourceKey].forEach(c => c(f.errorMessage));
                        delete KamlRepository.resourceRequests[f.resourceKey];
                    });
                    resolved
                        .filter(r => !r.processedByOtherApp)
                        .forEach(f => {
                        KamlRepository.resourceRequests[f.resourceKey].forEach(c => c());
                        delete KamlRepository.resourceRequests[f.resourceKey];
                    });
                }
                throw new KamlRepositoryError("Failed to download Kaml repositoryItems.", rejected.map(r => ({ resource: r.resourceKey, errorMessage: r.errorMessage })));
            }
            else {
                const results = {};
                resolved
                    .filter(r => !r.processedByOtherApp)
                    .forEach(r => {
                    results[r.resourceKey] = r.content;
                });
                return results;
            }
        }
        static resolveTemplate(resourceKey) {
            this.resourceRequests[resourceKey].forEach(c => c());
            delete this.resourceRequests[resourceKey];
        }
        static async downloadResourceAsync(url, tryLocalWebServer, isRetry = false) {
            const requestHeaders = new Headers(!tryLocalWebServer ? { 'Cache-Control': 'max-age=0' } : {});
            const response = await fetch(url, {
                method: "GET",
                headers: requestHeaders,
                cache: !tryLocalWebServer ? 'default' : undefined
            });
            if (!response.ok) {
                const statusText = response.status == 404 ? "Resource not found." :
                    response.status == 400 ? (await response.json()).detail :
                        `Status: ${response.status}, StatusText: ${response.statusText}`;
                console.log({
                    url: url,
                    cache: !tryLocalWebServer,
                    status: response.status,
                    statusText: statusText,
                    requestHeaders: Object.fromEntries(requestHeaders.entries()),
                    responseHeaders: Object.fromEntries(response.headers.entries())
                });
                return !isRetry && (response.status == 500 || response.status == 415)
                    ? await this.downloadResourceAsync(url, tryLocalWebServer, true)
                    : { errorMessage: statusText };
            }
            return { data: await response.text() };
        }
        ;
        static async getResourceAsync(currentOptions, resourceKey, tryLocalWebServer) {
            const relativeTemplatePath = currentOptions.relativePathTemplates?.[resourceKey];
            const resourceParts = relativeTemplatePath != undefined ? relativeTemplatePath.split(":") : resourceKey.split(":");
            let resourceName = resourceParts[1];
            const resourceFolders = resourceParts[0].split("|");
            const version = resourceParts.length > 2 ? resourceParts[2] : (currentOptions.debug.useTestView ? "Test" : "Live");
            const resourceNameParts = resourceName.split("?");
            const resourceNameBase = resourceNameParts[0];
            if (!resourceNameBase.endsWith(".kaml")) {
                resourceName = resourceNameBase + ".kaml";
                if (resourceNameParts.length == 2) {
                    resourceName += "?" + resourceNameParts[1];
                }
            }
            let localWebServerResource = resourceName;
            let resourceUrl = "unavailable";
            let lastResult = { errorMessage: "unavailable" };
            for (let i = 0; i < resourceFolders.length; i++) {
                let localWebServerFolder = resourceFolders[i];
                const isResourceInManagementSite = String.compare(localWebServerFolder, "Rel", true) != 0;
                if (!isResourceInManagementSite) {
                    const relativeResourceConfig = resourceName.split('/').slice(2);
                    localWebServerFolder = relativeResourceConfig[0];
                    localWebServerResource = relativeResourceConfig.slice(1).join("/");
                }
                const localServerUrl = "https://" + currentOptions.debug.debugResourcesDomain + "/KatApp/" + localWebServerFolder + "/" + localWebServerResource;
                resourceUrl = tryLocalWebServer
                    ? localServerUrl.substring(0, 4) + localServerUrl.substring(5) + location.search
                    : !isResourceInManagementSite
                        ? currentOptions.baseUrl + resourceName.substring(1) + location.search
                        : currentOptions.katDataStoreUrl;
                if (!tryLocalWebServer && isResourceInManagementSite) {
                    resourceUrl = resourceUrl.replace("{name}", resourceName) + `?folders=${resourceParts[0].split("|").join(",")}&preferTest=${version == "Test"}`;
                }
                lastResult = await this.downloadResourceAsync(resourceUrl, tryLocalWebServer);
                if (lastResult.data != undefined) {
                    let content = lastResult.data;
                    if (tryLocalWebServer) {
                        const resourcePath = resourceKey.split("?")[0];
                        const resourceKeyParts = resourcePath.split("/");
                        const fileNameParts = resourceKeyParts[resourceKeyParts.length - 1].split(":");
                        const fileName = fileNameParts[fileNameParts.length - 1];
                        const resourceTypesToProcess = content.match(/local-kaml-package=\"(.*?)\"/)?.[1].split(",").map(k => k.trim().toLowerCase()) ?? [];
                        const processTemplateItems = resourcePath.toLowerCase().indexOf("templates") > -1 || resourceTypesToProcess.indexOf("template.items") > -1;
                        if (fileName.endsWith(".kaml") && (resourceTypesToProcess.length > 0 || processTemplateItems)) {
                            const jsResult = resourceTypesToProcess.indexOf("js") == -1 ? undefined : await this.downloadResourceAsync(resourceUrl.replace(fileName, fileName + ".js"), true);
                            const cssResult = resourceTypesToProcess.indexOf("css") == -1 ? undefined : await this.downloadResourceAsync(resourceUrl.replace(fileName, fileName + ".css"), true);
                            const templateResult = resourceTypesToProcess.indexOf("templates") == -1 ? undefined : await this.downloadResourceAsync(resourceUrl.replace(fileName, fileName + ".templates"), true);
                            const lines = content.split("\n");
                            const templateScriptPattern = /^\s*<template[^>]* id="[^"]+"([^>]* script="(?<script>[^"]+)")?([^>]* script\.setup="(?<setup>[^"]+)")?([^>]* css="(?<css>[^"]+)")?[^>]*>\s*$/;
                            let templateMatch = null;
                            const contentLines = await Promise.all(lines.map(async (line, index) => {
                                if (line.indexOf("</rbl-config>") >= 0) {
                                    if (jsResult?.data != undefined) {
                                        line += `
<script>
	(function () {
${jsResult.data.split("\n").map(jsLine => "\t\t" + jsLine).join("\n")}
	})();
	//# sourceURL=${fileName}
</script>
`;
                                    }
                                    if (cssResult?.data != undefined) {
                                        line += `
<style>
${cssResult.data.split("\n").map(cssLine => "\t" + cssLine).join("\n")}
</style>
`;
                                    }
                                    if (index == lines.length - 1 && templateResult?.data != undefined) {
                                        line += "\n" + templateResult.data.split("\n").map(templateLine => "\t" + templateLine).join("\n");
                                    }
                                }
                                else if (processTemplateItems && (templateMatch = line.match(templateScriptPattern)) != null) {
                                    const setup = templateMatch.groups?.setup;
                                    const script = templateMatch.groups?.script;
                                    const css = templateMatch.groups?.css;
                                    if (setup != undefined) {
                                        const scriptFileName = `${fileName}.${setup}.js`;
                                        const templateScriptFile = await this.downloadResourceAsync(resourceUrl.replace(fileName, scriptFileName), true);
                                        if (templateScriptFile?.data != undefined) {
                                            line += `
	<script setup>
${templateScriptFile.data.split("\n").map(jsLine => "\t\t" + jsLine).join("\n")}
		//# sourceURL=${scriptFileName}
	</script>
`;
                                        }
                                    }
                                    if (script != undefined) {
                                        const scriptFileName = `${fileName}.${script}.js`;
                                        const templateScriptFile = await this.downloadResourceAsync(resourceUrl.replace(fileName, scriptFileName), true);
                                        if (templateScriptFile?.data != undefined) {
                                            line += `
	<script>
${templateScriptFile.data.split("\n").map(jsLine => "\t\t" + jsLine).join("\n")}
		//# sourceURL=${scriptFileName}
	</script>
`;
                                        }
                                    }
                                    if (css != undefined) {
                                        const scriptFileName = `${fileName}.${css}.css`;
                                        const templateScriptFile = await this.downloadResourceAsync(resourceUrl.replace(fileName, scriptFileName), true);
                                        if (templateScriptFile?.data != undefined) {
                                            line += `
	<style>
${templateScriptFile.data.split("\n").map(jsLine => "\t\t" + jsLine).join("\n")}
	</style>
`;
                                        }
                                    }
                                }
                                return line;
                            }));
                            content = contentLines.join("\n");
                        }
                    }
                    return {
                        resourceKey: resourceKey,
                        content: content,
                        processedByOtherApp: false
                    };
                }
            }
            if (tryLocalWebServer) {
                return await this.getResourceAsync(currentOptions, resourceKey, false);
            }
            throw new KamlResourceDownloadError("getResourceAsync failed requesting from " + resourceUrl + ": " + lastResult.errorMessage, resourceKey);
        }
        ;
    }
    KatApps.KamlRepository = KamlRepository;
    class KamlRepositoryError extends Error {
        results;
        constructor(message, results) {
            super(message);
            this.results = results;
        }
    }
    KatApps.KamlRepositoryError = KamlRepositoryError;
    class KamlResourceDownloadError extends Error {
        resourceKey;
        constructor(message, resourceKey) {
            super(message);
            this.resourceKey = resourceKey;
        }
    }
    KatApps.KamlResourceDownloadError = KamlResourceDownloadError;
})(KatApps || (KatApps = {}));
(function ($, window, document, undefined) {
    if (String.compare == undefined) {
        String.compare = function (strA, strB, ignoreCase) {
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
                strA = strA.toUpperCase();
                strB = strB.toUpperCase();
            }
            if (strA === strB) {
                return 0;
            }
            else {
                return strA < strB ? -1 : 1;
            }
        };
    }
    if (String.formatTokens === undefined) {
        String.formatTokens = function (template, parameters) {
            return template.replace(/{{([^}]+)}}/g, function (match, token) {
                const tokenParts = token.split(":");
                const tokenName = tokenParts[0];
                const tokenFormat = tokenParts.length == 2 ? tokenParts[1] : undefined;
                const valueType = typeof parameters[tokenName];
                let tokenValue = valueType == "object"
                    ? parameters[tokenName]["#text"] ?? parameters[tokenName]
                    : parameters[tokenName];
                if (tokenValue != undefined && tokenFormat != undefined) {
                    const numberRegex = /^-?\d+(\.\d+)?$/;
                    const dateRegex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:T.*)?/;
                    const dateMatch = tokenValue.match(dateRegex);
                    if (dateMatch != undefined) {
                        tokenValue = String.localeFormat(`{0:${tokenFormat}}`, new Date(parseInt(dateMatch.groups.year), parseInt(dateMatch.groups.month) - 1, parseInt(dateMatch.groups.day)));
                    }
                    else if (numberRegex.test(tokenValue)) {
                        const number = parseFloat(tokenValue);
                        if (!isNaN(number)) {
                            tokenValue = String.localeFormat(`{0:${tokenFormat}}`, number);
                        }
                    }
                }
                return tokenValue ?? `{{${token}}}`;
            });
        };
    }
})();
var KatApps;
(function (KatApps) {
    class Utils {
        static chunk(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        }
        static extend(target, ...sources) {
            sources.forEach((source) => {
                if (source === undefined)
                    return;
                this.copyProperties(target, source);
            });
            return target;
        }
        ;
        static clone(source, replacer) {
            return this.copyProperties({}, source, replacer);
        }
        ;
        static copyProperties(target, source, replacer) {
            Object.keys(source).forEach((key) => {
                const value = replacer != undefined
                    ? replacer(key, source[key])
                    : source[key];
                if (value != undefined && typeof value === "object" && !Array.isArray(value) && !(value instanceof jQuery) && !(value instanceof HTMLElement) && key != "hostApplication") {
                    if (target[key] === undefined || typeof target[key] !== "object") {
                        target[key] = {};
                    }
                    this.copyProperties(target[key], value, replacer);
                }
                else if (value != undefined || replacer == undefined) {
                    target[key] = value;
                }
            });
            return target;
        }
        ;
        static generateId = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        static parseQueryString(qs) {
            const qsValues = {};
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
        static generateQueryString(qsObject, allowQs) {
            let qs = "";
            Object.keys(qsObject).forEach((key) => {
                if (allowQs == undefined || allowQs(key)) {
                    qs += `${key}=${qsObject[key]}&`;
                }
            });
            return qs.length > 0 ? `?${qs.substring(0, qs.length - 1)}` : undefined;
        }
        static pageParameters = this.readPageParameters();
        static _pageParameters;
        static readPageParameters() {
            return this._pageParameters ?? (this._pageParameters = this.parseQueryString(window.location.search));
        }
        static getObjectFromAttributes(attributes) {
            const regex = new RegExp('[\\s\\r\\t\\n]*([a-z0-9\\-_]+)[\\s\\r\\t\\n]*=[\\s\\r\\t\\n]*([\'"])((?:\\\\\\2|(?!\\2).)*)\\2', 'ig');
            const o = {};
            let match = null;
            while ((match = regex.exec(attributes))) {
                o[match[1]] = match[3];
            }
            return o;
        }
        static trace(application, callerType, methodName, message, verbosity, ...groupItems) {
            const verbosityOption = application.options.debug.traceVerbosity ?? TraceVerbosity.None;
            if (verbosityOption >= verbosity) {
                const currentTrace = new Date();
                const origin = `${callerType}\tKatApp Framework`;
                const katApp = application.selector ?? application.id;
                const startTrace = application.traceStart;
                const lastTrace = application.traceLast;
                const startDelta = Math.abs(currentTrace.getTime() - startTrace.getTime());
                const lastDelta = Math.abs(currentTrace.getTime() - lastTrace.getTime());
                application.traceLast = currentTrace;
                const log = `${String.localeFormat("{0:yyyy-MM-dd hh:mm:ss:ff}", currentTrace)}\t${String(startDelta).padStart(5, "0")}\t${String(lastDelta).padStart(5, "0")}\t${application.options.dataGroup}\t${katApp ?? "Unavailable"}\t${origin}\t${methodName}: ${message}`;
                if (groupItems.length > 0) {
                    console.group(log);
                    groupItems.forEach(i => i instanceof Error ? console.log({ i }) : console.log(i));
                    console.groupEnd();
                }
                else {
                    console.log(log);
                }
            }
        }
        static async checkLocalServerAsync(currentOptions) {
            return (await this.downloadLocalServerAsync(currentOptions.debug.debugResourcesDomain, "/js/ping.js")) != undefined;
        }
        ;
        static async downloadLocalServerAsync(debugResourcesDomain, relativePath, secure) {
            const url = "https://" + debugResourcesDomain + relativePath;
            const response = await (async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);
                try {
                    const response = await fetch(!secure ? url.substring(0, 4) + url.substring(5) : url, { method: "GET", signal: controller.signal });
                    clearTimeout(timeoutId);
                    return response;
                }
                catch (error) {
                    clearTimeout(timeoutId);
                    return { ok: false };
                }
            })();
            if (!response.ok) {
                return !secure
                    ? await this.downloadLocalServerAsync(debugResourcesDomain, relativePath, true)
                    : undefined;
            }
            return await response.text();
        }
        ;
    }
    KatApps.Utils = Utils;
})(KatApps || (KatApps = {}));
