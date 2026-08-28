> This file is a focused section of KatApp documentation.
> Use [KatApp.md](./KatApp.md) for the index.

# KatApp API

This section describes all the interfaces and their properties, methods and events present in the KatApp Framework.

- [KatApp Static Methods](#katapp-static-methods)
- [IKatAppOptions](#ikatappoptions)
- [IKatApp](#IKatApp)
    - [IKatApp Properties](#ikatapp-properties)
    - [IKatApp Methods](#ikatapp-methods)
    - [IKatApp Lifecycles](#ikatapp-lifecycles)
    - [IKatApp Events](#ikatapp-events)
- [Supporting Interfaces](#supporting-interfaces)

## KatApp Static Methods

To create and retrieve references to existing KatApps, there are static methods exposed on the `KatApp` interface.

Name | Description
---|---
[`createAppAsync`](#katappcreateappasync) | Asyncronous method to create a new KatApp bound to an `HTMLElement` selected via `selector`.
[`get`](#katappget) | Get access to an existing KatApp.
[`handleEvents`](#katapphandleevents) | Similar to [`IKatApp.handleEvents`](#ikatapphandleevents) and allows for events to be attached to applications.  Used generic javascript libraries that want to attach events to an application, but is have direct access to an application or the application may not be created/available at the time the library wants to register the events.
[`getDirty`](#katappgetdirty) | Returns all currently running KatApps where the [`isDirty`](./KatApp.03.State.md#istate-properties) flag is `true`.

### KatApp.createAppAsync

`createAppAsync(selector: string, options: IKatAppOptions, configAction?: IConfigureDelegate): Promise<KatApp>`

Asyncronous method to create a new KatApp bound to an `HTMLElement` selected via `selector`.

The optional `configAction` parameter is the same delegate accepted by [`IKatApp.configure`](#ikatappconfigure).  A Kaml View never needs this; its own script calls `application.configure()`.  It exists for applications that have no Kaml View of their own — see [`IModalOptions.configure`](#contentselector-modals) for the scenario that motivated it.

```javascript
function ready(fn) {
	if (document.readyState !== 'loading') {
		(async () => {
			await fn();
		})();
	} else {
		document.addEventListener('DOMContentLoaded', fn);
	}
}
ready(async () => {
	try {
		await KatApp.createAppAsync(
			'.katapp', 
			{ /* options */ } 
		);
	}
	catch ( ex ) {
		console.log( { ex } );
	}
});
```

### KatApp.get

`get(key: string | Element): KatApp | undefined`

To get access to an existing KatApp, use the `get` method and pass in a 'key'.  The `key` can be the KatApp `selector` or `id` or the `HTMLElement` the KatApp is bound to.

This method is the way Kaml Views get access to the currently running KatApp.

```javascript
(function () {
	/** @type {IKatApp} */
	var application = KatApp.get('{id}');
	// ... additional code
)();
```

Note: This is also the method used to investigate a KatApp during debug sessions in browser developer tools.

### KatApp.handleEvents

`handleEvents(selector: string, configAction: (config: IKatAppEventsConfiguration) => void): void`

Attach events to an application given a known selector string.  Can be called at any time during the life cycle of a KatApp application, *even before the application has been created and/or mounted*.

When using this method to bind events, *almost always*, the last parameter, `application`, of any given event will be required since these event handlers are often generic and don't necessarily know 'which' application is being handled.

```javascript
(function () {
	// Sample that hooks up global logging for a katapp selector from the host framework's library code.
	// So the host framework *knows* what the main application selector is (.katapp).
	KatApp.handleEvents(".katapp", events => {
		events.calculation = (lastCalculation, application) => {
			const logTitle = lastCalculation?.configuration.CurrentPage ?? application.options.currentPage;
			console.group(logTitle + " KatApp calculation");

			console.log(lastCalculation != undefined && lastCalculation.results.length > 0 ? lastCalculation.results[0] : application.options.manualResults[0]);
		};
	});
)();
```

### KatApp.getDirty

`getDirty(): Array<IKatApp>`

Returns all currently running KatApps where the [`isDirty`](./KatApp.03.State.md#istate-properties) flag is `true`.  Useful for preventing navigation if anything is dirty.

```javascript
(function () {
	window.addEventListener('beforeunload', e => {
		const dirtyKatApps = KatApp.getDirty();

		// Could walk the dirtyKatApps and look to see if hostApplication != undefined meaning it is a modal or nested as well

		if (dirtyKatApps.length > 0) {
			e.preventDefault();
			e.returnValue = "";
		}
	});
)();
```

## IKatAppOptions

`IKatAppOptions` is used to configure how a KatApp executes.  It is primarily used as a parameter to the [KatApp.createAsync](#katappcreateappasync) method.  

When a Kaml Vew is a nested or modal application, it can use the `application.options` to acess [modalAppOptions](#ikatappoptions) or [hostApplication](#ikatappoptions) as needed. 

Property | Type | Description
---|---|---
`view` | `string \| undefined` | The name of the Kaml View to use in the KatApp in the format of `folder:name`.  Non-modal KatApps will always pass in a view via `"view": "Channel.Home"`.  The only time `view` is `undefined` is when [application.showModalAsync](#ikatappshowmodalasync) is called and static HTML content is passed in via the [IModalOptions.content](#imodaloptions) or [IModalOptions.contentSelector](#imodaloptions).
`debug` | [`IKatAppDebugOptions \| undefined`](#ikatappdebugoptions) | Provide debug configuration used throughout lifetime of KatApp.
`endpoints` | [`IKatAppEndpointOptions`](#ikatappendpointoptions) | Provide endpoint configurations used throughout lifetime of KatApp to communicate with Host environment.
`delegates` | [`IKatAppDelegateOptions \| undefined`](#ikatappdelegateoptions) | Provide delegate/callback methods used throughout lifetime of KatApp.
`userIdHash` | `string` | If the Kaml View is running in the context of a logged in user, a `userIdHash` can be passed in.  This value is used during caching operations that use browser sessionStorage.
`dataGroup` | `string` | The name of the current 'data group' that the user data is tied to.  Used as identification in tracing.
`currentPage` | `string` | The name of the current page as it is known in the Host Environment.  If a Kaml View is a shared view for various functionalities, this can be used in Kaml View javascript or a CalcEngine to help distinguish in which 'context' a Kaml View is running.
`environment` | `string` | The name of the current environment as it is known in the Host Environment. This can be used in Kaml View javascript or a CalcEngine if different functionality needs to occur based on which environment (i.e. DEV, QA, PROD) a Kaml View is running<br/><br/>This value is passed into the RBLe Framework calculations via the `iEnvironment` input.
`requestIP` | `string` | The IP address of the browser running the current KatApp.
`inputs` | [`ICalculationInputs`](#icalculationinputs) | The Host Environment can pass in inputs that serve as the default values to inputs rendered in the Kaml View or simply as 'fixed' inputs (if no matching rendered inputs are present that would update them) that will be passed to every RBLe Framework calculation.  This value becomes the initial value for [`IState.inputs`](./KatApp.03.State.md#istate-properties) when the KatApp is created.
`inputCaching` | `boolean` | Whether or not the page inputs are cached after each calculation.  This allows the user to leave a page and come back and the inputs would automatically be retored.  The default is `false`.
`manualResults`<sup>1</sup> | [`Array<IManualTabDef>`](#imanualtabdef) | The Host Environment can pass in 'manual results'.  These are results that are usually generated one time on the server and cached as needed.  Passing manual results to a KatApp removes the overhead needed to perform a RBLe Framework calculation. 
`resourceStrings` | [`IResourceStrings`](#iresourcestrings) | The Host Environment can pass in 'resource strings'.  This object is usually generated one time on the server and cached as needed and provides the KatApp the ability to localize its strings via the [v-ka-resource](./KatApp.06.CustomDirectives.md#v-ka-resource) directive or via the [IKatApp.getLocalizedString](#ikatappgetlocalizedstring) method. 
`modalAppOptions` | [`IModalAppOptions`](#imodalappoptions) | Read Only; When a KatApp is being rendered as a modal ([v-ka-modal](./KatApp.06.CustomDirectives.md#v-ka-modal)) application, the KatApp Framework will automatically assign this property; a [IModalAppOptions](#imodalappoptions) created from the [IModalOptions](#imodaloptions) parameter passed in when creating modal application.<br/><br/>This property is not accessed often; `modalAppOptions` is accessed when a Kaml View, launched as a modal, needs to call `modalAppOptions.cancelled` or `modalAppOptions.confirmedAsync`.
`hostApplication` | [`IKatApp`](#ikatapp) | Read Only; When a KatApp is being rendered as a nested ([v-ka-app](./KatApp.06.CustomDirectives.md#v-ka-app)) or modal ([v-ka-modal](./KatApp.06.CustomDirectives.md#v-ka-modal)) application, the KatApp Framework will automatically assign this property to a reference of the KatApp application that is creating the nested or modal application.<br/><br/>This property is not acesed often; `hostApplication` is access when a Kaml View needs to call [`KatApp.notifyAsync`](#ikatappnotifyasync).

<sup>1</sup> Not only can the manual results be a RBLe Framework calculation performed on the server, it can also be post processed and modified a bit before passing in to the KatApp or the manual results can be completely generated via server side code without using the RBLe Framework.  As long as the results match the `IManualTabDef` interface, it can be used.

```javascript
"manualResults": [
    { 
        "@calcEngineKey":"BRD",
        "@name":"RBLUser",
        "@type":"ResultXml",
        "@version":"1.0148",
        "@calcEngine":"Conduent_Nexgen_Global_BRD_SE_Test.xlsm",
        "configBenefitCategories": [
            { "id":"1", "groupId":"1", "text":"Health Benefits" }
        ]
    }
]
```

### IKatAppEndpointOptions

Optional debugging options that can be used during the development of a KatApp's Kaml View or CalcEngine.

Property | Type | Description
---|---|---
`calculation` | `string` | Url (usually an api endpoint in Host Environment) where RBLe Framework calculations should be posted to. A common endpoint that is used is `api/rble/sessionless-proxy`.
`katDataStore` | `string \| undefined` | Url of where to download Kaml View and Template files from if they are not hosted in Host Environment.  If not provided, defaults to `https://btr.lifeatworkportal.com/services/camelot/datalocker/api/kat-apps/{name}/download`
`kamlVerification` | `string` | Url (api endpoint in Host Environment) where Kaml views requested modal and nested KatApp applications are verified.  If not provided, defaults to `api/katapp/verify-katapp`.
`manualResults` | `string` | Similiar to `manualResults`, if provided, this endpoint could be called to retrieve a `manualResults` object from the Host Environment that is of type [`Array<IManualTabDef>`](#imanualtabdef).  Used to leverage browser caching.
`resourceStrings` | `string` | Similiar to `resourceStrings`, if provided, this endpoint could be called to retrieve the `resourceStrings` object from the Host Environment that is of type [`IResourceStrings`](#iresourcestrings).  Used to leverage browser caching.
`anchoredQueryStrings` | `string?` | Optional query string that should be merged with every api call.  If not provided, it will use the query string (if any) that is present on the `calculationUrl`.
`baseUrl` | `string?` | Optional string to indicate the base url to use before calling api endpoints.  It will be prepended before the `api/`.
`relativePathTemplates`<sup>1</sup> | `IStringIndexer<string>` | If the Host Environment hosts all its own Kaml Views and Kaml Template files, instead of the KAT CMS, all the relative paths to existing Kaml Template files can be provided, instructing KatApp Framework to request it via relative path.

<sup>1</sup> `relativePathTemplates` is an object in the format of the following:

```javascript
// The 'Rel:' prefix is required and informs KatApp Framework that is is a relative path.
"relativePathTemplates": {
    "Nexgen:Templates.Pension.Shared.kaml" : "Rel:KatApp/NexgenVue/Templates.Pension.Shared.kaml?c=20220920103112",
    "Nexgen:Templates.Profile.Shared.kaml" : "Rel:KatApp/NexgenVue/Templates.Profile.Shared.kaml?c=20221005182346",
    "Nexgen:Templates.Shared.kaml" : "Rel:KatApp/NexgenVue/Templates.Shared.kaml?c=20221011223650"
}									
```

### IKatAppDelegateOptions

Optional delegate options that can be used to instruct how the KatApp framework can call into delegate/callback methods found in the Host Environment.

Property | Type | Description
---|---|---
`encryptCache` | `(data: object) => string \| Promise<string>` | RBL results are cached in browser storage.  This delegate allows the client to provide a JavaScript function that will encrypt the data before storing the results.  By default, the results are not cached.
`decryptCache` | `(cipher: string) => object \| Promise<object>` | If the RBL results were encrypted before caching in browser storage, this delegate allows the client to provide a JavaScript function that will decrypt the data before returning the results.  By default, the results are not cached.
`getSessionKey` | `(key: string) => string` | Generates a session key specific to KatApp framework when storing information in browser `sessionStorage`.
`getSessionItem` | `<T = string>(key: string, oneTimeUse?: boolean) => T \| undefined` | Retrieves a session item from the browser `sessionStorage` given the requested `key`.  The `oneTimeUse` parameter indicates if the item should be removed from storage after it is retrieved.  The default value is `false`.
`setSessionItem` | `(key: string, value: any) => void` | Sets a session item in the browser `sessionStorage` given the requested `key` and `value`.
``removeSessionItem` | `(key: string) => void` | Removes a session item from the browser `sessionStorage` given the requested `key`.
`katAppNavigate` | `(id: string, props: IModalOptions, el: HTMLElement) => void \| undefined` | To allow navigation to occur from within a KatApp (via [v-ka-navigate](./KatApp.06.CustomDirectives.md#v-ka-navigate)), a reference to a javascript function must be assigned to this property. The KatApp Framework will call this function (created by the Host Environment) when a navigation request has been issued.  It is up to the Host Environment's javascript to do the appropriate processing to initiate a successful navigation.

### IKatAppIntlOptions

Optional settings used when formatting numbers and dates in the KatApp Framework.

Property | Type | Description
---|---|---
`currentCulture` | `string` | The current culture as it is known in the Host Environment.  This enables culture specific number and date formatting and is in the format of `languagecode2-country/regioncode2`.  The default value is `en-US`.<br/><br/>This value is passed into the RBLe Framework calculations via the `iCurrentCulture` input.  This controls default number and date formatting.
`currentUICulture` | `string` | The current culture as it is known in the Host Environment.  This enables culture specific number and date formatting and is in the format of `languagecode2-country/regioncode2`.  The default value is `en-US`.<br/><br/>This value is passed into the RBLe Framework calculations via the `iCurrentUICulture` input.  This is primarily regarding the UI localization/translation part of the app.
`currencyDecimalSeparator` | `string` | Based on the current `currentCulture` value, this is the currency decimal separator.  The default value is `.`.
`currencyCode` | `string` | Based on the current `currentCulture` value, this is the currency code.  The default value is `USD`.


### IKatAppDebugOptions

Optional debugging options that can be used during the development of a KatApp's Kaml View or CalcEngine.

Property | Type | Description
---|---|---
`traceVerbosity`<sup>1</sup> | `TraceVerbosity` | Control the trace output level to display for the current KatApp by assigning desired enum value.  The default value is `TraceVerbosity.None`.
`useTestCalcEngine` | `boolean` | Whether or not the RBLe Framework should the test version of the specified CalcEngine.  A `boolean` value can be passed in or using the querystring of `test=1` will enable the settings.  The default value is `false`.
`useTestView` | `boolean` | Whether or not the KatApp Framework should use the test versions of any requested Kaml Views or Kaml Template Files that are hosted in the KAT CMS instead of by the Host Environment.  A `boolean` value can be passed in or using the querystring of `testview=1` will enable the settings. The default value is `false`.
`showInspector` | `string` | The KatApp Framework can show diagnostic information about Vue directives since Vue processing removes all directives from the markup making it difficult at times to debug and find the original Kaml directives.  To enable, set the value to `1` or a comma delimitted list of the directive types you are most interested in.  Blank or `0` will disable.  When enabled, pressing `CTRL+ALT+I` together will toggle visual cues for each 'Vue enabled' element of the desired types.  Then use the browser 'inspect tool' to view an HTML comment about the Vue element.  A querystring of `showinspector=1` defaults to showing visual cues on the `resource,value,modal,template,html,text` settings or set the `showinspector` querystring to the desired settings you wish to inspect.  The default value off `0`.<br/><br/>The settings available are simply the name of the directive *without* `v-ka-` or `v-`.  The only exceptions are `v-ka-rbl-no-calc` -> `no-calc`, `v-ka-rbl-exclude` -> `exclude`, and `v-ka-unmount-clears-inputs` -> `unmount`.
`debugResourcesDomain` | `string` | Whether or not the KatApp Framework should attempt to find requested Kaml Views or Kaml Template Files from the 'domain' passed in before checking the KAT CMS or Host Environment.  A `string` value providing a local web server address can be provided via `"debugResourcesDomain": "localhost:8887"` to enable the feature.  The default value is `undefined`.<br/><br/>KAT Evolution and Camelot frameworks enable this feature using a `localserver` querystring parameter.  For example, `https://hosted.site.domain/?localserver=localhost:5500` will enable the feature and attempt to find files at `http://localhost:5500/` before checking the KAT CMS or Host Environment.  Kaml files can be partitioned into view.kaml, view.kaml.js, view.kaml.css, and view.kaml.templates to promote single responsibility principle.<br/><br/>Using `debugResourcesDomain` supports this as well, however it makes individual requests for each file if the original Kaml file does not have a `<script/>` or `<style/>` section present.  If additional files are required to create the Kaml package, the `local-kaml-package` attribute must be set on the `<rbl-config/>` element.  See [Configuring CalcEngines and Template Files](./KatApp.01.GettingStarted.md#configuring-calcengines-and-template-files) for more information.

<sup>1</sup> `TraceVerbosity` is defined as the following.

```typescript
enum TraceVerbosity {
	None,
	Quiet,
	Minimal,
	Normal,
	Detailed,
	Diagnostic
}
```

## IKatApp

The `IKatApp` interface represents the KatApp 'application' object that the Kaml View interacts with via method calls and event handlers.

### IKatApp Properties

Property | Type | Description
---|---|---
`el` | `HTMLElement` |  The `HTMLElement` that is the container for the `IKatApp`.
`options` | [`IKatAppOptions`](#ikatappoptions) | The `IKatAppOptions` that configure the options that control the `IKatApp`.
`isCalculating` | `boolean` | Read Only; Whether or not the KatApp is currently triggering and processing a RBLe Framework calculation.
`lastCalculation` | [`ILastCalculation | undefined`](#ilastcalculation) | Read Only; If a RBLe Framework calculation has previously run, this property will contain a snapshot of the `ILastCalculation` object.
`state` | [`IState`](./KatApp.03.State.md#istate) | The global state object passed into the Vue application.  Any updates to properties on the `state` object can trigger reactivity.
`selector` | `string` | The selector string that was used to locate the `HTMLElement` and set the `el` property which hosts the KatApp.

### IKatApp Methods

Name | Description
---|---
[`configure`](#ikatappconfigure) | Allows for the Kaml View to configure the application by augmenting the original application options, providing a custom model, adding event handlers, etc.
[`handleEvents`](#ikatapphandleevents) | Allows for the Kaml View to add additional event handlers to an application.
[`navigateAsync`](#ikatappnavigateasync) | Manually trigger a navigation.
[`calculateAsync`](#ikatappcalculateasync) | Manually call a RBLe Framework calculation.
[`apiAsync`](#ikatappapiasync) | Use an [`IApiOptions`](#iapioptions) and [`ISubmitApiOptions`](#ISubmitApiOptions) object to submit a payload to an api endpoint.
[`showModalAsync`](#ikatappshowmodalasync) | Manually show a modal dialog configured by the [`IModalOptions`](#imodaloptions) parameter.
[`blockUI`](#ikatappblockui) | Indicate that the Kaml View UI should be blocked while performing a long running action.
[`unblockUI`](#ikatappunblockui) | Indicate that the Kaml View UI should no longer be blocked after performing a long running action.
[`allowCalculation`](#ikatappallowcalculation) | Turn on or off a configured CalcEngine from being ran in subsequent calculations.
[`getInputs`](#ikatappgetinputs) | Return a [`ICalculationInputs`](#icalculationinputs) object representing current Kaml View inputs.
[`getInputValue`](#ikatappgetinputvalue) | Get the specified input value based on the input name passed.
[`setInputValue`](#ikatappsetinputvalue) | Set the specified input value based on the input name passed.
[`selectElement`](#ikatappselectelement) | Select DOM element scoped to the current KatApp.
[`selectElements`](#ikatappselectelements) | Select DOM elements scoped to the current KatApp.
[`closestElement`](#ikatappclosestelement) | Select parent DOM element scoped to the current KatApp.
[`on`](#ikatappon) | Add event handlers for DOM elements present within a KatApp.
[`off`](#ikatappoff) | Remove event handlers for DOM elements present within a KatApp.
[`notifyAsync`](#ikatappnotifyasync) | Allow a nested application to send information to its [`hostApplication`](#ikatappoptions).
[`debugNext`](#ikatappdebugnext) | Helper method to indicate to the KatApp what debugging features should be used during the next calculation.
[`getTemplateContent`](#ikatappgettemplatecontent) | Returns the 'content' of a requested template.
[`getLocalizedString`](#ikatappgetlocalizedstring) | Returns the localized string of a requested key.

#### IKatApp.configure

**`configure(configAction: IConfigureDelegate): IKatApp`**

Where `IConfigureDelegate` is:

```javascript
(config: IConfigureOptions, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined, application: IKatApp) => void
```

The `configure` method can only be called one time and must be called before the Kaml View is 'mounted' by Vue. Allows for the Kaml View to update application options by modifying the `config` parameter.  See [`IConfigureOptions`](#iconfigureoptions) for more information.

This pattern follows a similar configuration action delegate used in .NET Core application setup.

The `rbl`, `model`, `inputs`, `handlers`, and `application` parameters are optional, but are passed in to allow access to the application's state properties in a shorthand syntax.

`application` is the application being configured.  Inside a Kaml View script this is the same object as the file scoped `application` variable, so its declaration is unneeded.  It matters when the delegate is *not* declared inside the script of the application it configures — see [contentSelector Modals](#contentselector-modals) — because the `application` variable closed over from the enclosing script refers to the host application, not the one being configured.

```javascript
/** @type {IKatApp} */
var application = KatApp.get('{id}');

// Optionally update the KatApp options and state.  The configAction delegate passes in
// references to the rbl, model, inputs, and handlers properties from its state.
application.configure((config, rbl, model, inputs, handlers) => { 

	// In any event below, we access 'model' and 'rbl' in the handler.
	// Even though 'configure' is called immediately at application start and 'rbl' and
	// 'model' are empty at the time of the 'configure' call...by the time the rendered event
	// is raised, the references for `rbl` and `model` are up to date and will have appropriate 
	// values.

	config.model = {
	};

	config.options = {
	}
	config.handlers = {
	};

	config.events.initialized = () => {
		// Optionally bind Application Events
		console.log( 'handled' );

		// Can use the current applications state properties via delegate parameters.
		console.log( rbl.value("nameFirst" ) );
		// 'rbl' is equivalent to 'application.state.rbl'.
	};
	config.events.rendered = () => {
		// using 'model' is equivalent to 'application.state.model'
		// using 'rbl' is equivalent to 'application.state.rbl'
		model.eventMessageHeader = rbl.value("eventMessageHeader");
		model.eventMessage = rbl.value("eventMessage");
	}
	
	config.directives = {
	};

	config.components = {
	};
});
```


#### IKatApp.handleEvents

**`handleEvents(configAction: IHandleEventsDelegate): IKatApp`**

Where `IHandleEventsDelegate` is:

```javascript
(events: IKatAppEventsConfiguration, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void
```

Allows for the Kaml View to add additional event handlers to an application via the `events` parameter.  This is similar to the original `configure()` method call and assigning specific events, but is allowed to be called at any time during the application life cycle.

See [`IKatAppEventsConfiguration`](#ikatappeventsconfiguration) for more information.

#### IKatApp.navigateAsync

**`navigateAsync(navigationId: string, options?: INavigationOptions): Promise<void>;`**

Manually trigger a navigation.  The [INavigationOptions](#inavigationoptions) object allows for passing (and optionally persisting) inputs to be passed to the next application.

#### IKatApp.calculateAsync

**`calculateAsync(customInputs?: [ICalculationInputs](#icalculationinputs), processResults?: boolean, calcEngines?: ICalcEngine[]): Promise<ITabDef[] | void>;`**

Manually call a RBLe Framework calculation.  The parameters allow for a list of additional inputs to be passed in, whether or not the results should be [processed](./KatApp.03.State.md#rble-framework-result-processing-in-katapp-state) or simply return the raw results and an optional list of `ICalcEngines` to run in place of the KatApp's configured CalcEngines.

#### IKatApp.apiAsync

**`apiAsync(endpoint: string, apiOptions: IApiOptions, trigger?: HTMLElement, calculationSubmitApiConfiguration?: ISubmitApiOptions): Promise<IStringAnyIndexer | undefined>;`**

Use an [`IApiOptions`](#iapioptions) and [`ISubmitApiOptions`](#ISubmitApiOptions) object to submit a payload to an api endpoint and return the results on success. KatApps have the ability to call web api endpoints to perform actions that need server side processing (saving data, generating document packages, saving calculations, etc.).  All api endpoints should return an object indicating success or failure.

See [`v-ka-api`](./KatApp.06.CustomDirectives.md#v-ka-api) and [`IApiOptions` interface](#iapioptions) for more information.

Api endpoints can return an `IApiErrorResponse` response either due to validation issues or unhandled exceptions on the server. When an api endpoint fails, the response object implements the following interface:

```javascript
interface IApiErrorResponse {
	Validations: Array<{ ID: string, Message: string }> | undefined;
	ValidationWarnings: Array<{ ID: string, Message: string }> | undefined;
	Result: IStringAnyIndexer;
}
```

If `apiAsync` receives this error response, it will throw an `ApiError` exception (`ApiError` extends the base `Error` class).

Note: There are API Endpoint lifecycle events that are triggered during the processing of an api endpoint.  See [API Lifecycle Events](#api-lifecycle) for more information.

##### ApiError.message

Property Type: `string`  
The message of the error.

##### ApiError.stack

Property Type: `string | undefined`  
The current call stack when the exception occurred (if present).

##### ApiError.innerException

Property Type: `Error | undefined`  
If an unexpected exception occurred, `innerException` will be set to the original exception thrown.

##### ApiError.apiResponse

Property Type: `IApiErrorResponse | undefined`  
If the api endpoint returned a failure response, the `apiResponse` will be set to the original response.

#### IKatApp.showModalAsync

**`showModalAsync(options: IModalOptions, triggerLink?: HTMLElement): Promise<IModalResponse>;`**

Manually show a modal dialog configured by the [`IModalOptions`](#imodaloptions) parameter and return an [`IModalResponse`](#imodalresponse) indicating whether or not it was confirmed and the data returned (in both the 'confirmed' and 'cancelled' scenarios).

If a `triggerLink` is provided, the link will be disabled while the modal dialog is shown and re-enabled when hidden.

`showModalAsync` can throw exceptions, including when:

1. Neither `view`, `content`, nor `contentSelector` was provided.
1. `contentSelector` matched no element.
1. `configure` was provided along with `view`; see [contentSelector Modals](#contentselector-modals).
1. Markup already on the page contains the `kaModal` class.

See [`v-ka-modal`](./KatApp.06.CustomDirectives.md#v-ka-modal) and [`IModalOptions` interface](#imodaloptions) for more information.

#### IKatApp.blockUI

**`blockUI(): void`**

In the simplest sense, the UI is blocked during a calculation and unblocked when complete or blocked when an api submission starts and unblocked when complete.  However, since some actions might trigger a calculation and an api submission, UI blocking and unblocking is actually like a publisher/subscriber relationship where `blockUI()` can be called (published to) multiple times and the UI will only be unblocked if `unblockUI()` is called the same number of times.

#### IKatApp.unblockUI

**`unblockUI(): void`**

See [`blockUI`](#ikatappblockui) for more information.

#### IKatApp.allowCalculation

**`allowCalculation(ceKey: string, enabled: boolean): void`**

Turn on or off a configured CalcEngine from being ran in subsequent calculations.  Only CalcEngines whose current `enabled` value is `true` will be processed when a calculation is triggered.

#### IKatApp.getInputs

**`getInputs(customInputs?: ICalculationInputs): ICalculationInputs;`**

Return a [`ICalculationInputs`](#icalculationinputs) object that represent the union of the current UI inputs along with the `customInputs` pass in (if any).

#### IKatApp.getInputValue

**`getInputValue(input: string, allowDisabled?: boolean): string | undefined;`**

Get the current input value of the input name passed in by inspecting the raw HTML markup/elements versus the [`state.inputs`](./KatApp.03.State.md#istate-properties) object.

By default, `allowDisabled` is `false`, but if `true` is passed in, and the input element is disabled, the method returns `undefined`.

#### IKatApp.setInputValue

**`setInputValue(name: string, value: string | undefined, calculate?: boolean): Array<HTMLInputElement> | undefined;`**

Given and input `name` and `value`, set the value of the HTML element and the value in the [`state.inputs`](./KatApp.03.State.md#istate-properties). If `value` is undefined, the input name and property will be removed from `state.inputs`.

By default, `calculate` is `false` so that setting input values does not trigger a calculation and Kaml Views can safely set multiple input values without a calculation. If `true` is passed in, then a RBLe Framework calculation will occur after the input value is applied.

#### IKatApp.selectElement

**`.selectElement<T extends HTMLElement>(selector: string, context?: HTMLElement): T | undefined`**

This is a replacement function for `document.querySelector()` selector method.  It is needed to scope the selection within the current KatApp (does not reach outside the KatApp markup) and also prevents selection from selecting **into** a nested KatApp.

```javascript
// Get address input
const address = application.selectElement(".iAddress")
```

#### IKatApp.selectElements

**`.selectElements<T extends HTMLElement>(selector: string, context?: HTMLElement): Array<T>`**

This is a replacement function for `document.querySelector()` selector method.  It is needed to scope the selection within the current KatApp (does not reach outside the KatApp markup) and also prevents selection from selecting **into** a nested KatApp.

```javascript
// Get all inputs of my application (but none from nested KatApps or outside of my KatApp in container site)
application.selectElements(":input");

// Get all inputs of my application within the address container
const address = application.selectElement(".address")
const addressInputs = application.selectElements(":input", address);

/* or... */
const addressInputs = application.selectElements(".address :input");
```

#### IKatApp.closestElement

**`.closestElement<T extends HTMLElement>(element: HTMLElement, selector: string): T | undefined`**

This is a replacement function for `HTMLElement.closest()` method.  It is needed to scope the selection within the current KatApp (does not reach outside the KatApp markup - either to hosting site or a parent KatApp).

```javascript
const name = application.selectElement(".iName");
const nameLabel = application.closestElement(name, "label");
```

#### IKatApp.on

**`.on<T extends HTMLElement>(target: string | HTMLElement | Array<HTMLElement>, events: string, handler: (e: Event) => void, context?: HTMLElement): KatAppEventFluentApi<T>`**

This is a replacement function for native HTMLElement.addEventListener.  It wraps the process of selecting DOM elements within the scopeof the current KatApp (does not reach outside the KatApp markup - either to hosting site or a parent KatApp), looping each element, adding event handler, and returning a 'fluent api' object that allows chaining of `on` and `off`.

The `events` parameter can be a space delimitted list of (namespaced) events (i.e. `"click change"`).  The `target` parameter can be a string selector, a single `HTMLElement`, or an array of `HTMLElement`s.  If `target` is a string selector, it will be scoped to the current KatApp.

**NOTE:** You only pass selector parameter on the first call to a chainable method (`on` or `off`).  See [IKatAppEventFluentApi](#ikatappeventfluentapi) for more information.

```javascript
const inputs = 
	application
		.on(":input", "change.ns", e => console.log(`${e.target.name} changed to ${e.target.value}`))
		.on(":input", "blur.ns", e => console.log(`${e.target.name} lost focus`))
		.elements;

inputs.forEach( input => {
	// do something with each input
	input.setAttribute("data-processed", "true");
});
```

#### IKatApp.off

**`.on<T extends HTMLElement>(target: string | HTMLElement | Array<HTMLElement>, events: string, context?: HTMLElement): KatAppEventFluentApi<T>`**

This is a replacement function for native HTMLElement.removeEventListener.  It wraps the process of selecting DOM elements within the scopeof the current KatApp (does not reach outside the KatApp markup - either to hosting site or a parent KatApp), looping each element, removing any event handler(s), and returning a 'fluent api' object that allows chaining of `on` and `off`.

The `events` parameter can be a space delimitted list of (namespaced) events (i.e. `"click change"`).  The `target` parameter can be a string selector, a single `HTMLElement`, or an array of `HTMLElement`s.  If `target` is a string selector, it will be scoped to the current KatApp.

**NOTE:** You only pass selector parameter on the first call to a chainable method (`on` or `off`).  See [IKatAppEventFluentApi](#ikatappeventfluentapi) for more information.

```javascript
const inputs = 
	application
		.off(":input", "change.ns")
		.on(""change.ns", e => console.log(`${e.target.name} changed to ${e.target.value}`))
		.elements;

inputs.forEach( input => {
	// do something with each input
	input.setAttribute("data-processed", "true");
});
```

#### IKatApp.notifyAsync

**`notifyAsync(from: KatApp, name: string, information?: IStringAnyIndexer): Promise<void>;`**

`notifyAsync` is a mechanism for a nested application to send information to its [`hostApplication`](#ikatappoptions).

```javascript
// Assume this code is inside a nested application and it has a reference to its 'hostApplication'
await hostApplication.notifyAsync(application, "myNotificationName", { moreData: "dataValue" });
```

For an application to receive this notification, it must have a `IKatAppEventsConfiguration.notification` delegate provided.

#### IKatApp.debugNext

**`debugNext(saveLocations?: string | boolean, serverSideOnly?: boolean, trace?: boolean, expireCache?: boolean): void`**

`debugNext` is a helper method to indicate to the KatApp that during the next *successful* RBLe Framework calculation(s) should have their debug CalcEngines saved to KAT Team's CMS, traced, or version checked. This is helpful to Kaml View or CalcEngine developers to aid in their debugging.  This method is manually invoked via the browser's console window while debugging the site.

`saveLocations` can be a comma delimitted list of KAT Team folder names or multiple calls to `debugNext` can take place before triggering a calculation and acheive the same result.  To clear out all currently specified locations specified, call `debugNext( false )`.

Setting `serverSideOnly` to `true` will only save calculations that occur in the Host Environment's server side code.  This is beneficial if an event handler triggers a calculation *then* posts to an api endpoint (which usually runs an initial RBLe Framework calculation).  If you only want to save the calculation that occurs when processing the api endpoint, setting this parameter to `true` accomplishes that.

Setting `trace` to `true` instructs the RBLe Framework to return detailed trace information inside the calculation results.

Setting `expireCache` to `true` instructs the RBLe Framework to immediately check for an updated CalcEngine from the CalcEngine CMS instead of waiting for the RBLe Framework's CalcEngine cache to expire.

#### IKatApp.getTemplateContent

**`getTemplateContent(name: string): DocumentFragment;`**

`getTemplateContent` returns the 'content' of a requested template.  This can be helpful if the Host Environment needs to render template content outside the context of a KatApp. The most common scenario is when a Host Environment needs to get the content for a `validation-summary` to render errors before a KatApp can finish rendering property.

#### IKatApp.getLocalizedString

**`getLocalizedString(key: string | undefined, formatObject?: IStringIndexer<string>, defaultValue?: string): string | undefined;`**

`getLocalizedString` returns the localized 'content' of the requested requested key based on the KatApp's [`options.currentUICulture'](#ikatappoptions).  In the KatApp markup/html, a [v-ka-resource](./KatApp.06.CustomDirectives.md#v-ka-resource) will be used, but if a localized string is needed inside of a KatApp's `script` section, this method can be used.

The flow for locating a localized string is as follows:

1. Use localized string for full 'languagecode-country/regioncode' if present.
1. Used localized string for 'languagecode' if present.
1. Use localized string for 'en-us' if present.
1. Use localized string for 'en' if present.
1. Use the `key` value when no localized string is found.

**Note**: 'key' can also be a complete json string representation of the model if needed.  Usually when generated from RBLe Framework calculations.  When the `key` is the entire model, there **must** be a `key` property on the model.

```javascript
// Returns string with 'Name.First' key.
application.getLocalizedString('Name.First');

// When no match, key is returned.  The following returns: This is actually the content and the key, if no key matches, this content will be returned.
application.getLocalizedString('This is actually the content and the key, if no key matches, this content will be returned.');

// Token substition is supported too.
// The following returns: Good morning Fred, how are you?
application.getLocalizedString('Good morning {name}, how are you?', { 'name': 'Fred' });

// Returns string with 'Default value for Name First' key when 'Name.First' key value is not found.
application.getLocalizedString('Name.First', undefined, 'Default value for Name First');

// assume rbl.value("greeting") returns { key: 'greeting', name: 'Terry' }
// assume greeting resource is "Good morning {name}, how are you?"
// Returns string with 'Good morning Terry, how are you?'.
application.getLocalizedString(rbl.value('greeting'));
```

See [v-ka-resource samples](./KatApp.06.CustomDirectives.md#v-ka-resource-samples) for more additional sample patterns.

### IKatApp Lifecycles

There are three main event lifecycles that occur during the life time of a KatApp; the initial 'create application' lifecycle, the 'calculation' lifecycle, and the 'api' lifecycle.

#### Create Application Lifecycle

When a KatApp is being created via the [`KatApp.createAppAsync`](#katappcreateappasync), the following lifecycle occurs.

1. [beforeOpenAsync](#imodaloptions) - if application is a modal application *using* `contentSelector`
1. The [`configAction` delegate](#katappcreateappasync) passed to `createAppAsync` - if provided; this is how [`IModalOptions.configure`](#contentselector-modals) is applied
1. The Kaml View's own [`application.configure()`](#ikatappconfigure) call - if the application has a `view`; runs as the view's script is executed during mount
1. [initialized](#ikatappinitialized)
1. [modalAppInitialized](#ikatappmodalappinitialized) - if application is a modal application
1. [nestedAppInitialized](#ikatappnestedappinitialized) - if application is a nested application
1. All events in the [Calculation Lifecycle](#calculation-lifecycle) - if any CalcEngines are [configured to all iConfigureUI calculations](./KatApp.01.GettingStarted.md#configuring-calcengines-and-template-files)
1. [rendered](#ikatapprendered)
1. [nestedAppRendered](#ikatappnestedapprendered) - if application is a nested application
1. [modalAppClosed](#ikatappmodalappclosed) - if application is a modal application

#### Calculation Lifecycle

When a calculation is initiated via an [input change triggering a calculation](./KatApp.06.CustomDirectives.md#v-ka-input) or by a Kaml View calling [`application.calculateAsync`](#ikatappcalculateasync), the following lifecycle occurs.

1. [updateApiOptions](#ikatappupdateapioptions) - allow Kaml View to update inputs and configuration used during calculation
1. [calculateStart](#ikatappcalculatestart)
1. [inputsCached](#ikatappinputscached) - allow Kaml View to provide additional inputs/information to cache before caching current inputs (if configured to cache)
1. Success events
    1. [resultsProcessing](#ikatappresultsprocessing) - all Kaml View to inspect and/or modify the calculation results before they are [processed](./KatApp.03.State.md#rble-framework-result-processing-in-katapp-state)
    1. All events in [Api Lifecycle](#api-lifecycle) if `jwt-updates` result table is provided and processed
    1. [configureUICalculation](#ikatappconfigureuicalculation) - if current calculation has an input of `iConfigureUI="1"`
    1. [calculation](#ikatappcalculation) - allow Kaml Views to inspect/use the `ILastCalculation`
    1. [domUpdated](#ikatappdomupdated) - allow Kaml Views to process final rendered DOM after reactivity
1. Failure Event
    1. [calculationErrors](#ikatappcalculationerrors) - allow Kaml Views to handle exceptions gracefully
1. [calculateEnd](#ikatappcalculateend)

#### Api Lifecycle

When a submission to an api endpiont is initiated via [`v-ka-api`](./KatApp.06.CustomDirectives.md#v-ka-api) or by a Kaml View calling [`application.apiAsync`](#ikatappapiasync), the following lifecycle occurs.

1. [updateApiOptions](#ikatappupdateapioptions) - allow Kaml Views to update inputs and configuration used during an api submission
1. [apiStart](#ikatappapistart) - allow Kaml Views to inspect and/or update the payload used during an api submission
1. [apiComplete](#ikatappapicomplete) - allow Kaml Views to inspect/use results from an successful api submission
1. [apiFailed](#ikatappapifailed) - allow Kaml Views to inspect/use error response from a failed api submission

### IKatApp Events

The KatApp framework raises events throughout the stages of different [lifecycles](#ikatapp-lifecycles) allowing Kaml View developers to catch and respond to these events as needed. All event handlers are registered on the application itself via the [`configure` method](#ikatappconfigure) or [`handleEvents` method](#ikatapphandleevents).

#### IKatAppEventsConfiguration

The `IKatAppEventsConfiguration` interface describes all events that are raised by the KatApp framework and are available to be handled via delegates assigned in `configure` or `handleEvents`.

**Note:** When examining the signatures of the functions, due to the javascript language processing, when creating the appropriate delegates, all/any parameters are optional and only required if you plan to use them.  If a delegate had 4 parameters, and you only needed the 4th parameter, then, you would need to include all parameters.  You can only skip unused, trailing parameters.

Name | Description
---|---
[`initialized`](#ikatappinitialized) | Triggered after KatApp Framework has finished initialization.
[`modalAppInitialized`](#ikatappmodalappinitialized) | Triggered on host application after a modal application has been initialized.
[`modalAppClosed`](#ikatappmodalappclosed) | Triggered on modal application after a modal has been closed (irregaurdless of confirm or cancel).
[`nestedAppInitialized`](#ikatappnestedappinitialized) | Triggered on host application after a nested application has been initialized.
[`rendered`](#ikatapprendered) | Triggered after Kaml View has been made visible to the user.
[`nestedAppRendered`](#ikatappnestedapprendered) | Triggered on host application after a nested application has been rendered.
[`updateApiOptions`](#ikatappupdateapioptions) | Triggered immediately before submission to server side API calls to allow for Kaml Views to modify inputs or configuration settings before submission.
[`calculateStart`](#ikatappcalculatestart) | Triggered at the start of a RBLe Framework calculation submission.
[`inputsCached`](#ikatappinputscached) | Triggered during a RBLe Framework calculation before inputs are cached to `sessionStorage` allowing for modification if needed.
[`resultsProcessing`](#ikatappresultsprocessing) | Triggered during a RBLe Framework calculation before framework processing of RBLe results allowing for modification of raw results if needed.
[`configureUICalculation`](#ikatappconfigureuicalculation) | Triggered after successful RBLe Framework calculation processing if `iConfigureUI = "1"`.
[`calculation`](#ikatappcalculation) | Triggered after successful RBLe Framework calculation processing.
[`calculationErrors`](#ikatappcalculationerrors) | Triggered when an exception is thrown during RBLe Framework calculation processing.
[`calculateEnd`](#ikatappcalculateend) | Triggered at the completion of a RBLe Framework calculation submission, regardless of success or not.
[`domUpdated`](#ikatappdomupdated) | Triggered to signal the 'end' of a DOM manipulation due to reactivity.
[`apiStart`](#ikatappapistart) | Triggered at the start of an API submission (via [`apiAsync`](#ikatappapiasync)).
[`apiComplete`](#ikatappapicomplete) | Triggered at the *successful* completion of an API submission that is *not* an file download endpoint.
[`apiFailed`](#ikatappapifailed) | Triggered when an exception is thrown during an API submission.
[`notification`](#ikatappnotification) | Triggered after another KatApp notifies the current KatApp via the [`notifyAsync`](#ikatappnotifyasync) method.
[`input`](#ikatappinput) | Triggered whenever a KatApp input has been updated.

#### IKatApp.initialized

**`initialized(application: IKatApp )`**

Triggered after KatApp Framework has finished injecting the Kaml View and any designated template files.  `initialized` can be used to call api endpoints to retrieve/initialize data that has not been obtained by default in the Host Environment.

#### IKatApp.modalAppInitialized

**`modalAppInitialized(modalApplication: IKatApp, hostApplication: IKatApp )`**

This event is triggered in two situations.

1. It is triggered **on a host application** after a modal application has been initialized. It allows for a host application to assign events to the modal application if needed or retain a reference to the modalApplication for later use.

```javascript
// Code that shows a modal, and uses all inputs from the modal/irp application

var irpApplication = undefined;

application.handleEvents( events => {
	events.modalAppInitialized = modalApplication => {
	    irpApplication = modalApplication;
	};
});

// This will trigger modalAppInitialized before showing the modal
const response = await application.showModalAsync({ view: 'DST.IRP' }); 

if (response.confirmed) {
    // If we made it this far, irpApplication will have been successfully assigned, grab a reference to its inputs
    // and assign the value to our own inputs.
    const irpInputs = irpApplication.state.inputs;
    application.setInputValue('iRetAge', irpInputs.iRetirementAge);
    application.setInputValue('iSalaryIncrease', irpInputs.iAnnualFuturePayIncreaseRate);
    application.setInputValue('iReplaceRatio', Math.round(Number(irpInputs.iReplaceRatio) * 100 / 5) * 5, true);
}
```

2. It is triggered **on the modal application** after the modal application has been initialized and calculations and/or manualResults has been processed.  It allows for a modal application to cancel the display of the modal if needed.  This is accomplished by returning `false`.  No return or returning `true` allows the modal application to display normally.

#### IKatApp.modalAppClosed

**`modalAppClosed(modalApplication: IKatApp)`**

This event is triggered when KatApp modal is confirmed or cancelled.  Allows for event to be handled in the modal application's event configuration regardless of confirm or cancel.  Useful for cleanup of events that might have been registered by the modal application on elements outside of the application scope (i.e. document elements).

#### IKatApp.nestedAppInitialized

**`nestedAppInitialized(nestedApplication: IKatApp, hostApplication: IKatApp )`**

This event is triggered after a nested application has been initialized. It allows for a host application to assign events to the nested application if needed or retain a reference to the nestedApplication for later use.

```html
<!-- 
    Sample showing a Kaml View turning off ConfigureUI calculations (via configure-ui="false") and waiting until
    a nested application successfully triggers 'configureUICalculation' before calling a `iConfigureUI="1"` calculation.
 -->
<rbl-config templates="NexgenVue:Templates.Shared">
	<calc-engine key="Home" configure-ui="false" name="Conduent_Nexgen_Home_SE" result-tabs="RBLHome"></calc-engine>
</rbl-config>

<script>
application.handleEvents(events => {
	events.nestedAppInitialized = nestedApplication => {
		nestedApplication.handleEvents(nestedEvents => {
			nestedEvents.configureUICalculation = async () => {
				await application.apiAsync( "common/qna", { calculationInputs: { iAction: "get-credit-card-info" } } );
				await application.calculateAsync({ iConfigureUI: "1", iDataBind: "1" });
			};
		});
	};
});
</script>
```

#### IKatApp.rendered

**`rendered(initializationErrors: IValidation[] | undefined, application: IKatApp )`**

Triggered after Kaml View has been made visible to the user (will wait for CSS transitions to complete).  If any errors occurred during the `initialized` event, they will be passed through via the `initializationErrors` parameter.

#### IKatApp.nestedAppRendered

**`nestedAppRendered(nestedApplication: IKatApp, initializationErrors: IValidation[] | undefined, hostApplication: IKatApp )`**

This event is triggered after a nested application has been rendered. It for host application to remove any UI blockers that might have been in place during initialization.  If any errors occurred during the nested application's `initialized` event, they will be passed through via the `initializationErrors` parameter.

```html
<script>
application.handleEvents( events => {
	events.nestedAppRendered = () => {
	    application.select(".nestedApp.ui-blocker").remove();
	};
});
</script>
```

#### IKatApp.updateApiOptions

**`updateApiOptions( submitApiOptions: ISubmitApiOptions, endpoint: string, application: IKatApp )`**

This event is triggered during RBLe Framework calculations immediately before submission to RBLe Framework and/or during api endpoint submission immediately before submitting to the Host Environment.  It allows Kaml Views to massage the [`ISubmitApiOptions.configuration`](#isubmitapioptions) or the [`ISubmitApiOptions.inputs`](#icalculationinputs) before being submitted.  Use this method to add custom inputs/tables to the submission that wouldn't normally be processed by the KatApp Framework.

The `endpoint` parameter will contain the endpoint the KatApp Framework is going to submit to.  When processing a RBLe Framework calculation, the url will be the same as [`options.calculationUrl`](#ikatappoptions).

```javascript
application.handleEvents( events => {
	events.updateApiOptions = submitApiOptions => {
		// Create custom coverage table
		var coverageTable = {
			name: "coverage",
			rows: []
		};

		// Loop all inputs that start with iCoverageA- and process them.
		// data-inputname is in form of iCoverageA-id
		// For each input, create a row with id/covered properties
		application
			.selectElements("div[data-inputname^=iCoverageA-]")
			.forEach(element => {
				var id = element.getAttribute("data-inputname").split("-")[1];
				var v = element.classList.contains("active") ? 1 : 0;
				var row = { "id": id, covered: v };
				coverageTable.rows.push(row);
			});

		submitApiOptions.inputs.tables.push(coverageTable);

		submitApiOptions.inputs.iCustomKamlInput = "custom-value";

		// Any other custom properties can be assigned to configuration object that the host environment
		// might be processing (below, Nexgen framework handles cacheRefreshKeys).
		var refreshKeys = [];
		refreshKeys.push("hwCoverages", "hwCoveredDependents");

		if (submitApiOptions.inputs.iConfigureUI == "1") {
			//run once.
			refreshKeys.push("hwEventHistory");
		}

		submitApiOptions.configuration.cacheRefreshKeys = refreshKeys;
	};
});
```

#### IKatApp.calculateStart

**`calculateStart( submitApiOptions: ISubmitApiOptions, application: IKatApp ) => boolean`**

This event is triggered at the start of a RBLe Framework calculation after the `updateApiOptions` has been triggered.  Use this event to perform any actions that need to occur before the calculation is submitted (i.e. custom processing of UI blockers or enabled state of inputs).  If the handler returns `false` or calls `e.preventDefault()`, then the calculation is immediately cancelled and only the `calculateEnd` event will be triggered.

#### IKatApp.inputsCached

**`inputsCached( cachedInputs: ICalculationInputs, application: IKatApp )`**

This event is triggered immediately before inputs are cached to `sessionStorage` (if `options.inputCaching == true`).  It allows Kaml Views to massage the inputs before being cached if needed.

#### IKatApp.resultsProcessing

**`resultsProcessing( results: Array<ITabDef>, inputs: ICalculationInputs, submitApiOptions: ISubmitApiOptions, application: IKatApp )`**

This event is triggered during a RBLe Framework calculation _after a successful calculation_ from the RBLe Framework and _before [KatApp Framework result processing](./KatApp.03.State.md#rble-framework-result-processing-in-katapp-state)_.  This handler allows Kaml Views to manually push 'additional result rows' into a calculation result table.

```javascript
application.configure((config, rbl) => {
	config.events.resultsProcessing = (results, inputs) => {
		// Push 'core' inputs into rbl-value for every CalcEngine if they exist
		// in this global handler instead of requiring *every* CalcEngine to return these.
		rbl.pushTo(results[0], "rbl-value",
			[
				{ "id": "currentPage", "value": inputs.iCurrentPage || "" },
				{ "id": "parentPage", "value": inputs.iParentPage || "" },
				{ "id": "referrerPage", "value": inputs.iReferrer || "" },
				{ "id": "isModal", "value": inputs.iModalApplication || "0" },
				{ "id": "isNested", "value": inputs.iNestedApplication || "0" }
			]
		);
	};
});
```

#### IKatApp.configureUICalculation

**`configureUICalculation( lastCalculation: ILastCalculation, application: IKatApp )`**

This event is triggered during RBLe Framework calculation _after a successful calculation and result processing_ and _only_ for a calculation where `iConfigureUI == "1"`.  The `configureUICalculation` event is a one time calculation event and can be used to finish setting up Kaml View UI where logic is dependent upon the first calculation results being processed.

#### IKatApp.calculation

**`calculation( lastCalculation: ILastCalculation, application: IKatApp )`**

This event is triggered during RBLe Framework calculation _after a successful calculation and result processing_ (even if the calculation has `iConfigureUI == "1"`).  Use this handler to process any additional requirements that may be dependent on calculation results.

Note: If calculation contains 'jwt data updating' instructions all the standard [API Lifecycle events](#api-lifecycle) will occur with the `endpoint` being set to `rble/jwtupdate`.

#### IKatApp.calculationErrors

**`calculationErrors( key: string, exception: Error | undefined, application: IKatApp )`**

This event is triggered during RBLe Framework calculation if an exception happens.  Use this handler to clean up an UI components that may need processing when calculation results are not available.

The `key` parameter can be `SubmitCalculation`, `SubmitCalculation..ConfigureUI`, `ProcessDocGenResults`, or `ProcessDataUpdateResults` to identify which stage of the [calculation lifecycle](#calculation-lifecycle) failed.

Note: If calculation contains 'jwt data updating' instructions and an exception occurs during the processing of those instructions an [`apiFailed`](#ikatappapifailed) event will be triggered in addition to `calculationErrors`.  

#### IKatApp.calculateEnd

**`calculateEnd( application: IKatApp )`**

This event is triggered to signal the 'end' of a RBLe Framework calculation regardless of whether the calculation succeeds, fails, or is cancelled.  Use this event to perform any actions that need to occur after a calculation is completely finished (i.e. UI blockers, processing indicators, etc.).

#### IKatApp.domUpdated

**`domUpdated( elements: Array<HTMLElement>, application: IKatApp )`**

This event is triggered to signal the 'end' of a DOM manipulation due to reactivity ([`v-if`](./KatApp.05.VueDirectives.md#v-if-v-else-v-else-if) or [`v-for`](./KatApp.05.VueDirectives.md#v-for) processed) or after the inital rendering of a KatApp.  Use this event to perform any DOM processing after Vue and the KatApp framework has finished all rendering/manipulations (i.e. attaching events to rendered objects, updating DOM elements that are *not* decorated with @vue:mounted events, etc.).

#### IKatApp.apiStart

**`apiStart( endpoint: string, submitData: ISubmitApiData, trigger: HTMLElement | undefined, apiOptions: IApiOptions, application: IKatApp ) => boolean`**

This event is triggered immediately before submitting the to an api endpoint.  This handler could be used to modify the `submitData` if required.  If the handler returns `false` or calls `e.preventDefault()`, then the api endpoint submission is immediately cancelled.

The `submitData` parameter is the payload that is submitted to the api endpoint and is just a 'reorganization' of existing properties/objects that exist in the KatApp Framework.

```javascript
interface ICalculationInputTableRow extends ITabDefRow {
	index: string;
}
interface ISubmitApiData {
	inputs: ICalculationInputs;
	inputTables?: Array<{ Name: string, Rows: Array<ICalculationInputTableRow>; }>;
	configuration: ISubmitApiConfiguration;
}
```

#### IKatApp.apiComplete

**`apiComplete( endpoint: string, successResponse: IStringAnyIndexer | undefined, trigger: HTMLElement | undefined, apiOptions: IApiOptions, application: IKatApp )`**

This event is triggered upon successful submission and response from the api endpoint that **is not** an endpoint that generates 'file download'.

```javascript
application.handleEvents(events => {
	events.apiComplete = async () => {
		// Recalculate after data has been updated on server, and show the action button to submit CC payment
		await application.calculateAsync();
		application.select(".credit-card-action-button").removeClass("d-none");
	};
});
```

#### IKatApp.apiFailed

**`apiFailed( endpoint: string, errorResponse: IApiErrorResponse, trigger: HTMLElement | undefined, apiOptions: IApiOptions, application: IKatApp )`**

This event is triggered when submission to an api endpoint fails.  The `errorResponse` object will have a `Validations` property that can be examined for more details about the cause of the exception. See [IKatApp.apiAsync](#ikatappapiasync) for more information on the `IApiErrorResponse` interface.

```javascript
application.handleEvents(events => {
	events.apiFailed = endpoint => {
		// Show a save error message if jwt update instructions failed
		if (endpoint == "rble/jwtupdate") {
			application.select(".saveError").show(500).delay(3000).hide(500);
		}
	};
});
```

#### IKatApp.notification

**`notification: (name: string, information: IStringAnyIndexer | undefined, from: IKatApp)`**

The 'notification' delegate is invoked when another KatApp wants to notify this application via the [`notifyAsync`](#ikatappnotifyasync) method.  Usually this is used as a mechanism for nested or modal applications to communicate back to their host application.

**Nested Application Configuration**
```javascript
/** @type {IKatApp} */
var application = KatApp.get('{id}');
application.configure(config => {
	config.handlers.cancel = () => {
		application.options.hostApplication.notifyAsync(
			application,
			"NestedCancelled",
			{ ExtraInfo: "Value" }
		);
	};
});
```

**Host Application Configuration**
```javascript
/** @type {IKatApp} */
var application = KatApp.get('{id}');
application.configure(config => {
	config.events.notification = (name, information) => {
		if ( name == "NestedCancelled" ) {
			console.log(information["ExtraInfo"]);
		}
	};
});
```

#### IKatApp.input

**`input( name: string, calculate: boolean, input: HTMLElement, scope: IKaInputScope | IKaInputGroupScope )`**

This event is triggered whenever a KatApp input has been updated.  It is a 'catch all' event that allows an application to bind a single event handler on the KatApp when all (or almost all inputs) on the page will use the same event handler.  The same goal could be accomplished via a [`IKaInputModel.events.input` delgate](./KatApp.06.CustomDirectives.md#v-ka-input-model).

## IKatAppEventFluentApi

The `IKatAppEventFluentApi` interface is returned when using `application.on()` or `application.off()` methods.  It allows for chaining of the `on` and `off` methods to allow for multiple event handlers to be registered or removed in a single call chain.  It also contains the results of the original `selector` used during the first `on` or `off` call.

Item | Description
---|---|---
`elements` | `Array<T extends HTMLElement>` | The elements matching the original selector of [`on`](#ikatappon) or [`off`](#ikatappoff).  If the elements selected are needed for other actions (i.e. applying styles, attributes, or effects), they can be accessed via this property.
`on` | ( events: string, handler: (e: Event) => void ): IKatAppEventFluentApi` | Registers an event handler for the specified event(s) on all elements matching the original selector.
`off` | ( events: string ): IKatAppEventFluentApi` | Removes all event handlers for the specified event(s) on all elements matching the original selector.


## Supporting Interfaces

In addition to the primary `IKatApp`, `IKatAppEventFluentApi`, and `IKatAppOptions` interfaces, there are supporting interfaces that Kaml View developers will not necessarily declare, but rather are interfaces for properties or parameters on the main interface methods that are used.

### IStringIndexer / IStringAnyIndexer

`IStringIndexer<T>` is internal KatApp Framework type but worth mentioning as it is used in this documentation.  It is synonomous with a C# `Dictionary` object or 'key/value' pair object.  `T` describes the type of *values* stored in the object.  Therefore, `IStringAnyIndexer` is just shorthand for `IStringIndexer<any>`. This class is used to define dynamic objects of unknown property listings.

```javascript
const stringValueObj: IStringIndexer<string> = {};
{
    "PropA": "ValueA", // valid
    "PropB": 123, // invalid
    "PropC": { // invalid
        "PropD": "ValueB"
    }
}

// All property types are valid
const anyValueObj: IStringAnyIndexer = {};
{
    "PropA": "ValueA",
    "PropB": 123,
    "PropC": {
        "PropD": "ValueB",
        "PropE": true
    }
}
```

### IValidation

`IValidation` normally maps to a result row (from `error` or `warning` table) from a calculation, but can also be manually created by the KatApp Framework or Kaml View.

Property | Type | Description
---|---|---
`id` | `string` | The 'id' associated with the validation.  There are three different usage scenarios for `id`.<br/><br/>1. The most common scenario is the name of the input that caused the validation.<br/>2. If the validation is associated with multiple inputs, `id` can be a comma delimited list of input IDs causing the validation.<br/>3. If the validation is **not** associated with a specific input, then any `id` can be used, but ensure that it is unique if at some point filtering to find this validation is required.<br/><br/>If the `id` matches the `name` of an [v-ka-input](./KatApp.06.CustomDirectives.md#v-ka-input) item (or the `name` is one of the comma delimitted items), the `error` or `warning` property of the [v-ka-input Scope](./KatApp.06.CustomDirectives.md#v-ka-input-scope), respectively, will be set to the `text` property.  Additionally, the `error` or `warning` will be automatically removed when the input (or one of the inputs in the comma delimitted items) is updated.
`text` | `string` | The text to display for the validation.
`dependsOn` | `string?` | The 'id' of another input (or comma delimitted list) that this validation depends on.  For example, a radio button list where there are different 'child' inputs displayed based on radio selection.  If the `dependsOn` input is updated, any validations that contain that input ID in the `dependsOn` property will automatically be removed.  This is different from using a comma delimitted list in the `id` property because adding an ID(s) to `dependsOn` will not set the `v-ka-input.error` or `v-ka-input.warning` properties of the associated ID(s).

**Note**: All `errors` and `warnings` are automatically removed when the [application.calculateAsync](#ikatappcalculateasync) method is called or when the [application.apiAsync](#ikatappapiasync) method is called.  This is to ensure that the user is not presented with stale errors/warnings.  They can also be manually removed by simply setting [application.state.errors](./KatApp.03.State.md#istate-properties) or [application.state.warnings](./KatApp.03.State.md#istate-properties) to an empty array.

### INavigationOptions

`INavigationOptions` allows for additional actions to occur during a navigation lifecycle.  The options available are described below.

Property | Type | Description
---|---|---
`inputs` | [`ICalculationInputs`](#icalculationinputs) | If inputs should be passed to the KatApp being navigated to, an `ICalculationInputs` object can be provided.
`persistInputs` | `boolean` | Whether or not to persist the inputs in sessionStorage.  If `true` and the user navigates away from current view and comes back the inputs will automatically be injected into the KatApp.  If `false` and the user navigates away and returns the input values will not longer be present. The default value is `false`.


### ICalculationInputs

`ICalculationInputs` represents an object containing all the inputs that should be sent to a RBL calculation.  Inputs can be passed in during initialization as a property of [`IKatAppOptions`](#ikatappoptions), as a parameter to the [application.calculateAsync](#ikatappcalculateasync) method, or as a model property used by [v-ka-api](./KatApp.06.CustomDirectives.md#v-ka-api), [v-ka-app](./KatApp.06.CustomDirectives.md#v-ka-app), [v-ka-modal](./KatApp.06.CustomDirectives.md#v-ka-modal), or [v-ka-navigate](./KatApp.06.CustomDirectives.md#v-ka-navigate) directives.

Generally speaking, `ICalculationInputs` is a [IStringIndexer&lt;string>](#istringindexer-istringanyindexer) object with key/value items for each inputs.  However, it also contains 'input tables' as well that can only be set via the [`IKatApp.updateApiOptions` event](#ikatappupdateapioptions).  The object can be visualized as follows.

```javascript
{
    // Framework sets this to 1 on Configure UI calc
	"iConfigureUI": "1",
    // Framework sets this to 1 on Configure UI calc
	"iDataBind": "1",
    // Optional; If changing input triggered calculation, this will contain input name
	"iInputTrigger": "iFirstName",
	// Framework sets this to 1 if running via v-ka-app
    "iNestedApplication": "0", 
	// Framework sets this to 1 if running via v-ka-modal
    "iModalApplication": "0", 
	// Only assignable from Kaml Views in updateApiOptions
    "tables": [ 
        {
            "name": "InputTableA",
            "rows": [
                { "key": "A", "value": 1 },
                { "key": "B", "value": 2 }
            ]
        }
    ]
    // The rest of the inputs present on page are added as IStringIndexer<string> properties
    "iPageInput1": "64",
    "iPageInputN": "Conduent"
}
```

**NOTE**: When creating or passing ICalculationInputs, the above javascript object represent the available features.  However, the [state.inputs](./KatApp.03.State.md#istate-properties) has a built in method of `getNumber( inputId: string ) => number | undefined` what will try to parse the input as a number taking the current cultures decimal place separator into account.  If the value cannot be parsed, `undefined` is returned.

#### ICalculationInputs.getNumber

In addition to the storage of inputs and tables, the `ICalculationInputs` object has a built in method called `getNumber`.

**`getNumber(inputId: string): number | undefined`**

You can call this method to automatically convert textual input (including culture specific handling of the decimal place character) into a numeric value if conversion is possible.  If the conversion fails, it returns `undefined`.

#### ICalculationInputs.getOptionText

In addition to the storage of inputs and tables, the `ICalculationInputs` object has a built in method called `getOptionText`.

**`getOptionText(inputId: string): string | undefined`**

You can call this method to automatically retreive the textual value of the selected options in a `<select/>` input.

### ITabDef

`ITabDef` is the object returned from RBLe Framework calculations for each 'result tab' processed. The properties available on this object represent the result tables (`Array<ITabDefRow>`) returned from the CalcEngine tab.

### ITabDefRow

`ITabDefRow` represents each row in a `ITabDef` table returned from a RBLe Framework calculation.  Note that it is simply a shorthand name for the underlying `IStringIndexer<string>` interface since every value returned from the RBLe Framework is typed as a `string`.  If a 'value' needs to be treated as `number` or `date`, the KatApp Framework or Kaml Views will need to first parse it into the appropriate type.

### IResourceStrings

`IResourceStrings` represents the resource strings available for use by the KatApp.  Its structure is dynamic based on the languages supported, but it should have the following pattern.

```javascript
{
    "lang1": {
        "key1": "lang1 key1 string value",
        "key2": "lang1 key2 string value"
    },
    "lang2": {
        "key1": "lang2 key1 string value",
        "key2": "lang2 key2 string value"
    }
}
```

The object can have 0 to N languages it supports and 0 to N 'key/value' translations.

### IManualTabDef

`IManualTabDef` is the object passed in to KatApp Framework if [IKatAppOptions.manualResults](#ikatappoptions) is passed. It can be viewed as an `ITabDef` except there are a few more properties attached to it to help the KatApp Framework index these results.

#### IManualTabDef.@calcEngineKey

Required: `string`; The key of the CalcEngine.  This key will be the key used in Vue directives when access result tables; similar to the [rbl-config/calc-engine/@key](./KatApp.01.GettingStarted.md#configuring-calcengines-and-template-files) property used when configuring KatApp CalcEngines.

#### IManualTabDef.@name

Optional: `string`; The name to use for this result tab.  If `manualResults` has more than one `IManualTabDef`, then Kaml Views will be specifying in Vue directives how to access each specfic tab via the `tab: 'TabName'` property in directive models.

If not provided, a name will be generated with the tab position concatenated with `RBLResult`, i.e. `'RBLResult1'`, `'RBLResult2'`, etc.

### IConfigureOptions

Property | Type | Description
---|---|---
`model` | `any` | Kaml Views can pass in 'custom models' that hold state but are not built from Calculation Results.
`options` | [`IKatAppOptions`](#ikatappoptions) | Kaml Views can provide partial updates to the [`IKatApp.options`](#ikatappoptions) object.  Typically, only inputs or modal templates are updated.
`handlers` | `IHandlers` | Provide an object where each property is a function delegate that can be used with [`v-on`](./KatApp.05.VueDirectives.md#v-on) directives.
`components` | `IStringAnyIndexer` | Provide an object where each property is a Vue component that can be used with [`v-scope`](./KatApp.05.VueDirectives.md) directives.
`directives` | `IStringIndexer<(ctx: DirectiveContext<Element>) => (() => void) \| void>` | Provide an object where each property name is the directive tag name (i.e. `v-*`) and the value is a function delegate that returns a [custom directive](./KatApp.06.CustomDirectives.md#custom-katapp-directives) that can be used in the Kaml View markup.
`events` | [`IKatAppEventsConfiguration`](#ikatappeventsconfiguration) | A `IKatAppEventsConfiguration` object that can have event handler delegates assigned for each supported KatApp event.


```javascript
application.configure(config => {
    config.options = {
        inputs: {
            iApplicationInput: "value1"
        },
        modalAppOptions: {
            headerTemplate: "header"
        }
    };

	config.inputs = {
		iAdditionalInput: "Value"
	};

	config.handlers = {
		cancel: () => {
			console.log("cancelled");
		},
		saveAsync: async () => {
			await application.apiAsync( /* ... */ );
		}
	};

	config.events.initialized = () => {
		console.log("initialized");
	}
});
```

### IModalOptions

The `IModalOptions` parameter passed in to [IKatApp.showModalAsync](#ikatappshowmodalasync) controls how the modal application is built.  The [v-ka-navigate](./KatApp.06.CustomDirectives.md#v-ka-navigate) directive can also create a modal confirmation before allowing the navigation to occur by passing in this object as part of the model.

Property | Type | Description
---|---|---
`view` | `string` | If the content for the modal being displayed is generated from a Kaml View, the name of the Kaml View 'id' should be assigned here.  When present, the KatApp Framework calls the `rble/verify-katapp` endpoint to ensure that the current user has access to the view before returning the content for the view.
`content` | `string` | If the content for the modal being displayed is a HTML fragment confirmation message, the HTML markup can be passed directly as a string versus having to build a Kaml View for simple modal confirmations.
`contentSelector`<sup>1</sup> | `string` | If the content for the modal being displayed is generated by the current application, a DOM element selector string can be passed versus having to build a Kaml View. When `contentSelector` is passed, the KatApp Framework will clone the element's content.  Add the attribute [`v-pre`](./KatApp.05.VueDirectives.md#v-pre) if the modal markup should be reactive.
`configure`<sup>3</sup> | [`IConfigureDelegate`](#ikatappconfigure) | Only applies when `contentSelector` or `content` is used; `showModalAsync` throws if `configure` is combined with `view`.  Runs the delegate against the *modal* application before it is mounted, giving a modal that has no Kaml View of its own a way to supply `model`, `handlers`, `events`, `components`, and `directives`.<br/><br/>See [contentSelector Modals](#contentselector-modals).
`calculateOnConfirm` | `ICalculationInputs \| boolean` | When a modal application is 'confirmed', using the `calculateOnConfirm` property can instruct the KatApp Framework to automatically run a RBLe Framework calculation.<br/><br/>Setting this property to `true` or providing a [`ICalculationInputs`](#icalculationinputs) object will trigger the automatic calculation.
`labels` | `{ title: string?; cancel: string?; continue: string? }` | Provide custom labels to be used when the KatApp framework builds the modal container.<br/><br/>1. `title` can be provided if the modal should display a title. If not provided, no modal header/title will be displayed.<br/>2. `cancel` can provide a label to use for the 'cancel' button.  Default is `Cancel`.<br/>3. `continue` can provide a label to use for the 'continue' button.  Default is `Continue`.
`css` | `{ cancel: string?; continue: string?; modal: string? }` | Provide custom css to be used when the KatApp framework builds the modal container.<br/><br/>1. `cancel` can provide css to apply to the 'cancel' button.  Default is `btn btn-outline-primary`.<br/>2. `continue` can provide css to apply to the 'continue' button.  Default is `btn btn-primary`.<br/>3. `modal` can provide css to apply to the modal container.
`size` | `"xl" \| "lg" \| "md" \| "sm" \| undefined` | By default, if a modal is rendering a Kaml View, the size will be `xl`, otherwise `undefined`.  The modal size is based on the value passed in.  See [Bootstrap Modal Sizes](https://getbootstrap.com/docs/5.0/components/modal/#optional-sizes) for more information.
`scrollable` | `boolean` | By default, modal content will not be scrollable; only the *entire* modal dialogis scrollable.  If a modal dialog should have its own vertical scrollbar for its body/content, pass `true`.
`showCancel` | `boolean` | By default, a modal shows both a 'continue' *and* a 'cancel' button.  If the displayed dialog only needs a 'continue' (i.e. confirming a transactional result message), set this value to `false` to hide the 'cancel' button.
`showTitle` | `boolean` | By default, a modal shows a `modal-header` title if the `labels.title` is provided and that title is also used as the `aria-labelledby` property of the modal.  If you want to hide the title but provide a 'aria-label', set this value to `false` provide a valid `labels.title`.  **Note**: If `headerTemplate` is provided, and you want the `aria-labelledby` to function properly, you'll need an element with an id of `kaModalLabel-{this.id}` (where `this.id` is ID of the modal application).
`allowKeyboardDismiss` | `boolean` | By default, a modal supports 'keyboard dismissal' by pressing the `ESC` key and rendering a 'X' in the upper right corner of the modal header.  If the modal should not be dismissed by the keyboard or the 'X', set this value to `false`.
`inputs` | [`ICalculationInputs`](#icalculationinputs) | If inputs should be passed to the modal's rendered Kaml View, provide a `ICalculationInputs` object.
`buttonsTemplate`<sup>2</sup> | `string` | By default, KatApp modals will generate a 'continue' and 'cancel' button that are always visible and simply return a `boolean` value indicating whether or not a modal was confirmed.<br/><br/>If a modal is more complex with various stages that influence the behavior (visibility or functionality) of the modal buttons, a template ID can be provided.<br/><br/>See [IModalOptions Template Samples](#imodaloptions-template-samples) for more information.
`headerTemplate` | `string` | By default, KatApp modals simply use the `labels.title` string property to display a 'modal header'.<br/><br/>If a modal is more complex and the header is more than just a text label (i.e. links or inputs), a template ID can be provided as the content to be rendered inside the header.<br/><br/>See [IModalOptions Template Samples](#imodaloptions-template-samples) for more information.

<sup>1</sup> When the `contentSelector` property is provided, but you still want to be able to use Vue directives (especially reactivity and events) in the modal dialog, you can decorate the element matched by `contentSelector` with the Vue directive of [`v-pre`](./KatApp.05.VueDirectives.md#v-pre).  This results in none of the Vue/KatApp directives processing until the modal is actually displayed.  When the modal starts, it will receive a clone of the host application's `rbl`, `model`, and `handlers` objects.<br/><br/>The value of the attribute selects *which* state the modal starts with; `v-pre="selector"` clones from the named application instead of the host, and `v-pre="false"` clones nothing.  See [contentSelector Modals](#contentselector-modals).

<sup>2</sup> When creating your own buttons for a modal application, it is best practice to always apply a `cancelButton` and `continueButton` class to the appropriate buttons as the KatApp framework first tries to trigger a `click` event on those buttons when the `X` in the header is clicked or `ESC` is pressed.  `cancelButton` is clicked if `showCancel` was set to true otherwise `continueButton` is clicked. If additional processing other than simply calling the [`IModalAppOptions.cancelled` or `IModalAppOptions.confirmedAsync` delegates](#imodalappoptions), make sure to apply those buttons.  If the custom toolbar *only* provides a single 'close' button, both classes can be assigned to the button to ensure that it is triggered, this eliminates the need for the caller of the modal to know the internal logic of the buttons and does not need to 'correctly' pass the `showCancel` property.

<sup>3</sup> `configure` supplies the handlers a `contentSelector` modal starts with; the [`v-pre`](./KatApp.05.VueDirectives.md#v-pre) attribute value supplies the state.  See [contentSelector Modals](#contentselector-modals).

#### contentSelector Modals

A `contentSelector` modal has no Kaml View, and therefore no `.kaml.js` file in which to call `application.configure()`.  The [`v-pre`](./KatApp.05.VueDirectives.md#v-pre) attribute value and the `configure` property supply the two things that script would normally have provided; state and handlers.

**How the content is processed.** The element matched by `contentSelector` is *cloned* — the original stays in the host's DOM, so keep it hidden — and the clone is appended to the modal's `.modal-body`.  Without `v-pre`, the host application has already processed the directives inside that element before the clone is taken, so the modal gets inert markup.  Decorating the element with `v-pre` defers all Vue/KatApp directive processing until the modal application mounts, which is what lets the modal own its own inputs, events, and button templates.

**State: the `v-pre` value.** A bare `v-pre` clones the host application's `rbl`, `model`, and `handlers` into the modal.  That is the right default when the modal is a reactive view over data the host already calculated.  It is the wrong default when the modal only needs an input and a button, because:

1. The clone is a snapshot taken at mount; nothing written to the modal's `model` reaches the host.
1. The cost of the clone is proportional to the size of the host's `model` and `rbl.results`.

`v-pre="false"` opts out.  The modal still defers directive processing, but starts with an empty `rbl`, `model`, and `handlers`, and the host remains reachable via `application.options.hostApplication.state.*`.  `v-pre="selector"` is the third form; it clones from the named application instead of the host.

Because this is markup rather than an option passed to `showModalAsync`, the decision travels with the content it applies to, and the same element behaves identically no matter which handler opens it.

**Handlers: the `configure` property.** With `v-pre="false"` the modal has no handlers, so its buttons have nothing to call.  `configure` accepts the same delegate as [`IKatApp.configure`](#ikatappconfigure) and the KatApp Framework applies it to the modal application after it is constructed and before it is mounted.

Use the delegate's sixth parameter — the modal application — for anything scoped to the modal.  The `application` variable closed over from the host Kaml View's script still refers to the **host**, and the host cannot see the modal's inputs or validations and has no `modalAppOptions` of its own.

Sample markup in the host Kaml View.  The wrapper is hidden with `d-none` because the original element remains in the host DOM, and `v-pre="false"` keeps everything inside it — including the buttons template — unprocessed until the modal mounts, without cloning any host state:

```html
<div class="generate-request-modal d-none" v-pre="false">
	<template id="generate-request-modal-buttons">
		<button 
			type="button" 
			@click="modalAppOptions.cancelled" 
			:class="['cancelButton', modalAppOptions.css.cancel]">Cancel</button>
		<button 
			type="button" 
			@click="handlers.confirmGenerateRequestAsync" 
			:class="['continueButton', modalAppOptions.css.continue]">Generate</button>
	</template>

	<div v-ka-input="{ name: 'iWorksheetName', template: 'input-textbox', label: 'Worksheet Name' }"></div>
</div>
```

Sample handler in the host Kaml View's script:

```javascript
const response = await application.showModalAsync({
	contentSelector: ".generate-request-modal",
	buttonsTemplate: "generate-request-modal-buttons",
	labels: { title: "Generate Worksheet" },
	size: "sm",
	configure: (config, rbl, model, inputs, handlers, modalApplication) => {
		config.handlers = {
			confirmGenerateRequestAsync: async () => {
				// 'modalApplication', not 'application'; the input and the validation
				// both belong to the modal.
				modalApplication.clearValidations();

				const name = modalApplication.getInputValue("iWorksheetName");

				if (!name) {
					modalApplication.addError("iWorksheetName", "Worksheet Name is required.");
					return;
				}

				await modalApplication.options.modalAppOptions.confirmedAsync({ name });
			}
		};
	}
});

if (response.confirmed) {
	// Whatever was passed to confirmedAsync above.
	console.log(response.data.name);
}
```

Notes:

1. `configure` and `view` are mutually exclusive.  A Kaml View calls `application.configure()` in its own script during mount, and that call would replace anything passed here, so `showModalAsync` throws instead of silently discarding it.
1. `config.model`, `config.events`, `config.components`, and `config.directives` work exactly as they do in a Kaml View — see [`IConfigureOptions`](#iconfigureoptions).
1. Applying `cancelButton` and `continueButton` classes in a custom `buttonsTemplate` is best practice; see footnote 2 above.

#### IModalOptions Template Samples

Normally, only the Kaml View itself, being displayed as a modal, knows whether or not a `buttonsTemplate` or `headerTemplate` template ID should be returned.  Therefore, this property can only be set when the modal is initiated and [application.update](#iconfigureoptions) is called.

```javascript
(function () {
    var application = KatApp.get('{id}');
    application.update(
        {
            options: {
                modalAppOptions: {
                    headerTemplate: "header",
                    buttonsTemplate: "buttons"
                }
            }
        }
    );
)();
```

Sample template rendering buttons:

1. All Vue directives inside the temlpate have access to application state as normal.
1. The ['modalAppOptions' object](#imodalappoptions) in scope will be valid.
1. Use the 'cancelled' and 'confirmedAsync' methods off of the modalAppOptions object to 'cancel' or 'confirm' the modal.
1. Can use the 'css' and 'labels' properties of modalAppOptions to assign values based options passed in when displaying the modal

```html
<template id="buttons">
	<button 
        type="button" 
        @click="modalAppOptions.cancelled" 
        :class="modalAppOptions.css.cancel" 
        aria-hidden="true">{{modalAppOptions.labels.cancel}}</button>
	<button 
        type="button" 
        @click="modalAppOptions.confirmedAsync" 
        :class="modalAppOptions.css.continue">{{modalAppOptions.labels.continue}}</button>
</template>
 
 <template id="header">
	<div class="row w-100">
		<div class="col-6">
			<div class="form-floating">
				<select class="form-select" id="floatingSelect">
					<option selected>Select</option>
                    <option>July 1, 2017</option>
                    <option>June 1, 2017</option>
				</select>
				<label for="floatingSelect">Pension Check for</label>
			</div>
		</div>
		<div class="col-6 text-end">
			<button
                @click="handlers.downloadDetails" 
                class="btn btn-outline-primary btn-sm me-4" type="button">
                <span class="glyphicons glyphicons-download-alt"></span> Download / Print
            </button>
			<button 
                @click="modalAppOptions.cancelled" 
                type="button" class="btn-close pe-0" 
                aria-label="Close"></button>
		</div>
	</div>
</template>
```

### IModalResponse

When a modal is dismissed (either via confirming or cancelling) a response is sent back to the caller.

Property | Type | Description
---|---|---
`confirmed` | `boolean` | Whether or not the dialog was 'confirmed' or 'cancelled'.
`response` | `any \| undefined` | If a modal application returns a custom response via the `IModalAppOptions.confirmedAsync` or `IModalAppOptions.cancelled` callbacks, the object will be available here.
`modalApp` | [`IKatApp`](#ikatapp) | A reference to the modal KatApp in case the caller needs access to anything present in the KatApp's [state](./KatApp.03.State.md#istate).

### IModalAppOptions

`IModalAppOptions` is a superset of [`IModallOptions`](#imodaloptions) interface.  `IModalOptions` is the parameter passed into [application.showModalAsync](#ikatappshowmodalasync) or the [v-ka-modal](./KatApp.06.CustomDirectives.md#v-ka-modal) directive, while `IModalAppOptions` simply extends this object to pass in a few other properties that are made available to the Kaml View.  

This `IModalAppOptions` object is accessible via two different methods.  Within the templates used to render the 'header' or the 'buttons', there is a `modalAppOptions` available in the current scope.  Everywhere else, when access is needed, the options can be accessed via `application.options.modalAppOptions`.

Property | Type | Description
---|---|---
`confirmedAsync` | `(response?: any) => Promise<void>` | Use the `confirmedAsync` property to access a method the KatApp Framework injected for use to indicate when a modal has been 'confirmed'.  See [IModalAppOptions confirmedAsync Sample](#imodalappoptions-confirmedasync-sample) for more information.
`cancelled` | `(response?: any) => void` | Use the `cancelled` property to access a method the KatApp Framework injected for use to indicate when a modal has been 'cancelled'.<br/><br/>Optionally, a response object can be returned as well.  See [IModalAppOptions confirmedAsync Sample](#imodalappoptions-confirmedasync-sample) for sample on how to call helper methods on `modalAppOptions`.
`closeButtonTrigger` | `string` | By default, when a modal application is displayed and there is a [`title`](#imodaloptions) provided, the modal allows the user to press `ESC` or click a dismissable `X` close button to close the dialog.  When this occurs, the [`cancelled`](#imodalappoptions) method is called. If the modal application state requires different behavior to occur, a selector string can be provided and the KatApp framework will click this element inside if a valid element is returned from `application.selectElement`.<br/><br/>Examples:<br/>1. A modal application has worked its way through 'steps', completed its function, and has arrived at the final 'confirm' step and is only presenting an 'OK' button to close the dialog and indicate 'confirmed' to the host application.  At this point, the modal application would want to assign `closeButtonTrigger` to a selector that would trigger clicking the 'OK' button.<br/>2. A modal has a primary function (i.e. selecting beneficiaries), but supports a secondary function (i.e. creating a new beneficiary on the fly) simply by changing its UI.  Dismissing the 'secondary' function via `ESC` or the `X` close button should only dismiss the secondary function and return to the primary function.  When displaying the secondary function UI, the modal application should assign the `closeButtonTrigger` and then clear it out when the secondary UI is hidden.
`triggerLink` | `HTMLElement?` | Read Only;  If the current modal application was launched via a [`v-ka-modal`](./KatApp.06.CustomDirectives.md#v-ka-modal) link, the `trigger` property will be set to this element.  This would allow the Kaml View acting as the modal to inspect information that may have been placed on the 'trigger link' (i.e. `data-*` attributes) to provide additional information internal to the sites overall functionality.

#### IModalAppOptions confirmedAsync Sample

When calling `confirmedAsync`, a response object can be returned as well.  Assuming the following 'buttons' template was in use:

```html
<template id="buttons">
	<button 
        type="button" 
        @click="handlers.submitAsync" 
        :class="modalAppOptions.css.continue">Submit</button>
</template>
```

The following javascript would indicate to use this template along with providing a handler for the 'Submit' button returning an api response as part of the modal confirmation.

```javascript
(function () {
    var application = KatApp.get('{id}');
    application.update(
        {
            options: {
                modalAppOptions: {
                    buttonsTemplate: "button"
                }
            },
            handlers: {
                submitAsync: async () => {
                    const resopnse = 
                        await application.apiAsync( 
                            /* options here for a valid api */ 
                        );
                    
                    await application.options.modalAppOptions
                        .confirmedAsync(response);
                }
            }
        }
    );
)();
```

### ISubmitApiConfiguration

The payload representing the current configuration to submit to either a RBLe Framework calculation or a api endpoint in the Host Application.

Property | Type | Description
---|---|---
`token` | `string` | If the data used in RBLe Framework calculations was 'registered' with the RBLe Framework web service, this is the token returned uniquely identifying the user's transaction package.
`testCE` | `boolean` | Whether or not the RBLe Framework should use the 'test' CalcEngine when running the calculation.
`authID` | `string | Used in non-session version, when options has a 'data' property of json formatted xDS Data.
`client` | `string` | A `string` value representing a 'client name' used during the calculation for logging purposes.
`adminAuthID` | `string` | If an admin user is impersonating a normal user during the execution of the Kaml View, this value should contain the ID of the admin user to indicate to CalcEngine(s) that an admin user is initiating the calculation.
`currentPage` | `string` | The name of the current page as it is known in the Host Environment. This value is determined from the [`options.currentPage'](#ikatappoptions) property.
`requestIP` | `string` | The IP address of the browser running the current KatApp. This value is determined from the [`options.requestIP'](#ikatappoptions) property.
`currentUICulture` | `string` | The current culture as it is known in the Host Environment. This value is determined from the [`options.currentUICulture'](#ikatappoptions) property.
`environment` | `string` | The name of the current environment as it is known in the Host Environment. This value is determined from the [`options.environment'](#ikatappoptions) property.
`nextCalculation` | `INextCalculation` | Whether or not the RBLe Framework should provide diagnostic trace, list of secure file location folders to save a debug copy of the CalcEngine(s) used during the calculation, or force CalcEngine cache to expire.  See [INextCalculation](#inextcalculation) for more information.
`allowLogging` | `boolean` | Whether or not the calculation should be logged in backend monitoring systems.  Usually set to `false` after the first page calculation has finished.

### INextCalculation

The `INextCalculation` interface represents the information that enables developer diagnostics to occur.  The properties can be set via [debugNext()](#ikatappdebugnext).

Property | Type | Description
---|---|---
`expireCache` | `boolean` | Whether or not to expire CalcEngine cache and check KAT Data Store for new version.
`trace` | `boolean` | Whether or not to generate diagnostic trace during the next calculation.
`saveLocations` | `{ location: string, serverSideOnly: boolean }[]` | The locations to save debug CalcEngines to used during the next Calculation.  `serverSideOnly` will only save CalcEngines processed during an API endpoint call.

### ISubmitApiOptions

The `ISubmitApiOptions` interface represents the information that creates an api submission payload.

Property | Type | Description
---|---|---
`inputs` | [`ICalculationInputs`](#icalculationinputs) | The list of inputs to submit to the api endpoint (usually used in a `iValidate="1"` calculation in the Host Environment).
`configuration` | `IStringIndexer<string>` | Any custom configuration settings to pass to the Host Environment. The most common property set is the `configuration.cacheRefreshKeys: Array<string>` property.

### IApiOptions

The `IApiOptions` interface represents the configuration to use when submitting to an api endpoint.

Property | Type | Description
---|---|---
`calculationInputs` | [`ICalculationInputs`](#icalculationinputs) | Often when an api endpoint is submitted to in a Host Environment that leverages the RBLe Framework, an `iValidate=1` RBL calculation is the first action performed on the server.  This calculation can do UI validations or provide instructions to the Host Environment on what type of actions it should take.  All the inputs from the UI are always submit, but if additional inputs should be passed to the endpoint, an `ICalculationInputs` object can be provided.
`apiParameters` | `IStringAnyIndexer` | Some endpoints require parameters that are processed in the server code of the Host Environment.  These parameters are technically not different from `ICalculationInputs`, but providing them as a second parameter accomplishes a few things<br/><br/>1. The value type of each parameter can be more than just `string`, supporting `boolean`, `number` or a nested object with its own properties.<br/>2. If all the parameters are of type `string`, even though technically not different from the `calculationInputs` property, using `apiParameters` eliminates parameters from being passed to a RBL calculation.<br/>3. Finally, it simply segregates 'intent' of the parameters versus the inputs.  Parameters are intended to be used by the api endpoint server code while inputs are intended to be used by the RBL calculation.
`isDownload` | `boolean` | If the api endpoint being posted to will return binary content representing a download, setting this flag to true tells the KatApp framework to process the results differently and save the generated content as a downloaded .
`calculateOnSuccess` | `boolean \| ICalculationInputs` | If after a successful submission to an api endpoint, the KatApp Framework should automatically trigger a RBLe Framework Calculation, `calculateOnSuccess` can be set.  Setting the value to `true` indicates that a calculation should occur.  Setting the value to a `ICalculationInputs` object also indicates that a calculation should occur and additionally pass along the inputs provided.
`files` | [`FileList`](https://developer.mozilla.org/en-US/docs/Web/API/FileList) | If the api endpoint being submitted to accepts file uploads, this property can be set (usually from a `input type="file"` element).

### ILastCalculation

The `ILastCalculation` interface represents a snapshot of the most recent calculation.

Property | Type | Description
---|---|---
`inputs` | [`ICalculationInputs`](#icalculationinputs) | The list of inputs submitted to the most recent calculation.
`results` | `Array<ITabDef>` |The array of [`ITabDef`s](#itabdef) returned from the most recent calculation.
`configuration` | [`ISubmitApiConfiguration`](#isubmitapiconfiguration) | The configuration payload submitted to the most recent calculation.



