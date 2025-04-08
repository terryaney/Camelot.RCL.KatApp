namespace KatApps {
	export class DirectiveKaSvgChart implements IKaDirective {
		public name = "ka-chart";

		private application: KatApp | undefined;

		public getDefinition(application: KatApp): Directive<Element> {

			return ctx => {
				this.application = application;
				const el = ctx.el as HTMLElement;

				ctx.effect(() => {
					const scope: IKaChartModel = ctx.get();

					const data = application.state.rbl.source(scope.data, scope.ce, scope.tab) as any as Array<IRblChartDataRow>;

					const dataRows = data.filter(r => r.id == "category");
					const configRows = data.filter(r => r.id != "category");
					const dataColumns = dataRows.length > 0 ? (Object.keys(dataRows[0]) as Array<IRblChartColumnName>).filter(c => c.startsWith("data")) : [];

					// empty the element
					el.replaceChildren();

					const chartType = this.getOptionValue(configRows, "type");

					if (dataRows.length > 0 && chartType) {
						// Ideas for 'config' settings when needed: https://api.highcharts.com/highcharts
						switch (chartType) {
							case "donut":
								this.generateDonutChart(scope.data, el, dataRows, dataColumns, configRows);
								break;
							
							case "columnStacked":
								this.generateColumnStacked(scope.data, el, dataRows, dataColumns, configRows);
								break;

							default:
								el.innerHTML = `<b>${scope.data} ${chartType} chart not supported</b>`;
								break;
						}
					}
				});
			};
		}

		private generateColumnStacked(chartName: string, el: HTMLElement, dataRows: IRblChartDataRow[], dataColumns: IRblChartColumnName[], configRows: IRblChartDataRow[]) {
			const chartClass = `ka-chart-${chartName.toLowerCase()}`;

			const colors = configRows.find(r => r.id == "color")!;
			const text = configRows.find(r => r.id == "text")!;
			const showLegend = String.compare(this.getOptionValue(configRows, "legend.show"), "true", true) === 0;
			const seriesShapes = configRows.find(r => r.id == "series.shape")!;
			const yAxisSeriesTip = String.compare(this.getOptionValue(configRows, "yAxis.tip.series"), "true", true) === 0;
			const yAxisStackTip = String.compare(this.getOptionValue(configRows, "yAxis.tip.stack"), "true", true) === 0;
			const yAxisTipIncludeShape = String.compare(this.getOptionValue(configRows, "yAxis.tip.includeShape") ?? "true", "true", true) === 0;
			
			const config = {
				width: 400, // Param?
				height: 400, // Param?
				padding: { top: 40, right: 40, bottom: 60, left: 100 }, // Param?
				colors: dataColumns.map(c => colors[c]!),
				series: dataColumns.map(c => ({ name: text[c]!, shape: seriesShapes?.[c] ?? "square" })),
				legend: {
					show: showLegend
				},
				yAxis: {
					tip: {
						stack: yAxisStackTip || !yAxisSeriesTip,
						series: yAxisSeriesTip && !yAxisStackTip,
						includeShape: yAxisTipIncludeShape
					},
					tickCount: +(this.getOptionValue(configRows, "yAxis.tickCount") ?? "5")
				},
				data: dataRows.map(r => {
					return {
						name: r.value!,
						data: dataColumns.map(c => +r[c]!)
					};
				})
			};

			const chartWidth = config.width - config.padding.left - config.padding.right;
			const chartHeight = config.height - config.padding.top - config.padding.bottom;

			const yAxisBase = config.height - config.padding.bottom;
			const xAxis = `<line x1="${config.padding.left}" y1="${yAxisBase}" x2="${config.width - config.padding.right}" y2="${yAxisBase}" stroke="black" stroke-width="1"></line>`;

			const yAxis = `<line x1="${config.padding.left}" y1="${config.padding.top}" x2="${config.padding.left}" y2="${yAxisBase}" stroke="black" stroke-width="1"></line>`;
			const yAxisLabelX = config.padding.left / 3;
			const yAxisLabelY = config.height / 2;
			const yAxisLabel = `<text x="${yAxisLabelX}" y="${yAxisLabelY}" text-anchor="middle" font-size="14" transform="rotate(-90, ${yAxisLabelX}, ${yAxisLabelY})">Values ($)</text>`;

			const maxStackValue = Math.max(...config.data.map(item => item.data.reduce((sum, val) => sum + val, 0)));
			const yAxisMax = Math.ceil(maxStackValue * 1.1); // Add 10% buffer
			const yAxisInterval = this.calculateYAxisInterval(yAxisMax, config.yAxis.tickCount);
			
			const yAxisTicks =
				Array.from({ length: Math.ceil(yAxisMax / yAxisInterval) + 1 }, (_, i) => i * yAxisInterval)
					.map((value, i) => {
						const y = config.padding.top + chartHeight - (value / yAxisMax) * chartHeight;
						
						// const tickLine = `<line x1="${config.padding.left - 5}" y1="${y}" x2="${config.padding.left}" y2="${y}" stroke="black" stroke-width="1"></line>`;
						const tickLine = i == 0 ? "" : `<line x1="${config.padding.left}" y1="${y}" x2="${config.width - config.padding.right}" y2="${y}" stroke="#e6e6e6" stroke-width="1"></line>`;
						const tickLabel = `<text x="${config.padding.left - 10}" y="${y}" text-anchor="end" font-size="14" dominant-baseline="middle">${this.formatNumber(value, "currency")}</text>`;
						return `${tickLine}${tickLabel}`;
					})
					.join("");

			const columnCount = config.data.length;
			const columnWidth = chartWidth / columnCount * 0.6;
			const columnSpacing = chartWidth / columnCount - columnWidth;

			const getSeriesY = (value: number) => chartHeight - (value / yAxisMax) * chartHeight;

			const columns = config.data.map((item, i) => {
				const columnX = config.padding.left + (i * (columnWidth + columnSpacing)) + columnSpacing / 2;
				const columnLabel = `<text x="${columnX + columnWidth / 2}" y="${config.height - config.padding.bottom + 20}" text-anchor="middle" font-size="0.9em" dominant-baseline="middle">${item.name}</text>`;

				let stackBase = 0;

				const paddingX = 10; // Padding on left and right
				const paddingY = 20; // Padding on top and bottom
				const seriesTextX = config.yAxis.tip.includeShape ? 15 : 0;

				const columnStacks = item.data.map((value, j) => {
					const columnHeight = (value / yAxisMax) * chartHeight;
					const columnY = config.padding.top + getSeriesY(stackBase + value);
					const valueFormatted = this.formatNumber(value, "currency");

					const maxTextWidth = `${config.series[j].name}: ${valueFormatted}`.length * 7; // Approximate width of each character
					const svgWidth = maxTextWidth + paddingX * 2; // Add padding to the width

					const seriesTipContent =
						`<svg viewBox="0 0 ${svgWidth} ${40 + paddingY}" width="${svgWidth}">
							<text x="0" y="${paddingY}" font-size="12" font-weight="bold">${item.name}</text>
							${this.getSeriesShape(config.yAxis.tip.includeShape, config, j, paddingY + 20)}<text x="${seriesTextX}" y="${paddingY + 20}" font-size="12">${config.series[j].name}: <tspan font-weight="bold">${valueFormatted}</tspan></text>
						</svg>`;

					const seriesTip = config.yAxis.tip.series
						? ` data-bs-toggle="tooltip" data-bs-placement="auto" data-bs-container=".${chartClass}" data-bs-class="ka-chart-tip" data-bs-width="auto" data-bs-content="${this.encodeHtmlAttributeValue(seriesTipContent)}"`
						: "";

					const rect = `<rect x="${columnX}" y="${columnY}" width="${columnWidth}" height="${columnHeight}" fill="${config.colors[j]}" stroke="#ffffff" stroke-width="1" aria-label="${item.name}, ${valueFormatted}. ${this.encodeHtmlAttributeValue(config.series[j].name)}."${seriesTip}></rect>`;
					stackBase += value;
					return rect;
				}).join("");

				let stackTipContent = "";
				let stackTooltip = "";

				if (config.yAxis.tip.stack) {
					const seriesTexts = item.data.filter(v => v > 0).map((value, j) => {
						return `${config.series[j].name}: ${this.formatNumber(value, "currency")}`;
					});
					const maxTextWidth = Math.max(...seriesTexts.map(text => text.length)) * 7; // Approximate width of each character
					const svgWidth = maxTextWidth + paddingX * 2; // Add padding to the width

					stackTipContent =
						`<svg viewBox="0 0 ${svgWidth} ${(seriesTexts.length + 1) * 20 + paddingY}" width="${svgWidth}">
							<text x="0" y="${paddingY}" font-size="14" font-weight="bold">${item.name}</text>
							${seriesTexts.map((value, j) => {
								const y = paddingY + (j + 1) * 20;
								return `${this.getSeriesShape(config.yAxis.tip.includeShape, config, j, y)}<text x="${seriesTextX}" y="${y}" font-size="12">${value}</text>`;
							}).join("")}
						</svg>`;
					
					stackTooltip = ` data-bs-toggle="tooltip" data-bs-placement="auto" data-bs-container=".${chartClass}" data-bs-class="ka-chart-tip" data-bs-width="auto" data-bs-content="${this.encodeHtmlAttributeValue(stackTipContent)}"`
				}

				return `<g${stackTooltip}>
					${columnLabel}
					${columnStacks}
				</g>`;
			}).join("");
			
			el.classList.add(chartClass);
			el.innerHTML =
				`<svg viewBox="0 0 ${config.width} ${config.height}" preserveAspectRatio="xMidYMid meet">
					${yAxisTicks}
					${columns}
					${xAxis}
				</svg>`;

			el.querySelectorAll("rect").forEach((rect, index) => {
				rect.addEventListener("mouseover", () => rect.setAttribute("opacity", "0.7"));
				rect.addEventListener("mouseout", () => rect.setAttribute("opacity", "1"));
			});				
		}

		private generateDonutChart(chartName: string, el: HTMLElement, dataRows: Array<IRblChartDataRow>, dataColumns: IRblChartColumnName[], configRows: Array<IRblChartDataRow>): void {
			const chartClass = `ka-chart-${chartName.toLowerCase()}`;

			// Currently only support single data row (single donut)
			const colors = configRows.find(r => r.id == "color")!;
			const text = configRows.find(r => r.id == "text")!;
			const seriesShapes = configRows.find(r => r.id == "series.shape")!;
			const tipIncludeShape = String.compare(this.getOptionValue(configRows, "tip.includeShape") ?? "true", "true", true) === 0;

			const config = {
				colors: dataColumns.map(c => colors[c]!),
				series: dataColumns.map(c => ({ name: text[c]!, shape: seriesShapes?.[c] ?? "square" })),
				tip: {
					show: true,
					includeShape: tipIncludeShape
				},
				data: dataColumns.map(c => +dataRows[0][c]!)
			};

			const total = config.data.reduce((sum, value) => sum + value, 0);

			const radius = 80;
			const strokeWidth = 35;
			const normalizedRadius = radius - strokeWidth / 2;

			// Create segments
			let currentAngle = 0;
			const segments = config.data.map((value, index) => {
				// Calculate the angles
				const angle = (value / total) * 360;
				const startAngle = currentAngle;
				currentAngle += angle;

				// Calculate the arc
				const x1 = normalizedRadius * Math.cos((startAngle - 90) * Math.PI / 180) + radius;
				const y1 = normalizedRadius * Math.sin((startAngle - 90) * Math.PI / 180) + radius;
				const x2 = normalizedRadius * Math.cos((currentAngle - 90) * Math.PI / 180) + radius;
				const y2 = normalizedRadius * Math.sin((currentAngle - 90) * Math.PI / 180) + radius;

				// Determine if the arc should take the long path or short path
				const largeArcFlag = angle > 180 ? 1 : 0;

				// Create the path
				const path = `M ${radius} ${radius} L ${x1} ${y1} A ${normalizedRadius} ${normalizedRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

				const valueFormatted = this.formatNumber(value, "currency");

				const paddingX = 10; // Padding on left and right
				const paddingY = 10; // Padding on top and bottom
				const seriesTextX = config.tip.includeShape ? 15 : 0;
				const maxTextWidth = `${config.series[index].name}: ${valueFormatted}`.length * 7; // Approximate width of each character
				const svgWidth = maxTextWidth + paddingX * 2; // Add padding to the width

				const tooltipContent = 
					`<svg viewBox="0 0 ${svgWidth} ${paddingY + 4}" width="${svgWidth}">
						${this.getSeriesShape(config.tip.includeShape, config, index, paddingY + 2)}<text x="${seriesTextX}" y="${paddingY + 2}" font-size="12">${config.series[index].name}: <tspan font-weight="bold">${valueFormatted}</tspan></text>
					</svg>`;

				const pathTip = config.tip.show
					? ` data-bs-toggle="tooltip" data-bs-placement="auto" data-bs-container=".${chartClass}" data-bs-class="ka-chart-tip" data-bs-width="auto" data-bs-content="${this.encodeHtmlAttributeValue(tooltipContent)}"`
					: "";

				return `<path key="${index}" d="${path}" fill="${config.colors[index]}" aria-label="${config.series[index].name}, ${valueFormatted}."${pathTip}></path>`;
			});

			el.classList.add(chartClass);
			el.innerHTML =
				`<svg viewBox="0 0 ${radius * 2} ${radius * 2}" preserveAspectRatio="xMidYMid meet">
					${segments.join("")}
					<circle cx="${radius}" cy="${radius}" r="${radius - strokeWidth}" fill="white"></circle>
					<text
						x="${radius}"
						y="${radius}"
						text-anchor="middle"
						dominant-baseline="middle"
						font-family="Arial"
						font-size="14"
						font-weight="bold"
					>${this.formatNumber(total, "currency")}</text>
				</svg>`;
			
			el.querySelectorAll("path").forEach((path, index) => {
				path.addEventListener("mouseover", () => path.setAttribute("opacity", "0.7"));
				path.addEventListener("mouseout", () => path.setAttribute("opacity", "1"));
			});
		}

		private getSeriesShape(includeShape: boolean, config: { series: Array<{ shape: string }>, colors: Array<string> }, index: number, y: number): string {
			if (!includeShape) return "";

			switch (config.series[index].shape) {
				case "circle":
					return `<circle cx="10" cy="${y - 5}" r="5" fill="${config.colors[index]}"></circle>`;
				case "square":
				default:
					return `<rect x="0" y="${y - 10}" width="10" height="10" fill="${config.colors[index]}"></rect>`;
			}
		}

		private calculateYAxisInterval(maxValue: number, tickCount: number): number {
			const rawInterval = maxValue / tickCount;
			const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval))); // Magnitude of the interval
			const residual = rawInterval / magnitude; // Fractional part of the interval
		
			// Round the residual to a "nice" number (1, 2, 2.5, 3, 4, 5, or 10)
			const residualBreaks = [1, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20];
			const residualIndex = residualBreaks.findIndex((breakValue) => residual <= breakValue);
			const residualValue = residualIndex === -1 ? residualBreaks[residualBreaks.length - 1] : residualBreaks[residualIndex];
			return residualValue * magnitude; // Final "nice" interval
		}

		private getOptionValue(configRows: Array<IRblChartDataRow>, configurationName: string, configColumn: IRblChartColumnName = "value"): string | undefined {
			return configRows.find(r => String.compare(r.id, configurationName, true) === 0)?.[configColumn];
		}

		private formatNumber(amount: number, style: 'decimal' | 'currency' | 'percent' | 'unit'): string {
			const locales = (window as any).camelot?.internationalization?.locales ?? "en-US";
			const currencyCode = (window as any).camelot?.internationalization?.currencyCode ?? "USD";

			return Intl.NumberFormat(locales, {
				style: style,
				currency: currencyCode,
				minimumFractionDigits: 0,
				maximumFractionDigits: 0
			}).format(amount);
		}

		private encodeHtmlAttributeValue(value: string): string {
			return value
				.replace(/&/g, "&amp;")  // Encode `&` first to avoid double encoding
				.replace(/"/g, "&quot;") // Encode double quotes
				.replace(/'/g, "&#39;")  // Encode single quotes
				.replace(/</g, "&lt;")   // Encode less-than
				.replace(/>/g, "&gt;");  // Encode greater-than
		}
	}
}