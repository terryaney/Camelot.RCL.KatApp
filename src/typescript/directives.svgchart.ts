namespace KatApps {
	export class DirectiveKaSvgChart implements IKaDirective {
		public name = "ka-svgchart";

		private application: KatApp | undefined;

		public getDefinition(application: KatApp): Directive<Element> {

			return ctx => {
				this.application = application;
				const el = ctx.el as HTMLElement;

				ctx.effect(() => {
					const scope: IKaHighchartModel = ctx.get();
					const data = application.state.rbl.source(`HighCharts-${scope.data}-Data`, scope.ce, scope.tab) as Array<IRblHighChartsDataRow>;
					const optionRows = application.state.rbl.source<IRblHighChartsOptionRow>(`HighCharts-${scope.options ?? scope.data}-Options`, scope.ce, scope.tab);
					const overrideRows = application.state.rbl.source<IRblHighChartsOptionRow>("HighCharts-Overrides", scope.ce, scope.tab, r => String.compare(r.id, scope.data, true) == 0);

					const dataRows = data.filter(r => !r.category.startsWith("config-"));
					const seriesConfigurationRows = data.filter(r => r.category.startsWith("config-"));

					if (dataRows.length > 0) {

					}

					// empty the element
					el.replaceChildren();
					const container = document.createElement("div");
					container.innerHTML = `<b>SVG chart with ${dataRows.length} rows of data.</b>`
					el.appendChild(container);
				});
			};
		}
	}
}