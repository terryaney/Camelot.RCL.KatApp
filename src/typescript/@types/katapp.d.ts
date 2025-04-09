declare class KatAppEventFluentApi<T extends HTMLElement> implements IKatAppEventFluentApi<T> {
    elements: Array<T>;
    constructor(elements: Array<T>);
    on(events: string, handler: (e: Event) => void): KatAppEventFluentApi<T>;
    off(events: string): KatAppEventFluentApi<T>;
}
declare class KatApp implements IKatApp {
    selector: string;
    static applications: Array<KatApp>;
    private static globalEventConfigurations;
    static getDirty(): Array<IKatApp>;
    static remove(item: KatApp): void;
    static get(key: string | number | Element): KatApp | undefined;
    static handleEvents(selector: string, configAction: (config: IKatAppEventsConfiguration) => void): void;
    static createAppAsync(selector: string, options: IKatAppOptions): Promise<KatApp>;
    id: string;
    isCalculating: boolean;
    lastCalculation?: ILastCalculation;
    options: IKatAppOptions;
    state: IState;
    el: HTMLElement;
    traceStart: Date;
    traceLast: Date;
    missingResources: Array<string>;
    missingLanguageResources: Array<string>;
    private applicationCss;
    private vueApp?;
    private viewTemplates?;
    private mountedTemplates;
    private isMounted;
    private pushToTables;
    private configureOptions;
    calcEngines: ICalcEngine[];
    private uiBlockCount;
    private eventConfigurations;
    private domElementQueued;
    private domElementQueue;
    private updateDomPromise;
    private constructor();
    private getCloneApplication;
    triggerEventAsync(eventName: string, ...args: (object | string | undefined | unknown)[]): Promise<boolean | undefined>;
    configure(configAction: (config: IConfigureOptions, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp;
    handleEvents(configAction: (config: IKatAppEventsConfiguration, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp;
    private appendAndExecuteScripts;
    private mountAsync;
    private initializeInspector;
    private createModalContainer;
    private showModalApplicationAsync;
    navigateAsync(navigationId: string, options?: INavigationOptions): Promise<void>;
    calculateAsync(customInputs?: ICalculationInputs, processResults?: boolean, calcEngines?: ICalcEngine[], allowLogging?: boolean): Promise<ITabDef[] | void>;
    notifyAsync(from: KatApp, name: string, information?: IStringAnyIndexer): Promise<void>;
    checkValidity(): boolean;
    apiAsync(endpoint: string, apiOptions?: IApiOptions, trigger?: HTMLElement, calculationSubmitApiConfiguration?: ISubmitApiOptions): Promise<IStringAnyIndexer | undefined>;
    private addUnexpectedError;
    private downloadBlob;
    private getApiUrl;
    private processDomElementsAsync;
    getInputValue(name: string, allowDisabled?: boolean): string | undefined;
    setInputValue(name: string, value: string | undefined, calculate?: boolean): Array<HTMLInputElement> | undefined;
    getInputs(customInputs?: ICalculationInputs): ICalculationInputs;
    private getKatAppId;
    private getTargetItems;
    on<T extends HTMLElement>(target: string | HTMLElement | Array<HTMLElement>, events: string, handler: (e: Event) => void, context?: HTMLElement): IKatAppEventFluentApi<T>;
    off<T extends HTMLElement>(target: string | HTMLElement | Array<HTMLElement>, events: string, context?: HTMLElement): IKatAppEventFluentApi<T>;
    private selectorSplitter;
    private inputSelectorRegex;
    private psuedoInputTypes;
    private replaceInputSelector;
    selectElement<T extends HTMLElement>(selector: string, context?: HTMLElement): T | undefined;
    selectElements<T extends HTMLElement>(selector: string, context?: HTMLElement): Array<T>;
    closestElement<T extends HTMLElement>(element: HTMLElement, selector: string): T | undefined;
    private getResourceString;
    getLocalizedString(key: string | undefined, formatObject?: IStringIndexer<string>, defaultValue?: string): string | undefined;
    getTemplateContent(name: string): DocumentFragment;
    private getTemplateId;
    private get nextCalculation();
    private set nextCalculation(value);
    debugNext(saveLocations?: string | boolean, serverSideOnly?: boolean, trace?: boolean, expireCache?: boolean): void;
    blockUI(): void;
    unblockUI(): void;
    allowCalculation(ceKey: string, enabled: boolean): void;
    cloneOptions(includeManualResults: boolean): IKatAppOptions;
    getCloneHostSetting(el: HTMLElement): string | boolean;
    showModalAsync(options: IModalOptions, triggerLink?: HTMLElement): Promise<IModalResponse>;
    private cacheInputsAsync;
    private getSubmitApiConfigurationAsync;
    private getCeName;
    private toCalcEngines;
    private toTabDefs;
    private copyTabDefToRblState;
    private mergeTableToRblState;
    private processResultsAsync;
    private processDataUpdateResultsAsync;
    private processDocGenResults;
    private getViewElementAsync;
    private getViewTemplatesAsync;
    private getSessionStorageInputs;
}
declare class ApiError extends Error {
    innerException: Error | undefined;
    apiResponse: IApiErrorResponse;
    constructor(message: string, innerException: Error | undefined, apiResponse: IApiErrorResponse);
}
declare class ValidityError extends Error {
    constructor();
}
declare class CalculationError extends Error {
    failures: ICalculationFailedResponse[];
    constructor(message: string, failures: ICalculationFailedResponse[]);
}
declare namespace KatApps {
    class Calculation {
        static calculateAsync(application: KatApp, serviceUrl: string, calcEngines: ICalcEngine[], inputs: ICalculationInputs, configuration: ISubmitApiConfiguration | undefined): Promise<Array<IKatAppCalculationResponse>>;
        static submitCalculationAsync(application: KatApp, serviceUrl: string, inputs: ICalculationInputs, submitData: ISubmitApiData): Promise<IRblCalculationSuccessResponses>;
        static setCacheAsync(options: IKatAppOptions, key: string, data: object, encryptCache: (data: object) => string | Promise<string>): Promise<void>;
        static getCacheAsync(options: IKatAppOptions, key: string, decryptCache: (cipher: string) => object | Promise<object>): Promise<object | undefined>;
    }
}
declare namespace KatApps {
    class TemplateBase {
        static templateRenderedCount: IStringIndexer<number>;
        getRenderedId(templateId: string | undefined): string | undefined;
    }
}
declare namespace KatApps {
    class InputComponentBase extends TemplateBase {
        private static stringCache;
        private static cacheStringFunction;
        protected addValidityValidation(application: KatApp, inputName: string, label: (name: string) => string, input: HTMLInputElement): void;
        protected removeValidations(application: KatApp, inputName: string): void;
        protected validationText(application: KatApp, validations: Array<IValidationRow>, inputName: string): string | undefined;
        protected errorText(application: KatApp, inputName: string): string | undefined;
        protected warningText(application: KatApp, inputName: string): string | undefined;
        protected unmounted(application: KatApp, input: HTMLInputElement, clearOnUnmount: boolean | undefined): void;
        protected mounted(application: KatApp, scope: IStringAnyIndexer, name: string, label: (name: string) => string, input: HTMLInputElement, defaultValue: (name: string) => string | undefined, isExcluded: boolean, noCalc: (name: string) => boolean, displayFormat: (name: string) => string | undefined, hasMask: boolean, mask: (name: string) => string | undefined, maxLength: (name: string) => number, keypressRegex: (name: string) => string | undefined, events: undefined | IStringIndexer<((e: Event, application: KatApp, scope: IStringAnyIndexer) => void)>, refs: IStringIndexer<HTMLElement>): void;
        private bindInputEvents;
        static percentFormat: RegExp;
        private bindRangeEvents;
        private bindDateEvents;
        private bindCustomEvents;
        private getModifiers;
    }
}
declare namespace KatApps {
    class InputComponent extends InputComponentBase {
        private props;
        constructor(props: IKaInputModel);
        getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IKaInputScope | undefined;
    }
}
declare namespace KatApps {
    class TemplateComponent extends TemplateBase {
        private props;
        constructor(props: {
            name: string;
            source?: IStringAnyIndexer | Array<ITabDefRow>;
        });
        getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IStringAnyIndexer | Array<ITabDefRow>;
    }
}
declare namespace KatApps {
    class TemplateMultipleInputComponent extends InputComponentBase {
        private props;
        constructor(props: IKaInputGroupModel);
        getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IKaInputGroupScope | undefined;
    }
}
declare namespace KatApps {
    class Components {
        static initializeCoreComponents(application: KatApp, getTemplateId: (name: string) => string | undefined): void;
    }
}
declare namespace KatApps {
    class DirectiveKaApi implements IKaDirective {
        name: string;
        getDefinition(application: KatApp): Directive<Element>;
    }
}
declare namespace KatApps {
    class DirectiveKaApp implements IKaDirective {
        name: string;
        getDefinition(application: KatApp): Directive<Element>;
    }
}
declare namespace KatApps {
    class DirectiveKaAttributes implements IKaDirective {
        name: string;
        getDefinition(application: KatApp): Directive<Element>;
    }
}
declare namespace KatApps {
    class DirectiveKaChart implements IKaDirective {
        name: string;
        private ns;
        private application;
        private chartConfiguration;
        getDefinition(application: KatApp): Directive<Element>;
        buildChartConfiguration(chartType: IRblChartConfigurationType, configRows: IRblChartDataRow[], dataRows: IRblChartDataRow[]): void;
        private generateColumnChart;
        private generateDonutChart;
        private createText;
        private createLine;
        private createRect;
        private createTooltip;
        private getSeriesShape;
        private calculateYAxisInterval;
        private getOptionValue;
        private formatNumber;
        private encodeHtmlAttributeValue;
    }
}
declare namespace KatApps {
    class DirectiveKaHighchart implements IKaDirective {
        name: string;
        private cultureEnsured;
        private application;
        getDefinition(application: KatApp): Directive<Element>;
        private getChartOptions;
        private getTooltipOptions;
        private getXAxisOptions;
        private buildSeries;
        private getSeriesDataRow;
        private setApiOption;
        private getOptionValue;
        private ensureCulture;
        private removeRBLEncoding;
    }
}
declare namespace KatApps {
    class DirectiveKaInline implements IKaDirective {
        name: string;
        getDefinition(application: KatApp): Directive<Element>;
    }
}
declare namespace KatApps {
    class DirectiveKaModal implements IKaDirective {
        name: string;
        getDefinition(application: KatApp): Directive<Element>;
    }
}
declare namespace KatApps {
    class DirectiveKaNavigate implements IKaDirective {
        name: string;
        getDefinition(application: KatApp): Directive<Element>;
    }
}
declare namespace KatApps {
    class DirectiveKaResource implements IKaDirective {
        name: string;
        getDefinition(application: KatApp): Directive<Element>;
    }
}
declare namespace KatApps {
    class DirectiveKaTable implements IKaDirective {
        name: string;
        getDefinition(application: KatApp): Directive<Element>;
    }
}
interface IKaDirective {
    name: string;
    getDefinition(application: KatApp): Directive<Element> | AsyncDirective<Element>;
}
declare namespace KatApps {
    class Directives {
        static initializeCoreDirectives(vueApp: PetiteVueApp, application: KatApp): void;
    }
}
declare namespace KatApps {
    class DirectiveKaValue implements IKaDirective {
        name: string;
        getDefinition(application: KatApp): Directive<Element>;
    }
}
declare namespace KatApps {
    class HelpTips {
        static currentPopoverTarget: HTMLElement | undefined;
        private static visiblePopover;
        private static visiblePopoverApp;
        private static visiblePopupContentSource;
        static hideVisiblePopover(selectorPredicate?: string): boolean;
        static processHelpTips(container: HTMLElement, selector?: string, tipsToProcess?: NodeListOf<HTMLElement>): void;
    }
}
declare enum TraceVerbosity {
    None = 0,
    Quiet = 1,
    Minimal = 2,
    Normal = 3,
    Detailed = 4,
    Diagnostic = 5
}
interface IKatAppCalculationResponse {
    calcEngine: string;
    diagnostics?: IRblCalculationDiagnostics;
    tabDefs: Array<IRbleTabDef>;
}
interface IKaTableColumnConfiguration {
    name: string;
    cssClass: string | undefined;
    isTextColumn: boolean;
    xsColumns: number | undefined;
    smColumns: number | undefined;
    mdColumns: number | undefined;
    lgColumns: number | undefined;
    width: number | undefined;
    widthPct: string | undefined;
}
interface IManualTabDef extends IStringIndexer<string | undefined | ITabDefTable> {
    "@calcEngineKey": string;
    "@calcEngine": string;
    "@name": string | undefined;
}
interface ITabDef extends IStringIndexer<ITabDefTable> {
}
interface ITabDefTable extends Array<ITabDefRow> {
}
interface ITabDefRow extends IStringIndexer<string | undefined> {
    id?: string;
}
interface ITabDefMetaRow extends IStringIndexer<string | undefined | IStringIndexer<string>> {
}
type IRblChartConfigurationDataType = number | Array<{
    name: string;
    value: number;
}>;
interface IRblChartConfiguration<T extends IRblChartConfigurationDataType> {
    chart: IRblChartConfigurationChart;
    data: Array<{
        name: string;
        data: T;
    }>;
    columns: Array<IRblChartColumnName>;
    categories: Array<IRblChartConfigurationCategory>;
    legend: {
        show: boolean;
    };
    tip: {
        show: IRblChartConfigurationTipShowOption;
        includeShape: boolean;
        padding: {
            top: number;
            left: number;
        };
    };
    yAxis: {
        label: string | undefined;
        tickCount: number;
    };
}
interface IRblChartConfigurationChart {
    type: IRblChartConfigurationType;
    height: number;
    width: number;
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}
interface IRblChartConfigurationCategory {
    text: string;
    color: string;
    shape: IRblChartConfigurationShape;
}
type IRblChartConfigurationTipShowOption = "off" | "category" | "series";
type IRblChartConfigurationType = "column" | "columnStacked" | "donut";
type IRblChartConfigurationShape = "square" | "circle" | "line";
interface IRblChartDataRow {
    id: string;
    value: string;
    [key: `data${number}`]: string | undefined;
}
type IRblChartColumnName = "value" | `data${number}`;
interface IRblHighChartsOptionRow extends ITabDefRow {
    key: string;
    value: string;
}
interface IRblHighChartsDataRow extends IStringIndexer<string | undefined> {
    category: string;
    plotLine?: string;
    plotBand?: string;
}
interface IHighChartsPlotConfigurationRow {
    index: number;
    plotLine: string;
    plotBand: string;
}
interface ITabDefKatAppInfo {
    calcEngineKey: string;
    name: string;
}
interface IKaTabDef extends IStringIndexer<ITabDefKatAppInfo | string | ITabDefTable> {
    _ka: ITabDefKatAppInfo;
}
interface IRbleTabDef extends IStringIndexer<string | ITabDefRow | ITabDefTable> {
    "@calcEngine": string;
    "@name": string;
}
interface IRblCalculationSuccessResponses {
    results: Array<{
        calcEngine: string;
        cacheKey?: string;
        result?: IRblCalculationSuccessResponse;
    }>;
}
interface IMergedRblCalculationSuccessResponses {
    results: Array<{
        calcEngine: string;
        result: IRblCalculationSuccessResponse;
    }>;
}
interface IRblCalculationDiagnostics {
    calcEngineVersion: string;
    timings: {
        Status: Array<{
            "@Start": string;
            "#text": string;
        }>;
    };
    rbleServer: string;
    sessionID: string;
    serviceUrl: string;
    trace?: Array<string>;
}
interface IRblCalculationSuccessResponse {
    diagnostics: IRblCalculationDiagnostics;
    exception: {
        message: string;
        type: string;
        traceId: string;
        requestId: string;
        stackTrace: Array<string>;
    };
    RBL: {
        Profile: {
            Data: {
                TabDef: Array<IRbleTabDef> | IRbleTabDef;
            };
        };
    };
}
interface ITraceVerbosity {
    None: number;
    Quiet: number;
    Minimal: number;
    Normal: number;
    Detailed: number;
    Diagnostic: number;
}
interface IKatAppDefaultOptions {
    calculationUrl: string;
    katDataStoreUrl: string;
    kamlVerifyUrl: string;
    anchoredQueryStrings?: string;
    debug: {
        traceVerbosity: ITraceVerbosity;
        useTestCalcEngine: boolean;
        useTestView: boolean;
        showInspector: string;
        debugResourcesDomain?: string;
    };
    inputCaching: boolean;
    canProcessExternalHelpTips: boolean;
    encryptCache(data: object): string | Promise<string>;
    decryptCache(cipher: string): object | Promise<object>;
}
interface IKatAppOptions extends IKatAppDefaultOptions {
    view?: string;
    content?: string | HTMLElement;
    baseUrl?: string;
    dataGroup: string;
    currentPage: string;
    userIdHash?: string;
    sessionKeyPrefix?: string;
    environment?: string;
    requestIP?: string;
    currentCulture?: string;
    currentUICulture?: string;
    inputs?: ICalculationInputs;
    manualResults?: IManualTabDef[];
    resourceStrings?: IStringIndexer<IStringIndexer<string | {
        text: string;
    }>>;
    manualResultsEndpoint?: string;
    resourceStringsEndpoint?: string;
    relativePathTemplates?: IStringIndexer<string>;
    katAppNavigate?: (id: string, props?: IModalOptions, el?: HTMLElement) => void;
    modalAppOptions?: IModalAppOptions;
    hostApplication?: IKatApp;
    cloneHost?: boolean | string;
}
interface IKatAppStatic {
    getDirty(): Array<IKatApp>;
    createAppAsync(selector: string, options: IKatAppOptions): Promise<IKatApp>;
    get(key: string | number | Element): IKatApp | undefined;
    handleEvents(selector: string, configAction: (config: IKatAppEventsConfiguration) => void): void;
}
interface IKatApp {
    id: string;
    el: HTMLElement;
    calcEngines: ICalcEngine[];
    options: IKatAppOptions;
    isCalculating: boolean;
    lastCalculation?: ILastCalculation;
    state: IState;
    selector: string;
    configure(configAction: (config: IConfigureOptions, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp;
    handleEvents(configAction: (events: IKatAppEventsConfiguration, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp;
    allowCalculation(ceKey: string, enabled: boolean): void;
    checkValidity(): boolean;
    calculateAsync(customInputs?: ICalculationInputs, processResults?: boolean, calcEngines?: ICalcEngine[], allowLogging?: boolean): Promise<ITabDef[] | void>;
    apiAsync(endpoint: string, apiOptions?: IApiOptions, trigger?: HTMLElement, calculationSubmitApiConfiguration?: ISubmitApiOptions): Promise<IStringAnyIndexer | undefined>;
    showModalAsync(options: IModalOptions, triggerLink?: HTMLElement): Promise<IModalResponse>;
    navigateAsync(navigationId: string, options?: INavigationOptions): void;
    blockUI(): void;
    unblockUI(): void;
    getInputs(customInputs?: ICalculationInputs): ICalculationInputs;
    getInputValue(name: string, allowDisabled?: boolean): string | undefined;
    setInputValue(name: string, value: string | undefined, calculate?: boolean): Array<HTMLInputElement> | undefined;
    on<T extends HTMLElement>(selector: string, events: string, handler: (e: Event) => void, context?: HTMLElement): IKatAppEventFluentApi<T>;
    off<T extends HTMLElement>(selector: string, events: string, context?: HTMLElement): IKatAppEventFluentApi<T>;
    selectElement<T extends HTMLElement>(selector: string, context?: HTMLElement): T | undefined;
    selectElements<T extends HTMLElement>(selector: string, context?: HTMLElement): Array<T>;
    closestElement<T extends HTMLElement>(element: HTMLElement, selector: string): T | undefined;
    notifyAsync(from: IKatApp, name: string, information?: IStringAnyIndexer): Promise<void>;
    getTemplateContent(name: string): DocumentFragment;
    getLocalizedString(key: string | undefined, formatObject?: IStringIndexer<string>, defaultValue?: string): string | undefined;
    debugNext(saveLocations?: string | boolean, serverSideOnly?: boolean, trace?: boolean, expireCache?: boolean): void;
}
interface IKatAppEventFluentApi<T extends HTMLElement> {
    on(events: string, handler: (e: Event) => void): IKatAppEventFluentApi<T>;
    off(events: string): IKatAppEventFluentApi<T>;
    elements: Array<T>;
}
interface ICalcEngine {
    key: string;
    manualResult: boolean;
    enabled: boolean;
    allowConfigureUi: boolean;
    name: string;
    inputTab: string;
    resultTabs: string[];
    pipeline?: IPipelineCalcEngine[];
}
interface IPipelineCalcEngine {
    key: string;
    name: string;
    inputTab?: string;
    resultTab?: string;
}
interface IConfigureOptions {
    options?: {
        modalAppOptions?: IModalAppOptions;
        inputs?: ICalculationInputs;
    };
    model?: IStringAnyIndexer;
    handlers?: IHandlers;
    components?: IStringAnyIndexer;
    directives?: IStringIndexer<(ctx: DirectiveContext<Element>) => (() => void) | void>;
    events: IKatAppEventsConfiguration;
}
interface IKatAppEventsConfiguration {
    [key: string]: any;
    initialized?: (application: IKatApp) => void;
    modalAppInitialized?: (modalApplication: IKatApp, hostApplication: IKatApp) => void;
    nestedAppInitialized?: (nestedApplication: IKatApp, hostApplication: IKatApp) => void;
    rendered?: (initializationErrors: IValidationRow[] | undefined, application: IKatApp) => void;
    nestedAppRendered?: (nestedApplication: IKatApp, initializationErrors: IValidationRow[] | undefined, hostApplication: IKatApp) => void;
    updateApiOptions?: (submitApiOptions: ISubmitApiOptions, endpoint: string, application: IKatApp) => void;
    calculateStart?: (submitApiOptions: ISubmitApiOptions, application: IKatApp) => void | false;
    inputsCached?: (cachedInputs: ICalculationInputs, application: IKatApp) => void;
    resultsProcessing?: (results: Array<ITabDef>, inputs: ICalculationInputs, submitApiOptions: ISubmitApiOptions, application: IKatApp) => void;
    configureUICalculation?: (lastCalculation: ILastCalculation, application: IKatApp) => void;
    calculation?: (lastCalculation: ILastCalculation, application: IKatApp) => void;
    calculationErrors?: (key: string, exception: Error | undefined, application: IKatApp) => void;
    calculateEnd?: (application: IKatApp) => void;
    domUpdated?: (elements: Array<HTMLElement>, application: IKatApp) => void;
    apiStart?: (endpoint: string, submitData: ISubmitApiData, trigger: HTMLElement | undefined, apiOptions: IApiOptions, application: IKatApp) => void | false;
    apiComplete?: (endpoint: string, successResponse: IStringAnyIndexer | undefined, trigger: HTMLElement | undefined, apiOptions: IApiOptions, application: IKatApp) => void;
    apiFailed?: (endpoint: string, errorResponse: IApiErrorResponse, trigger: HTMLElement | undefined, apiOptions: IApiOptions, application: IKatApp) => void;
    /**
     * The 'notification' delegate is invoked when another KatApp wants to notify this application via the `notifyAsync` method.
     * @param {string} name - The name of the notification.
     * @param {IStringAnyIndexer | undefined} information - Optional information to pass along during the notification to contain additional properties other than the notification name (i.e. IDs, messages, etc.).
     * @param {IKatApp} from - The KatApp that sent the notification.
     */
    notification?: (name: string, information: IStringAnyIndexer | undefined, from: IKatApp) => void;
    input?: (name: string, calculate: boolean, input: HTMLElement, scope: IKaInputScope | IKaInputGroupScope) => void;
}
interface IHandlers extends IStringAnyIndexer {
}
interface ICalculationInputs extends IStringIndexer<string | ICalculationInputTable[] | ((inputId: string) => number | undefined) | ((inputId: string) => string | undefined) | undefined> {
    iConfigureUI?: string;
    iDataBind?: string;
    iInputTrigger?: string;
    iNestedApplication?: string;
    iModalApplication?: string;
    tables?: ICalculationInputTable[];
    getNumber?: (inputId: string) => number | undefined;
    getOptionText?: (inputId: string) => string | undefined;
}
interface ICalculationInputTable {
    name: string;
    rows: Array<ICalculationInputTableRow>;
}
interface ICalculationInputTableRow extends ITabDefRow {
    index: string;
}
interface IState {
    kaId: string;
    application: IKatApp;
    /**
     * Changes every time an v-ka-input changes.
     * Allows for reactive v-effect statements without hooking up an IKatAppEventsConfiguration.input event.
     */
    lastInputChange: number;
    /**
     * Indicates if any v-ka-input has changed since the KatApp has been rendered.
     * Allows for host application to prompt about changes before navigation or actions if necessary.
     * Host application must set to false after any action/api that has 'saved' inputs.
     */
    inputsChanged: boolean;
    /**
     * Indicates whether the current KatApp is considered 'dirty' overall.  If the value is set to `undefined`, the value returned is simply the state of the `inputsChanged` property.  If set to a `boolean` value, it will return that value as a manually set flag.  By default, the value is set to `false`, so the KatApp host must set it to `undefined` if they want `inputsChanged` to indicate application dirty state.  If the value is set to `false`, `inputsChanged` is automatically set to `false` as well.  Host application must set to `false` after any action/api that has 'saved' inputs.
     */
    isDirty: boolean | undefined;
    /**
     * Indicates if application is in the 'state' to submit to server for processing.  It returns true
     * when the following scenario is valid: isDirty && !uiBlocked && errors.filter( r => r.id.startsWith('i')).length == 0 (no UI errors)
     */
    canSubmit: (whenInputsHaveChanged: boolean | undefined) => boolean;
    /**
     * Indicates whether the KatApp framework is performing an action (calculateAsync, apiAsync, etc.) where the host application should display a UI blocking mechanism.
     */
    uiBlocked: boolean;
    /**
     * Is true when a v-ka-input (without v-ka-rbl-no-calc or v-ka-rbl-exclude directives) has been edited (via key press) but has not triggered a calculation yet.
     * Used internally by the v-ka-needs-calc directive.
     */
    needsCalculation: boolean;
    model: IStringAnyIndexer;
    handlers?: IHandlers;
    _domElementMounted: (el: HTMLElement) => void;
    _templateItemMounted: (templateId: string, el: Element, scope?: unknown) => void;
    _templateItemUnmounted: (templateId: string, el: Element, scope?: unknown) => void;
    components: IStringIndexer<IStringAnyIndexer>;
    inputs: ICalculationInputs;
    errors: IValidationRow[];
    warnings: IValidationRow[];
    rbl: IStateRbl;
    onAll: (...values: Array<undefined | string | number>) => boolean;
    onAny: (...values: Array<undefined | string | number>) => boolean;
}
interface IValidationRow {
    id: string;
    text: string;
    dependsOn?: string;
    event?: string;
    initialization?: boolean;
}
interface IStateRbl {
    results: IStringIndexer<IStringIndexer<Array<ITabDefRow>>>;
    source: <T extends ITabDefRow>(table: string, calcEngine?: string, tab?: string, predicate?: (row: T) => boolean) => Array<T>;
    exists: <T extends ITabDefRow>(table: string, calcEngine?: string, tab?: string, predicate?: (row: T) => boolean) => boolean;
    value: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => string | undefined;
    text: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => string | undefined;
    number: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => number;
    boolean: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string, valueWhenMissing?: boolean) => boolean;
    mergeRows: (resultTabDef: ITabDef, table: string, rows: ITabDefRow | Array<ITabDefRow>) => void;
    pushTo: (table: string, rows: ITabDefRow | Array<ITabDefRow>, calcEngine?: string, tab?: string) => void;
}
interface ISubmitApiOptions {
    inputs: ICalculationInputs;
    configuration: ISubmitApiConfiguration | IStringIndexer<string>;
    isCalculation: boolean;
}
interface ISubmitCalculationConfiguration extends ISubmitApiConfiguration {
    invalidCacheKeys?: string[];
}
interface ISubmitApiData {
    inputs: ICalculationInputs;
    inputTables?: Array<ICalculationInputTable>;
    apiParameters?: IStringAnyIndexer | undefined;
    configuration: ISubmitApiConfiguration;
}
interface ISubmitApiConfiguration {
    token?: string;
    comment?: string;
    testCE: boolean;
    authID: string;
    client: string;
    adminAuthID: string | undefined;
    currentPage: string;
    requestIP: string;
    currentCulture: string;
    currentUICulture: string;
    environment: string;
    calcEngines: ISubmitCalculationCalcEngine[];
    nextCalculation?: INextCalculation;
    allowLogging: boolean;
    cacheRefreshKeys?: string[];
}
interface ISubmitCalculationCalcEngine {
    name: string;
    inputTab: string;
    resultTabs: string[];
    pipeline: ISubmitCalculationCalcEnginePipeline | undefined;
}
interface ISubmitCalculationCalcEnginePipeline {
    name: string;
    inputTab?: string;
    resultTab?: string;
}
interface INextCalculation {
    saveLocations: {
        location: string;
        serverSideOnly: boolean;
    }[];
    expireCache: boolean;
    trace: boolean;
    originalVerbosity: ITraceVerbosity;
}
interface IKamlVerifyResult {
    path: string;
    manualInputs?: IStringIndexer<string>;
}
interface IModalOptions {
    view?: string;
    content?: string;
    contentSelector?: string;
    calculateOnConfirm?: boolean | ICalculationInputs;
    labels?: {
        title?: string;
        cancel?: string;
        continue?: string;
    };
    css?: {
        cancel?: string;
        continue?: string;
    };
    size?: "xl" | "lg" | "md" | "sm";
    scrollable?: boolean;
    showCancel?: boolean;
    allowKeyboardDismiss?: boolean;
    buttonsTemplate?: string;
    headerTemplate?: string;
    inputs?: ICalculationInputs;
}
interface IModalAppOptions extends IModalOptions {
    promise: {
        resolve: (response: IModalResponse | PromiseLike<IModalResponse>) => void;
        reject: (reason?: unknown) => void;
    };
    confirmedAsync?: (response?: unknown) => Promise<void>;
    cancelled?: (response?: unknown) => void;
    triggerLink?: HTMLElement;
    closeButtonTrigger?: string;
}
interface IModalResponse {
    confirmed: boolean;
    response: unknown;
    modalApp: IKatApp;
}
interface IApiOptions {
    skipValidityCheck?: boolean;
    calculationInputs?: ICalculationInputs;
    apiParameters?: IStringAnyIndexer;
    isDownload?: boolean;
    calculateOnSuccess?: boolean | ICalculationInputs;
    files?: FileList | null;
}
interface IApiErrorResponse {
    status: number;
    title: string;
    type: string;
    errors?: IStringIndexer<Array<string>>;
    warnings?: IStringIndexer<Array<string>>;
    errorsDependsOn?: IStringIndexer<string>;
    warningsDependsOn?: IStringIndexer<string>;
    exceptions?: Array<IExceptionDetail>;
    traceId?: string;
    requestId?: string;
    apiResult?: IStringAnyIndexer;
    apiPayload?: IStringAnyIndexer;
}
interface IExceptionDetail {
    message: string;
    type: string;
    traceId: string;
    requestId: string;
    stackTrace: Array<string>;
    innerException?: IExceptionDetail;
}
interface INavigationOptions {
    inputs?: ICalculationInputs;
    persistInputs?: boolean;
}
interface ILastCalculation {
    inputs: ICalculationInputs;
    results: Array<ITabDef>;
    diagnostics?: Array<IRblCalculationDiagnostics | undefined>;
    configuration: ISubmitApiConfiguration;
}
interface ICalculationFailedResponse {
    calcEngine: string;
    configuration: ISubmitApiConfiguration;
    inputs: ICalculationInputs;
    diagnostics?: IRblCalculationDiagnostics;
    exceptions: Array<ICalculationResponseException>;
}
interface ICalculationResponseException {
    message: string;
    type: string;
    traceId?: string;
    requestId?: string;
    apiResult?: IStringAnyIndexer;
    apiPayload?: IStringAnyIndexer;
    stackTrace: string[];
}
interface IKaResourceModel {
    key?: string;
    templateArguments?: Array<string | Date | number>;
}
interface IKaNavigateModel {
    view: string;
    confirm?: IModalOptions;
    inputs?: ICalculationInputs;
    ceInputs?: string;
    persistInputs?: boolean;
    model?: string;
    clearDirty?: boolean;
}
interface IKaModalModel extends IModalOptions {
    beforeOpenAsync?: (hostApplication: IKatApp) => Promise<void>;
    confirmedAsync?: (response: unknown | undefined, application: IKatApp) => Promise<void>;
    cancelledAsync?: (response: unknown | undefined, application: IKatApp) => Promise<void>;
    catchAsync?: (e: unknown | undefined, application: IKatApp) => Promise<void>;
    closed?: (application: IKatApp) => void;
    model?: string;
}
interface IKaAppModel {
    selector?: string;
    view: string;
    inputs?: ICalculationInputs;
}
interface IKaApiModel extends IApiOptions {
    endpoint: string;
    thenAsync?: (response: IStringAnyIndexer | undefined, application: IKatApp) => Promise<void>;
    catchAsync?: (e: unknown | undefined, application: IKatApp) => Promise<void>;
    confirm?: IModalOptions;
}
interface IKaChartModel {
    data: string;
    ce?: string;
    tab?: string;
}
interface IKaHighchartModel {
    data: string;
    options?: string;
    ce?: string;
    tab?: string;
}
interface IKaTableModel {
    name: string;
    css?: string;
    ce?: string;
    tab?: string;
}
interface IKaInputModel {
    name: string;
    clearOnUnmount?: boolean;
    isExcluded?: boolean;
    type?: "radio" | "checkbox" | "text" | "date" | "range";
    value?: string;
    label?: string;
    labelledBy?: string;
    placeHolder?: string;
    hideLabel?: boolean;
    help?: IKaInputModelHelp;
    iconHtml?: string;
    list?: Array<IKaInputModelListRow>;
    css?: IKaInputScopeCss;
    prefix?: string;
    suffix?: string;
    maxLength?: number;
    displayFormat?: string;
    mask?: string;
    keypressRegex?: string;
    min?: number | string;
    max?: number | string;
    step?: number;
    uploadEndpoint?: string;
    ce?: string;
    tab?: string;
    template?: string;
    isNoCalc?: ((base: IKaInputScopeBase) => boolean) | boolean;
    isDisabled?: ((base: IKaInputScopeBase) => boolean) | boolean;
    isDisplay?: ((base: IKaInputScopeBase) => boolean) | boolean;
    events?: IStringIndexer<((e: Event, application: IKatApp) => void)>;
}
interface IKaInputModelHelp {
    title?: string;
    content?: string;
    width?: number;
}
interface IKaInputModelListRow extends ITabDefRow {
    key: string;
    text: string;
}
interface IKaInputScope {
    readonly $template: string | undefined;
    readonly $renderId: string | undefined;
    readonly id: string;
    readonly name: string;
    readonly type: string;
    readonly value: string;
    readonly disabled: boolean;
    readonly display: boolean;
    readonly noCalc: boolean;
    readonly label: string;
    readonly labelledBy?: string;
    readonly hideLabel: boolean;
    readonly placeHolder: string | undefined;
    readonly iconHtml: string;
    readonly help: IKaInputScopeHelp;
    readonly css: IKaInputScopeCss;
    readonly list: Array<IKaInputModelListRow>;
    readonly prefix: string | undefined;
    readonly suffix: string | undefined;
    readonly maxLength: number;
    readonly min: string | undefined;
    readonly max: string | undefined;
    readonly step: number;
    readonly error: string | undefined;
    readonly warning: string | undefined;
    uploadAsync: () => void;
    inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => void;
    inputUnmounted: (input: HTMLInputElement) => void;
}
interface IKaInputScopeBase {
    readonly display: boolean;
    readonly noCalc: boolean;
    readonly disabled: boolean;
    readonly error: string | undefined;
    readonly warning: string | undefined;
}
interface IKaInputScopeHelp {
    readonly title: string;
    readonly content?: string;
    readonly width: string;
}
interface IKaInputScopeCss {
    readonly input: string;
    readonly label?: string;
    readonly container?: string;
}
interface IKaInputGroupModel {
    names: string[];
    type: "radio" | "checkbox" | "text" | "date" | "range";
    template: string;
    clearOnUnmount?: boolean;
    isExcluded?: boolean;
    values?: string[] | string;
    labels?: string[] | string;
    placeHolders?: string[] | string;
    hideLabels?: boolean[] | boolean;
    helps?: IKaInputModelHelp[] | IKaInputModelHelp;
    css?: IKaInputScopeCss[] | IKaInputScopeCss;
    displayFormats?: string[] | string;
    masks?: string[] | string;
    keypressRegexs?: string[] | string;
    maxLengths?: number[] | number;
    mins?: string[] | string;
    maxes?: string[] | string;
    steps?: number[] | number;
    prefixes?: string[] | string;
    suffixes?: string[] | string;
    ce?: string;
    tab?: string;
    isNoCalc?: ((index: number, base: IKaInputGroupScopeBase) => boolean) | boolean;
    isDisabled?: ((index: number, base: IKaInputGroupScopeBase) => boolean) | boolean;
    isDisplay?: ((index: number, base: IKaInputGroupScopeBase) => boolean) | boolean;
    events?: IStringIndexer<((e: Event, application: IKatApp) => void)>;
}
interface IKaInputGroupScope {
    readonly $template: string | undefined;
    readonly $renderId: string;
    readonly type: string;
    id: (index: number) => string;
    name: (index: number) => string;
    value: (index: number) => string;
    disabled: (index: number) => boolean;
    display: (index: number) => boolean;
    noCalc: (index: number) => boolean;
    label: (index: number) => string;
    hideLabel: (index: number) => boolean;
    placeHolder: (index: number) => string | undefined;
    help: (index: number) => IKaInputScopeHelp;
    css: (index: number) => IKaInputScopeCss;
    list: (index: number) => Array<IKaInputModelListRow>;
    prefix: (index: number) => string | undefined;
    suffix: (index: number) => string | undefined;
    maxLength: (index: number) => number | undefined;
    min: (index: number) => string | undefined;
    max: (index: number) => string | undefined;
    step: (index: number) => number | undefined;
    error: (index: number) => string | undefined;
    warning: (index: number) => string | undefined;
    inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => void;
    inputUnmounted: (input: HTMLInputElement) => void;
}
interface IKaInputGroupScopeBase {
    display: (index: number) => boolean;
    noCalc: (index: number) => boolean;
    disabled: (index: number) => boolean;
    error: (index: number) => string | undefined;
    warning: (index: number) => string | undefined;
}
interface IStringIndexer<T> extends Record<string, T> {
}
interface IStringAnyIndexer extends IStringIndexer<any> {
}
interface IStringAnyIndexerReplacer {
    (this: any, key: string, value: any): any;
}
declare namespace KatApps {
    class KamlCompiler {
        private showInspector;
        private applicationId;
        constructor(application: KatApp);
        compileMarkup(kaml: Element, resourceKey: string): void;
        private checkVueSyntax;
        private processMarkup;
        private inspectChildren;
        private delimiters;
        private escapeRegex;
        private delimitersRE;
        private directiveRE;
        private inspectChild;
        private mountInputs;
        private mountInput;
        private addMountAttribute;
    }
}
interface IKatAppRepositoryOptions extends IKatAppOptions {
    useLocalRepository?: boolean;
}
interface IKamlResourceResponse {
    resourceKey: string;
    errorMessage?: string;
    content?: string;
    processedByOtherApp: boolean;
}
declare namespace KatApps {
    class KamlRepository {
        private static resourceRequests;
        static getViewResourceAsync(options: IKatAppOptions, view: string): Promise<IStringIndexer<string>>;
        static getTemplateResourcesAsync(options: IKatAppOptions, resourceArray: string[]): Promise<IStringIndexer<string>>;
        private static getKamlResourcesAsync;
        static resolveTemplate(resourceKey: string): void;
        private static downloadResourceAsync;
        private static getResourceAsync;
    }
    class KamlRepositoryError extends Error {
        results: {
            resource: string;
            errorMessage: string;
        }[];
        constructor(message: string, results: {
            resource: string;
            errorMessage: string;
        }[]);
    }
    class KamlResourceDownloadError extends Error {
        resourceKey: string;
        constructor(message: string, resourceKey: string);
    }
}
declare namespace KatApps {
    class Utils {
        static chunk<T>(array: Array<T>, size: number): Array<Array<T>>;
        static extend<T>(target: IStringAnyIndexer, ...sources: (IStringAnyIndexer | undefined)[]): T;
        static clone<T>(source: IStringAnyIndexer, replacer?: IStringAnyIndexerReplacer): T;
        private static copyProperties;
        static generateId: () => string;
        static parseQueryString(qs: string | undefined): IStringIndexer<string>;
        static generateQueryString(qsObject: IStringIndexer<string>, allowQs: ((key: string) => boolean) | undefined): string | undefined;
        static pageParameters: IStringIndexer<string>;
        private static _pageParameters;
        private static readPageParameters;
        static getObjectFromAttributes(attributes: string): IStringIndexer<string>;
        static trace(application: KatApp, callerType: string, methodName: string, message: string, verbosity: TraceVerbosity, ...groupItems: Array<any>): void;
        static checkLocalServerAsync(currentOptions: IKatAppRepositoryOptions): Promise<boolean>;
        static downloadLocalServerAsync(debugResourcesDomain: string, relativePath: string, secure?: boolean): Promise<any | undefined>;
        private static getSessionKey;
        static setSessionItem(options: IKatAppOptions, key: string, value: any): void;
        static getSessionItem<T = string>(options: IKatAppOptions, key: string, oneTimeUse?: boolean): T | undefined;
        static removeSessionItem(options: IKatAppOptions, key: string): void;
        static clearSession(prefix: string | undefined): void;
    }
}
