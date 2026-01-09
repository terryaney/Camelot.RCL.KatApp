using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;

using KAT.Camelot.Domain.Services;

namespace KAT.Camelot.RCL.KatApp.Endpoints.ResourceStrings;

public class Endpoint( IKatAppOptionsProvider optionsProvider, KatAppConfigurationOptions configurationOptions, IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService )  : BaseCachedResponseEndpointWithoutRequest<JsonNode?>( httpContextAccessor, dateTimeService )
{
	private readonly IKatAppOptionsProvider optionsProvider = optionsProvider;
	private readonly KatAppConfigurationOptions configurationOptions = configurationOptions;

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
			await Send.OkAsync( cancellation: c );
		}
		else
		{
			var lastModifiedDate = DateTime.Parse( (string)appResourceStrings[ "lastModified" ]! ).ToUniversalTime();
			await SendCachedGetAsync( 
				"ResourceStrings", 
				lastModifiedDate, 
				async () => await Send.OkAsync( appResourceStrings, cancellation: c ) 
			);
		}
	}
}