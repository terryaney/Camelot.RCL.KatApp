namespace KAT.Camelot.RCL.KatApp.Endpoints.Verify;

public class Request
{
    public required string ApplicationId { get; init; }
    public required string RequestId { get; init; }
}

public class Response
{
    public required string Path { get; init; }
	
    public Dictionary<string, string>? ManualInputs { get; init; }
}
