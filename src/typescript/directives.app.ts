namespace KatApps {
	export class DirectiveKaApp implements IKaDirective {
		public name = "ka-app";
		public getDefinition(application: KatApp): Directive<Element> {
			return ctx => {
				const scope: IKaAppModel = ctx.get();
				const view = scope.view;

				const propertiesToSkip = ["handlers", "view", "modalAppOptions", "hostApplication", "currentPage"];
			
				const nestedAppOptions = Utils.extend<IKatAppOptions>(
					Utils.clone<IKatAppOptions>(application.options, (k, v) => propertiesToSkip.indexOf(k) > -1 ? undefined : v),
					{
						view: view,
						currentPage: view,
						hostApplication: application,
						inputs: Utils.extend<ICalculationInputs>({ iNestedApplication: "1" } as ICalculationInputs, scope.inputs)
					}
				);
				delete nestedAppOptions.inputs!.iModalApplication;

				const selector = scope.selector ?? ".kaNested" + Utils.generateId();

				// Global (static) event registrations match an application by testing its element against the
				// registered selector, so the element has to actually satisfy the selector it is created with.
				if (selector.startsWith("#")) {
					ctx.el.setAttribute("id", selector.substring(1));
				}
				else if (/^\.[\w-]+$/.test(selector)) {
					ctx.el.classList.add(selector.substring(1));
				}
				else {
					throw new Error(`v-ka-app 'selector' must be a single class (.name) or id (#name) selector: ${selector}`);
				}

				let nestedApp: KatApp | undefined;

				(async () => {
					try {
						await PetiteVue.nextTick(); // Make sure the classList.add() method above finishes
						nestedApp = await KatApp.createAppAsync(selector, nestedAppOptions);
					}
					catch (e) {
						Utils.trace(application, "DirectiveKaApp", "getDefinition", `Nested App ${scope.view} failed.`, TraceVerbosity.None, e);
					}
				})();

				return () => {
					if (nestedApp != undefined) {
						KatApp.remove(nestedApp);
					}
				}
			};
		}
	}
}