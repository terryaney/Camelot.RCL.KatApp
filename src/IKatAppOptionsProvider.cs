using System.Text.Json.Nodes;

namespace KAT.Camelot.RCL.KatApp;

public interface IKatAppOptionsProvider
{
	string KatDataStoreEndpoint { get; }

	string SiteName { get; }
	string? ProfileGroup { get; }
	string? AuthId { get; }

	bool UseTestCalcEngine { get; }
	bool TraceKatApp { get; }
	string? SaveDebugCalcEngineLocation { get; }
	string? SaveKatAppDebugCalcEngineLocation( string? katAppKey );

	JsonObject AppResourceStrings { get; }
	Dictionary<string, string> GetKatAppManualInputs( JsonObject viewDefinition );
	JsonArray? GetManualResults( string key );

	JsonObject? GetKatAppByView( string viewId );
	JsonObject? GetKatAppByFile( string relativePath, string fileName );
}