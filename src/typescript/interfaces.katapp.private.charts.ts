type IRblChartConfigurationDataType = number | Array<number>;
type IRblChartConfigurationTipShowOption = "off" | "category" | "series";
type IRblChartConfigurationType = "column" | "columnStacked" | "donut" | "sharkfin";
type IRblChartConfigurationShape = "square" | "circle" | "line";
type IRblChartSeriesType = "tooltip" | "line" | "column" | undefined;
type IRblChartFormatStyle = 'decimal' | 'currency' | 'c0' | 'c2' | 'percent' | 'unit';

interface IRblChartConfiguration<T extends IRblChartConfigurationDataType> {
	chart: IRblChartConfigurationChart;
	
	data: Array<{ name: string, data: T }>;

	// Settings for each series or data point (when single series).
	series: Array<IRblChartConfigurationSeries>;

	xAxis: IRblChartConfigurationXAxis;

	yAxis: IRblChartConfigurationYAxis;
}

interface IRblChartConfigurationXAxis {
	label: string | undefined; // If present, render label
	minCategory: number;
	maxCategory: number;
	plotBands: Array<IRblChartPlotBand>;
	plotLines: Array<IRblChartPlotLine>;
}

interface IRblChartConfigurationYAxis {
	label: string | undefined; // If present, render label
	tickCount: number; // Default: 5, Number of major axis ticks to show on yAxis.
}

interface IRblChartConfigurationSharkfin {
	line: { color: string; }
	fill: { color: string; }
	retirementAge: number;
}

interface IRblChartPlotBand {
	label?: {
		text: string;
		textXs?: string;
	}

	color: string;
	from: number;
	to: number;
}

interface IRblChartPlotLine {
	label?: {
		text: string;
		textXs?: string;
	}

	color: string;
	value: number;
}

interface IRblChartConfigurationChart {
	name: string;
	type: IRblChartConfigurationType;

	aspectRadio: { current: "value" | "xs", value: number, xs?: number };
	height: number;
	width: number;
	plotWidth: number;
	
	column: IRblChartConfigurationChartColumn; // Only for column and columnStacked charts.

	padding: IRblChartConfigurationPadding;
	
	dataLabels: IRblChartConfigurationDataLabels;
	legend: boolean;
	tip: IRblChartConfigurationTip;
}

interface IRblChartConfigurationPadding { top: number; right: number; bottom: number; left: number; _parent: IRblChartConfigurationChart }

interface IRblChartConfigurationTip {
	show: IRblChartConfigurationTipShowOption; // Default: true, Show tips on each xAxis entry or data point (when no xAxis).
	format: IRblChartFormatStyle; // Default: c0
	highlightSeries: boolean; // Default: true, when show is "series", otherwise false.
	includeShape: boolean; // Default: true, Include shape in the tip.
	headerFormat: string | undefined; // Default: xAxis/category name
	padding: { top: number; left: number; }
}

interface IRblChartConfigurationDataLabels {
	show: boolean; // Default: true, Show data label on each category or data point.
	format: IRblChartFormatStyle; // Default: c0
}

interface IRblChartConfigurationChartColumn {
	maxValue: number; // Maximum value for the column chart.
	maxLabelLines: number;
	count: number;
	width: number; // Width of each column.
	spacing: number; // Spacing between columns.
	_parent: IRblChartConfigurationChart;
}

interface IRblChartConfigurationSeries {
	text: string;
	color: string;
	shape: IRblChartConfigurationShape; // Default: "square"
	type: IRblChartSeriesType;
	legend: boolean; // Default series.type != "tooltip"
}

interface IRblChartOptionRow<T = string> {
    id: string;
    value: T;
}

interface IRblChartDataRow<T = string> extends IRblChartOptionRow<T> {
    value: T;
    [key: `data${number}`]: T | undefined; // Allows properties like data1, data2, etc., with type T
}

type IRblChartColumnName = "value" | `data${number}`;
