using System.Text.Json.Nodes;

namespace KAT.Camelot.RCL.KatApp;

public interface IKatAppOptionsProvider
{
	bool UseCamelotOnReady { get; }
	// TODO: Only used when KatAppConfigurationOptions.UseKatDataStore is true, yet every host has to implement it
	// even when opting out.  Could be declared as 'string? KatDataStoreEndpoint => null;' so it becomes a default
	// interface member, letting hosts that disable the data store skip supplying an endpoint that is never read.
	// Doing so is a breaking change for any host with an explicit (non-nullable) implementation of this member.
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
	Task<JsonObject?> GetManualResultsAsync( CancellationToken cancellationToken = default );
	DateTime? ManualResultsLastModified { get; }

	JsonObject? GetViewById( string id );
	JsonObject? GetViewByFile( string relativePath, string fileName );
}