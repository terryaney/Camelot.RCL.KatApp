# KatApp Framework

KatApp is a framework built on top of RBLe and petite-vue. It marshals inputs into RBLe calculations, converts calculation results into reactive state, and renders Kaml Views through Vue-style directives.

This file is the documentation index.

## Documentation Map

| Topic | Use This File |
|---|---|
| Environment setup, terminology, Vue support, required libraries, ppp bootstrap, `KatApp.createAppAsync`, `calc-engine` and template configuration | [KatApp.01.GettingStarted.md](./KatApp.01.GettingStarted.md) |
| Kaml file structure, application scoping, CSS, IDs, selection | [KatApp.02.KamlViewSpecifications.md](./KatApp.02.KamlViewSpecifications.md) |
| `IState`, `IStateRbl`, `rbl.value`, `rbl.source`, result processing | [KatApp.03.State.md](./KatApp.03.State.md) |
| `<template>`, template precedence, script or style tags, input templates | [KatApp.04.TemplateElements.md](./KatApp.04.TemplateElements.md) |
| Standard petite-vue directives such as `v-html`, `v-bind`, `v-for`, `v-on`, `v-if`, `v-show`, `v-pre` | [KatApp.05.VueDirectives.md](./KatApp.05.VueDirectives.md) |
| KatApp directives such as `v-ka-input`, `v-ka-template`, `v-ka-modal`, `v-ka-api`, `v-ka-table`, `v-ka-chart` | [KatApp.06.CustomDirectives.md](./KatApp.06.CustomDirectives.md) |
| `KatApp` APIs, `IKatApp`, lifecycle hooks, events, modal helpers, supporting interfaces | [KatApp.07.Api.md](./KatApp.07.Api.md) |
| RBLe integration and input table management | [KatApp.08.RBLeFramework.md](./KatApp.08.RBLeFramework.md) |

## Upcoming Documentation

- Document custom view models and how they are passed in, including a sample such as doc center `showDownload`.
- Revisit the original notes around running calculations with a different CalcEngine via JavaScript.
- Expand the modal section to cover the different ways modals are opened and coordinated.
- Document the automatic flows that occur during Kaml view loading and after calculations, including help tips and related framework behavior.
