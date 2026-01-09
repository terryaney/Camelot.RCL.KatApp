using KAT.Camelot.Abstractions.Api.Contracts.DataLocker.V1.Responses;
using KAT.Camelot.Domain.Web.Configuration;

namespace KAT.Camelot.RCL.KatApp;

public class KatAppHelper
{
	private readonly string kamlRoot;

	public KatAppHelper( KatAppConfigurationOptions options, GlobalSiteSettings globalSiteSettings )
	{
		kamlRoot = options.KamlRootPath;
		KamlRootPath = Path.Combine( globalSiteSettings.ContentRootPath, "wwwroot", kamlRoot );
		KamlFolders = [ .. new DirectoryInfo( KamlRootPath ).GetDirectories().Select( d => d.Name ) ];
	}

	public string KamlRootPath { get; }
	public string[] KamlFolders { get; }

	public string GetKamlViewName( KatAppResourceListItem[] katAppResourceList, string view )
	{
		string ensureSuffix( string name ) => string.Compare( ".kaml", Path.GetExtension( name ), true ) != 0 ? name + ".kaml" : name;
		string ensurePrefix( string name ) => name.Split( ':' ).Length == 1 ? "Global:" + name : name;
		string[] getFolders( string name ) => ensurePrefix( name ).Split( ':' )[ 0 ].Split( '|' );
		string getViewName( string name ) => ensurePrefix( name ).Split( ':' )[ 1 ];

		var vn = getViewName( view );
		var kaml = ensureSuffix( vn );
		var folders = getFolders( view );

		var localView =
			folders
				.Select( f => new { View = $"{kamlRoot}/{f}/{kaml}", Folder = f, Path = Path.Combine( KamlRootPath, f, kaml ) } )
				.FirstOrDefault( f =>
					File.Exists( f.Path ) &&
					!katAppResourceList.Any( r => r.Folder == f.Folder && string.Compare( r.Name, kaml.Replace( "/", "." ), true ) == 0 )
				);

		if ( localView == null && !katAppResourceList.Any( r => string.Compare( r.Name, kaml.Replace( "/", "." ), true ) == 0 ) )
		{
			throw new ApplicationException( $"Unable to find Kaml view of {view}" );
		}

		return localView != null
			? $"Rel:/{localView.View}"
			: view;
	}
}