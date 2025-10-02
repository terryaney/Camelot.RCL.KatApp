interface ITraceVerbosity {
    None: number;
    Quiet: number;
    Minimal: number;
    Normal: number;
    Detailed: number;
    Diagnostic: number;
}

// KatApp options interfaces
interface IKatAppDefaultOptions {
	endpoints: IKatAppEndpoints;
	delegates: IKatAppDelegates;

	debug: {
		traceVerbosity: ITraceVerbosity;
		// refreshCalcEngine: boolean; // expireCE=1 querystring
		useTestCalcEngine: boolean; // test=1 querystring
		useTestView: boolean; // testView=1 querystring
		showInspector: string; // showInspector=1 querystring
		debugResourcesDomain?: string; // localserver=localhost:8887 querystring
	};

	// Not really used yet, no one setting to 'true', only defaults to false
	inputCaching: boolean; // Whether or not inputs are cached to/restored from LocalStorage,
	canProcessExternalHelpTips: boolean; // If help tip is outside a KatApp but will be rendered via KatApps, indicates if KatApp can be used when cloning is necessary (v-pre)
}

interface IKatAppDelegates {
	encryptCache(data: object): string | Promise<string>;
	decryptCache(cipher: string): object | Promise<object>;

	getSessionKey(key: string): string;
	
	setSessionItem(key: string, value: any): void;
	getSessionItem<T = string>(key: string, oneTimeUse?: boolean): T | undefined;
	removeSessionItem(key: string): void;

	katAppNavigate?: (id: string, props?: IModalOptions, el?: HTMLElement) => void;
}

interface IKatAppEndpoints {
	baseUrl?: string;
	calculation: string;
	katDataStore: string;
	kamlVerification: string;
	jwtDataUpdates?: string;
	anchoredQueryStrings?: string;
	cacheableQueryStrings?: string;
	manualResults?: string;
	resourceStrings?: string;
	relativePathTemplates?: IStringIndexer<string>;
}

interface IKatAppOptions extends IKatAppDefaultOptions {
	// Only missing when showModalAsync called 'createAppAsync' and modal was built with 'content' instead of a view
	view?: string;
	// Only present when showModalAsync called 'createAppAsync' and modal was built with 'content' instead of a view
	content?: string | HTMLElement;
	// Set by framework when nested/modal app
	modalAppOptions?: IModalAppOptions;
	hostApplication?: IKatApp;
	cloneHost?: boolean | string;

	// Settings
	userIdHash?: string; // User ID hashed to be used in different caching scenarios
	dataGroup: string;
	currentPage: string;
	environment?: string;
	requestIP?: string;

	inputs?: ICalculationInputs;
	manualResults?: IManualTabDef[];
	resourceStrings?: IStringIndexer<IStringIndexer<string | { text: string }>>;
	
	intl: {
		currentCulture: string;
		currentUICulture?: string;
		currencyDecimalSeparator: string;
		currencyCode: string;
	}
}

// KatApp interfaces
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

	on<T extends EventTarget>(target: string | T | Array<T>, events: string, handler: (e: Event) => void, context?: Element): IKatAppEventFluentApi<T>;
	off<T extends EventTarget>(target: string | T | Array<T>, events: string, context?: Element): IKatAppEventFluentApi<T>;
	selectElement<T extends Element>(selector: string, context?: Element): T | undefined;
	selectElements<T extends Element>(selector: string, context?: Element): Array<T>;
	closestElement<T extends Element>(element: Element, selector: string): T | undefined;

	notifyAsync(from: IKatApp, name: string, information?: IStringAnyIndexer): Promise<void>;
	getTemplateContent(name: string): DocumentFragment;

	getLocalizedString(key: string | undefined, formatObject?: IStringIndexer<string>, defaultValue?: string): string | undefined;

	debugNext(saveLocations?: string | boolean, serverSideOnly?: boolean, trace?: boolean, expireCache?: boolean): void;
}

interface IKatAppEventFluentApi<T extends EventTarget> {
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



// KatApp .configure() interfaces
interface IConfigureOptions {
	options?: {
		modalAppOptions?: IModalAppOptions;
		inputs?: ICalculationInputs;
	}
	model?: IStringAnyIndexer;
	handlers?: IHandlers;
	components?: IStringAnyIndexer;
	directives?: IStringIndexer<(ctx: DirectiveContext<Element>) => (() => void) | void>;
	events: IKatAppEventsConfiguration;
}
interface IKatAppEventsConfiguration {
	[key: string]: any; // Enables event looping and copying from one config to another

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
	 * @param {KatApp} from - The KatApp that sent the notification.
	 */
	notification?: (name: string, information: IStringAnyIndexer | undefined, from: IKatApp) => void;
	input?: (name: string, calculate: boolean, input: HTMLElement, scope: IKaInputScope | IKaInputGroupScope) => void;
}
interface IHandlers extends IStringAnyIndexer { }
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
	rows: Array<ICalculationInputTableRow>
}
interface ICalculationInputTableRow extends ITabDefRow {
	index: string;
}



// State interfaces
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
	canSubmit: ( whenInputsHaveChanged: boolean | undefined ) => boolean;

	/**
	 * Indicates whether the KatApp framework is performing an action (calculateAsync, apiAsync, etc.) where the host application should display a UI blocking mechanism.
	 */
	uiBlocked: boolean;
	/**
	 * Is true when a v-ka-input (without v-ka-rbl-no-calc or v-ka-rbl-exclude directives) has been edited (via key press) but has not triggered a calculation yet.
	 * Used internally by the v-ka-needs-calc directive.
	 */
	needsCalculation: boolean; // True when input not 'skipped' has been edited but has not triggered a calculation yet

	model: IStringAnyIndexer;

	handlers?: IHandlers;

	// Private	
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



// Calculation/Api Submission interfaces
interface ISubmitApiOptions {
	inputs: ICalculationInputs,
	configuration: ISubmitApiConfiguration | IStringIndexer<string>;
	isCalculation: boolean;
}
interface ISubmitCalculationConfiguration extends ISubmitApiConfiguration {
	invalidCacheKeys?: string[];
}
interface ISubmitApiData {
	// Data?: RBLeRESTServiceResult; // Passed in if non-session calcs being used
	inputs: ICalculationInputs;
	inputTables?: Array<ICalculationInputTable>;
	apiParameters?: IStringAnyIndexer | undefined;
	configuration: ISubmitApiConfiguration;
}
interface ISubmitApiConfiguration {	
	token?: string; // Used only in submit for session based calcs
	comment?: string; // currently never passed
	testCE: boolean;
	authID: string; // used in non-session version, when options has a 'data' property of json formatted xds data
	client: string;
	adminAuthID: string | undefined;
	currentPage: string;
	requestIP: string;
	currentCulture: string;
	currentUICulture: string;
	environment: string;
	calcEngines: ISubmitCalculationCalcEngine[];
	nextCalculation?: INextCalculation;
	// RefreshCalcEngine: boolean;
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
	resultTab?: string
}

interface INextCalculation {
	saveLocations: { location: string, serverSideOnly: boolean }[];
	expireCache: boolean;
	trace: boolean;
	originalVerbosity: ITraceVerbosity;
}



// Modal KatApp interfaces
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
		modal?: string
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
	}

	// These methods are used when the modal needs to return more than just true/false to the caller
	// in conjunction with creating their own toolbar
	confirmedAsync?: (data?: unknown) => Promise<void>;
	cancelled?: (data?: unknown) => void;
	triggerLink?: HTMLElement;

	// If a dialog does its own buttons and is a 'step' based dialog and at the final step hides all but 'ok', the 'X' at the top of the dialog needs to trigger 'confirm' as well.
	closeButtonTrigger?: string; 
}
interface IModalResponse {
	confirmed: boolean;
	data: unknown;
	modalApp: IKatApp;
}

// apiAsync interfaces
interface IApiOptions {
	skipValidityCheck?: boolean;
	calculationInputs?: ICalculationInputs;
	apiParameters?: IStringAnyIndexer;
	isDownload?: boolean;
	calculateOnSuccess?: boolean | ICalculationInputs
	files?: FileList | null;
}
// .net core ValidationProblem format
interface IApiErrorResponse {
	status: number;
	title: string;
	type: string;
	errors?: IStringIndexer<Array<string>>;
	warnings?: IStringIndexer<Array<string>>;
	errorsDependsOn?: IStringIndexer<string>;
	warningsDependsOn?: IStringIndexer<string>;

	// extensions
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



// navigateAsync interfaces
interface INavigationOptions {
	inputs?: ICalculationInputs;
	persistInputs?: boolean;
}


// Calculation interfaces
interface ILastCalculation {
	inputs: ICalculationInputs;
	results: Array<ITabDef>;
	diagnostics?: Array<IRblCalculationDiagnostics | undefined>;
	endpointDiagnostics?: Array<string>;
	configuration: ISubmitApiConfiguration;
}
// Calculation failure interfaces
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



// Directive Options
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
	confirmedAsync?: (data: unknown | undefined, application: IKatApp) => Promise<void>;
	cancelledAsync?: (data: unknown | undefined, application: IKatApp) => Promise<void>;
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
	mode?: "chart" | "legend"; // Default: both (but legend could be turned off via CalcEngine options if mode not provided, otherwise mode overrides legend.show)

	// If from/to are provided, the chart will be sliced to only show the range of categories.  If not provided, all categories will be shown.
	// Useful, when lots of categories and client will render multiple charts with different ranges to display 'all' data (or to change the range of data shown without the need of a re-calculation)
	from?: number;
	to?: number;

	// If any provided, the primary chart will be wrapped with appropriate bootstrap classes to make it render, then based on provided breakpoints, rendering will be done appropriately based on bootstrap classes
	breakpoints?: {
		xs?: IKaChartModelBreakpoint;
		sm?: IKaChartModelBreakpoint;
		md?: IKaChartModelBreakpoint;
		lg?: IKaChartModelBreakpoint;
		xl?: IKaChartModelBreakpoint;
	}

	// If provided, rendered legend needs to have .ka-chart-legend-{name.toLower()} class.  Then each item needs to have ka-chart-highlight-key="series.name" attribute.
	// Then each 'text' element containing info that should be opaque needs to be provided via selector (i.e. div.legend-hover)
	legendItemSelector?: string;
	maxHeight?: number;

	ce?: string;
	tab?: string;
}

interface IKaChartModelBreakpoint {
	maxHeight?: number; // Max height of 'breakpoint' charts when rendered.  Default is model.maxHeight.
	categories?: number; // The number of categories to show.  Default is all categories.
	fontMultiplier?: number; // The multiplier to use for the font size of the chart.  Default is ce.fontMultiplier ?? 1.0.
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

	events?: IStringIndexer<((e: Event, application: IKatApp) => void)>
}
interface IKaInputModelHelp {
	title?: string;
	content?: string;
	width?: number;
}
interface IKaInputModelListRow extends ITabDefRow { key: string; text: string; }

interface IKaInputScope {
	readonly $template: string | undefined; // from markup
	readonly $renderId: string | undefined; // generated

	readonly id: string; // generated
	readonly name: string; // from markup
	readonly type: string; // from markup
	readonly value: string; // from ce ?? markup

	readonly disabled: boolean; // from isDisabled ?? ce
	readonly display: boolean; // from isDisplay ?? ce
	readonly noCalc: boolean; // from isNoCalc ?? ce

	readonly label: string; // from ce ?? markup
	readonly labelledBy?: string; // from markup
	readonly hideLabel: boolean; // from ce (value=-1) ?? markup
	readonly placeHolder: string | undefined; // from ce ?? markup
	readonly iconHtml: string; // from markup

	readonly help: IKaInputScopeHelp; // from ce ?? markup
	readonly css: IKaInputScopeCss; // from markup

	readonly list: Array<IKaInputModelListRow>; // from ce ?? markup
	readonly prefix: string | undefined; // from ce ?? markup
	readonly suffix: string | undefined; // from ce ?? markup
	readonly maxLength: number; // from ce ?? markup
	readonly min: string | undefined; // from ce ?? markup
	readonly max: string | undefined; // from ce ?? markup
	readonly step: number; // from ce ?? markup

	readonly error: string | undefined; // from ce
	readonly warning: string | undefined; // from ce 

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
	helps?: IKaInputModelHelp[] | IKaInputModelHelp
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

	events?: IStringIndexer<((e: Event, application: IKatApp) => void)>
}
interface IKaInputGroupScope {
	readonly $template: string | undefined; // from markup
	readonly $renderId: string; // generated

	readonly type: string; // from markup

	id: ( index: number ) => string; // generated
	name: ( index: number ) => string; // from markup
	value: ( index: number ) => string; // from ce ?? markup

	disabled: ( index: number ) => boolean; // from isDisabled ?? ce
	display: ( index: number ) => boolean; // from isDisplay ?? ce
	noCalc: ( index: number ) => boolean; // from isNoCalc ?? ce

	label: (index: number) => string; // from ce ?? markup
	hideLabel: (index: number) => boolean; // from ce ?? markup
	placeHolder: (index: number) => string | undefined; // from ce ?? markup

	help: (index: number) => IKaInputScopeHelp; // from ce ?? markup
	css: (index: number) => IKaInputScopeCss; // from markup

	list: (index: number) => Array<IKaInputModelListRow>; // from ce ?? markup
	prefix: (index: number) => string | undefined; // from ce ?? markup
	suffix: (index: number) => string | undefined; // from ce ?? markup
	maxLength: (index: number) => number | undefined; // from ce ?? markup
	min: (index: number) => string | undefined; // from ce ?? markup
	max: (index: number) => string | undefined; // from ce ?? markup
	step: (index: number) => number | undefined; // from ce ?? markup

	error: ( index: number ) => string | undefined;
	warning: (index: number) => string | undefined;

	inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => void;
	inputUnmounted: (input: HTMLInputElement) => void;
}
interface IKaInputGroupScopeBase {
	display: ( index: number ) => boolean;
	noCalc: (index: number) => boolean;
	disabled: (index: number) => boolean;
	error: (index: number) => string | undefined;
	warning: (index: number) => string | undefined;
}