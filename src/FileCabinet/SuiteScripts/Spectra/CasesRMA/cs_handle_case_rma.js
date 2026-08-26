/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/currentRecord", 'N/url'], (currentRecord, url) => {
  const FORM_ID = 130;

  const pageInit = () => {
    const rec = currentRecord.get();
    const formId = Number(rec.getValue({ fieldId: "customform" }));

    if (formId === FORM_ID) {
      rec.setValue({
        fieldId: "custevent_incident_type_type",
        value: 5,
        ignoreFieldChange: true,
      });
      // showHiddeRMACreation();
    }
  };

  const postSourcing = (context) => {
    const rec = context.currentRecord;

    const formId = Number(rec.getValue({ fieldId: "customform" }));
    if (formId !== FORM_ID) return;

    if (context.fieldId === "company") {
      rec.setValue({
        fieldId: "custevent_incident_type_type",
        value: 5,
        ignoreFieldChange: true,
      });

      rec.setValue({
        fieldId: "profile",
        value: 2,
        ignoreFieldChange: true,
      });
    }
  };

  function createRMA() {
    try {
      const rec = currentRecord.get();
      const caseId = rec.id;

      const suiteletURL = url.resolveScript({
        scriptId: 'customscript_create_rma_from_case',
        deploymentId: 'customdeploy1',
        params: {
          recType: 'rma',
          caseId: caseId
        }
      });

      window.open(suiteletURL, '_blank');
    } catch (error) {
      log.error('createRMA error', error)
    }
  }
  function createSO() {
    try {
      const rec = currentRecord.get();
      const caseId = rec.id;

      const suiteletURL = url.resolveScript({
        scriptId: 'customscript_create_rma_from_case',
        deploymentId: 'customdeploy1',
        params: {
          recType: 'salesorder',
          caseId: caseId
        }
      });

      window.open(suiteletURL, '_blank');
    } catch (error) {
      log.error('createSO error', error)
    }
  }

  function loadSOLines(soId) {
    try {
      const suiteletURL = url.resolveScript({
        scriptId: 'customscript_suitelet_case_items_sublist',
        deploymentId: 'customdeploy1',
        params: {
          soId: soId
        }
      });

      window.open(suiteletURL, '_blank', 'width=900,height=600');
    } catch (e) {
      log.error('loadSOLines error', e);
    }
  };
  function fieldChanged(context) {
    try {
      const field = context.fieldId;
      if (field === 'custevent_case_rel_so') {
        const rec = currentRecord.get();
        const soId = rec.getValue('custevent_case_rel_so');

        if (!soId) return;

        loadSOLines(soId);
      }
    } catch (e) {
      log.error('fieldChanged error', e);
    }
  };

  function onConfirm() {
    try {
      const currSuiteletRec = currentRecord.get();
      
    } catch (e) {
      log.error('onConfirm', e);
    }
  }
  return {
    pageInit,
    postSourcing,
    createRMA,
    createSO,
    fieldChanged,
    onConfirm
  };
});
