using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;

using KAT.Camelot.Domain.Services;
using KAT.Camelot.Domain.Web.KatApps;

namespace KAT.Camelot.RCL.KatApp.Endpoints.ManualResults;

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
		Get( configurationOptions.Endpoints.ManualResults );
		Description( builder => builder.WithTags( "KatApp" ) );
		Summary( s => s.Summary = "Return BRD manual results for the given application id." );
	}

	public override async Task HandleAsync( CancellationToken c )
	{
		var id = Route<string>( "id" )!;
		var lastModifiedDate = optionsProvider.GetManualResultsLastModified( id );

		if ( lastModifiedDate == null )
		{
			await SendOkAsync( c );
		}
		else
		{
			await SendCachedGetAsync( id, lastModifiedDate.Value, async () => await SendAsync( optionsProvider.GetManualResults( id ), cancellation: c ) );
		}
	}
}