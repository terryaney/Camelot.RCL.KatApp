namespace KatApps {
	export class DirectiveKaChart implements IKaDirective {
		public name = "ka-chart";

		private ns = "http://www.w3.org/2000/svg"
		private application!: KatApp;

		public getDefinition(application: KatApp): Directive<Element> {
			return ctx => {
				this.application = application;
				const el = ctx.el as KaChartElement;
				el.setAttribute("ka-chart-id", Utils.generateId());

				ctx.effect(() => {
					const scope: IKaChartModel = ctx.get();

					const configuration = this.buildChartConfiguration(scope);

					this.resetContextElement(el, configuration);

					if (configuration.data.length > 0) {
						this.addChart(scope, el, configuration)
						this.generateBreakpointCharts(scope, el, configuration);
						this.addLegend(el, configuration);
						this.addTooltips(scope, el, configuration);
						this.addHoverEvents(scope, el, configuration);
					}
				});

				return () => {
					this.application.removeEvents(el.getAttribute("ka-chart-id")!);
				}
			};
		}
		
		private addChart(model: IKaChartModel, el: Element, configuration: IRblChartConfiguration<IRblChartConfigurationDataType>) {
			if (model.mode == "legend") return;

			const chartContainer = document.createElement("div") as unknown as KaHoverOptionsElement;
			chartContainer.classList.add("ka-chart-container", configuration.css.chartType);
			chartContainer.kaHoverOptions = {
				columnCount: configuration.plotOptions.column.count,
				columnWidth: configuration.plotOptions.plotWidth / configuration.plotOptions.column.count,
				plotLeft: configuration.plotOptions.padding.left,
				plotRight: configuration.plotOptions.width - configuration.plotOptions.padding.right,
				plotBottom: configuration.plotOptions.yAxis.baseY,
				plotTop: configuration.plotOptions.padding.top			
			};

			if (model.breakpoints?.xs) {
				chartContainer.classList.add("d-none", "d-sm-block");
			}

			if (model.maxHeight) {
				chartContainer.style.maxHeight = `${model.maxHeight}px`;
			}
			el.appendChild(chartContainer);

			switch (configuration.type) {
				case "donut":
					this.generateDonutChart(configuration, chartContainer);
					break;
				
				case "sharkfin":
					this.generateStackedArea(configuration, chartContainer);
					break;
				
				case "column":
				case "columnStacked":
					this.generateColumnChart(configuration, chartContainer);
					break;
					
				default:
					chartContainer.innerHTML = `<b>${model.data} ${configuration.type} chart not supported</b>`;
					return;
			}

			if (model.maxHeight) {
				chartContainer.querySelector("svg")!.style.maxHeight = `${model.maxHeight}px`;
			}
		}
		
		private buildChartConfiguration(model: IKaChartModel): IRblChartConfiguration<IRblChartConfigurationDataType> {
			const dataSource = this.application.state.rbl.source(model.data, model.ce, model.tab) as any as Array<IRblChartDataRow>;
			const dataRows = dataSource.filter(r => r.id == "category").slice(model.from ?? 0, model.to ?? dataSource.length);
			const chartOptions = dataSource.filter(r => r.id != "category");
			const globalOptions = this.application.state.rbl.source(model.options ?? "chartOptions", model.ce, model.tab) as any as Array<IRblChartDataRow>;

			const chartType = this.getOptionValue<IRblChartConfigurationType>(chartOptions, "type")!;
			const chartIsStacked = !["column", "donut"].includes(chartType);

			// Ideas for 'config' settings when needed: https://api.highcharts.com/highcharts

			function configRow<T = string>(id: string): IRblChartDataRow<T> {
				return (chartOptions.find(r => r.id == id) ?? {}) as IRblChartDataRow<T>; 
			}
			function configRows<T = string>(id: string): Array<IRblChartDataRow<T>> {
				return chartOptions.filter(r => r.id == id) as Array<IRblChartDataRow<T>>;
			}

			const dataColumns = (Object.keys(dataRows[0]) as Array<IRblChartColumnName>).filter(c => c.startsWith("data"));

			const text = configRow("text");
			let data: Array<{ name: string, data: IRblChartConfigurationDataType }> = []
			switch (chartType) {
				// Data 'point' charts with single 'series'
				case "column":
				case "donut":
					data = dataColumns.map(c => ({ name: text[c]!, data: +dataRows[0][c]! }));
					break;
				
				// 'Category' charts with ability to have two or more series...
				case "sharkfin":
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
			
			const getBooleanProperty = <T>(property: string, parsedValue: T | undefined, defaultValue: boolean): boolean => {
				return String.compare(
					this.getOptionValue(chartOptions, property, globalOptions, ((parsedValue ?? defaultValue) ? "true" : "false")),
					"true",
					true
				) === 0;
			}

			const dataLabels = JSON.parse(this.getOptionValue(chartOptions, "dataLabels", globalOptions) ?? "{}") as IRblChartConfigurationDataLabels;
			dataLabels.show = getBooleanProperty("dataLabels.show", dataLabels.show, false);
			dataLabels.format = this.getOptionValue<IRblCurrencyFormat | IRblNumberFormat>(chartOptions, "dataLabels.format", globalOptions, dataLabels.format ?? globalFormat)!;

			const tip = JSON.parse(this.getOptionValue(chartOptions, "tip", globalOptions) ?? "{}") as IRblChartConfigurationTip;
			tip.padding = { top: 5, left: 5 }; // Param?
			tip.show = getBooleanProperty("tip.show", tip.show, true);
			tip.headerFormatter = this.getOptionValue(chartOptions, "tip.headerFormatter", globalOptions, tip.headerFormatter);
			tip.includeShape = getBooleanProperty("tip.includeShape", tip.includeShape, true);
			tip.includeTotal = getBooleanProperty("tip.includeTotal", tip.includeTotal, chartIsStacked && !dataLabels.show);

			const aspectRatioValue = this.getOptionValue(chartOptions, "aspectRatio", globalOptions, "1:1")!;
			const aspectRatioConfig = JSON.parse(aspectRatioValue.startsWith("{") ? aspectRatioValue : `{ "value": "${aspectRatioValue}" }`);
			
			const calcAspectRatio = (ratio: string) => {
				const parts = ratio.split(":");
				return +parts[0] / +parts[1];
			};
			aspectRatioConfig.current = "value";
			aspectRatioConfig.value = calcAspectRatio(aspectRatioConfig.value);
			if (aspectRatioConfig.xs) aspectRatioConfig.xs = calcAspectRatio(aspectRatioConfig.xs);

			const plotBands = configRows("xAxis.plotBand").map(r => JSON.parse(r.value) as IRblChartPlotBand);
			const plotLines = configRows("xAxis.plotLine").map(r => JSON.parse(r.value) as IRblChartPlotLine);

			const sharkfin = this.getOptionJson<IRblChartConfigurationSharkfin>(chartOptions, "sharkfin", globalOptions);
			if (sharkfin != undefined) {
				const retireAge = sharkfin.retirementAge;
				const plotValue = data.findIndex(i => +i.name == retireAge);
				plotLines.push({ value: plotValue, color: sharkfin.line.color });
				plotBands.push({ from: plotValue, to: data.length - 0.5, color: sharkfin.fill.color });
			}

			const xAxisConfig = {
				label: this.getOptionValue(chartOptions, "xAxis.label", globalOptions),
				format: "c0",
				minCategory: -0.5,
				maxCategory: dataRows.length - 0.5,
				get plotBandSegmentWidth() { return this._parent.plotWidth / (data.length * 2); },
				plotBands: plotBands,
				plotLines: plotLines,
				get skipInterval() {
					return Math.ceil(data.length / (this._parent.plotWidth / 25));
				}
			} as IRblChartConfigurationXAxis;

			const yAxisConfig: IRblChartConfigurationYAxis = {
				label: this.getOptionValue(chartOptions, "yAxis.label", globalOptions),
				format: "c0",
				tickCount: +this.getOptionValue(chartOptions, "yAxis.tickCount", globalOptions, "5")!,
				get baseY() {
					return this._parent.height - this._parent.padding.bottom;
				},
				get intervalSize() {
					const rawInterval = this._parent.column.maxValue / this.tickCount;
					const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval))); // Magnitude of the interval
					const residual = rawInterval / magnitude; // Fractional part of the interval
				
					// Round the residual to a "nice" number (1, 2, 2.5, 3, 4, 5, or 10)
					const residualBreaks = [1, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20];
					const residualIndex = residualBreaks.findIndex((breakValue) => residual <= breakValue);
					const residualValue = residualIndex === -1 ? residualBreaks[residualBreaks.length - 1] : residualBreaks[residualIndex];
					return residualValue * magnitude; // Final "nice" interval		
				},
				get maxValue() {
					const intervalSize = this.intervalSize;
					return Math.ceil(this._parent.column.maxValue / intervalSize) * intervalSize;
				},
				getY(value: number) {

					// stackedColumn
					// const getColumnElementY = (value: number) => plotHeight - (value / yAxisMax) * plotHeight;
					
					// stackedArea
					// const plotHeight = config.plotOptions.plotHeight;
					// const yAxisMax = config.plotOptions.yAxis.maxValue;
					// const yScale = (value: number) => paddingConfig.top + ( plotHeight - (value / yAxisMax) * plotHeight );

					const plotHeight = this._parent.plotHeight;
					return this._parent.padding.top + (plotHeight - (value / this.maxValue) * plotHeight);
		
				}
			} as IRblChartConfigurationYAxis;
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
							item.data.reduce((sum, v, i) => sum + (seriesConfig[i].shape != "line" ? v : 0), 0),
							...item.data.map((v, i) => seriesConfig[i].shape != "line" ? v : 0)
						)
						: item.data
				)
			) * (dataLabels.show ? 1.05 : 1.025); // Add 10% buffer...
			
			const maxDataValueString = Utils.formatNumber(maxDataValue, yAxisConfig.format) + "000"; // Just some padding to give a little more room

			const hasAxis = chartType != "donut";

			const directive = this;
			const config: IRblChartConfiguration<IRblChartConfigurationDataType> = {
				name: model.data,
				type: chartType,

				dataColumns: dataColumns,
				data: data,

				css: {
					chart: `ka-chart-${model.data.toLowerCase()}`,
					chartType: `ka-chart-${chartType.toLowerCase()}`,
					legend: `ka-chart-legend-${model.data.toLowerCase()}`,
					legendType: `ka-chart-legend-${chartType.toLowerCase()}`
				},

				plotOptions: {
					font: {
						size: {
							heuristic: 0.6,
							base: 16,
							fontMultiplier: directive.getOptionNumber(chartOptions, "font.multiplier", globalOptions, 1)!,
							get default() { return this.base * this.fontMultiplier; },
							get yAxisLabel() { return this.default * 0.9; },
							get yAxisTickLabels() { return this.default * 0.8; },
							get xAxisLabel() { return this.default * 0.9; },
							get xAxisTickLabels() { return this.default * 0.8; },
							get plotBandLabel() { return this.default * 0.7; },
							get plotBandLine() { return this.default * 0.8; },
							get dataLabel() { return this.default * 0.7; },
							get donutLabel() { return this.default * 2; },
							get tipHeader() { return this.base * 0.6; },
							get tipBody() { return this.base * 0.8; }
						}	
					},
						
					aspectRadio: aspectRatioConfig,
					height: 400,
					get width() { return Math.ceil(400 * (this.aspectRadio[this.aspectRadio.current] ?? this.aspectRadio.value)); },

					get plotWidth() { return this.width - this.padding.left - this.padding.right; },
					get plotHeight() { return this.height - this.padding.top - this.padding.bottom; },
					
					pie: {
						startAngle: +this.getOptionValue(chartOptions, "pie.startAngle", globalOptions, "0")!,
						endAngle: +this.getOptionValue(chartOptions, "pie.endAngle", globalOptions, "360")!,
					},
					donut: {
						labelFormatter: this.getOptionValue(chartOptions, "donut.labelFormatter", globalOptions)
					},

					padding: {
						get top() {
							return 5 +
								(hasAxis ? this._parent.font.size.yAxisTickLabels : 0); // Last yAxis tick
						},

						right: 5,
						
						get bottom() {
							const labelLines = !hasAxis ? 0 : Math.max(
								// Add 1 just to get a little padding to use when xaxis tick labels
								...config.data.map(item => directive.getWrappedColumnLabels(this._parent, item.name).length + 1)
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
						},
						getX(index: number) {
							const spacing = this.spacing;
							return this._parent.padding.left + (index * (this.width + spacing)) + spacing / 2;
						}
					} as IRblChartConfigurationChartColumn,

					dataLabels: dataLabels,
					tip: tip,
					xAxis: xAxisConfig,
					yAxis: yAxisConfig,

					highlight: {
						series: {
							hoverItem: getBooleanProperty("highlight.series.hoverItem", undefined, !chartIsStacked),
							hoverLegend: true
						},
						legend: {
							hoverItem: true,
							hoverSeries: true
						}
					},

					legend: {
						show: model.legendItemSelector == undefined &&
							(
								model.mode == "legend" ||
								(model.mode != "chart" && getBooleanProperty("legend.show", undefined, false))
							)
					}
				},

				series: seriesConfig
			};

			config.plotOptions.padding._parent = config.plotOptions;
			config.plotOptions.column._parent = config.plotOptions;
			config.plotOptions.xAxis._parent = config.plotOptions;
			config.plotOptions.yAxis._parent = config.plotOptions;

			// console.log(config);

			return config;
		}

		private generateStackedArea(configuration: IRblChartConfiguration<IRblChartConfigurationDataType>, container: HTMLElement) {
			const paddingConfig = configuration.plotOptions.padding;
			const svg = this.getChartSvgElement(configuration.plotOptions);
			const data = configuration.data as Array<{ name: string, data: Array<number> }>;

			this.addPlotBands(svg, configuration);

			this.addYAxis(svg, configuration);

			// Data
			const dataPoints = data.map((item, i) => {
				const pointX = paddingConfig.left + configuration.plotOptions.xAxis.plotBandSegmentWidth + i * configuration.plotOptions.xAxis.plotBandSegmentWidth * 2;
				const point = { name: item.name, x: pointX, total: item.data.reduce((sum, v) => sum + v, 0) } as { name: string, x: number, total: number } & Record<string, number>;
				configuration.series.forEach((s, j) => {
					point[ s.text ] = +item.data[j];
				});
				return point;
			});

			const getSeriesY = (pointIndex: number, seriesName: string, lowerSeries: string | undefined) => {
				const seriesY = lowerSeries
					? configuration.plotOptions.yAxis.getY(dataPoints[pointIndex][lowerSeries] + dataPoints[pointIndex][seriesName])
					: configuration.plotOptions.yAxis.getY(dataPoints[pointIndex][seriesName]);
				
				return seriesY;
			};

			// Draw area for each series
			const seriesElements = configuration.series.map((seriesConfig, seriesIndex) => {
				const seriesName = seriesConfig.text;
				const color = seriesConfig.color;

				const isBottomSeries = seriesIndex == configuration.series.length - 1;
				const isTopSeries = seriesIndex == 0;

				const lowerSeries = isBottomSeries
					? undefined // This is the last (bottom) series
					: configuration.series[seriesIndex + 1].text; // For stacked series, we need to draw on top of the series underneath

				let seriesX = dataPoints[0].x;
				let seriesY = getSeriesY(0, seriesName, lowerSeries);
				// Create path for the current series
				let seriesPath = `M ${seriesX} ${configuration.plotOptions.yAxis.getY(0)} L ${seriesX} ${seriesY}`; // Draw up to first point
				let borderPath = `M ${seriesX} ${seriesY}`;

				const markerPoints: Array<IRblChartPoint> = [{
					x: seriesX,
					y: seriesY,
					seriesConfig: seriesConfig,
					value: dataPoints[0][seriesName],
					name: dataPoints[0].name
				}];

				// Draw to all other points
				for (let pointIndex = 1; pointIndex < dataPoints.length; pointIndex++) {
					seriesX = dataPoints[pointIndex].x;
					seriesY = getSeriesY(pointIndex, seriesName, lowerSeries);
					const pointPath = isBottomSeries
						? ` L ${seriesX} ${seriesY}`
						: ` L ${seriesX} ${seriesY}`;
					
					seriesPath += pointPath;
					borderPath += pointPath;

					markerPoints.push({
						x: seriesX,
						y: seriesY,
						seriesConfig: seriesConfig,
						value: dataPoints[pointIndex][seriesName],
						name: dataPoints[pointIndex].name
					});
				}
				
				// If this is the last (bottom) series
				if (isBottomSeries) {
					// Draw down to x-axis and close
					seriesPath += ` L ${dataPoints[dataPoints.length - 1].x} ${configuration.plotOptions.yAxis.getY(0)} Z`;
				} else {
					// Draw back along bottom edge (which is the top of the previous series)
					for (let i = dataPoints.length - 1; i >= 0; i--) {
						seriesPath += ` L ${dataPoints[i].x} ${configuration.plotOptions.yAxis.getY(dataPoints[i][lowerSeries!])}`;
					}

					// Close the path
					seriesPath += ' Z';
				}

				const seriesPaths = document.createElementNS(this.ns, 'g');
				seriesPaths.setAttribute("class", "ka-chart-series-path");
				const series = this.createPath(seriesPath, "none", 0, color, 0.75);
				series.setAttribute("ka-chart-highlight-key", seriesConfig.text); // Make sure I can do 'opacity hover legend'
				const border = this.createPath(borderPath, color, 2);
				border.setAttribute("ka-chart-highlight-key", seriesConfig.text); // Make sure I can do 'opacity hover legend'
				seriesPaths.append(series, border);

				const seriesMarkerGroup = this.addMarkerPoints(configuration, markerPoints);

				const seriesItem = document.createElementNS(this.ns, 'g');
				seriesItem.setAttribute("class", "ka-chart-series-item");
				if (isTopSeries) {
					seriesItem.setAttribute("ka-stack-top", "1");
				}
				seriesItem.append(seriesPaths, seriesMarkerGroup);

				return seriesItem;
			});

			const seriesGroup = document.createElementNS(this.ns, "g");
			seriesGroup.setAttribute("class", "ka-chart-series-group");

			seriesGroup.append(...seriesElements);
			svg.appendChild(seriesGroup);

			this.addPlotLines(svg, configuration );

			this.addXAxis(svg, configuration, configuration.data);

			container.appendChild(svg);
		}

		private generateColumnChart(configuration: IRblChartConfiguration<IRblChartConfigurationDataType>, container: HTMLElement, breakpointConfig?: { plotOffset: number, plotLabelColumn: "textXs", plotBandSegmentWidth: number, data: Array<{ name: string, data: IRblChartConfigurationDataType }>, containerClass?: string }) {
			const svg = this.getChartSvgElement(configuration.plotOptions);

			const data = breakpointConfig?.data ?? configuration.data;
			const columnConfig = configuration.plotOptions.column!;

			const plotHeight = configuration.plotOptions.plotHeight;
			const plotOffset = breakpointConfig?.plotOffset ?? 0;

			this.addPlotBands(svg, configuration, plotOffset, breakpointConfig?.plotLabelColumn, breakpointConfig?.plotBandSegmentWidth);

			this.addYAxis(svg, configuration);

			this.addPlotLines(svg, configuration, plotOffset, breakpointConfig?.plotBandSegmentWidth );
			
			const yAxisMax = configuration.plotOptions.yAxis.maxValue;

			const getColumnElement = (elementX: number, elementY: number, value: number, seriesConfig: IRblChartConfigurationSeries, headerName?: string) => {
				const columnHeight = (value / yAxisMax) * plotHeight;
				const element = this.createRect(elementX, elementY, columnConfig.width, columnHeight, seriesConfig.color, "#ffffff", 1);

				// This element is never 'shown', it is simply an additional series to show in the tooltip (i.e. 'short fall' in an retirement income chart)
				if (seriesConfig.type == "tooltip") {
					element.setAttribute("data-is-tooltip", "1"); // so hover doesn't change opacity
					element.setAttribute("opacity", "0");
				}

				const valueFormatted = Utils.formatNumber(value, configuration.plotOptions.dataLabels.format);
				element.setAttribute("ka-chart-highlight-key", seriesConfig.text);
				element.setAttribute("aria-label", `${seriesConfig.text}, ${valueFormatted}.${headerName ? ` ${headerName}.` : ""}`);

				return element;
			};

			// KAT put stackedColumn series in order in CE that needs to be reversed when rendering chart
			const colStart = configuration.type == "columnStacked" ? (data[0].data as []).length - 1 : 0;
			const colEnd = configuration.type == "columnStacked" ? -1 : (data[0].data as []).length;
			const colStep = configuration.type == "columnStacked" ? -1 : 1;

			const columns = data.map((item, columnIndex) => {
				const columnX = columnConfig.getX(columnIndex);
				const columnTipKey = columnIndex + (breakpointConfig?.plotOffset ?? 0);

				let stackBase = 0;
				const columnElements: (Element | IRblChartPoint)[] = [];

				if (item.data instanceof Array) {
					// Stacked column chart
					for(let seriesIndex = colStart; seriesIndex != colEnd; seriesIndex += colStep) {
						const seriesConfig = configuration.series[seriesIndex];
						const value = item.data[seriesIndex];

						if (seriesConfig.shape == "line") {
							const x = columnX + columnConfig.width / 2;
							const y = configuration.plotOptions.yAxis.getY(value);
							
							const linePoint: IRblChartPoint = { x, y, seriesConfig, value, name: item.name };
							columnElements.push(linePoint);
						}
						else {
							const element = getColumnElement(
								columnX,
								configuration.plotOptions.yAxis.getY(stackBase + value),
								value,
								seriesConfig,
								this.getHeader(configuration.plotOptions, item.name)
							);
							stackBase += value;

							columnElements.push(element);
						}
					}
				}
				else {
					columnElements.push(getColumnElement(columnX, configuration.plotOptions.yAxis.getY(item.data), item.data, configuration.series[columnIndex]));
				}

				const columnGroup = document.createElementNS(this.ns, "g");
				columnGroup.classList.add("ka-chart-category");

				if (stackBase > 0 && configuration.plotOptions.tip.show) {
					columnGroup.setAttribute("ka-tip-key", String(columnTipKey));
				}

				const rectElements = columnElements.filter(e => e instanceof Element) as Element[];
				columnGroup.append(...rectElements);
				
				// Add data labels above columns if enabled
				if (configuration.plotOptions.dataLabels.show) {
					const totalValue = item.data instanceof Array
						? item.data.reduce((sum, v) => sum + v, 0)
						: item.data;

					const labelY = configuration.plotOptions.yAxis.getY(totalValue) - 10; // Position above the column
					const dataLabel = this.createText(
						configuration.plotOptions,
						columnX + columnConfig.width / 2, // Centered above the column
						labelY,
						Utils.formatNumber(totalValue, configuration.plotOptions.dataLabels.format),
						configuration.plotOptions.font.size.dataLabel,
						{ "text-anchor": "middle", "font-weight": "bold" }
					);

					columnGroup.appendChild(dataLabel);
				}

				const linePoints = columnElements.filter(e => !(e instanceof Element)) as IRblChartPoint[];

				return {
					g: columnGroup,
					linePoints
				};
			});
			
			const categoryGroup = document.createElementNS(this.ns, "g");
			categoryGroup.setAttribute("class", "ka-chart-category-group");
			categoryGroup.append(...columns.map(c => c.g))
			svg.appendChild(categoryGroup);
			
			if (columns.some(c => c.linePoints.length > 0)) {
				const totalLines = columns[0].linePoints.length;

				const lines = document.createElementNS(this.ns, "g");
				lines.setAttribute("class", "ka-chart-series-group");

				for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
					const lineSeries = document.createElementNS(this.ns, "g");
					lineSeries.setAttribute("class", "ka-chart-series-item");

					const linePoints = columns.map(c => c.linePoints[lineIndex]);
					const markerPoints = this.addMarkerPoints(configuration, linePoints);

					// Generate the path `d` attribute using cubic Bézier curves
					const pathD = linePoints.map((point, index) => {
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
					const lineConfig = linePoints[0].seriesConfig;
					
					const path = this.createPath(pathD, lineConfig.color, 2);
					path.setAttribute("ka-chart-highlight-key", lineConfig.text); // Make sure I can do 'opacity hover legend'

					lineSeries.append(path, markerPoints);					
					lines.appendChild(lineSeries);
					svg.appendChild(lines);
				}
			}

			this.addXAxis(svg, configuration, data);

			container.appendChild(svg);
		}
		
		private generateBreakpointCharts(model: IKaChartModel, el: Element, configuration: IRblChartConfiguration<IRblChartConfigurationDataType>) {
			const breakpoints = [
				{ item: model.breakpoints?.xs, name: "xs", labelColumn: "textXs" }
			].filter(b => b.item != undefined) as Array<{ item: IKaChartModelBreakpoint, name: "xs" | "value", labelColumn: "textXs" }>;

			const originalCount = configuration.plotOptions.column.count;
			const originalMultiplier = configuration.plotOptions.font.size.fontMultiplier;
			const originalMinCategory = configuration.plotOptions.xAxis.minCategory;
			const originalMaxCategory = configuration.plotOptions.xAxis.maxCategory;

			try {
				breakpoints.forEach(b => {
					const breakpointContainer = document.createElement("div") as unknown as KaHoverOptionsElement;
					breakpointContainer.className = `d-block d-sm-none ka-chart-container-${b.name} ${configuration.css.chartType}`;

					const colCount = b.item.categories ?? configuration.plotOptions.column.count;
					configuration.plotOptions.aspectRadio.current = b.name;
					configuration.plotOptions.column.count = colCount;
					configuration.plotOptions.font.size.fontMultiplier = b.item.fontMultiplier ?? configuration.plotOptions.font.size.fontMultiplier;
					
					breakpointContainer.kaHoverOptions = {
						columnCount: colCount,
						columnWidth: configuration.plotOptions.plotWidth / colCount,
						plotLeft: configuration.plotOptions.padding.left,
						plotRight: configuration.plotOptions.width - configuration.plotOptions.padding.right,
						plotBottom: configuration.plotOptions.yAxis.baseY,
						plotTop: configuration.plotOptions.padding.top
					};
					el.appendChild(breakpointContainer);

					const maxHeight = b.item.maxHeight ?? model.maxHeight;

					for (let index = 0; index < Math.ceil(configuration.data.length / colCount); index++) {
						const plotStart = index * colCount;
						const plotEnd = plotStart + colCount;

						let breakpointContainerMaxHeight: HTMLElement | undefined = undefined;

						if (maxHeight) {
							breakpointContainerMaxHeight = document.createElement("div");
							breakpointContainerMaxHeight.style.maxHeight = `${maxHeight}px`;
							breakpointContainer.appendChild(breakpointContainerMaxHeight);
						}

						configuration.plotOptions.xAxis.minCategory = plotStart - 0.5;
						configuration.plotOptions.xAxis.maxCategory = plotEnd - 0.5;

						const partialData = configuration.data.slice(plotStart, plotEnd);
						const plotBandSegmentWidth = configuration.plotOptions.plotWidth / (partialData.length * 2);

						this.generateColumnChart(
							configuration,
							breakpointContainerMaxHeight ?? breakpointContainer,
							{
								plotOffset: plotStart,
								plotLabelColumn: b.labelColumn,
								plotBandSegmentWidth: plotBandSegmentWidth,
								data: partialData,
								containerClass: `.ka-chart-container-${b.name}`
							});
					}

					if (maxHeight) {
						[...breakpointContainer.children].forEach(div => div.querySelector<SVGSVGElement>("svg.ka-chart")!.style.maxHeight = `${maxHeight}px`);
					}
				});
			}
			finally {
				configuration.plotOptions.aspectRadio.current = "value";
				configuration.plotOptions.column.count = originalCount;
				configuration.plotOptions.font.size.fontMultiplier = originalMultiplier;
				configuration.plotOptions.xAxis.minCategory = originalMinCategory;
				configuration.plotOptions.xAxis.maxCategory = originalMaxCategory;
			}
		}

		private generateDonutChart(configuration: IRblChartConfiguration<IRblChartConfigurationDataType>, container: HTMLElement) {
			const data = configuration.data as Array<{ name: string, data: number }>;
			const total = data.reduce((sum, item) => sum + item.data, 0);

			const radius = configuration.plotOptions.height / 2;
			const strokeWidth = radius * 0.4375;
			const normalizedRadius = radius - strokeWidth / 2;

			const fullAngle = configuration.plotOptions.pie.endAngle - configuration.plotOptions.pie.startAngle;
			let currentAngle = configuration.plotOptions.pie.startAngle;

			const segments = data.map((item, index) => {
				if (item.data == 0) return undefined; // Skip zero data points

				// Calculate the angles
				const angle = (item.data / total) * fullAngle;
				const startAngle = currentAngle;
				currentAngle += angle;

				// Calculate the arc
				const x1 = normalizedRadius * Math.cos((startAngle - 90) * Math.PI / 180) + radius;
				const y1 = normalizedRadius * Math.sin((startAngle - 90) * Math.PI / 180) + radius;
				const x2 = normalizedRadius * Math.cos((currentAngle - 90) * Math.PI / 180) + radius;
				const y2 = normalizedRadius * Math.sin((currentAngle - 90) * Math.PI / 180) + radius;

				// Determine if the arc should take the long path or short path
				const largeArcFlag = angle > fullAngle / 2 ? 1 : 0;

				const valueFormatted = Utils.formatNumber(item.data, configuration.plotOptions.dataLabels.format);

				const path = angle >= 360
					? this.createCircle(radius, radius, normalizedRadius, configuration.series[index].color)
					: this.createPath(`M ${radius} ${radius} L ${x1} ${y1} A ${normalizedRadius} ${normalizedRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`, "none", 0, configuration.series[index].color);

				path.setAttribute("aria-label", `${item.name}, ${valueFormatted}.`);
				path.setAttribute("ka-chart-highlight-key", item.name);

				if (configuration.plotOptions.tip.show) {
					path.setAttribute("ka-tip-key", String(index));
				}
				
				return path;
			}).filter(s => s != undefined) as Element[];

			const svg = this.getChartSvgElement(configuration.plotOptions);
			
			svg.append(...segments);

			svg.appendChild(this.createCircle(radius, radius, radius - strokeWidth, "white"));

			const formattedTotal = Utils.formatNumber(total, configuration.plotOptions.dataLabels.format);
			const donutLabel = configuration.plotOptions.donut.labelFormatter
				? String.formatTokens(
					configuration.plotOptions.donut.labelFormatter.replace(/\{([^}]+)\}/g, '{{$1}}'),
					configuration.dataColumns
						.reduce(function (o, c, i) { o[c] = Utils.formatNumber(data[i].data, configuration.plotOptions.dataLabels.format); return o; }, { total: formattedTotal } as Record<string, string>)
				)
				: formattedTotal;

			svg.appendChild(this.createText(
				configuration.plotOptions,
				radius, radius, donutLabel,
				configuration.plotOptions.font.size.donutLabel,
				{ "text-anchor": "middle", "dominant-baseline": "middle", "font-weight": "bold" },
			));

			container.appendChild(svg);
		}

		private addLegend(el: Element, configuration: IRblChartConfiguration<IRblChartConfigurationDataType>): void {
			if (!configuration.plotOptions.legend.show) return;

			const legendContainer = document.createElement("div");
			legendContainer.className = `ka-chart-legend ${configuration.css.legendType} ${configuration.css.legend}`;
			el.appendChild(legendContainer);

			const legend = document.createElement("div");
			legend.className = "ka-chart-legend-item-wrapper";

			const series = configuration.type == "sharkfin"
				? configuration.series
				: configuration.series.toReversed();
			
			series
				.filter(s => s.legend)
				.forEach(s => {
					const item = document.createElement("div");
					item.className = "ka-chart-legend-item";
					item.setAttribute("ka-chart-highlight-key", s.text);
					
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

			legendContainer.appendChild(legend);
		}

		private resetContextElement(el: Element, configuration: IRblChartConfiguration<IRblChartConfigurationDataType>): void {
			// empty the element
			el.replaceChildren();
			
			Array.from(el.classList).forEach(cls => {
				if (cls.startsWith('ka-chart-')) {
					el.classList.remove(cls);
				}
			});
			
			el.classList.add(configuration.css.chart);
		}
		
		private addHoverEvents(model: IKaChartModel, el: KaChartElement, configuration: IRblChartConfiguration<IRblChartConfigurationDataType>) {
			const registerTipEvents = () => {
				const tipItems = [...el.querySelectorAll(".ka-chart-donut [ka-tip-key], .ka-chart-category-group [ka-tip-key]")];

				// If I ever didn't want to use bootstrap 'hover', I could render all these tips in the registerMarkerEvents
				// function the same way I do for stacked area...
				tipItems.forEach(item => {
					const tipKey = item.getAttribute("ka-tip-key")!;
					const options = this.getTooltipOptions(el, tipKey);
					options.trigger = "hover";
					new bootstrap.Tooltip(item, options);
					item.setAttribute("ka-init-tip", "true");
				});
			};

			const registerSeriesHighlightEvents = () => {
				const plotOptions = configuration.plotOptions;

				const seriesItems = [
					{ textSelector: "span", highlightOnHover: plotOptions.highlight.series.hoverItem, elements: [...el.querySelectorAll(`.${configuration.css.chartType} [ka-chart-highlight-key]`)] },
					{ textSelector: "span", highlightOnHover: plotOptions.highlight.series.hoverLegend, elements: [...el.querySelectorAll(".ka-chart-legend [ka-chart-highlight-key]")] }
				];

				if (model.legendItemSelector) {
					const legend = this.application.selectElement(`.${configuration.css.legend}`);
					if (legend) {
						seriesItems.push({ textSelector: model.legendItemSelector, highlightOnHover: plotOptions.highlight.series.hoverLegend, elements: [...legend!.querySelectorAll("[ka-chart-highlight-key]")] });
					}
				}

				const highlightSeries = (event: Event) => {
					// console.log(`${event.type}: ${(event as MouseEvent).x}, ${(event as MouseEvent).y} ${(event.target as HTMLElement).className}`);
					const currentKey = (event.target as HTMLElement)!.getAttribute("ka-chart-highlight-key");

					seriesItems.forEach(item => {
						// If data is a tooltip, its opacity is always 0, so just skip it and never change opacity
						item.elements.filter(e => e.getAttribute("data-is-tooltip") != "1").forEach(i => {
							const opacity = event.type == "mouseleave" || currentKey == i.getAttribute("ka-chart-highlight-key") ? "1" : "0.2";
							if (i instanceof SVGElement) {
								i.setAttribute("opacity", opacity);
							}
							else {
								i.querySelector("svg")!.setAttribute("opacity", opacity);
								i.querySelectorAll<HTMLElement>(item.textSelector).forEach(t => t.style.opacity = opacity);
							}
						});
					});
				};
	
				seriesItems.forEach(item => {
					if (item.highlightOnHover) {
						item.elements.forEach(item => this.application.off(item, "mouseenter.ka.chart mouseleave.ka.chart").on("mouseenter.ka.chart mouseleave.ka.chart", highlightSeries));
					}
				});
			};

			let matrix: DOMMatrix = undefined!;
			const isStackedArea = configuration.type == "sharkfin";

			const registerMarkerEvents = () => {

				if (el.querySelector(".ka-chart-marker-points")) {
					const allChartContainers = ([...el.children] as KaHoverOptionsElement[]).filter(c => c.kaHoverOptions != undefined) as KaHoverOptionsElement[];

					allChartContainers.forEach(chartContainer => {
						const allCharts = [...chartContainer.querySelectorAll<SVGSVGElement>("svg.ka-chart")];
						const hoverOptions = chartContainer.kaHoverOptions;
						
						allCharts.forEach(chartSvg => {
							const pointMarkers =
								[...chartSvg.querySelectorAll(".ka-chart-marker-points")]
									.map(points => {
										return {
											points: [...points.querySelectorAll(".ka-chart-point")],
											glow: points.querySelector(".ka-chart-point-glow")!
										}
									});

							const areaTooltipMarkers = isStackedArea
								? [...chartSvg.querySelectorAll(`.ka-chart-series-item[ka-stack-top="1"] .ka-chart-marker-points path`)]
								: [];

							let currentColumn: number | undefined = undefined;
							let currentTip: BootstrapTooltip | undefined = undefined;
			
							const pt = chartSvg.createSVGPoint();
							let svgRect: DOMRect = undefined!;
							let hidingTip = false;

							const columnCount = hoverOptions.columnCount;
							const columnWidth = hoverOptions.columnWidth;
							const plotLeft = hoverOptions.plotLeft;
							const plotRight = hoverOptions.plotRight;
							const plotBottom = hoverOptions.plotBottom;
							const plotTop = hoverOptions.plotTop;
				
							const setNoHover = (me: MouseEvent) => {
								if (currentColumn == undefined) return;

								pointMarkers.forEach(g => {
									g.points.forEach(p => p.setAttribute("opacity", "0"));
									g.glow.setAttribute("opacity", "0");
								});

								if (currentTip) {
									if (!hidingTip) {
										hidingTip = true;
										/*
										const currentTipLabel = ((currentTip as any)?._element as Element)?.getAttribute("aria-label");
										console.log(`setNoHover: hide ${currentTipLabel}`);
										const isShown = (currentTip as any)._isShown();
										if (isShown !== true) {
											console.log(`Before hide: _isShown=${isShown}`);
										}
										*/
										currentTip.hide();
									}
									currentTip = undefined;
								}
								
								currentColumn = undefined;
							};

							const processMove = (me: MouseEvent) => {
								if (matrix == undefined) {
									matrix = chartSvg.getScreenCTM()!.inverse();
									svgRect = chartSvg.getBoundingClientRect();
								}
								
								// map window coords into SVG coords
								pt.x = me.clientX;
								pt.y = me.clientY;
								const loc = pt.matrixTransform(matrix);

								const isInsideX = loc.x >= plotLeft && loc.x <= plotRight;
								const isInsideY = loc.y >= plotTop && loc.y <= plotBottom;

								if (!(isInsideX && isInsideY)) {
									setNoHover(me);
									return;
								}

								// zero‑based column index under the pointer
								const relativeX = loc.x - plotLeft;
								const hoverColumn = Math.max(0, Math.min(columnCount - 1, Math.floor(relativeX / columnWidth)));
									
								if (hoverColumn != currentColumn) {
									currentColumn = hoverColumn;

									pointMarkers.forEach(g => {
										g.points.forEach((p, i) => {
											const isActive = hoverColumn == i;
											p.setAttribute("opacity", isActive ? "1" : "0");
											if (isActive) {
												const point = p.getAttribute("ka-chart-point")!.split(",");
												g.glow.setAttribute("cx", point[0]);
												g.glow.setAttribute("cy", point[1]);
											}
										});
										g.glow.setAttribute("opacity", "0.2");
									});

									if (isStackedArea) {
										const tipTrigger = areaTooltipMarkers[currentColumn];
										// If current category tip is not initialized, then 
										if (!bootstrap.Tooltip.getInstance(tipTrigger)) {
											// Bootstrap show/hide are async, so need to wait for events to properly process

											tipTrigger.addEventListener("hide.bs.tooltip", e => {
												/*
												I was having a race condition after moving mouse quickly that often times caused the tooltip that I stopped on
												to flicker (after shown, there was one more hide event dispatched for the same tip that was already shown, so
												it would show, hide, show).
												
												Key Observations
												Timeout in Bootstrap:
													- The second hidden.bs.tooltip event is triggered by executeAfterTransition in Bootstrap's internal logic. 
														This suggests that Bootstrap is queuing a hide() operation, even though show() may have already been called for the same tooltip.
												
												Manual Management vs. Bootstrap's Built-in Behavior:
													- By manually calling show() and hide(), Bootstrap's default behavior is bypassed (e.g., hover trigger). This can lead to race 
														conditions where Bootstrap's internal state becomes inconsistent.
												
												Potential Redundant hide and show:
													- When hiding and showing the same tooltip in quick succession, Bootstrap's internal logic may still process the hide event, 
														even though the tooltip is already being shown again.
														
												Solution: Prevent Bootstrap from processing the hide event if the tooltip is already scheduled to be shown again.
												*/

												const targetLabel = (e.target as Element).getAttribute("aria-label");
												const currentTipLabel = ((currentTip as any)?._element as Element)?.getAttribute("aria-label");
											
												// Prevent hiding if the tooltip is already scheduled to be shown again
												if (!hidingTip && currentTipLabel === targetLabel) {
													// console.log(`hide.bs.tooltip: skipping hide for ${targetLabel} because it is already being shown.`);
													e.preventDefault(); // Prevent Bootstrap from processing the hide event
												}
											});
											
											tipTrigger.addEventListener("hidden.bs.tooltip", e => {
												/*
												const currentTipLabel = ((currentTip as any)?._element as Element)?.getAttribute("aria-label");
												const targetLabel = (e.target as Element).getAttribute("aria-label");
												console.log(`hidden.bs.tooltip\r\n\thiding: ${targetLabel}\r\n\tshowing: ${currentTipLabel}`);
												const isShown = (currentTip as any)?._isShown();
												if (isShown === true) {
													console.log(`Before show: _isShown=${isShown}`);
												}
												console.trace("Call stack for hidden.bs.tooltip");
												*/
												currentTip?.show();
												hidingTip = false;
											});

											// If mouse over the tooptip, want to hide it if outside of chart and also move it with the mouse according to chart...
											tipTrigger.addEventListener("inserted.bs.tooltip", e => {
												const target = e.target as HTMLElement;
												const tip = document.querySelector<HTMLElement>(`#${target.getAttribute("aria-describedby")}`)!;

												tip.addEventListener("mousemove", (event: MouseEvent) => {
													if (!(event.clientX >= svgRect.left && event.clientX <= svgRect.right && event.clientY >= svgRect.top && event.clientY <= svgRect.bottom)) {
														setNoHover(me);
													}
													else {
														processMove(event);
													}
												});
											});
								
											HelpTips.hideVisiblePopover();

											const options = this.getTooltipOptions(el, String(currentColumn));
											new bootstrap.Tooltip(tipTrigger, options); // initialize tooltip
										}

										const visibleTip = document.querySelector<HTMLElement>(".tooltip.ka-chart-tip");
										currentTip = bootstrap.Tooltip.getInstance(tipTrigger);

										if (visibleTip) {
											// This will show the next tip in the hide event handler...
											if (hidingTip) {
												// console.log(`isStackedArea: skipping hide ${tipTrigger.getAttribute("aria-label")}`);
												return;
											}
											hidingTip = true;

											const visibleTrigger = document.querySelector(`[aria-describedby="${visibleTip.id}"]`)!;
											const visibleInstance = bootstrap.Tooltip.getInstance(visibleTrigger);
											/*
											const isShown = (visibleInstance as any)._isShown();
											console.log(`isStackedArea: trigger hide ${visibleTrigger.getAttribute("aria-label")}`);
											if (isShown !== true) {
												console.log(`Before hide: _isShown=${isShown}`);
											}
											*/
											visibleInstance.hide();
										}
										else {
											/*
											console.log(`isStackedArea: trigger show ${tipTrigger.getAttribute("aria-label")}`);
											const isShown = (currentTip as any)._isShown();
											if (isShown === true) {
												console.log(`Before show: _isShown=${isShown}`);
											}
											*/
											currentTip.show();
										}
									}
								}
							};

							this.application
								.off(chartSvg, "mousemove.ka.chart.marker mouseleave.ka.chart.marker")
								.on("mousemove.ka.chart.marker mouseleave.ka.chart.marker", (event: Event) => {
									const me = event as MouseEvent;
									if (me.type == "mouseleave") {
										// Check if the relatedTarget is still inside the SVG (moving to a child element of chartSvg) or the rendered tip
										const relatedTarget = me.relatedTarget as Element | null;
										if (chartSvg.contains(relatedTarget) || relatedTarget?.closest(".ka-chart-tip")) return;
										setNoHover(me);
										return;
									}

									processMove(me);
								});
						});

					});
				}
			};

			const registerEvents = () => {
				registerTipEvents();
				registerSeriesHighlightEvents();
				registerMarkerEvents();

				this.application.off(window, "resize scroll").on("resize scroll", () => {
					matrix = undefined!; 
					const visibleTip = document.querySelector<HTMLElement>(".tooltip.ka-chart-tip");
					if (visibleTip) {
						// This will show the next tip...
						bootstrap.Tooltip.getInstance(document.querySelector(`[aria-describedby="${visibleTip.id}"]`)!).hide();
					}	
				});
			};

			// If external legends are used, the legend isn't guaranteed to be rendered before chart is,
			// so need to wait for domUpdated event to do all the DOM selections for events.
			this.application.handleEvents(
				events => {
					events.domUpdated = elements => {
						const externalLegend = model.legendItemSelector != undefined ? this.application.selectElement(`.${configuration.css.legend}`) : undefined
						if (!elements.some(e => e === el || e.contains(el) || e === externalLegend || (externalLegend != undefined && e.contains(externalLegend)))) return;
						registerEvents();
						el.kaDomUpdated = true;
					};
				}, el.getAttribute("ka-chart-id")!
			);

			// If already did 'domUpdate' once but this function is called again...need to simply re-register events
			if (el.kaDomUpdated) {
				registerEvents();
			}
		}

		private getTooltipOptions(el: Element, tipKey: string): BootstrapTooltipOptions {
			return {
				html: true,
				sanitize: false,
				trigger: "manual",
				container: el, // el.querySelector(".ka-chart")!,
				template: '<div class="tooltip katapp-css ka-chart-tip" role="tooltip"><div class="tooltip-arrow arrow"></div><div class="tooltip-inner"></div></div>',

				placement: (tooltip, trigger) => "top",
				fallbackPlacements: ["top", "bottom", "right", "left"],
				
				title: function () {
					const tipContent = el.querySelector(`.ka-chart-tips .tooltip-${tipKey}`);

					// Only time (as of writing) this would be undefined is for stacked area where all series are 0 and they didn't want tip when 0
					if (!tipContent) return undefined;

					// If ever need to get series hovered, could do something like this...maybe after getting column, you get the 'x' midpoint so that if hovering between cols, you still get correct col
					/*
					(tipTrigger as any).kaTipContent = options.title;
					options.title = function () {
						
						// const hoveredSvgEl = document.elementFromPoint(me.clientX, me.clientY) as SVGElement | null;
						// if (hoveredSvgEl && chartSvg.contains(hoveredSvgEl)) {
						//	// e.g. log its tag, class or any identifying attribute
						//	console.log('hovered SVG element:', hoveredSvgEl.tagName, hoveredSvgEl.getAttribute("ka-chart-highlight-key"), hoveredSvgEl);
						//}
						return (this as any).kaTipContent();
					}
					*/

					return tipContent?.cloneWithEvents();
				},
				
				content: function () { return undefined; }
			};
		}

		private addTooltips(model: IKaChartModel, el: Element, configuration: IRblChartConfiguration<IRblChartConfigurationDataType>): void {
			if (model.mode == "legend") return;

			const tipConfig = configuration.plotOptions.tip;

			const tipContainer = document.createElement("div");
			tipContainer.classList.add("ka-chart-tips");
			tipContainer.style.display = "none";

			const tips = configuration.data.map((item, index) => {
				const tipInfo = (
					item.data instanceof Array
						? item.data.map((v, seriesIndex) => {
							return v > 0
								? {
									name: configuration.series[seriesIndex].text,
									value: v,
									seriesConfig: configuration.series[seriesIndex]
								}
								: undefined;
						}).filter(v => v != undefined)

						: [{
							name: item.name,
							value: item.data,
							seriesConfig: configuration.series[index]
						}]
				) as Array<{ name: string, value: number, seriesConfig: IRblChartConfigurationSeries }>;

				if (tipInfo.length == 0) return undefined;

				let header = item.data instanceof Array ? item.name : undefined;
				if (header) {
					header = configuration.plotOptions.tip.headerFormatter?.replace("{x}", header) ?? header;
				}

				const tooltipContent = document.createElement("div");
				tooltipContent.className = `tooltip-${index}`;

				const tooltipSvg = document.createElementNS(this.ns, "svg");
				const maxTextWidth = Math.max(...[(header ?? "").length].concat(tipInfo.map(tip => `${tip.name}: ${Utils.formatNumber(tip.value, configuration.plotOptions.dataLabels.format)}`.length))) * 7; // Approximate width of each character
				const svgWidth = maxTextWidth + tipConfig.padding.left * 2; // Add padding to the width

				const includeTotal = tipConfig.includeTotal && tipInfo.length > 1;

				tooltipSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${(tipInfo.length + (header ? 1 : 0) + (includeTotal ? 1 : 0)) * 20 + tipConfig.padding.top * 2}`);
				tooltipSvg.setAttribute("width", String(svgWidth));
	
				const tipLineBaseY = header ? 17 : 0;

				if (header) {
					const categoryText = this.createText(configuration.plotOptions, 0, tipLineBaseY, header, configuration.plotOptions.font.size.tipHeader, { "font-weight": "bold" });
					tooltipSvg.appendChild(categoryText);
				}
	
				const shapeXPadding = tipConfig.includeShape ? 15 : 0;
	
				tipInfo.forEach((tip, i) => {
					const y = tipLineBaseY + (i + 1) * 20;
					if (tipConfig.includeShape) {
						tooltipSvg.appendChild(this.getSeriesShape(y, tip.seriesConfig.shape, tip.seriesConfig.color));
					}
					const text = this.createText(configuration.plotOptions, shapeXPadding, y, `${tip.name}: `, configuration.plotOptions.font.size.tipBody);
					const tspan = document.createElementNS(this.ns, "tspan");
					tspan.setAttribute("font-weight", "bold");
					tspan.innerHTML = Utils.formatNumber(tip.value, configuration.plotOptions.dataLabels.format);
					text.appendChild(tspan);
					tooltipSvg.appendChild(text);
				});
	
				if (includeTotal) {
					const y = tipLineBaseY + (tipInfo.length + 1) * 20;
					const total = Utils.formatNumber(tipInfo.reduce((sum, tip) => sum + tip.value, 0), configuration.plotOptions.dataLabels.format);
					const text = this.createText(configuration.plotOptions, shapeXPadding, y, `Total: ${total}`, configuration.plotOptions.font.size.tipBody, { "font-weight": "bold" });
					tooltipSvg.appendChild(text);
				}

				tooltipContent.appendChild(tooltipSvg);

				return tooltipContent;
			}).filter(tip => tip != undefined) as HTMLElement[];

			tipContainer.append(...tips);
			el.appendChild(tipContainer);
		}

		private addMarkerPoints(configuration: IRblChartConfiguration<IRblChartConfigurationDataType>, points: IRblChartPoint[]) {
			const markerGroup = document.createElementNS(this.ns, "g");
			markerGroup.setAttribute("class", "ka-chart-marker-points");

			const glow = this.createCircle(points[0].x, points[0].y, 12, points[0].seriesConfig.color);
			glow.setAttribute("opacity", "0");
			glow.setAttribute("class", "ka-chart-point-glow");
			markerGroup.appendChild(glow);

			markerGroup.append(...points.map(point => {
				const diamond = this.createPointMarker(point.x, point.y, point.seriesConfig.color);
				const valueFormatted = Utils.formatNumber(point.value, configuration.plotOptions.dataLabels.format);

				diamond.setAttribute("aria-label", `${point.seriesConfig.text}, ${valueFormatted}. ${this.getHeader(configuration.plotOptions, point.name)}.`);
				diamond.setAttribute("ka-chart-point", `${point.x},${point.y}`);

				return diamond;
			}));

			return markerGroup;
		}

		private getHeader(plotOptions: IRblChartConfigurationPlotOptions, header: string): string {
			return plotOptions.tip.headerFormatter?.replace("{x}", header) ?? header
		}

		private addPlotLines(svg: Element, config: IRblChartConfiguration<IRblChartConfigurationDataType>, plotOffset: number = 0, plotBandSegmentWidth?: number) {
			if (config.plotOptions.xAxis.plotLines.length == 0) return;
			
			const paddingConfig = config.plotOptions.padding;

			const g = document.createElementNS(this.ns, "g");
			g.setAttribute("class", "ka-chart-plot-lines");

			const segmentWidth = plotBandSegmentWidth ?? config.plotOptions.xAxis.plotBandSegmentWidth;
			const plotLines = config.plotOptions.xAxis.plotLines.filter(l => config.plotOptions.xAxis.minCategory < l.value && l.value < config.plotOptions.xAxis.maxCategory).map(line => {
				const value = paddingConfig.left + segmentWidth + ((line.value - plotOffset) / 0.5) * segmentWidth;
				const plotLine = this.createLine(value, paddingConfig.top, value, config.plotOptions.yAxis.baseY, line.color, 2);

				// NOT TESTED/USED
				const label = line.label?.text
					? this.createText(
						config.plotOptions,
						value, paddingConfig.top - 3,
						line.label.text,
						config.plotOptions.font.size.plotBandLine,
						{ "text-anchor": "start", "dominant-baseline": "baseline" })
					: undefined;
				return label ? [label, plotLine] : [plotLine];
			});
			g.append(...plotLines.flat());
			svg.appendChild(g);
		}

		private addPlotBands(svg: Element, configuration: IRblChartConfiguration<IRblChartConfigurationDataType>, plotOffset: number = 0, labelColumn?: IRblPlotColumnName, plotBandSegmentWidth?: number): void {
			if (configuration.plotOptions.xAxis.plotBands.length == 0) return;

			const paddingConfig = configuration.plotOptions.padding;
			const plotHeight = configuration.plotOptions.plotHeight;

			const g = document.createElementNS(this.ns, "g");
			g.setAttribute("class", "ka-chart-plot-bands");

			const segmentWidth = plotBandSegmentWidth ?? configuration.plotOptions.xAxis.plotBandSegmentWidth;

			// In case bands don't split exactly on line with breakpoint size, don't duplicate band labels
			// if the same one is used for consecutive bands.
			let lastLabelKey: string | undefined = undefined;

			const plotBands = configuration.plotOptions.xAxis.plotBands
				.filter(b => b.from < configuration.plotOptions.xAxis.maxCategory && b.to > configuration.plotOptions.xAxis.minCategory)
				.map(band => {
					const from = paddingConfig.left + segmentWidth + (Math.max(-0.5, band.from - plotOffset) / 0.5) * segmentWidth;
					const to = paddingConfig.left + segmentWidth + (Math.min(band.to - plotOffset, configuration.data.length - 0.5) / 0.5) * segmentWidth;
					const rect = this.createRect(from, paddingConfig.top, to - from, plotHeight, band.color);

					let plotLabel = band.label?.[labelColumn ?? "text"] ?? band.label?.text;
					const labelKey = `${plotLabel}|${band.color}`;

					if (lastLabelKey == labelKey) {
						plotLabel = undefined;
					}
					lastLabelKey = labelKey;

					const label = plotLabel
						? this.createText(
							configuration.plotOptions,
							from, paddingConfig.top - 3,
							plotLabel,
							configuration.plotOptions.font.size.plotBandLabel,
							{ "text-anchor": "start", "dominant-baseline": "baseline" })
						: undefined;
					return label ? [label, rect] : [rect];
				});

			g.append(...plotBands.flat());
			svg.appendChild(g);
		}

		private addXAxis(svg: Element, configuration: IRblChartConfiguration<IRblChartConfigurationDataType>, data: Array<{ name: string, data: IRblChartConfigurationDataType }>): void {
			const paddingConfig = configuration.plotOptions.padding;
			const columnConfig = configuration.plotOptions.column!;

			const xAxis = document.createElementNS(this.ns, "g");
			xAxis.setAttribute("class", "ka-chart-x-axis");

			// Add xAxis line last so first column isn't rendered on top of it
			const xAxisLine = this.createLine(paddingConfig.left, configuration.plotOptions.yAxis.baseY, configuration.plotOptions.width - paddingConfig.right, configuration.plotOptions.yAxis.baseY);
			xAxis.appendChild(xAxisLine);

			const xAxisTicks = data.map((item, i) => {
				const columnX = columnConfig.getX(i);
				if (i % configuration.plotOptions.xAxis.skipInterval == 0) {
					const xAxisTickLabel = this.createText(
						configuration.plotOptions,
						columnX + columnConfig.width / 2, // center...
						configuration.plotOptions.yAxis.baseY + 2,
						item.name,
						configuration.plotOptions.font.size.xAxisTickLabels,
						{ "text-anchor": "middle", "dominant-baseline": "text-before-edge" }, // top of text aligns with Y
						true
					);
					return xAxisTickLabel;
				}
			});

			xAxis.append(...xAxisTicks.filter(t => t != undefined) as Element[]);

			if (configuration.plotOptions.xAxis.label) {
				const xAxisLabelX = configuration.plotOptions.padding.left + configuration.plotOptions.plotWidth / 2;
				const xAxisLabelY = configuration.plotOptions.height - configuration.plotOptions.font.size.xAxisLabel * 1.5;
				const xAxisLabel = this.createText(configuration.plotOptions, xAxisLabelX, xAxisLabelY, configuration.plotOptions.xAxis.label, configuration.plotOptions.font.size.xAxisLabel, { "text-anchor": "middle", "dominant-baseline": "middle" });
				xAxis.appendChild(xAxisLabel);
			}

			svg.appendChild(xAxis);
		}

		private addYAxis(svg: Element, configuration: IRblChartConfiguration<IRblChartConfigurationDataType>): void {
			const paddingConfig = configuration.plotOptions.padding;
			const plotHeight = configuration.plotOptions.plotHeight;

			const yAxis = document.createElementNS(this.ns, "g");
			yAxis.setAttribute("class", "ka-chart-y-axis");

			// const yAxisLine = this.createLine(paddingConfig.left, paddingConfig.top, paddingConfig.left, config.plotOptions.yAxis.baseY);
			const yAxisLabelX = configuration.plotOptions.font.size.yAxisLabel;
			const yAxisLabelY = plotHeight / 2;
			const yAxisLabel = configuration.plotOptions.yAxis.label
				? this.createText(configuration.plotOptions, yAxisLabelX, yAxisLabelY, configuration.plotOptions.yAxis.label, configuration.plotOptions.font.size.yAxisLabel, { fill: "black", "text-anchor": "middle", transform: `rotate(-90, ${yAxisLabelX}, ${yAxisLabelY})` })
				: undefined;
			
			const yAxisMax = configuration.plotOptions.yAxis.maxValue;
			const yAxisInterval = configuration.plotOptions.yAxis.intervalSize;

			const yAxisTicks =
				Array.from({ length: Math.ceil(yAxisMax / yAxisInterval) + 1 }, (_, i) => i * yAxisInterval)
					.flatMap((value, i) => {
						const y = paddingConfig.top + plotHeight - (value / yAxisMax) * plotHeight;
						
						const tickLine = i != 0
							? this.createLine(paddingConfig.left, y, configuration.plotOptions.width - paddingConfig.right, y, "#e6e6e6")
							: undefined;

						const tickLabel = this.createText(configuration.plotOptions, paddingConfig.left - 7, y, Utils.formatNumber(value, configuration.plotOptions.yAxis.format), configuration.plotOptions.font.size.yAxisTickLabels, { "text-anchor": "end", "dominant-baseline": "middle" })
						return tickLine ? [tickLine!, tickLabel] : [tickLabel];
					});

			if (yAxisLabel != undefined) yAxis.appendChild(yAxisLabel);

			yAxis.append(...yAxisTicks);
			// yAxis.appendChild(yAxisLine);

			svg.appendChild(yAxis);
		}

		private getWrappedColumnLabels(plotOptions: IRblChartConfigurationPlotOptions, label: string): string[] {
			const words = label.split(" ");
			const lines = [];
			let currentLine = "";
	
			words.forEach(word => {
				const testLine = currentLine ? `${currentLine} ${word}` : word;
				const testLineWidth = testLine.length * plotOptions.font.size.xAxisTickLabels * plotOptions.font.size.heuristic;
				
				if (testLineWidth <= plotOptions.column.maxLabelWidth) {
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

		private getChartSvgElement(plotOptions: IRblChartConfigurationPlotOptions): Element {
			const svg = document.createElementNS(this.ns, "svg");
			svg.setAttribute("viewBox", `0 0 ${plotOptions.width} ${plotOptions.height}`);
			svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
			svg.setAttribute("class", "ka-chart");
			return svg;
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

		private createText(plotOptions: IRblChartConfigurationPlotOptions, x: number, y: number, text: string, fontSize: number, properties: {} = {}, isxAxisLabel?: boolean): Element {
			const textSvg = document.createElementNS(this.ns, "text");
			textSvg.setAttribute("x", String(x));
			textSvg.setAttribute("y", String(y));
			textSvg.setAttribute("font-size", `${fontSize}px`);

			if (properties) {
				for (const [key, value] of Object.entries(properties)) {
					textSvg.setAttribute(key, String(value));
				}
			}

			if (isxAxisLabel) {
				const lines = this.getWrappedColumnLabels(plotOptions, text)

				lines.forEach((line, index) => {
					const tspan = document.createElementNS(this.ns, "tspan");
					tspan.setAttribute("x", String(x));
					tspan.setAttribute("dy", String(index === 0 ? 0 : plotOptions.font.size.xAxisTickLabels + 5));
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

		private createPointMarker(x: number, y: number, fill: string, size: number = 7) {
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

		private createPath(d: string, stroke: string, strokeWidth: number, fill: string = "none", opacity: number = 1): Element {
			const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
			path.setAttribute("d", d);
			path.setAttribute("fill", fill);
			path.setAttribute('fill-opacity', opacity.toString());
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

		private getOptionJson<T>(configRows: Array<IRblChartDataRow>, name: string, globalOptions?: IRblChartOptionRow[]): T | undefined {
			const json = (configRows.find(r => String.compare(r.id, name, true) === 0)?.value ??
				globalOptions?.find(r => r.id == name)?.value);
			
			return json ? JSON.parse(json) as T : undefined;
		}

		private getOptionValue<T = string>(configRows: Array<IRblChartDataRow>, name: string, globalOptions?: IRblChartOptionRow[], defaultValue?: string): T | undefined {
			return (configRows.find(r => String.compare(r.id, name, true) === 0)?.value ??
				globalOptions?.find(r => r.id == name)?.value ?? defaultValue) as T;
		}
		private getOptionNumber(configRows: Array<IRblChartDataRow>, name: string, globalOptions?: IRblChartOptionRow[], defaultValue?: number): number | undefined {
			const value = (configRows.find(r => String.compare(r.id, name, true) === 0)?.value ??
				globalOptions?.find(r => r.id == name)?.value ?? String(defaultValue));
			
			if (value == undefined) return undefined;
			
			return Number(value);
		}
	}
}