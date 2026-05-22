> This file is a focused section of KatApp documentation.
> Use [KatApp.md](./KatApp.md) for the index.

# RBLe Framework

The RBLe Framework is the backbone of KatApps.  The service is able to marshall inputs and results in and out of RBLe CalcEngines.  These results drive the functionality of KatApps.

- [RBLe Tab Structure](RBLe/CalcEngines.md#rble-tab-structure) - Discusses the standard RBLe table processing rules, structure, and features available in generating results for Kaml Views.
- [Framework Inputs](RBLe/CalcEngines.md#framework-inputs) - Discusses the set of inputs that are always passed to calculations automatically (and are not part of the UI).
- [Input Table Management](#input-table-management) - Discusses how to pass 'input tables' to calculations.
- [Calculation Pipelines](RBLe/CalcEngines.md#calculation-pipelines) - Discusses how multiple CalcEngines can be 'chained' together feedings the 'results' from one CalcEngine into the 'inputs' of the next CalcEngine in the pipeline before generating the final result.

## Input Table Management

RBLe Framework has the concept of input tables that allow for tabular input data to be sent to the CalcEngine.  If input tables are expected from the CalcEngine, they can be supplied via the [`IKatApp.updateApiOptions` event](./KatApp.07.Api.md#ikatappupdateapioptions).

```javascript
// Append custom table to the CalculationInputs object instead of sending an input for each 'table cell' of data
application.on("updateApiOptions.ka", (event, submitOptions) => {
    // Create custom coverage table
    var coverageTable = {
        name: "coverage",
        rows: []
    };

    // Loop all inputs that start with iCoverageA- and process them.
    // data-inputname is in form of iCoverageA-id
    // For each input, create a row with id/covered properties
    application
		.selectElements("div[data-inputname^=iCoverageA-]")
		.forEach(element => {
        var id = element.getAttribute("data-inputname").split("-")[1];
        var v = element.classList.contains("active") ? 1 : 0;
        var row = { "id": id, covered: v };
        coverageTable.rows.push(row);
    });
	submitOptions.inputs.tables.push(coverageTable);
});
```



