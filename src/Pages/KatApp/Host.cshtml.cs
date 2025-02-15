using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

using KAT.Camelot.Domain.Web.KatApps;

namespace KAT.Camelot.RCL.KatApp.Pages.KatApp;

#nullable disable

public class Host : PageModel
{
	public record Parameters
    {
        public string ViewId { get; init; } = "Channel.Home";
    }

    public record Model
    {
        public string ViewId { get; init; }
		public KatAppConfigurationOptions Options { get; init; }
    }

	private readonly KatAppConfigurationOptions configurationOptions;

	public Host( KatAppConfigurationOptions configurationOptions )
	{
		this.configurationOptions = configurationOptions;
	}

    public Model Data { get; private set; }

	public void OnGet( [FromRoute] Parameters parameters )
	{
		Data = new Model
		{
			ViewId = parameters.ViewId,
			Options = configurationOptions
		};
	}
}
