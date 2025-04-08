interface IKatAppCalculationResponse {
	calcEngine: string;
	diagnostics?: IRblCalculationDiagnostics;
	tabDefs: Array<IRbleTabDef>;
}
interface IKaTableColumnConfiguration {
	name: string;
	cssClass: string | undefined;
	isTextColumn: boolean;
	xsColumns: number | undefined;
	smColumns: number | undefined;
	mdColumns: number | undefined;
	lgColumns: number | undefined;
	width: number | undefined;
	widthPct: string | undefined;
}

// RBLe Result Row Types
interface IManualTabDef extends IStringIndexer<string | undefined | ITabDefTable> {
	"@calcEngineKey": string;
	"@calcEngine": string;
	"@name": string | undefined;
}
interface ITabDef extends IStringIndexer<ITabDefTable> { }
interface ITabDefTable extends Array<ITabDefRow> { }
interface ITabDefRow extends IStringIndexer<string | undefined> {
	id?: string;
}
interface ITabDefMetaRow extends IStringIndexer<string | undefined | IStringIndexer<string>> { }

interface IRblChartDataRow {
    id: string;
    value: string;
    [key: `data${number}`]: string | undefined; // Allows properties like data1, data2, etc.
}

type IRblChartColumnName = "value" | `data${number}`;

interface IRblHighChartsOptionRow extends ITabDefRow {
	key: string;
	value: string;
}
interface IRblHighChartsDataRow extends IStringIndexer<string | undefined> {
	category: string;
	plotLine?: string;
	plotBand?: string;
}
interface IHighChartsPlotConfigurationRow {
	index: number;
	plotLine: string;
	plotBand: string;
}

interface ITabDefKatAppInfo {
	calcEngineKey: string;
	name: string;
}

// Results after updated by KatApp Framework to have _ka selector info
interface IKaTabDef extends IStringIndexer<ITabDefKatAppInfo | string | ITabDefTable> {
	_ka: ITabDefKatAppInfo;
}
// Raw results as returned from RBL Framework
interface IRbleTabDef extends IStringIndexer<string | ITabDefRow | ITabDefTable> {
	"@calcEngine": string;
	"@name": string;
}

// Interfaces for responses from RBL Framework
interface IRblCalculationSuccessResponses {
	results: Array<{
		calcEngine: string;
		cacheKey?: string;
		result?: IRblCalculationSuccessResponse;
	}>;
}
// Didn't want !. checks on result every time after getting results successfully set up
interface IMergedRblCalculationSuccessResponses {
	results: Array<{
		calcEngine: string;
		result: IRblCalculationSuccessResponse;
	}>;
}

interface IRblCalculationDiagnostics {
	calcEngineVersion: string;
	timings: {
		Status: Array<{ "@Start": string; "#text": string; }>;
	};
	rbleServer: string;
	sessionID: string;
	serviceUrl: string;
	trace?: Array<string>
}
interface IRblCalculationSuccessResponse {
	diagnostics: IRblCalculationDiagnostics;

	exception: {
		message: string;
		type: string;
		traceId: string;
		requestId: string;
		stackTrace: Array<string>;
	};

	RBL: {
		Profile: {
			Data: {
				TabDef: Array<IRbleTabDef> | IRbleTabDef;
			}
		}
	}
}