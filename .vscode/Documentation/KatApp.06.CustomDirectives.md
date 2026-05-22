> This file is a focused section of KatApp documentation.
> Use [KatApp.md](./KatApp.md) for the index.

# Custom KatApp Directives

Similiar to common Vue directives, the KatApp Framework provides custom directives that help rendering markup by leveraging/accessing RBLe Framework calculation results.  The majority of the KatApp Framework directives take a 'model' coming in describing how the directive should function. [`v-ka-template`](#v-ka-template), [`v-ka-input`](#v-ka-input) and [`v-ka-input-group`](#v-ka-input-group) take a model *and* return a 'scope' object that can be used by the markup contained by the template. [`v-ka-needs-calc`](#v-ka-needs-calc) and [`v-ka-inline`](#v-ka-inline) are 'marker' directives and do not take a model or return a scope.

- [v-ka-value](#v-ka-value) - Update element's `innerHTML` from designated RBLe Framework result.
- [v-ka-resource](#v-ka-resource) - When a KatApp needs to support localization (different language translations), the `v-ka-resource` can work in conjunction with the [IKatAppOptions.resourceStrings](./KatApp.07.Api.md#ikatappoptions) to replace the element's `innerHTML` with a translated string.
- [v-ka-input](#v-ka-input) - Render input template or bind existing inputs to RBLe Framework calculations.
- [v-ka-input-group](#v-ka-input-group) - Render template representing multiple inputs of the same type and bind to RBLe Framework calculations.
- [v-ka-navigate](#v-ka-navigate) - Configure navigation within Kaml Views to other Kaml Views in Host Environment.
- [v-ka-template](#v-ka-template) - Render template with or without a data source; the data source can be an array rendering template content multiple times.
- [v-ka-api](#v-ka-api) - Configure a `HTMLElement` to submit to an api endpoint on click event.
- [v-ka-modal](#v-ka-modal) - Configure a `HTMLElement` to open up a modal dialog (containing fixed markup or seperate Kaml View) on click.
- [v-ka-app](#v-ka-app) - Nest an instance of a seperate Kaml View within the current Kaml View (the KatApps will be isolated from each other).
- [v-ka-table](#v-ka-table) - Render HTML tables automatically from the calculation results based on `text*` and `value*` columns.
- [v-ka-chart](#v-ka-chart) - Render SVG chart automatically from the calculation results.
- [v-ka-highchart](#v-ka-highchart) - Render Highcharts chart automatically from the calculation results.
- [v-ka-attributes](#v-ka-attributes) - Accepts a key/value space delimitted `string` of attributes and applies them to the current `HTMLElement`.
- [v-ka-needs-calc](#v-ka-needs-calc) - Flag UI submission link/button as requiring a RBLe Framework calculation to complete before user can submit the form.
- [v-ka-inline](#v-ka-inline) - Render *raw HTML* without the need for a `HTMLElement` 'container'.
- [v-ka-rbl-no-calc](#v-ka-rbl-no-calc) - Flag an element so that any contained `v-ka-input` elements do not trigger a RBLe calculation upon change.
- [v-ka-rbl-exclude](#v-ka-rbl-exclude) - Flag an element so that any contained `v-ka-input` elements do not trigger a RBLe calculation upon change *and* are never submitted to an RBLe calculation.
- [v-ka-unmount-clears-inputs](#v-ka-unmount-clears-inputs) - Flag an element so that when any contained `v-ka-input` elements are removed from the DOM, the associated [`state.inputs`](./KatApp.03.State.md#istate-properties) value is also removed.
- [v-ka-nomount](#v-ka-nomount) - Flag an element so that any contained `v-ka-input` elements allow for the KatApp framework to wire up all automatic processing.

## v-ka-value

The `v-ka-value` directive is responsible for assigning element HTML content from the calculation results.  It is simply a shorthand syntax to use in place of [`v-html`](./KatApp.05.VueDirectives.md#v-html-v-text) and [`rbl.value()`](./KatApp.03.State.md#istaterblvalue).

- [v-ka-value Model](#v-ka-value-model) - Discusses the properties that can be passed in to configure the `v-ka-value` directive.
- [v-ka-value Samples](#v-ka-value-samples) - Various use examples of how to use `v-ka-value`.
- [v-ka-value Model Segments With Periods](#v-ka-value-model-segments-with-periods) - Displays how to use `v-ka-value` if the `keyValue` contains one or more periods (which would break the default `.` delimitted segment string usually passed in for configuration).

### v-ka-value Model

The model used to configure how a `v-ka-value` will find the appropriate calculation result value is simply a `.` delimitted `string`.

The selector has the format of `table.keyValue.returnField.keyField.calcEngine.tab`. As you can see, it has the same parameters as the [rbl.value()](./KatApp.03.State.md#istaterblvalue) method and behaves the same way. Each of the model 'segments' are optional.

The `v-ka-value` directive has the same shorthand capabilities as `rbl.value()` which allows for more terse markup.  If the `rbl-value` is the table being selected from, you can simply provide a single `id` value to the directive.

`v-ka-value` Caveat: This directive is almost equivalent to `v-html="rbl.value(...)"` with a single caveat.  When the requested value does not exist in the calculation results, `rbl.value()` returns `undefined` and that would be rendered if the `v-html` method was used.  **With `v-ka-value`, when the value does not exist, the element's current HTML is left unmodified.**

### v-ka-value Samples

```html
<!-- The following statements are 'equivalent' (considering the caveat above) -->
<div v-ka-value="nameFirst"></div>
<div v-ka-value="rbl-value.nameFirst"></div>
<div v-html="rbl.value( 'nameFirst' )"></div>
<div v-html="rbl.value( 'rbl-value', 'nameFirst' )"></div>

<!-- Optional Segment examples -->

<!-- Return 'value' column from 'rbl-value' table where 'id' column is "name-first". -->
<div v-ka-value="rbl-value.name-first"></div>
<!-- Shorthand syntax for example above. -->
<div v-ka-value="name-first"></div>
<!-- Return 'value2' column from 'rbl-value' table where 'id' column is "name-first". -->
<div v-ka-value="custom-table.name-first.value2"></div>
<!-- Return 'value2' column from 'rbl-value' table where 'key' column is "name-first". -->
<div v-ka-value="custom-table.name-first.value2.key"></div>
<!-- 
Return 'value' column from 'rbl-value' table where 'key' column is "name-first". 
NOTE: The 'empty' segment where returnValue is omitted 
-->
<div v-ka-value="custom-table.name-first..key"></div>

<!-- 
Return 'value' column from 'rbl-value' table where 'id' column is "name-first" from the BRD CalcEngine. 
NOTE: Empty segments. 
-->
<div v-ka-value="rbl-value.name-first...BRD"></div>
<!-- 
Return 'value' column from 'rbl-value' table where 'id' column is "name-first" from the 
RBLResult2 tab in the default CalcEngine
-->
<div v-ka-value="rbl-value.name-first....RBLResult2"></div>
<!-- 
Return 'value2' column from 'rbl-value' table where 'key' column is "name-first" from the
RBLResult2 tab in the BRD CalcEngine 
-->
<div v-ka-value="custom-table.name-first.value2.key.BRD.RBLResult2"></div>
```

### v-ka-value Model Segments With Periods

Since the model is `.` delimtted `string`, if any of the segments need to have a `.` in the value, a Kaml View can not use the 'simple' segment string syntax.  In this case, there is an alternate model available.  It is simply a javascript object  with the properties displayed below.

```html
table.keyValue.returnField.keyField.calcEngine.tab
<div v-ka-value="{ 
    table: 'table', 
    keyValue: 'key.with.dots', 
    returnField: 'optionalField',
    keyField: 'optionalField',
    ce: 'optionalCalcEngineName',
    tab: 'optionalTabName'
}">Default Text</div>
```

The only required property is `keyValue`, the rest can be `undefined` or excluded.  If `table` is undefined, `rbl-value` will be used. Even though this sytax can be longer than using `v-html="rbl.value()`, it has the benefit of leaving the default element content if the value is not present in the results.

## v-ka-resource

The `v-ka-resource` directive is responsible for assigning element HTML content from localized resource strings based on the current culture.  

- [v-ka-resource Model](#v-ka-resource-model) - Discusses the properties that can be passed in to configure the `v-ka-resource` directive.
- [v-ka-resource Samples](#v-ka-resource-samples) - Various use examples of how to use `v-ka-resource`.

**Note**: Several other KatApp features and directives already support automatic localization.  When those features are used, it is not necessary to use `v-ka-resource` or [application.getLocalizedString](./KatApp.07.Api.md#ikatappgetlocalizedstring).  The following features already support automatic localization:

1. `rbl.text(...)` (instead of `rbl.value(...)`)
1. Validation errors returned from [IKatApp.apiAsync](./KatApp.07.Api.md#ikatappapiasync) calls.
1. [v-ka-input Model](#v-ka-input-model) properties: label, placeholder, help, help title, list item text
1. [v-ka-highchart](#v-ka-highchart) options: if the option value that start with `resource:`.
1. [v-ka-value](#v-ka-value) directives.
1. [v-ka-table](#v-ka-table) directives.
1. [v-ka-modal Model](#v-ka-modal-model) label properties.

### v-ka-resource Model

The model used to configure how a `v-ka-resource` will return the appropriate translated string is described below.  If the `key` used to lookup the localized string is not found, the `key` is returned as the result of the localized lookup.


Property | Type | Description
---|---|---
`key` | `string` | **Required;** The key to use to lookup the localized string.
`templateArguments` | `Array<string>` | Optional; The the localized string has template replacements (i.e. `{0}`, `{1}`, .. `{N}`), an array of strings can be provided in traditional _C# string.Format()_ style.  If any of the template replacements have a format specified (i.e. `{0:0.00}`), the a string representation of the value (either a number or date) should be provided in a manner that supports parsing with an invariant culture.
`tokenProperty` | `string` | Optional; If the localized string has token replacements (i.e. `{{name}}`, `{{dob}}`, etc. **note the double {{ }}**), a property can be provided to use for each token replacement.  If a token is present in the localized string and no matching property is found, the resulting string will still contain ``{{token}}`.  **Note**: If the token format values can changed due to reactivity, a [javascript getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) must be used for each property that can change (i.e. `{ 'key': 'Retirement.Summary', 'name': 'Fred', get savings() { return rbl.value('total-savings'); } }`).


The `v-ka-resource` directive has a couple shorthand capabilities which allows for more terse markup:

```html
<!-- 
    All three of the following samples assign the 'key=sample.string'
    The second two are just terse/shorthand ways of providing a localization string when no format tokens are needed via:

    1. v-ka-resource string literal value
    2. The content of the element decorated with the v-ka-resource directive.
-->
<div v-ka-resource="{ key: 'sample.string' }"></div>
<div v-ka-resource="sample.string"></div>
<div v-ka-resource>sample.string</div>

<!-- 
	Since key is not a property in the model passed to v-ka-resource it uses shorthand mechanism 
	to grab key from element content, the resulting model would look like this:
		{ key: 'Good.Morning', name: 'Terry' }
-->
<div v-ka-resource="{ name: 'Terry' }">Good.Morning</div>
```

**Client Side Kaml Substituion Considerations Using templateArguments**  

If a resource string contains template replacements `{#}` versus token replacements `{{token}}` and the `key` or one or more template arguments are provide via a CalcEngine value, but some arguments are generated client side, `templateArguments` can be used (ensuring that it support reactivity via javascript getters).

```html
<!--
	Assume Common.MakePayment.ConvenienceFeeMsg:
	You're paying your total due of {0:c} plus the {1:C} convenience fee.
-->
<div v-ka-resource="{ get templateArguments() { return [ model.paymentAmount, rbl.value( 'convenienceFee') ]; } }">Common.MakePayment.ConvenienceFeeMsg</div>
```

**CalcEngine Substituion Considerations**  

When using results from a CalcEngine, the `key` is assigned to an expression coming from a CalcEngine, usually in a `v-for` loop and accessing a properties (i.e. `<div v-ka-resource="{ key: row.message }"></div>`).  When there are substitutions that must occur, there are a few options for the CalcEngine developers to consider when creating the 'key value' returned from the `message` column in this example.

1. Similar to `templateArguments`, the CalcEngine has a shorthand mechanism to pass a `key` along with the arguments all in one string.  It is in the format of `messageTemplateKey^arg1^arg2^...^argN`.
1. Another mechanism, which is more verbose and cumbersome, is to provide the complete model (a json string representation of the model) if needed.  When the 'entire model' is passed into the `key` parameter, there **must** be a `key` property on the model.  This is helpful when token substitution is needed.
1. The final mechanism is the use `calcEngines` column of the `resourceStrings` table found in the 'content CalcEngine'.  A comma delimitted list of `CalcEngine.ResultTab` entries can be provided for resource strings that should be passed to the CalcEngine when a calculation starts.  This will be injected into a `resourceStrings` 'input table' and CalcEngine developers can do a lookup into the table to find and use the appropriate resource string.

**Debugging Suggestions**  

There are two undocumented properties on `IKatApp` that provide helpful debugging information.  `missingResources` lists every resource key that did not find a localized string regardless of how it was requested (i.e. `v-ka-resource`, `rbl.text()`, etc.).  Similarily, `missingLanguageResources` lists every resource key that did not find a localized string for the *requested* language but found a result in the fallback languages of `en-US` or `en`.  

### v-ka-resource Samples

All the markup samples will assume the following [IKatAppOptions.resourceStrings](./KatApp.07.Api.md#ikatappoptions) is available and the `CurrentUICulture` is set to `es-es`.  Additonally, the recommend syntax for `v-ka-resource` will be used (i.e. `<div v-ka-resource>key</div>` when no tokens used or `<div v-ka-resource="{ arg1: 'Terry' }">key</div>` when token properties are needed).

```javascript
{
    "en": {
        "defaultLanguageOnly": "'en' default language.",
        "defaultRegionOverride": "'en', but is overridden.",
        "cultureLanguageOverride": "'en', but is overridden.",
        "cultureRegionOverride": "'es', but is overridden.",
        
        "Good.Morning": "Good morning {{name}}, how are you?",
        "Good.Night": "Good night {{name}}, sleep well.",

        "RBL.Parent": "This is Parent. {{child}}",
        "RBL.Child": "This is Child. Hello {{name}} from CalcEngine."
	},
    "en-us": {
        "defaultRegionOnly": "'en-us' default region.",
        "defaultRegionOverride": "'en-us' default region override.",
        "cultureLanguageOverride": "'en-us', but is overridden.",
        "cultureRegionOverride": "'es', but is overridden."
    },
    "es": {
        "cultureLanguageOnly": "'es' culture language.",
        "cultureLanguageOverride": "'es' culture language override.",
        "cultureRegionOverride": "'es', but is overridden.",

        "Good.Morning": "¿Buenas dias {{name}}, cómo estás?"
    },    
    "es-es": {
        "cultureRegionOnly": "'es-es' culture region.",
        "cultureRegionOverride": "'es-es' culture region override."
    }
}
```

The following samples demonstrate culture/region precedence when returning localized.  See [application.getLocalizedString](./KatApp.07.Api.md#ikatappgetlocalizedstring) for full documentation explaining selection priority.

```html
<!-- Returns: 'en' default language.  -->
<div v-ka-resource>defaultLanguageOnly</div>
<!-- Returns: 'en-us' default region. -->
<div v-ka-resource>defaultRegionOnly</div>
<!-- Returns: 'es' culture language. -->
<div v-ka-resource>cultureLanguageOnly</div>
<!-- Returns: 'es-es' culture region. -->
<div v-ka-resource>cultureRegionOnly</div>

<!-- 
    Returns: 'en-us' default region override.
    Ignores 'en' language value since 'en-us' is more specific. 
-->
<div v-ka-resource>defaultRegionOverride</div>

<!-- 
    Returns: 'es' culture language override.
    Ignores 'en' and 'en-us' language values since 'es' is more specific. 
-->
<div v-ka-resource>cultureLanguageOverride</div>

<!-- 
    Returns: 'es-es' culture region.
    Ignores 'en', 'en-us', and 'es' language values since 'es-es' is more specific. 
-->
<div v-ka-resource>cultureRegionOverride</div>

<!-- Nno languages contain 'Missing.Key', so returns Missing.Key. -->
<div v-ka-resource>Missing.Key</div>

<!-- 
    Returns: ¿Buenas dias Terry, cómo estás?
    Ignores 'en' language value since 'es' is more specific. 
-->
<div v-ka-resource="{ name: 'Terry' }">Good.Morning</div>

<!-- 
    Returns: Good night name, sleep well.
    Only 'en' has a localized string, and since 'name' token wasn't provided, it just uses the value of the token.
-->
<div v-ka-resource>Good.Night</div>


<!--
    String key property: 
    rbl.value("rbl-greeting") returns string value of { key: 'Good.Morning', name: 'Terry' }
	
    Returns: ¿Buenas dias Terry, cómo estás?
    Ignores 'en' language value since 'es' is more specific. 
-->
<div v-ka-resource="{ key: rbl.value('rbl-greeting') }"></div>

<!--
	String key property with nested strings and parameters: 
	rbl.value("rbl-nested") returns string value of

	{ key: 'RBL.Parent', child: application.getLocalizedString( 'RBL.Child', { name: 'RBL User' } ) }

	Formatted for readability:
	{ 
		key: 'RBL.Parent', 
		child: application.getLocalizedString( 'RBL.Child', { name: 'RBL User' } ) 
	}

	Returns: This is Parent. This is Child. Hello RBL User from CalcEngine.
-->
<div v-ka-resource="{ key: rbl.value('rbl-nested') }"></div>

```

## v-ka-input

The `v-ka-input` directive is responsible for initializing HTML inputs to be used in conjunction with the RBLe Framework calculations.  The functionality of the [`v-ka-input` Scope](#v-ka-input-scope) (i.e. labels, help, display, disabled, etc.) is built from specific, known tables in the RBLe Framework calculation.  See the [`rbl-input` Table](#rbl-input-table) documentation to understand how calculation results automatically can initialize the scope object.

The `v-ka-input` directive can be used in three scenarios.

1. Applied to a `div` element and provide a [`template`](#v-ka-input-model) name to indicate which [input template](./KatApp.04.TemplateElements.md#input-templates) should be used. 
1. Applied to a `HTMLInputElement` directly without a `template`. Same as inputs rendered with a template, this input will have events and binding set up and access to the scope.
1. Applied to a 'container' `HTMLElement` without a `template`. Similar to when a `template` is provided, the container will be searched for any `HTMLInputElement`s and automatically added events and bindings. The container will be given access to the scope. This can be envisioned as an 'inline template' so to speak where all the markup for an input is manually provided and only available to the current input.

Internally, KatApp Framework leverages the [`v-scope`](https://github.com/vuejs/petite-vue#petite-vue-only) directive to append 'input helper properties and methods' onto the 'global scope' object that can be used by inputs or templates.

- [v-ka-input Model](#v-ka-input-model) - Discusses the properties that can be passed in to configure the `v-ka-input` directive.
- [v-ka-input Scope](#v-ka-input-scope) - Discusses the properties that are exposed on the `v-ka-input` scope and can be used in Kaml View markup.
- [rbl-input Table](#rbl-input-table) - Discusses RBLe Framework `rbl-input` table layout that can be used to automatically control many of the `v-ka-input` model properties.
- [v-ka-input Samples](#v-ka-input-samples) - Examples illustrating uses of the different features of the `v-ka-input` directive.

See [v-ka-nomount](#v-ka-nomount) and `rbl-input Table` to learn more about controlling whether or not the associated HTML input elements allow for the KatApp framework to wire up all automatic processing and information about the RBLe Framework `rbl-input` that can be used to automatically control many of the `v-ka-input` model properties.

### v-ka-input Model

The `IKaInputModel` represents the model type containing the properties that configure the initialization of inputs and the returned [`v-ka-input` scope](#v-ka-input-scope). All properties of the `IKaInputModel` will be present as *read only* properties with appropriate defaults on the scope. See the [v-ka-input Scope documentation](#v-ka-input-scope) for more information about default values provided.

The `v-ka-input` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the input instructions only needs to provide an input name to the directive, the following can be used.

```html
<!-- The following examples are equivalent -->
<input v-ka-input="iNameFirst" type="text"></input>
<input v-ka-input="{ name: 'iNameFirst' }" type="text"></input>
```

Property | Type | Description
---|---|---
`name` | `string` | **Required;** The name of the input.  In RBLe Framework, input names start with lower case `i` and then the remaing part(s) is/are [Pascal Case](https://www.codingem.com/what-is-pascal-case/) (i.e. `iFirstName`).
`template` | `string` | The template ID if a [template](./KatApp.04.TemplateElements.md#html-content-template-elements) will be used to render markup with the scope.
`type`<sup>1</sup> | `string` | Set the [type](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types) of the associated `HTMLInputElement` when the `tagName=INPUT` (vs `SELECT` or `TEXTAREA`).
`value` | `string` | Provide a default value for the input.  The value can also be provided via the `rbl-defaults.value` or the `rbl-input.value` RBLe Framework calculation value.
`label` | `string` | Provide a display label for the input.  The value can also be provided via the `rbl-value[id=='l' + name].value` or the `rbl-input.label` RBLe Framework calculation value.
`placeHolder` | `string` | Provide a [placeholder](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#placeholder) for the input.  The value can also be provided via the `rbl-input.placeholder` RBLe Framework calculation value.
`hideLabel` | `boolean` | Provide a value determining whether the display label should be hidden. The value can also be provided via a RBLe Framework calculation value. If `rbl-input.label == '-1'`, the label will be hidden.
`iconHtml` | HTML | Provide additional HTML Markup that could be rendered next to other icons that perform actions.  For example, a `range` input may have an additional icon that should open up a 'worksheet' or [v-ka-modal](#v-ka-modal).
`list` | `Array<{ key: string; text: string; }>` | Provide a `list` for the input if it renders a list (i.e. `SELECT`, `type="radio"`, etc.) when building the control.  The value can also be provided via the `rbl-listcontrol.table` or `rbl-input.list` RBLe Framework calculation value which points to a table containing columns of `key` an `text`.
`prefix` | `string` | Provide a `prefix` for the input that could be displayed before the actual input (i.e. with Bootstrap [input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) markup).  The value can also be provided via the `rbl-input.prefix` RBLe Framework calculation value.
`suffix` | `string` | Provide a `suffix` for the input that could be displayed after the actual input (i.e. with Bootstrap [input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) markup). The value can also be provided via the `rbl-input.suffix` RBLe Framework calculation value.
`maxLength` | `number` | Provide a `maxLength` for the input that could be used to limit the length of textual inputs. The value can also be provided via the `rbl-input.max-length` RBLe Framework calculation value.
`displayFormat`<sup>2</sup> | string | Provide a `displayFormat` for the input that could be used to format a value before displaying it. This is currently used when the input type is `range`.
`min` | `number \| string` | Provide a `min` value for the input that could be used to limit the minimum allowed value on `date` or `range` inputs.  The value can also be provided via the `rbl-input.min` RBLe Framework calculation value.
`max` | `number \| string` | Provide a `max` value for the input that could be used to limit the maximum allowed value on `date` or `range` inputs.  The value can also be provided via the `rbl-input.max` RBLe Framework calculation value.
`step` | `number` | Provide a `step` increment value for the input that could be used to control the value increments for `range` inputs.  The value can also be provided via the `rbl-input.step` RBLe Framework calculation value.
`mask` | `string` | Provide an input `mask` to apply during user input for text inputs.  The value can also be provided via the `rbl-input.mask` RBLe Framework calculation value.<br/><br/>The supported masks are:<br/>1. `phone`, `(###) ###-####`<br/>2. `zip+4`, `#####-####`<br/>3. `cc-expire`, `MM/YY`<br/>4. `email` (only permits letters, numbers, period, `@`, `_`, and `-`)<br/>5. A 'number' mask which verifies the input is entered as a currency value taking into consideration the current cultures decimal place separator.  You can control decimal places and whether or not it allows negative values.  The format is `[-]number[N]` where the `-` is optional to indicate negatives are allowed and the `N` is optional to specify the number of decimal places to allow.  By default, specifying only `number` results in positive only values and 2 decimal places.<br/><br/>The property value is determined based on following precedence:<br/><br/>1. `rbl-input.mask` RBLe Framework calculation value<br/>2. `model.mask` property<br/>3. `undefined` if no value provided.
`keyboardRegex` | `string` | Provide an regular expression to evaluate during user input for text inputs.  This is to provide a simple, first line of defense against bad input, you can supply a regular expression to inputs via the keypressRegex(s) property that simply evaluates the keyboard input while the user types.  Full client/server validation should still be performed, this is simply a UI aid to guard 99% of users.  i.e. `\d` would only allow numerical input.<br/><br/>The property value is determined based on following precedence:<br/><br/>1. `rbl-input.keyboard-regex` RBLe Framework calculation value<br/>2. `model.keyboardRegex` property<br/>3. `undefined` if no value provided.
`uploadEndpoint` | `string` | Provide an `uploadEndpoint` value for the input that could be used if `type="file"` or if the template will render a 'file upload' UI component.
`clearOnUnmount` | `boolean` | If `true`, when an input is removed from the DOM, the associated [`state.inputs`](./KatApp.03.State.md#istate-properties) value is also removed.
`help` | `{ title?: string; content: string; width?: number; }` | Provide the help configuration when the input displays contextual help.<br/><br/>When `help` is provided, `content` is required and both `title` and `content` are HTML strings.<br/><br/>Values can also be provided via the RBLe Framework calculation.<br/>1. `title` via `rbl-value[id=='h' + name + 'Title'].value` or `rbl-input.help-title`.<br/>2.`content` via `rbl-value[id=='h' + name].value` or `rbl-input.help`.<br/>3. `width` via `rbl-input.help-width` (`width` is often used when leveraging [Bootstrap popovers](https://getbootstrap.com/docs/5.0/components/popovers/#options) to render the contextual help).
`css` | `{ container?: string; input?: string; }` | Provide css configuration that can be applied to the 'container' element or any 'inputs' within a template markup.
`events` | `IStringIndexer<((e: Event, application: KatApp) => void)>` | Provide a javascript object where each property is an event handler.  These event handlers will automatically be added to `HTMLInputElements` based on the property name.  The property name follows the same patterns as the [`v-on`](./KatApp.05.VueDirectives.md#v-on) directive (including [modifiers](./KatApp.05.VueDirectives.md#v-on-modifiers)).
`isNoCalc`<sup>3</sup> | `((base: IKaInputScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate for the input that will be called to determine if an input should *not* trigger an RBLe Framework calculation.  The value can also be provided via the `rbl-skip.value` or `rbl-input.skip-calc` RBLe Framework calculation value.<br/><br/>**Note:** Additionally if any input or input ancestor has [`v-ka-rbl-no-calc`](#v-ka-rbl-no-calc) or [`v-ka-rbl-exclude`](#v-ka-rbl-exclude) in the class list, the calculation will not occur.
`isDisabled`<sup>3</sup> | `((base: IKaInputScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate for the input that will be called to determine if an input should be disabled.<br/><br/>The value can also be provided via the `rbl-disabled.value` or `rbl-input.disabled` RBLe Framework calculation value.
`isDisplay`<sup>3</sup> | `((base: IKaInputScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate for the input that will be called to determine if an input should be displayed.<br/><br/>The value can also be provided via the `rbl-display.value` or `rbl-input.display` RBLe Framework calculation value.
`ce` | `string` | Provide the CalcEngine key if all the values that automatically pull from RBLe Framework calculation values should use a CalcEngine *different from the default CalcEngine*.
`tab` | `string` | Provide the CalcEngine result tab name if all the values that automatically pull from RBLe Framework calculation values should use a tab name *different from the default tab specified for the associated CalcEngine*.

<sup>1</sup> In addition to events that trigger RBLe Framework calculations, if the `HTMLInputElement.type` is of type `range`, the KatApp Framework adds a few more events to enable displaying the `range` value for the benefit of the user.  To enable this feature, the Kaml View developers have to take advantage of the [Template Refs](https://vuejs.org/guide/essentials/template-refs.html#template-refs) feature of Vue and provide the following `ref` assignments, all of which are optional if the Kaml View does not desire the functionality.

* `ref="display"` - This is an `HTMLElement` whose `innerHTML` will be set to the value of the `range` every time the value changes.
* `ref="bubble"` - This is an `HTMLElement` that will have a CSS class of `active` toggled on and off.  It will be on while the user is moving the slider or hovering over the slider, and turned off when the user's mouse no longer is over the `range` input.
* `ref="bubbleValue" - This is an `HTMLElement` whose `innerHTML` will be set to the value of the `range` every time the value changes.

<sup>2</sup> The format should be valid a C# format string in the format of `{0:format}` where `format` is a format string described in one of the links below.

* [Standard number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings#standard-format-specifiers)
* [Custom number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-numeric-format-strings)
* [Standard date format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-date-and-time-format-strings#table-of-format-specifiers)
* [Custom date format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings)

The value can also be provided via the combination of `rbl-sliders.format` and `rbl-sliders.decimals` or the `rbl-input.display-format` RBLe Framework calculation value. When the format comes from `rbl-sliders`, it will be turned into the string of `format + decimals` (i.e. {0:p2} if `format` was `p` and `decimals` was `2`).

<sup>3</sup> The `base` parameter passed into the delegate gives access to the associated `base.display`, `base.disabled`, and `base.noCalc` properties configured by the default RBLe Framework calculation value processing described above in each property.

### v-ka-input Scope

The `IKaInputScope` represents the type containing the properties and methods available to inputs and templates that use the `v-ka-input` directive. For the most part, it is a 'read only' version of the [`v-ka-input` model](#v-ka-input-model) object, with default functionality provided from RBLe Framework calculation results when needed.  Additionally, there are helper properties and methods available as well.

Property | Type | Description
---|---|---
`id` | `string` | Gets the unique, generated `id` for the current input. This value *should* be used if an `id` attribute needs to be rendered on an `HTMLInputElement`.
`name` | `string` | Gets the `name` to use for the current input.
`type` | `string` | Gets the [`type`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types) to use if the associated `HTMLInputElement` is an `INPUT` (vs `SELECT` or `TEXTAREA`).<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.type` RBLe Framework calculation value<br/>2. `model.type` property<br/>3. `text` if no value provided.
`value` | `string` | Gets the default value to use for the input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.value` RBLe Framework calculation value<br/>2. `rbl-defaults.value` RBLe Framework calculation value<br/>3. `model.value` property<br/>4. `""` if no value provided.
`disabled` | `boolean` | Gets a value indicating the disabled state of the current input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `model.isDisabled` delegate property<br/>2. `rbl-input.disabled` RBLe Framework calculation value (if value is `1`)<br/>3. `rbl-disabled.value` RBLe Framework calculation value (if value is `1`)<br/>4. `false` if no value provided.
`display` | `boolean` | Gets a value indicating the display state of the current input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `model.isDisplay` delegate property<br/>2. `rbl-input.display` RBLe Framework calculation value (if value is *not* `0`)<br/>3. `rbl-display.value` RBLe Framework calculation value (if value is *not* `0`)<br/>4. `true` if no value provided.
`noCalc` | `boolean` | Get a value indicating whether the current input should trigger a RBLe Framework calculation on 'change'.<br/><br/>Returns value based on following precedence:<br/><br/>1. `model.isNoCalc` delegate property<br/>2. `rbl-input.skip-calc` RBLe Framework calculation value (if value is `1`)<br/>3. `rbl-skip.value` RBLe Framework calculation value (if value is `1`)<br/>4. `false` if no value provided.<br/><br/>**Note:** Additionally if any input or input ancestor has [`v-ka-rbl-no-calc`](#v-ka-rbl-no-calc)` or [`v-ka-rbl-exclude`](#v-ka-rbl-exclude) in the class list, the calculation will not occur.
`label` | `string` | Gets the label to use for the input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.label` RBLe Framework calculation value<br/>2. `rbl-value[id='l' + name].value` RBLe Framework calculation value<br/>3. `model.label` property<br/>4. `""` if no value provided.
`hideLabel` | `boolean` | Gets a value determining whether the label should be hidden or not.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.label` RBLe Framework calculation value (return `true` if `label == "-1"`)<br/>2. `model.hideLabel` property<br/>3. `false` if no value provided.
`placeHolder` | `string \| undefined` | Gets the placeholder to use for the input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.placeholder` RBLe Framework calculation value<br/>2. `model.placeHolder` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates might want to know if `""` was assigned.  For example, a Bootstrap Floating `SELECT` might be rendered with a default empty, first element if `placeHolder != ""`.
`help` | `{ title: string; content: string \| undefined; width: string; }` | Gets the contextual help configuration to use for the input.<br/><br/>`title` value is based on following precedence:<br/><br/>1. `rbl-input.help-title` RBLe Framework calculation value<br/>2. `rbl-value[id='h' + name + 'Title'].value` RBLe Framework calculation value<br/>3. `model.help.title` property<br/>4. `""` if no value provided.<br/><br/>`content` value is based on following precedence:<br/><br/>1. `rbl-input.help` RBLe Framework calculation value<br/>2. `rbl-value[id='h' + name].value` RBLe Framework calculation value<br/>3. `model.help.content` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates might want show a contextual help icon or button based on presence of 'help' or not and it was easier to allow this property to be undefined to allow for `v-if="help.content"` type syntax to be used.<br/><br/>`width` value is based on following precedence:<br/><br/>1. `rbl-input.help-width` RBLe Framework calculation value<br/>2. `model.help.width` property<br/>3. `''` if no value provided. (`width` is often used when leveraging [Bootstrap popovers](https://getbootstrap.com/docs/5.0/components/popovers/#options) to render the contextual help).
`css` | `{ container: string; input: string; }` | Gets the CSS configuration to apply to the rendered `HTMLElement` considered the 'container' or 'input' within a template rendered input.<br/><br/><br/><br/>`container` value is based on following precedence:<br/><br/>1. `model.css.container` property<br/>2. `""` if no value provided.<br/><br/>`input` value is based on following precedence:<br/><br/>1. `model.css.input` property<br/>2. `""` if no value provided.
`list` | `Array<{ key: string; text: string; }>` | Gets the array of items to use when the rendered input is built from a list.<br/><br/>Returns value based on following precedence:<br/><br/>1. `model.list` property<br/>2. Get the RBLe Framework calculation table where the name is provided in `rbl-input.list`<br/>3. Get the RBLe Framework calculation table where the name is provided in `rbl-listcontrol.value`<br/>4. `[]` if no list is provided.
`prefix` | `string \| undefined` | Gets the prefix to display *before* the rendered input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.prefix` RBLe Framework calculation value<br/>2. `model.prefix` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a prefix. This property is most often used with [Bootstrap input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) elements.
`suffix` | `string \| undefined` | Gets the suffix to display *after* the rendered input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.suffix` RBLe Framework calculation value<br/>2. `model.suffix` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a suffix. This property is most often used with [Bootstrap input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) elements.
`maxLength` | `number` | Gets the max length a textual input value can be; often used with `TEXTAREA` inputs.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.max-length` RBLe Framework calculation value<br/>2. `model.maxLength` property<br/>3. `250` if no value provided.
`min` | `string` | Gets the min value allowed if the rendered input supports the concept of minimum value (i.e. `range` or `date` types).<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.min` RBLe Framework calculation value<br/>2. `model.min` property<br/>3. `""` if no value provided.
`max` | `string` | Gets the max value allowed if the rendered input supports the concept of maximum value (i.e. `range` or `date` types).<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.max` RBLe Framework calculation value<br/>2. `model.max` property<br/>3. `""` if no value provided.
`step` | `number` | Gets the step increment value to use if the rendered input supports the concept of incremental steps (i.e. `range` types).<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.step` RBLe Framework calculation value<br/>2. `model.step` property<br/>3. `1` if no value provided.
`error` | `string \| undefined` | Gets the error message associated with the current input from the [state.errors property](./KatApp.03.State.md#istate-properties). A value of `undefined` indicates no error.  The value can only by provided the [state.errors property](./KatApp.03.State.md#istate-properties).
`warning` | `string \| undefined` | Gets the warning message associated with the current input from the [`state.warnings` property](./KatApp.03.State.md#istate-properties). A value of `undefined` indicates no warning.  The value can only by provided the `state.warnings` property.
`uploadAsync` | `() => void \| undefined` | If an [uploadEndpoint](#v-ka-input-model) was provided, the KatApp Framework provides a help function that can be called to automatically submit the rendered [input.files](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications#getting_information_about_selected_files) list to the uploadEndpoint for processing.  Error handling is built in and 'success' is implied if no error occurs.

### rbl-input Table

The `rbl-input` table is the preferred RBLe Calculation table to use to manage `v-ka-input` and `v-ka-input-group` scopes.  This table supercedes the functionality of the legacy tables of `rbl-display`, `rbl-disabled`, `rbl-skip`, `rbl-value`, `rbl-listcontrol`, `rbl-defaults` and `rbl-sliders`. The KatApp framework still supports the legacy tables if `rbl-input` isn't present (see [KatApp Provider: Push Table Processing](https://github.com/terryaney/nexgen-documentation/blob/main/KatApps.md#push-table-processing) for more information.).

Column | Description
---|---
id | The id/name of the input (matches [`model.name`](#v-ka-input-model)).
type | For textual inputs, a [HTML5 input type](https://developer.mozilla.org/en-US/docs/Learn/Forms/HTML5_input_types) can be specified.  The default value is `text`.
label | Provide the associated label for the current input.
placeholder | For textual inputs, provided the associated placeholder to display when the input is empty.  
help | Provide help content (can be HTML). Default is blank.
help&#x2011;title | If the help popup should have a 'title', can return it here. Default is blank.
help&#x2011;width | By default, when help popup is displayed, the width is 250px, provide a width (without the `px`) if you need it larger.
value | A input value can be set from the CalcEngine whenever a calculation occurs.  Normally, this column is only returned during `iConfigureUI` calculations to return the 'default' value, but if it is non-blank, the value will be assigned during any calculation.
display | Whether or not the input should be displayed.  Returning `0` will hide the input, anything else will display the input.  If value starts with `!!`, an expression can be evaluated against current 'state' (i.e. `!!inputs.iSomeInput == '1'`).<br><br>If the `display` value is an `!!` expression, two additional columns can control behavior.<br><br>1. `displayed-clear` - by default when an input is hidden, its value will be cleared.  If you want the value to be retained when the input is hidden, return `0` in this column.<br>2. `displayed-value` - this column can be used to provide a value to assign to the input when it is *re-displayed* after being previously being hidden.
disabled | Whether or not the input should be disabled.  Returning `1` will disable the input, anything else will enable the input.  If value starts with `!!`, an expression can be evaluated against current 'state' (i.e. `!!inputs.iSomeInput == '1'`).<br><br>If the `disabled` value is an `!!` expression, two additional columns can control behavior.<br><br>1. `disabled-clear` - by default when an input is disabled, its value will be cleared.  If you want the value to be retained when the input is disabled, return `0` in this column.<br>2. `disabled-value` - this column can be used to provide a value to assign to the input when it is *re-enabled* after being previously disabled.
skip&#x2011;calc | Whether or not this input should trigger a calculation when it is changed by the user.  Returning `1` will prevent the input from triggering a calculation, anything else will allow a calculation to occur.
list | If the input is a 'list' control (dropdown, option list, checkbox list, etc.), return the name of the table that provides the list of items used to populate the control.
prefix | If the input should have a prefix (usually a [Bootstrap `input-group`](https://getbootstrap.com/docs/5.0/forms/input-group/)) prepended to the front, provide a value here (i.e. `$`).
suffix | If the input should have a prefix (usually a Bootstrap `input-group`) appended to the end, provide a value here (i.e. `%`).
max&#x2011;length | For textual inputs (i.e. TEXTAREA inputs), a maximum allowed input length can be provided.  Default is `250`.
min | For inputs with the concept of minimum values (sliders, dates), a minimum value can be provided.
max | For inputs with the concept of maximum values (sliders, dates), a minimum value can be provided.
step | For range/slider inputs, a `step` increment can be provided. Default is `1`.
mask | For textual inputs, if an input mask should be applied while the user is typing information, a mask pattern can be provided (i.e. `phone`, `zip+4`, `cc-expire`, `email`, 'number mask' - see Input and Input Group models for more information).
keyboard&#x2011;regex | For textual inputs, a regular expression to test each character typed by a user to determine if valid or not (i.e. `\d` for numeric values).
display&#x2011;format | For range/slider inputs, a display format can be provided. See [`model.displayFormat`](#v-ka-input-model) for more details.
error | During validation calculations (usually `iValidate=1`), if an input is invalid, an error message can be provided here.  Additionally, the `errors` table can be used as well.
warning | During validation calculations (usually `iValidate=1`), if an input triggers a warning, an warning message can be provided here.  Additionally, the `warnings` table can be used as well.

### v-ka-input Samples

#### v-ka-input Model Samples

```html
<!-- Range input rendered via an 'input-slider-nexgen' template -->
<div v-ka-input="{ 
    name: 'iSlider', 
    template: 'input-slider-nexgen', 
    css: { input: 'input-slider' },
    help: { content: 'Pick the age to stop working, the younger the better!' }, 
    label: 'What age do you want to stop working?', 
    min: '20', max: '80', value: '65' }"></div>

<!-- 
Date input rendered via an `input-textbox-nexgen` template; 
1. Providing help markup - markup can contain other directives (help popovers are rendered as their own KatApps)
2. Providing a isDisplay delegate that looks at another input value and falls back to using base.display functionality
3. Providing events object hooking up two events to inputs (and using modifiers)
-->
<div class="col-4" v-ka-input="{ 
    name: 'iDateBirth', 
    template: 'input-textbox-nexgen', 
    label: 'Date of Birth', 
    type: 'date',
    help: { 
        content: 
            '1 + 2 = {{1+2}}.<br/><b>I\'m bold</b><br/>' + 
            '<a v-ka-navigate=&quot;{ view: \'Channel.Home\', inputs: { iFromTooltip: 1 } }&quot;>Go home</a>' 
    }, 
    isDisplay: base => inputs.iHideDateBirth != '1' && base.display,
    events: { 
        'keypress.enter.once': () => console.log('Hooray, enter pressed!'), 
        'input.prevent': e => console.log(e.currentTarget.getAttribute('name'))
    }
}"></div>

<!--
Render an upload control and corresponding comment control.

1. iComment and iUpload are rendered with templates
2. iComment has max length of 250 and keyup handler to display remaining characters
3. iUpload is provided uploadEndpoint and template renders a button called iUploadUpload 
    that leverages IKaInputScope.uploadAsync
-->
<script>
    application.update({
        handlers: {
            processUpload: () => application.selectElement('.iUploadUpload').click(),
            textAreaCharCount: e => application.selectElement("#{id}_count").textContent = Math.max(0, 250 - e.currentTarget.value.length)
        }
    });
</script>
<div class="col-md-12">
    <div v-ka-input="{ 
        name: 'iComment', 
        template: 'input-textarea-nexgen', 
        label: 'Notes (250 character maximum) – you have <span id=\'{id}_count\'>250</span> characters remaining', 
        maxLength: 250, 
        events: { keyup: handlers.textAreaCharCount } 
    }"></div>
    <div v-ka-input="{ 
        name: 'iUpload', 
        template: 'input-fileupload-nexgen', 
        label: 'File Name', 
        uploadEndpoint: 'document-center/upload' 
    }"></div>
    <div class="mt-2">
        <a href="#" @click.prevent="handlers.processUpload" class='btn btn-primary'>
            <i class="fa-solid fa-upload"></i> Upload
        </a>
    </div>
</div>
```

#### v-ka-input Scope Samples

```html
<!--
The following uses all the scope properties except for list, maxLength, min, max, step, iconHtml and uploadAsync
-->
<template id="input-textbox-nexgen" input>
    <div v-if="display && !prefix && !suffix" 
        :class="['mb-3', css.container, { 'form-floating': !hideLabel, 'has-help': help.content }]">

        <input :value="value" :name="name" :id="id" :type="type" 
            :class="['form-control', name, css.input, { 'is-invalid': error, 'is-warning': warning }]" 
            :disabled="disabled" :placeholder="hideLabel ? '' : 'Fill'">

        <span 
            :class="['error-icon-hover-area', { 'd-none': !error && !warning, 'error': error, 'warning': warning }]" 
            :data-bs-content="error || warning || 'Error content'" 
            data-bs-toggle="tooltip" data-bs-placement="top"></span>
        <span 
            :class="['help-icon-hover-area', { 'd-none': !help.content }]" 
            :data-bs-width="help.width" :data-bs-content-selector="'#' + id + 'Help'" 
            data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>

        <label v-if="!hideLabel" :for="id" v-html="label"></label>

        <div class="d-none" v-if="help.content">
            <div :id="id + 'HelpTitle'" v-html="help.title"></div>
            <div :id="id + 'Help'" v-html="help.content"></div>
        </div>
    </div>

    <div v-if="display && (prefix || suffix)" class="mb-3" :class="{ 'has-help': help.content }">

        <div :class="`input-group tip-icon-wrapper ${css.container ?? ''}`">
            <span v-if="prefix" class="input-group-text">{{prefix}}</span>

            <div :class="hideLabel ? 'no-label' : 'form-floating'">
                <input :value="value" :name="name" :id="id" :type="type" 
                    :class="['form-control', name, css.input, { 'is-invalid': error, 'is-warning': warning }]" 
                    :disabled="disabled" :placeholder="!hideLabel ? 'Fill' : ''">
                <span 
                    :class="['error-icon-hover-area', { 'd-none': !error && !warning, 'error': error, 'warning': warning }]" 
                    :data-bs-content="error || warning || 'Error content'" data-bs-toggle="tooltip" data-bs-placement="top"></span>
                <span 
                    :class="['help-icon-hover-area', { 'd-none': !help.content }]" 
                    :data-bs-width="help.width" :data-bs-content-selector="'#' + id + 'Help'" 
                    data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>
                <label v-if="!hideLabel" :for="id" v-html="label"></label>
            </div>

            <span v-if="suffix" class="input-group-text">{{suffix}}</span>
        </div>

        <div class="d-none" v-if="help.content">
            <div :id="id + 'HelpTitle'" v-html="help.title"></div>
            <div :id="id + 'Help'" v-html="help.content"></div>
        </div>
    </div>
</template>

<!--
The following template uses same properties as above, but additionally uses the list property.
-->
<template id="input-dropdown-nexgen" input>
    <div 
        :class="['tip-icon-wrapper', css.container ?? 'mb-3', { 'form-floating': !hideLabel, 'has-help': help.content }]" 
        v-if="display">
        <select :name="name" :id="id" :disabled="disabled" :aria-label="label"
            :class="['form-select', name, css.input, { 'is-invalid': error, 'is-warning': warning }]">
            <option v-if="placeHolder != ''" value="">{{placeHolder || 'Select a value'}}</option>
            <option v-for="item in list" :key="item.key" :value="item.key" :selected="value == item.key">{{item.text}}</option>
        </select>
        <span 
            :class="['error-icon-hover-area', { 'd-none': !error && !warning, 'error': error, 'warning': warning }]" 
            :data-bs-content="error || warning || 'Error content'" 
            data-bs-toggle="tooltip" data-bs-placement="top"></span>
        <span 
            :class="['help-icon-hover-area', { 'd-none': !help.content }]" 
            :data-bs-content-selector="'#' + id + 'Help'" 
            data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>
        <label v-if="!hideLabel" :for="id" v-html="label"></label>
        <div class="d-none" v-if="help.content">
            <div :id="id + 'HelpTitle'" v-html="help.title"></div>
            <div :id="id + 'Help'" v-html="help.content"></div>
        </div>
    </div>
</template>

<!--
The following template uses most of the previous properties and additionally uses the min, max, and step properties
-->
<template id="input-slider-nexgen" input>
    <div :class="`mb-3 ${css.container}`" v-if="display">
        <div class="row">
            <div class="col fs-sm fw-bolder">
                <span v-html="label"></span>
                <span style="color: blue;" 
                    :class="['fa fa-regular fa-circle-question', { 'd-none': !help.content }]" 
                    :data-bs-width="help.width" :data-bs-content-selector="'#' + id + 'Help'" 
                    data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>
                <template v-html="iconHtml" v-ka-inline></template>
                <span 
                    :class="['fa fa-regular', { 
                        'd-none': !error && !warning, 
                        'error text-danger fa-circle-exclamation': error, 
                        'warning text-warning fa-triangle-exclamation': warning 
                    }]" 
                    :data-bs-content="error || warning || 'Error content'" 
                    data-bs-toggle="tooltip" data-bs-placement="top"></span>
            </div>
            <div ref="display" class="col-auto fs-sm fw-bolder text-end"></div>
        </div>
        <div class="pt-7 range-slider-wrap">
            <div ref="bubble" class="range-slider-bubble"><span ref="bubbleValue"></span></div>
            <input type="range" :class="['col range-slider', name, { 'is-invalid': error, 'is-warning': warning }]" 
                :name="name" :id="id" :min="min" :max="max" :step="step" :value="value">
        </div>
        <div class="d-none" v-if="help.content">
            <div :id="id + 'HelpTitle'" v-html="help.title"></div>
            <div :id="id + 'Help'" v-html="help.content"></div>
        </div>
    </div>
</template>
```

## v-ka-input-group

The `v-ka-input-group` directive is responsible for initializing groups of HTML inputs to be used in conjunction with the RBLe Framework calculations via synchronizing [`state.inputs`](./KatApp.03.State.md#istate-properties) and HTML inputs. It behaves the same as a [v-ka-input directive](#v-ka-input) except that all the properties on the model and scope are essentially array based to support whatever number of inputs the specified template supports.

**The `v-ka-input-group` directive can only be used when a `template` is assigned.**

Internally, KatApp Framework leverages the [`v-scope`](https://github.com/vuejs/petite-vue#petite-vue-only) directive to append 'input helper properties and methods' onto the 'global scope' object that can be used by the template.

- [v-ka-input-group Model](#v-ka-input-group-model) - Discusses the properties that can be passed in to configure the `v-ka-input` directive.
- [v-ka-input-group Scope](#v-ka-input-group-scope) - Discusses the properties that are exposed on the `v-ka-input-group` scope and can be used in Kaml View markup.
- [v-ka-input-group Samples](#v-ka-input-group-samples) - Examples illustrating the different properties that can be assigned on the `v-ka-input-group` model object.

See [v-ka-nomount](#v-ka-nomount) and [rbl-input Table](#rbl-input-table) to learn more about controlling whether or not the associated HTML input elements allow for the KatApp framework to wire up all automatic processing and information about the RBLe Framework `rbl-input` that can be used to automatically control many of the `v-ka-input` model properties.

### v-ka-input-group Model

The `IKaInputGroupModel` represents the model type containing the properties that configure the initialization of inputs and the returned [`v-ka-input-group` scope](#v-ka-input-group-scope). All properties of the `IKaInputGroupModel` will be present as *read only* properties with appropriate defaults on the scope. See the [v-ka-input-group Scope documentation](#v-ka-input-group-scope) for more information about default values provided.

Property | Type | Description
---|---|---
`names` | `Array<string>` | The array of `string` names representing each input in the gruop.  In RBLe Framework, input names start with lower case `i` and then the remaing part(s) is/are [Pascal Case](https://www.codingem.com/what-is-pascal-case/) (i.e. [`"iFirstName"`, `"iFirstName2"`]).
`template` | `string` | Return the [template](./KatApp.04.TemplateElements.md#html-content-template-elements) ID to be used to render group markup with the scope.  Unlike the `v-ka-input` model, here, `template` is required.
`type` | `string` | When the associated group of `HTMLInputElement`s `tageName=INPUT` (vs `SELECT` or `TEXTAREA`), you can provide a [type](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types).
`values` | `Array<string>` | The default values for the input group scope can be provided.  The values can also be provided via the `rbl-defaults.value` or the `rbl-input.value` RBLe Framework calculation value where the `id` is one of the values provided by `names`.
`labels` | `Array<string> \| string` | The labels to use for the input group scope can be provided.  The values can also be provided via the `rbl-value[id=='l' + name].value` or the `rbl-input.label` RBLe Framework calculation value where the `id/name` is one of the values provided by `names`.
`placeHolders` | `Array<string> \| string` | The [placeholders](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#placeholder) for the input group scope can be provided.  The values can also be provided via the `rbl-input.placeholder` RBLe Framework calculation value where the `id/name` is one of the values provided by `names`.
`hideLabels` | `Array<boolean> \| boolean` | An array of values for the input group scope determining whether the labels should be hidden can be provided. The values can also be provided via a RBLe Framework calculation value where the `id` is one of the values provided by `names`. If `rbl-input.label == '-1'`, the label will be hidden.
`helps` | `Array<{ title?: string; content: string; width?: number; }> \| { title?: string; content: string; width?: number; }` | Provide array of help configuration objects for contextual help.<br/><br/>For each 'help configuration' is provided, `content` is required and both `title` and `content` are HTML strings.<br/><br/>Values can also be provided via the RBLe Framework calculation.<br/>1. `title` via `rbl-value[id=='h' + name + 'Title'].value` or `rbl-input.help-title`.<br/>2.`content` via `rbl-value[id=='h' + name].value` or `rbl-input.help`.<br/>3. `width` via `rbl-input.help-width` (`width` is often used when leveraging [Bootstrap popovers](https://getbootstrap.com/docs/5.0/components/popovers/#options) to render the contextual help).
`css` | `Array<{ container?: string; input?: string; }> \| { container?: string; input?: string; }` | Provide array of css configuration objects that can be applied to the 'container' element or any 'inputs' for each input group item within a template markup.
`prefixes` |  `Array<string> \| string` | Provide an array of `prefixes` to the input group scope that could be displayed before the actual inputs (i.e. with Bootstrap [input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) markup).  The value can also be provided via the `rbl-input.prefix` RBLe Framework calculation value where the `id` is one of the values provided by `names`.
`suffixes` | `Array<string> \| string` | Provide an array of `suffixes` to the input group scope that could be displayed after the actual inputs (i.e. with Bootstrap [input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) markup).  The value can also be provided via the `rbl-input.suffix` RBLe Framework calculation value where the `id` is one of the values provided by `names`.
`maxLengths` | `Array<number> \| number` | Provide an array of `maxLengths` to the input group scope that could be used to limit the length of textual inputs.  The value can also be provided via the `rbl-input.max-length` RBLe Framework calculation value where the `id` is one of the values provided by `names`.
`displayFormats`<sup>1</sup> | `Array<string> \| string` | Provide an array of `displayFormats` to the input group scope that could be used to format a value before displaying it. This is currently used when the input types are `range`.
`mins` | `Array<number \| string> \| number \| string` | Provide an array of `mins` values to the input group scope that could be used to limit the minimum allowed value on `date` or `range` inputs.  The value can also be provided via the `rbl-input.min` RBLe Framework calculation value where the `id` is one of the values provided by `names`.
`maxes` | `Array<number \| string> \| number \| string` | Provide an array of `maxes` values to the input group scope that could be used to limit the maximum allowed value on `date` or `range` inputs.  The value can also be provided via the `rbl-input.max` RBLe Framework calculation value where the `id` is one of the values provided by `names`.
`steps` | `Array<number> \| number` | Provide an array of `steps` increment values to the input group scope that could be used to control the value increments for `range` inputs.  The value can also be provided via the `rbl-input.step` RBLe Framework calculation value where the `id` is one of the values provided by `names`.
`masks` | `Array<string> \| string` | Provide an array of input `mask` to apply during user input for text inputs.  The value can also be provided via the `rbl-input.mask` RBLe Framework calculation value where the `id` is one of the values provided by `names`.<br/><br/>The supported masks are:<br/>1. `phone`, `(###) ###-####`<br/>2. `zip+4`, `#####-####`<br/>3. `cc-expire`, `MM/YY`<br/>4. `email` (only permits letters, numbers, period, `@`, `_`, and `-`)<br/>5. A 'number' mask which verifies the input is entered as a currency value taking into consideration the current cultures decimal place separator.  You can control decimal places and whether or not it allows negative values.  The format is `[-]number[N]` where the `-` is optional to indicate negatives are allowed and the `N` is optional to specify the number of decimal places to allow.  By default, specifying only `number` results in positive only values and 2 decimal places.
`keyboardRegexs` | `Array<string> \| string` | Provide an array of regular expressions to evaluate during user input for text inputs.  This is to provide a simple, first line of defense against bad input, you can supply a regular expression to inputs via the keypressRegex(s) property that simply evaluates the keyboard input while the user types.  Full client/server validation should still be performed, this is simply a UI aid to guard 99% of users.  i.e. `\d` would only allow numerical input.<br/><br/>The property value is determined based on following precedence:<br/><br/>1. `rbl-input.keyboard-regex` RBLe Framework calculation value<br/>2. `model.keyboardRegex` property<br/>3. `undefined` if no value provided.
`ce` | `string` | Provide the CalcEngine key if all the values that automatically pull from RBLe Framework calculation values should use a CalcEngine *different from the default CalcEngine*.
`tab` | `string` | Provide the CalcEngine result tab name if all the values that automatically pull from RBLe Framework calculation values should use a tab name *different from the default tab specified for the associated CalcEngine*.
`isNoCalc`<sup>2</sup> | `((index: number, base: IKaInputGroupScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate to the input group scope that can be called to determine if an input should *not* trigger an RBLe Framework calculation.  The value can also be provided via the `rbl-skip.value` or `rbl-input.skip-calc` RBLe Framework calculation value where the `id` is one of the values provided by `names`.<br/><br/>**Note:** Additionally if any input or input ancestor has [`v-ka-rbl-no-calc`](#v-ka-rbl-no-calc) or [`v-ka-rbl-exclude`](#v-ka-rbl-exclude) in the class list, the calculation will not occur.
`isDisabled`<sup>2</sup> | `((index: number, base: IKaInputGroupScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate to the input group scope that can be called to determine if an input should be disabled.  The value can also be provided via the `rbl-disabled.value` or `rbl-input.disabled` RBLe Framework calculation value where the `id` is one of the values provided by `names`.
`isDisplay`<sup>2</sup> | `((index: number, base: IKaInputGroupScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate to the input group scope that can be called to determine if an input should be displayed.  The value can also be provided via the `rbl-display.value` or `rbl-input.display` RBLe Framework calculation value where the `id` is one of the values provided by `names`.
`events` | `IStringIndexer<((e: Event, application: KatApp) => void)>` | Provide a javascript object where each property is an event handler.  These event handlers will automatically be added to all the group `HTMLInputElement`s based on the property name.  The property name follows the same patterns as the [`v-on`](./KatApp.05.VueDirectives.md#v-on) directive (including [modifiers](./KatApp.05.VueDirectives.md#v-on-modifiers)).
`clearOnUnmount` | `boolean` | If `true`, when the inputs of an input group are removed from the DOM, the associated [`state.inputs`](./KatApp.03.State.md#istate-properties) values are also removed.

<sup>1</sup> The format should be valid a C# format string in the format of `{0:format}` where `format` is a format string described in one of the links below.

1. [Standard number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings)
1. [Custom number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-numeric-format-strings)
1. [Standard date format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-date-and-time-format-strings)
1. [Custom date format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings)

The value can also be provided via the combination of `rbl-sliders.format` and `rbl-sliders.decimals` or the `rbl-input.display-format` RBLe Framework calculation value where the `id` is one of the values provided by `names`. When the format comes from `rbl-sliders`, it will be turned into the string of `{0:format + decimals}` (i.e. {0:p2} if `format` was `p` and `decimals` was `2`).

<sup>2</sup> The `index` and `base` parameters passed into the delegate gives access to the associated `base.display(index)`, `base.disabled(index)`, and `base.noCalc(index)` properties configured by the default RBLe Framework calculation value processing described above in each property.  The `index` parameter can be used to know which 'item' of the group is being queried.

### v-ka-input-group Scope

The `IKaInputGroupScope` represents the type containing the properties and methods available to templates that use the `v-ka-input-group` directive. For the most part, it is a 'read only' version of the [`v-ka-input-group` model](#v-ka-input-group-model) object, with default functionality provided from RBLe Framework calculation results when needed.  Additionally, there are helper properties and methods available as well.  

**Since the input group is a 'group of items', almost all scope properties are functions that take a numerical `index` parameter and return the desired property.**

Property | Type | Description
---|---|---
`id` | `(index: number) => string` | Given an input index, gets the unique, generated `id` for the current input. This value *should* be used if an `id` attribute needs to be rendered on an `HTMLInputElement`.
`name` | `(index: number) => string` | Given an input index, gets the `name` (from the model `names[index]` array) to use for the current input.
`type` | `string` | Gets the [`type`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types) to use if the associated `HTMLInputElement`s ar an `INPUT` (vs `SELECT` or `TEXTAREA`).<br/><br/>Returns value based on following precedence:<br/>1. `model.type` property<br/>2. `text` if no value provided.
`value` | `(index: number) => string` | Given an input index, gets the default value to use for the input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.value` RBLe Framework calculation value<br/>2. `rbl-defaults.value` RBLe Framework calculation value<br/>3. `model.values[index]` property<br/>4. `""` if no value provided.
`disabled` | `(index: number) => boolean` | Given an input index, gets a value indicating the disabled state of the current input.<br/><br/>Returns value based on following precedence:<br/>1. `model.isDisabled` delegate property<br/>2. `rbl-input.disabled` RBLe Framework calculation value (if value is `1`)<br/>3. `rbl-disabled.value` RBLe Framework calculation value (if value is `1`)<br/>4. `false` if no value provided.
`display` | `(index: number) => boolean` | Given an input index, gets a value indicating the display state of the current input.<br/><br/>Returns value based on following precedence:<br/>1. `model.isDisplay` delegate property<br/>2. `rbl-input.display` RBLe Framework calculation value (if value is *not* `0`)<br/>3. `rbl-display.value` RBLe Framework calculation value (if value is *not* `0`)<br/>4. `true` if no value provided.
`noCalc` | `(index: number) => boolean` | Given an input index, gets a value indicating whether the current input should trigger a RBLe Framework calculation on 'change'.<br/><br/>Returns value based on following precedence:<br/>1. `model.isNoCalc` delegate property<br/>2. `rbl-input.skip-calc` RBLe Framework calculation value (if value is `1`)<br/>3. `rbl-skip.value` RBLe Framework calculation value (if value is `1`)<br/>4. `false` if no value provided.<br/><br/>**Note:** Additionally if any input or input ancestor has [`v-ka-rbl-no-calc`](#v-ka-rbl-no-calc) or [`v-ka-rbl-no-calc`](#v-ka-rbl-exclude) in the class list, the calculation will not occur.
`label` | `(index: number) => string` | Given an input index, gets the label to use for the input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.label` RBLe Framework calculation value<br/>2. `rbl-value[id='l' + name].value` RBLe Framework calculation value<br/>3. `model.labels[index]` property<br/>4. `""` if no value provided.
`hideLabel` | `(index: number) => boolean` | Given an input index, gets a value determining whether the label should be hidden or not.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.label` RBLe Framework calculation value (return `true` if `label == "-1"`)<br/>2. `model.hideLabels[index]` property<br/>3. `false` if no value provided.
`placeHolder` | `(index: number) => string \| undefined` | Given an input index, gets the placeholder to use for the input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.placeholder` RBLe Framework calculation value<br/>2. `model.placeHolders[index]` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates might want to know if `""` was assigned.  For example, a Bootstrap Floating `SELECT` might be rendered with a default empty, first element if `placeHolder != ""`.
`help` | `(index: number) => { title: string, content?: string; width: string; }` | Given an input index, gets the contextual help configuration to use for the input.<br/><br/>`title` value is based on following precedence:<br/><br/>1. `rbl-input.help-title` RBLe Framework calculation value<br/>2. `rbl-value[id='h' + name + 'Title'].value` RBLe Framework calculation value<br/>3. `model.help.title` property<br/>4. `""` if no value provided.<br/><br/>`content` value is based on following precedence:<br/><br/>1. `rbl-input.help` RBLe Framework calculation value<br/>2. `rbl-value[id='h' + name].value` RBLe Framework calculation value<br/>3. `model.help.content` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates might want show a contextual help icon or button based on presence of 'help' or not and it was easier to allow this property to be undefined to allow for `v-if="help.content"` type syntax to be used.<br/><br/>`width` value is based on following precedence:<br/><br/>1. `rbl-input.help-width` RBLe Framework calculation value<br/>2. `model.help.width` property<br/>3. `''` if no value provided. (`width` is often used when leveraging [Bootstrap popovers](https://getbootstrap.com/docs/5.0/components/popovers/#options) to render the contextual help).
`css` | `(index: number) => { input: string, container: string; }` | Given an input index, gets the CSS configuration to apply to the rendered `HTMLElement` considered the 'container' or 'input' for the specified template rendered input.<br/><br/><br/><br/>`container` value is based on following precedence:<br/><br/>1. `model.css.container` property<br/>2. `""` if no value provided.<br/><br/>`input` value is based on following precedence:<br/><br/>1. `model.css.input` property<br/>2. `""` if no value provided.
`list` | `(index: number) => Array<{ key: string; text: string; }>` | Given an input index, gets the array of items to use when the rendered input is built from a list.<br/><br/>Returns value based on following precedence:<br/>1. Get the RBLe Framework calculation table where the name is provided in `rbl-input.list`<br/>2. Get the RBLe Framework calculation table where the name is provided in `rbl-listcontrol.value`<br/>3. `[]` if no list is provided.
`prefix` | `(index: number) => string \| undefined` | Given an input index, gets the prefix to display *before* the rendered input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.prefix` RBLe Framework calculation value<br/>2. `model.prefixes[index]` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a prefix. This property is most often used with [Bootstrap input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) elements.
`suffix` | `(index: number) => string \| undefined` | Given an input index, gets the suffix to display *after* the rendered input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.suffix` RBLe Framework calculation value<br/>2. `model.suffixes[index]` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a suffix. This property is most often used with [Bootstrap input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) elements.
`maxLength` | `(index: number) => number` | Given an input index, gets the max length a textual input value can be; often used with `TEXTAREA` inputs.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.max-length` RBLe Framework calculation value<br/>2. `model.maxLengths[index]` property<br/>3. `250` if no value provided.
`min` | `(index: number) => string` | Given an input index, gets the min value allowed if the rendered input supports the concept of minimum value (i.e. `range` or `date` types).<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.min` RBLe Framework calculation value<br/>2. `model.mins[index]` property<br/>3. `""` if no value provided.
`max` | `(index: number) => string` | Given an input index, gets the max value allowed if the rendered input supports the concept of maximum value (i.e. `range` or `date` types).<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.max` RBLe Framework calculation value<br/>2. `model.maxes[index]` property<br/>3. `""` if no value provided.
`step` | `(index: number) => number` | Given an input index, gets the step increment value to use if the rendered input supports the concept of incremental steps (i.e. `range` types).<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.step` RBLe Framework calculation value<br/>2. `model.steps[index]` property<br/>3. `1` if no value provided.
`error` | `(index: number) => string \| undefined` | Given an input index, gets the error message associated with the current input from the [state.errors property](./KatApp.03.State.md#istate-properties). A value of `undefined` indicates no error.  The value can only by provided the [state.errors property](./KatApp.03.State.md#istate-properties).
`warning` | `(index: number) => string \| undefined` | Given an input index, gets the warning message associated with the current input from the [`state.warnings` property](./KatApp.03.State.md#istate-properties). A value of `undefined` indicates no warning.  The value can only by provided the `state.warnings` property.

### v-ka-input-group Samples

#### v-ka-input-group Model Samples

```html
<!-- 
Similar to 'v-ka-input Model Samples' except most properties are simply [] of whatever the property type was for v-ka-input Model.

If the template doesn't expect values for 'every' array position, the length of property arrays does *not* have to match
the number of elements in the names property. For example, below, the 'input-textbox-2col' template only uses the first label
when rendering the group, so only one element is required for both labels and helps.
 -->
<div class="col-8" v-ka-input-group="{ 
    template: 'input-textbox-2col', 
    names: ['iDateTerm1', 'iDateTerm2'], 
    labels: ['2 Col Date of Termination'], 
    helps: [ { content: 'Tricky, but add your date of term' } ], 
    events: { 
        'keypress.enter.once': () => console.log('Hooray, enter pressed!'), 
        'input': e => console.log(e.currentTarget.getAttribute('name')) 
    } 
}"></div>

<!-- See 'v-ka-input Model Samples' for more sample ideas. -->
```

#### v-ka-input-group Scope Samples

```html
<!--
Sample two column 'textbox' input.  Illustrates how to access scope properties via the property(index) syntax
-->
<template id="input-textbox-2col" input>
    <div v-if="display(0)">
        <label :for="id(0)" class="form-label">
            <span v-html="label(0)"></span> 
            <a v-show="help(0).content" 
                :data-bs-content-selector="'#' + id(0) + 'Help'" 
                data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top" role="button" tabindex="-1">
                <i class="fa-solid fa-circle-question text-blue"></i>
            </a>
        </label>
        <div class="d-none" v-if="help(0).content">
            <div :id="id(0) + 'HelpTitle'" v-html="help(0).title"></div>
            <div :id="id(0) + 'Help'" v-html="help(0).content"></div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div v-if="inputs.iScenarios > 1" class="d-block d-sm-none scenario-header-mobile m-1">Scenario 1</div>
                <div class="mb-3 tip-icon-wrapper">
                    <input :value="value(0)" :name="name(0)" :id="id(0)" :type="type" 
                        :class="['form-control', name(0), css(0).input, { 
                            'is-invalid': error(0), 
                            'is-warning': warning(0) 
                        }]" 
                        :disabled="disabled(0)" />
                    <span 
                        :class="['error-icon-hover-area', { 
                            'd-none': !error(0) && !warning(0), 
                            'error': error(0), 
                            'warning': warning(0) 
                        }]" 
                        :data-bs-content="error(0) || warning(0) || 'Error content'" 
                        data-bs-toggle="tooltip" data-bs-placement="top"></span>
                </div>
            </div>
            <div class="col-md-6" v-if="inputs.iScenarios > 1">
                <div class="d-block d-sm-none m-1 scenario-header-mobile">
                    <span>Scenario 2 </span>
                    <a href="#" @click.prevent="inputs.iScenarios = 1;  needsCalculation = true;" class="text-danger">
                        <i class="fa-light fa-square-xmark"></i>
                    </a>
                </div>
                <div class="mb-3 tip-icon-wrapper">
                    <input :value="value(1)" :name="name(1)" :id="id(1)" :type="type" 
                        :class="['form-control', name(1), css(1).input, { 
                            'is-invalid': error(1), 
                            'is-warning': warning(1) 
                        }]" 
                        :disabled="disabled(1)" />
                    <span 
                        :class="['error-icon-hover-area', { 
                            'd-none': !error(1) && !warning(1), 
                            'error': error(1), 
                            'warning': warning(1) 
                        }]" 
                        :data-bs-content="error(1) || warning(1) || 'Error content'" 
                        data-bs-toggle="tooltip" data-bs-placement="top"></span>
                </div>
            </div>
        </div>
    </div>
</template>
```

## v-ka-navigate

The `v-ka-navigate` directive is responsible initiating a 'page navigation' within the Host Environment.

### v-ka-navigate Model

The `IKaNavigateModel` represents the model type containing the properties that configure how a `v-ka-navigate` behaves when clicked.

The `v-ka-navigate` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the navigation instructions only needs to provide a Kaml view name to the directive, the following can be used.

```html
<!-- The following examples are equivalent -->
<div v-ka-navigate="Channel.Home"></div>
<div v-ka-navigate="{ view: 'Channel.Home' }"></div>
```

Property | Type | Description
---|---|---
`view` | `string` | The name of the Kaml View to navigate to.
`confirm` | [`IModalOptions`](./KatApp.07.Api.md#imodaloptions) | If a confirmation dialog should be displayed to prompt the user whether or not to allow the navigation, the options for the dialog can be provided.
`inputs` | [`ICalculationInputs`](./KatApp.07.Api.md#icalculationinputs) | If inputs should be passed to the KatApp being navigated to, an `ICalculationInputs` object can be provided.
`ceInputs`<sup>1</sup> | `string` | Some CalcEngines return an key/value space delimitted string of inputs in their result tables with the intention of those values being passed in as a representation of `ICalculationInputs`.
`persistInputs` | `boolean` | Whether or not to persist the inputs in sessionStorage.  If `true` and the user navigates away from current view and comes back the inputs will automatically be injected into the KatApp.  If `false` and the user navigates away and returns the input values will not longer be present. The default value is `false`.
`model` | `string` | If the *entire* `IKaNavigateModel` parameter is being provided by a CalcEngine via a valid 'JSON string', this property can be assigned in place of using all the above individual properties.
`clearDirty` | `boolean` | Can control whether or not the applications `state.isDirty` property should be set to `false` before navigation.

<sup>1</sup> `ceInputs` is a way to pass a string configuration of inputs from a CalcEngine result.

```javascript
row: {
    inputs: "iFirstName=\"John\" iLastName=\"Doe\""
}
```

```html
<a href="#" v-ka-navigate="{ otherProps: otherValues, inputs: { iMiddleInitial: 'C' }, ceInputs: row.inputs }">Click Here</a>
```

When navigating, then inputs sent would be:

```javascript
inputs: {
    iFirstName: "John",
    iLastName: "Doe",
    iMidleInitial: "C"
}
```


## v-ka-template

The `v-ka-template` directive is responsible for manually rendering a template with or without a data source. The data source can be a simple javascript object or it can be an array of data (usually obtained via [rbl.source()](./KatApp.03.State.md#istaterblsource)).  When the source is an `Array<>`, the template can get access to this property via the scope's `rows` properties.

- [v-ka-template Model](#v-ka-template-model) - Discusses the properties that can be passed in to configure the `v-ka-template` directive.
- [v-ka-template Scope](#v-ka-template-scope) - Discusses how/which properties are exposed on the `v-ka-template` scope and can be used in Kaml View markup.  See [Scopes with Properties that are Reactive](#scopes-with-properties-that-are-reactive) for information on how to define the `source` property when information is reactive (i.e. a custom source defining a `rows` property that changes via new calculation results).
- [v-ka-template Samples](#v-ka-template-samples) - Examples illustrating different scenario usages for `v-ka-template` directive.

### v-ka-template Model

The model passed to the requested template configures the [`v-ka-template` scope](#v-ka-template-scope) that is available to the template.

The `v-ka-template` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the model only needs to provide a template name to the directive, the following can be used.

```html
<!-- The following examples are equivalent -->
<div v-ka-template="summary-template"></div>
<div v-ka-template="{ name: 'summary-template' }"></div>
```

Property | Type | Description
---|---|---
`name` | `string` | Provides the name of the template to render.
`source` | `any \| Array<ITabDefRow>` | Provides the scope that is available to the template to be rendered.

### v-ka-template Scope

The scope available to templates used within the `v-ka-template` directive is simply a variation of the object that was provided in the  `model.source` property.  

Property | Type | Description
---|---|---
`rows` | `Array<ITabDefRow>` | If the model `source` is of type `Array<ITabDefRow>`, the `rows` property contains all the array specified by the `model.source`.  
`application` | [`IKatApp`](./KatApp.07.Api.md#ikatapp) | Added for easier access to the application object while in Kaml View markup.
`modalAppOptions` | [`IModalAppOptions`](./KatApp.07.Api.md#imodalappoptions) | When the current Kaml View is being hosted as a modal application, added for easier access to the application object while in Kaml View markup.
`$renderId` | `string` | Unique identifier for this template's rendered output to aid in selection scoping.
`source` Properties | `any` | If the model `source` is **not** of type `Array<ITabDefRow>`, the exact object passed in from `model.source` is treated as the scope and any defined public properties are available to the template.

#### Scopes with Properties that are Reactive

If the scope could change due to reactivity (i.e. a calculation or javascript changes the array), the `model.source` property **must** be written as a [javascript getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) or the scope will not participate in reactivity.

Note: If the `source` property of the `v-ka-template` scope is simply an `Array<>`, the KatApp framework will automatically make it reactive.

```html
<!--
    The KatApp framework will automatically make this template reactive.
-->
<div v-ka-template="{ name: 'templateName', source: rbl.source( 'resultTable', r => r.field == '1' ) }"></div>

<!--
    When a custom source scope is built, the 'source' property of the scope must be reactive:
        get source() { return { ... }; }

    Additionally, any part of the scope that must be reactive must be written as a getter:
        get rows() { return rbl.source( 'resultTable', r => r.field == '1' ); }
-->
<div v-ka-template="{ name: 'templateWithCustomSource', get source() { return { staticProp: true, get rows() { return rbl.source( 'resultTable', r => r.field == '1' ); } } } }"></div>
```

### v-ka-template Samples

```html
<!-- Template where the model.source is an array, so the template iterated through the 'rows' property -->
<ul class="dropdown-menu dropdown-menu-lg-end" 
    v-ka-template="{ name: 'more-menu-links', source: rbl.source('contentContextLinks') }"></ul>

<template id="more-menu-links">
    <li v-for="link in rows">
        <a v-if="( link.modalModel || '' ) == ''" 
            class="dropdown-item d-flex justify-content-between align-items-start me-3" 
            v-ka-navigate="{ view: link.viewID }">
            {{link.text}} <i :class="['fa-light fs-6 link-primary align-self-center', link.linkIcon]"></i>
        </a>
        <a v-if="( link.modalModel || '' ) != ''" 
            class="dropdown-item d-flex justify-content-between align-items-start me-3" 
            v-ka-modal="{ model: link.modalModel }">
            {{link.text}} <i :class="['fa-light fs-6 link-primary align-self-center', link.linkIcon]"></i>
        </a>
    </li>
</template>
```

```html
<!-- 
1. Same as above where the model.source is an array
2. Demonstrates how the 'scope' to the template takes into account parent scope.  The 'type' iteration item 
    from 'typeMessage' table is expected in the template.  The template uses both the 'type' iteration item 
    and its own 'message' iteration item.
-->
<div v-for="type in rbl.source('typeMessage')">
    <div v-ka-template="{ 
        name: 'notice-type1', 
        source: rbl.source('messages', 'Messages').filter( r => r.type == type.type ) 
    }"></div>
</div>

<template id="notice-type1">
    <div v-for="message in rows" :class="'alert alert-' + type.alertType">
        <div class="d-flex w-100 justify-content-between d-none">
            <h4 class="alert-heading mb-1 d-flex align-content-center text-dark">
                <i :class="'fa-light me-2 ' + type.icon"></i> {{type.text}}
            </h4>
        </div>
        <p class="mb-1 fw-bold text-dark"><i :class="'fa-light me-1 ' + type.icon"></i>{{message.title}}</p>
        <small v-html="message.message"></small>
        <div class="text-center border-top border-secondary mt-2 pt-2" v-if="message.linkText!=''">
            <a class="link-dark" v-ka-navigate="{ view: message.linkDest }">
                <i class="fa-light fa-circle-chevron-right me-1"></i><span v-html="message.linkText"></span>
            </a>
        </div>
    </div>
</template>

<!-- 
    To add to this sample, below is a complex version performing the same way where the model 
    is manually constructed (including the type row and the Array<ITabDefRow> rows property) 
    where the type row is not part of the RBLe Framework results.

    Additionally, it shows the syntax for making a javascript getter for the rows property.
-->
<div v-ka-template="{ 
    name: 'notice-type1', 
    source: { 
        type: { icon: 'fa-triangle-exclamation', text: '', alertType: 'danger' }, 
        get rows() { return rbl.source('messages', 'Messages').filter( r => r.id == 'hw-action-enroll' ); } 
    } 
}"></div>
```

```html
<!-- Calling a template without a data source, the template is just accessing the global scope (errors/warnings) directly -->
<div v-ka-template="validation-summary"></div>

<template id="validation-summary">
    <div v-if="errors.length > 0" :id="kaId + '_ModelerValidationTable'" 
        class="validation-summary alert alert-danger" 
        role="alert" title="Please review the following issues:">
        <p><b><i class="fa-duotone fa-circle-exclamation"></i> Please review the following issues:</b></p>
        <ul>
            <li v-for="error in errors" v-html="error.text"></li>
        </ul>
    </div>
    <div v-if="warnings.length > 0" :id="kaId + '_ModelerWarnings'" 
        class="validation-warning-summary alert alert-warning" 
        role="alert" title="Please review the following warnings:">
        <p><b><i class="fa-duotone fa-triangle-exclamation"></i> Please review the following warnings:</b></p>
        <ul>
            <li v-for="warning in warnings" v-html="warning.text"></li>
        </ul>
    </div>
</template>
```

```html
<!-- Call a template with a custom data source object, the model properties are access directly -->
<div v-ka-template="{ 
    name: 'confirm-danger', 
    source: { 
        selector: 'delete-confirm', 
        message: 
            '<p>Do you want to delete this HSA transaction?</p>' + 
            '<p>If you delete this transaction, you will not be making a one-time contribution to your HSA.</p>' + 
            '<p>Are you sure you want to delete this transaction?</p>' 
    } 
}"></div>

<template id="confirm-danger">
    <div :class="['d-none align-items-center', selector]">
        <div class="d-flex align-items-center h6">
            <i class="fa-solid fa-circle-exclamation fa-2x text-danger"></i>
            <span class="p-2" v-html="message"></span>
        </div>
    </div>
</template>
```

## v-ka-api

The `v-ka-api` directive allows Kaml Views to set up links that will automatically call an api endpiont in the Host Environment.  Internally, the directive simply passes information to a [IKatApp.apiAsync](./KatApp.07.Api.md#ikatappapiasync) method call.

### v-ka-api Model

The `IKaApiModel` represents the model type containing the properties that configure how a `v-ka-api` link behaves when clicked.

Property | Type | Description
---|---|---
`endpoint` | `string` | The api endpoint to submit to.
`confirm` | [`IModalOptions`](./KatApp.07.Api.md#imodaloptions) | If a confirmation dialog should be displayed to prompt the user whether or not to allow the api submission, the options for the dialog can be provided.
`calculationInputs` | [`ICalculationInputs`](./KatApp.07.Api.md#icalculationinputs) | Often when an api endpoint is submitted to in a Host Environment that leverages the RBLe Framework, an `iValidate=1` RBL calculation is the first action performed on the server.  This calculation can do UI validations or provide instructions to the Host Environment on what type of actions it should take.  All the inputs from the UI are always submit, but if additional inputs should be passed to the endpoint, an `ICalculationInputs` object can be provided.
`apiParameters` | `IStringAnyIndexer` | Some endpoints require parameters that are processed in the server code of the Host Environment.  These parameters are technically not different from `ICalculationInputs`, but providing them as a second parameter accomplishes a few things.<br/><br/>1. The value type of each parameter can be more than just `string`, supporting `boolean`, `number` or a nested object with its own properties.<br/>2. If all the parameters are of type `string`, even though technically not different from the `calculationInputs` property, using `apiParameters` eliminates parameters from being passed to a RBL calculation.<br/>3. Finally, it simply segregates 'intent' of the parameters versus the inputs.  Parameters are intended to be used by the api endpoint server code while inputs are intended to be used by the RBL calculation.
`isDownload` | `boolean` | If the api endpoint being posted to will return binary content representing a download, setting this flag to true tells the KatApp framework to process the results differently and save the generated content as a downloaded .
`files` | [`FileList`](https://developer.mozilla.org/en-US/docs/Web/API/FileList) | If the api endpoint being submitted to accepts file uploads, this property can be set (usually from a `input type="file"` element).
`calculateOnSuccess` | `boolean \| ICalculationInputs` | If after a successful submission to an api endpoint, the KatApp Framework should automatically trigger a RBLe Framework Calculation, `calculateOnSuccess` can be set.  Setting the value to `true` indicates that a calculation should occur.  Setting the value to a `ICalculationInputs` object also indicates that a calculation should occur and additionally pass along the inputs provided.  See [v-ka-api Model Samples](#v-ka-api-model-samples) for more information.
`thenAsync` | `(response: IStringAnyIndexer \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if an api submission is successful, the `thenAsync` property solves that problem.  See [v-ka-api Model Samples](#v-ka-api-model-samples) for more information.
`catchAsync` | `(e: any \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if an api submission failed, the `catchAsync` property solves that problem.  See [v-ka-api Model Samples](#v-ka-api-model-samples) for more information.<br/><br/>If no `catchAsync` is provided and an api endpoint fails, the response will simply be logged by the KatApp framework.

### v-ka-api Model Samples

```html
<!-- 
Submit to a estimate generation endpoint, and on success, run a calculation on 
the client side passing in iRefreshAfterEstimate = 1 
-->
<a v-ka-api="{ endpoint: 'generate/estimate', calculateOnSuccess: { iRefreshAfterEstimate: '1' } }">Submit
```

```html
<!-- 
Submit to a estimate generation endpoint, and on success, run a calculation on 
the client side passing in iRefreshAfterEstimate = 1 
-->
<a v-ka-api="{ 
    endpoint: 'generate/estimate', 
    thenAsync: ( response, application ) => console.log(`Estimate was successful and responded with ${response}`) 
}">Submit
```

```html
<!-- Submit to a estimate generation endpoint, and on failure log the response -->
<a v-ka-api="{ 
    endpoint: 'generate/estimate', 
    catchAsync: ( e, application ) => console.log(`Estimate failed: ${e}`) 
}">Submit
```

## v-ka-modal

The `v-ka-modal` directive can be used to launch a modal dialog rendering static HTML markup or a separate Kaml View.  Internally, the directive delegates calls to the [IKatApp.showModalAsync](./KatApp.07.Api.md#ikatappshowmodalasync) method.

**Note:** Every KatApp Framework modal rendered uses a `selector` value of `kaModal`.  Therefore, Kaml View developers can always get a reference to a modal KatApp via `KatApp.get('.kaModal')` in the browser console.

### v-ka-modal Model

The `IKaModalModel` represents the model type containing the properties that configure how a `v-ka-modal` link and modal application behaves. The `IKaModalModel` interface extends the [`IModalOptions` interface](./KatApp.07.Api.md#imodaloptions), therefore on extended properties will be documented in this section, please review `IModalOptions` for a list of inherited properties available.

Property | Type | Description
---|---|---
`model` | `string` | If the *entire* `IKaModalModel` parameter is being provided by a CalcEngine via a valid 'JSON string', this property can be assigned in place of using all the individual properties.
`currentTarget` | `string \| HTMLElement \| undefined` | If the modal needs to reference a specific DOM element as the current target, this property can be assigned; disabled during processing and assigned focus when modal closes.
`beforeOpenAsync` | `(hostApplication: KatApp) => Promise<void>` | When a modal is displayed using the [IModalOptions.contentSelector](./KatApp.07.Api.md#imodaloptions) property, at times it is necessary to update the content dynamically before rendering the modal.  This event enables the host application to update reactive model properties before rendering the modal.  See [v-ka-modal Model Samples](#v-ka-modal-model-samples) for more information.
`confirmedAsync` | `(response: any \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if modal dialog is 'confirmed', the `confirmedAsync` property solves that problem.  See [v-ka-modal Model Samples](#v-ka-modal-model-samples) for more information.
`cancelledAsync` | `(response: any \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if modal dialog is 'cancelled', the `cancelledAsync` property solves that problem. See [v-ka-modal Model Samples](#v-ka-modal-model-samples) for more information.
`catchAsync` | `(e: any \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if generating a modal dialog fails, the `catchAsync` property solves that problem. See [v-ka-modal Model Samples](#v-ka-modal-model-samples) for more information.<br/><br/>If no `catchAsync` is provided and generating a modal dialog fails, the response will simply be logged by the KatApp framework.
`closed` | `(application: KatApp) => void` | If the Kaml View needs to provide a delegate to run after a modal dialog regardless of how it is closed, this delegate can be used.

### v-ka-modal Model Samples

```html
<a v-ka-modal="{ 
    view: 'Common.Acknowledgement', 
    confirmedAsync: ( response, application ) => console.log(`Dialog was confirmed with ${response}`) 
}">Submit</a>
```

```html
<a v-ka-modal="{ 
    view: 'Common.Acknowledgement', 
    cancelledAsync: ( response, application ) => console.log(`Dialog was cancelled with ${response}`) 
}">Submit</a>
```

```html
<!-- Submit to a estimate generation endpoint, and on failure log the response -->
<a v-ka-modal="{ 
    view: 'Common.Acknowledgement', 
    catchAsync: ( e, application ) => console.log(`Acknowledgement dialog unable to display: ${e}`) 
}">Submit</a>
```

```html
<div v-for="name in ['John', 'Sally']">
	<a v-ka-modal="{ 
		contentSelector: '.modalContent',
		beforeOpenAsync: () => model.name = name 
		
	}">Show Modal for {{name}}</a>
</div>

<div class="d-none modalContent">
	Saying hello to {{model.name}} from the modal!
</div>
```

## v-ka-app

The `v-ka-app` directive can be used to nest a separate KatApp within the body of a host KatApp.  The nested KatApp calculation results, inputs, etc. are all isolated within scope of the KatApp and can not access or communicate with the host application except through the [`options.hostApplication` property](./KatApp.07.Api.md#ikatappoptions) and the [IKatApp.notifyAsync](./KatApp.07.Api.md#ikatappnotifyasync) method.

### v-ka-app Model

The `IKaAppModel` represents the model type containing the properties that configure how a `v-ka-app` application behaves.

Property | Type | Description
---|---|---
`view` | `string` | The Kaml View to render inside the nested KatApp.
`selector` | `string` | If provided, a selector `string` that is used to identify that KatApp.  This property aids in debugging by allowing Kaml View developers to type in `KatApp.get({selector})` in a browser console to get a reference to their KatApp.
`inputs` | `ICalculationInputs` | If inputs should be passed to the rendered nested application's Kaml View, provide a `ICalculationInputs` object.

## v-ka-table

The `v-ka-table` directive is responsible for creating HTML tables automatically from the calculation results.

- [v-ka-table Model](#v-ka-table-model) - Discusses the properties that can be passed in to configure the `v-ka-table` directive.
- [v-ka-table Result Table Columns](#v-ka-table-result-table-columns) - Discusses how konwn RBLe result table columns are processed to automatically render a table.
- [v-ka-table colgroup Processing](#v-ka-table-colgroup-processing) - Discusses how a `v-ka-table` colgroup is built from results.
- [v-ka-table Header Rows](#v-ka-table-header-rows) - Explains how to identify RBLe Calculation result rows as 'header' rows and when they appear in `thead` versus `tbody`.
- [v-ka-table Automatic Column Spanning](#v-ka-table-automatic-column-spanning) - Explains when automatic column spanning occurs in the rendered table.
- [v-ka-table Manual Column Spanning](#v-ka-table-manual-column-spanning) - Explains how the RBLe CalcEngine can control column spanning in each row via the `span` column.
- [v-ka-table Column Widths](#v-ka-table-column-widths) - Describes the different ways the RBLe CalcEngine can control column widths of the table.
- [v-ka-table Row Processing](#v-ka-table-row-processing) - Explains the logic used when generating the `tr` HTML element to append to the table.

### v-ka-table Model

The `IKaTableModel` represents the model type containing the properties that configure how a `v-ka-table` will render.

The `v-ka-table` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the table to be rendered only needs to provide a table name to the directive, the following can be used.

```html
<!-- The following v-ka-table examples are equivalent -->
<div v-ka-table="resultTable"></div>
<div v-ka-table="{ name: 'resultTable' }"></div>
```

Property | Type | Description
---|---|---
`name` | `string` | The name of the RBLe Framework result table to process.
`css` | `string` | If provided, `css` is the css that should be applied to the rendered `<table>` element.  If not provided, `table table-sm table-hover` is applied.<br/><br/>Note that css names of `rbl` and `model.name` are always applied.
`ce` | `string` | If the RBLe Framework results to process is not part of the default Kaml View CalcEngine, a CalcEngine key can provided.
`tab` | `string` | If the RBLe Framework results to process is not part of the default result tab (`RBLResult`), a tab name can provided.
`source` | `Array<ITabDefRow>` | Instead of providing a `name` of a RBLe Framework result table to process, an `Array<ITabDefRow>` can be provided directly to the directive.  This is useful when the data to render in the table is not coming from the RBLe Framework, comes from 'host application' or if the data is being manipulated before rendering.

### v-ka-table Result Table Columns

In addition to the rules for all [result tables](./KatApp.08.RBLeFramework.md#rble-framework), all tables rendered by `v-ka-table` elements use the rules described below. Simply put, only columns starting with `text` or `value` are rendered, however, there are flags, columns, or names available for use that control how results are generated and returned for each table from the CalcEngine.

Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Location&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description
---|---|---
id | Column Name | Used to detect 'header' rows.
code | Column Name | Same rules as id column for rendering 'header' rows.
class | Column Name | Optional CSS class to apply to the table row (`tr` element).
span | Column Name | Optional column to use to define column spanning within the row.
textX | Column Name | Render content with `text {table}-{column}` CSS class. `text` by default causes left alignment.
valueX | Column Name | | Render content with `value {table}-{column}` CSS class. `value` by default causes right alignment.
width<br/>r-width | Row ID | If you want explicit control of column widths via absolute or percentage, values can be provided here.  `r-width` is used when the table has a CSS class of `table-responsive` applied.
width-xs<br/>width-sm<br/>width-md<br/>width-lg | Row ID | If you want explicit control of column widths via bootstrap column sizes, values can be provided here.  **Note:** If any bootstrap viewport width is provided, the `width` column is ignored.
class | Row ID | Similar to the `class` Column, to provide a class on a specific column, provide a row with `id` set to `class`, then for each column in this row, provide a class that will be applied to a column for _every_ row rendered.

### v-ka-table colgroup Processing

The first row returned by the `model.name` table is used to build the `colgroup` element inside the `table` element.  For each `text*` and `value*` column it generates a `col` element as`<col class="{table}-{column}">`.  Additional width processing is desribed in the [v-ka-table Columns Widths](#v-ka-table-column-widths) section.

### v-ka-table Header Rows

The `id` and `code` columns are used to detect header rows.  Row ids do _not_ have to be unique.  However, the only time they possibly shouldn't be unique is when they are identifying header rows.  Otherwise, you cannot guarantee selecting the proper row if used in a selector path.  If the `id`/``code` column is `h`, starts with `hdr` or starts with `header`, then the cell element will be a `th` (header), otherwise it will be a `td` (row).

All 'header' rows processed before the _first_ non-header row is processed will be placed inside the `thead` element, after which, all remaining rows (data and header) will be placed inside the `tbody` element. If the row is a 'header' row contained within the `tbody` element, a `h-row` class will be applied to the `tr` element.

### v-ka-table Automatic Column Spanning

For header rows, if only one column has a value and all others are blank, the single column is automatically spanned across the entire table.

### v-ka-table Manual Column Spanning

The `span` column is used to define column spanning in the format of `columnName:spanCount[:columnName:spanCount]`

Each span definition is a column name followed by a colon and how many columns to span. If you need to control more than one grouping of spans, you can put as many definitions back to back separated by colons as needed.

Additionally, when a column span definition is processed, the resulting table cell has an additional CSS class of `span-{table}-{column}`.

**Examples**  
Span `text1` all three columns in a three cell table: `text1:3`  
Span `text1` 1 column and `value1` 2 columns in a three cell table: `text1:1:value1:2`

**Note:** When using the `span` column, the total number of columns spanned/configured must equal the total number of columns in the table even if the span configuration directs several columns to 'span' only one column (which is counter intuitive since that really isn't 'spanning').

**Example:**  
If you have table with columns `text1`, `value1`, `value2`, and `value3` and you want `text1` to span the first two columns and then `value2` and `value3` render their contents appropriately, the following applies to the span column:

_Wrong:_ `text1:2` - setting this will only generate one cell spanning two columns, but leaving the third and fourth columns unrendered.

_Correct:_ `text1:2:value2:1:value3:1` - you must explicitly set all columns for the row. The sum of columns by this configuration is four which equals the total number of columns in the table.  

### v-ka-table Column Widths

Column widths can be provided in three ways.  Absolute width, percentage width, or bootstrap class widths.  If **any** bootstrap class widths are provided, or if the `data-css` attribute provided for a table contains `table-responsive`, then bootstrap widths are used.  Otherwise, the `width` column is used and is deemed a percentage if the value ends with a `%` sign.

**Absolute or Percentage Widths**
When using absolute or percentage widths, the `width` value is applied to the `col` element inside the `colgroup`.

```html
<!-- 
  foundingfathers: [{ 
        id: "header", 
        text1: "First", 
        @text1: { width: "100" }, 
        text2: "Last", 
        @text2: { width: "200" }, 
        value1: "DOB",
        @value1: { width: "100" }
    }, ...
    ]
-->
<colgroup>
    <col class="foundingfathers-text1" width="100px">
    <col class="foundingfathers-text2" width="200px">
    <col class="foundingfathers-value1" width="100px">
</colgroup>
```

**Bootstrap Widths**
When using bootstrap widths, the `width` value is applied to the `col` element inside the `colgroup` and on every row.

```html
<!-- 
  foundingfathers: [{ 
        id: "header", 
        text1: "First", 
        @text1: { xs-width: "12", lg-width="3" }, 
        text2: "Last", 
        @text2: { xs-width: "12", lg-width="3" }, 
        value1: "DOB",
        @value1: { xs-width: "12", lg-width="3" }
    }, ...
    ]
-->
<colgroup>
    <col class="foundingfathers-text1 col-xs-12 col-lg-3">
    <col class="foundingfathers-text2 col-xs-12 col-lg-3">
    <col class="foundingfathers-value1 col-xs-12 col-lg-3">
</colgroup>
```

### v-ka-table Row Processing

In addition to the header row, spanning, and column width processing described above, the final step is to render a HTML table rows and cells.  For each row returned in the specified table source a `tr` element is created.  Then for each column in that row whose name starts with `text` or `value`, a `td` or `th` element is created and the value along with the appropriate css classes described in [v-ka-table Result Table Columns](v-ka-table-Result-Table-Columns).

## v-ka-chart

The `v-ka-chart` directive is responsible for creating HTML/javascript based chart objects (leveraging SVG creation on browser canvas) from the calculation results.

- [v-ka-chart Model](#v-ka-chart-model) - Discusses the properties that can be passed in to configure the `v-ka-chart` directive.
- [v-ka-chart Table Layouts](#v-ka-chart-table-layouts) - Discusses the tables in the RBLe CalcEngine used to render a chart.
- [v-ka-chart Options](#v-ka-chart-configuration) - Discusses configuration options supported by the KatApp framework.

### v-ka-chart Model

The `IKaChartModel` represents the model type containing the properties that configure how a `v-ka-chart` will render.

The `v-ka-chart` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the chart to be rendered only needs to provide a `data` and, optionally, an `options` name to the directive, the following can be used.

```html
<!-- The following v-ka-chart examples are equivalent -->
<div v-ka-chart="PayChart"></div>
<div v-ka-chart="{ data: 'PayChart' }"></div>

<!-- The following v-ka-chart examples are equivalent -->
<div v-ka-highchart="PayChart.PieOptions"></div>
<div v-ka-highchart="{ data: 'PayChart', options: 'PieOptions' }"></div>
```

Property | Type | Description
---|---|---
`data` | `string` | The *partial* name of the RBLe Framework result table providing the 'data' to the chart.  This value will be translated into `Highcharts-{model.data}-Data` when retrieving results from the calculation.
`mode` | `('chart' \| 'legend')?` | What the directive should render.  By default, it renders a SVG chart *and* html legend (unless CalcEngine options turns off).  If the default rendering and positioning does not work, `mode` can be used to render only what is needed.  If provided, the `legend.show` option is ignored.
`from` | `number?` | If provided, the chart will be sliced to only show the range of categories.  If not provided, all categories will be shown.  This is useful when lots of categories are available and client will render multiple charts with different ranges to display 'all' data (or to change the range of data shown without the need of a re-calculation).  **Note**: `from` and `to` must be provided together.
`to` | `number?` | If provided, the chart will be sliced to only show the range of categories.  If not provided, all categories will be shown.  This is useful when lots of categories are available and client will render multiple charts with different ranges to display 'all' data (or to change the range of data shown without the need of a re-calculation). **Note**: `from` and `to` must be provided together.
`legendItemSelector` | `string?` | If provided, rendered legend needs to have `.ka-chart-legend-{name.toLower()}` class.  Then each item needs to have `ka-chart-highlight-key="{series.name}"` attribute.  Each 'text' element containing info that should be opaque needs to be provided via selector (i.e. `div.legend-hover`).
`maxHeight` | `number?` | If provided, the charts height will be restricted to the specified number of px.
`breakpoints` | `object` | If any breakpoints are provided, the primary chart will be wrapped with appropriate bootstrap classes to make it render, then based on provided breakpoints, rendering will be done appropriately based on bootstrap classes.  On the breakpoints object, `xs`, `sm`, `md`, `lg`, and `xl` are supported.  Each of these properties are optional and are of type [`IKaChartModelBreakpoint`](#v-ka-chart-breakpoint-model).  
`ce` | `string` | If the RBLe Framework results to process is not part of the default Kaml View CalcEngine, a CalcEngine key can provided.
`tab` | `string` | If the RBLe Framework results to process is not part of the default result tab (`RBLResult`), a tab name can provided.

### v-ka-chart Breakpoint Model

The `IKaChartModelBreakpoint` represents the model type containing the properties that configure how a breakpoint chart will render.

Property | Type | Description
---|---|---
`maxHeight` | `number?` | If provided, the charts height will be restricted to the specified number of px in given breakpoint.  Default is `model.maxHeight`.
`categories` | `number?` | The number of categories to show per chart (multiple charts will be rendered to display all categories with equal scaling).  Default is all categories.
`fontMultiplier` | `number?` | If provided, the multiplier to use on all chart fonts.  Default is CalcEnging option `.fontMultiplier` ?? `1.0`.  This is useful when there is a wide aspect ratio for the chart and fonts become too small to read in small breakpoints.


### v-ka-chart Table Layouts

Primarily, the tables used to produce SVG charts in a Kaml view are self contained and have both configuration options and data provided in the same table.  There are capabilities to provide a set of [shared options](#v-ka-chart-option-tables) to be used by more than one chart if necessary.

#### v-ka-chart Table

Provides the data and configuration to build the chart.  Chart tables have `id`, `value`, and `dataN` columns.

Column | Description
---|---
`id` | Identifies the purpose of the row.<br/><br/>`type` - (required) Indicates that the `value` column will contain the chart type to render.<br/><br/>`options` - (optional) If shared options are available, provide the table name here.<br/><br/>`category` - (required) Identifies the row as 'data' and typically represents an entry on xAxis when applicable.  Exceptions to this are when it made more sense to have multiple `data*` columns for each piece of data so that they could be configured with corresponding configuration rows (`text`, `color`, etc.).  For example, `pie`, `donut`, and `column` type charts wouldn't normally have multiple `dataN` columns but it was easier to control configuration.<br/><br/>`text`, `color`, `shape` - (required) Core setting id's.  For each series/data element, provide label, color, and shape (when applicable).<br/><br/>All other IDs - Specify optional configuration settings to use during chart creation.  See [v-ka-chart Configuration](#v-ka-chart-configuration) for more information on supported settings.
`value` | Provide value for applicable rows.  For configuration settings, it contains the value to use.  For `category` rows, it is the label of the xAxis item.  Any other scenarios do not use this column.
`dataN` | Typically aligns with 'series', but for charts with 'single series' of data, to make it easier to assign configuration values, in those cases, each `dataN` column is a 'single value' to be plotted.  At time of writing, `pie`, `donut` and `column` are examples of these types of 'single series' charts that use multiple `dataN` columns.

#### v-ka-chart Option Tables

The tables used to produce shared chart options are simply 'key/value pair' tables.  If present, `chartOptions` is the 'global' options used on all charts.  Additionally, a CalcEngine can specify an option table to use via the `options` setting provided in the chart table.

The precedence of chart options is discovered in following order:

1. Value provided in the [data table](#v-ka-chart-table).
1. Value provided in the options table specified via `options` setting (if provided).
1. Value provided in the global `chartOptions` table (if provided).

Column | Description
---|---
id | The name of the option.  Can be a `period` delimitted key that matches the object hierarchy (i.e. `dataLabels.format`) or the property name of the object when the value provides a complete json string representing the object.
value | The value of the option.  See [v-ka-chart Configuration](#v-ka-chart-configuration) for supported settings.

### v-ka-chart Configuration

The following options are supported by the KatApp framework.  Configuration values can be specified with an `id` that has a `.` delimitted key that matches the object hierarchy (i.e. `dataLabels.format`) or a complete json string representing the object.  Note that both the full object json string can be provided and then any other properties specifically provided via delimited `.` will complete/override the configuration for the object.

As an example, if the following configuration rows were provided (order of rows in CalcEngine do not affect processing).

id | value
---|---
dataLabels | `{ "show": true, "format": "c0" }`
dataLabels.format | `c2`

Processing would be:
1. The `dataLabels` object would be created with `show` set to `true` and `format` set to `c0`.
2. The `dataLabels.format` would be set to `c2` and override the previous value of `c0`.

Below, all supported options (fully `.` delimited) are listed.

id | Type | Description
---|---|---
`type` | `string` | `value` will contain the type of chart to render.  Currently supported types are `column`, `columnStacked`, `donut` and `sharkfin`.<br/><br/>**`dataN` Specific Types** - For `columnStacked` charts, a series can be of two additional types specific to the rendering of this chart.<br/>1. `line` makes the series render as a line as is *not* included in the stacking (or totalling of a stack).<br/>2. `tooltip` makes the stack transparent (invisible) and its value is *only* included in the tooltip (excluded from the legend as well).
`options` | `string` | If provided, `value` will contain the name of a table containing shared options to be used for this chart.  This is useful when multiple charts are rendered and they share the same options (i.e. colors, fonts, etc.).
`text`<sup>1</sup> | `string` | Each `dataN` column will contain the label to use for this data entity.
`color`<sup>1, 5</sup> | `string` | Each `dataN` column will contain the color to use for this data entity.  Colors should be specified in hex format.
`shape`<sup>1</sup> | `string` | `value` will contain the default shape for every `dataN` column (`square` by default) to use for this data entity in tooltips (if applicable) and generated legend (if applicable).  To change individual shapes, each `dataN` column can contain the shape.  Currently supported shapes are `circle` and `square`.
`aspectRatio` | `string` | `value` contains aspect ratio of the chart.  Default is `1:1` (square).  Changing the aspect ratio of the chart affects font rendering sizes and may require the use of `font.multiplier`.  The aspect ratio is specified as a string in the format of `width:height` (i.e. `16:9`, `4:3`, etc.).  The aspect ratio is used to determine the width and height of the SVG `viewBox`.<br/><br/>For wide aspect ratios of column charts that have lots of columns/categories rendered making the chart render 'breakpoint charts' the entire json string can be provided to give aspect ratios for each breakpoint.  For example, `{ "value": "2.5:1", "xs": "1.38:1" }` would use `value` property for all renderings other than the `xs` breakpoint which would use `1.38:1`.
`dataLabels.show` | `boolean` | `value` indicates whether or not to show data labels on column charts.  Default is `false`.
`dataLabels.format`<sup>2</sup> | `string` | `value` specifies format to use for rendering of any formatted numbers (i.e. data labels, `aria-label` attributes, donut label, etc.).  Default is `format`
`donut.labelFormatter`<sup>3</sup> | `string?` | `value` contains a string format to use as the label with substitution tokens that will be replaced when rendered.
`font.multiplier` | `number` | `value` contains the multiplier to use on all chart fonts.  Default is `1.0`.  This is useful when there is a wide aspect ratio for the chart and fonts become too small to read.
`format`<sup>2</sup> | `string` | `value` contains the default format to use for all unspecified format string configurations (i.e. `dataLabels.format`).  Default is `c0`.
`highlight.series.hoverItem` | `boolean` | `value` indicates whether or not to highlight the series when hovering over the series.  Default is `true` when `type != 'column' && type != 'donut'`.
`legend.show` | `boolean` | `value` indicates whether or not to show the legend.  Default is `false`.
`pie.startAngle` | `number` | `value` contains the starting angle of the pie or donut chart.  Default is `0`.
`pie.endAngle` | `number` | `value` contains the ending angle of the pie or donut chart.  Default is `360`.
`tip.show` | `boolean` | `value` indicates whether or not to show tooltips.  Default is `true`.
`tip.headerFormatter`<sup>4</sup> | `string?` | `value` contains a string format to use as the header with substitution tokens that will be replaced when rendered.
`tip.includeShape` | `boolean` | `value` indicates whether or not to include the shape in the tooltip.  Default is `true`.
`tip.includeTotal` | `boolean` | `value` indicates whether or not to include the total in the tooltip.  Default is `true` when `type != 'column' && type != 'donut'` and `dataLabels.show = false`.
`sharkfin` | `json` | When `type` is `sharkfin`, the `sharkfin` property is shorthand configuration to generate appropriate `plotBand` and `plotLine` configuration for the chart.  The `sharkfin` property is a json string that contains the following properties:<br/><br/>`color` - The color of the plot band to create.<br/>`retirementAge` - The value used for the plot line and the `to` value of the plot band.
`xAxis.label` | `string?` | `value` contains the label to use for the entire xAxis.
`xAxis.plotBand` | `json` | `value` contains a json string representing the plot band configuration to use to generate a xAxis plot band.  There can be more than one `xAxis.plotBand` specified when multiple bands are needed.<br/><br/>Plot bands have the following properties supported.  Note that the `from` and `to` properties are in `0.5` increments with `0` being the center of the first column and incrementing by `1` for the center of each column thereafter.  To make a band from the left edge of chart all the way through the first column, `from` would be `-0.5` and `to` would be `0.5`.<br/><br/>	`label.text` - The text to show on the plot band.<br/>`label.textXs` - The text to show on the plot band for xs breakpoint.<br/>`color` - The color of the plot band.<br/>`from` - The starting value of the plot band.<br/>`to` - The ending value of the plot band.
`xAxis.plotLine` | `json` | `value` contains a json string representing the plot line configuration to use to generate a xAxis plot line.  There can be more than one `xAxis.plotLine` specified when multiple lines are needed.  See the footnote for supported properties.<br/><br/>Plot lines have the following properties supported.  Note that the `value` property is in `0.5` increments with `0` being the center of the first column and incrementing by `1` for the center of each column thereafter.<br/><br/>`label.text` - The text to show on the plot line.<br/>`label.textXs` - The text to show on the plot line for xs breakpoint.<br/>`color` - The color of the plot line.<br/>`value` - The location/value of the plot line.
`yAxis.label` | `string?` | `value` contains the label to use for the entire yAxis.
`yAxis.tickCount` | `string?` | `value` contains the number of ticks to render on the yAxis.  The default is `5` ticks.

<sup>1</sup> Usually each `dataN` column represents a series, but can be single value for 'single series charts' as well.

<sup>2</sup> See [Standard number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings#standard-format-specifiers) and [Custom number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-numeric-format-strings) for possible format values.  These format strings are processed into settings that can be used by the [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#options) object.

<sup>3</sup> The available tokens for `donut.labelFormatter` are `{total}` and all the `{dataN}` columns.  Note, each value will have been formatted with `dataLabels.format`.

<sup>4</sup> Currently, the only support token for `tip.headerFormatter` is `{x}` which will be replaced with the xAxis value (i.e. category).  This is useful when the xAxis value is an age, but the header should be something like `Savings at Age {x}`.

<sup>5</sup> If `color` is provided in the global `chartOptions` table, `value` will contain a `,` delimitted list of colors to use for the chart if not specified in the standard options.  The number of colors provided must be equal to or greater than the number of `dataN` columns to render.

## v-ka-highchart

The `v-ka-highchart` directive is responsible for creating HTML/javascript based chart objects (using the Highcharts API) from the calculation results.  There are three types of chart information rows returned from CalcEngines: KatApp specific `config-*` option rows, chart and series option rows (with `id` matching the names of [Highcharts API](https://api.highcharts.com/highcharts/) properties), and data rows to be used as the chart data source.

- [v-ka-highchart Model](#v-ka-highchart-model) - Discusses the properties that can be passed in to configure the `v-ka-highchart` directive.
- [v-ka-highchart Table Layouts](#v-ka-highchart-table-layouts) - Discusses the three tables in the RBLe CalcEngine used to render the chart.
- [v-ka-highchart Custom Options](#v-ka-highchart-custom-options) - Discusses custom options processed by RBLe Framework that do *not* map directly to HighCharts options.
- [v-ka-highchart Standard Options](#v-ka-highchart-standard-options) - Discusses the standard options processed by RBLe Framework that *map directly* to Highcharts options.
- [v-ka-highchart Custom Series Options](#v-ka-highchart-custom-series-options) - Discusses custom series options processed by RBLe Framework that do *not* map directly to Highcharts series options.
- [v-ka-highchart Standard Series Options](#v-ka-highchart-standard-series-options) - Discusses the standard options processed by RBLe Framework that *map directly* to Highcharts series options.
- [v-ka-highchart Series Data Options](#v-ka-highchart-series-data-options) - Explains how to set properties on individual data points for each series.
- [v-ka-highchart Property Value Parsing](#v-ka-highchart-property-value-parsing) - Explains how the RBLe Framework parses values from the CalcEngine to convert them into Highcharts property values.
- [v-ka-highchart Language Support](#v-ka-highchart-language-support) - Explains how to control the UI culture/localization of the chart.
- [v-ka-highchart Format String Examples](#v-ka-highchart-format-string-examples) - Examples of common 'format strings' used in Highcharts.

### v-ka-highchart Model

The `IKaHighchartModel` represents the model type containing the properties that configure how a `v-ka-highchart` will render.

To see all the options available for charts and series, please refer to the [Highcharts API](https://api.highcharts.com/highcharts/)

The `v-ka-highchart` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the chart to be rendered only needs to provide a data and, optionally, an options name to the directive, the following can be used.

```html
<!-- The following v-ka-highchar examples are equivalent -->
<div v-ka-highchart="PayChart"></div>
<div v-ka-highchart="{ data: 'PayChart', options: 'PayChart' }"></div>

<!-- The following v-ka-highchar examples are equivalent -->
<div v-ka-highchart="PayChart.PayOptions"></div>
<div v-ka-highchart="{ data: 'PayChart', options: 'PayOptions' }"></div>
```

Property | Type | Description
---|---|---
`data` | `string` | The *partial* name of the RBLe Framework result table providing the 'data' to the chart.  This value will be translated into `Highcharts-{model.data}-Data` when retrieving results from the calculation.
`options` | `string` | The *partial* name of the RBLe Framework result table providing the 'options' for the chart.  This value will be translated into `Highcharts-{model.options}-Options` when retrieving results from the calculation. If not provided, the `model.data` property will be used.<br/><br/>By default, all 'option values' come from the table with the name of `Highcharts-{model.data}-Options`.  The CalcEngine developer may provide overrides to these values using the `Highcharts-Overrides` table.
`ce` | `string` | If the RBLe Framework results to process is not part of the default Kaml View CalcEngine, a CalcEngine key can provided.
`tab` | `string` | If the RBLe Framework results to process is not part of the default result tab (`RBLResult`), a tab name can provided.

### v-ka-highchart Table Layouts

The tables used to produce Highcharts in a Kaml view are mostly 'key/value pair' tables.  The three tables in use are `Highcharts-{Model.options}-Options`, `Highcharts-{Model.name}-Data`, and `Highcharts-Overrides`.  Note that if `model.Options` is not provided, `Model.name` will be used as the 'name' for both the options and the data table.

#### v-ka-highchart Options Table

Provides the options used to build the chart.  Either [Custom Options](#v-ka-highchart-Custom-Options) or [Standard Options](#v-ka-highchart-Standard-Options).  If the option name starts with `config-`, it is Custom ResultBuilder Framework option, otherwise it is a standard Highcharts option.  If it is a [standard option](#v-ka-highchart-Standard-Options), it is a `period` delimitted key that matches the Highcharts API object hierarchy.

Column | Description
---|---
key | The name of the option.
value | The value of the option.  See [Property Value Parsing](#v-ka-highchart-Property-Value-Parsing) for allowed values.

#### v-ka-highchart Data Table

Provides the data and _series configuration_ to build the chart.  If the category name starts with `config-`, it is a row that provides [Standard Highchart Series Options](#v-ka-highchart-standard-series-options) for each series in the chart, otherwise, the category name represents the data values for each series in the chart.

Column | Description
---|---
category | Either a series configuration 'key' (see [Custom](#v-ka-highchart-custom-series-options) and [Standard](#v-ka-highchart-standard-series-options) series options), data category/name or X-Axis value for the current data point.  For all charts, `category` is used in the `id` property of the data point in the format of `seriesN.category` (which is helpful for [chart annotations](https://api.highcharts.com/highcharts/annotations)).  For charts of type `pie`, `solidgauge`, `scatter3d` or `scatter3d`, `category` is the 'name' used for each category and, it is part of the `id` _and_ it is used for the 'name' of the data point, which is leveraged by the built in label formatter.
seriesN | A column exists for each series in the chart to provide the 'value' of that series for the current row (i.e. `series1`, `series2`, and `series3` for a chart with three series).
point.seriesN.propertyName | Custom data point properties to be applied for each data point.  `seriesN` should match desired series' column name and `propertyName` should match an available property name for the chart's data points.  See [series](https://api.highcharts.com/highcharts/series) documentation and look at the `data` array property for each series type to learn more about available properties for each chart type.
plotLine | Provide [plot line information](https://api.highcharts.com/highcharts/xAxis.plotLines) for the given data row.  The value is in the format of `color\|width\|offset`.  `offset` is optional and just renders the plotline offsetted from the current row by the provided value.
plotBand | Provide [plot band information](https://api.highcharts.com/highcharts/xAxis.plotBands) for the given data row.  The value is in the format of `color\|span\|offset`.  `span` is either `lower` meaning the band fills backwards, `upper` meaning it fills forwards, or a number value for how many X-Axis values to span.  `offset` is optional and just renders the plotline offsetted from the current row by the provided value.

#### v-ka-highchart Override Table

Similar to [v-ka-highchart Options Table](#v-ka-highchart-Options-Table), this table provides the options used to build the chart, but it overrides any option `keys` matching the original `Highcharts-{Model.options}-Options` table.  This is useful if several charts have the same values for the majority of the properties and use the same `Highcharts-{Model.options}-Options` table as a base setup.  Then you can provide overrides for each property that varies from the shared options setup.

Column | Description
---|---
id | The name of the chart whose values will be overridden.  `id` needs to match the `Model.options` value.
key | The name of the option.
value | The value of the option.  See [Property Value Parsing](#v-ka-highchart-Property-Value-Parsing) for allowed values.

### v-ka-highchart Custom Options

There are some configuration options that are explicitly handled by the ResultBuilder Framework, meaning, they do not map to the Highcharts API.

Configuration&nbsp;Setting | Description
---|---
config&#x2011;style | By default, the Highcharts template has no style applied to the `<div class="chart chart-responsive"></div>` element.  If, the CalcEngine wants to apply any CSS styles (i.e. height and width), the config-style value
config&#x2011;tooltipFormat | When tooltips are enabled, there is a default `tooltip.formatter` function provided by KatApps where this value provides the template to apply a `string.format` to.  For example `<b>{x}</b>{seriesDetail}<br/>`<br/><br/>The available substitution tokens are `x` (current X-Axis value), `stackTotal` (sum of all Y-Axis values at this current `x` value), and `seriesDetail` (list of all Y-Axis points in format of `name: value`).  For more information see [tooltip.formatter API](https://api.highcharts.com/highcharts/tooltip.formatter) and [Property Value Parsing](#v-ka-highchart-property-value-parsing).

### v-ka-highchart Standard Options

Standard chart option names provided by `key` columns are a `period` delimitted value meant to represent the Highcharts API object hierarchy.  

For example, given:
id | value
---|---
chart.title.text | My Chart


The following Hicharts configuration would be created:

```javascript
{
    chart: {
        title: {
            text: "My Chart"
        }
    }
}
```

If the Highcharts API object property is an array, you can set specific array elements as well using an `[]` syntax.  

For example, given:
id | value
---|---
plotOptions.pie.colors[0] | Red
plotOptions.pie.colors[1] | Blue

<br/>
The following Hicharts configuration would be created:

```javascript
{
    plotOptions: {
        pie: {
            colors: [
                "Red",
                "Blue"
            ]
        }
    }
}
```

Another example assigning [annotations](https://api.highcharts.com/highcharts/annotations):

For example, given:

id | value
---|---
annotations[0].labels[0] | json:{ point: 'series1.69', text: 'Life Exp' }

<br/>
The following Hicharts configuration would be created:

```javascript
{
    annotations: [
        {
            labels: [
                { 
                    point: 'series1.69', 
                    text: 'Life Exp' 
                }
            ]
        }
    ]
}
```

### v-ka-highchart Custom Series Options

There are some configuration options that are explicitly handled by the ResultBuilder Framework for Highchart series, meaning, they do not map to the Highcharts API.

Series options are created by having a row in the `Highcharts-{rbl-chartdata}-Data` table with a `category` column value starting with `config-`.  Then the values in every `seriesN` column in the row represent the configuration setting for _that_ series.

Configuration&nbsp;Setting | Description
---|---
config&#x2011;visible | You can disable a series from being processed by setting its `config-visible` value to `0`.
config&#x2011;hidden | Similar to `config-visible` except, if hidden, the series is _processed_ in the chart rendering, but it is not displayed in the chart or the legend.  Hidden series are essentially only available for tooltip processing.
config&#x2011;format | Specify a format to use when display date or number values for this series in the tooltip.  See Microsoft documentation for available [date](https://docs.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings) and [number](https://docs.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings) format strings.

<br/>

An example of how these might look in a CalcEngine result table.

category | series1 | series2 | series3 | series4
---|---|---|---|---
config&#x2011;visible | 1 | 1 | 1 | 0
config&#x2011;hidden | 0 | 0 | 1 | 1
config&#x2011;format | c2 | c2 | c2 | c2

<br/> 

This table would result a chart with `series1`, `series2`, and `series3` being processed.  `series3` would not be visible in the chart or legend, but would be displayed in the tooltip.  Each of the processed series would display values in $0.00 format.

### v-ka-highchart Standard Series Options

In addition to the Custom Series Options, if you need to apply any Highcharts API options to the series in the chart, you accomplish it in the following manner.

Configuration&nbsp;Setting | Description
---|---
config-* | Every row that starts with `config-` but is not `config-visible`, `config-hidden` or `config-format` is assumed to be an option to assign to the Highcharts API for the given series.  `*` represents a `period` delimitted list of property names.  See [Standard Options](#v-ka-highchart-Standard-Options) for more information on API property naming.

Example of settings used for KatApp Sharkfin Income chart.

category | series1 | series2 | series3 | series4 | series5 | series6
---|---|---|---|---|---|--
config&#x2011;name | Shortfall | 401(k) Plan | Non Qualified Savings Plan | HSA | Personal Savings | Retirement Income  Needed
config&#x2011;color | #FFFFFF | #006BD6 | #DDDDDD | #6F743A | #FD9F13 | #D92231
config&#x2011;type | areaspline | column | column | column | column | spline
config&#x2011;fillOpacity | 0 |||||			
config&#x2011;showInLegend | 0 | 1 | 1 | 1 | 1 | 1

<br/>

The following Hicharts configuraiton would be created:

```javascript
{
    series: [
        {
            name: "Shortfall",
            color: "#FFFFFF",
            type: "areaspline",
            fillOpacity: 0,
            showInLegend: 0,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "401(k) Plan",
            color: "#006BD6",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "Non Qualified Savings Plan",
            color: "#DDDDDD",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "HSA",
            color: "#6F743A",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "Personal Savings",
            color: "#FD9F13",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "Retirement Income Needed",
            color: "#D92231",
            type: "spline",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        }
    ]
}
```

See [series](https://api.highcharts.com/highcharts/series) documentation to learn more about available series properties for each chart type.

### v-ka-highchart Series Data Options

In addition to options set directly on a series itself, there are times when options need to be set individiually on each data value in the series (i.e. color, radius, etc.).  See [`series.line.data`](https://api.highcharts.com/highcharts/series.line.data) for an example, but each chart/series type may have its own specific set of properties that can be assigned on data values.  To assign those properties, columns are added to the 'data' table in the format of `point.seriesX.property` where `seriesX` matches the series column header and `property` is the name of the configuration property.  `point` is a hard coded string indicating that this is a 'data' configuration value.

Example of settings colors for a pie chart.

category | series1 | point.series1.color
---|---|---
config&#x2011;name | score
config&#x2011;type | type
config&#x2011;innerSize | 50%
score | 43 | green
nonScore | 57 | #eeeeee

### v-ka-highchart Property Value Parsing

Value columns used to set the Highcharts API option values allow for several different formats of data that are then converted into different types of properties values.

Value&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | API&nbsp;Value&nbsp;Type | Description
---|---|---
`blank` or `null` | `undefined` | If no value or value of `null` (case insensitive) is returned, `undefined` will be assigned to the property value.
numeric | numeric | If the value returned can be parsed into a number, a numeric value will be assigned to the property value.
`true` or `false` | boolean |  If a value of `true` or `false` (case insensitive) is returned, a `boolean` value will be assigned to the property value.
`json:{ name: value }` | object | If a value starting with `json:` is returned, the json text will be parsed and the resulting object will be assigned to the property value.
`resource:key` | string | If a value starting with `resource:` is returned, the resource information will be passed to [getLocalizedString](./KatApp.07.Api.md#ikatappgetlocalizedstring) and the resulting string will be assigned to the property value.
`eval [1,2]` | any | If a value starting with `eval ` is returned, the text following the `eval` prefix is _parsed and evaluated_ as Javascript and the resulting value (can be any type) is assigned to the property value.  In the example shown here, an integer array of `[1,2]` would be assigned to the property.  Assigning properties of type array are most common use of this syntax.
`function () { ... }` | function: any | For API properties that can be assigned a function, if a value starting with `function ` is returned, it will be parsed as a valid function and assigned to the property.

### v-ka-highchart Language Support

The 'culture' of the table can be set via the CalcEngine.  If the results have a `variable` row with `id` of 'culture', then the language preference will be set to the `value` column of this row.  This enables culture specific number and date formatting and is in the format of `languagecode2-country/regioncode2`.  By default, `en-US` is used.

### v-ka-highchart Format String Examples

Highcharts has two mechanisms for customizing the rendering of data in charts.  There are `*Format` [template strings](https://www.highcharts.com/docs/chart-concepts/templating) and `*Formatter` callback functions that can be used when the template strings are not sufficient.

> Highcharts supports templating in format strings. Since v11.1 (2023) the templates support logic, and are generally recommended over formatter callbacks when the configuration needs to be secure and JSON compatible. The Highcharts templating style is inspired by well-proven languages like Handlebars and Mustache, but is more focused on numeric operations since charting is all about numeric data.

The issue with using the `*Formatter` versions to customize the rendering is that when the Highcharts chart is rendered on the server, all functionality might not be supported, therefore it is recommended to use the `*Format` template strings when possible.  One custom property that is available to the rendering of Highcharts is the `options.lang.currencySymbol` property.  This is not a built-in Highcharts property, but is a custom property that injected via Camelot framework and is used to render currency symbol in the charts when displaying labels such as `stackLabels`, `xAxis`, `yAxis`, etc.

Property | Template String | Sample Output
---|---|---
`yAxis.stackLabels.format` | `{axis.chart.options.lang.currencySymbol} {total:,.2f}` | `$1,234.56`
`yAxis.labels.format` | `{chart.options.lang.currencySymbol} {value:,.2f}` | `$1,234.56`
`tooltip.pointFormat` | `<span style="color:{point.color}">●</span> {series.name}: <b>{series.chart.options.lang.currencySymbol} {point.y:,.2f}</b><br/>` | `● Series XYZ: $1,234.56`

## v-ka-attributes

The `v-ka-attributes` directive is a helper directive that takes a key/value space delimitted `string` of attributes to apply to the current element.

```javascript
row: {
    "id": "123",
    attributes: "data-show=\"profile1\" data-context=\"profile\""
}
```

```html
<div v-ka-attributes="row.attributes"></div>
<!-- Renders... -->
<div data-show="profile1" data-context="profile"></div>
```

## v-ka-needs-calc

The `v-ka-needs-calc` directive helps brige the gap between UI 'button state' and the RBLe Framework calculations and can be applied to `button` or `a` elements.  Inputs typically do not trigger a calculation until the `change` event (which normally triggers when an input loses focus).  When a screen has a series of inputs, then a submit button at the bottom, often users will fill in the last input value, then 'attempt' to click the submit button.

Attempt is in quotes because when the user 'thinks' they click the button, they actually trigger the `change` event of the last input (the currently active input) which triggers a calculation.  Most Kaml Views will have some sort of UI blocker that enables during calculation and this will 'block' the users click attempt.  So it appears to the user as though they have to click twice to make the submit function correctly.

A worse scenario is when a page with inputs and a submit button *also display calculation results* that are providing the user information to confirm before submitting the transaction.  With the same flow, when the user edits the last input but has not triggered the `change` event via a loss of focus, the 'information' on the screen is out of sync with the input values, however, the user may assume that the information is accurate and is attempting to submit based on the information displayed.  Most likely the 'two clicks to function' scenario described above will occur, but the user may not notice that the 'information' has updated after the calculation and simply clicks on the submit again.

To aleviate this issue, the Kaml Views can decorate 'submit buttons' with a `v-ka-needs-calc` attribute which will ultimately take advantage of the [state.needsCalculation](./KatApp.03.State.md#istate-properties) property.  The directive can be applied with or without a value.  When a value is provided, it is the label of the 'cloned button' (otherwise `Refresh` is the default label).  An example will better illustrate this.

```html
<a v-ka-needs-calc href="#" class="btn btn-primary btn-sm" @click.prevent="console.log('save inputs')">Save Inputs</a>

<!-- 
    KatApp Framework Changes this to:
    1. Adds v-if="!needsCalculation" and removes the v-ka-needs-calc attribute
    2. Clones the element 
        a. Removes any @click.* events 
        b. Assigns the 'text' of the button
        c. Adds v-if="needsCalculation"
 -->
<a v-if="!needsCalculation" href="#" class="btn btn-primary btn-sm" @click.prevent="console.log('save inputs')">Save Inputs</a>
<a v-if="needsCalculation" href="#" class="btn btn-primary btn-sm">Refresh</a>
```

After KatApp Framework has created the required directives and elements, when a user is on a form and 'edits' an input, but has not triggered a `change` event yet, the `needsCalculation` property will be true, so the original 'submit button' will be removed, while the cloned element (that is just a place holder to hint to the user to click so that a calculation is run) is displayed.  Given the label says `Refresh` it is more apparent to the user that they will trigger a calculation and review the results before clicking submit.

```html
<a v-ka-needs-calc="Click to Refresh" href="#" class="btn btn-primary btn-sm" 
    @click.prevent="console.log('save inputs')">Save Inputs</a>

<!-- When a value is provided in the directive, that text is used as the label of the button -->
<a v-if="!needsCalculation" href="#" class="btn btn-primary btn-sm" @click.prevent="console.log('save inputs')">Save Inputs</a>
<a v-if="needsCalculation" href="#" class="btn btn-primary btn-sm">Click to Refresh</a>
```

## v-ka-inline

The `v-ka-inline` directive is responsible for taking HTML markup and rendering it 'inline' without any container element.  

Normally to render HTML, a Kaml View would use `<div v-html="row.html"></div>`.  The problem with this is that the `div` container will be rendered and that may not be allowed based on current HTML or CSS rules.  The other way to attempt to render content without a container is to simply sprinkle the `v-text` shorthand syntax of `{{ row.html }}` in the Kaml View.  The problem with this approach, as stated earlier, is that `v-text` will HTML encode the content instead of rendering raw markup. 

The use of `v-ka-inline` directive can solve this problem.  This directive has no content.  Simply decorate an element with the directive name. Using `v-ka-inline` is especially useful when the HTML string to render is a HTML table row (`<tr>`) which must be direct descendant of `<tbody>`, `<thead>`, or `<tfoot>` but those elements are manually coded in the Kaml View markup and the CalcEngine only returns one or more `<tr>` HTML strings.

```javascript
// Assuming the following iteration row
row: {
    html: "<p>Working at Conduent is <b>awesome</b>!</p>"
}
```

```html
<template v-for="row in rbl.source('ret-estimate-outputs')">
    <div v-html="row.html"></div>
</template>
<!-- Renders following but we don't want the div wrapper. -->
<div><p>Working at Conduent is <b>awesome</b>!</p></div>

<template v-for="row in rbl.source('ret-estimate-outputs')">
    {{ row.html }}
</template>
<!-- Renders following but the html is encoded. -->
&lt;p&gt;Working at Conduent is &lt;b&gt;awesome&lt;/b&gt;!&lt;/p&gt;

<template v-for="row in rbl.source('ret-estimate-outputs')">
    <div v-html="row.html" v-ka-inline></div>
</template>
<!-- Renders -->
<p>Working at Conduent is <b>awesome</b>!</p>

<!-- Can be used on <template> elements too -->
<template v-for="row in rbl.source('ret-estimate-outputs')">
    <template v-html="row.html" v-ka-inline></template>
</template>
<!-- Renders -->
<p>Working at Conduent is <b>awesome</b>!</p>
```

## v-ka-rbl-no-calc

The `v-ka-rbl-no-calc` directive is a 'marker' directive (no model/attribute value) that can be assigned to any HTML element to indicate that any contained inputs should not trigger a RBLe calculation on change.  Inputs typically trigger a calculation on the `change` event (which normally triggers when an input loses focus).  If all RBLe calculations should be supressed until an entire form is completed and a 'submit button' is clicked, then `v-ka-rbl-no-calc` can be applied.

To trigger the calculation manually, the [`IKatApp.calculateAsync`](./KatApp.07.Api.md#ikatappcalculateasync) method will need to be called.

The `v-ka-rbl-no-calc` directive has the same effect as the [`IKaInputModel.isNoCalc` property](#v-ka-input-model) when it returns `true`.

```html
<!-- Don't trigger a calculation when inputs change.  Wait until the 'Use Values' button is clicked and the 'closeWorksheetAsync' manually triggers 'calculateAsync' -->
<div class="card" v-ka-rbl-no-calc>
	<div class="card-header"><h4 class="card-title">Advanced Annual Future Pay Increase Rates</h4></div>
	<div class="card-body">
		<div class="row">
			<div v-ka-input="{ name: 'iPayIncreaseYear1', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate1', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseYear2', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate2', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div class="col-12">
				<button @click.prevent="model.worksheet = undefined" type="button" class="btn btn-primary btn-default">Cancel</button>
				<button @click.prevent="handlers.closeWorksheetAsync" type="button" class="btn btn-primary btn-default">Use Values</button>
			</div>
		</div>
	</div>
</div>
```

## v-ka-rbl-exclude

The `v-ka-rbl-no-calc` directive is a 'marker' directive (no model/attribute value) that can be assigned to any HTML element to indicate that any contained inputs should not trigger a RBLe calculation on change **and** should never be submitted to an RBLe calculation.  

The `v-ka-rbl-exclude` directive has the same effect as the [`IKaInputModel.isExcluded` property](#v-ka-input-model) when it returns `true`.

```html
<!-- 
	All inputs below are *not* associated with RBLe.  They do not trigger a calc nor are they passed to any RBLe calculation.  This scenario occurs
	when Kaml Views are doing all input/UI logic via javascript/reactivity and do not need any logic/calculation provided from CE.
 -->
<div class="card" v-ka-rbl-exclude>
	<div class="card-header"><h4 class="card-title">Advanced Annual Future Pay Increase Rates</h4></div>
	<div class="card-body">
		<div class="row">
			<div v-ka-input="{ name: 'iPayIncreaseYear1', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate1', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseYear2', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate2', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div class="col-12">
				<button @click.prevent="model.worksheet = undefined" type="button" class="btn btn-primary btn-default">Cancel</button>
				<button @click.prevent="handlers.closeWorksheetAsync" type="button" class="btn btn-primary btn-default">Use Values</button>
			</div>
		</div>
	</div>
</div>
```

## v-ka-unmount-clears-inputs

The `v-ka-unmount-clears-inputs` directive is a 'marker' directive (no model/attribute value) that can be assigned to any HTML element to indicate that any contained [`v-ka-input`](https://github.com/terryaney/nexgen-documentation/blob/main/KatApp.Vue.md#v-ka-input) elements are removed from the DOM, the associated [`state.inputs`](https://github.com/terryaney/nexgen-documentation/blob/main/KatApp.Vue.md#istateinputs) value is also removed.

The `v-ka-unmount-clears-inputs` directive has the same effect as the [`IKaInputModel.clearOnUnmount` property](#v-ka-input-model) when it returns `true`.

Using `v-ka-unmount-clears-inputs` is useful if a `v-for` generates `v-ka-inputs` with dynamic names based on the `v-for` iterator properties and when new data changes the `v-for` source data which completely changes the list of inputs and their IDs, but any previous IDs that weren't replaced by new data source would cause problems for CalcEngine.

```html
<!-- 
	When model.showPayIncreases becomes true, all iPay* inputs will be injected into application.state.inputs.  When showPayIncreases becomes
	false, and Vue removes this element from the DOM, the `v-ka-unmount-clear-inputs` instructs KatApp to remove all the iPay* inputs from
	state.inputs object.
 -->
<div class="card" v-ka-unmount-clears-inputs v-if="model.showPayIncreases">
	<div class="card-header"><h4 class="card-title">Advanced Annual Future Pay Increase Rates</h4></div>
	<div class="card-body">
		<div class="row">
			<div v-ka-input="{ name: 'iPayIncreaseYear1', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate1', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseYear2', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate2', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div class="col-12">
				<button @click.prevent="model.worksheet = undefined" type="button" class="btn btn-primary btn-default">Cancel</button>
				<button @click.prevent="handlers.closeWorksheetAsync" type="button" class="btn btn-primary btn-default">Use Values</button>
			</div>
		</div>
	</div>
</div>
```

## v-ka-nomount

When using `v-ka-input` or [input templates](./KatApp.04.TemplateElements.md#input-templates), all 'discovered' inputs are automatically processed when they are mounted (rendered) or unmounted (removed from the page) to ensure that the KatApp [`state.inputs`](./KatApp.03.State.md#istate-properties) are properly synchronized and additionally HTML DOM events are attached for default behaviors needed to handle RBLe Framework calculations.

There are some situations where **inputs should not be automatically processed** (i.e. if a view/template has hidden inputs that are for internal use only - i.e. file upload templates).  When an input should **not** be processed, the `v-ka-nomount` attribute can be applied to the input.

During the mounting of a KatApp input the following occurs:

1. The input `name` attribute is set appropriately to the [`scope.name`](#v-ka-input-scope).
1. The `scope.name` is added to the input's `classList`.
1. If the input (or a container of the input) does *not* contain the `rbl-exclude` class
    1. The input value will be assigned from the [`scope.value`](#v-ka-input-scope) (if provided), or
    1. `state.inputs` are initialized with the current value from markup (if there is one).
1. DOM events are attached
    1. All Inputs
        1. On 'change' (i.e. any modification to the input value)
            1. Remove an [`state.errors`](./KatApp.03.State.md#istate-properties) associated with the input.
            1. Set [`state.needsCalculation`](./KatApp.03.State.md#istate-properties) to `true`.
        1. On 'update', syncronize `state.inputs` if `rbl-exclude` class is not used.
        1. On 'update', trigger RBLe Calculation if `rbl-skip` class is not used and [`scope.noCalc`](#v-ka-input-scope) is `false`.
        1. On `update`, set `state.needsCalculation` to `false`.
        1. On `update`, trigger [`scope.noCalc`](#v-ka-input-scope) event.
        1. Attach any events provided in the [`model.events`](#v-ka-input-model) property.
    1. Specific Input Processing
        1. Date Inputs ([`scope.type`](#v-ka-input-scope) is `date`)
            1. The `state.inputs` are only assigned a valid date or `undefined` and not each time a keypress occurs.
            1. When `state.inputs` are set, a `value-ka` event is triggered for Kaml Views to catch as needed.
        1. Range Inputs (`scope.type` is `range`)
            1. Add additional events to handle displaying range value in UI for the user (see [IKaInputModel.type for range Inputs](#v-ka-input-model) for more information).
            1. Watches for a `rangeset.ka` event (triggered via [`application.setInputValue`](./KatApp.07.Api.md#ikatappsetinputvalue)) to update display
        1. Text Inputs (excluding `TEXTAREA`)
            1. When `enter` is pressed, trigger an 'update' event.
			1. Process [`scope.keyboardRegex`](#v-ka-input-scope) if provided.
            1. Process [`scope.mask`](#v-ka-input-scope) if provided.

During the unmounting of a KatApp input the following occurs:

1. If the [`model.clearOnUnmount`](#v-ka-input-model) is `true`, the input will be removed from the [`state.inputs`](./KatApp.03.State.md#istate-properties).
1. If the input, or a container, has a [`v-ka-unmount-clears-inputs`](#v-ka-unmount-clears-inputs) directive, the input will be removed from the `state.inputs`.
    1. Note, since Vue handles [`v-if`](./KatApp.05.VueDirectives.md#v-if-v-else-v-else-if) and [`v-for`](./KatApp.05.VueDirectives.md#v-for) directives with special 'cloned nodes', if the [`v-ka-unmount-clears-inputs`](#v-ka-unmount-clears-inputs) directive is applied *outside* of these elements, they will not work properly.
    1. [`v-ka-unmount-clears-inputs`](#v-ka-unmount-clears-inputs) directive is useful to use if you can wrap a group of inputs with the class and the inputs themselves will never show and hide based on their `display` property.  For example if a modal has a 'view' mode and 'edit' mode.  The 'edit' mode gets processed and returns the 'view' mode.  If the user wants to edit/create again in the 'edit' mode, you want all the inputs to be cleared after they were hidden/processed.

```html
<!--
    When iAge is removed from DOM because showAgeInputs is set to false, 
    it WILL be removed from state.inputs since the element that 'triggered' the unmount
    is the v-if element and the class is on/within that element.
-->
<div v-if="showAgeInputs" v-ka-unmount-clears-inputs>
    <div v-ka-input="{ name: 'iAge', template: 'age-input' }"></div>
</div>

<!--
    When iAge is removed from DOM because showAgeInputs is set to false, 
    it will NOT be removed from state.inputs because the class is outside the
    'cloned' node that has the v-if on it.
    
    In this situation, the clearOnUnmount property should be set specifically on the v-ka-input model.
-->
<div v-ka-unmount-clears-inputs>
    <div v-if="showAgeInputs">
        <div v-ka-input="{ name: 'iAge', template: 'age-input' }"></div>
    </div>
</div>

<!--
    When iAge is removed from DOM because rbl-input[id='iAge'].display is set to 0
    it will NOT be removed from state.inputs because the v-ka-input renders its own
    v-if directive inside the div.v-ka-input element and v-ka-unmount-clears-inputs will
    be ouside the 'cloned' node.
    
    In this situation, the clearOnUnmount property should be set specifically on the v-ka-input model.
-->
<div v-ka-unmount-clears-inputs>
    <div v-ka-input="{ name: 'iAge', template: 'age-input' }"></div>
</div>
```

The `<template>` content will be rendered and searched for any `HTMLInputElement`s and automatically have event watchers added to trigger RBLe Framework calculations as needed and well as binding to the [state.inputs](./KatApp.03.State.md#istate-properties) model. The `<template>` markup will have access to the [scope](#v-ka-input-scope).





