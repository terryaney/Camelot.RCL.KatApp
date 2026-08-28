> This file is a focused section of KatApp documentation.
> Use [KatApp.md](./KatApp.md) for the index.

# Common Vue Directives

Vue supports [many directives](https://vuejs.org/api/built-in-directives.html), however, there are only a handful that commonly used in Kaml View files.  Below are the most common directives used and some examples of how to use them with the [IState scope object](./KatApp.State.md#istate).

- [v-html / v-text](#v-html-v-text) - Update the element's `innerHTML` or text content.
- [v-bind](#v-bind) - Dynamically bind one or more attributes to an expression.
- [v-for](#v-for) - Render the element or template block multiple times based on the source data.
- [v-on](#v-on) - Attach an event listener to the element.
- [v-if / v-else / v-else-if](#v-if-v-else-v-else-if) - Conditionally render an element or a template fragment based on the truthy-ness of the expression value.
- [v-show](#v-show) - Toggle the element's visibility based on the truthy-ness of the expression value.
- [v-pre](#v-pre) - Use the `v-pre` directive to an element that is used for [IModalOptions.contentSelector](./KatApp.07.Api.md#imodaloptions) if the markup within the element should not be processed by the host application, but instead should be processed and become reactive when the modal application is created.

**Note:** Usually, 'inside' the actual directive markup, the content is simply 'valid javascript' with the given context/scope.

## v-html / v-text

Use the `v-text` directive to:

> [Vue](https://vuejs.org/api/built-in-directives.html#v-text): Update the element's text content.

Or, use the `v-html` directive to:

> [Vue](https://vuejs.org/api/built-in-directives.html#v-html): Update the element's [innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML).

The `v-html`, and less common `v-text`, directive is most commonly used inside the processing of a [`v-for`](#v-for) directive.  It can also be used in conjunction with the [`rbl.value()`](./KatApp.State.md#istaterblvalue) method as well.

The `v-text` directive *does* have a `{{ }}` shorthand syntax that allows for more terse markup.

Only use `v-text` or `{{ }}` when the value does *not* have any HTML markup.

For all samples in this section, assume calculation results of the following:

```javascript
results: {
    'rbl-value': [
        { "id": "fullName", "value": "John Doe" },
        { "id": "address", "value": "123 Normal Lane<br/>Manhattan, NY 55123" },
    ]
}
```

```html
<div v-html="rbl.value('fullName')"></div>
<!-- renders... -->
<div>John Doe</div>

<div v-html="rbl.value('fullNameInvalid')"></div>
<!-- renders (note how 'undefined' is rendered since rbl.value returns undefined for missing IDs)... -->
<div>undefined</div>

<div v-html="rbl.value('fullNameInvalid') || ''"></div>
<!-- renders 'blank' correctly, but somewhat cumbersome -->
<div></div>


<div v-html="rbl.value('address')"></div>
<!-- renders... -->
<div>123 Normal Lane<br/>Manhattan, NY 55123</div>

<div v-text="rbl.value('address')"></div>
<!-- renders (note how markup is HTML encoded)... -->
<div>123 Normal Lane&lt;br/&gt;Manhattan, NY 55123</div>

<div v-html="`<p>Hello from <b>v-html</b> with Template Literal <b>${1+2}</b></p>`"></div>
<!-- renders...  -->
<p>Hello from <b>v-html</b> with Template Literal <b>3</b></p>
```

Note: Given that `v-html` used with `rbl.value` renders the 'undefined' in the markup, it is preferrable to use the [`v-ka-value`](./KatApp.06.CustomDirectives.md#v-ka-value) directive to avoid this issue.

## v-bind

> [Vue](https://vuejs.org/api/built-in-directives.html#v-bind): Dynamically bind one or more attributes, or a component prop to an expression.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: `v-bind:style` auto-prefixing

The `v-bind` directive *does* have a `:` shorthand syntax that allows for more terse markup.

- [v-bind Examples](#v-bind-examples) - Samples doing general `v-bind` instructions.
- [v-bind `class` and `style` Examples](#v-bind-class-and-style-examples) - Samples explaining the special processing that occurs when binding `class` or `style` attributes.

Also note, features from Vue documentation that petite-vue does not support:
1. `.prop` - force a binding to be set as a DOM property.
1. `.attr` - force a binding to be set as a DOM attribute.
1. `<button :[key]="value"></button>` - dynamic attribute name.
1. `style` auto-prefixing - when a CSS property that requires [vendor prefix](https://developer.mozilla.org/en-US/docs/Glossary/Vendor_Prefix) (i.e. `transform`)

### v-bind Examples

```html
<!-- The following are equivalent -->
<div v-bind:class="'blue'"></div>
<div :class="'blue'"></div>
```

For all the following samples in this section, the `:` shorthand syntax will be used and assume a custom application.state.model of the following:

```javascript
model: {
    favoriteClass: "bootstrap awesome",
    isActive: true,
    hasError: false,
    activeColor: 'red',
    fontSize: 30,
    id: '123'
}
```

In the simplest sense, `v-bind` takes an 'expression' that returns a `string` and that value is assigned to the attribute. That 'expression' and be a model property, string concatenation, or Template Literals.

```html
<div :class="model.favoriteClass"></div>
<!-- Renders... -->
<div class="bootstrap awesome"></div>

<div :class="'conduent ' + model.favoriteClass"></div>
<!-- Renders... -->
<div class="conduent bootstrap awesome"></div>

<div :class="`conduent ${model.favoriteClass}`"></div>
<!-- Renders... -->
<div class="conduent bootstrap awesome"></div>

<div :data-calculation-id="model.id"></div>
<!-- Renders... -->
<div data-calculation-id="123"></div>
```

### v-bind `class` and `style` Examples

The `class` and `style` attributes have special processing that occurs.

1. The `class` 'expression' can return `string` | `IStringIndexer<boolean>` | `Array<string | IStringIndexer<boolean>>`
1. The `style` 'expression' can return `string` | `IStringIndexer<string | Array<string>>` | `Array<string | IStringIndexer<string>>`
1. The `style` 'expression' can return `Array<IStringIndexer<Array<string>>` to support [Vendor Prefixing](https://developer.mozilla.org/en-US/docs/Glossary/Vendor_Prefix) where only the last supported style is rendered.
1. The `:class` and `:style` directives can co-exist with the standard `class` and `style` attributes and the directive will 'extend' the values.

**Note:** Both `class` and `style` have special processing when the expression returns an `Array<string>` enabling Vue to properly `space` delimit the class names.  However, for any other attribute binding, if an `Array<string>` is provided, Vue will `,` delimit the values.

#### v-bind class Examples

```html
<!-- Basic expression of type string -->
<div :class="model.hasError ? 'text-danger' : '' }"></div>

<!-- class and :class can co-exist -->
<div
  class="static"
  :class="model.isActive ? 'active' : '' }"></div>
<!-- Renders... -->
<div class="static active"></div>

<!-- 
Expression of type Array<string> 
-->
<div :class="['static', model.isActive ? 'active' : '', model.hasError ? 'text-danger' : '']"></div>
<!-- Renders... -->
<div class="static active"></div>

<!-- 
Expression of type IStringIndexer<boolean> 

When expression is IStringIndexer<boolean> it only applies the class if the boolean expression evaluates to true.

Note: This expression style is preferrable to the Ternary operator of :class="isActive ? 'active' : ''"
-->
<div :class="{ 'active': isActive, 'text-danger': hasError }"></div>
<!-- Renders... -->
<div class="active"></div>

<!-- 
Expression of type Array<string, IStringIndexer<boolean>>
Can mix and match string and IStringIndexer<boolean> in the array as well.
-->
<div :class="['static', { 'active': isActive, 'text-danger': hasError }]"></div>
<!-- Renders... -->
<div class="static active"></div>
```

Given how complex the class expression can become, consider binding directly to a class object on a custom model so that the template is cleaner.

```javascript
// All expressions below would be a 'calculated' value usually
model: {
    myClass: {
        'static': true,
        'active': true,
        'hasError': false
    }
}
```

```html
<div :class="model.myClass"></div>
<!-- Renders -->
<div class="static active"></div>
```

#### v-bind style Examples

```html
<!-- Basic expression of type string -->
<div :style="model.fontSize + 'px'"></div>
<!-- Renders.. -->
<div style="fontSize: 30px;"></div>

<!-- style and :style can co-exist -->
<div style="color: blue;" :style="'fontSize: ' + model.fontSize + 'px'"></div>
<!-- Renders.. -->
<div style="color: blue; fontSize: 30px;"></div>

<!-- Basic expression of type Array<string> -->
<div :style="['color: ' + model.activeColor, 'fontSize: ' + model.fontSize + 'px']"></div>
<!-- Renders.. -->
<div style="color: red; fontSize: 30px;"></div>

<!-- Expressions override existing matching styles with last element in array taking precedence -->
<div style="color: blue;" :style="['color: ' + model.activeColor, 'fontSize: ' + model.fontSize + 'px' ]"></div>
<!-- Renders.. -->
<div style="color: red; fontSize: 30px;"></div>

<!-- 
Expression of type IStringIndexer<string> 

When expression is IStringIndexer<string> each style is applied and overrides any existing matching styles with 
last element in array taking precedence.
-->
<div :style="{ color: model.activeColor, fontSize: model.fontSize + 'px' }"></div>
<!-- Renders.. -->
<div style="color: red; fontSize: 30px;"></div>

<!-- 
Expression of type Array<string, IStringIndexer<string>>
Can mix and match string and IStringIndexer<string> in the array as well.
-->
<div style="border: 1px solid blue;" 
    :style="['font-weight: bold', { color: model.activeColor, fontSize: model.fontSize + 'px' }, { font-weight: 'normal' }]">
</div>
<!-- Renders... -->
<div style="border: 1px solid blue; color: red; fontSize: 30px; font-weight: normal;"></div>

<!-- 
Expression of type IStringIndexer<Array<string>>
You can provide an array of multiple (prefixed) values to a style property and Vue will only render the last 
value in the array which the browser supports. 
-->
<div :style="{ display: ['-webkit-box', '-ms-flexbox', 'flex'] }"></div>
<!-- 
Renders `display: flex` for browsers that support the unprefixed version of `flexbox`.  
This gets around the limitation of no support for 'auto-prefixing'. 
-->
<div style="display: flex;"></div>
```

Given how complex the style expression can become, consider binding directly to a style object on a custom model so that the template is cleaner.

```javascript
model: {
    myStyle: {
        display: ['-webkit-box', '-ms-flexbox', 'flex'],
        color: 'red', 
        fontSize: '40px',
        fontWeight: 'bold'
    }
}
```

```html
<div :style="model.myStyle"></div>
<!-- Renders -->
<div style="display: flex; color: red; fontSize: 40px; fontWeight: bold;"></div>
```

## v-for

> [Vue](https://vuejs.org/api/built-in-directives.html#v-for): Render the element or template block multiple times based on the source data.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: `v-for` deep destructure


There are two allowed syntaxes for `v-for`. 

1. `v-for="item in array"` where `item` is just a 'variable name' representing each item in the iterable source.  In this case, the `array` value, usually `rbl.source()`, represents the iterable source.
1. `v-for="(item, index) in array"` functions the same as above, except with this signature, an 'index' variable has been introduced (it can be named anything) that is a `0..N` integer representing the current position of `item` in the `array`. This is helpful when you need to conditionally change markup based on the first or last item in the iterable source.

Kaml Views will most often use `v-for` in conjunction with [`rbl.source()`](./KatApp.State.md#istaterblsource).

For all samples in this section, assume calculation results of the following:

```javascript
results: {
    resultTable: [
        { "key": "Apple", "type": "Fruit", "text": "An apple a day keeps the doctor away." },
        { "key": "Orange", "type": "Fruit", "text": "'Orange' you glad you didn't eat an apple?" },
        { "key": "Baked Beans", "type": "Vegetables", "text": "Beans, beans, the magical fruit..." }
    ]
}
```

### Using the `:key` Attribute with v-for

It is advised to use the [`:key`](https://vuejs.org/api/built-in-special-attributes.html#key) attribute any time a `v-for` directive is used. This is to give a hint to Vue about how to uniquely identify each row when rendering, otherwise unexpected behavior could result.


- [v-for With rbl.source](#v-for-with-rblsource) - Most common syntax of using `v-for` directive with results from a CalcEngine.
- [v-for With template Element](#v-for-with-template-element) - Describes the benefit of using a HTML Template element with `v-for` to eliminate the rendering of a parent HTML element if not desired.
- [v-for With v-bind Attributes](#v-for-with-v-bind-attributes) - Example using both `v-for` and `v-bind` directives on the same element.

### v-for With rbl.source

The most common and basic syntax used will be:

```html
<div v-for="item in rbl.source('resultTable')">
  {{item.key}}: {{ item.text }}
</div>

<!-- Renders... -->
<div>Apple: An apple a day keeps the doctor away.</div>
<div>Orange: 'Orange' you glad you didn't eat an apple.</div>
<div>Baked Beans: Beans, beans, the magical fruit...</div>

<div v-for="item in rbl.source('resultTable', r => r.type == 'Fruit')">
  {{item.key}}: {{ item.text }}
</div>

<!-- Renders... -->
<div>Apple: An apple a day keeps the doctor away.</div>
<div>Orange: 'Orange' you glad you didn't eat an apple.</div>
```

### v-for With template Element

As documented in the [HTML Content Template Elements](./KatApp.04.TemplateElements.md#html-content-template-elements) section, a `<template>` element is a 'mechanism for holding HTML that is not to be rendered'.  Therefore, in addition to being reusable pieces of markup, `<template>` elements have an important role to be considered when rendering markup in Kaml Views.  

Normally, on which ever element the `v-for` directive appears, that will be the element that *repeats* for each row that is present in the data source. Consider the following example.

```html
<div class="row">
    <div v-for="item in rbl.source('resultTable')">
        <div class="col-6">{{item.key}}</div>
        <div class="col-6">{{item.text}}</div>
    </div>
</div>

<!-- Produces... -->
<div class="row">
    <div> <!-- Repeated element -->
        <div class="col-6">Apple</div>
        <div class="col-6">An apple a day keeps the doctor away.</div>
    </div>
    <div> <!-- Repeated element -->
        <div class="col-6">Orange</div>
        <div class="col-6">'Orange' you glad you didn't eat an apple.</div>
    </div>
    <div> <!-- Repeated element -->
        <div class="col-6">Baked Beans</div>
        <div class="col-6">Beans, beans, the magical fruit...</div>
    </div>
</div>
```

This is *not* the proper hierarchial structure that Bootstrap css expects.  It expects `col-*` elements to be placed as an *immediate* descending of an element with the `row` class applied.

We can use the `<template>` element to solve this problem.  When a `v-for` is placed on a `<template>` element, **only** the content inside the template is repeated and not the actual `<template>` element (since template elements are never rendered in HTML).

```html
<div class="row">
    <template v-for="item in rbl.source('resultTable')">
        <div class="col-6">{{item.key}}</div>
        <div class="col-6">{{item.text}}</div>
    </template>
</div>

<!-- Produces... -->
<div class="row">
    <!-- Repeated content -->
    <div class="col-6">Apple</div>
    <div class="col-6">An apple a day keeps the doctor away.</div>
    <!-- Repeated content -->
    <div class="col-6">Orange</div>
    <div class="col-6">'Orange' you glad you didn't eat an apple.</div>
    <!-- Repeated content -->
    <div class="col-6">Baked Beans</div>
    <div class="col-6">Beans, beans, the magical fruit...</div>
</div>
```

### v-for With v-bind Attributes

When an element has `v-for` directive applied, [v-bind](#v-bind) attributes can also be used and has access to the current item of the iterator/array.

```html
<div v-for="item in rbl.source('resultTable')" :class="item.type">
  {{item.key}}: {{item.text}}
</div>

<!-- Renders... -->
<div class="Fruit">Apple: An apple a day keeps the doctor away.</div>
<div class="Fruit">Orange: 'Orange' you glad you didn't eat an apple.</div>
<div class="Vegetable">Baked Beans: Beans, beans, the magical fruit...</div>
```

## v-on

> [Vue](https://vuejs.org/api/built-in-directives.html#v-on): Attach an event listener to the element.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: `v-on="{ mousedown: doThis, mouseup: doThat }"`

The `v-on` directive allows Kaml Views to bind events to elements.  The directive expects a `function` reference or an `inline statement`.

The `v-on` directive *does* have a `@` shorthand syntax that allows for more terse markup.

- [v-on Modifiers](#v-on-modifiers) - Explains the 'modifier' feature that can be used to modify how events are processed (i.e. automatically calling the `preventDefault()` method of the `Event` object).
- [v-on Element Lifecycle Events](#v-on-element-lifecycle-events) - Discusses the Vue specific `mounted` and `unmounted` events that are triggered when HTML elements are added to or removed from the DOM.


```html
<!-- 
The following are equivalent; providing a 'function' to the directive.

When listening to native DOM events, the method receives the native event as the only argument.
-->
<button type="button" v-on:click="handlers.doThat"></button>
<button type="button" @click="handlers.doThat"></button>

<!-- 
The following are equivalent; using an 'inline statement' with the directive.

When using inline statement, the statement has access to the special $event and $el properties.
-->
<button type="button" v-on:click="handlers.doThat($event, 'hello')"></button>
<button type="button" @click="handlers.doThat($event, 'hello')"></button>
```

### v-on Modifiers

Vue has the concept of event 'modifiers' (via `.modifier` after event name) that allow for extra functionliaty when hooking up events; controlling when events are triggered, performing boilerplate event handler code automatically (i.e. `event.preventDefault()`).

1. `.stop` - call `event.stopPropagation()`.
1. `.prevent` - call `event.preventDefault()`.
1. `.capture` - add event listener in capture mode.
1. `.self` - only trigger handler if event was dispatched from this element.
1. `.{keyAlias}` - only trigger handler on certain keys.
1. `.once` - trigger handler at most once.
1. `.left` - only trigger handler for left button mouse events.
1. `.right` - only trigger handler for right button mouse events.
1. `.middle` - only trigger handler for middle button mouse events.
1. `.passive` - attaches a DOM event with `{ passive: true }`.

```html
<!-- 
When button is clicked, automatically call 'event.preventDefault()' and
the event should only run one time.
 -->
<button type="button" @click.once="handlers.doThat($event, 'hello')"></button>
```

### v-on Element Lifecycle Events

Vue has a concept for element 'lifecycle events'.  The two events available are `mounted` and `unmounted` than run the specified code every time reactivity causes an element to be rendered or removed.

These events can be used in Kaml Views manually if needed. To use the elements you must add a namespace of `vue:`.  The KatApp Framework leverages these events in several instances internally (i.e. [`v-ka-input`](./KatApp.06.CustomDirectives.md#v-ka-input) to wire up change events to trigger a calculation, enabling help tips if contained inside a [`v-if`](#v-if-v-else-v-else-if) statement, etc.).

```html
<!-- Use vue:mounted to show appropriate bootstrap tab when shown -->
<script>
    /** @type {IKatApp} */
    var application = KatApp.get('{id}');    
    application.configure( (config, rbl, model, inputs) => {
        config.handlers = {
            paymentOptionsMounted: () => {
                inputs.iHsaOption = application.select('#eHSAContribution button:first').attr("value");
                new bootstrap.Tab(application.select('#eHSAContribution button:first')[0]).show();
            }
        };
    })
</script>

<div v-if="rbl.boolean('showElectionForm')" @vue:mounted="handlers.paymentOptionsMounted">
    <ul class="nav nav-tabs" id="eHSAContribution" role="tablist">
        <li v-if="rbl.boolean('enableHsaPPP')" class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#perPayPeriod" 
                type="button" role="tab" aria-controls="perPayPeriod" aria-selected="true" 
                value="perPay">Change per-pay-period contribution</button>
        </li>
        <li v-if="rbl.boolean('enableHsaOneTime')" class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#iOneTime" 
                type="button" role="tab" aria-controls="iOneTime" aria-selected="false" value="oneTime"
                @click="handlers.togglePaymentOption">Make a one-time contribution</button>
        </li>
    </ul>

    <!-- Omitting markup for the actual tab content -->
</div>
```

## v-if / v-else / v-else-if

> [Vue](https://vuejs.org/api/built-in-directives.html#v-if) Conditionally render an element or a template fragment based on the truthy-ness of the expression value.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: Transitions

`v-if` directives toggle the presence of an element.  Can optionally be chained with `v-else-if` and `v-else` directives as well. When the `v-if`, `v-else-if` and `v-else` directives are chained together, they must be applied on elements that are immediate siblings of one another.

```html
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else-if="type === 'C'">C</div>
<div v-else>Not A/B/C</div>
```

When an element is toggled, the element and its contained directives are destroyed and re-constructed. If the initial condition is falsy, then the inner content won't be rendered at all.

`v-if` directives can be used on `<template>` elements to denote a conditional block containing only text or multiple elements.

```html
<template v-if="model.showTextOnly">Only render text with no HTML container element</template>

<template v-if="model.showMultiple">
    <div>Label</div>
    <div>Render multiple elements with one condition and no HMTL container element</div>
</template>
```

## v-show

> [Vue](https://vuejs.org/api/built-in-directives.html#v-show) Toggle the element's visibility based on the truthy-ness of the expression value.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: Transitions

`v-show` works by setting the display CSS property via inline styles, and will try to respect the initial display value when the element is visible.

## v-pre

> [Vue](https://vuejs.org/api/built-in-directives.html#v-pre) Skip compilation for this element and all its children.

Use the `v-pre` directive to an element that is used for [IModalOptions.contentSelector](./KatApp.07.Api.md#imodaloptions) if the markup within the element should not be processed by the host application, but instead should be processed and become reactive when the modal application is created.

The `v-pre` is discarded when the application is created and regular Vue processing/compilation correctly occurs for the modal application.

The *value* of the attribute controls which application's [`state`](./KatApp.03.State.md) the new application starts with.  Vue itself ignores the value — the presence of the attribute is all that defers compilation — so the value is free for the KatApp Framework to use:

Value | Resulting State
---|---
`v-pre` | The new application's `rbl`, `model`, and `handlers` are a clone of the **host** application's, so that all `v-*` and `v-ka-*` directives have the data they need to correctly process.  This is the common case.
`v-pre="selector"` | Same as above, but the state is cloned from the application matching `selector` rather than the host.  Use when the markup is rendered inside one application but written against the state of another.
`v-pre="false"` | **No** state is cloned; the new application starts with an empty `rbl`, `model`, and `handlers`.  Use when the content is self contained — a few inputs and a button — and does not read host state.  The host remains reachable via `application.options.hostApplication.state.*`, and [`IModalOptions.configure`](./KatApp.07.Api.md#contentselector-modals) supplies the modal's own `model` and `handlers`.

Cloning host state is not free; its cost is proportional to the size of the host's `model` and `rbl.results`, and the clone is a snapshot, so nothing written to the new application's `model` reaches the host.  Prefer `v-pre="false"` when the content does not need the host's state.

The same attribute and values are read from the content source element of a help tip popup.



