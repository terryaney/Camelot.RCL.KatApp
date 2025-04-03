using FastEndpoints;
using Microsoft.AspNetCore.Http;

using KAT.Camelot.Domain.Web.KatApps;

namespace KAT.Camelot.RCL.KatApp.Endpoints.Verify;

public class Endpoint : Endpoint<Request, Response>
{
	private readonly KatAppHelper katAppHelper;
	private readonly IKatAppOptionsProvider optionsProvider;
	private readonly KatAppConfigurationOptions configurationOptions;
	
	public Endpoint( KatAppHelper katAppHelper, IKatAppOptionsProvider optionsProvider, KatAppConfigurationOptions configurationOptions )
	{
		this.katAppHelper = katAppHelper;
		this.optionsProvider = optionsProvider;
		this.configurationOptions = configurationOptions;
	}

	public override void Configure()
	{
		Get( configurationOptions.Endpoints.Verify );
		Description( builder => builder.WithTags( "KatApp" ) );
		Summary( s => s.Summary = "Verify that the currently logged in user has access to the requested Kaml view." );
	}

	public override async Task HandleAsync( Request request, CancellationToken c )
	{
		var currentView = 
			optionsProvider.GetViewById( request.ApplicationId ) ??
			throw new NotSupportedException( $"You are not authorized to use the {request.ApplicationId} application." );

		var view = (string)currentView[ "view" ]!;

		// No support for Kamls in Kat Data Store...
		var katAppResourceList = Array.Empty<KAT.Camelot.Abstractions.Api.Contracts.DataLocker.V1.Responses.KatAppResourceListItem>(); // await dataLockerService.GetKatAppResourceListAsync( theKeep.KamlFolders );
		var localView = katAppHelper.GetKamlViewName( katAppResourceList, view );

		if ( localView == view )
		{
			throw new ArgumentNullException( $"The {view} View does not exist." );
		}

		var inputs = optionsProvider.GetManualInputs( currentView );

		await SendAsync(
			new() { Path = localView, ManualInputs = inputs },
			cancellation: c
		);
	}
}