using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;

using KAT.Camelot.Domain.Services;
using KAT.Camelot.Domain.Web.KatApps;

namespace KAT.Camelot.RCL.KatApp.Endpoints.ManualResults;

public class Endpoint( IKatAppOptionsProvider optionsProvider, KatAppConfigurationOptions configurationOptions, IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService ) : BaseCachedResponseEndpointWithoutRequest<JsonNode?>( httpContextAccessor, dateTimeService )
{
	private readonly IKatAppOptionsProvider optionsProvider = optionsProvider;
	private readonly KatAppConfigurationOptions configurationOptions = configurationOptions;

	public override void Configure()
	{
		Get( configurationOptions.Endpoints.ManualResults );
		Description( builder => builder.WithTags( "KatApp" ) );
		Summary( s => s.Summary = "Return BRD manual results for the given application id." );
	}

	public override async Task HandleAsync( CancellationToken c )
	{
		var lastModifiedDate = optionsProvider.ManualResultsLastModified;

		if ( lastModifiedDate == null )
		{
			await SendOkAsync( c );
		}
		else
		{
			await SendCachedGetAsync( 
				"ManualResults", 
				lastModifiedDate.Value, 
				async () => await SendAsync( await optionsProvider.GetManualResultsAsync( c ), cancellation: c ) 
			);
		}
	}
}