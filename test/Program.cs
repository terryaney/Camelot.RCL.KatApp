using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder( args );

builder.Logging
	.ClearProviders()
	.AddConfiguration( builder.Configuration.GetSection( "Logging" ) )
	.AddConsole();

builder.Services.AddControllers();

var app = builder.Build();

var provider = new FileExtensionContentTypeProvider();
// Add new mappings
provider.Mappings[ ".kaml" ] = "text/plain";

app.UseStaticFiles( new StaticFileOptions
{
	ContentTypeProvider = provider
} );

app.MapControllers();

app.Run();
