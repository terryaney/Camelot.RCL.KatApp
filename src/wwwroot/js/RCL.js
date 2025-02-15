window.rcl = window.rcl || {};
window.rcl.katApp = {
	hideLoader: function(hasUnhandledException) {
		$(".katapp-host .loader-container").hide();
		if (!hasUnhandledException) {
			$(".katapp-host .app-container").fadeIn();
		}
	},

	showUnexpectedError: function(application) {
		// application.state.errors.push({ id: "System", "text": "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });
		const summaryTemplate = application.getTemplateContent("validation-summary");
		const summary = $(summaryTemplate);

		$(".validation-warning-summary, .v-opposite, script", summary).remove();
		$(".validation-summary", summary).removeAttr(":id v-if v-on:vue:mounted").attr("id", application.id + "_ModelerValidationTable");
		$("li, .visually-hidden p", summary).remove();
		$("[v-ka-resource]", summary).each((i, e) => {
			e.innerHTML = application.getLocalizedString(e.getAttribute("v-ka-resource"));
			e.removeAttribute("v-ka-resource");
		});

		$("ul", summary).append(`<li>${application.getLocalizedString("An unexpected error has occurred.  Please try again and if the problem persists, contact technical support.")}</li>`);
		$(".visually-hidden", summary).append(`<p>${application.getLocalizedString("An unexpected error has occurred.  Please try again and if the problem persists, contact technical support.")}</p>`);
		$(".katapp-host .summary-container").append(summary);
		$(".katapp-host .summary-container .validation-summary, .katapp-host .validation-container").show();
		$(".katapp-host .loader-container").hide();
	}
}