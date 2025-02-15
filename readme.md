# KatApp Razor Class Library

## Initializing the RCL

### Enabling RCL Functionality

To leverage the KatApp Razor Class Library (RCL) in your project, you must first initialize the RCL. This is done by adding the following code to your `Program.cs` file after calling the `AddRazorPages()` method:

```csharp
// Call either one of the following methods to initialize the KatApp RCL based on whether you need a IKatAppOptionsProvider factory or not.
builder.Services
	.AddRazorPages()
	.AddKatAppRCL<KatAppOptionsProvider>();

// or

builder.Services
	.AddRazorPages()
	.AddKatAppRCL( provider => provider.GetRequiredService<KatAppOptionsProvider>() );
```

For all the parts (endpoints, ViewComponents, Razor Pages, etc.) of the RCL to function properly you must provide a class that implements the IKatAppOptionsProvider interface. This class is responsible for providing the necessary options for the RCL **that change during any given request**.  Most of the interface properties are implemented by `Domain.Configuration.TheKeep` but a few others are site specific based on how they are storing session data or other options.  The original implementation of `IKatAppOptionsProvider` is simply the `Nexgen.Configuration.TheKeep` class.  But it may be desireable to create a new class if the overhead of the client site configuration is too much.

### Enabling Static Resource

Minimally, the RCL requires the ability to inject a static `*.js` file that provides the `rcl.katApp` helper methods.  Optionally, it can inject `KatApp.js` and supporting `*.css` files.  To enable the static resource injection, you must add the following code to your `_Layout.cshtml` file:

```html
<!-- Place this in appropriate location with other CSS files used by your site based on desired CSS precedence. -->
@RenderSection("RCL_Css", required: false)

<!-- Place this in appropriate location with other js files used by your site based on desired JS precedence. -->
@RenderSection("RCL_Scripts", required: false)
```

If the `RenderKatAppCss` and `RenderKatAppJs` options are set to `false`, you can manually reference any static resource in the RCL via the `_content/RCL.KatApp/` prefix.  For example:

```html
<link rel="stylesheet" href="~/_content/RCL.KatApp/css/common.css" type="text/css" asp-append-version="true"/>
<link rel="stylesheet" href="~/_content/RCL.KatApp/css/inputs.css" type="text/css" asp-append-version="true"/>
```

### Enabling Localization

If your site supports localization, to properly set up RCL localization, you must modify the call to the `AddCamelotInfrastructureLocalization` extension to pass in marker types of the RCLs used by your project.

```csharp
var rclTypes = new[] { typeof( KAT.Camelot.RCL.KatApp.ICamelotMarker ) };
builder.AddCamelotInfrastructureLocalization( new[] { "en-US", "es-US" }, rclTypes );
```

### Enabling RCL Endpoints

When using KatApp RCL, to register the endpoints, you must modify your call to `AddFastEndpoints` to pass in the marker types of the RCLs used by your project.

```csharp
var rclTypes = new[] { typeof( KAT.Camelot.RCL.KatApp.ICamelotMarker ) };
builder.Services
	.AddFastEndpoints( options => {
		options.Assemblies = rclTypes.Select( t => t.Assembly );
	});
```


## Customizing the RCL

There are a few ways to customize the functionality of the RCL.

1. Localization - In you site, you can customize any of the resource strings used in localization by providing `*.resx` at the same path inside `/Resources` folder or simply the same 'key' in the `/Resources/SharedResources.resx` file.
1. Partial Views - You can override any of the partial views (usually empty by default) used by the RCL by providing a view at the sample location in your site (or in the `/Pages/Shared` folder).
  1. `/KatApp/Host.AdditionalAppContent.cshtml` - In the `Host.cshtml` page, after rendering the main `katapp` application, this partial can be used to provide additional content to render after the main application.  One common use is to provide a `AI` application that can be used in the site via a modal.
1. `KatAppConfigurationOptions` - You can configure automatic vs manual markup rendering, endpoint urls, etc.  An example of customizing the `KatAppConfigurationOptions` is shown below:

```csharp
builder.Services
	.AddRazorPages()
	.AddKatAppRCL(
		provider => provider.GetRequiredService<TheKeep>(),
		
		options => {
			options.RenderKatAppCss = false;  // Manually include common.css and inputs.css files in your site as desired
			options.RenderKatAppJs = false;   // Manually include katapp.js file in your site (only need this if need katapp.js functionality outside the scope of /KatApp/Host page)

			options.PageRoutes = new[]
			{
				// Default page should hit KatApp/Host
				new PageRoute { PageName = "/KatApp/Host", Route = "" },
				new PageRoute { PageName = "/KatApp/Host", Route = options.Endpoints.Application }
			};
		}
	);
```

## KatApp Framework

The KatApp framework is an orchestrator of two other well established frameworks; RBLe framework and [Vue.js](https://vuejs.org/).  The primary function of the KatApp framework is to marshall inputs into a RBLe framework calculation, take the calculation results and turn them into a 'reactive' model that is then used for rendering HTML markup via Vue.  One caveat is that instead of standard Vue, KatApp framework is leveraging [petite-vue](https://github.com/vuejs/petite-vue).  

> `petite-vue` is an alternative distribution of Vue optimized for progressive enhancement. It provides the same template syntax and reactivity mental model as standard Vue. However, it is specifically optimized for "sprinkling" a small amount of interactions on an existing HTML page rendered by a server framework.

Please see [KatApp Framework Documentation](https://tfs.acsgs.com/tfs/PDSI/HRS2/My%20Boards/_git/HRS%20BTR%20-%20core.camelot.documentation?path=%2FKatApp.md&version=GBmain&_a=preview) for more information.