sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/ResizeHandler",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Sorter",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/Token",
    "sap/ui/unified/FileUploader"
], function (Controller, ResizeHandler, Filter, FilterOperator, JSONModel, Sorter, MessageToast, Fragment, Token, FileUploader) {
    "use strict";

    function _startsWithFilter(sValue, oItem) {
        return oItem.getText().toLowerCase().indexOf(sValue.toLowerCase()) === 0;
    }

    var L3_URL = "https://le2chau.github.io/L3-template-legalopsadmin/";

    var _mColSortPaths = {
        "Category / Clause / Type": "title",
        "Category":                 "category",
        "Governing Law":            "governingLaw",
        "Language":                 "language",
        "Status":                   "status",
        "Changed On":               "changedOn"
    };

    // Maps typeVariant → ObjectStatus state + inverted flag
    var _mTypeVariantState = {
        "standard":  { state: "None", inverted: false },
        "preferred": { state: "None", inverted: false },
        "fallback":  { state: "None", inverted: false }
    };

    return Controller.extend("com.sap.ariba.l2purchaserequisition.controller.PurchaseRequisitionList", {

        onInit: function () {
            this._sCurrentView = "default";
            this._oExpandedClauses = {};
            this._oColState = {};

            // Register display model early so bindings resolve
            this.getView().setModel(new JSONModel({ items: [], countLabel: "" }), "display");

            var oTable = this.byId("prTable");
            oTable.setHiddenInPopin([]);
            oTable.setSticky(["ColumnHeaders"]);
            oTable.addEventDelegate({ onclick: this._onTableHeaderClick.bind(this) }, this);
            setTimeout(this._syncAndRegisterResize.bind(this, 0), 0);
            setTimeout(this._selectNavItem.bind(this), 0);

            this.byId("governingLawFilter").setFilterFunction(_startsWithFilter);

            this.getView().setModel(
                new JSONModel({
                    columnLabel: "",
                    columnWidthPx: 160,
                    "sort_Category / Clause / Type": "none",
                    "sort_Category":      "none",
                    "sort_Governing Law": "none",
                    "sort_Language":      "none",
                    "sort_Status":        "none",
                    "sort_Changed On":    "none",
                    "group_Category / Clause / Type": false,
                    "group_Category":     false
                }),
                "colSettings"
            );

            // Build display model once mock data is available
            var oMockModel = this.getOwnerComponent().getModel("mock");
            if (oMockModel.getData() && oMockModel.getData().clauses) {
                this._buildDisplayModel();
            } else {
                oMockModel.attachRequestCompleted(this._buildDisplayModel.bind(this));
            }
        },

        // ---- Display model ----

        _buildDisplayModel: function () {
            var aClauses = this.getOwnerComponent().getModel("mock").getProperty("/clauses") || [];
            var bGrouped = this._sCurrentView === "groupByCategory";
            var aItems = [];

            aClauses.forEach(function (oClause) {
                var bExpanded = !!this._oExpandedClauses[oClause.id];

                aItems.push({
                    rowType:         "clause",
                    isClause:        true,
                    isType:          false,
                    clauseId:        oClause.id,
                    title:           oClause.title,
                    subtitle:        "",
                    category:        oClause.category,
                    categoryDisplay: bGrouped ? "—" : oClause.category,
                    governingLaw:    "—",
                    language:        "—",
                    status:          oClause.status,
                    statusState:     oClause.statusState,
                    changedOn:       oClause.changedOn,
                    chevronIcon:     bExpanded ? "sap-icon://navigation-down-arrow" : "sap-icon://navigation-right-arrow",
                    navType:         "Inactive",
                    rowClass:        ""
                });

                if (bExpanded) {
                    (oClause.types || []).forEach(function (oType) {
                        var oVariant = _mTypeVariantState[oType.typeVariant] || { state: "None", inverted: false };
                        aItems.push({
                            rowType:         "type",
                            isClause:        false,
                            isType:          true,
                            clauseId:        oClause.id,
                            clauseTitle:     oClause.title,
                            title:           "",
                            subtitle:        oClause.id + "-" + oType.typeVariant.slice(0, 3).toUpperCase(),
                            category:        oClause.category,
                            categoryDisplay: oClause.category,
                            governingLaw:    oType.governingLaw,
                            language:        oType.language,
                            status:          oType.status,
                            statusState:     oType.statusState,
                            createdBy:       oType.createdBy,
                            createdOn:       oType.createdOn,
                            changedBy:       oType.changedBy,
                            changedOn:       oType.changedOn,
                            description:     oType.description,
                            clauseLanguage:  oType.clauseLanguage,
                            tags:            oType.tags || [],
                            version:         oType.version || 1,
                            typeName:        oType.typeName,
                            typeVariant:     oType.typeVariant,
                            typeState:       oVariant.state,
                            typeInverted:    oVariant.inverted,
                            chevronIcon:     "",
                    navType:         "Navigation",   // was "Inactive" — ensures nav column always present, preventing layout shift on expand
                    indentClass:     "aribaTypeRow",
                            rowClass:        "aribaTypeRowItem"
                        });
                    });
                }
            }.bind(this));

            var oDisplayModel = this.getView().getModel("display");
            oDisplayModel.setProperty("/items", aItems);
            oDisplayModel.setProperty("/countLabel", "(" + aClauses.length + ")");

            // Apply grouping sorter if needed
            if (bGrouped) {
                setTimeout(function () {
                    var oBinding = this.byId("prTable").getBinding("items");
                    if (oBinding) {
                        oBinding.sort(new Sorter("category", false, function (oContext) {
                            var sCat = oContext.getProperty("category");
                            // Count only clause-level rows for this category
                            var nCount = aItems.filter(function (o) {
                                return o.category === sCat && o.rowType === "clause";
                            }).length;
                            return { key: sCat, text: sCat + " (" + nCount + ")" };
                        }));
                    }
                }.bind(this), 0);
            } else {
                setTimeout(function () {
                    var oBinding = this.byId("prTable").getBinding("items");
                    if (oBinding) { oBinding.sort([]); }
                }.bind(this), 0);
            }
        },

        // ---- View toggle ----

        onViewToggle: function (oEvent) {
            this._sCurrentView = oEvent.getParameter("item").getKey();
            // Reset expanded state when switching views for clarity
            this._oExpandedClauses = {};
            this._buildDisplayModel();
        },

        // ---- Clause expand/collapse ----

        onClauseExpand: function (oEvent) {
            // Stop propagation so the row itemPress doesn't fire
            oEvent.cancelBubble();

            var oBtn = oEvent.getSource();
            // Walk up to the ColumnListItem to get its binding context
            var oItem = oBtn.getParent(); // HBox
            while (oItem && !oItem.isA("sap.m.ColumnListItem")) {
                oItem = oItem.getParent();
            }
            if (!oItem) { return; }

            var oCtx = oItem.getBindingContext("display");
            var sClauseId = oCtx.getProperty("clauseId");

            this._oExpandedClauses[sClauseId] = !this._oExpandedClauses[sClauseId];
            this._buildDisplayModel();
        },

        // ---- Row press ----

        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oCtx = oItem.getBindingContext("display");
            if (!oCtx) { return; }
            if (oCtx.getProperty("rowType") !== "type") { return; }

            var oAppModel = this.getOwnerComponent().getModel("app");
            oAppModel.setProperty("/selectedClauseId",    oCtx.getProperty("clauseId"));
            oAppModel.setProperty("/selectedClauseTitle", oCtx.getProperty("clauseTitle"));
            oAppModel.setProperty("/selectedTypeName",    oCtx.getProperty("typeName"));
            oAppModel.setProperty("/selectedTypeVariant", oCtx.getProperty("typeVariant"));
            oAppModel.setProperty("/selectedPageTitle",
                oCtx.getProperty("clauseTitle") + " – " + oCtx.getProperty("typeName"));
            oAppModel.setProperty("/selectedGoverningLaw", oCtx.getProperty("governingLaw"));
            oAppModel.setProperty("/selectedLanguage",     oCtx.getProperty("language"));
            oAppModel.setProperty("/selectedCreatedBy",    oCtx.getProperty("createdBy"));
            oAppModel.setProperty("/selectedCreatedOn",    oCtx.getProperty("createdOn"));
            oAppModel.setProperty("/selectedChangedBy",    oCtx.getProperty("changedBy"));
            oAppModel.setProperty("/selectedChangedOn",    oCtx.getProperty("changedOn"));
            oAppModel.setProperty("/selectedDescription",  oCtx.getProperty("description"));
            oAppModel.setProperty("/selectedClauseLanguage", oCtx.getProperty("clauseLanguage"));
            oAppModel.setProperty("/selectedTags",          oCtx.getProperty("tags") || []);
            oAppModel.setProperty("/selectedVersion",        oCtx.getProperty("version") || 1);
            oAppModel.setProperty("/layout", "TwoColumnsMidExpanded");
        },

        // ---- Filter ----

        onSearch: function () {
            this._applyFilters();
        },

        onGoverningLawTokenUpdate: function (oEvent) {
            var aRemovedTokens = oEvent.getParameter("removedTokens") || [];
            var aExcludeKeys = aRemovedTokens.map(function (t) { return t.getKey(); });
            this._applyFilters(aExcludeKeys);
        },

        _applyFilters: function (aExcludeGovLawKeys) {
            var sSearch = this.byId("searchField").getValue();
            var aStatusKeys = this.byId("statusFilter").getSelectedKeys();
            var aCategoryKeys = this.byId("categoryFilter").getSelectedKeys();
            var aGovLawTokens = this.byId("governingLawFilter").getTokens() || [];
            if (aExcludeGovLawKeys && aExcludeGovLawKeys.length) {
                aGovLawTokens = aGovLawTokens.filter(function (t) {
                    return aExcludeGovLawKeys.indexOf(t.getKey()) === -1;
                });
            }

            var aFilters = [];
            if (sSearch) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("title", FilterOperator.Contains, sSearch),
                        new Filter("id", FilterOperator.Contains, sSearch)
                    ],
                    and: false
                }));
            }
            if (aStatusKeys.length) {
                aFilters.push(new Filter({
                    filters: aStatusKeys.map(function (k) { return new Filter("status", FilterOperator.EQ, k); }),
                    and: false
                }));
            }
            if (aCategoryKeys.length) {
                aFilters.push(new Filter({
                    filters: aCategoryKeys.map(function (k) { return new Filter("category", FilterOperator.EQ, k); }),
                    and: false
                }));
            }
            if (aGovLawTokens.length) {
                aFilters.push(new Filter({
                    filters: aGovLawTokens.map(function (t) { return new Filter("governingLaw", FilterOperator.EQ, t.getKey()); }),
                    and: false
                }));
            }

            var oBinding = this.byId("prTable").getBinding("items");
            oBinding.filter(aFilters.length ? new Filter(aFilters, true) : []);
        },

        // ---- Sort / Column Settings (unchanged pattern) ----

        onColSettingsSortChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            var sLabel = this.getView().getModel("colSettings").getProperty("/columnLabel");
            if (!this._oColState[sLabel]) { this._oColState[sLabel] = {}; }
            this._oColState[sLabel].sortDir = sKey;

            var sSortPath = _mColSortPaths[sLabel];
            var oTable = this.byId("prTable");
            var oBinding = oTable.getBinding("items");

            oTable.getColumns().forEach(function (oCol) { oCol.setSortIndicator("None"); });

            if (!sSortPath || sKey === "none") {
                oBinding.sort([]);
                return;
            }

            var oMatchCol = oTable.getColumns().find(function (oCol) {
                var oHeader = oCol.getHeader();
                return oHeader && oHeader.getText && oHeader.getText() === sLabel;
            });
            if (oMatchCol) { oMatchCol.setSortIndicator(sKey === "asc" ? "Ascending" : "Descending"); }
            oBinding.sort(new Sorter(sSortPath, sKey === "desc"));
        },

        onColSettingsGroupByChange: function (oEvent) {
            var bGrouped = oEvent.getParameter("state");
            var sLabel = this.getView().getModel("colSettings").getProperty("/columnLabel");
            if (!this._oColState[sLabel]) { this._oColState[sLabel] = {}; }
            this._oColState[sLabel].groupBy = bGrouped;
            MessageToast.show("Group by " + sLabel + " — use the toolbar toggle instead");
        },

        onColSettingsWidthChange: function (oEvent) {
            var nWidth = oEvent.getParameter("value");
            var sLabel = this.getView().getModel("colSettings").getProperty("/columnLabel");
            var oTable = this.byId("prTable");
            var oMatchCol = oTable.getColumns().find(function (oCol) {
                var oHeader = oCol.getHeader();
                return oHeader && oHeader.getText && oHeader.getText() === sLabel;
            });
            if (oMatchCol) { oMatchCol.setWidth(nWidth + "px"); }
        },

        // ---- Show/Hide Details ----

        onShowHideDetails: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            var oTable = this.byId("prTable");
            if (sKey === "dtshow") {
                oTable.setHiddenInPopin([]);
            } else {
                oTable.setHiddenInPopin(["None"]);
            }
        },

        // ---- Toolbar actions ----

        onImport: function () { MessageToast.show("Import — not yet implemented"); },
        onImportFromTemplate: function () { MessageToast.show("Import from Template — not yet implemented"); },
        onCopy: function () { MessageToast.show("Copy — not yet implemented"); },
        onActivate: function () { MessageToast.show("Activate — not yet implemented"); },
        onDeactivate: function () { MessageToast.show("Deactivate — not yet implemented"); },
        onExport: function () { MessageToast.show("Export — not yet implemented"); },
        onOverflow: function () { MessageToast.show("More — not yet implemented"); },
        onBreadcrumbPress: function () { MessageToast.show("Home — not yet implemented"); },
        onAdaptFilters: function () { MessageToast.show("Adapt Filters — not yet implemented"); },
        onVariantSelect: function () {},
        onVariantSave: function () {},
        onVariantManage: function () {},
        onColumnSettings: function () { this._openColSettings(); },

        // ---- Column Settings popover ----

        _openColSettings: function (sLabel) {
            var that = this;
            var sColLabel = sLabel || "";
            this.getView().getModel("colSettings").setProperty("/columnLabel", sColLabel);

            if (!this._oColSettingsPopover) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.sap.ariba.l2purchaserequisition.view.ColumnSettingsPopover",
                    controller: this
                }).then(function (oPopover) {
                    that._oColSettingsPopover = oPopover;
                    that.getView().addDependent(oPopover);
                    oPopover.openBy(that.byId("prTable"));
                });
            } else {
                this._oColSettingsPopover.openBy(this.byId("prTable"));
            }
        },

        _onTableHeaderClick: function (oEvent) {
            var oTh = oEvent.target.closest("th.sapMListTblHeaderCell");
            if (!oTh) { return; }
            var sText = oTh.querySelector(".sapMText") && oTh.querySelector(".sapMText").textContent;
            if (sText) { this._openColSettings(sText.trim()); }
        },

        // ---- Resize helpers ----

        _syncAndRegisterResize: function (nAttempt) {
            var oTable = this.byId("prTable");
            var oTableDom = oTable && oTable.getDomRef();
            if (!oTableDom && nAttempt < 10) {
                setTimeout(this._syncAndRegisterResize.bind(this, nAttempt + 1), 50);
                return;
            }
            this._syncContextualWidth();
            var oContentEl = oTableDom && oTableDom.closest(".sapFDynamicPageContent");
            if (oContentEl && !this._sResizeHandlerId) {
                this._sResizeHandlerId = ResizeHandler.register(oContentEl, this._syncContextualWidth.bind(this));
            }
        },

        _syncContextualWidth: function () {
            var oTable = this.byId("prTable");
            var oTableDom = oTable && oTable.getDomRef();
            var oContentEl = oTableDom && oTableDom.closest(".sapFDynamicPageContent");
            if (oContentEl) {
                oTable.setContextualWidth(oContentEl.offsetWidth + "px");
            }
        },

        _selectNavItem: function () {
            var oNavList, oItem;
            sap.ui.core.Element.registry.forEach(function (el) {
                if (!oNavList && el.isA && el.isA("sap.tnt.NavigationList")) {
                    oNavList = el;
                }
                if (!oItem && el.isA && el.isA("sap.tnt.NavigationListItem") && el.getText && el.getText() === "Contracts") {
                    oItem = el;
                }
            });
            if (oNavList && oItem) {
                oNavList.setSelectedItem(oItem);
            }
        }
    });
});
