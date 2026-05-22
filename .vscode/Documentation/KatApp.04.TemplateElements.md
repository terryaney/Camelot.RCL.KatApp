> This file is a focused section of KatApp documentation.
> Use [KatApp.md](./KatApp.md) for the index.

# HTML Content Template Elements

Vue is a template based javascript framework. Often all markup can be generated without the use of the [HTML Content Template element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template), however there are times when reusable pieces of markup are required or simply developer preference to segregate html content into a template that will be rendered only when needed.

- [HTML Template Element](#html-template-element) - Describes important role the `<template>` element plays in Vue / KatApps.
- [Template Precedence](#template-precedence) - Describes the process used in locating the proper KatApp template based on name.
- [Template Script and Style Tags](#template-script-and-style-tags) - When templates contain their own `<style>` and `<script>` elements, special processing is required.
- [Input Templates](#input-templates) - When templates represent an 'input', special processing is required.

## HTML Template Element

It is important to understand how `<template>` elements function inside the DOM. From the Mozilla documentation:

> The &lt;template> HTML element is a mechanism for holding HTML that is not to be rendered immediately when a page is loaded but may be instantiated subsequently during runtime using JavaScript.

In Kaml Views, templates are rendered via the [`v-ka-template`](./KatApp.06.CustomDirectives.md#v-ka-template), [`v-ka-input`](./KatApp.06.CustomDirectives.md#v-ka-input), or [`v-ka-input-group`](./KatApp.06.CustomDirectives.md#v-ka-input-group) directive.  Usually, directives that use a template will receive a data source, called a 'model' and when rendering a 'scope' object will be provided to the `<template>` markup. This scope could be the model itself, or it could be an object constructed from the model. See the above directives for more information and samples.

There are two important features in play with regards to templates in the KatApp Framework.

1. Template Precedence - How the KatApp Framework finds the right template to render given a template name.
1. Template Script and Style Tags - The KatApp Framework will render `<style>` from a template at most one time, however, there are conventions to control how often a `<script>` element runs.

## Template Precedence

Templates can be created inside Kaml View files, however, they can also be provided via separate Kaml Template file.  To add to the complexity, a Kaml View can specify multiple Kaml Template files that are required.  

Therefore, an order of precedence is applied so that templates can be overridden if desired by using the same `id` for the `<temlpate>`.

```html
<!-- Assume the following markup for each file -->

<!-- Templates.Shared Markup.kaml -->
<template id="banner">
    <div class="banner">My Global Banner: {greeting}</div>
</template>
<template id="sub-banner">
    <div class="sub-banner">My Global Sub Banner: {greeting}</div>
</template>
<template id="footer">
    <div class="footer">My Global Footer: {greeting}</div>
</template>

<!-- Templates.Profile.Shared.kaml Markup -->
<template id="banner">
    <div class="banner">My Profile Banner: {greeting}</div>
</template>
<template id="sub-banner">
    <div class="sub-banner">My Profile Sub Banner: {greeting}</div>
</template>

<!-- Sample.kaml View Markup -->
<rbl-config templates="Nexgen:Templates.Shared,Nexgen:Templates.Profile.Shared"></rbl-config>

<template id="banner">
    <div class="banner">My Kaml Banner: {greeting}</div>
</template>
```

Given the sample markups above, the order of precedence (1 being the highest) is applied when locating a template:

1. Template located inside the Kaml View file
2. Search template files specified in the `templates` attribute from _right to left_

Requested Template | Location of Template
---|---
banner | Sample.kaml (overrides Templates.Profile.Shared.kaml and Templates.Shared.kaml)
sub-banner | Templates.Profile.Shared.kaml (overrides Templates.Shared.kaml)
footer | Templates.Shared.Kaml (only present in this file)

## Template Script and Style Tags

Sometimes, templates are complex enough that they provide their own `<style>` and `<script>` tags to help encapsulate functionality.

`<style>` tags are always only rendered one time since injecting the identical `<style>` markup multiple times will have no effect on the CSS processor.

However, `<script>` tags can be processed similarily (i.e. only processed on the first time a template is used and rendered) or can be configured to inject the script content every time the template is rendered. This is accomplished with a `setup` attribute.

Vue has a concept for element 'lifecycle events'.  The two events available are `mounted` and `unmounted` than run the specified code every time reactivity causes an element to be rendered or removed.  See [v-on](./KatApp.05.VueDirectives.md#v-on) for more information.  KatApp Framework followed this convention for template script code.

The only two methods that can be provided inside template `<script>` tags are a `mounted` and `unmounted` function. Both functions are optional; if the functions do not exist, the script will do nothing. Below are the function signatures.


```html
<template id="widget-resources">
    <!-- 
    Use the 'setup' attribute to indicate that this script
    element should only be processed the first time a template
    is rendred.
    -->
    <script setup>
        // code only runs the first time the template is rendered and the first time a rendered template item is removed (if ever)
		function mounted(application) {
		}
		function unmounted(application) {
		}
    </script>

    <!--
    Omit the 'setup' attribute to indicate that this script
    element should be processed *every* time a template is
    rendered.  A single template can have multiple <script>
    elements each with their own 'setup' configuration 
    applied appropriately.
    -->
    <script>
        // code runs every time the template is rendered and when a rendered template item is removed
		function mounted(application) {
		}
		function unmounted(application) {
		}
    </script>
</template>
```

The most common use for these functions are to hook to [IKatApp Events](./KatApp.07.Api.md#ikatapp-events), but the template scripts can also opt to simply perform some DOM manipulation of its own.  When performing DOM manipulation on the template's elements, a mechanism is required to ensure proper 'selection' of rendered template markup.

1. Vue caches the `mounted` and `unmounted` function calls until all elements are rendered. If a template was manually called twice, the results of both template calls would be rendered and *then* the `mounted`/`unmounted` functions would be called.  This can lead to adverse affects.  For example, if a `mounted` function was designated to run every time the template was ran, the content from two template calls would already be rendered before each of their `mounted` functions were called. This essentially results in double processing.
1. If a template is provided an `Array<>` data source, and uses a [`v-for="row in rows"`](./KatApp.05.VueDirectives.md#v-for) to render content, the `mounted` functions in both the `setup` and the 'every time' script sections will only be called one time, *not for iteraction of the `v-for`*.
1. To aid in selection scoping, the 'scope' of the template will have a special `$renderId` property assigned that is an unique ID that can be rendered and used during selection actions to ensure proper scoping. The `$renderId` is made up via `{templateId}_{application.id}_{index}` where `index` is a number 1..N representing how many times this template has been rendered.

Below is an example of how to leverage the `$renderId` to allow for proper scoping.

```html
<script>
// Create a model we can use in markup
(function () {
	/** @type {IKatApp} */
	var application = KatApp.get('{id}');
	application.configure( config => {
		config.model = {
			list: ["Pension", "LifeEvents", "Savings"]
		};
    });
)();
</script>

<!-- Loop each item in list and call template with non-array source -->
<div v-ka-rbl-no-calc v-for="item in model.list">
    <div v-ka-template="{ name: 'templateWithScript', source: { name: item } }"></div>
</div>

<template id="templateWithScript">
	<script setup type="text/javascript">
		function mounted(application) {
			// Use {{ }} syntax to grab value and store it in string selector
			const renderId = '.{{$renderId}}';
            const length = application.select(renderId).length;
			console.log(`setup templateMounted:, ${length} scoped items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
            const length = application.select(renderId).length;
			console.log(`setup templateUnmounted:, ${length} scoped items found`);
		}
	</script>
	<script type="text/javascript">
		function mounted(application) {
			const renderId = '.{{$renderId}}';
            const scopeLength = application.select(renderId).length;
            const templateLength = application.select(renderId).length;
			console.log(`templateMounted:, ${scopeLength} scoped items found`);
			console.log(`templateMounted:, ${templateLength} template-script-input items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
            const templateLength = application.select(renderId).length;
			console.log(`templateUnmounted:, ${templateLength} template-script-input items found`);
		}
	</script>
	<input v-ka-input="{name: 'iTemplateInput' + name }" type="text" 
        :class="['template-script-input', $renderId]" />
</template>

<!-- Rendered HTML -->
<div v-ka-rbl-no-calc>
    <input name="iTemplateInputPension" 
        type="text" 
        class="template-script-input iTemplateInputPension templateWithScript_templateWithScript_ka1e46825c_1">
    <input name="iTemplateInputLifeEvents" 
        type="text" 
        class="template-script-input iTemplateInputLifeEvents templateWithScript_templateWithScript_ka1e46825c_2">
    <input name="iTemplateInputPension" 
        type="text" 
        class="template-script-input iTemplateInputSavings templateWithScript_templateWithScript_ka1e46825c_3">
</div>
```

With the above example, you could expect the following in the console ouput (remembering that all rendering completes before `mounted` is called):

> templateWithScript setup templateMounted:, 1 scoped items found  
> templateWithScript setup templateMounted:, 3 template-script-input items found  
> templateWithScript templateMounted:, 1 scoped items found  
> templateWithScript templateMounted:, 3 template-script-input items found  
> templateWithScript templateMounted:, 1 scoped items found  
> templateWithScript templateMounted:, 3 template-script-input items found  
> templateWithScript templateMounted:, 1 scoped items found  
> templateWithScript templateMounted:, 3 template-script-input items found  

```html
<script>
// Create a model we can use in markup
(function () {
    /** @type {IKatApp} */
	var application = KatApp.get('{id}');
	application.configure( config => {
		config.model = {
			list: ["Pension", "LifeEvents", "Savings"]
		};
    });
)();
</script>

<!-- Call template with array source -->
<div v-ka-rbl-no-calc v-ka-template="{ name: 'templateWithScript', source: model.list.map( item => ({ name: item }) ) }"></div>

<template id="templateWithScript">
	<script setup type="text/javascript">
		function mounted(application) {
			// Use {{ }} syntax to grab value and store it in string selector
            const renderId = '.{{$renderId}}';
            const length = application.select(renderId).length;
			console.log(`setup templateMounted:, ${length} scoped items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
            const length = application.select(renderId).length;
			console.log(`setup templateUnmounted:, ${length} scoped items found`);
		}
	</script>
	<script type="text/javascript">
		function mounted(application) {
			const renderId = '.{{$renderId}}';
            const scopeLength = application.select(renderId).length;
            const templateLength = application.select(renderId).length;
			console.log(`templateMounted:, ${scopeLength} scoped items found`);
			console.log(`templateMounted:, ${templateLength} template-script-input items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
            const templateLength = application.select(renderId).length;
			console.log(`templateUnmounted:, ${templateLength} template-script-input items found`);
		}
	</script>

    <!-- Render items with v-for -->
	<input v-for="(row, index) in rows" v-ka-input="{name: 'iTemplateInput' + row.name }" type="text" 
        :class="['template-script-input', $renderId]" />
</template>

<!-- Rendered HTML (notice how the last segment of renderId is always 1 in this case) -->
<div v-ka-rbl-no-calc>
    <input name="iTemplateInputPension" 
        type="text" 
        class="template-script-input iTemplateInputPension templateWithScript_templateWithScript_ka1e46825c_1">
    <input name="iTemplateInputLifeEvents" 
        type="text" 
        class="template-script-input iTemplateInputLifeEvents templateWithScript_templateWithScript_ka1e46825c_1">
    <input name="iTemplateInputPension" 
        type="text" 
        class="template-script-input iTemplateInputSavings templateWithScript_templateWithScript_ka1e46825c_1">
</div>
```

With the above example, you could expect the following in the console ouput (remembering that all rendering completes before `mounted` is called):

> templateWithScript setup templateMounted:, 3 scoped items found  
> templateWithScript setup templateMounted:, 3 template-script-input items found  
> templateWithScript templateMounted:, 3 scoped items found  
> templateWithScript templateMounted:, 3 template-script-input items found  

**Note**: When a template with `<script>` tags is called and passed an `Array` data source, you can see that both the `setup` and 'normal' scripts excecute only one time, therefore it is recommended to always use the 'normal' script mode.

## Input Templates

When templates are used to render an input (or input group), they need to be designated as such.  This instructs the KatApp Framework to locate all `HTMLInputElement`s to ensure that inputs are 'mounted' and 'unmounted' properly.  This is accomplished by using an `input` attribute on the script tag.

```html
<template id="input-text" input>
    <label>My Input</label>
    <input name="iMyInput"/> <!-- KatApp Framework finds this input and adds the required event watchers -->
</template>
```

There are some scenarios when an input template renders multiple inputs and some of the inputs should not be 'mounted' and 'unmounted' the [`v-ka-nomount`](./KatApp.06.CustomDirectives.md#v-ka-nomount) directive can be used.  See the `v-ka-nomount` documentation for more information.


