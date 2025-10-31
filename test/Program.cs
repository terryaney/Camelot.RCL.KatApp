using System.Collections.Generic;
using KAT.Camelot.Domain.Web;

var builder = WebApplication.CreateBuilder( args );

builder.Logging
	.ClearProviders()
	.AddConfiguration( builder.Configuration.GetSection( "Logging" ) )
	.AddConsole();

builder.Services.AddControllers();

var app = builder.Build();

app.UseStaticFiles( new Dictionary<string, string>() { { ".kaml", "text/plain" } } );

app.MapControllers();

app.Run();
