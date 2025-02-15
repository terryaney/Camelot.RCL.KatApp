using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation;
using Microsoft.Extensions.Hosting;

using KAT.Camelot.Domain.Extensions;
using KAT.Camelot.Domain.Web.KatApps;
using KAT.Camelot.RCL.KatApp;

namespace KAT.Camelot.Infrastructure.Web.Extensions;

public static class ConfigurationExtensions
{
	public static WebApplicationBuilder AddKatAppRcl<TKatAppProvider>( this WebApplicationBuilder builder, Action<KatAppConfigurationOptions>? configureOptions = null ) 
		where TKatAppProvider : class, IKatAppOptionsProvider
	{
		builder.Services.AddScoped<IKatAppOptionsProvider, TKatAppProvider>();
		builder.AddKatAppRcl( configureOptions );
		return builder;
	}

	public static WebApplicationBuilder AddKatAppRcl( this WebApplicationBuilder builder, Func<IServiceProvider, IKatAppOptionsProvider> katAppProviderFactory, Action<KatAppConfigurationOptions>? configureOptions = null  ) 
	{
		builder.Services.AddScoped( katAppProviderFactory );
		builder.AddKatAppRcl( configureOptions );
		return builder;
	}

	private static WebApplicationBuilder AddKatAppRcl( this WebApplicationBuilder builder, Action<KatAppConfigurationOptions>? configureOptions = null )
	{
		var opts = new KatAppConfigurationOptions();
		configureOptions?.Invoke( opts );
		builder.Services.AddSingleton( opts );

		if ( builder.Environment.IsDevelopment() )
		{
			builder.Services.Configure<MvcRazorRuntimeCompilationOptions>( options =>
			{
				var camelotPath = string.Join( "\\", builder.Environment.ContentRootPath.Split( '\\' ).TakeUntil( p => string.Compare( p, "Camelot", true ) == 0 ) );
				var rclFolder = string.Join( ".", typeof( IRclMarker ).Assembly.GetName().Name!.Split( '.' ).SkipUntil( ( c, p ) => string.Compare( c, "RCL", true ) == 0, false ) );

				var rclPath = Path.Combine( camelotPath, "RCL", rclFolder, "src" );
				options.FileProviders.Add( new PhysicalFileProvider( rclPath ) );
			} );
		}

		builder.Services.AddScoped<KatAppHelper>();

		return builder;
	}
}
