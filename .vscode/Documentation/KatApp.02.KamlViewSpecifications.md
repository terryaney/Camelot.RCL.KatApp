> This file is a focused section of KatApp documentation.
> Use [KatApp.md](./KatApp.md) for the index.

# Kaml View Specifications

A *K*at*A*pp *M*arkup *L*anguage file, known as a 'Kaml View', is a combination of [RBL Configuration](./KatApp.01.GettingStarted.md#configuring-calcengines-and-template-files), HTML, CSS, and Javascript where the HTML supports Vue directives to leaverage CalcEngine results to produce presentation markup. In addition to all the [Common Vue Directives](./KatApp.05.VueDirectives.md#common-vue-directives) and [Custom KatApp Directives](./KatApp.06.CustomDirectives.md#custom-katapp-directives) that are supported, the following describes the best practices and supported Kaml View features that fall outside of Vue directive processing.

The standard Kaml View file will have the following structure.

```html
<!-- Specify RBL Configuration properties -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine name="LAW_Wealth_CE"></calc-engine>    
</rbl-config>

<script>
	// Immediately Invoked Function Expression (IIFE) to allow for javascript scoped to this Kaml View
	(function () {
		/** @type {IKatApp} */
		var application = KatApp.get('{id}');

		// Optionally update the KatApp options and state.  The configAction delegate passes in
		// references to the rbl, model, inputs, and handlers properties from its state.
		application.configure((config, rbl, model, inputs, handlers) => { 
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

			config.directives = {
			};

			config.components = {
			};
		});

		// Any 'element' selection should use application.select()
		application.select(".warning-items").css("background-color", "red");
	})();
</script>

<!-- Optionally provide <style> element...all css selectors should be scoped to thisApplication -->
<style>
thisApplication .view-table {
	font-weight: bold;
}
</style>

<!-- Finally, the actual markup containing various Vue directives -->
<h1>KatApp Tutorial</h1>
<p>To Do</p>
<ul>
	<li v-for="row in rbl.source('ce-table')" :class="row.class" v-html="row.text"></li>
</ul>
```

## Kaml View Scoping

It is very important to keep Kaml View encapsulated as an isolated environment, or sandbox if you will. **The KatApp framework ensures that all input and calculation result processing are isolated to the KatApp/Kaml View in which they are specified.**  In the same manner, there are ways to ensure proper scoping for your markup and javascript so that Kaml Views do not interfere with Host Platform sites.

- [Scoping CSS](#scoping-css) - Discusses how Kaml Views can ensure CSS styles do not adversely affect the Host Environment.
- [Scoping IDs](#scoping-ids) - Discusses how Kaml Views can ensure `HTMLElement.id` assignments are guaranteed to be unique.
- [Scoping Selection](#scoping-selection) - Discusses how Kaml Views can ensure DOM queries are isolated to *only* their markup and not other Kaml Views or the Host Environment.

### Scoping CSS

In Kaml Views, if you include a `<style>` section to define some CSS for the view, make sure you prefix every class selector with `thisApplication`.

Additional CSS scoping can be considered as well when creating Template Kaml Files.  The `katapp-css` class will always be applied to any KatApp container element.  This provides a way to scope CSS inside template files (or Kaml Views too, although `thisApplication` is preferred) to only be applied to KatApp View markup.

So the CSS priority would be:

1. `.katapp-css`
2. `thisApplication`

```html
<style>
    /* 
	Without scoping would affect all h2 elements on rendered page even if 
	not part of this Kaml View but part Host Environment.
	*/
    h2 {
        font-size: 24px;
    }

    /* 
	With .katapp-css scoping, every KatApp rendered during a page request (if the Host Environment was 
	initializing more than one KatApp) would have their h2 elements styled
	*/
    .katapp-css h2 {
        color: Green;
        font-size: 30px;
    }

    /* 
	With thisApplication scoping, only the h2 elements present inside this Kaml View will be styled.
	*/
    thisApplication h2 {
        color: Red;
    }

    /* 
	Given the CSS scoping precedence, the end result given the style above for an h2 element
	inside *this* Kaml View would be color: Red, size 30px.
	*/
</style>

<h2>Hello</h2>
```

### Scoping IDs

When creating HTML elements inside the Kaml View that need an `id` attribute provided, ID scoping must be used.  A name cannot be guaranteed to be unique throughout the Host Environment if ID scoping is not used.  To guarantee a unique ID for elements, include the `{id}` token somewhere in the `id` attribute. The `{id}` token is replaced before the markup is rendered with the unique ID associated with the currently running KatApp.

```html
<!-- nav-list can not be guaranteed unique, the containing application (or other hosted KatApps may use the same id) -->
<div id="nav-list">
    <!-- ... -->
</div>

<!-- This would create a unique ID specific to *this* Kaml View -->
<div id="nav-list_{id}">
    <!-- ... -->
</div>
```

### Scoping Selection

When `<script>` tags are included in Kaml View files, the correct way to obtain the KatApp element is by using this `{id}` token. Then, any time selection is needed, selection needs to be scoped to the currently running KatApp.  To do this, use the `selectElement()`, `selectElements()` and `closestElements()` methods of the application instead of global selector counterparts (i.e. `document.querySelector()`).  This is also required to ensure proper selection scope when using [nested KatApps](./KatApp.06.CustomDirectives.md#v-ka-app) as well.

```html
<!-- Snippet from the above sample structure -->
<script>
var application = KatApp.get('{id}');
application
	.selectElements(".warning-items")
	.forEach(e => e.style.backgroundColor = "red");
</script>
```

See [IKatApp Methods](./KatApp.07.Api.md#ikatapp-methods) for more details.