namespace KatApps {
	export class DirectiveKaModal implements IKaDirective {
		public name = "ka-modal";
		public getDefinition(application: KatApp): Directive<Element> {
			return ctx => {
				let scope: IKaModalModel;

				const showModal = async function (e: Event) {
					e.preventDefault();

					try {
						if (scope.beforeOpenAsync != undefined) {
							await scope.beforeOpenAsync(application);
						}

						const response = await application.showModalAsync(
							Utils.clone(scope, (k, v) => ["beforeOpenAsync", "confirmedAsync", "cancelledAsync", "catchAsync"].indexOf(k) > -1 ? undefined : v),
							e.currentTarget as HTMLInputElement
						);

						if (response.confirmed) {
							if (scope.confirmedAsync != undefined) {
								await scope.confirmedAsync(response.data, application);
							}
							else {
								Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} confirmed.`, TraceVerbosity.Normal, response.data);
							}
						}
						else {
							if (scope.cancelledAsync != undefined) {
								await scope.cancelledAsync(response.data, application);
							}
							else {
								Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} cancelled.`, TraceVerbosity.Normal, response.data);
							}
						}
					} catch (e) {
						if (scope.catchAsync != undefined) {
							await scope.catchAsync(e, application);
						}
						else {
							Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} failed.`, TraceVerbosity.None, e);
						}
					}
					finally {
						if (scope.closed != undefined) {
							scope.closed(application);
						}
					}
				};

				ctx.effect(() => {
					scope = ctx.get();

					try {
						if (scope.model != undefined) {
							scope = ctx.get(scope.model);
						}
					} catch (e) {
						Utils.trace(application, "DirectiveKaModal", "getDefinition", `Unable to compile 'model' property: ${scope.model}`, TraceVerbosity.None, e);
					}

					if (ctx.el.tagName == "A") {
						ctx.el.setAttribute("href", "#");
					}
					ctx.el.removeEventListener("click", showModal);
					ctx.el.addEventListener("click", showModal);
				});

				return () => ctx.el.removeEventListener("click", showModal);				
			};
		}
	}
}