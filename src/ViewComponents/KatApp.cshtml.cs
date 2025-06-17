using KAT.Camelot.Domain.Extensions;
using KAT.Camelot.Domain.Security.Cryptography;
using KAT.Camelot.Domain.Web.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using System.Net;
using System.Text.RegularExpressions;

namespace KAT.Camelot.RCL.KatApp.ViewComponents;

public class KatApp : ViewComponent
{
	private readonly KatAppHelper katAppHelper;
	private readonly IKatAppOptionsProvider optionsProvider;
	private readonly GlobalSiteSettings globalSiteSettings;
	private readonly IHttpContextAccessor httpContextAccessor;

	public KatApp( KatAppHelper katAppHelper, IKatAppOptionsProvider optionsProvider, GlobalSiteSettings globalSiteSettings, IHttpContextAccessor httpContextAccessor )
    {
		this.katAppHelper = katAppHelper;
		this.optionsProvider = optionsProvider;
		this.globalSiteSettings = globalSiteSettings;
		this.httpContextAccessor = httpContextAccessor;
	}

	static readonly Regex katDataStoreEndpointRegex = new( @"{[^}]+}", RegexOptions.Compiled );

    public IViewComponentResult Invoke( string name, string viewId, string? css = null )
	// public async Task<IViewComponentResult> InvokeAsync( string name, string viewId, string? css = null )
    {
        var katAppId = name.ToLower().Replace( ".", "-" );
        var view = optionsProvider.GetViewById( viewId )!;
        viewId = (string)view[ "id" ]!;
        
        // TODO: Put these into IKatAppOptionsProvider
        var calculationEndpoint = "api/rble/calculation";
		var jwtDataUpdatesEndpoint = "api/rble/jwtupdate";
		var verifyKatAppEndpoint = "api/katapp/verify";
        var manualResultsEndpoint = optionsProvider.GetManualResults( katAppId ) != null 
			? $"\"api/katapp/manual-results/{katAppId}\"" 
			: "undefined";

		// KatApp Framework expects to find a 'name' token
        var katDataStoreEndpoint = katDataStoreEndpointRegex.Replace( $"{optionsProvider.KatDataStoreEndpoint}{Abstractions.Api.Contracts.DataLocker.V1.ApiEndpoints.KatApps.Download}", "{name}" );
		
		var anchoredQueryStrings = !string.IsNullOrEmpty( httpContextAccessor.HttpContext!.Request.QueryString.ToString() )
			? QueryHelpers.ParseQuery( httpContextAccessor.HttpContext!.Request.QueryString.Value )
				.SelectMany( x => x.Value, ( col, value ) => $"{col.Key}={WebUtility.UrlDecode( value )}" )
				.Aggregate( ( x, y ) => $"{x}&{y}" )
			: "";
		var inputs = optionsProvider.GetManualInputs( view );

        var saveCalcEngineLocation =
            string.Join( "|",
                new[] {
                    optionsProvider.SaveDebugCalcEngineLocation,
                    optionsProvider.SaveDebugCalcEngineLocationByKey( name ),
                    (string?)globalSiteSettings.PageParameters[ "saveConfigureUI" ],
                    (string?)globalSiteSettings.PageParameters[ $"saveConfigureUI.{name}" ]
                }.Where( l => !string.IsNullOrEmpty( l ) )
            );

		// No support for Kamls in Kat Data Store...
		var katAppResourceList = Array.Empty<Abstractions.Api.Contracts.DataLocker.V1.Responses.KatAppResourceListItem>(); // await dataLockerService.GetKatAppResourceListAsync( theKeep.KamlFolders );
		var latestViewName = katAppHelper.GetKamlViewName( katAppResourceList, (string)view[ "view" ]! );

        var localTemplates =
            katAppHelper.KamlFolders
                .SelectMany( folder =>
				{
					return new DirectoryInfo( Path.Combine( katAppHelper.KamlRootPath, folder ) )
						.GetFiles( "*.kaml", SearchOption.AllDirectories )
						.Where( f => f.FullName.IndexOf( "Templates", StringComparison.InvariantCultureIgnoreCase ) > -1 )
						.Select( f => {
							var relativePath =
								f.DirectoryName![ ( katAppHelper.KamlRootPath.Length + 1 ).. ]
									.Replace( '\\', '/' );
							var folderParts = relativePath.Split( '/' );
							return new
							{
								Client = folderParts[ 0 ],
								RelativePath = string.Join( "/", folderParts.Skip( 1 ).Concat( new [] { f.Name } ) )
							};
						} )
						.Select( f =>
							new
                            {
                                Name = $"{f.Client}:{f.RelativePath}",
                                Template = katAppHelper.GetKamlViewName( katAppResourceList, $"{f.Client}:{f.RelativePath}" )
                            }
                        )
                        .Where( t => t.Template.StartsWith( "Rel:" ) )
                        .ToArray();
                } )
                .Where( t => t.Template.StartsWith( "Rel:" ) )
                .ToDictionary( k => k.Name, v => v.Template );

		return View( 
            "/ViewComponents/KatApp.cshtml",
             new Model
             {
				UseCamelotOnReady = optionsProvider.UseCamelotOnReady,
                BaseUrl = Url.Content( "~/" ),
                DataGroup = optionsProvider.DataGroup!,
                Name = katAppId,
                View = latestViewName,
                Css = $"{katAppId} {css}".Trim(),
                CalculationEndpoint = calculationEndpoint,
                VerifyKatAppEndpoint = verifyKatAppEndpoint,
				JwtDataUpdatesEndpoint = jwtDataUpdatesEndpoint,
                ManualResultsEndpoint = manualResultsEndpoint,
                KatDataStoreEndpoint = katDataStoreEndpoint,
                AnchoredQueryStrings = anchoredQueryStrings,
                ManualInputs = inputs.ToJsonString(),
                RelativePathTemplates = localTemplates.ToJsonString(),

                CurrentPage = viewId,
                UserIdHash = Hash.SHA256Hash( optionsProvider.AuthId! ),
                Environment = globalSiteSettings.EnvironmentName,
                RequestIP = globalSiteSettings.RequestIP,

				NavigateAction = optionsProvider.NavigateAction,
				EncryptAction = optionsProvider.EncryptAction,
				DecryptAction = optionsProvider.DecryptAction,

				GetSessionKeyAction = optionsProvider.GetSessionKeyAction,
				GetSessionAction = optionsProvider.GetSessionAction,
				SetSessionAction = optionsProvider.SetSessionAction,
				RemoveSessionAction = optionsProvider.RemoveSessionAction,

                UseTestCalcEngine = optionsProvider.UseTestCalcEngine ? "true" : "false",
                TraceVerbosity = optionsProvider.Trace ? "TraceVerbosity.Detailed" : "TraceVerbosity.None",
                UseTestView = globalSiteSettings.PageParameters[ "testview" ] == "1" ? "true" : "false",
                DebugResourcesDomain = !string.IsNullOrEmpty( globalSiteSettings.PageParameters[ "localserver" ] ) ? $"\"{globalSiteSettings.PageParameters[ "localserver" ]}\"" : "undefined",
                ShowInspector = (string?)globalSiteSettings.PageParameters[ "showInspector" ] ?? ( !string.IsNullOrEmpty( globalSiteSettings.PageParameters[ "localserver" ] ) ? "1" : "0" )
             }
        );
    }

	public record Model
    {
		public required bool UseCamelotOnReady { get; init; }
		public required string BaseUrl { get; init; }
        public required string DataGroup { get; init; }
        public required string Name { get; init; }
        public required string View { get; init; }
        public string? Css { get; init; }
        public required string CalculationEndpoint { get; init; }
        public required string VerifyKatAppEndpoint { get; init; }
		public required string JwtDataUpdatesEndpoint { get; init; }
        public required string KatDataStoreEndpoint { get; init; }
        public required string ManualResultsEndpoint { get; init; }
        public required string AnchoredQueryStrings { get; init; }
        public required string ManualInputs { get; init; }
        public required string RelativePathTemplates { get; init; }

        public required string CurrentPage { get; init; }
        public required string UserIdHash { get; init; }
        public required string Environment { get; init; }
        public required string RequestIP { get; init; }

        // Debug Settings
        public required string UseTestCalcEngine { get; init; }
        public required string TraceVerbosity { get; init; }
        public required string UseTestView { get; init; }
        public required string DebugResourcesDomain { get; init; }
		public required string ShowInspector { get; init; }

		public required string? NavigateAction { get; init; }
		public required string? EncryptAction { get; init; }
		public required string? DecryptAction { get; init; }

		public required string? GetSessionKeyAction { get; init; }
		public required string? SetSessionAction { get; init; }
		public required string? GetSessionAction { get; init; }
		public required string? RemoveSessionAction { get; init; }
    }    
}