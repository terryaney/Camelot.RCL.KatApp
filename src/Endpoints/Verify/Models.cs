using System.Text.Json.Serialization;

namespace KAT.Camelot.RCL.KatApp.Endpoints.Verify;

public class Request
{
    public required string ApplicationId { get; init; }
    public required string RequestId { get; init; }
}

public class Response
{
	[JsonPropertyName("path")]
    public required string Path { get; init; }
	
	[JsonPropertyName("manualInputs")]
    public Dictionary<string, string>? ManualInputs { get; init; }
}
