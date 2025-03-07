(function () {
	window.rcl = window.rcl || {};
	window.rcl.katApp = {
		hideLoader: function (hasUnhandledException) {
			$(document.querySelector(".katapp-host .loader-container")).hide();
			if (!hasUnhandledException) {
				$(document.querySelector(".katapp-host .app-container")).fadeIn();
			}
		},
	
		showUnexpectedError: function (application) {
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
		},
	
		initializeDebugModal: function (modalSelector, appSelector) {
			const modal = document.querySelector(modalSelector);
			if (modal == undefined) return;
	
			const ceInput = modal.querySelector(".iRBLSaveCalcEngine");
			modal.addEventListener("show.bs.modal", () => {
				ceInput.value = sessionStorage.getItem("ka.debug.location") ?? "";
			});
			modal.addEventListener("shown.bs.modal", () => {
				ceInput.focus();
				ceInput.select();
			});
	
			const closeDebugNext = () => {
				const saveLocation = ceInput.value;
				const trace = modal.querySelector(".iRBLTraceCalcEngine").checked;
				const serverOnly = modal.querySelector(".iRBLSaveServerOnly").checked;
				const expireCe = modal.querySelector(".iRBLExpireCache").checked;
				if (saveLocation != "") {
					sessionStorage.setItem("ka.debug.location", saveLocation);
				}
	
				KatApp.get(appSelector ?? ".katapp").debugNext(saveLocation, serverOnly, trace, expireCe);
				bootstrap.Modal.getInstance(modal).hide();
			};
	
			ceInput.addEventListener("keypress", e => {
				if (e.keyCode == 13) {
					e.preventDefault();
					closeDebugNext();
				}
			});
			modal.querySelector(".btnDebugNext").addEventListener("click", e => {
				e.preventDefault();
				closeDebugNext();
			});
		},

		/**
		 * @callback IGetKatAppEvents
		 * @param {IKatApp|undefined} hostApplication - If the event is being bound to a modal or nested application, the hostApplication will be available.
		 * @param {IKatApp|undefined} modalApplication - If the event is being bound to a modal application, the modalApplication will be available.
		 * @param {IKatApp|undefined} nestedApplication - If the event is being bound to a nested application, the nestedApplication will be available.
		 * @returns {IKatAppEventsConfiguration} - The events to bind to current application.
		 */
		/**
		 *  Binds events to the main katapp and any modal or nested applications it hosts.
		 *  @param {IGetKatAppEvents} getEvents - Delegate to get custom events based on 'applications' passed in.'.
		 *  @param {string | undefined} [selector=.katapp] - The selector to use to determine which application to bind events to.
		 *  @param {boolean | undefined} [includeContainedApps=true] - Whether or not to bind any contained modal/nested applications
		 */
		bindAllKatApps: function (getEvents, selector, includeContainedApps) {
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

		initializeHostEvents: function (selector) {
			var unhandledException = false;

			KatApp.handleEvents(selector ?? ".katapp", events => {
				events.configureUICalculation = events.calculation = () => rcl.katApp.hideLoader(unhandledException);

				events.rendered = initializationErrors => {
					if (initializationErrors != undefined && initializationErrors.length > 0) {
						rcl.katApp.hideLoader(false);
					}
				};

				events.calculationErrors = (key, exception, application) => {
					if (key == "SubmitCalculation.ConfigureUI") {
						// KatApp loaded, but error occurred during processing and don't even have results to show/hide things appropriately
						unhandledException = true;
						console.log({exception});
						rcl.katApp.showUnexpectedError(application);
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
						const logTitle = title ?? lastCalculation?.configuration.CurrentPage ?? application.options.currentPage;
						console.group(logTitle + " KatApp calculation");

						if (lastCalculation != undefined) {
							console.log("Inputs", lastCalculation.inputs);
							
							const results = application.options.manualResults != undefined
								? [...lastCalculation.results, ...application.options.manualResults]
								: [...lastCalculation.results];

							console.log("Results", results);

							if (lastCalculation.diagnostics != undefined) {
								console.log("Diagnostics", lastCalculation.diagnostics);
							}
						}

						console.groupEnd();
						// console.timeEnd("Nexgen.js.calculationLogHandler for " + application.options.view);
					}
				};
			}, selector);
		},
		
        initializeReferrerEvents: function(primarySelector, secondarySelectors, currentPagePrefix) {
			const addReferrer = function (application, results, inputs) {
				const result = results.find(r => r["@calcEngine"].replace("_PROD", "").startsWith(application.calcEngines[0].name));

				if (result != undefined) {
					application.state.rbl.mergeRows(result, "rbl-value",
						[
							{ "id": "currentPage", "value": inputs.iCurrentPage ?? "" },
							{ "id": "parentPage", "value": inputs.iParentPage ?? "" },
							{ "id": "referrerPage", "value": inputs.iReferrer ?? "" },
							{ "id": "isModal", "value": inputs.iModalApplication ?? "0" },
							{ "id": "isNested", "value": inputs.iNestedApplication ?? "0" }
						]
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
	};
})();