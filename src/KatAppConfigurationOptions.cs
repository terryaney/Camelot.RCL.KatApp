using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Http.Features;

namespace KAT.Camelot.RCL.KatApp;

public class KatAppConfigurationOptions
{
	public const string DefaultApplicationRoute = "/app/{viewId?}";

	/// <summary>
	/// The path (under wwwroot) where all KatApp kaml files are located.
	/// </summary>
	public string KamlRootPath { get; set; } = "KatApp";
	/// <summary>
	/// Whether this site hosts any Kaml resources in the KAT Data Store.  When false, the KatApp framework does not
	/// request resources that are not relative to this site, and <see cref="IKatAppOptionsProvider.KatDataStoreEndpoint"/>
	/// is neither used nor sent to the browser.
	/// </summary>
	public bool UseKatDataStore { get; set; } = true;
	/// <summary>
	/// Whether or not to automatically render /css/common.css and /css/inputs.css links into the 'RCL Sections'.
	/// </summary>
	public bool RenderKatAppCss { get; set; } = true;
	/// <summary>
	/// Whether or not to automatically render /js/katapp.js script into the 'RCL Sections'.
	/// </summary>
	public bool RenderKatAppJs { get; set; } = true;

	/// <summary>
	/// Query string parameters that should be retained by the KatApp host page to generate cacheable urls.
	/// </summary>
	public string[] CacheableQueryStrings { get; set; } = [];

	/// <summary>
	/// Route used to access the KatApp Host Page.  Must have a {viewId?} parameter defined somehow in the route.
	/// </summary>
	public string ApplicationRoute { get; set; } = DefaultApplicationRoute;

	/// <summary>
	/// Configure API endpoint paths for endpoint functionality provided by KatApp RCL.
	/// </summary>
	public KatAppEndpoints Endpoints { get; set; } = new ();

	public bool IsKatAppRoute( HttpContext context ) => IsKatAppRoute( context.Features.Get<IEndpointFeature>()?.Endpoint as RouteEndpoint );
	public bool IsKatAppRoute( RouteEndpoint? routeEndpoint )
	{
		if ( routeEndpoint == null ) return false;

		var katAppRoutes = new[]
		{
			KatAppEndpoints.Kaml,
			Endpoints.Verify,
			Endpoints.ManualResults,
			Endpoints.ResourceStrings
		};

		return katAppRoutes.Any( r => r == routeEndpoint.RoutePattern.RawText );
	}
}

public class KatAppEndpoints
{
	// For now, not configurable, if I need to configure this, need to search code base for
	// '/katapp option' and see how to make it able to pass in as an option
	public static string Kaml /* { get; set; } = */ => "/katapp/{**viewName}";
	
	public string Verify { get; set; } = "/api/katapp/verify";
	public string ManualResults { get; set; } = "/api/katapp/manual-results";
	public string ResourceStrings { get; set; } = "/api/katapp/resource-strings";
	public string Calculation { get; set; } = "/api/rble/calculation";
	public string JwtDataUpdates { get; set; } = "/api/rble/jwtupdate";
}