sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";

    return UIComponent.extend("com.sap.ariba.l2purchaserequisition.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(new JSONModel({
                layout: "OneColumn",
                selectedClauseId: null,
                selectedClauseTitle: "",
                selectedTypeName: "",
                selectedTypeVariant: "",
                selectedPageTitle: "",
                selectedGoverningLaw: "",
                selectedLanguage: "",
                selectedCreatedBy: "",
                selectedCreatedOn: "",
                selectedChangedBy: "",
                selectedChangedOn: "",
                selectedDescription: "",
                selectedClauseLanguage: ""
            }), "app");
        }
    });
});
