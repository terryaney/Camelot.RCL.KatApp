using System.Text.Json.Nodes;

namespace KAT.Camelot.RCL.KatApp;

public interface IKatAppOptionsProvider
{
	bool UseCamelotOnReady { get; }
	string KatDataStoreEndpoint { get; }

	string SiteName { get; }
	string? DataGroup { get; }
	string? AuthId { get; }

	bool UseTestCalcEngine { get; }
	bool Trace { get; }
	string? SaveDebugCalcEngineLocation { get; }
	string? SaveDebugCalcEngineLocationByKey( string key );

	string? NavigateAction { get; }
	string? EncryptAction { get; }
	string? DecryptAction { get; }
	string? GetSessionKeyAction { get; }
	string? GetSessionAction { get; }
	string? SetSessionAction { get; }
	string? RemoveSessionAction { get; }	

	JsonObject AppResourceStrings { get; }
	Dictionary<string, string> GetManualInputs( JsonObject viewDefinition );
	JsonArray? GetManualResults( string key );
	DateTime? GetManualResultsLastModified( string key );

	JsonObject? GetViewById( string id );
	JsonObject? GetViewByFile( string relativePath, string fileName );
}