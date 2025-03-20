namespace KatApps
{
	export class Calculation {
		public static async calculateAsync(
			application: KatApp,
			serviceUrl: string,
			calcEngines: ICalcEngine[],
			inputs: ICalculationInputs,
			configuration: ISubmitApiConfiguration | undefined
		): Promise<Array<IKatAppCalculationResponse>> {
			Utils.trace(application, "Calculation", "calculateAsync", "Start", TraceVerbosity.Detailed);
	
			const submitConfiguration =
				Utils.extend<ISubmitCalculationConfiguration>(
					{},
					configuration,
					{
						calcEngines: calcEngines.filter(c => !c.manualResult && c.enabled)
							.map(c => ({
								name: c.name,
								inputTab: c.inputTab,
								resultTabs: c.resultTabs,
								pipeline: c.pipeline?.map(p => {
									const ce: ISubmitCalculationCalcEnginePipeline = { name: p.name, inputTab: p.inputTab, resultTab: p.resultTab };
									return ce;
								} )
							} as ISubmitCalculationCalcEngine ))
					} as ISubmitCalculationConfiguration
				);
	
			const inputPropertiesToSkip = ["tables", "getNumber", "getOptionText"];
			const submitData: ISubmitApiData = {
				inputs: Utils.clone(inputs, (k, v) => inputPropertiesToSkip.indexOf(k) > -1 ? undefined : v?.toString()),
				inputTables: inputs.tables?.map<ICalculationInputTable>(t => ({ name: t.name, rows: t.rows })),
				configuration: submitConfiguration
			};
	
			const failedResponses: Array<ICalculationFailedResponse> = [];
			const successResponses: Array<IKatAppCalculationResponse> = [];
	
			try {
				Utils.trace(application, "Calculation", "calculateAsync", "Posting Data", TraceVerbosity.Detailed);
	
				const calculationResults = await this.submitCalculationAsync(application, serviceUrl, inputs, submitData);
				const cachedResults = calculationResults.results.filter(r => r.cacheKey != undefined && r.result == undefined);
	
				// If any items are returned as cache, verify they are there...
				for (var i = 0; i < cachedResults.length; i++) {
					const r = calculationResults.results[i];
					const cacheResult = await this.getCacheAsync(application.options, `RBLCache:${r.cacheKey}`, application.options.decryptCache);
					if (cacheResult == undefined) {
						Utils.trace(application, "Calculation", "calculateAsync", `Cache miss for ${r.calcEngine} with key ${r.cacheKey}`, TraceVerbosity.Detailed);
					}
					else {
						Utils.trace(application, "Calculation", "calculateAsync", `Use cache for ${r.calcEngine}`, TraceVerbosity.Detailed);
						r.cacheKey = undefined; // So it isn't processed anymore
						r.result = cacheResult as IRblCalculationSuccessResponse;
					}
				}
	
				// Any cache misses, need to resubmit them and reassign original results.
				const invalidCacheResults = calculationResults.results.filter(r => r.cacheKey != undefined && r.result == undefined);
	
				if (invalidCacheResults.length > 0) {
					const retryCalcEngines = invalidCacheResults.map(r => r.calcEngine);
					(submitData.configuration as ISubmitCalculationConfiguration).calcEngines = (submitData.configuration as ISubmitCalculationConfiguration).calcEngines.filter(c => retryCalcEngines.indexOf(c.name) > -1);
					(submitData.configuration as ISubmitCalculationConfiguration).invalidCacheKeys = invalidCacheResults.map(r => r.cacheKey!);
					const retryResults = await this.submitCalculationAsync(application, serviceUrl, inputs, submitData);
	
					for (var i = 0; i < retryResults.results.length; i++) {
						const rr = retryResults.results[i];
						const position = calculationResults.results.findIndex(r => r.calcEngine == rr.calcEngine);
						calculationResults.results[position] = rr;
					}
				}
	
				if (calculationResults.results.filter(r => r.cacheKey != undefined && r.result == undefined).length > 0) {
					Utils.trace(application, "Calculation", "calculateAsync", `Client side cache is invalid.`, TraceVerbosity.Detailed);
				}
	
				for (var i = 0; i < calculationResults.results.length; i++) {
					var r = calculationResults.results[i];
					const cacheKey = r.cacheKey;
	
					if (cacheKey != undefined) {
						if (r.result!.exception != undefined) {
							Utils.trace(application, "Calculation", "calculateAsync", `(RBL exception) Remove cache for ${r.calcEngine}`, TraceVerbosity.Detailed);
							Utils.removeSessionItem(application.options, `RBLCache:${cacheKey}`);
						}
						else {
							Utils.trace(application, "Calculation", "calculateAsync", `Set cache for ${r.calcEngine}`, TraceVerbosity.Detailed);
							await this.setCacheAsync(application.options, `RBLCache:${cacheKey}`, r.result!, application.options.encryptCache);
						}
					}
				}
	
				// Didn't want !. checks on result every time after getting results successfully set up
				const mergedResults = calculationResults as {
					results: Array<{
						calcEngine: string;
						result: IRblCalculationSuccessResponse;
					}>;
				};
	
				mergedResults.results.filter(r => r.result.exception != undefined).forEach(r => {
					const response: ICalculationFailedResponse = {
						calcEngine: r.calcEngine,
						diagnostics: r.result.diagnostics,
						configuration: submitConfiguration,
						inputs: inputs,
						exceptions: [{
							message: r.result.exception.message,
							type: r.result.exception.type,
							traceId: r.result.exception.traceId,
							requestId: r.result.exception.requestId,
							stackTrace: r.result.exception.stackTrace
						} as ICalculationResponseException ]
					};
	
					failedResponses.push(response);
				});
	
				mergedResults.results
					.filter(r => r.result.exception == undefined)
					.forEach(r => {
						const tabDefs = r.result.RBL.Profile.Data.TabDef;
						successResponses.push(
							{
								calcEngine: r.calcEngine,
								diagnostics: r.result.diagnostics,
								tabDefs: tabDefs instanceof Array ? tabDefs : [tabDefs]
							});
					});
	
				if (failedResponses.length > 0) {
					throw new CalculationError("Unable to complete calculation(s)", failedResponses);
				}
				return successResponses;
			} catch (e) {
				if (e instanceof CalculationError) {
					throw e;
				}
	
				const exception: ICalculationResponseException = {
					message: e instanceof Error ? e.message : e + "Unable to submit Calculation to " + serviceUrl,
					type: e instanceof Error ? e.name : "Error",
					stackTrace: e instanceof Error
						? e.stack?.split("\n") ?? ["No stack available"]
						: ["Calculation.calculateAsync (rest is missing)"],
				};
	
				if (!(e instanceof Error)) {
					console.error("Original calculation exception (should have been instanceof Error):");
					console.error({ e });
				}
				throw new CalculationError("Unable to complete calculation(s)", [{
					calcEngine: submitConfiguration.calcEngines.map(c => c.name).join(", "),
					inputs: inputs,
					configuration: submitConfiguration,
					exceptions: [exception]
				}]);
			}
		}
	
		static async submitCalculationAsync(
			application: KatApp,
			serviceUrl: string,
			inputs: ICalculationInputs,
			submitData: ISubmitApiData
		): Promise<IRblCalculationSuccessResponses> {
			try {
	
				let calculationResults: IRblCalculationSuccessResponses = await fetch(serviceUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(submitData)
				}).then(async response => {
					const responseText = await response.text();
					const result = responseText == "" ? undefined : JSON.parse(responseText);
	
					if (!response.ok) {
						throw result ?? { exceptions: [{ message: "No additional details available." } as IExceptionDetail] } as IApiErrorResponse;
					}
	
					return result;
				});
				
				Utils.trace(application, "Calculation", "calculateAsync", "Received Success Response", TraceVerbosity.Detailed);
	
				return calculationResults;
	
			} catch (e) {
				const errorResponse = e as IApiErrorResponse;
				const exceptions = errorResponse.exceptions ?? [];
	
				const response: ICalculationFailedResponse = {
					calcEngine: (submitData.configuration as ISubmitCalculationConfiguration).calcEngines.map(c => c.name).join(", "),
					configuration: submitData.configuration,
					inputs: inputs,
					exceptions: exceptions.map(ex => ({
						message: ex.message,
						type: ex.type ?? "Unknown type",
						traceId: ex.traceId,
						requestId: ex.requestId,
						stackTrace: ex.stackTrace,
						apiResult: errorResponse.apiResult,
						apiPayload: errorResponse.apiPayload
					} as ICalculationResponseException))
				};
	
				throw new CalculationError("Unable to complete calculation(s)", [response]);
			}
		}
		
		static async setCacheAsync(options: IKatAppOptions, key: string, data: object, encryptCache: (data: object) => string | Promise<string>): Promise<void> {
			var cacheResult = encryptCache(data);
			if (cacheResult instanceof Promise) {
				cacheResult = await cacheResult;
			}
			KatApps.Utils.setSessionItem(options, key, cacheResult);
		}
		static async getCacheAsync(options: IKatAppOptions, key: string, decryptCache: (cipher: string) => object | Promise<object>): Promise<object | undefined> {
			const data = KatApps.Utils.getSessionItem(options, key);
	
			if (data == undefined) return undefined;
	
			let cacheResult = decryptCache(data);
	
			if (cacheResult instanceof Promise) {
				cacheResult = await cacheResult;
			}
	
			return cacheResult;
		}
	}
}