// Hack to get type checking on 'static' methods
interface IKatApp {
    debugNext(saveLocation: string, serverOnly: boolean, trace: boolean, expireCe: boolean): void;
}
interface KatAppStatic {
	get(selector: string): IKatApp;
	handleEvents(selector: string, configAction: (config: IKatAppEventsConfiguration) => void): void;
}
interface KatAppsStatic {
	Utils: {
		getSessionItem(options: any, key: string): string | undefined;
		setSessionItem(options: any, key: string, value: string): void;
	}
}
declare const KatApp: KatAppStatic;
declare const KatApps: KatAppsStatic;

(function () {
	window.rcl = ( window.rcl ?? {} ) as any;
	window.rcl!.katApp = {
		hideLoader: hasUnhandledException => {
			document.querySelector<HTMLElement>(".katapp-host .loader-container")!.style.display = "none";
		
			if (!hasUnhandledException) {
				// equivalent to jQuery fadeIn()
				const container = document.querySelector<HTMLElement>(".katapp-host .app-container")!;
				const duration = 400;
				container.style.opacity = "0";
				container.style.display = "";
		
				let last = +new Date();
				const tick = () => {
					const date = +new Date();
					const opacity = +container.style.opacity + (date - last) / duration;
					container.style.opacity = `${opacity}`;
					last = date;
		
					if (opacity < 1) {
						requestAnimationFrame(tick);
					}
					else {
						container.style.removeProperty('opacity');
					}
				};
		
				tick();
			}
		},

		showUnexpectedError: application => {
			const summaryTemplate = application.getTemplateContent("validation-summary");
		
			let template = document.createElement('template');
			template.innerHTML = [...summaryTemplate.children].find(e => e.classList.contains("validation-summary"))!.outerHTML;
			const validationSummary = template.content.firstElementChild!;
			validationSummary.querySelectorAll("li, .visually-hidden p").forEach(e => e.remove());

			validationSummary.querySelectorAll<HTMLElement>("[v-ka-resource]").forEach(e => {
				e.innerHTML = application.getLocalizedString(e.getAttribute("v-ka-resource")!)!;
			});

			[...validationSummary.attributes].forEach(a => {
				if ((a.name.startsWith("v-") && a.name != "v-ka-resource") || a.name.startsWith(":") || a.name.startsWith("@")) {
					validationSummary.removeAttribute(a.name);
				}
			});
			[...validationSummary.classList].forEach(c => {
				if (c.startsWith("ka-")) {
					validationSummary.classList.remove(c);
				}
			});
			validationSummary.id = application.id + "_ModelerValidationTable";

			template = document.createElement('template');
			template.innerHTML = `<li>${application.getLocalizedString("An unexpected error has occurred.  Please try again and if the problem persists, contact technical support.")}</li>`;
			validationSummary.querySelector<HTMLElement>("ul")!.append(template.content.firstElementChild!);

			template = document.createElement('template');
			template.innerHTML = `<p>${application.getLocalizedString("An unexpected error has occurred.  Please try again and if the problem persists, contact technical support.")}</p>`;
			validationSummary.querySelector<HTMLElement>(".visually-hidden")!.append(template.content.firstElementChild!);

			document.querySelector<HTMLElement>(".katapp-host .summary-container")!.append(validationSummary);

			document.querySelectorAll<HTMLElement>(".katapp-host .summary-container .validation-summary, .katapp-host .validation-container").forEach(e => e.style.display = "");
			document.querySelector<HTMLElement>(".katapp-host .loader-container")!.style.display = "none";
		},

		initializeDebugModal: (modalSelector, appSelector) => {
			const modal = document.querySelector<HTMLElement>(modalSelector);
			const app = KatApp.get(appSelector ?? ".katapp");

			if (modal == undefined || app == undefined) return;

			const ceInput = modal.querySelector<HTMLInputElement>(".iRBLSaveCalcEngine")!;
			modal.addEventListener("show.bs.modal", () => {
				ceInput.value = KatApps.Utils.getSessionItem(app.options, "debug.location") ?? "";
			});
			modal.addEventListener("shown.bs.modal", () => {
				ceInput.focus();
				ceInput.select();
			});

			const closeDebugNext = () => {
				const saveLocation = ceInput.value;
				const trace = modal.querySelector<HTMLInputElement>(".iRBLTraceCalcEngine")!.checked;
				const serverOnly = modal.querySelector<HTMLInputElement>(".iRBLSaveServerOnly")!.checked;
				const expireCe = modal.querySelector<HTMLInputElement>(".iRBLExpireCache")!.checked;
				if (saveLocation != "") {
					KatApps.Utils.setSessionItem(app.options, "debug.location", saveLocation);
				}
	
				app.debugNext(saveLocation, serverOnly, trace, expireCe);
				bootstrap.Modal.getInstance(modal).hide();
			};

			ceInput.addEventListener("keypress", e => {
				if (e.keyCode == 13) {
					e.preventDefault();
					closeDebugNext();
				}
			});
			modal.querySelector(".btnDebugNext")!.addEventListener("click", e => {
				e.preventDefault();
				closeDebugNext();
			});
		},

		bindAllKatApps: (getEvents, selector, includeContainedApps) => {
			const coreEvents = getEvents();
			KatApp.handleEvents(selector ?? ".katapp", events => {
				for (const propertyName in coreEvents) {
					events[propertyName] = coreEvents[propertyName];
				}
			});

			if (!(includeContainedApps ?? true)) return;
			
			KatApp.handleEvents(selector ?? ".katapp", events => {
				events.nestedAppInitialized = (nestedApplication, hostApplication) => {
					const nestedAppEvents = getEvents(hostApplication, undefined, nestedApplication);
					nestedApplication.handleEvents(nestedEvents => {
						for (const propertyName in nestedAppEvents) {
							nestedEvents[propertyName] = nestedAppEvents[propertyName];
						}
						nestedEvents.modalAppInitialized = modalApplication => {
							const modalAppEvents = getEvents(hostApplication, modalApplication);
							modalApplication.handleEvents(modalEvents => {
								for (const propertyName in modalAppEvents) {
									modalEvents[propertyName] = modalAppEvents[propertyName];
								}
							});
						};
					});
				};

				events.modalAppInitialized = (modalApplication, hostApplication) => {
					const modalAppEvents = getEvents(hostApplication, modalApplication);
					modalApplication.handleEvents(modalEvents => {
						for (const propertyName in modalAppEvents) {
							modalEvents[propertyName] = modalAppEvents[propertyName];
						}
						modalEvents.nestedAppInitialized = nestedApplication => {
							const nestedAppEvents = getEvents(modalApplication, modalApplication, nestedApplication);
							nestedApplication.handleEvents(nestedEvents => {
								for (const propertyName in nestedAppEvents) {
									nestedEvents[propertyName] = nestedAppEvents[propertyName];
								}
							});
						};
					});
				};
			});
		},

		initializeHostEvents: function(selector) {
			let unhandledException = false;
			const that = this;

			KatApp.handleEvents(selector ?? ".katapp", events => {
				// Currently assigning to configureUI and normal because if a Kaml
				// file doesn't have any CalcEngines, it doesn't call configureUI, but
				// when it calls calculation, lastCalculation will be undefined.  For
				// normal calculations, lastCalculation is always defined so we won't 
				// double process (since configureUI would have already triggered what we need).
				events.configureUICalculation = () => that.hideLoader(unhandledException);
				events.calculation = lastCalculation => {
					if (lastCalculation == undefined) {
						that.hideLoader(unhandledException);
					}
				};

				events.rendered = initializationErrors => {
					if (initializationErrors != undefined && initializationErrors.length > 0) {
						that.hideLoader(false);
					}
				};

				events.calculationErrors = (key, exception, application) => {
					if (key == "SubmitCalculation.ConfigureUI") {
						// KatApp loaded, but error occurred during processing and don't even have results to show/hide things appropriately
						unhandledException = true;
						console.error({ exception });
						that.showUnexpectedError(application);
					}
				};
			});
		},

		initializeLoggingEvents: function (selector) {
			this.bindAllKatApps((hostApplication, modalApplication, nestedApplication) => {
				var title =
					modalApplication != undefined && nestedApplication != undefined ? nestedApplication.options.currentPage + " KatApp calculation (Nested Application in " + modalApplication.options.currentPage + " Modal)" :
					nestedApplication != undefined ? nestedApplication.options.currentPage + " KatApp calculation (Nested Application)" :
					modalApplication != undefined ? modalApplication.options.currentPage + " KatApp calculation (Modal Application)" :
					undefined;

				return {
					calculation: (lastCalculation, application) => {
						// console.time("Nexgen.js.calculationLogHandler for " + application.options.view);
						
						if ((lastCalculation?.configuration as any)?.CurrentPage) {
							console.error("CurrentPage is set in the ISubmitApiConfiguration value.  This is not allowed.  Determine what is using it and how to fix.");
						}

						const logTitle = title ?? application.options.currentPage;
						console.group(logTitle + " KatApp calculation");

						if (lastCalculation != undefined) {
							const results = application.options.manualResults != undefined
								? [...lastCalculation.results, ...application.options.manualResults]
								: [...lastCalculation.results];

							console.log("Inputs", lastCalculation.inputs);
							console.log("Results", results);

							if (lastCalculation.diagnostics != undefined || lastCalculation.endpointDiagnostics != undefined && lastCalculation.endpointDiagnostics.length > 0) {
								const diagnostics: { rble?: Array<IRblCalculationDiagnostics>, endpoint?: Array<string> } = { };

								if (lastCalculation.diagnostics != undefined) {
									diagnostics[ "rble"] = lastCalculation.diagnostics.filter(d => d != undefined) as Array<IRblCalculationDiagnostics>;
								}
								if (lastCalculation.endpointDiagnostics != undefined && lastCalculation.endpointDiagnostics.length > 0) {
									diagnostics[ "endpoint"] = lastCalculation.endpointDiagnostics;
								}

								console.log("Diagnostics", diagnostics);
							}
						}

						console.groupEnd();
						// console.timeEnd("Nexgen.js.calculationLogHandler for " + application.options.view);
					}
				};
			}, selector);
		},

		initializeReferrerEvents: function (primarySelector, secondarySelectors, currentPagePrefix) {
			const addReferrer = function (application: IKatApp, results: Array<ITabDef>, inputs: ICalculationInputs) {
				const result = results.find(r => (r["@calcEngine"] as unknown as string).replace("_PROD", "").startsWith(application.calcEngines[0].name));

				if (result != undefined) {
					application.state.rbl.mergeRows(result, "rbl-value",
						[
							{ "id": "currentPage", "value": inputs.iCurrentPage ?? "" },
							{ "id": "parentPage", "value": inputs.iParentPage ?? "" },
							{ "id": "referrerPage", "value": inputs.iReferrer ?? "" },
							{ "id": "isModal", "value": inputs.iModalApplication ?? "0" },
							{ "id": "isNested", "value": inputs.iNestedApplication ?? "0" }
						] as Array<ITabDefRow>
					);
				}
			};
    
			// Referrer Page Mechanics ('back to origin')...
			// 1) Always inject a iCurrentPage input (additionally add a iParentPage for rbl-modal items) before calculation is submitted
			// 2) Before KatApp processes results, inject rbl-value rows of currentPage, parentPage, referrerPage, isModal (via addReferrer())
			//		- note referrerPage will only be present if rbl-navigate injected iReferrer
			// 3) Origin page: rbl-navigate links add manual input of iReferrer via rbl-attr="data-input-referrer:currentPage"
			// 4) Destination page: 'cancel/back' links set up rbl-navigate via rbl-attr="rbl-navigate:referrerPage"
			this.bindAllKatApps(
				(hostApplication, modalApplication, nestedApplication) => {
					var parentPage =
						hostApplication != undefined ? hostApplication.options.currentPage.replace(currentPagePrefix, "") :
						modalApplication != undefined && nestedApplication != undefined ? modalApplication.options.currentPage.replace(currentPagePrefix, "") :
						undefined;

					return {
						initialized: application => {
							if (parentPage != undefined) {
								application.state.inputs.iParentPage = parentPage;
							}
							application.state.inputs.iCurrentPage = application.options.currentPage.replace(currentPagePrefix, "");
						},
						resultsProcessing: (results, inputs, submitApiOptions, application) => {
							addReferrer(application, results, inputs);
						}
					};
				},
				[primarySelector, ...secondarySelectors].join(", ")
			);

			// All secondary applications should set iCurrentPage to current page of primary application
			if (secondarySelectors.length > 0) {
				KatApp.handleEvents(secondarySelectors.join(", "), events => {
					events.initialized = application => {
						const katapp = KatApp.get(primarySelector);

						if (katapp != undefined) {
							application.state.inputs.iCurrentPage = katapp.options.currentPage.replace(currentPagePrefix ?? "", "");
						}
					};

					events.resultsProcessing = (results, inputs, submitApiOptions, application) => {
						addReferrer(application, results, inputs);
					};
				});
			}
		}
	}
})();