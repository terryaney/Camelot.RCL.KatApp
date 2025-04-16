namespace KatApps {
	export class DirectiveKaChart implements IKaDirective {
		public name = "ka-chart";

		private ns = "http://www.w3.org/2000/svg"
		private application: KatApp | undefined;
		private configuration!: IRblChartConfiguration<IRblChartConfigurationDataType>;

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
					const idClass = `ka-chart-${scope.data.toLowerCase()}`;
					Array.from(el.classList).forEach(cls => {
						if (cls.startsWith('ka-chart-')) {
							el.classList.remove(cls);
						}
					});
					el.classList.add(idClass);

					const chartType = this.getOptionValue<IRblChartConfigurationType>(configRows, "type");

					if (dataRows.length > 0 && chartType) {
						const globalOptions = application.state.rbl.source(scope.options ?? "chartOptions", scope.ce, scope.tab) as any as Array<IRblChartDataRow>;
						this.buildChartConfiguration(scope, chartType, globalOptions, configRows, dataRows);

						if (scope.mode != "legend") {
							const chartContainer = document.createElement("div");
							chartContainer.classList.add("ka-chart", `ka-chart-${this.configuration.plotOptions.type}`);

							if (scope.categories?.xs) {
								chartContainer.classList.add("d-none", "d-sm-block");
							}

							if (scope.maxHeight) {
								chartContainer.style.maxHeight = `${scope.maxHeight}px`;
							}
							el.appendChild(chartContainer);

							switch (chartType) {
								case "donut":
									this.generateDonutChart(idClass, chartContainer);
									break;
								
								case "column":
								case "columnStacked":
									this.generateColumnChart(idClass, chartContainer);

									if (scope.categories?.xs) {
										this.configuration.plotOptions.aspectRadio.current = "xs";
										this.configuration.plotOptions.column.count = scope.categories.xs;
										
										const xsContainer = document.createElement("div");
										xsContainer.className = `d-block d-sm-none ka-chart-xs ka-chart-${this.configuration.plotOptions.type}`;

										el.appendChild(xsContainer);	

										const maxHeight = scope.categories.maxHeight ?? scope.maxHeight;

										for (let index = 0; index < Math.ceil(this.configuration.data.length / scope.categories.xs); index++) {
											const plotStart = index * scope.categories.xs;
											const plotEnd = plotStart + scope.categories.xs;
	
											let xsContainerMaxHeight: HTMLElement | undefined = undefined;

											if (maxHeight) {
												xsContainerMaxHeight = document.createElement("div");
												xsContainerMaxHeight.style.maxHeight = `${scope.maxHeight}px`;
												xsContainer.appendChild(xsContainerMaxHeight);	
											}
	
											this.configuration.plotOptions.xAxis.minCategory = plotStart - 0.5;
											this.configuration.plotOptions.xAxis.maxCategory = plotEnd - 0.5;

											const partialData = this.configuration.data.slice(plotStart, plotEnd);
											this.generateColumnChart(idClass, xsContainerMaxHeight ?? xsContainer, { plotStart, plotLabel: "textXs", data: partialData, containerClass: ".ka-chart-xs" });
										}

										if (maxHeight) {
											[...xsContainer.children].forEach(div => div.querySelector("svg")!.style.maxHeight = `${scope.categories!.maxHeight}px`);
										}
									}

									break;
									
								default:
									chartContainer.innerHTML = `<b>${scope.data} ${chartType} chart not supported</b>`;
									return;
							}

							if (scope.maxHeight) {
								chartContainer.querySelector("svg")!.style.maxHeight = `${scope.maxHeight}px`;
							}
						}

						const legendClass = `ka-chart-legend-${this.configuration.plotOptions.name.toLowerCase()}`;

						if (this.configuration.plotOptions.legend) {
							const legendContainer = document.createElement("div");
							legendContainer.className = `ka-chart-legend ka-chart-legend-${this.configuration.plotOptions.type} ${legendClass}`;
							el.appendChild(legendContainer);

							this.addLegend(legendContainer);
						}

						this.addHoverEvents(el, application, scope, legendClass);
					}
				});
			};
		}
		
		private buildChartConfiguration(model: IKaChartModel, chartType: IRblChartConfigurationType, globalOptions: IRblChartOptionRow[], chartOptions: IRblChartDataRow[], dataRows: IRblChartDataRow[]) {
			
			// Ideas for 'config' settings when needed: https://api.highcharts.com/highcharts

			function configRow<T = string>(id: string): IRblChartDataRow<T> {
				return (chartOptions.find(r => r.id == id) ?? {}) as IRblChartDataRow<T>;
			}
			function configRows<T = string>(id: string): Array<IRblChartDataRow<T>> {
				return chartOptions.filter(r => r.id == id) as Array<IRblChartDataRow<T>>;
			}

			const dataColumns = (Object.keys(dataRows[0]) as Array<IRblChartColumnName>).filter(c => c.startsWith("data"));

			switch (chartType) {
				case "columnStacked":
					dataColumns.reverse();
					break;
			}

			const text = configRow("text");
			let data: Array<{ name: string, data: IRblChartConfigurationDataType }> = []
			switch (chartType) {
				// Data 'point' charts with single 'series'
				case "column":
				case "donut":
					data = dataColumns.map(c => ({ name: text[c]!, data: +dataRows[0][c]! }));
					break;
				
				// 'Category' charts with two or more series...
				case "columnStacked":
					data = dataRows.map(r => ({ name: r.value!, data: dataColumns.map(c => +r[c]!) }));
					break;
			}

			const colors = configRow("color");
			const types = configRow<IRblChartSeriesType>("type");
			const globalColors = globalOptions.find(r => r.id == "colors")?.value.split(",") ?? [];
			const globalFormat = globalOptions.find(r => r.id == "format")?.value ?? "c0";
			const shapes = configRow<IRblChartConfigurationShape>("shape");
			const defaultShape = this.getOptionValue<IRblChartConfigurationShape>(chartOptions, "shape", globalOptions, "square") as IRblChartConfigurationShape;
			
			const getBooleanProperty = <T>(property: string, parsedValue: T | undefined, defaultCompare: string, getCompareValue: (value: T) => string = v => v ? "true" : "false"): boolean => {
				return String.compare(
					this.getOptionValue(chartOptions, property, globalOptions, parsedValue == undefined ? defaultCompare : getCompareValue(parsedValue)),
					"true",
					true
				) === 0;
			}

			const tip = JSON.parse(this.getOptionValue(chartOptions, "tip", globalOptions) ?? "{}") as IRblChartConfigurationTip;
			tip.padding = { top: 5, left: 5 }; // Param?
			tip.show = this.getOptionValue<IRblChartConfigurationTipShowOption>(chartOptions, "tip.show", globalOptions, tip.show ?? "category")!;
			tip.headerFormat = this.getOptionValue<IRblChartConfigurationTipShowOption>(chartOptions, "tip.headerFormat", globalOptions, tip.headerFormat);
			tip.headerFormat = this.getOptionValue<IRblChartConfigurationTipShowOption>(chartOptions, "tip.headerFormat", globalOptions, tip.headerFormat);
			tip.includeShape = getBooleanProperty("tip.includeShape", tip.includeShape, "true");
			const chartsToHighlightSeries = ["column", "donut"];
			tip.highlightSeries = getBooleanProperty("tip.highlightSeries", tip.highlightSeries, tip.show == "category" ? (chartsToHighlightSeries.includes(chartType) ? "true" : "false") : "true");


			const dataLabels = JSON.parse(this.getOptionValue(chartOptions, "dataLabels", globalOptions) ?? "{}") as IRblChartConfigurationDataLabels;
			dataLabels.show = getBooleanProperty("dataLabels.show", dataLabels.show, "false");
			dataLabels.format = this.getOptionValue<IRblChartFormatStyle>(chartOptions, "dataLabels.format", globalOptions, dataLabels.format ?? globalFormat)!;

			const aspectRatioValue = this.getOptionValue(chartOptions, "aspectRatio", globalOptions, "1:1")!;
			const aspectRatioConfig = JSON.parse(aspectRatioValue.startsWith("{") ? aspectRatioValue : `{ "value": "${aspectRatioValue}" }`);
			const calcAspectRatio = (ratio: string) => {
				const parts = ratio.split(":");
				return +parts[0] / +parts[1];
			};
			aspectRatioConfig.current = "value";
			aspectRatioConfig.value = calcAspectRatio(aspectRatioConfig.value);
			if (aspectRatioConfig.xs) aspectRatioConfig.xs = calcAspectRatio(aspectRatioConfig.xs);

			const xAxisConfig = {
				label: this.getOptionValue(chartOptions, "xAxis.label", globalOptions),
				format: "c0",
				minCategory: -0.5,
				maxCategory: dataRows.length - 0.5,
				plotBands: configRows("xAxis.plotBand").map(r => JSON.parse(r.value) as IRblChartPlotBand),
				plotLines: configRows("xAxis.plotLine").map(r => JSON.parse(r.value) as IRblChartPlotLine),
				get skipInterval() {
					return Math.ceil(data.length / (this._parent.plotWidth / 25));
				}
			} as IRblChartConfigurationXAxis;

			const yAxisConfig: IRblChartConfigurationYAxis = {
				label: this.getOptionValue(chartOptions, "yAxis.label", globalOptions),
				format: "c0",
				tickCount: +this.getOptionValue(chartOptions, "yAxis.tickCount", globalOptions, "5")!
			};
			const seriesConfig = dataColumns.map<IRblChartConfigurationSeries>((c, i) => {
				return {
					text: text[c]!,
					color: (colors[c] as unknown == "" ? undefined : colors[c]) ?? (i < globalColors.length ? globalColors[i] : "black"),
					shape: (shapes[c] as unknown == "" ? undefined : shapes[c]) ?? (types[c] == "line" ? "line" : undefined) ?? defaultShape,
					legend: String.compare(types[c], "tooltip", true) !== 0,
					type: (types[c] as unknown == "" ? undefined : types[c]) ?? "column"
				};
			});
			
			const maxDataValue = Math.max(
				...data.map(item =>
					Array.isArray(item.data)
						? Math.max(
							item.data.reduce((sum, v, i) => sum + seriesConfig[i].shape != "line" ? v : 0, 0),
							...item.data.map((v, i) => seriesConfig[i].shape == "line" ? v : 0)
						)
						: item.data
				)
			) * (dataLabels.show ? 1.05 : 1.025); // Add 10% buffer...
			const maxDataValueString = this.formatNumber(maxDataValue, yAxisConfig.format) + "000"; // Just some padding to give a little more room

			const hasAxis = chartType != "donut";

			const directive = this;
			const config: IRblChartConfiguration<IRblChartConfigurationDataType> = {
				data: data,

				plotOptions: {
					name: model.data,
					type: chartType,

					font: {
						size: {
							heuristic: 0.6,
							default: 16,
							yAxisLabel: 16 * 0.9,
							yAxisTickLabels: 16 * 0.8,
							xAxisLabel: 16 * 0.9,
							xAxisTickLabels: 16 * 0.8,
							plotBandLabel: 16 * 0.7,
							plotBandLine: 16 * 0.8,
							dataLabel: 16 * 0.7,
							donutLabel: 16 * 2,
							tipHeader: 16 * 0.6,
							tipBody: 16 * 0.8
						}	
					},
						
					aspectRadio: aspectRatioConfig,
					height: 400,
					get width() { return Math.ceil(400 * this.aspectRadio[this.aspectRadio.current]!); },

					get plotWidth() { return this.width - this.padding.left - this.padding.right; },
					get plotHeight() { return this.height - this.padding.top - this.padding.bottom; },
					
					padding: {
						get top() {
							return 5 +
								(hasAxis ? this._parent.font.size.yAxisTickLabels : 0); // Last yAxis tick
						},

						right: 5,
						
						get bottom() {
							const labelLines = !hasAxis ? 0 : Math.max(
								// Add 1 just to get a little padding to use when xaxis tick labels
								...config.data.map(item => directive.getLabelLines(item.name).length + 1)
							);

							return 5 +
								labelLines * this._parent.font.size.xAxisTickLabels + // For xAxis tick labels
								Math.max(0, labelLines - 1) * 5 + // For extra spacing between lines
								(xAxisConfig.label ? this._parent.font.size.xAxisLabel : 0); // Add extra padding if xAxisLabel is set
						},
						
						get left() {
							return 5 +
								(hasAxis ? maxDataValueString.length * this._parent.font.size.yAxisTickLabels * this._parent.font.size.heuristic  : 0) + // For yAxis ticks
								(yAxisConfig.label ? this._parent.font.size.yAxisLabel : 0); // Add extra padding if yAxisLabel is set
						}
					} as IRblChartConfigurationPadding,
	
					column: {
						count: data.length,
						get width() { return this._parent.plotWidth / this.count * 0.65; },
						get spacing() { return this._parent.plotWidth / this.count - this.width; },
						maxValue: maxDataValue,
						get maxLabelWidth() { 
							return (this.width + this.spacing * 1.25) * this._parent.xAxis.skipInterval;
						}
					} as IRblChartConfigurationChartColumn,

					dataLabels: dataLabels,
					tip: tip,
					xAxis: xAxisConfig,
					yAxis: yAxisConfig,

					legend: model.legendTextSelector == undefined &&
						(
							model.mode == "legend" ||
							(model.mode != "chart" && getBooleanProperty("legend.show", undefined, "false"))
						)
				},

				series: seriesConfig
			};

			config.plotOptions.padding._parent = config.plotOptions;
			config.plotOptions.column._parent = config.plotOptions;
			config.plotOptions.xAxis._parent = config.plotOptions;

			console.log(config);

			this.configuration = config
		}

		private addLegend(container: Element) {
			const legend = document.createElement("div");
			legend.className = "ka-chart-legend-item-wrapper";

			this.configuration.series.toReversed()
				.filter(s => s.legend)
				.forEach(s => {
					const item = document.createElement("div");
					item.className = "ka-chart-legend-item";
					item.setAttribute("ka-chart-series-item", s.text);
					
					const svg = document.createElementNS(this.ns, "svg");
					svg.setAttribute("width", "12px");
					svg.setAttribute("height", "12px");
					const shape = this.getSeriesShape(10, s.shape, s.color);
					svg.appendChild(shape);
					
					const text = document.createElement("span");
					text.className = "ps-2 nowrap ka-chart-legend-text";
					text.innerHTML = s.text;

					item.append(svg, text);
					legend.appendChild(item);
				});

			container.appendChild(legend);
		}

		private getLabelLines(label: string) {
			const words = label.split(" ");
			const lines = [];
			let currentLine = "";
	
			words.forEach(word => {
				const testLine = currentLine ? `${currentLine} ${word}` : word;
				const testLineWidth = testLine.length * this.configuration.plotOptions.font.size.xAxisTickLabels * this.configuration.plotOptions.font.size.heuristic;
				
				if (testLineWidth <= this.configuration.plotOptions.column.maxLabelWidth) {
					currentLine = testLine;
				} else {
					if (currentLine) {
						lines.push(currentLine);
					}
					currentLine = word;
				}
			});

			if (currentLine) lines.push(currentLine);

			return lines;
		};

		private getChartSvgElement() {
			const svg = document.createElementNS(this.ns, "svg");
			svg.setAttribute("viewBox", `0 0 ${this.configuration.plotOptions.width} ${this.configuration.plotOptions.height}`);
			svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
			return svg;
		}

		private generateColumnChart(idClass: string, container: HTMLElement, partial?: { plotStart: number, plotLabel: "textXs", data: Array<{ name: string, data: IRblChartConfigurationDataType }>, containerClass?: string } ) {
			const config = this.configuration as IRblChartConfiguration<IRblChartConfigurationDataType>;
			const data = partial?.data ?? config.data;
			const columnConfig = config.plotOptions.column!;
			const paddingConfig = config.plotOptions.padding;

			const plotHeight = config.plotOptions.plotHeight;
			const plotWidth = config.plotOptions.plotWidth;
			const yAxisBase = config.plotOptions.height - paddingConfig.bottom;
			const xAxisLine = this.createLine(paddingConfig.left, yAxisBase, config.plotOptions.width - paddingConfig.right, yAxisBase);
			const yAxisLine = this.createLine(paddingConfig.left, paddingConfig.top, paddingConfig.left, yAxisBase);

			const yAxisLabelX = config.plotOptions.font.size.yAxisLabel;
			const yAxisLabelY = plotHeight / 2;

			const yAxisLabel = config.plotOptions.yAxis.label
				? this.createText(yAxisLabelX, yAxisLabelY, config.plotOptions.yAxis.label, { "font-size": `${config.plotOptions.font.size.yAxisLabel}px`, fill: "black", "text-anchor": "middle", transform: `rotate(-90, ${yAxisLabelX}, ${yAxisLabelY})` })
				: undefined;
				
			const yAxisInterval = this.calculateYAxisInterval(columnConfig.maxValue, config.plotOptions.yAxis.tickCount);
			const yAxisMax = Math.ceil(columnConfig.maxValue / yAxisInterval) * yAxisInterval;
			
			const yAxisTicks =
				Array.from({ length: Math.ceil(yAxisMax / yAxisInterval) + 1 }, (_, i) => i * yAxisInterval)
					.flatMap((value, i) => {
						const y = paddingConfig.top + plotHeight - (value / yAxisMax) * plotHeight;
						
						const tickLine = i != 0
							? this.createLine(paddingConfig.left, y, config.plotOptions.width - paddingConfig.right, y, "#e6e6e6")
							: undefined;

						const tickLabel = this.createText(paddingConfig.left - 7, y, this.formatNumber(value, config.plotOptions.yAxis.format), { "text-anchor": "end", "font-size": `${config.plotOptions.font.size.yAxisTickLabels}px`, "dominant-baseline": "middle" })
						return tickLine ? [tickLine!, tickLabel] : [tickLabel];
					});

			const svg = this.getChartSvgElement();

			if (yAxisLabel != undefined) svg.appendChild(yAxisLabel);

			const plotBand0 = plotWidth / (data.length * 2);
			const partialStart = partial?.plotStart ?? 0;
			const plotBands = config.plotOptions.xAxis.plotBands.filter( b => b.from < config.plotOptions.xAxis.maxCategory && b.to > config.plotOptions.xAxis.minCategory ).map(band => {
				const from = paddingConfig.left + plotBand0 + (Math.max(-0.5, band.from - partialStart) / 0.5) * plotBand0;
				const to = paddingConfig.left + plotBand0 + (Math.min(band.to - partialStart, data.length - 0.5) / 0.5) * plotBand0;
				const rect = this.createRect(from, paddingConfig.top, to - from, plotHeight, band.color);

				const plotLabel = band.label?.[partial?.plotLabel ?? "text"] ?? band.label?.text;
				const label = plotLabel
					? this.createText(
						from, paddingConfig.top - 3,
						plotLabel,
						{ "text-anchor": "start", "font-size": `${config.plotOptions.font.size.plotBandLabel}px`, "dominant-baseline": "baseline" })
					: undefined;
				return label ? [label, rect] : [rect];
			});
			svg.append(...plotBands.flat());

			svg.append(...yAxisTicks);

			// svg.appendChild(yAxisLine);

			const plotLines = config.plotOptions.xAxis.plotLines.filter( l => config.plotOptions.xAxis.minCategory < l.value && l.value < config.plotOptions.xAxis.maxCategory ).map(line => {
				const value = paddingConfig.left + plotBand0 + ((line.value - partialStart) / 0.5) * plotBand0;
				const plotLine = this.createLine(value, paddingConfig.top, value, yAxisBase, line.color, 2);

				// NOT TESTED/USED
				const label = line.label?.text
					? this.createText(
						value, paddingConfig.top - 3,
						line.label.text,
						{ "text-anchor": "start", "font-size": `${config.plotOptions.font.size.plotBandLine}px`, "dominant-baseline": "baseline" })
					: undefined;
				return label ? [label, plotLine] : [plotLine];
			});
			svg.append(...plotLines.flat());
			
			const getColumnElementY = (value: number) => plotHeight - (value / yAxisMax) * plotHeight;

			const getColumnElement = (elementX: number, elementY: number, value: number, elementConfig: IRblChartConfigurationSeries, tipKey?: string, headerName?: string) => {
				const columnHeight = (value / yAxisMax) * plotHeight;
				const element = this.createRect(elementX, elementY, columnConfig.width, columnHeight, elementConfig.color, "#ffffff", 1);

				if (elementConfig.type == "tooltip") {
					element.setAttribute("data-is-tooltip", "1");
					element.setAttribute("opacity", "0");
				}

				const valueFormatted = this.formatNumber(value, config.plotOptions.dataLabels.format);
				element.setAttribute("ka-chart-series-item", elementConfig.text);
				element.setAttribute("aria-label", `${elementConfig.text}, ${valueFormatted}.${headerName ? ` ${this.encodeHtmlAttributeValue(headerName)}.` : ""}`);
				
				const tooltipContent = tipKey
					? this.createTooltip(idClass, tipKey, element, [{ name: elementConfig.text, value: valueFormatted, color: elementConfig.color, shape: elementConfig.shape }], headerName, partial?.containerClass)
					: undefined;
				
				return { element: element, tooltipContent };
			};

			const columns = data.map((item, i) => {
				const columnX = paddingConfig.left + (i * (columnConfig.width + columnConfig.spacing)) + columnConfig.spacing / 2;

				let stackBase = 0;
				const columnElements = (item.data instanceof Array
					// Stacked ...
					? item.data.map((v, j) => {
						const elementConfig = config.series[j];
						const tipKey = config.plotOptions.tip.show == "series" ? `${i + (partial?.plotStart ?? 0)}-${j}` : undefined;

						if (elementConfig.shape == "line") {
							const lineY = paddingConfig.top + getColumnElementY(v);
							const lineX = columnX + columnConfig.width / 2;
							// console.log(`Line x: ${lineX}, y: ${lineY}`);
							return {
								x: lineX, y: lineY,
								config: elementConfig,
								value: v,
								tipKey,
								headerName: item.name
							};
						}
						else {
							const element = getColumnElement(
								columnX,
								paddingConfig.top + getColumnElementY(stackBase + v),
								v,
								elementConfig,
								tipKey,
								item.name
							);
							stackBase += v;
							return element;
						}
					})
					: [getColumnElement(columnX, paddingConfig.top + getColumnElementY(item.data), item.data, config.series[i])]
				);

				const columnGroup = document.createElementNS(this.ns, "g");
				columnGroup.classList.add("ka-chart-category");
				columnGroup.setAttribute("ka-chart-marker-item", String(i));

				if (i % config.plotOptions.xAxis.skipInterval == 0) {
					const xAxisTickLabel = this.createText(
						columnX + columnConfig.width / 2, // center...
						yAxisBase + 2,
						item.name,
						{ "text-anchor": "middle", "font-size": `${config.plotOptions.font.size.xAxisTickLabels}px`, "dominant-baseline": "text-before-edge" }, // top of text aligns with Y
						true
					);
					columnGroup.appendChild(xAxisTickLabel);
				}

				let tooltip: Element | undefined = undefined;
				
				// Show tip for entire category, so get summary of every series/data
				if (config.plotOptions.tip.show == "category") {
					const seriesTipInfo = (item.data instanceof Array
						? item.data.map((v, j) => {
							return v > 0
								? {
									name: config.series[j].text,
									value: this.formatNumber(v, config.plotOptions.dataLabels.format),
									config: config.series[j]
								}
								: undefined;
						}).filter(v => v != undefined)
						: [{
							name: item.name,
							value: this.formatNumber(item.data, config.plotOptions.dataLabels.format),
							config: config.series[i]
						}]
					).map(item => {
						return {
							name: item!.name,
							value: item!.value,
							color: item!.config.color,
							shape: item!.config.shape
						};
					});

					tooltip = seriesTipInfo.length > 0
						? this.createTooltip(idClass, String(i + (partial?.plotStart ?? 0)), columnGroup, seriesTipInfo.reverse(), item.name, partial?.containerClass)
						: undefined;
				}

				// Render all the series/rect elements first...
				const rectElements = columnElements.filter(e => "element" in e) as { element: Element; tooltipContent: Element | undefined; }[];
				columnGroup.append(...rectElements.map(e => e.element));
				
				// Add data labels above columns if enabled
				if (config.plotOptions.dataLabels.show) {
					const totalValue = item.data instanceof Array
						? item.data.reduce((sum, v) => sum + v, 0)
						: item.data;

					const labelY = paddingConfig.top + getColumnElementY(totalValue) - 10; // Position above the column
					const dataLabel = this.createText(
						columnX + columnConfig.width / 2, // Centered above the column
						labelY,
						this.formatNumber(totalValue, config.plotOptions.dataLabels.format),
						{ "text-anchor": "middle", "font-size": `${config.plotOptions.font.size.dataLabel}px`, "font-weight": "bold" }
					);

					columnGroup.appendChild(dataLabel);
				}

				const linePoints = columnElements.filter(e => "x" in e) as { x: number; y: number; config: IRblChartConfigurationSeries; value: number; tipKey?: string; headerName?: string }[];

				return {
					g: columnGroup,
					linePoints,
					tooltips:
						rectElements.filter(e => e.tooltipContent != undefined).map(e => e.tooltipContent!) // Each element/series tip
							.concat(tooltip ? [tooltip] : []) // Entire category tip
				};
			});
			
			svg.append(...columns.map(c => c.g))
			
			if (columns.some(c => c.linePoints.length > 0)) {
				const totalLines = columns[0].linePoints.length;

				for (let i = 0; i < totalLines; i++) {
					const lineGroup = document.createElementNS(this.ns, "g");

					const lineMarkerGroup = document.createElementNS(this.ns, "g");
					lineMarkerGroup.setAttribute("class", "ka-chart-line-markers");
					lineMarkerGroup.setAttribute("ka-chart-line-item", String(i));

					const linePoints = columns.map(c => c.linePoints[i]);
					const glow = this.createCircle(linePoints[0].x, linePoints[0].y, 12, linePoints[0].config.color);
					glow.setAttribute("opacity", "0");
					glow.setAttribute("class", "ka-chart-point-glow");
					lineMarkerGroup.appendChild(glow);

					// Generate the path `d` attribute using cubic Bézier curves
					const pathD = linePoints.map((point, index) => {
						const diamond = this.createLineMarker(point.x, point.y, point.config.color);

						const valueFormatted = this.formatNumber(point.value, config.plotOptions.dataLabels.format);
						diamond.setAttribute("ka-chart-marker-item", String(index));
						diamond.setAttribute("aria-label", `${point.config.text}, ${valueFormatted}. ${this.encodeHtmlAttributeValue(point.headerName!)}.`);
						diamond.setAttribute("ka-chart-marker-item-point", `${point.x},${point.y}`);
						lineMarkerGroup.appendChild(diamond);
						
						if (index === 0) {
							// Move to the first point
							return `M ${point.x} ${point.y}`;
						} else {
							const prevPoint = linePoints[index - 1];
							const nextPoint = linePoints[index + 1] || point; // Use the current point if there's no next point
					
							// Calculate control points for a smooth curve
							const controlX1 = prevPoint.x + (point.x - prevPoint.x) / 3;
							const controlY1 = prevPoint.y + (point.y - prevPoint.y) / 3;
							const controlX2 = point.x - (nextPoint.x - prevPoint.x) / 3;
							const controlY2 = point.y - (nextPoint.y - prevPoint.y) / 3;
					
							return `C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${point.x} ${point.y}`;
						}
					}).join(" ");
					
					const lineConfig = linePoints[0].config;
					const path = this.createPath(pathD, lineConfig.color, 2);
					path.setAttribute("ka-chart-series-item", lineConfig.text); // Make sure I can do 'opacity hover'

					lineGroup.appendChild(path);
					
					svg.appendChild(lineGroup);
					svg.appendChild(lineMarkerGroup);
				}
			}

			// Add xAxis line last so first column isn't rendered on top of it
			svg.appendChild(xAxisLine);

			if (config.plotOptions.xAxis.label) {
				const xAxisLabelX = config.plotOptions.padding.left + plotWidth / 2;
				const xAxisLabelY = config.plotOptions.height - config.plotOptions.font.size.xAxisLabel * 1.5;
				const xAxisLabel = this.createText(xAxisLabelX, xAxisLabelY, config.plotOptions.xAxis.label, { "text-anchor": "middle", "font-size": `${config.plotOptions.font.size.xAxisLabel}px`, "dominant-baseline": "middle" });
				svg.appendChild(xAxisLabel);
			}

			container.appendChild(svg);

			if (columns.some(c => c.tooltips.length > 0)) {
				const tips = document.createElement("div");
				tips.style.display = "none";
				tips.append(...columns.filter(c => c.tooltips.length > 0).flatMap(c => c.tooltips!));
				container.appendChild(tips);
			}
		}

		private generateDonutChart(idClass: string, container: HTMLElement) {
			const config = this.configuration as IRblChartConfiguration<number>;
			const total = config.data.reduce((sum, item) => sum + item.data, 0);

			const radius = config.plotOptions.height / 2;
			const strokeWidth = radius * 0.4375;
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

				const valueFormatted = this.formatNumber(item.data, config.plotOptions.dataLabels.format);

				const path = document.createElementNS(this.ns, "path");
				path.setAttribute("key", String(index));
				path.setAttribute("d", `M ${radius} ${radius} L ${x1} ${y1} A ${normalizedRadius} ${normalizedRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`);
				path.setAttribute("fill", config.series[index].color);
				path.setAttribute("aria-label", `${item.name}, ${valueFormatted}.`);
				path.setAttribute("ka-chart-series-item", item.name);

				const tooltipContent = config.plotOptions.tip.show != "off"
					? this.createTooltip(idClass, String(index), path, [{ name: item.name, value: valueFormatted, color: config.series[index].color, shape: config.series[index].shape }])
					: undefined;

				return { path, tooltipContent };
			});

			const svg = this.getChartSvgElement();
			
			svg.append(...segments.map(segment => segment.path));

			svg.appendChild(this.createCircle(radius, radius, radius - strokeWidth, "white"));

			svg.appendChild(this.createText(
				radius, radius, this.formatNumber(total, config.plotOptions.dataLabels.format),
				{ "text-anchor": "middle", "dominant-baseline": "middle", "font-family": "Arial", "font-size": `${config.plotOptions.font.size.donutLabel}px`, "font-weight": "bold" },
			));

			container.appendChild(svg);

			if (segments.some(s => s.tooltipContent)) {
				const tips = document.createElement("div");
				tips.style.display = "none";
				tips.append(...segments.filter(s => s.tooltipContent != undefined).map(s => s.tooltipContent!));
				container.appendChild(tips);
			}
		}

		private addHoverEvents(el: Element, application: IKatApp, scope: IKaChartModel, legendClass: string) {

			const toggleItems = (seriesItems: Array<{textSelector: string, highlightOnHover: boolean, items: Array<Element>}>, currentHoverItem?: string) => {
				seriesItems.forEach(tooltip => {
					// If data is a tooltip, its opacity is always 0, so just skip it and never modify it
					tooltip.items.filter(e => e.getAttribute("data-is-tooltip") != "1").forEach(i => {
						const opacity = !currentHoverItem || currentHoverItem == i.getAttribute("ka-chart-series-item") ? "1" : "0.2";
						if (i instanceof SVGElement) {
							i.setAttribute("opacity", opacity);
						}
						else {
							i.querySelector("svg")!.setAttribute("opacity", opacity);
							i.querySelectorAll<HTMLElement>(tooltip.textSelector).forEach(t => t.style.opacity = opacity);
						}
					});
				});
			};

			// If external legends are used, the legend isn't guaranteed to be rendered before chart is, so need to wait
			// for domUpdated event to do all the DOM selections for events.
			if (!el.getAttribute("ka-events-handled")) {
				el.setAttribute("ka-events-handled", "true");
				application.handleEvents(events => {
					let domUpdated = false;
					events.domUpdated = () => {
						if (domUpdated) return;

						domUpdated = true;
						const seriesItems = [
							{ textSelector: "span", highlightOnHover: this.configuration.plotOptions.tip.highlightSeries, items: [...el.querySelectorAll(".ka-chart [ka-chart-series-item]")] },
							{ textSelector: "span", highlightOnHover: true, items: [...el.querySelectorAll(".ka-chart-legend [ka-chart-series-item]")] }
						];
						
						if (scope.legendTextSelector) {
							const legend = application.selectElement(`.${legendClass}`);
							if (legend) {
								seriesItems.push({ textSelector: scope.legendTextSelector, highlightOnHover: true, items: [...legend!.querySelectorAll("[ka-chart-series-item]")] });
							}
						}

						seriesItems.forEach(tooltip => {
							if (tooltip.highlightOnHover) {
								tooltip.items.forEach(item => {
									item.addEventListener("mouseover", () => toggleItems(seriesItems, item.getAttribute("ka-chart-series-item")!));
									item.addEventListener("mouseout", () => toggleItems(seriesItems));
								});
							}
						});

						if (el.querySelector(".ka-chart-line-markers")) {
							const lineMarkers = [...el.querySelectorAll(".ka-chart-line-markers .ka-chart-point")];

							const toggleLineMarkers = (markerItem?: string) => {
								lineMarkers.forEach(marker => {
									const isActive = markerItem == marker.getAttribute("ka-chart-marker-item");
									const opacity = isActive ? "1" : "0";
									marker.setAttribute("opacity", opacity);
									
									const glow = marker.parentElement!.firstElementChild!;
									glow.setAttribute("opacity", markerItem ? "0.2" : "0");
									if (isActive) {
										const point = marker.getAttribute("ka-chart-marker-item-point")!.split(",");
										glow.setAttribute("cx", point[0]);
										glow.setAttribute("cy", point[1]);
									}
								});
							};

							// ka-chart-marker-item
							const categoryItems = [...el.querySelectorAll(".ka-chart-category")];
							categoryItems.forEach(category => {
								category.addEventListener("mouseover", () => toggleLineMarkers(category.getAttribute("ka-chart-marker-item")!));
								category.addEventListener("mouseout", () => toggleLineMarkers());
							});
						}
					};
				});
			}
		}

		private createText(x: number, y: number, text: string, properties: {} = {}, isxAxisLabel?: boolean): Element {
			const textSvg = document.createElementNS(this.ns, "text");
			textSvg.setAttribute("x", String(x));
			textSvg.setAttribute("y", String(y));

			if (properties) {
				for (const [key, value] of Object.entries(properties)) {
					textSvg.setAttribute(key, String(value));
				}
			}

			if (isxAxisLabel) {
				const lines = this.getLabelLines(text)

				lines.forEach((line, index) => {
					const tspan = document.createElementNS(this.ns, "tspan");
					tspan.setAttribute("x", String(x));
					tspan.setAttribute("dy", String(index === 0 ? 0 : this.configuration.plotOptions.font.size.xAxisTickLabels + 5));
					tspan.innerHTML = line;
					textSvg.appendChild(tspan);
				});
			}
			else {
				textSvg.innerHTML = text;
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

		private createLineMarker(x: number, y: number, fill: string, size: number = 7) {
			const diamondPath = `M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`;

			const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
			path.setAttribute("d", diamondPath);
			path.setAttribute("fill", fill);
			path.setAttribute("stroke", "#ffffff");
			path.setAttribute("stroke-width", "1");
			path.setAttribute("opacity", "0");
			path.setAttribute("class", "ka-chart-point");
			path.setAttribute("tabindex", "-1");
			path.setAttribute("role", "img");
			path.setAttribute("style", "outline: none;");
			return path;
		}

		private createPath(d: string, stroke: string, strokeWidth: number) {
			const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
			path.setAttribute("d", d);
			path.setAttribute("fill", "none"); // Ensure no filling for line series
			path.setAttribute("stroke", stroke); // Line color
			path.setAttribute("stroke-width", strokeWidth.toString()); // Line thickness
			return path;
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

		private createTooltip(idClass: string, targetKey: string, target: Element, tipLines: Array<{ name: string, value: string, color: string, shape: IRblChartConfigurationShape }>, header: string | undefined = undefined, tipContainerClass: string = ".ka-chart"): Element | undefined {
			target.setAttribute("data-bs-toggle", "tooltip");
			target.setAttribute("data-bs-placement", "auto");
			target.setAttribute("data-bs-container", `.${idClass} ${tipContainerClass}`);
			target.setAttribute("data-bs-class", "ka-chart-tip");
			target.setAttribute("data-bs-width", "auto");
			target.setAttribute("data-bs-content-selector", `.${idClass} .ka-chart .tooltip-${targetKey}`);

			if (tipContainerClass != ".ka-chart") return undefined;

			const tipConfig = this.configuration.plotOptions.tip;
			const tooltipContent = document.createElement("div");
			tooltipContent.className = `tooltip-${targetKey}`;

			const maxTextWidth = Math.max(...[(header ?? "").length].concat(tipLines.map(item => `${item.name}: ${item.value}`.length))) * 7; // Approximate width of each character			
			const svgWidth = maxTextWidth + tipConfig.padding.left * 2; // Add padding to the width

			const tooltipSvg = document.createElementNS(this.ns, "svg");
			tooltipSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${(tipLines.length + (header ? 1 : 0)) * 20 + tipConfig.padding.top * 2}`);
			tooltipSvg.setAttribute("width", String(svgWidth));

			const tipLineBaseY = header ? 17 : 0;
			if (header) {
				const categoryHeader = this.configuration.plotOptions.tip.headerFormat?.replace("{x}", header) ?? header;
				const categoryText = this.createText(0, tipLineBaseY, categoryHeader, { "font-size": `${this.configuration.plotOptions.font.size.tipHeader}px`, "font-weight": "bold" });
				tooltipSvg.appendChild(categoryText);
			}

			const shapeXPadding = tipConfig.includeShape ? 15 : 0;

			tipLines.forEach((item, i) => {
				const y = tipLineBaseY + (i + 1) * 20;
				if (tipConfig.includeShape) {
					tooltipSvg.appendChild(this.getSeriesShape(y, item.shape, item.color));
				}
				const text = this.createText(shapeXPadding, y, `${item.name}: `, { "font-size": `${this.configuration.plotOptions.font.size.tipBody}px` });
				const tspan = document.createElementNS(this.ns, "tspan");
				tspan.setAttribute("font-weight", "bold");
				tspan.innerHTML = item.value;
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
				
				case "line":
					return this.createLine(0, y - 5, 10, y - 5, color, 2);

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

		private getOptionValue<T = string>(configRows: Array<IRblChartDataRow>, name: string, globalOptions?: IRblChartOptionRow[], defaultValue?: string): T | undefined {
			return (configRows.find(r => String.compare(r.id, name, true) === 0)?.value ??
				globalOptions?.find(r => r.id == name)?.value ?? defaultValue) as T;
		}

		private formatNumber(amount: number, style: IRblChartFormatStyle): string {
			const locales = (window as any).camelot?.internationalization?.locales ?? "en-US";
			const currencyCode = (window as any).camelot?.internationalization?.currencyCode ?? "USD";

			return Intl.NumberFormat(locales, {
				style: style == "c0" || style == "c2" ? "currency" : style,
				currency: currencyCode,
				minimumFractionDigits: style == "c2" ? 2 : 0,
				maximumFractionDigits: style == "c2" ? 2 : 0
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