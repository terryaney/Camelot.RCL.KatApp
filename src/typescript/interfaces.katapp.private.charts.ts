type IRblChartConfigurationDataType = number | Array<number>;
type IRblChartConfigurationTipShowOption = "off" | "category" | "series";
type IRblChartConfigurationType = "column" | "columnStacked" | "donut";
type IRblChartConfigurationShape = "square" | "circle" | "line";
type IRblChartSeriesType = "tooltip" | "line" | "column" | undefined;

interface IRblChartConfiguration<T extends IRblChartConfigurationDataType> {
	chart: IRblChartConfigurationChart;
	
	data: Array<{ name: string, data: T }>;

	// Settings for each series or data point (when single series).
	series: Array<IRblChartConfigurationSeries>;

	xAxis: {
		label: string | undefined; // If present, render label
	}

	yAxis: {
		label: string | undefined; // If present, render label
		tickCount: number; // Default: 5, Number of major axis ticks to show on yAxis.
	}
}

interface IRblChartConfigurationChart {
	name: string;
	type: IRblChartConfigurationType;

	height: number;
	width: number;
	
	column?: IRblChartConfigurationChartColumn; // Only for column and columnStacked charts.

	padding: { top: number; right: number; bottom: number; left: number; }
	
	dataLabel: {
		show: boolean; // Default: true, Show data label on each category or data point.
	}

	legend: {
		show: boolean; // Default: false
	}

	tip: {
		show: IRblChartConfigurationTipShowOption; // Default: true, Show tips on each xAxis entry or data point (when no xAxis).
		highlightSeries: boolean; // Default: true, when show is "series", otherwise false.
		includeShape: boolean; // Default: true, Include shape in the tip.
		headerFormat: string | undefined; // Default: xAxis/category name
		padding: { top: number; left: number; }
	}
}

interface IRblChartConfigurationChartColumn {
	maxValue: number; // Maximum value for the column chart.
	width: number; // Width of each column.
	spacing: number; // Spacing between columns.
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
