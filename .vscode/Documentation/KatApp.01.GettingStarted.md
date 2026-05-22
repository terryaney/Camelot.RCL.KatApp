> This file is a focused section of KatApp documentation.
> Use [KatApp.md](./KatApp.md) for the index.

# Getting Started

## Setting Up Developer Environment

Create node.js Application to run application locally

1. Clone repository and open the folder in Visual Studio Code
1. Download Node.js from https://nodejs.org/en/download/ (one time to get *npm* installed)
1. From `src` folder, run `npm install`
1. Should be able build typescript via `CTRL-P`, then type `Task Typescript RCL KatApp` to build typescript, minifiy js, create KatApp.d.ts and copy assests to the `test/wwwroot` folder as well.

## Definitions

There are many terms and concepts that will be discussed in this document.  The most important ones to understand before continuing are listed below.

Term | Definition
---|---
KatApp | Dynamic webpage content driven by client server communication via `fetch` api, using Kaml Views, RBLe Service, and Vue directives.
Kaml View | A _KatApp Markup Language_ file is a combination of RBL Configuration, HTML, CSS, and Javascript where the HTML supports Vue directives to leaverage CalcEngine results to produce presentation markup.
RBLe Framework | Rapid Business Logic (evolved) calcuation service.  Driven by CalcEngine files which contains all of the business logic.
CalcEngine | Specialized Excel speadsheet that drives business logic.
RBLe Results | Calculation results from RBLe Service (stored in KatApp state for use via Vue directives).
KatApp element | The HTML element that is target/container for the KatApp.  Example: `<div id="KatApp"></div>`
Vue Directive | Special attributes indicating that the attribute content should be processed by Vue and its rendering engine. 
Host Platform | Web Application hosting the KatApp.
KAT CMS | System for updating CalcEngines and Kaml Views when Kaml files are not hosted directly by Host Platform.
Kaml&nbsp;Template&nbsp;Files | Kaml file containing *only* templates, css, and javascript for generating common markup/controls used in KatApp's.  Kaml Template Files are never the 'main view' of a KatApp.
Template | A reuseable piece of a markup found in Kaml Template file.

## Vue Support

The documentation for [standard Vue](https://vuejs.org/) and [petite-vue](https://github.com/vuejs/petite-vue) are both extensive and helpful, but for the most part, 'coding' of Vue objects is handled in the KatApp framework while rendering markup with 'Vue Directives' is the primary interaction Kaml Views will have with Vue.  The most important documentation page for understanding how to leverage Vue can be found on the [Built In Directives](https://vuejs.org/api/built-in-directives.html) page.

### Vue Directives

Below are the ways to indicate to Vue that attributes should be 'processed'.  When attributes are processed, for the most part, the contents of the attribute (or `{{ }}`) is simply a javascript expression that will be processed via `eval()`.  When the expression is evaluated, it is also passed in the current *scope* known to Vue as well, so you have access to both [KatApp State](./KatApp.State.md#katapp-state) and any *scope variables* created from containing `v-for` directives.

Markup | Definition
---|---
`v-*` Attribute | Indicates to process in-built Vue directives. petite-vue supports the following [Vue directives](https://github.com/vuejs/petite-vue#vue-compatible).
`v-ka-` Attribute | Indicates to process [custom KatApp directives](./KatApp.06.CustomDirectives.md#custom-katapp-directives).
Attribute starts with `:` | Shorthand for Vue `v-bind` directive indicating that the attribute content should be processed by Vue.
Attribute starts with `@` | Shorthand for Vue `v-on` directive for attaching events to HTML elements.
Html element contains `{{ }}` | Shorthand for Vue `v-text` directive to sent element's `innerText` value (note, you need to use `v-html` directive if your expression generates HTML markup).

See [Common Vue Directives](./KatApp.05.VueDirectives.md#common-vue-directives) and [Custom KatApp Directives](./KatApp.06.CustomDirectives.md#custom-katapp-directives) for more information.

## Required Javascript Libraries

Below are the libraries required or used by KatApp framework.

- petite-vue.js - Required [library](https://unpkg.com/petite-vue) to enable Vue processing and other functionality internal to KatApp framework.
- bootstrap.js - Required to support [Modals](https://getbootstrap.com/docs/5.3/components/modal/), [Popovers](https://getbootstrap.com/docs/5.3/components/popovers/) and [Tooltips](https://getbootstrap.com/docs/5.3/components/tooltips/).
- highcharts.js - Optional, if `v-ka-highchart` directive is leveraged, to support building [Highcharts](https://api.highcharts.com/highcharts/) from CalcEngine results.


# Initializing and Configuring a KatApp

To initiate a KatApp, options are provided via a configuration object passed on the [`KatApp.createAppAsync()`](./KatApp.07.Api.md#katappcreateappasync) method. In the sample below, minimal options are shown. See [IKatAppOptions](./KatApp.07.Api.md#ikatappoptions) for all available options.

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
	try
	{
		await KatApp.createAppAsync( '.katapp', { "view": "Nexgen:Channel.Home" } );
	}
	catch( ex )
	{
		console.error({ex});
	}
});
```

## Configuring CalcEngines and Template Files

Inside each Kaml View file is a required `<rbl-config>` element; This should be the first element in any Kaml View file. It controls which CalcEngine(s) are used (if any) and which templates are required for this view (if any).

```html
<!-- A Kaml View that uses no CalcEngines -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates"></rbl-config>

<!-- One CalcEngine using default RBLInput and RBLResult tabs -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
	<calc-engine key="default" name="LAW_Wealth_CE"></calc-engine>
</rbl-config>

<!-- One CalcEngine with Custom Tabs -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
	<calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInputWealth" result-tabs="RBLResultWealth"></calc-engine>
</rbl-config>

<!-- Multiple CalcEngines -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
	<calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInput" result-tabs="RBLResult"></calc-engine>
	<calc-engine key="shared" name="LAW_Shared_CE" input-tab="RBLInput" result-tabs="RBLResult,RBLHelpers"></calc-engine>
</rbl-config>
```

When multiple CalcEngines or result tabs are used, additional information can be required to specify the appropriate results. See the [`rbl.source()`](./KatApp.State.md#istaterblsource) method for more information on how the appropriate CalcEngine/Tab name combination is determined when specifying non-default CalcEngine results and how they are used in the [`rbl.exists()`](./KatApp.State.md#istaterblexists), [`rbl.boolean()`](./KatApp.State.md#istaterblboolean), [`rbl.value()`](./KatApp.State.md#istaterblvalue), and [`rbl.number()`](./KatApp.State.md#istaterblnumber) methods and the [v-ka-value](./KatApp.06.CustomDirectives.md#v-ka-value), [v-ka-table](./KatApp.06.CustomDirectives.md#v-ka-table), [v-ka-chart](./KatApp.06.CustomDirectives.md#v-ka-chart), and [v-ka-highchart](./KatApp.06.CustomDirectives.md#v-ka-highchart) directives.

**Important** - Whenever multiple CalcEngines are used, you must provide a `key` attribute; minimally on CalcEngines 2...N, but ideally on all of them.  Note that the first CalcEngine will be assigned a key value of `default` if no `key` is provided.

Entity | Description
---|---
templates | Attribute; Comma delimitted list of Kaml Template Files required by this Kaml View.  Each template is specified in Folder:FileName syntax.
local-kaml-package | Attribute; When a Kaml file has been broken into individual files to be packaged up as a single Kaml file when requested, if a developer is working in [debugResourcesDomain](./KatApp.07.Api.md#ikatappdebugoptions) mode, to minimize the noise of 404 errors present in the browser console, the supporting file types to process must be specified as a comma delimitted list. The available types are `js` (file for Kaml javascript), `css` (file for Kaml CSS), `templates` (file for Kaml templates), or `template.items` (process all templates in file looking for `script`, `script.setup`, or `css` attributes which point to a supporting file). Note: Since `Template.*` files do not require a `rbl-config` element, they are always processed looking for supporting file attributes when requested.
calc&#x2011;engine | Element; If one or more CalcEngines are used in Kaml View, specify each one via a `calc-engine` element.
key | Attribute; When more than one CalcEngine is provided (or if you need to access [Manual Results](./KatApp.07.Api.md#imanualtabdef)), a CalcEngine is referenced by this key; usually via a `ce` property passed into a Vue directive.
name | Attribute; The name of the CalcEngine. [Input Token Substition](#input-token-substition) is supported.
input&#x2011;tab | Attribute; The name of the tab where KatApp framework should inject inputs. Default is `RBLInput`.
result&#x2011;tabs | Attribute; Comma delimitted list of result tabs to process during RBLe Calculation. When more than one result tab is provided, the tab is referenced by name; usually via a `tab` property passed into a Vue directive. Default is `RBLResult`. [Input Token Substition](#input-token-substition) is supported.
configure&#x2011;ui | Attribute; Whether or not this CalcEngine should run during the Kaml View's original [Configure UI Calculation](./KatApp.07.Api.md#ikatappconfigureuicalculation). Default is `true`.
enabled | Attribute; Whether or not this CalcEngine should run during calculation processing. Default is `true`. [Input Token Substition](#input-token-substition) and [Attribute Evaluation](#attribute-evaluation) are supported.
pipeline | Element; Optional 'CalcEngines' to use in a [Calculation Pipeline](RBLe/CalcEngines.md#calculation-pipelines) for the current CalcEngine. Only the `name`, `input-tab`, and `result-tab` (**note singlular name**) attributes are supported. By default, if only a `name` is provided, the input and the (first) result tab with the *same* name as the tabs configured on the primary CalcEngine will be used.
pipeline-during-api | Attribute; If set to `true`, the CalcEngines specified in the `pipeline` element will run during API calls as well (instead of only interactive calculations).  Default is `false`.

### Input Token Substition

If the application is given [inputs](./KatApp.07.Api.md#ikatappoptions), those input values can be used via subsitution tokens. In the sample below, the `iSiteKey` input passed during initialization is substituted into the `result-tabs` attribute.

```html
<rbl-config templates="Nexgen:Templates/Shared,Nexgen:Templates/Inputs" local-kaml-package="js">
	<calc-engine key="Messages" name="Conduent_Nexgen_Message_SE" result-tabs="RBLMessages,{iSiteKey}Messages"></calc-engine>
</rbl-config>
```

### Attribute Evaluation

Some attributes can be evaluated to generate a 'string' value and are usually used in conjunction with [Input Token Substition](#input-token-substition). To enable attribute evaluation, the attribute value must start with `!!` followed by the string expression to evaluate. In the sample below, the `iApiDomain` input passed during initialization is used in an expression to determine if the CalcEngine should be enabled.

```html
<rbl-config templates="Nexgen:Templates/Shared,Nexgen:Templates/Inputs" local-kaml-package="js">
	<calc-engine key="Home" name="Conduent_Nexgen_Home_SE" result-tabs="RBLHome"></calc-engine>

	<calc-engine key="Pension" name="Conduent_Nexgen_DBC_SE" enabled="!!'{iApiDomain}'.split(',').includes('db') ? 'true' : 'false'"></calc-engine>
	<calc-engine key="RetPlanning" name="Conduent_Nexgen_Sharkfin_SE" enabled="!!'{iApiDomain}'.split(',').includes('db') ? 'true' : 'false'"></calc-engine>
</rbl-config>
```