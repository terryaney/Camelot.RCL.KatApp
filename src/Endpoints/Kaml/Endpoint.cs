using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

using KAT.Camelot.Domain.Services;
using KAT.Camelot.Domain.Web.KatApps;

namespace KAT.Camelot.RCL.KatApp.Endpoints.Kaml;

public partial class Endpoint : BaseCachedResponseEndpoint<Request>
{
	static readonly Regex templateRegEx = new ( @"^\s*<template[^>]* id=""[^""]+""([^>]* script=""(?<script>[^""]+)"")?([^>]* script\.setup=""(?<setup>[^""]+)"")?([^>]* css=""(?<css>[^""]+)"")?[^>]*>\s*$", RegexOptions.Compiled );
	private readonly KatAppHelper katAppHelper;
	private readonly IKatAppOptionsProvider optionsProvider;
	private readonly KatAppConfigurationOptions configurationOptions;

	public Endpoint( KatAppHelper katAppHelper, IKatAppOptionsProvider optionsProvider, KatAppConfigurationOptions configurationOptions, IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService )
		: base( httpContextAccessor, dateTimeService )
	{
		this.katAppHelper = katAppHelper;
		this.optionsProvider = optionsProvider;
		this.configurationOptions = configurationOptions;
	}

	public override void Configure()
	{
		Get( configurationOptions.Endpoints.Kaml );
		Description( builder => builder.WithTags( "KatApp" ) );
		Summary( s => s.Summary = "Returns the requested Kaml file if access is allowed" );
	}

	public override async Task HandleAsync( Request request, CancellationToken c )
	{
		try
		{
			var kamlContentType = "application/kat.application.markup.language";
			var kaml = new FileInfo( Path.Combine( katAppHelper.KamlRootPath, request.ViewName.Split( '?' )[ 0 ] ) );

			if ( !kaml.Exists || string.Compare( kaml.Extension, ".kaml", StringComparison.OrdinalIgnoreCase ) != 0 )
			{
				await SendNotFoundAsync( cancellation: c );
				return;
			}

			var isTemplate = request.ViewName.Contains( "Templates", StringComparison.OrdinalIgnoreCase );
			if ( !isTemplate )
			{
				var relativePath =
					kaml.Directory!.FullName[ ( katAppHelper.KamlRootPath.Length + 1 ).. ]
						.Replace( '\\', '/' );

				// Can't return 401 - Conduent intercepts and returns dummy html.  Throwing exception
				// will get caught and returned as a ValidationDetail object.
				var currentView =
					optionsProvider.GetViewByFile( relativePath, kaml.Name ) ??
					throw new UnauthorizedAccessException( $"Unauthorized access to {request.ViewName}" );

				/*
				if ( currentView == null )
				{
					await SendForbiddenAsync( cancellation: c );
					return;
				}
				*/
			}

			var supportingFiles =
				kaml.Directory!.GetFiles( $"{kaml.Name}.*" )
					.Where( f => new[] { ".js", ".css", ".templates" }.Contains( f.Extension, StringComparer.OrdinalIgnoreCase ) )
					.ToArray();

			var lastModifiedDate = new[] { kaml.LastWriteTimeUtc }.Concat( supportingFiles.Select( f => f.LastWriteTimeUtc ) ).Max();

			await SendCachedGetAsync( $"Kaml:{request.ViewName}", lastModifiedDate, async () =>
			{
				if ( supportingFiles.Any() )
				{
					string? line = null;
					string? supportingFileLine = null;

					HttpContext.Response.StatusCode = StatusCodes.Status200OK;
					HttpContext.Response.ContentType = kamlContentType;
					HttpContext.Response.Headers[ "Content-Disposition" ] = $"attachment; filename={kaml.Name}; filename*=UTF-8''{kaml.Name}";
					var outputStream = HttpContext.Response.Body;

					await using var outputWriter = new StreamWriter( outputStream );
					using var kamlReader = kaml.OpenText();

					async Task writeSupportFilesAsync( IEnumerable<FileInfo> files, string? templateItemType )
					{
						foreach ( var supportingFile in files )
						{
							await outputWriter.WriteLineAsync( Environment.NewLine );

							string? prefix = null;

							if ( !string.IsNullOrEmpty( templateItemType ) )
							{
								if ( templateItemType == "css" )
								{
									await outputWriter.WriteLineAsync( $"<style>" );
								}
								else
								{
									await outputWriter.WriteLineAsync( $"<script{( templateItemType == "setup" ? " setup" : "" )}>" );
								}
								prefix = "\t";
							}
							else if ( string.Compare( supportingFile.Extension, ".js", true ) == 0 )
							{
								await outputWriter.WriteLineAsync( "<script>" );
								await outputWriter.WriteLineAsync( "\t(function () {" );
								prefix = "\t\t";
							}
							else if ( string.Compare( supportingFile.Extension, ".css", true ) == 0 )
							{
								await outputWriter.WriteLineAsync( "<style>" );
								prefix = "\t";
							}

							using var supportingFileReader = supportingFile.OpenText();

							while ( ( supportingFileLine = await supportingFileReader.ReadLineAsync() ) != null )
							{
								if ( !supportingFileLine.StartsWith( "/// <reference path" ) )
								{
									await outputWriter.WriteLineAsync( prefix + supportingFileLine );
								}
							}

							if ( !string.IsNullOrEmpty( templateItemType ) )
							{
								if ( templateItemType == "css" )
								{
									await outputWriter.WriteLineAsync( "</style>" );
								}
								else
								{
									await outputWriter.WriteLineAsync( $"//# sourceURL={Path.GetFileNameWithoutExtension( supportingFile.Name )}.browser{Path.GetExtension( supportingFile.Name )}" );
									await outputWriter.WriteLineAsync( "</script>" );
								}
							}
							else if ( string.Compare( supportingFile.Extension, ".js", true ) == 0 )
							{
								await outputWriter.WriteLineAsync( "\t})();" );
								await outputWriter.WriteLineAsync( $"//# sourceURL={Path.GetFileNameWithoutExtension( kaml.Name )}.browser{Path.GetExtension( kaml.Name )}" );
								await outputWriter.WriteLineAsync( "</script>" );
							}
							else if ( string.Compare( supportingFile.Extension, ".css", true ) == 0 )
							{
								await outputWriter.WriteLineAsync( "</style>" );
							}
						}
					}

					Match templateMatch = null!;

					var kamlBase = Path.GetFileNameWithoutExtension( kaml.Name );
					var kamlJsCssFiles =
						supportingFiles
							.Where( f => new[] { ".js", ".css" }.Any( ext => string.Compare( f.Name, kaml.Name + ext, true ) == 0 ) )
							.ToArray();

					while ( ( line = await kamlReader.ReadLineAsync() ) != null )
					{
						await outputWriter.WriteLineAsync( line );

						if ( line.Contains( "</rbl-config>" ) )
						{
							await writeSupportFilesAsync( kamlJsCssFiles, null );
						}
						else if ( ( templateMatch = templateRegEx.Match( line ) ).Success )
						{
							var script = templateMatch.Groups[ "script" ].Value;
							var setup = templateMatch.Groups[ "setup" ].Value;
							var css = templateMatch.Groups[ "css" ].Value;

							if ( !string.IsNullOrEmpty( setup ) )
							{
								await writeSupportFilesAsync( supportingFiles.Where( f => string.Compare( f.Name, $"{kaml.Name}.{setup}.js", true ) == 0 ), "setup" );
							}
							if ( !string.IsNullOrEmpty( script ) )
							{
								await writeSupportFilesAsync( supportingFiles.Where( f => string.Compare( f.Name, $"{kaml.Name}.{script}.js", true ) == 0 ), "script" );
							}
							if ( !string.IsNullOrEmpty( css ) )
							{
								await writeSupportFilesAsync( supportingFiles.Where( f => string.Compare( f.Name, $"{kaml.Name}.{css}.css", true ) == 0 ), "css" );
							}
						}
					}

					await writeSupportFilesAsync( supportingFiles.Where( f => string.Compare( f.Name, kaml.Name + ".templates", true ) == 0 ), null );
				}
				else
				{
					await SendFileAsync( kaml, kamlContentType, cancellation: c );
				}
			} );
		}
		catch ( Exception ex )
		{
			LogWarningKamlRequestFailed( Logger, optionsProvider.SiteName, request.ViewName, ex );
			throw;
		}
	}

	[LoggerMessage( 1000, LogLevel.Warning, "{callerName} Unable to return KAML: {file}" )]
	static partial void LogWarningKamlRequestFailed( ILogger logger, string callerName, string file, Exception ex );
}