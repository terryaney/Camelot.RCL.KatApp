type IRblChartConfigurationDataType = number | Array<number>;
type IRblChartConfigurationType = "column" | "columnStacked" | "donut" | "sharkfin";
type IRblChartConfigurationShape = "square" | "circle" | "line";
type IRblChartSeriesType = "tooltip" | "line" | "column" | undefined;
type IRblChartColumnName = "value" | `data${number}`;
type IRblPlotColumnName = "text" | "textXs";

interface KaChartElement extends Element {
	kaDomUpdated?: boolean;
}

interface KaHoverOptionsElement extends HTMLElement {
	kaHoverOptions: IRblChartConfigurationHoverOptions
}

interface IRblChartConfigurationHoverOptions {
	columnCount: number;
	columnWidth: number;
	plotLeft: number;
	plotRight: number;
	plotBottom: number;
	plotTop: number;
}
interface IRblChartConfiguration<T extends IRblChartConfigurationDataType> {
	name: string;
	type: IRblChartConfigurationType;

	dataColumns: Array<IRblChartColumnName>;
	
	data: Array<{ name: string, data: T }>;

	css: {
		chart: string;
		chartType: string;
		legend: string;
		legendType: string;
	}

	plotOptions: IRblChartConfigurationPlotOptions;

	// Settings for each series or data point (when single series).
	series: Array<IRblChartConfigurationSeries>;
}

interface IRblChartConfigurationPlotOptions {
	font: {
		size: {
			heuristic: number;
			fontMultiplier: number;
			base: number;
			default: number;
			yAxisLabel: number;
			yAxisTickLabels: number;
			xAxisLabel: number;
			xAxisTickLabels: number;
			plotBandLabel: number;
			plotBandLine: number;
			dataLabel: number;
			donutLabel: number;
			tipHeader: number;
			tipBody: number;
		}
	}

	aspectRadio: { current: "value" | "xs", value: number, xs?: number };
	height: number;
	width: number;

	plotHeight: number;
	plotWidth: number;

	column: IRblChartConfigurationChartColumn; // Only for column and columnStacked charts.

	padding: IRblChartConfigurationPadding;
	
	legend: {
		show: boolean; // Default: true, Show legend.
	}

	highlight: {
		series: {
			hoverItem: boolean; // Default: true when type is donut or column
			hoverLegend: boolean; // Default: true
		}
		legend: {
			hoverItem: boolean; // Default: true
			hoverSeries: boolean; // Default: true
		}
	}

	pie: {
		startAngle: number; // Default: 0, Start angle for the pie chart.
		endAngle: number; // Default: 360, End angle for the pie chart.
	}
	donut: {
		labelFormatter: string | undefined; // Default: formatNumber(total, dataLabels.format)
	}

	dataLabels: IRblChartConfigurationDataLabels;
	tip: IRblChartConfigurationTip;
	
	xAxis: IRblChartConfigurationXAxis;
	yAxis: IRblChartConfigurationYAxis;
}

interface IRblChartConfigurationXAxis {
	label: string | undefined; // If present, render label
	format: string; // Default: c0
	minCategory: number;
	maxCategory: number;
	plotBandSegmentWidth: number;
	plotBands: Array<IRblChartPlotBand>;
	plotLines: Array<IRblChartPlotLine>;
	skipInterval: number;
	_parent: IRblChartConfigurationPlotOptions;
}

interface IRblChartConfigurationYAxis {
	label: string | undefined; // If present, render label
	format: string; // Default: c0
	tickCount: number; // Default: 5, Number of major axis ticks to show on yAxis.
	intervalSize: number;
	maxValue: number;
	baseY: number;
	getY: (index: number) => number; // Function to get the Y position of a column based on its index.
	_parent: IRblChartConfigurationPlotOptions;
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

interface IRblChartConfigurationPadding {
	top: number;
	right: number;
	bottom: number;
	left: number;
	_parent: IRblChartConfigurationPlotOptions
}

interface IRblChartConfigurationTip {
	show: boolean; // Default: true, Show tips on each xAxis entry or data point (when no xAxis).
	includeShape: boolean; // Default: true, Include shape in the tip.
	includeTotal: boolean; // Default: true if show == "category"
	headerFormatter: string | undefined; // Default: xAxis/category name
	padding: { top: number; left: number; }
}

interface IRblChartConfigurationDataLabels {
	show: boolean; // Default: true, Show data label on each category or data point.
	format: string; // Default: c0
}

interface IRblChartConfigurationChartColumn {
	maxValue: number; // Maximum value for the column chart.
	count: number;
	width: number; // Width of each column.
	spacing: number; // Spacing between columns.
	maxLabelWidth: number;
	getX: (index: number) => number; // Function to get the x position of a column based on its index.
	_parent: IRblChartConfigurationPlotOptions;
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

interface IRblChartPoint {
	x: number;
	y: number;
	seriesConfig: IRblChartConfigurationSeries;
	value: number;
	name: string;
}