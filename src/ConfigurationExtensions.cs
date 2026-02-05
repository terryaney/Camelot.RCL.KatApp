using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using KAT.Camelot.RCL.KatApp;

namespace KAT.Camelot.Infrastructure.Web;

public class KatAppRclUseOptions : CamelotUseOptions
{
	public KatAppRclUseOptions( IWebHostEnvironment webHostEnvironment, KatAppConfigurationOptions katAppConfigurationOptions ) : base( webHostEnvironment )
	{
		RequestProcessing = new KatAppRclRequestProcessingOptions( webHostEnvironment, katAppConfigurationOptions );
	} 
}

public class KatAppRclRequestProcessingOptions : CamelotRequestProcessingOptions
{
	private readonly KatAppConfigurationOptions katAppConfigurationOptions;

	internal KatAppRclRequestProcessingOptions( IWebHostEnvironment webHostEnvironment, KatAppConfigurationOptions katAppConfigurationOptions ) : base( webHostEnvironment )
	{
		this.katAppConfigurationOptions = katAppConfigurationOptions;
		var paths = webHostEnvironment.CamelotHealthAndStaticFolders();
		// /katapp option - may need to make this configurable, see comment above
		// still want katapp handler to log activity on failures only...
		logActivityIgnorePaths = [ .. paths.Where( p => !p.StartsWith( "/katapp", StringComparison.OrdinalIgnoreCase ) ) ];
	}

	public override DefaultProcessingDelegates DefaultProcessingDelegates => new()
	{
		UseErrorPages = base.DefaultProcessingDelegates.UseErrorPages,
		LogActivity = base.DefaultProcessingDelegates.LogActivity,
		IsApiActivity = base.DefaultProcessingDelegates.IsApiActivity,
		LogSuccessActivity = context =>  {
			return 
				base.DefaultProcessingDelegates.LogSuccessActivity( context ) &&
				!katAppConfigurationOptions.IsKatAppRoute( context );
		},
		UseStaticPages = context => {
			return
				base.DefaultProcessingDelegates.UseStaticPages( context ) &&
				!katAppConfigurationOptions.IsKatAppRoute( context );
		}
	};
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
		var opts = new KatAppRclUseOptions( app.Environment, app.Services.GetRequiredService<KatAppConfigurationOptions>() );
		configure( opts );

		app.UseCamelot( options => {
			options.ClientMiddlewareOptions = opts.ClientMiddlewareOptions;
			options.RequestProcessing = opts.RequestProcessing;
		} );

		return app;
	}
}
