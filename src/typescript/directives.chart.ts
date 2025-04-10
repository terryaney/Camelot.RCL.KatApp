namespace KatApps {
	export class DirectiveKaChart implements IKaDirective {
		public name = "ka-chart";

		private ns = "http://www.w3.org/2000/svg"
		private application: KatApp | undefined;
		private chartConfiguration!: IRblChartConfiguration<IRblChartConfigurationDataType>;

		public getDefinition(application: KatApp): Directive<Element> {
			return ctx => {
				this.application = application;
				const el = ctx.el as HTMLElement;

				ctx.effect(() => {
					const scope: IKaChartModel = ctx.get();

					const data = application.state.rbl.source(scope.data, scope.ce, scope.tab) as any as Array<IRblChartDataRow>;

					const dataRows = data.filter(r => r.id == "category");
					const configRows = data.filter(r => r.id != "category");

					// empty the element
					el.replaceChildren();

					const chartType = this.getOptionValue(configRows, "type") as IRblChartConfigurationType;

					if (dataRows.length > 0 && chartType) {

						this.buildChartConfiguration(chartType, configRows, dataRows);
			
						switch (chartType) {
							case "donut":
								this.generateDonutChart(scope.data, el);
								break;
							
							case "column":
							case "columnStacked":
								this.generateColumnChart(scope.data, el);
								break;
								
							default:
								el.innerHTML = `<b>${scope.data} ${chartType} chart not supported</b>`;
								break;
						}
					}
				});
			};
		}
		
		buildChartConfiguration(chartType: IRblChartConfigurationType, configRows: IRblChartDataRow[], dataRows: IRblChartDataRow[]) {
			
			// Ideas for 'config' settings when needed: https://api.highcharts.com/highcharts

			const dataColumns = (Object.keys(dataRows[0]) as Array<IRblChartColumnName>).filter(c => c.startsWith("data"));

			const text = configRows.find(r => r.id == "text")!;
			const colors = configRows.find(r => r.id == "color")!;
			const shapes = configRows.find(r => r.id == "shape") ?? {} as IRblChartDataRow;

			const showLegend = String.compare(this.getOptionValue(configRows, "legend.show"), "true", true) === 0;

			const tipShow: IRblChartConfigurationTipShowOption = this.getOptionValue(configRows, "tip.show") as IRblChartConfigurationTipShowOption ?? "category";
			const tipIncludeShape = String.compare(this.getOptionValue(configRows, "tip.includeShape") ?? "true", "true", true) === 0;

			const config: IRblChartConfiguration<IRblChartConfigurationDataType> = {
				data: [],

				chart: { type: chartType } as unknown as IRblChartConfigurationChart,

				categories: dataColumns.map<IRblChartConfigurationCategory>(c => ({
					text: text[c]!,
					color: colors[c]!,
					shape: (shapes[c] ?? "square") as IRblChartConfigurationShape,
					dataLabel: {
						show: String.compare(this.getOptionValue(configRows, "dataLabels.show"), "true", true) === 0
					}
				})),

				legend: {
					show: showLegend
				},

				tip: {
					show: tipShow,
					includeShape: tipIncludeShape,
					padding: { top: 5, left: 5 } // Param?
				},

				yAxis: {
					label: this.getOptionValue(configRows, "yAxis.label"),
					tickCount: +(this.getOptionValue(configRows, "yAxis.tickCount") ?? "5")
				}
			};

			switch (chartType) {
				case "column":
				case "columnStacked":
					const yAxisLabelPadding = config.yAxis.label ? 40 : 0; // Add extra padding if yAxisLabel is set
					config.chart.width = 400; // Param?
					config.chart.height = 400 // Param?
					config.chart.padding = { top: 40, right: 40, bottom: 60, left: 100 + yAxisLabelPadding }; // Param?

					config.data = chartType == "column"
						? dataColumns.map(c => ({ name: text[c]!, data: +dataRows[0][c]! }))
						: dataRows.map(r => {
							return {
								name: r.value!,
								data: dataColumns.map(c => +r[c]!)
							};
						});

					break;
				
				case "donut":
					config.chart.padding = { top: 10, right: 10, bottom: 10, left: 10 }; // Param?
					config.data = dataColumns.map(c => ({ name: text[c]!, data: +dataRows[0][c]! }))
					break;
			}

			console.log(config);

			this.chartConfiguration = config
		}

		private generateColumnChart(chartName: string, el: HTMLElement) {
			const config = this.chartConfiguration as IRblChartConfiguration<IRblChartConfigurationDataType>;
			const chartClass = `ka-chart-${chartName.toLowerCase()}`;
			el.classList.add(chartClass);
			
			const chartWidth = config.chart.width - config.chart.padding.left - config.chart.padding.right;
			const columnCount = config.data.length;
			const columnWidth = chartWidth / columnCount * 0.6;
			const columnSpacing = chartWidth / columnCount - columnWidth;

			const maxLabelLines = Math.max(
				...config.data.map(item => {
					const words = item.name.split(" ");
					const lines = [];
					let currentLine = "";
			
					words.forEach(word => {
						const testLine = currentLine ? `${currentLine} ${word}` : word;
						const testLineWidth = testLine.length * 6; // Approximate width per character
						if (testLineWidth <= columnWidth) {
							currentLine = testLine;
						} else {
							lines.push(currentLine);
							currentLine = word;
						}
					});
					if (currentLine) lines.push(currentLine);
			
					return Math.min(lines.length, 5) - 1; // Limit to 5 lines max, then deduct one b/c original padding handles single line
				})
			);
			config.chart.padding.bottom += maxLabelLines * 15; // Add 15px per line

			const chartHeight = config.chart.height - config.chart.padding.top - config.chart.padding.bottom;

			const yAxisBase = config.chart.height - config.chart.padding.bottom;

			const xAxisLine = this.createLine(config.chart.padding.left, yAxisBase, config.chart.width - config.chart.padding.right, yAxisBase);
			const yAxisLine = this.createLine(config.chart.padding.left, config.chart.padding.top, config.chart.padding.left, yAxisBase);

			const yAxisLabelX = config.chart.padding.left / 3;
			const yAxisLabelY = config.chart.height / 2;

			const yAxisLabel = config.yAxis.label
				? this.createText(yAxisLabelX, yAxisLabelY, config.yAxis.label, { "font-size": 14, fill: "black", "text-anchor": "middle", transform: `rotate(-90, ${yAxisLabelX}, ${yAxisLabelY})` })
				: undefined;

			const maxColumnValue = Math.max(
				...config.data.map(item =>
					Array.isArray(item.data)
						? item.data.reduce((sum, v) => sum + v, 0)
						: item.data
				)
			) * 1.1; // Add 10% buffer...

			const yAxisInterval = this.calculateYAxisInterval(maxColumnValue, config.yAxis.tickCount);
			const yAxisMax = Math.ceil(maxColumnValue / yAxisInterval) * yAxisInterval;
			
			const yAxisTicks =
				Array.from({ length: Math.ceil(yAxisMax / yAxisInterval) + 1 }, (_, i) => i * yAxisInterval)
					.flatMap((value, i) => {
						const y = config.chart.padding.top + chartHeight - (value / yAxisMax) * chartHeight;
						
						const tickLine = i != 0
							? this.createLine(config.chart.padding.left, y, config.chart.width - config.chart.padding.right, y, "#e6e6e6")
							: undefined;

						const tickLabel = this.createText(config.chart.padding.left - 10, y, this.formatNumber(value, "currency"), { "text-anchor": "end", "font-size": 14, "dominant-baseline": "middle" })
						return tickLabel ? [tickLine!, tickLabel!] : [tickLine!];
					});
			
			const getSeriesY = (value: number) => chartHeight - (value / yAxisMax) * chartHeight;

			const getColumnElement = (elementX: number, elementY: number, elementName: string, value: number, elementIndex: number, tipKey?: string, columnName?: string) => {
				const columnHeight = (value / yAxisMax) * chartHeight;
				const valueFormatted = this.formatNumber(value, "currency");

				const rect = this.createRect(elementX, elementY, columnWidth, columnHeight, config.categories[elementIndex].color, "#ffffff", 1);
				rect.setAttribute("aria-label", `${elementName}, ${valueFormatted}.${columnName ? ` ${this.encodeHtmlAttributeValue(columnName)}.` : ""}`);

				const tooltipContent = tipKey
					? this.createTooltip(chartClass, tipKey, rect, [{ name: elementName, value: valueFormatted, color: config.categories[elementIndex].color, shape: config.categories[elementIndex].shape }], columnName)
					: undefined;

				return { rect, tooltipContent };
			};

			const columns = config.data.map((item, i) => {
				const columnX = config.chart.padding.left + (i * (columnWidth + columnSpacing)) + columnSpacing / 2;

				const columnLabel = this.createText(
					columnX + columnWidth / 2, // center...
					config.chart.height - config.chart.padding.bottom + 20,
					item.name,
					{ "text-anchor": "middle", "font-size": "0.9em", "dominant-baseline": "middle" },
					columnWidth
				);
				
				let stackBase = 0;
				const columnElements = item.data instanceof Array
					// Stacked ...
					? item.data.map((v, j) => {
						const element = getColumnElement(
							columnX, config.chart.padding.top + getSeriesY(stackBase + v),
							this.chartConfiguration.categories[j].text, v, j,
							config.tip.show == "series" ? `${i}-${j}` : undefined, item.name
						);
						stackBase += v;
						return element;
					})
					: [getColumnElement(columnX, config.chart.padding.top + getSeriesY(item.data), item.name, item.data, i)];

				const g = document.createElementNS(this.ns, "g");
				let tooltip: Element | undefined = undefined;
				
				if (config.tip.show == "category") {
					const seriesTipInfo = (item.data instanceof Array
						? item.data.map((v, j) => {
							return v > 0
								? {
									name: config.categories[j].text,
									value: this.formatNumber(v, "currency"),
									category: config.categories[j]
								}
								: undefined;
						}).filter(v => v != undefined)
						: [{
							name: item.name,
							value: this.formatNumber(item.data, "currency"),
							category: config.categories[i]
						}]
					).map(item => {
						return {
							name: item!.name,
							value: item!.value,
							color: item!.category.color,
							shape: item!.category.shape
						};
					});

					tooltip = seriesTipInfo.length > 0 ? this.createTooltip(chartClass, String(i), g, seriesTipInfo, item.name) : undefined;
				}
			
				g.appendChild(columnLabel);
				g.append(...columnElements.map(e => e.rect));

				return { g, tooltips: columnElements.filter(e => e.tooltipContent != undefined).map(e => e.tooltipContent!).concat(tooltip ? [tooltip] : []) };
			});
			
			const svg = document.createElementNS(this.ns, "svg");
			svg.setAttribute("viewBox", `0 0 ${config.chart.width} ${config.chart.height}`);
			svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

			if (yAxisLabel != undefined) svg.appendChild(yAxisLabel);

			svg.append(...yAxisTicks);
			svg.append(...columns.map(c => c.g))
			svg.appendChild(xAxisLine);			
			
			el.appendChild(svg);

			if (columns.some(c => c.tooltips.length > 0)) {
				const tips = document.createElement("div");
				tips.style.display = "none";
				tips.append(...columns.filter(c => c.tooltips.length > 0).flatMap(c => c.tooltips!));
				el.appendChild(tips);
			}

			svg.querySelectorAll("rect").forEach(rect => {
				rect.addEventListener("mouseover", () => rect.setAttribute("opacity", "0.7"));
				rect.addEventListener("mouseout", () => rect.setAttribute("opacity", "1"));
			});				
		}

		private generateDonutChart(chartName: string, el: HTMLElement): void {
			const config = this.chartConfiguration as IRblChartConfiguration<number>;
			
			const chartClass = `ka-chart-${chartName.toLowerCase()}`;
			el.classList.add(`ka-chart-${config.chart.type}`, chartClass);

			const total = config.data.reduce((sum, item) => sum + item.data, 0);

			const radius = 80;
			const strokeWidth = 35;
			const normalizedRadius = radius - strokeWidth / 2;

			// Create segments
			let currentAngle = 0;
			const segments = config.data.map((item, index) => {
				// Calculate the angles
				const angle = (item.data / total) * 360;
				const startAngle = currentAngle;
				currentAngle += angle;

				// Calculate the arc
				const x1 = normalizedRadius * Math.cos((startAngle - 90) * Math.PI / 180) + radius;
				const y1 = normalizedRadius * Math.sin((startAngle - 90) * Math.PI / 180) + radius;
				const x2 = normalizedRadius * Math.cos((currentAngle - 90) * Math.PI / 180) + radius;
				const y2 = normalizedRadius * Math.sin((currentAngle - 90) * Math.PI / 180) + radius;

				// Determine if the arc should take the long path or short path
				const largeArcFlag = angle > 180 ? 1 : 0;

				const valueFormatted = this.formatNumber(item.data, "currency");

				const path = document.createElementNS(this.ns, "path");
				path.setAttribute("key", String(index));
				path.setAttribute("d", `M ${radius} ${radius} L ${x1} ${y1} A ${normalizedRadius} ${normalizedRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`);
				path.setAttribute("fill", config.categories[index].color);
				path.setAttribute("aria-label", `${item.name}, ${valueFormatted}.`);

				const tooltipContent = config.tip.show != "off"
					? this.createTooltip(chartClass, String(index), path, [{ name: item.name, value: valueFormatted, color: config.categories[index].color, shape: config.categories[index].shape }])
					: undefined;

				return { path, tooltipContent };
			});

			const svg = document.createElementNS(this.ns, "svg");
			svg.setAttribute("viewBox", `0 0 ${radius * 2} ${radius * 2}`);
			svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

			segments.forEach(segment => svg.appendChild(segment.path));

			const circle = this.createCircle(radius, radius, radius - strokeWidth, "white");
			svg.appendChild(circle);

			const text = this.createText(
				radius, radius, this.formatNumber(total, "currency"),
				{ "text-anchor": "middle", "dominant-baseline": "middle", "font-family": "Arial", "font-size": 14, "font-weight": "bold" },
			)
			svg.appendChild(text);

			el.appendChild(svg);

			if (segments.some(s => s.tooltipContent)) {
				const tips = document.createElement("div");
				tips.style.display = "none";
				tips.append(...segments.filter(s => s.tooltipContent != undefined).map(s => s.tooltipContent!));
				el.appendChild(tips);
			}

			svg.querySelectorAll("path").forEach(path => {
				path.addEventListener("mouseover", () => path.setAttribute("opacity", "0.7"));
				path.addEventListener("mouseout", () => path.setAttribute("opacity", "1"));
			});
		}

		private createText(x: number, y: number, text: string, properties: {} | undefined = { "font-size": "14", "fill": "black" }, maxTextWidth?: number): Element {
			const textSvg = document.createElementNS(this.ns, "text");
			textSvg.setAttribute("x", String(x));
			textSvg.setAttribute("y", String(y));

			if (properties) {
				for (const [key, value] of Object.entries(properties)) {
					textSvg.setAttribute(key, String(value));
				}
			}

			if (maxTextWidth) {
				const words = text.split(" ");
				const lines = [];
				let currentLine = "";
			
				words.forEach(word => {
					const testLine = currentLine ? `${currentLine} ${word}` : word;
					const testLineWidth = testLine.length * 6; // Approximate width per character (adjust as needed)
					if (testLineWidth <= maxTextWidth) {
						currentLine = testLine;
					} else {
						lines.push(currentLine);
						currentLine = word;
					}
				});

				if (currentLine) lines.push(currentLine);

				lines.slice(0, 5).forEach((line, index) => {
					const tspan = document.createElementNS(this.ns, "tspan");
					tspan.setAttribute("x", String(x));
					tspan.setAttribute("dy", index === 0 ? "0" : "15");
					tspan.textContent = line;
					textSvg.appendChild(tspan);
				});
			}
			else {
				textSvg.textContent = text;
			}

			return textSvg;
		}

		private createLine(x1: number, y1: number, x2: number, y2: number, stroke: string | undefined = "black", strokeWidth: number = 1): Element {
			const line = document.createElementNS(this.ns, "line");
			line.setAttribute("x1", String(x1));
			line.setAttribute("y1", String(y1));
			line.setAttribute("x2", String(x2));
			line.setAttribute("y2", String(y2));
			
			if (stroke) {
				line.setAttribute("stroke", stroke);
				line.setAttribute("stroke-width", String(strokeWidth));
			}

			return line;
		}

		private createCircle(cx: number, cy: number, radius: number, fill: string, stroke?: string, strokeWidth?: number): Element {
			const circle = document.createElementNS(this.ns, "circle");
			circle.setAttribute("cx", String(cx));
			circle.setAttribute("cy", String(cy));
			circle.setAttribute("r", String(radius));
			circle.setAttribute("fill", fill);

			if (stroke) {
				circle.setAttribute("stroke", stroke);
				circle.setAttribute("stroke-width", String(strokeWidth));
			}

			return circle;
		}

		private createRect(x: number, y: number, width: number, height: number, fill: string, stroke?: string, strokeWidth?: number): Element {
			const rect = document.createElementNS(this.ns, "rect");
			rect.setAttribute("x", String(x));
			rect.setAttribute("y", String(y));
			rect.setAttribute("width", String(width));
			rect.setAttribute("height", String(height));
			rect.setAttribute("fill", fill);

			if (stroke) {
				rect.setAttribute("stroke", stroke);
				rect.setAttribute("stroke-width", String(strokeWidth));
			}

			return rect;
		}

		private createTooltip(chartClass: string, targetKey: string, target: Element, tipLines: Array<{name: string, value: string, color: string, shape: IRblChartConfigurationShape}>, header?: string): Element {
			target.setAttribute("data-bs-toggle", "tooltip");
			target.setAttribute("data-bs-placement", "auto");
			target.setAttribute("data-bs-container", `.${chartClass}`);
			target.setAttribute("data-bs-class", "ka-chart-tip");
			target.setAttribute("data-bs-width", "auto");
			target.setAttribute("data-bs-content-selector", `.${chartClass} .tooltip-${targetKey}`);

			const tooltipContent = document.createElement("div");
			tooltipContent.className = `tooltip-${targetKey}`;

			const maxTextWidth = Math.max(...[(header ?? "").length].concat(tipLines.map(item => `${item.name}: ${item.value}`.length))) * 7; // Approximate width of each character			
			const svgWidth = maxTextWidth + this.chartConfiguration.tip.padding.left * 2; // Add padding to the width

			const tooltipSvg = document.createElementNS(this.ns, "svg");
			tooltipSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${(tipLines.length + (header ? 1 : 0)) * 20 + this.chartConfiguration.tip.padding.top * 2}`);
			tooltipSvg.setAttribute("width", String(svgWidth));

			const tipLineBaseY = header ? 17 : 0;
			if (header) {
				const categoryText = this.createText(0, tipLineBaseY, header, { "font-size": "0.9em", "font-weight": "bold" });
				categoryText.textContent = header;
				tooltipSvg.appendChild(categoryText);
			}

			const shapeXPadding = this.chartConfiguration.tip.includeShape ? 15 : 0;

			tipLines.forEach((item, i) => {
				const y = tipLineBaseY + (i + 1) * 20;
				if (this.chartConfiguration.tip.includeShape) {
					tooltipSvg.appendChild(this.getSeriesShape(y, item.shape, item.color));
				}
				const text = this.createText(shapeXPadding, y, `${item.name}: `, { "font-size": "1.1em" });
				const tspan = document.createElementNS(this.ns, "tspan");
				tspan.setAttribute("font-weight", "bold");
				tspan.textContent = item.value;
				text.appendChild(tspan);
				tooltipSvg.appendChild(text);
			});

			tooltipContent.appendChild(tooltipSvg);
			return tooltipContent;
		}

		private getSeriesShape(y: number, shape: IRblChartConfigurationShape, color: string): Element {
			switch (shape) {
				case "circle":
					return this.createCircle(5, y - 5, 5, color);
				case "square":
				default:
					return this.createRect(0, y - 10, 10, 10, color);
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