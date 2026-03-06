using System.Collections.Generic;
using Microsoft.AspNetCore.StaticFiles;
// using KAT.Camelot.Domain.Web;

var builder = WebApplication.CreateBuilder( args );

builder.Logging
	.ClearProviders()
	.AddConfiguration( builder.Configuration.GetSection( "Logging" ) )
	.AddConsole();

builder.Services.AddControllers();

var app = builder.Build();

var staticFileProvider = new FileExtensionContentTypeProvider();
staticFileProvider.Mappings.Add( ".kaml", "text/plain" );

app.UseStaticFiles( new StaticFileOptions { ContentTypeProvider = staticFileProvider } );

app.MapControllers();

app.Run();
