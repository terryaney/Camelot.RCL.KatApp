using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using KAT.Camelot.RCL.KatApp;

namespace KAT.Camelot.Infrastructure.Web;

public class KatAppRclUseOptions : CamelotUseOptions
{
	public KatAppRclUseOptions( IWebHostEnvironment webHostEnvironment, KatAppConfigurationOptions katAppConfigurationOptions, CamelotOptions? camelotOptions = null ) : base( webHostEnvironment, camelotOptions )
	{
		RequestProcessing = new KatAppRclRequestProcessingOptions( webHostEnvironment, katAppConfigurationOptions, camelotOptions );
	}
}

public class KatAppRclRequestProcessingOptions : CamelotRequestProcessingOptions
{
	private readonly KatAppConfigurationOptions katAppConfigurationOptions;

	internal KatAppRclRequestProcessingOptions( IWebHostEnvironment webHostEnvironment, KatAppConfigurationOptions katAppConfigurationOptions, CamelotOptions? camelotOptions = null )
		// /katapp option - may need to make this configurable, see comment above
		// still want katapp handler to log activity on failures only...
		: base( webHostEnvironment, camelotOptions, paths => [ .. paths.Where( p => !p.StartsWith( "/katapp", StringComparison.OrdinalIgnoreCase ) ) ] )
	{
		this.katAppConfigurationOptions = katAppConfigurationOptions;
	}

	protected override DefaultProcessingDelegates CreateDefaultProcessingDelegates()
	{
		// base.CreateDefaultProcessingDelegates(), *not* base.DefaultProcessingDelegates - the latter is the cache this
		// method is building, so reading it here would re-enter the Lazy.
		var camelotDelegates = base.CreateDefaultProcessingDelegates();

		return new()
		{
			UseErrorPages = camelotDelegates.UseErrorPages,
			LogActivity = camelotDelegates.LogActivity,
			IsApiActivity = camelotDelegates.IsApiActivity,
			LogSuccessActivity = context =>  {
				return
					camelotDelegates.LogSuccessActivity( context ) &&
					!katAppConfigurationOptions.IsKatAppRoute( context );
			},
			UseStaticPages = context => {
				return
					camelotDelegates.UseStaticPages( context ) &&
					!katAppConfigurationOptions.IsKatAppRoute( context );
			}
		};
	}
}

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
		builder.Services.AddScoped<KatAppHelper>();

		return builder;
	}

	public static WebApplication UseKatAppRcl( this WebApplication app, Action<KatAppRclUseOptions> configure )
	{
		var opts = new KatAppRclUseOptions( app.Environment, app.Services.GetRequiredService<KatAppConfigurationOptions>(), app.Services.GetRequiredService<CamelotOptions>() );
		configure( opts );

		app.UseCamelot( options => {
			options.ClientMiddlewareOptions = opts.ClientMiddlewareOptions;
			options.RequestProcessing = opts.RequestProcessing;
		} );

		return app;
	}
}
