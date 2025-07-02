"use strict";
(function () {
    window.rcl = (window.rcl ?? {});
    window.rcl.katApp = {
        hideLoader: hasUnhandledException => {
            document.querySelector(".katapp-host .loader-container").style.display = "none";
            if (!hasUnhandledException) {
                const container = document.querySelector(".katapp-host .app-container");
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
            template.innerHTML = [...summaryTemplate.children].find(e => e.classList.contains("validation-summary")).outerHTML;
            const validationSummary = template.content.firstElementChild;
            validationSummary.querySelectorAll("li, .visually-hidden p").forEach(e => e.remove());
            validationSummary.querySelectorAll("[v-ka-resource]").forEach(e => {
                e.innerHTML = application.getLocalizedString(e.getAttribute("v-ka-resource"));
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
            validationSummary.querySelector("ul").append(template.content.firstElementChild);
            template = document.createElement('template');
            template.innerHTML = `<p>${application.getLocalizedString("An unexpected error has occurred.  Please try again and if the problem persists, contact technical support.")}</p>`;
            validationSummary.querySelector(".visually-hidden").append(template.content.firstElementChild);
            document.querySelector(".katapp-host .summary-container").append(validationSummary);
            document.querySelectorAll(".katapp-host .summary-container .validation-summary, .katapp-host .validation-container").forEach(e => e.style.display = "");
            document.querySelector(".katapp-host .loader-container").style.display = "none";
        },
        initializeDebugModal: (modalSelector, appSelector) => {
            const modal = document.querySelector(modalSelector);
            const app = KatApp.get(appSelector ?? ".katapp");
            if (modal == undefined || app == undefined)
                return;
            const ceInput = modal.querySelector(".iRBLSaveCalcEngine");
            modal.addEventListener("show.bs.modal", () => {
                ceInput.value = KatApps.Utils.getSessionItem(app.options, "debug.location") ?? "";
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
            modal.querySelector(".btnDebugNext").addEventListener("click", e => {
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
            if (!(includeContainedApps ?? true))
                return;
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
            let unhandledException = false;
            const that = this;
            KatApp.handleEvents(selector ?? ".katapp", events => {
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
                        unhandledException = true;
                        console.error({ exception });
                        that.showUnexpectedError(application);
                    }
                };
            });
        },
        initializeLoggingEvents: function (selector) {
            this.bindAllKatApps((hostApplication, modalApplication, nestedApplication) => {
                var title = modalApplication != undefined && nestedApplication != undefined ? nestedApplication.options.currentPage + " KatApp calculation (Nested Application in " + modalApplication.options.currentPage + " Modal)" :
                    nestedApplication != undefined ? nestedApplication.options.currentPage + " KatApp calculation (Nested Application)" :
                        modalApplication != undefined ? modalApplication.options.currentPage + " KatApp calculation (Modal Application)" :
                            undefined;
                return {
                    calculation: (lastCalculation, application) => {
                        if (lastCalculation?.configuration?.CurrentPage) {
                            console.error("CurrentPage is set in the ISubmitApiConfiguration value.  This is not allowed.  Determine what is using it and how to fix.");
                        }
                        const logTitle = title ?? application.options.currentPage;
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
                            if (lastCalculation.endpointDiagnostics != undefined && lastCalculation.endpointDiagnostics.length > 0) {
                                console.log("EndpointDiagnostics", lastCalculation.endpointDiagnostics);
                            }
                        }
                        console.groupEnd();
                    }
                };
            }, selector);
        },
        initializeReferrerEvents: function (primarySelector, secondarySelectors, currentPagePrefix) {
            const addReferrer = function (application, results, inputs) {
                const result = results.find(r => r["@calcEngine"].replace("_PROD", "").startsWith(application.calcEngines[0].name));
                if (result != undefined) {
                    application.state.rbl.mergeRows(result, "rbl-value", [
                        { "id": "currentPage", "value": inputs.iCurrentPage ?? "" },
                        { "id": "parentPage", "value": inputs.iParentPage ?? "" },
                        { "id": "referrerPage", "value": inputs.iReferrer ?? "" },
                        { "id": "isModal", "value": inputs.iModalApplication ?? "0" },
                        { "id": "isNested", "value": inputs.iNestedApplication ?? "0" }
                    ]);
                }
            };
            this.bindAllKatApps((hostApplication, modalApplication, nestedApplication) => {
                var parentPage = hostApplication != undefined ? hostApplication.options.currentPage.replace(currentPagePrefix, "") :
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
            }, [primarySelector, ...secondarySelectors].join(", "));
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
