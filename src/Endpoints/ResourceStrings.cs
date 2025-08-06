using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;

using KAT.Camelot.Domain.Services;
using KAT.Camelot.Domain.Web.KatApps;

namespace KAT.Camelot.RCL.KatApp.Endpoints.ResourceStrings;

public class Endpoint : BaseCachedResponseEndpointWithoutRequest<JsonNode?>
{
	private readonly IKatAppOptionsProvider optionsProvider;
	private readonly KatAppConfigurationOptions configurationOptions;

	public Endpoint( IKatAppOptionsProvider optionsProvider, KatAppConfigurationOptions configurationOptions, IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService ) 
		: base( httpContextAccessor, dateTimeService )
	{
		this.optionsProvider = optionsProvider;
		this.configurationOptions = configurationOptions;
	}

	public override void Configure()
	{
		Get( configurationOptions.Endpoints.ResourceStrings );
		Description( builder => builder.WithTags( "KatApp" ) );
		Summary( s => s.Summary = "Return BRD resource strings." );
	}

	public override async Task HandleAsync( CancellationToken c )
	{
		var appResourceStrings = optionsProvider.AppResourceStrings;

		if ( appResourceStrings.Count == 0 )
		{
			await SendOkAsync( c );
		}
		else
		{
			var lastModifiedDate = DateTime.Parse( (string)appResourceStrings[ "lastModified" ]! ).ToUniversalTime();
			await SendCachedGetAsync( 
				"ResourceStrings", 
				lastModifiedDate, 
				async () => await SendAsync( appResourceStrings, cancellation: c ) 
			);
		}
	}
}