sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.sap.ariba.l2purchaserequisition.controller.ClauseDetail", {

        onClose: function () {
            this.getOwnerComponent().getModel("app").setProperty("/layout", "OneColumn");
        },

        onMore: function () {
            MessageToast.show("More options — not yet implemented");
        },

        onEdit: function () {
            MessageToast.show("Edit — not yet implemented");
        },

        onActivate: function () {
            MessageToast.show("Activate — not yet implemented");
        },

        onCopy: function () {
            MessageToast.show("Copy — not yet implemented");
        },

        onChangeTemplate: function () {
            MessageToast.show("Change Template — not yet implemented");
        },

        onChooseTemplate: function () {
            MessageToast.show("Choose a Template — not yet implemented");
        },

        onUploadAgreement: function () {
            MessageToast.show("Upload Agreement — not yet implemented");
        },

        onCreatedByPress: function () {
            MessageToast.show("Created By — not yet implemented");
        },

        onChangedByPress: function () {
            MessageToast.show("Changed By — not yet implemented");
        }
    });
});
