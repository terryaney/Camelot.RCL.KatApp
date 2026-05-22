> This file is a focused section of KatApp documentation.
> Use [KatApp.md](./KatApp.md) for the index.

# KatApp State

When Vue applications are created (which is done behind the scenes in the KatApp framework), they are passed a 'model' which is the 'parent scope' for all Vue directives.  The KatApp framework passes in a IState model which is described below.  All properties and methods of this model can be used directly in Vue directives.

**This is probably the most important section of documentation since this object is used most often in the Vue directives used by Kaml Views when rendering pages.**

- [IState](#istate) - The 'state model' used in all Vue directives.
- [RBLe Framework Result Processing in KatApp State](#rble-framework-result-processing-in-katapp-state) - Describes how RBLe Framework calculation results are turned into 'state model' results.

## IState

The `IState` interface represents the 'scope' that is passed in to all KatApp Framework Vue enabled applications. Any of the property types below that are not primitive types (i.e. `string`, `boolean`, `any`, etc.) are explained in more detail in the [Supporting Interfaces](./KatApp.07.Api.md#supporting-interfaces) section. 

It is vital to understand the properties and methods of this interface for Kaml View developers.

This 'scope' object will be accessed in both [Vue directives](./KatApp.05.VueDirectives.md#common-vue-directives) and in Kaml View javascript.  However, the method of accessing properties and methods is slightly different based on the context.

```html
<!-- 
In Vue directives, access the properties/methods 'directly' given 
that the 'scope' for Vue directives is the IState object.
-->
<div v-html="rbl.value('name-first')"></div>
```

```javascript
/*
In Kaml View javascript, since there is no concept of 'Vue scope', 
the javascript needs to access the properties/methods through the
application.state object.
*/
const nameFirst = application.state.rbl.value("name-first");
```

### IState Properties

Property | Type | Description
---|---|---
`kaId` | `string` | Current id of the running KatApp.  Typically only used in Template Files when a unique id is required.  If a template is rendered more than one time on a page, use [`$renderId`](./KatApp.04.TemplateElements.md#template-script-and-style-tags) instead as it provides a unique id for each template render.
`lastInputChange` | `number` | Automatically maintained by the KatApp framework.  Every time *any* input changes (changing a dropdown, typing a character in text input, etc.), this value is updated with a new timestamp. Allows for reactive v-effect statements without hooking up an [`IKatAppEventsConfiguration.input`](./KatApp.07.Api.md#ikatappeventsconfiguration) event. 
`isDirty` | `boolean \| undefined` | Indicates whether the current KatApp is considered 'dirty' overall.  If the value is set to `undefined`, the value returned is simply the state of the `inputsChanged` property.  If set to a `boolean` value, it will return that value as a manually set flag.  By default, the value is set to `false`, so the KatApp host must set it to `undefined` if they want `inputsChanged` to indicate application dirty state.  If the value is set to `false`, `inputsChanged` is automatically set to `false` as well.  Host application must set to `false` after any action/api that has 'saved' inputs.
`inputsChanged` | `boolean` | Indicates if any v-ka-input has changed since the KatApp has been rendered.  Allows for host application to prompt about changes before navigation or actions if necessary.  Host application must set to `false` after any action/api that has 'saved' inputs. 
`uiBlocked` | `boolean` | Returns `true` when a RBL Calculation or Api Endpoint is being processed.  See [`IKatApp.blockUI`](./KatApp.07.Api.md#ikatappblockui) and [`IKatApp.unblockUI`](./KatApp.07.Api.md#ikatappunblockui) for more information. Typically used to show a 'blocker' on the rendered HTML to prevent the user from clicking anywhere.
`needsCalculation` | `boolean` | Returns `true` when input that will trigger a calculation has been edited but has not triggered a calculation yet.  Typically used with [`v-ka-needs-calc`](./KatApp.06.CustomDirectives.md#v-ka-needs-calc) directive which toggles 'submit button' state to indicate to the user that a calculation is needed before they can submit the current form.
`model` | `any` | Kaml Views can pass in 'custom models' that hold state but are not built from Calculation Results. See [`IKatApp.update`](./KatApp.07.Api.md#iconfigureoptions) for more information.
`handlers` | `IStringAnyIndexer` | Kaml Views can pass in event handlers that can be bound via @event syntax (i.e. `@click="handlers.foo"`). See [`IKatApp.update`](./KatApp.07.Api.md#iconfigureoptions) for more information.
`components` | `IStringIndexer<IStringAnyIndexer>` | Kaml Views can pass in petite-vue components that can used in v-scope directives (i.e. v-scope="components.inputComponent({})"). See [`IKatApp.update`](./KatApp.07.Api.md#iconfigureoptions) for more information.
`inputs` | [`ICalculationInputs`](./KatApp.07.Api.md#icalculationinputs) | Inputs to pass along to each calculation during life span of KatApp.  See ICalculationInputs for more detail the the built in `getNumber()` and `getOptionText()` methods.
`errors` | [`Array<IValidation>`](./KatApp.07.Api.md#ivalidation) | Error array populated from the `error` calculation result table, API validation issues, unhandled exceptions in KatApp Framework or manually via `push` Kaml View javascript.  Typically they are bound to a validation summary template and input templates.
`warnings` | [`Array<IValidation>`](./KatApp.07.Api.md#ivalidation) | Warning array populated from the `warning` calculation result table or manually via `push` Kaml View javascript.  Typically they are bound to a validation summary template and input templates.
`rbl` | [`IStateRbl`](#istaterbl) | Helper object used to access RBLe Framework Calculation results.


### IState Methods

Name | Description
---|---
[`canSubmit`](#istatecansubmit) | Returns `true` if application is in the 'state' to submit to server for processing.
[`onAll`](#istateonall) | Returns `true` if **all** values passed in evaluate to `true` using same conditions described in [`rbl.boolean()`](#istaterblboolean)
[`onAny`](#istateonany) | Returns `true` if **any** values passed in evaluate to `true` using same conditions described in [`rbl.boolean()`](#istaterblboolean)

#### IState.canSubmit

**`canSubmit(whenInputsHaveChanged: boolean | undefined) => boolean`**

Returns `true` if application is in the 'state' to submit to server for processing; handling the most common situations.  

Returns `true` if `( whenInputsHaveChanged ? inputsChanged : isDirty ) && !uiBlocked && errors.filter( r => r.id.startsWith('i')).length == 0`.  

The `errors.filter` is ensuring that there are no `v-ka-input` validation errors that the user could correct.  

This property is helpful to use in modal applications with a submit button to control the `disabled` state.
#### IState.onAll

**`onAll(...values: any[]) => boolean`**

Returns `true` if **all** values passed in evaluate to `true` using same conditions described in `rbl.boolean()`.
#### IState.onAny

**`onAny(...values: any[]) => boolean`**

Returns `true` if **any** value passed in evaluates to `true` using same conditions described in `rbl.boolean()`.

## IStateRbl

Helper object used to access RBLe Framework Calculation results.

### IStateRbl Properties

Property | Type | Description
`results`<sup>1</sup> | `IStringIndexer<IStringIndexer<Array<ITabDefRow>>>` | JSON object containing results of all assocatied CalcEngines.  Typically not used by Kaml developers.  Instead, use other methods of `IStateRbl` to grab results.  The `string` key to results is the concatenation of `CalcEngineKey.TabName`.
`expressions` | [`IStateRblExpressions`](#istaterblexpressions) | Provides access to evaluated values from `rbl-expression` rows returned by CalcEngine results.  Return evaluated values from `rbl-expression` rows using `value`, `number`, and `boolean` accessors or direct access via expression `id`.

<sup>1</sup> The `results` object can be visualized as below (See [RBLe Framework Result Processing in KatApp State](#rble-framework-result-processing-in-katapp-state) to understand how RBLe Framework result managed in KatApp state to ensure proper `reactivity` after each calculation):

```javascript
// The object can be visualized as follows
rbl: {
    results: {
        "Home.RBLResult": {
            "rbl-value": [
                { "id": "name", "value": "John Smith" },
                { "id": "company", "value": "Conduent" },
            ],
            "rbl-display": [
                { "id": "name", "value": "1" }
            ]
        },
        "Home.RBLDocGenResult": {
            "download": [
                { 
                    "template": "Sample.docx", 
                    "fileName": "statement.pdf" }
            ]
        }        
    }
}
```

<sup>2</sup> Given the following configuration for multiple CalcEngines and tabs, the `rbl.options` object can be used in the following scenarios.  Note, that when `options.calcEngine` or `options.tab` are set, all KatApp directives (`v-ka-value`, `v-ka-template`, `v-ka-table`, `v-ka-chart`, `v-ka-highchart`, etc.) that access RBLe Results will also obey the settings.

```html
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInput" result-tabs="RBLResult"></calc-engine>
    <calc-engine key="shared" name="LAW_Shared_CE" input-tab="RBLInput" result-tabs="RBLResult,RBLHelpers"></calc-engine>
</rbl-config>
```

```javascript
// Start: application.state.rbl.options.calcEngine is 'undefined'
application.state.rbl.value("firstName"); // return rbl-value.firstName from LAW_Wealth_CE, RBLResult tab

application.state.rbl.options.calcEngine = "shared";
application.state.rbl.value("firstName"); // return rbl-value.firstName from LAW_Shared_CE, RBLResult tab

application.state.rbl.options.calcEngine = "default";
application.state.rbl.value("firstName"); // return rbl-value.firstName from LAW_Wealth_CE, RBLResult tab

application.state.rbl.options.calcEngine = "shared";
application.state.rbl.options.tab = "RBLHelpers";
application.state.rbl.value("firstName"); // return rbl-value.firstName from LAW_Shared_CE, RBLHelpers tab
```

### IStateRbl Methods

Name | Description
---|---
[`source`](#istaterblsource) | Returns table rows from `results`.
[`exists`](#istaterblexists) | Check for existence of table row(s).
[`value`](#istaterblvalue) | Return a single value (`undefined` if not present) from `results`.
[`number`](#istaterblnumber) | Return a single *number* value (`0` if not present or not a number) from `results`.
[`boolean`](#istaterblboolean) | Return whether or not a single row.column value is truthy.
[`pushTo`](#istaterblpushto) | Allows Kaml Views to manually push 'additional result rows' into [`rbl.results`](#istaterbl-properties).
[`mergeRows`](#istaterblmergerows) | Allows Kaml Views to manually push 'additional result rows' into a calculation result table before it is merged into `rbl.results`.

The *first* CalcEngine key and its *first* result tab defined in the [`<rbl-config>`](./KatApp.01.GettingStarted.md#configuring-calcengines-and-template-files) element in the Kaml View will be used when accessing results.

#### IStateRbl.source

**`source(table: string, calcEngine?: string, tab?: string, predicate?: (row: ITabDefRow) => boolean) => Array<ITabDefRow>`**

The core method that returns table rows from `results` (and is leveraged internally by other `IState.rbl` methods).  The CalcEngine key and `ITabDef` name can be passed in if not using the 'default' CalcEngine and result tab. 

1. CalcEngine is determined by `calcEngine` param, then [`rbl.options.calcEngine`](#istaterbl-properties) setting.
1. Tab name is determined by `tab` param, then [`rbl.options.tab`](#istaterbl-properties) setting.

The `predicate` parameter indicates how the result rows should be filtered before returning them.

```javascript
// Return all resultTable rows
application.state.rbl.source("resultTable");

// Return all resultTable rows where category = 'red'
application.state.rbl.source("resultTable", r => r.category == 'red');

// Return all brdResultTable rows from the BRD CalcEngine
application.state.rbl.source("brdResultTable", "BRD");

// Return all resultTable rows from the 'RBLSecondTab' tab def
application.state.rbl.source("resultTable", undefined, "RBLSecondTab");
application.state.rbl.source("resultTable", , "RBLSecondTab");

// Return all brdResultTable rows from the BRD CalcEngine where topic = 'head'
application.state.rbl.source("brdResultTable", "BRD", r => r.topic == 'head');
```


#### IStateRbl.exists

**`exists(table: string, calcEngine?: string, tab?: string, predicate?: (row: ITabDefRow) => boolean ) => boolean`**

Returns `true` if the specfied table has any rows in `results`.  The CalcEngine key and `ITabDef` name can be passed in if not using the default CalcEngine and result tab. 

A `predicate` can be passed to filter rows before checking for existence. 

`rbl.exists` has the same syntax as `rbl.source` and is typically used in [`v-if`](./KatApp.05.VueDirectives.md#v-if-v-else-v-else-if) and [`v-show`](./KatApp.05.VueDirectives.md#v-show) directives.

```html
<div v-if="rbl.exists('resultTable')">
    <!-- Only render this element if any rows exist for resultTable -->
</div>
<div v-show="rbl.exists('resultTable', r => r.topic == 'head')">
    <!-- Only show this element if any rows exist for resultTable with topic = 'head'  -->
</div>
```

#### IStateRbl.value

**`value(table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => string | undefined`**

Return a single value (`undefined` if not present) from `results` given parameters passed in.  .  The CalcEngine key and `ITabDef` name can be passed in if not using the default CalcEngine and result tab.

After `keyValue`, all parameters are optional. If `returnField` is not passed in, the `value` column is used.  If `keyField` is not passed in, the `id` column is used.

Shorthand syntax of only one parameter is allowed, where the `table` parameter is then assumed to be `rbl-value` and the single parameter is assumed to be the `keyValue`.

```javascript
// Return 'value' column from 'rbl-value' table where 'id' column is "name-first".
const name = application.state.rbl.value("rbl-value", "name-first");

// Shorthand syntax for example above.
const name = application.state.rbl.value("name-first");

// Return 'value2' column from 'rbl-value' table where 'id' column is "name-first".
const name = application.state.rbl.value("custom-table", "name-first", "value2");

// Return 'value2' column from 'rbl-value' table where 'key' column is "name-first".
const name = application.state.rbl.value("custom-table", "name-first", "value2", "key");

// Return 'value' column from 'rbl-value' table where 'key' column is "name-first".
const name = application.state.rbl.value("custom-table", "name-first", undefined, "key");


// Return 'value' column from 'rbl-value' table where 'id' column is "name-first" from the BRD CalcEngine
const name = application.state.rbl.value("rbl-value", "name-first", undefined, undefined, "BRD");

// Return 'value' column from 'rbl-value' table where 'id' column is "name-first" 
// from the RBLResult2 tab in the default CalcEngine
const name = application.state.rbl.value("rbl-value", "name-first", 
                undefined, undefined, undefined, "RBLResult2");

// Return 'value2' column from 'rbl-value' table where 'key' column is "name-first" from the 
// RBLResult2 tab in the BRD CalcEngine
const name = application.state.rbl.value("custom-table", "name-first", "value2", "key", 
                "BRD", "RBLResult2");
```

#### IStateRbl.text

**`text(table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => string | undefined`**

The exact same functionality as `rbl.value()` except that the value returned from `rbl.value` is used as a key to look into resource strings.  If a resource string is not found, the value returned from `rbl.value` is returned.

#### IStateRbl.number

**`number(table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => number`**

Return a single *number* value (`undefined` if not present) from `results` given parameters passed in.  .  The CalcEngine key and `ITabDef` name can be passed in if not using the default CalcEngine and result tab.

After `keyValue`, all parameters are optional. If `returnField` is not passed in, the `value` column is used.  If `keyField` is not passed in, the `id` column is used.

Internally, `number()` first retrieves a value using the [`value()`](#istaterblvalue) method, then converts it to a number.  If the value is `undefined` or unable to be converted to a number, `0` is returned.

See `rbl.value()` for examples on syntax available.

#### IStateRbl.boolean

**`boolean(table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string, valueWhenMissing?: boolean) => boolean`**

Returns `true` if the value returned (with same function signature as `rbl.value`) is `undefined` (currently not present in results) or value is string and lower case is not in ['false', '0', 'n', 'no'] or value converted to a boolean is `true`.  Typically used in `v-if` and `v-show` directives.

Shorthand syntax of only one parameter is allowed, where the parameter is assumed to be the `keyValue` parameter, and then **multiple** tables are checked returning first existing match.  The tables checked (based on priority) are: `rbl-value`, `rbl-display`, `rbl-disabled`, and `rbl-skip`.

```html
<div v-if="rbl.boolean('canSeeThis')">
    <!-- 
    Only render this element if rbl-value, rbl-display, rbl-disabled, or rbl-skip 
    does not contain an row with id = 'canSeeThis' or that row does *not* have a 
    value = 'false', '0', 'n', 'no'.
    -->
</div>
<div v-show="rbl.boolean('customTable', 'canSeeThis')">
    <!-- 
    Only render this element if customTable table does not contain an row with id = 'canSeeThis' 
    or that row does *not* have a value = 'false', '0', 'n', 'no'.
    -->
</div>
```

There are times when Kaml Views do not want a 'missing calculation value' to return true, most commonly when using `rbl.boolean()` for a `:disabled` Vue directive.  In this case, it is useful to use the `valueWhenMissing` parameter and set it to `false` so that if a CalcEngine does not return the requested item the element is *not* disabled; only disable the element if a value is return and can not be parsed into `true`.

There is also a shorthand syntax for `valueWhenMissing`.  It is always the last parameter, so no matter how many of the other parameters to `rbl.boolean()` a Kaml View needs to use to get the appropriate value from the appropriate calculation result location, `valueWhenMissing` can be provided at any point as the last parameter.

```html
<!-- 
Link disabled if allowLink not returned in rbl-value, rbl-display, rbl-disabled, or rbl-skip
since 'undefined' will be treated as 'true' in rbl.boolean()
 -->
<a href="#" :disabled="rbl.value('allowLink')">Click Here</a>

<!-- 
Link is *not* disabled, even if allowLink not returned in rbl-value, rbl-display, 
rbl-disabled, or rbl-skip since 'undefined' will be treated as 'false' in rbl.boolean()
because valueWhenMissing was provided.
 -->
<a href="#" :disabled="rbl.value('allowLink', false)">Click Here</a>

<!-- 
Link disabled, if allowLink not returned in rbl-disabled
since 'undefined' will be treated as 'true' in rbl.boolean()
 -->
<a href="#" :disabled="rbl.value('rbl-disabled', 'allowLink')">Click Here</a>

<!-- 
Link is *not* disabled, event if allowLink not returned in rbl-disabled
since 'undefined' will be treated as 'false' in rbl.boolean() because valueWhenMissing was provided.
 -->
<a href="#" :disabled="rbl.value('rbl-disabled', 'allowLink', false)">Click Here</a>
```


#### IStateRbl.pushTo

**`pushTo(table: string, rows: ITabDefRow | Array<ITabDefRow>, calcEngine?: string, tab?: string) => void`**

Allows Kaml Views to manually push 'additional result rows' into `rbl.results` that are computed outside of the KatApp Framework.

```javascript
const requestedKeys = el.attr("data-savanna-id");
const requestedKeyParts = requestedKeys.split("|").map(p => p.trim());
const content = result.content;

application.state.rbl.pushTo("rbl-value",
	[{ "id": `s-${requestedKeys}`, "value": content != "" ? "1" : "0" }].concat(
		requestedKeyParts.map(p => ({
			"id": `s-${p}`,
			"value": content != "" && p == r.key ? "1" : "0"
		}))
	)
);
```

The *first* CalcEngine key and its *first* result tab defined in the [`<rbl-config>`](./KatApp.01.GettingStarted.md#configuring-calcengines-and-template-files) element in the Kaml View will be used when pushing results if calcEngine and/or tab are not provided.

#### IStateRbl.mergeRows

**`mergeRows(tabDef: ITabDef, rows: ITabDefRow | Array<ITabDefRow>) => void`**

Allows Kaml Views to manually push 'additional result rows' into a calculation result table before results are merged into `rbl.results`.  Typically used in [IKatApp.resultsProcessing](./KatApp.07.Api.md#ikatappresultsprocessing) event handlers to inject rows before they are [processed into the application state](#rble-framework-result-processing-in-katapp-state).

```javascript
application.on("resultsProcessing.ka", (event, results, inputs) => {
    // Push 'core' inputs into rbl-value for every CalcEngine if they exist
    // in this global handler instead of requiring *every* CalcEngine to return these.
	const result = results.find(r => r["@calcEngine"].replace("_PROD", "").startsWith(application.calcEngines[0].name));

	if (result != undefined) {
		application.state.rbl.mergeRows(result, "rbl-value",
			[
				{ "id": "currentPage", "value": inputs.iCurrentPage ?? "" },
				{ "id": "parentPage", "value": inputs.iParentPage ?? "" },
				{ "id": "referrerPage", "value": inputs.iReferrer ?? "" },
				{ "id": "isModal", "value": inputs.iModalApplication ?? "0" },
				{ "id": "isNested", "value": inputs.iNestedApplication ?? "0" }
			]
		);
	}
});
```

The *first* CalcEngine key and its *first* result tab defined in the [`<rbl-config>`](./KatApp.01.GettingStarted.md#configuring-calcengines-and-template-files) element in the Kaml View will be used when pushing results if calcEngine and/or tab are not provided.

#### IStateRbl.expressions

**`expressions.value(id: string) => string | undefined`**  
**`expressions.number(id: string) => number`**  
**`expressions.boolean(id: string, valueWhenMissing?: boolean) => boolean`**

Provides evaluated results of JavaScript expression strings returned by the CalcEngine in the special `rbl-expression` result table.

The `rbl-expression` table requires an `id` column and a `value` column. The `value` column contains a JavaScript expression evaluated against the current KatApp `state` object. All expressions are compiled once per calculation run into a single object, not re-compiled on each accessor call.
In addition to direct access to the [IState](#istate) properties and methods, expressions have access to the other expression results via `this`.  So if there are multiple rows in the `rbl-expression` table, they can reference each other as long as there are no circular references.

| Accessor | Returns |
|---|---|
| `value(id)` | The `string` result of the expression, or `undefined` if no row with that `id` exists or the expression throws. |
| `number(id)` | The result parsed as a number; returns `0` if missing or not parseable. |
| `boolean(id, valueWhenMissing?)` | The result parsed using the same truthy rules as `rbl.boolean()`. Returns `valueWhenMissing ?? true` when the `id` is not found. |

Expressions have implicit access to all `state` properties (`inputs`, `rbl`, `model`, etc.) without qualification. Expressions can reference each other using `this.expressionId`.

Each CalcEngine `rbl-expression` table is stateless across calculations — rows are **not** merged with results from previous runs. If any `rbl-expression` rows are returned in a given calculation, the entire expression object is rebuilt from scratch using only those rows. Therefore, a CalcEngine must return every expression row the application needs on every calculation run that returns any `rbl-expression` rows. Rows returned across multiple CalcEngines or result tabs within a single run are combined into one expressions object (last writer wins on duplicate `id` values).

**CalcEngine table:**

| id | value |
|---|---|
| `isFutureDate` | `new Date(inputs.iEffectiveDate) > new Date()` |
| `adjustedSalary` | `rbl.number('salary') * 1.03` |
| `isEligible` | `this.isFutureDate && inputs.iStatus != 'retired'` |

**Usage in KAML JavaScript:**
```javascript
const isFuture = application.state.rbl.expressions.boolean("isFutureDate");
const salary   = application.state.rbl.expressions.number("adjustedSalary");
```

**Usage in KAML markup:**
```html
<div v-if="rbl.expressions.boolean('isFutureDate')">Future date selected</div>
<span v-text="rbl.expressions.value('adjustedSalary')"></span>
```

> **Note:** Expression strings are compiled using the `Function` constructor and have access to `state` properties via a `with(state)` scope inside each getter. Syntax errors in any expression string are caught individually; the affected `id` will return `undefined` / `0` / `true` from its accessors. Runtime errors are traced at `TraceVerbosity.None`.


## RBLe Framework Result Processing in KatApp State

Since Vue directives and template syntax is driven by a [reactivity mental model](https://vuejs.org/guide/essentials/reactivity-fundamentals.html), it is important to process RBLe Framework calculations properly to subscribe into this reactivity correctly.

There are three ways calculations tables are processed:

1. **Merge the 'core KatApp table' into Vue state.** This is because with core tables, CalcEngines often only return rows that have 'changed'.  So if initial calculation returned 15 'core rows', then a subsequent calculation only returned the '1 affected row', the KatApp Framework cannot replace entire table with new results because all Vue reactivity bound to previous core table rows would be reprocessed (against a non-existent row).
1. **Completely replace the table in Vue state.** All non-core tables that are returned are usually used in a [v-for directive](./KatApp.05.VueDirectives.md#v-for) and CalcEngines always return the complete list of rows needed to re-render the markup (partial updates are not allowed).  So it is safe to completely replace the table and allow Vue reactivity to process and re-render (any non-existant rows would be 'removed').
1. **Process [`table-output-control`](#rble-framework-result-processing-in-katapp-state) instructions that clear tables in Vue state.** All non-core tables that normally replace Vue state tables need a way to indicate when an original calculation returned table rows, then a subsequent calculation wants to return **no** rows; emptying out Vue state and triggering Vue reactivity run re-render (with zero rows as the Vue scope). When RBLe Framework CalcEngines do *not* return a table (b/c nothing has changed and there is no need to re-process the results with Vue reactivity), there is no way for the KatApp Framework to know if a table is missing because no updates were made or because there is now no valid data.  To allow for this scenario, the `table-output-table` is processed and indicates how the Vue state should be updated.

The following psuedo code demonstrates the work flow for result processing.

```javascript
const coreKatAppTable = ["rbl-disabled", "rbl-display", "rbl-skip", "rbl-value", "rbl-listcontrol", "rbl-input"];
const resultKey = `Home.${tabDef.name}`; // CalcEngineKey.TabName
const stateResult = application.state.rbl.results[resultKey];

// Update/merge Vue state as needed for each table returned in the calculation
for (const tableName in tabDef) {
    if (coreKatAppTable.indexOf(tableName) == -1) {
        // For any non coreKatAppTable returned, simply assign state value
        stateResult[tableName] = tabDef[tableName];
    }
    else {
        tabDef[tableName].forEach( row => {
			const index = stateResult[tableName].findIndex(r => r.id == row.id);

			if (index > -1) {
                // Found existing row, merge rows together by extending the 
                // state row with any properties returned in result row.
				Utils.extend(stateResult[tableName][index], row);
			}
			else {
                // If no existing row, simply push new row to end of table, order
                // of rows in coreKatAppTables is not important.
				stateResult[tableName].push(row);
			}
        });
    }
}

// Update input values (both state.inputs and any matching HTML elements) via rbl-default instructions
tabDef["rbl-defaults"].forEach( r => application.setInputValue(r.id, r["value"]) );

// Look for any value/errors/warnings in rbl-input table and update state appropriately.
// However, only set 'value', 'error', 'warning' column is returned in rbl-input table
const hasRblInputValue = tabDef.hasTable("rbl-input") && tabDef["rbl-input"].hasColumn("value");
const hasRblInputError = tabDef.hasTable("rbl-input") && tabDef["rbl-input"].hasColumn("error");
const hasRblInputWarning = tabDef.hasTable("rbl-input") && tabDef["rbl-input"].hasColumn("warning");

tabDef["rbl-input"].forEach( r => {
    if (hasRblInputValue) {
        application.setInputValue(r.id, r["value"]);
    }
    if (hasRblInputError && (r["error"] ?? "") != "") {
        const v: IValidation = { "id": r.id, text: r["error"] };
        application.state.errors.push(v);
    }
    if (hasRblInputWarning && (r["warning"] ?? "") != "") {
        const v: IValidation = { "id": r.id, text: r["warning"] };
        application.state.warnings.push(v);
    }
});

// Check error/warning tables and apply to state if present
tabDef["error"].forEach(r => application.state.errors.push(r) );
tabDef["warning"].forEach(r => application.state.errors.push(r) );

// If table control says they want to export, but no rows are returned, then need to re-assign to empty array
tabDef["table-output-control"].forEach(r => {
    // export = -1 = didn't export table but clear out in Vue state
    // export = 1 = exported table, if empty clear Vue state
    if ((r["export"] == "-1" || r["export"] == "1") ) {
        stateResult[r.id] = [];
    }
});
```



