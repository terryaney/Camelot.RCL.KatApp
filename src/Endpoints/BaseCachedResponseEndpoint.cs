using System.Net;
using FastEndpoints;
using KAT.Camelot.Domain.Services;
using KAT.Camelot.Infrastructure.Web.Extensions;
using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace KAT.Camelot.RCL.KatApp.Endpoints;

public abstract class BaseCachedResponseEndpoint<TRequest> : BaseCachedResponseEndpoint<TRequest, object> where TRequest : notnull
{
	public BaseCachedResponseEndpoint( IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService )
		: base( httpContextAccessor, dateTimeService ) { }
}

public abstract class BaseCachedResponseEndpointWithoutRequest<TResponse> : BaseCachedResponseEndpoint<EmptyRequest, TResponse>
{
	public BaseCachedResponseEndpointWithoutRequest( IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService )
		: base( httpContextAccessor, dateTimeService ) { }

	public virtual Task HandleAsync( CancellationToken ct ) => throw new NotImplementedException();
	public sealed override Task HandleAsync( EmptyRequest _, CancellationToken ct ) => HandleAsync( ct );
}

public abstract class BaseCachedResponseEndpoint<TRequest, TResponse> : Endpoint<TRequest, TResponse> where TRequest : notnull
{
	private readonly IHttpContextAccessor httpContextAccessor;
	private readonly IDateTimeService dateTimeService;

	public BaseCachedResponseEndpoint( IHttpContextAccessor httpContextAccessor, IDateTimeService dateTimeService )
	{
		this.httpContextAccessor = httpContextAccessor;
		this.dateTimeService = dateTimeService;
	}

	protected async Task SendCachedGetAsync( string id, DateTime lastModifiedDate, Func<Task> sendUpdatedResponse )
	{
		using var _p1 = LogContext.PushProperty( "cacheId", id );
		
		var context = httpContextAccessor.HttpContext!;

		// https://www.geekytidbits.com/efficient-caching-dynamic-resources-asp-net-304-not-modified/
		var rawIfModifiedSince = context.Request.Headers[ "If-Modified-Since" ].ToString();

		var requestIfModified = !string.IsNullOrEmpty( rawIfModifiedSince )
			? DateTime.Parse( rawIfModifiedSince ).ToUniversalTime()
			: DateTime.MinValue;

		// HTTP does not provide milliseconds, so remove it from the comparison
		var lastModifiedCheck = lastModifiedDate.Date.AddHours( lastModifiedDate.Hour ).AddMinutes( lastModifiedDate.Minute ).AddSeconds( lastModifiedDate.Second );

		if ( requestIfModified >= lastModifiedCheck )
		{
			context.Response.Headers.Add( "X-Cache-Status", "NotModified;HIT" );
			context.Response.Headers.Add( "X-Cache", "NotModified;HIT" );
			await this.SendStatusCodeAsync( HttpStatusCode.NotModified );
			return;
		}

		context.Response.Headers.LastModified = lastModifiedDate.ToString( "r" );
		var expires = dateTimeService.Now.ToString( "r" );
		context.Response.Headers.Expires = expires;
		context.Response.Headers.CacheControl = "public,max-age=0,must-revalidate,proxy-revalidate";

		await sendUpdatedResponse();		
	}
}