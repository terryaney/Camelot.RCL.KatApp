namespace KatApps {
	export class HelpTips {
		public static currentPopoverTarget: HTMLElement | undefined;
		private static visiblePopover: HTMLElement | undefined;
		private static visiblePopoverApp: KatApp | undefined;
		private static visiblePopupContentSource: HTMLElement | undefined;
	
		// Code to hide tooltips if you click anywhere outside the tooltip
		// Combo of http://stackoverflow.com/a/17375353/166231 and https://stackoverflow.com/a/21007629/166231 (and 3rd comment)
		// This one looked interesting too: https://stackoverflow.com/a/24289767/166231 but I didn't test this one yet
		public static hideVisiblePopover(selectorPredicate?: string): boolean {
			// Going against entire KatApp (all apps) instead of a local variable because I only setup
			// the HTML click event one time, so the 'that=this' assignment above would be the first application
			// and might not match up to the 'currently executing' katapp, so had to make this global anyway
			const visiblePopover = HelpTips.visiblePopover;
	
			// Just in case the tooltip hasn't been configured
			if (
				visiblePopover?.getAttribute("ka-init-tip") == "true" &&
				( selectorPredicate == undefined || HelpTips.visiblePopoverApp!.el[0].matches(selectorPredicate) )
			) {
				bootstrap.Popover.getInstance(visiblePopover).hide();
				return true;
			}
	
			return false;
		}
	
		public static processHelpTips(container: HTMLElement, selector?: string, tipsToProcess?: NodeListOf<HTMLElement>): void {
			if (document.querySelector("html")!.getAttribute("ka-init-tip") != "true") {
				let clearTargetTimeout: number | undefined;
				const html = document.querySelector("html")!;
				html.setAttribute("ka-init-tip", "true");
				html.addEventListener("click", e => {
					console.log("js", { target: e.target });
					const target = e.target as HTMLElement;
					const targetLink = target.closest("a, button");
					const isInsideTip = target.closest(".popover-header, .popover-body") != undefined;

					if (
						(target.tagName == 'A' && !target.classList.contains("ka-ht-js")) ||
						target.tagName == 'BUTTON' ||
						!isInsideTip ||
						(targetLink != undefined && !targetLink.classList.contains(".ka-ht-js"))
					) {
						HelpTips.hideVisiblePopover();
					}
				});
				html.addEventListener("keyup", e => {
					if (e.key == "Escape") { // esc
						e.preventDefault();
						HelpTips.hideVisiblePopover();
					}
				});
				html.addEventListener("inserted.bs.tooltip", e => {
					const target = e.target as HTMLElement;
					const tipId = "#" + target.getAttribute("aria-describedby");
					const tip = document.querySelector<HTMLElement>(tipId);
					
					if (target.classList.contains("error")) {
						tip?.classList.add("error");
					}
					else if (target.classList.contains("warning")) {
						tip?.classList.add("warning");
					}
				});
				html.addEventListener("inserted.bs.popover", async e => {
					const target = e.target as HTMLElement;
					const application = KatApp.get(target) ?? KatApp.applications.find( a => a.options.canProcessExternalHelpTips ) ?? KatApp.applications[ 0 ];
					const templateId = "#" + target.getAttribute("aria-describedby");

					document.querySelector(templateId)!.classList.add("kaPopup");

					const popupAppOptions = application.cloneOptions(false);

					let cloneHost: string | boolean = false;

					if (HelpTips.visiblePopupContentSource != undefined) {
						// If v-pre on content-selector element, need to set the clone host to either the 
						// selector in v-pre value or the application that hosts the v-pre element
						cloneHost = application.getCloneHostSetting(HelpTips.visiblePopupContentSource);
						if (cloneHost === true) {
							cloneHost = application.selector;
						}
						popupAppOptions.cloneHost = cloneHost;
					}
		
					HelpTips.visiblePopoverApp = await KatApp.createAppAsync(
						templateId,
						popupAppOptions
					);
				});
				html.addEventListener("show.bs.popover", e => {
					if (clearTargetTimeout != undefined) {
						clearTimeout(clearTargetTimeout);
						clearTargetTimeout = undefined;
					}
					HelpTips.hideVisiblePopover();
					HelpTips.currentPopoverTarget = e.target as HTMLElement;
				});
				html.addEventListener("shown.bs.popover", e => HelpTips.visiblePopover = e.target as HTMLElement);
				html.addEventListener("hide.bs.popover", e => {
					if (HelpTips.visiblePopoverApp != undefined) {
						KatApp.remove(HelpTips.visiblePopoverApp);
					}
					HelpTips.visiblePopover = undefined;
					HelpTips.visiblePopoverApp = undefined;
					HelpTips.visiblePopupContentSource = undefined;
					clearTargetTimeout = setTimeout(() => {
						HelpTips.currentPopoverTarget = undefined;
						clearTargetTimeout = undefined;
					}, 200);
				});
			}
	
			const select = (search: string, application: KatApp | undefined, context?: HTMLElement): NodeListOf<HTMLElement> =>
				(context ?? application?.el[0])?.querySelectorAll(search) ??
				document.querySelectorAll(search);
	
			const getTipContent = function (h: HTMLElement) {
				const dataContentSelector = h.getAttribute('data-bs-content-selector');
	
				if (dataContentSelector != undefined) {
					const contentSource = select(dataContentSelector, KatApp.get(h));
					HelpTips.visiblePopupContentSource = contentSource.length > 0 ? contentSource[0] : undefined;

					if (HelpTips.visiblePopupContentSource == undefined) return undefined;
	
					const selectorContent = $("<div/>");
	
					// Use this instead of .html() so I keep my bootstrap events
					selectorContent.append($(HelpTips.visiblePopupContentSource).contents().clone(true));
					return selectorContent;
				}
	
				// See if they specified data-content directly on trigger element.
				const content = h.getAttribute('data-bs-content') ?? ( h.nextElementSibling as HTMLElement )?.innerHTML;
				// Replace {Label} in content with the trigger provided...used in Error Messages
				const labelFix = h.getAttribute("data-label-fix");
	
				return labelFix != undefined
					? content.replace(/\{Label}/g, select("." + labelFix, KatApp.get(h))[0].innerHTML)
					: content;
			};
	
			const getTipTitle = function (h: HTMLElement) {
				if (h.getAttribute('data-bs-toggle') == "tooltip") return getTipContent(h);
					
				const titleSelector = h.getAttribute('data-bs-content-selector');
				if (titleSelector != undefined) {
					const title = select(titleSelector + "Title", KatApp.get(h));
					if (title.length > 0 && title[0].innerHTML != "") {
						return title[0].innerHTML;
					}
				}
				
				return "";
			};
	
			const currentTips = tipsToProcess ??
				select(
					selector ?? "[data-bs-toggle='tooltip'], [data-bs-toggle='popover']",
					KatApp.get(container),
					container.tagName == "A" || container.tagName == "BUTTON"
						? container.parentElement as HTMLElement
						: container
				);
			
			currentTips.forEach(tip => {
				if (tip.getAttribute("ka-init-tip") == "true") return;

				const isTooltip = tip.getAttribute("data-bs-toggle") == "tooltip";

				// When helptip <a/> for checkboxes were moved inside <label/>, attempting to click the help icon simply toggled
				// the radio/check.  This stops that toggle and lets the help icon simply trigger it's own click to show or hide the help.
				if (tip.parentElement?.tagName == "LABEL" && tip.parentElement?.parentElement?.querySelector("input[type=checkbox]") != undefined) {
					tip.addEventListener("click", e => {
						e.stopPropagation();
						tip.click();
					});
				}

				const getTipContainer = function (): string | false | HTMLElement {
					if (tip.hasAttribute('data-bs-container')) return tip.getAttribute('data-bs-container')!;

					if (tip.parentElement != undefined) {
						let el: HTMLElement | null = tip;
						// When tip was inside a LABEL and it just returned tip.parentElement (LABEL) and the container, the actual
						// bootstrap tip was created inside a <LABEL/>. After it opens, if a click occurred inside the popover-body, 
						// two click events were dispatched.  First event was for the popover-body (correct), but then since it is inside a LABEL 
						// with a 'for' attribute, a second click event was triggered as if user clicked on the INPUT (incorrect) and the tooltip
						// would hide prematurely.
						while ((el = el.parentElement) && (el as Node) !== document) {
							if (el.tagName == "LABEL") {
								return el.parentElement;
							}
						}

						return tip.parentElement;
					}
					
					return tip
				};

				const options: BootstrapTooltipOptions = {
					html: true,
					sanitize: false,
					trigger: tip.getAttribute('data-bs-trigger') as any ?? "hover",
					// https://github.com/twbs/bootstrap/issues/22249#issuecomment-289069771
					// There were some <a/> in popup from a kaModal that would not function properly until I changed the container.
					// UPDATE: For 508 compliance, if they don't provide a container, default to the tip.parent/tip so it just appends it after the tip.
					container: getTipContainer(),
					template: isTooltip
						? '<div class="tooltip katapp-css" role="tooltip"><div class="tooltip-arrow arrow"></div><div class="tooltip-inner"></div></div>'
						: '<div v-scope class="popover katapp-css" role="tooltip"><div class="popover-arrow arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',

					placement: (tooltip, trigger) => {
						// Add a class to the .popover element

						// http://stackoverflow.com/a/19875813/166231
						const dataClass = trigger.getAttribute('data-bs-class');
						if (dataClass != undefined) {
							tooltip.classList.add(dataClass);
						}

						// Did they specify a data-width?
						const dataWidth = `${trigger.getAttribute('data-bs-width') ?? "350"}px`;

						// context is for popups, tooltip-inner is for tooltips 
						// (bootstrap css has max-width in css)
						tooltip.style.width = dataWidth;
						tooltip.style.maxWidth = dataWidth;

						const inner = tooltip.querySelector('.tooltip-inner') as HTMLElement;
						if (inner != undefined) {
							inner.style.width = dataWidth;
							inner.style.maxWidth = dataWidth;
						}

						return tip.getAttribute('data-bs-placement') as any ?? "auto";
					},
					fallbackPlacements: tip.getAttribute('data-bs-fallback-placements')?.split(",") ?? [ "top", "right", "bottom", "left" ],
					title: function () {
						return getTipTitle(this);
					},
					content: function () {
						return getTipContent(this);
					}
				};

				if (isTooltip) {
					new bootstrap.Tooltip(tip, options);
				}
				else {
					new bootstrap.Popover(tip, options);
				}

				tip.setAttribute("ka-init-tip", "true");
			});
		}
	}
}