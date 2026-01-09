using System.Net;
using FastEndpoints;
using KAT.Camelot.Domain.Services;
using KAT.Camelot.Infrastructure.Web;
using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace KAT.Camelot.RCL.KatApp.Endpoints;

public abstract class BaseCachedResponseEndpoint<TRequest>( IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService ) : BaseCachedResponseEndpoint<TRequest, object>( httpContextAccessor, dateTimeService ) where TRequest : notnull
{
}

public abstract class BaseCachedResponseEndpointWithoutRequest<TResponse>( IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService ) : BaseCachedResponseEndpoint<EmptyRequest, TResponse>( httpContextAccessor, dateTimeService )
{
	public virtual Task HandleAsync( CancellationToken ct ) => throw new NotImplementedException();
	public sealed override Task HandleAsync( EmptyRequest _, CancellationToken ct ) => HandleAsync( ct );
}

public abstract class BaseCachedResponseEndpoint<TRequest, TResponse>( IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService ) : Endpoint<TRequest, TResponse> where TRequest : notnull
{
	private readonly IHttpContextAccessor httpContextAccessor = httpContextAccessor;
	private readonly IDateTimeService dateTimeService = dateTimeService;

	protected async Task SendCachedGetAsync( string id, DateTime lastModifiedDate, Func<Task> sendUpdatedResponse )
	{
		using var _p1 = LogContext.PushProperty( "cacheId", id );
		
		var context = httpContextAccessor.HttpContext!;

		// https://www.geekytidbits.com/efficient-caching-dynamic-resources-asp-net-304-not-modified/
		var rawIfModifiedSince = context.Request.Headers.IfModifiedSince.ToString();

		var requestIfModified = !string.IsNullOrEmpty( rawIfModifiedSince )
			? DateTime.Parse( rawIfModifiedSince ).ToUniversalTime()
			: DateTime.MinValue;

		// HTTP does not provide milliseconds, so remove it from the comparison
		var lastModifiedCheck = lastModifiedDate.Date.AddHours( lastModifiedDate.Hour ).AddMinutes( lastModifiedDate.Minute ).AddSeconds( lastModifiedDate.Second );

		if ( requestIfModified >= lastModifiedCheck )
		{
			context.Response.Headers.Append( "X-Cache-Status", "NotModified;HIT" );
			context.Response.Headers.Append( "X-Cache", "NotModified;HIT" );
			await Send.StatusCodeAsync( HttpStatusCode.NotModified );
			return;
		}

		context.Response.Headers.LastModified = lastModifiedDate.ToString( "r" );
		var expires = dateTimeService.Now.ToString( "r" );
		context.Response.Headers.Expires = expires;
		context.Response.Headers.CacheControl = "public,max-age=0,must-revalidate,proxy-revalidate";

		await sendUpdatedResponse();		
	}
}