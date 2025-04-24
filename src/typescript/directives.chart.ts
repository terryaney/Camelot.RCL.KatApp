namespace KatApps {
	export class DirectiveKaChart implements IKaDirective {
		public name = "ka-chart";

		private ns = "http://www.w3.org/2000/svg"
		private application!: KatApp;
		private configuration!: IRblChartConfiguration<IRblChartConfigurationDataType>;
		private idClass!: string;
		private chartTypeClass!: string;
		private legendClass!: string;
		private legendTypeClass!: string;

		public getDefinition(application: KatApp): Directive<Element> {
			return ctx => {
				this.application = application;
				const el = ctx.el as HTMLElement;

				ctx.effect(() => {
					const scope: IKaChartModel = ctx.get();

					this.buildChartConfiguration(scope);

					this.idClass = `ka-chart-${scope.data.toLowerCase()}`;
					this.legendClass = `ka-chart-legend-${scope.data.toLowerCase()}`;
					this.chartTypeClass = `ka-chart-${this.configuration.plotOptions.type.toLowerCase()}`;
					this.legendTypeClass = `ka-chart-legend-${this.configuration.plotOptions.type.toLowerCase()}`;

					this.resetContextElement(el);

					if (this.configuration.data.length > 0) {
						this.addChart(scope, el)
						this.addLegend(el);
						this.addTipContent(el);
						this.addHoverEvents(scope, el);
					}
				});
			};
		}
		
		private addChart(model: IKaChartModel, el: HTMLElement) {
			if (model.mode == "legend") return;

			const chartContainer = document.createElement("div");
			chartContainer.classList.add("ka-chart", this.chartTypeClass);

			if (model.categories?.xs) {
				chartContainer.classList.add("d-none", "d-sm-block");
			}

			if (model.maxHeight) {
				chartContainer.style.maxHeight = `${model.maxHeight}px`;
			}
			el.appendChild(chartContainer);

			switch (this.configuration.plotOptions.type) {
				case "donut":
					this.generateDonutChart(chartContainer);
					break;
				
				case "sharkfin":
					this.generateStackedArea(chartContainer);
					break;
				
				case "column":
				case "columnStacked":
					this.generateColumnChart(chartContainer);
					this.generateBreakpointColumnCharts(el, model);
					break;
					
				default:
					chartContainer.innerHTML = `<b>${model.data} ${this.configuration.plotOptions.type} chart not supported</b>`;
					return;
			}

			if (model.maxHeight) {
				chartContainer.querySelector("svg")!.style.maxHeight = `${model.maxHeight}px`;
			}
		}
		
		private buildChartConfiguration(model: IKaChartModel) {
			const dataSource = this.application.state.rbl.source(model.data, model.ce, model.tab) as any as Array<IRblChartDataRow>;
			const dataRows = dataSource.filter(r => r.id == "category");
			const chartOptions = dataSource.filter(r => r.id != "category");
			const globalOptions = this.application.state.rbl.source(model.options ?? "chartOptions", model.ce, model.tab) as any as Array<IRblChartDataRow>;

			const chartType = this.getOptionValue<IRblChartConfigurationType>(chartOptions, "type")!;

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
								...config.data.map(item => directive.getWrappedColumnLabels(item.name).length + 1)
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

					highlightSeries: {
						hoverItem: getBooleanProperty("highlightSeries.hoverItem", undefined, ["column", "donut"].includes(chartType) ? "true" : "false"),
						hoverLegend: true
					},

					legend: {
						show: model.legendTextSelector == undefined &&
							(
								model.mode == "legend" ||
								(model.mode != "chart" && getBooleanProperty("legend.show", undefined, "false"))
							)
					}
				},

				series: seriesConfig
			};

			config.plotOptions.padding._parent = config.plotOptions;
			config.plotOptions.column._parent = config.plotOptions;
			config.plotOptions.xAxis._parent = config.plotOptions;
			config.plotOptions.yAxis._parent = config.plotOptions;

			console.log(config);

			this.configuration = config
		}

		private generateStackedArea(container: HTMLElement) {
			const config = this.configuration as IRblChartConfiguration<IRblChartConfigurationDataType>;
			const paddingConfig = config.plotOptions.padding;
			const svg = this.getChartSvgElement();
			const data = config.data as Array<{ name: string, data: Array<number> }>;

			this.addPlotBands(svg, config);

			this.addYAxis(svg, config);

			// Data
			const dataPoints = data.map((item, i) => {
				const pointX = paddingConfig.left + config.plotOptions.xAxis.plotBandSegmentWidth + i * config.plotOptions.xAxis.plotBandSegmentWidth * 2;
				const point = { name: item.name, x: pointX, total: item.data.reduce((sum, v) => sum + v, 0) } as { name: string, x: number, total: number } & Record<string, number>;
				config.series.forEach((s, j) => {
					point[ s.text ] = +item.data[j];
				});
				return point;
			});

			console.log("datapoints", dataPoints);

			const getSeriesY = (pointIndex: number, seriesName: string, lowerSeries: string | undefined) => {
				const seriesY = lowerSeries
					? config.plotOptions.yAxis.getY(dataPoints[pointIndex][lowerSeries] + dataPoints[pointIndex][seriesName])
					: config.plotOptions.yAxis.getY(dataPoints[pointIndex][seriesName]);
				
				return seriesY;
			};

			// Draw area for each series
			const seriesElements = config.series.map((seriesConfig, seriesIndex) => {
				const seriesName = seriesConfig.text;
				const color = seriesConfig.color;

				const seriesItem = document.createElementNS(this.ns, 'g');
				seriesItem.setAttribute('class', 'ka-chart-series-item');

				const isBottomSeries = seriesIndex == config.series.length - 1;

				const lowerSeries = isBottomSeries
					? undefined // This is the last (bottom) series
					: config.series[seriesIndex + 1].text; // For stacked series, we need to draw on top of the series underneath

				let seriesX = dataPoints[0].x;
				let seriesY = getSeriesY(0, seriesName, lowerSeries);
				// Create path for the current series
				let seriesPath = `M ${seriesX} ${config.plotOptions.yAxis.getY(0)} L ${seriesX} ${seriesY}`; // Draw up to first point
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
					seriesPath += ` L ${dataPoints[dataPoints.length - 1].x} ${config.plotOptions.yAxis.getY(0)} Z`;
				} else {
					// Draw back along bottom edge (which is the top of the previous series)
					for (let i = dataPoints.length - 1; i >= 0; i--) {
						seriesPath += ` L ${dataPoints[i].x} ${config.plotOptions.yAxis.getY(dataPoints[i][lowerSeries!])}`;
					}

					// Close the path
					seriesPath += ' Z';
				}

				const series = this.createPath(seriesPath, "none", 0, color, 0.75);
				const border = this.createPath(borderPath, color, 2);
				const seriesMarkerGroup = this.addMarkerPoints(markerPoints);

				seriesItem.append(series, border, seriesMarkerGroup);

				return seriesItem;
			});

			const seriesGroup = document.createElementNS(this.ns, 'g');
			seriesGroup.setAttribute('class', 'ka-chart-series-group');
			seriesGroup.append(...seriesElements);
			svg.appendChild(seriesGroup);

			this.addPlotLines(svg, config );

			this.addXAxis(svg, config, config.data);

			container.appendChild(svg);
		}

		private generateColumnChart(container: HTMLElement, breakpointConfig?: { plotOffset: number, plotLabelColumn: "textXs", data: Array<{ name: string, data: IRblChartConfigurationDataType }>, containerClass?: string }) {
			const config = this.configuration as IRblChartConfiguration<IRblChartConfigurationDataType>;
			const svg = this.getChartSvgElement();

			const data = breakpointConfig?.data ?? config.data;
			const columnConfig = config.plotOptions.column!;
			const paddingConfig = config.plotOptions.padding;

			const plotHeight = config.plotOptions.plotHeight;
			const plotOffset = breakpointConfig?.plotOffset ?? 0;

			this.addPlotBands(svg, config, plotOffset, breakpointConfig?.plotLabelColumn);

			this.addYAxis(svg, config);

			this.addPlotLines(svg, config, plotOffset );
			
			const yAxisMax = config.plotOptions.yAxis.maxValue;

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
					? this.createTooltip(tipKey, element, [{ name: elementConfig.text, value: valueFormatted, color: elementConfig.color, shape: elementConfig.shape }], headerName, breakpointConfig?.containerClass)
					: undefined;
				
				return { element: element, tooltipContent };
			};

			const columns = data.map((item, i) => {
				const columnX = columnConfig.getX(i);

				let stackBase = 0;
				const columnElements = (item.data instanceof Array
					// Stacked ...
					? item.data.map((v, j) => {
						const elementConfig = config.series[j];
						const tipKey = config.plotOptions.tip.show == "series" ? `${i + (breakpointConfig?.plotOffset ?? 0)}-${j}` : undefined;

						if (elementConfig.shape == "line") {
							const lineX = columnX + columnConfig.width / 2;
							const lineY = config.plotOptions.yAxis.getY(v);
							// console.log(`Line x: ${lineX}, y: ${lineY}`);
							const linePoint: IRblChartPoint = {
								x: lineX,
								y: lineY,
								seriesConfig: elementConfig,
								value: v,
								name: item.name
							};

							return linePoint;
						}
						else {
							const element = getColumnElement(
								columnX,
								config.plotOptions.yAxis.getY(stackBase + v),
								v,
								elementConfig,
								tipKey,
								item.name
							);
							stackBase += v;
							return element;
						}
					})
					: [getColumnElement(columnX, config.plotOptions.yAxis.getY(item.data), item.data, config.series[i])]
				);

				const columnGroup = document.createElementNS(this.ns, "g");
				columnGroup.classList.add("ka-chart-category");
				columnGroup.setAttribute("ka-chart-marker-item", String(i));

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
						? this.createTooltip(String(i + (breakpointConfig?.plotOffset ?? 0)), columnGroup, seriesTipInfo.reverse(), item.name, breakpointConfig?.containerClass)
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

					const labelY = config.plotOptions.yAxis.getY(totalValue) - 10; // Position above the column
					const dataLabel = this.createText(
						columnX + columnConfig.width / 2, // Centered above the column
						labelY,
						this.formatNumber(totalValue, config.plotOptions.dataLabels.format),
						{ "text-anchor": "middle", "font-size": `${config.plotOptions.font.size.dataLabel}px`, "font-weight": "bold" }
					);

					columnGroup.appendChild(dataLabel);
				}

				const linePoints = columnElements.filter(e => "x" in e) as IRblChartPoint[];

				return {
					g: columnGroup,
					linePoints,
					tooltips:
						rectElements
							.filter(e => e.tooltipContent != undefined).map(e => e.tooltipContent!) // Each element/series tip (if option set)
							.concat(tooltip ? [tooltip] : []) // Entire category tip
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

				for (let i = 0; i < totalLines; i++) {
					const lineGroup = document.createElementNS(this.ns, "g");
					lineGroup.setAttribute("class", "ka-chart-series-item-group");

					const linePoints = columns.map(c => c.linePoints[i]);

					const lineMarkerGroup = this.addMarkerPoints(linePoints);

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
					path.setAttribute("ka-chart-series-item", lineConfig.text); // Make sure I can do 'opacity hover'

					lineGroup.append(path, lineMarkerGroup);					
					lines.appendChild(lineGroup);
					svg.appendChild(lines);
				}
			}

			this.addXAxis(svg, config, data);

			container.appendChild(svg);

			if (columns.some(c => c.tooltips.length > 0)) {
				const tips = document.createElement("div");
				tips.style.display = "none";
				tips.append(...columns.filter(c => c.tooltips.length > 0).flatMap(c => c.tooltips!));
				container.appendChild(tips);
			}
		}
		
		private generateBreakpointColumnCharts(chartContainer: Element, model: IKaChartModel) {
			const categories = model.categories;

			if (categories?.xs) {
				this.configuration.plotOptions.aspectRadio.current = "xs";
				this.configuration.plotOptions.column.count = categories.xs;
				
				const xsContainer = document.createElement("div");
				xsContainer.className = `d-block d-sm-none ka-chart-xs ${this.chartTypeClass}`;

				chartContainer.appendChild(xsContainer);

				const maxHeight = categories.maxHeight ?? model.maxHeight;

				for (let index = 0; index < Math.ceil(this.configuration.data.length / categories.xs); index++) {
					const plotStart = index * categories.xs;
					const plotEnd = plotStart + categories.xs;

					let xsContainerMaxHeight: HTMLElement | undefined = undefined;

					if (maxHeight) {
						xsContainerMaxHeight = document.createElement("div");
						xsContainerMaxHeight.style.maxHeight = `${maxHeight}px`;
						xsContainer.appendChild(xsContainerMaxHeight);
					}

					this.configuration.plotOptions.xAxis.minCategory = plotStart - 0.5;
					this.configuration.plotOptions.xAxis.maxCategory = plotEnd - 0.5;

					const partialData = this.configuration.data.slice(plotStart, plotEnd);
					this.generateColumnChart(xsContainerMaxHeight ?? xsContainer, { plotOffset: plotStart, plotLabelColumn: "textXs", data: partialData, containerClass: ".ka-chart-xs" });
				}

				if (maxHeight) {
					[...xsContainer.children].forEach(div => div.querySelector("svg")!.style.maxHeight = `${categories.maxHeight}px`);
				}
			}
		}

		private generateDonutChart(container: HTMLElement) {
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
					? this.createTooltip(String(index), path, [{ name: item.name, value: valueFormatted, color: config.series[index].color, shape: config.series[index].shape }])
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

		private addLegend(container: Element): void {
			if (!this.configuration.plotOptions.legend.show) return;

			const legendContainer = document.createElement("div");
			legendContainer.className = `ka-chart-legend ${this.legendTypeClass} ${this.legendClass}`;
			container.appendChild(legendContainer);

			const legend = document.createElement("div");
			legend.className = "ka-chart-legend-item-wrapper";

			const series = this.configuration.plotOptions.type == "sharkfin"
				? this.configuration.series
				: this.configuration.series.toReversed();
			
			series
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

			legendContainer.appendChild(legend);
		}

		private addTipContent(model: IKaChartModel, el: HTMLElement): void {
			if (model.mode == "legend") return;

			const tipContainer = document.createElement("div");
			tipContainer.classList.add("ka-chart-tips");

			el.appendChild(tipContainer);
		}
		
		private resetContextElement(el: HTMLElement): void {
			// empty the element
			el.replaceChildren();
			Array.from(el.classList).forEach(cls => {
				if (cls.startsWith('ka-chart-')) {
					el.classList.remove(cls);
				}
			});
			el.classList.add(this.idClass);
		}
		
		private addHoverEvents(scope: IKaChartModel, el: Element) {

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
				this.application.handleEvents(events => {
					let domUpdated = false;
					events.domUpdated = () => {
						if (domUpdated) return;

						domUpdated = true;
						const seriesItems = [
							{ textSelector: "span", highlightOnHover: this.configuration.plotOptions.highlightSeries.hoverItem, items: [...el.querySelectorAll(".ka-chart [ka-chart-series-item]")] },
							{ textSelector: "span", highlightOnHover: this.configuration.plotOptions.highlightSeries.hoverLegend, items: [...el.querySelectorAll(".ka-chart-legend [ka-chart-series-item]")] }
						];
						
						if (scope.legendTextSelector) {
							const legend = this.application.selectElement(`.${this.legendClass}`);
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

		private addMarkerPoints(points: IRblChartPoint[]) {
			const markerGroup = document.createElementNS(this.ns, "g");
			markerGroup.setAttribute("class", "ka-chart-marker-points");

			const glow = this.createCircle(points[0].x, points[0].y, 12, points[0].seriesConfig.color);
			glow.setAttribute("opacity", "0");
			glow.setAttribute("class", "ka-chart-point-glow");
			markerGroup.appendChild(glow);

			markerGroup.append(...points.map((point, index) => {
				const diamond = this.createPointMarker(point.x, point.y, point.seriesConfig.color);

				const valueFormatted = this.formatNumber(point.value, this.configuration.plotOptions.dataLabels.format);
				diamond.setAttribute("ka-chart-marker-item", String(index));
				diamond.setAttribute("aria-label", `${point.seriesConfig.text}, ${valueFormatted}. ${this.encodeHtmlAttributeValue(point.name!)}.`);
				diamond.setAttribute("ka-chart-marker-item-point", `${point.x},${point.y}`);
				return diamond;
			}));

			return markerGroup;
		}

		private addPlotLines(svg: Element, config: IRblChartConfiguration<IRblChartConfigurationDataType>, plotOffset: number = 0) {
			if (config.plotOptions.xAxis.plotLines.length == 0) return;
			
			const paddingConfig = config.plotOptions.padding;

			const g = document.createElementNS(this.ns, "g");
			g.setAttribute("class", "ka-chart-plot-lines");

			const plotLines = config.plotOptions.xAxis.plotLines.filter(l => config.plotOptions.xAxis.minCategory < l.value && l.value < config.plotOptions.xAxis.maxCategory).map(line => {
				const value = paddingConfig.left + config.plotOptions.xAxis.plotBandSegmentWidth + ((line.value - plotOffset) / 0.5) * config.plotOptions.xAxis.plotBandSegmentWidth;
				const plotLine = this.createLine(value, paddingConfig.top, value, config.plotOptions.yAxis.baseY, line.color, 2);

				// NOT TESTED/USED
				const label = line.label?.text
					? this.createText(
						value, paddingConfig.top - 3,
						line.label.text,
						{ "text-anchor": "start", "font-size": `${config.plotOptions.font.size.plotBandLine}px`, "dominant-baseline": "baseline" })
					: undefined;
				return label ? [label, plotLine] : [plotLine];
			});
			g.append(...plotLines.flat());
			svg.appendChild(g);
		}

		private addPlotBands(svg: Element, config: IRblChartConfiguration<IRblChartConfigurationDataType>, plotOffset: number = 0, labelColumn?: IRblPlotColumnName): void {
			if (config.plotOptions.xAxis.plotBands.length == 0) return;

			const paddingConfig = config.plotOptions.padding;
			const plotHeight = config.plotOptions.plotHeight;

			const g = document.createElementNS(this.ns, "g");
			g.setAttribute("class", "ka-chart-plot-bands");

			const plotBands = config.plotOptions.xAxis.plotBands
				.filter(b => b.from < config.plotOptions.xAxis.maxCategory && b.to > config.plotOptions.xAxis.minCategory)
				.map(band => {
					const from = paddingConfig.left + config.plotOptions.xAxis.plotBandSegmentWidth + (Math.max(-0.5, band.from - plotOffset) / 0.5) * config.plotOptions.xAxis.plotBandSegmentWidth;
					const to = paddingConfig.left + config.plotOptions.xAxis.plotBandSegmentWidth + (Math.min(band.to - plotOffset, config.data.length - 0.5) / 0.5) * config.plotOptions.xAxis.plotBandSegmentWidth;
					const rect = this.createRect(from, paddingConfig.top, to - from, plotHeight, band.color);

					const plotLabel = band.label?.[labelColumn ?? "text"] ?? band.label?.text;
					const label = plotLabel
						? this.createText(
							from, paddingConfig.top - 3,
							plotLabel,
							{ "text-anchor": "start", "font-size": `${config.plotOptions.font.size.plotBandLabel}px`, "dominant-baseline": "baseline" })
						: undefined;
					return label ? [label, rect] : [rect];
				});

			g.append(...plotBands.flat());
			svg.appendChild(g);
		}

		private addXAxis(svg: Element, config: IRblChartConfiguration<IRblChartConfigurationDataType>, data: Array<{ name: string, data: IRblChartConfigurationDataType }>): void {
			const paddingConfig = config.plotOptions.padding;
			const columnConfig = config.plotOptions.column!;

			const xAxis = document.createElementNS(this.ns, "g");
			xAxis.setAttribute("class", "ka-chart-x-axis");

			// Add xAxis line last so first column isn't rendered on top of it
			const xAxisLine = this.createLine(paddingConfig.left, config.plotOptions.yAxis.baseY, config.plotOptions.width - paddingConfig.right, config.plotOptions.yAxis.baseY);
			xAxis.appendChild(xAxisLine);

			const xAxisTicks = data.map((item, i) => {
				const columnX = columnConfig.getX(i);
				if (i % config.plotOptions.xAxis.skipInterval == 0) {
					const xAxisTickLabel = this.createText(
						columnX + columnConfig.width / 2, // center...
						config.plotOptions.yAxis.baseY + 2,
						item.name,
						{ "text-anchor": "middle", "font-size": `${config.plotOptions.font.size.xAxisTickLabels}px`, "dominant-baseline": "text-before-edge" }, // top of text aligns with Y
						true
					);
					return xAxisTickLabel;
				}
			});

			xAxis.append(...xAxisTicks.filter(t => t != undefined) as Element[]);

			if (config.plotOptions.xAxis.label) {
				const xAxisLabelX = config.plotOptions.padding.left + config.plotOptions.plotWidth / 2;
				const xAxisLabelY = config.plotOptions.height - config.plotOptions.font.size.xAxisLabel * 1.5;
				const xAxisLabel = this.createText(xAxisLabelX, xAxisLabelY, config.plotOptions.xAxis.label, { "text-anchor": "middle", "font-size": `${config.plotOptions.font.size.xAxisLabel}px`, "dominant-baseline": "middle" });
				xAxis.appendChild(xAxisLabel);
			}

			svg.appendChild(xAxis);
		}

		private addYAxis(svg: Element, config: IRblChartConfiguration<IRblChartConfigurationDataType>): void {
			const paddingConfig = config.plotOptions.padding;
			const plotHeight = config.plotOptions.plotHeight;

			const yAxis = document.createElementNS(this.ns, "g");
			yAxis.setAttribute("class", "ka-chart-y-axis");

			// const yAxisLine = this.createLine(paddingConfig.left, paddingConfig.top, paddingConfig.left, config.plotOptions.yAxis.baseY);
			const yAxisLabelX = config.plotOptions.font.size.yAxisLabel;
			const yAxisLabelY = plotHeight / 2;
			const yAxisLabel = config.plotOptions.yAxis.label
				? this.createText(yAxisLabelX, yAxisLabelY, config.plotOptions.yAxis.label, { "font-size": `${config.plotOptions.font.size.yAxisLabel}px`, fill: "black", "text-anchor": "middle", transform: `rotate(-90, ${yAxisLabelX}, ${yAxisLabelY})` })
				: undefined;
			
			const yAxisMax = config.plotOptions.yAxis.maxValue;
			const yAxisInterval = config.plotOptions.yAxis.intervalSize;

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

			if (yAxisLabel != undefined) yAxis.appendChild(yAxisLabel);

			yAxis.append(...yAxisTicks);
			// yAxis.appendChild(yAxisLine);

			svg.appendChild(yAxis);
		}

		private getWrappedColumnLabels(label: string): string[] {
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

		private getChartSvgElement(): Element {
			const svg = document.createElementNS(this.ns, "svg");
			svg.setAttribute("viewBox", `0 0 ${this.configuration.plotOptions.width} ${this.configuration.plotOptions.height}`);
			svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
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
				const lines = this.getWrappedColumnLabels(text)

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

		private createTooltip(targetKey: string, target: Element, tipLines: Array<{ name: string, value: string, color: string, shape: IRblChartConfigurationShape }>, header: string | undefined = undefined, tipContainerClass: string = ".ka-chart"): Element | undefined {
			target.setAttribute("data-bs-toggle", "tooltip");
			target.setAttribute("data-bs-placement", "auto");
			target.setAttribute("data-bs-container", `.${this.idClass} ${tipContainerClass}`);
			target.setAttribute("data-bs-class", "ka-chart-tip");
			target.setAttribute("data-bs-width", "auto");
			target.setAttribute("data-bs-content-selector", `.${this.idClass} .ka-chart .tooltip-${targetKey}`);

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

		private getOptionJson<T>(configRows: Array<IRblChartDataRow>, name: string, globalOptions?: IRblChartOptionRow[]): T | undefined {
			const json = (configRows.find(r => String.compare(r.id, name, true) === 0)?.value ??
				globalOptions?.find(r => r.id == name)?.value);
			
			return json ? JSON.parse(json) as T : undefined;
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