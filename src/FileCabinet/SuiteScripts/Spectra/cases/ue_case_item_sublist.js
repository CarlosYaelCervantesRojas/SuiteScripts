/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/log', 'N/search', 'N/record', 'N/error'], (ui, log, search, record, error) => {

    const beforeLoad = (context) => {
        try {
            const { form, newRecord, type } = context;
         
            const caseItemsJSON = newRecord.getValue('custevent_case_items_lines_json');
            const relatedRMA = newRecord.getValue('custevent_rma_related');
            const replacementSO = newRecord.getValue('custevent_original_so_ecommerce');
            const profileId = newRecord.getValue('profile');
            log.debug("profile id:", profileId);
            if (caseItemsJSON === '' || profileId == 1) {
                log.debug('beforeLoad', `Form not allowed, skipping script.`);
                return;
            }
            log.debug('beforeLoad triggered', `Execution type: ${type}`);

            const customJson = newRecord.getValue({ fieldId: 'custevent_case_items_lines_json' });

            createCustomSubtabAndSublist(form, type);

            if (type === 'view') {
                addButton(form, relatedRMA, replacementSO);
                if (customJson) {
                    populateSublistFromJSON(form, customJson);
                }
            }
            if (type === 'create' || type === 'edit' || type === 'copy') {
                if (customJson) {
                    populateSublistFromJSON(form, customJson);
                }
            }

        } catch (e) {
            log.error('Error in beforeLoad', e);
        }
    };
    const addButton = (form, relatedRMA, replacementSO) => {
        try {

            if (replacementSO) return;

            const buttonValues = 
                relatedRMA ? 
                    {id: 'custpage_create_so', label: 'Create Sales Order', functionName: 'createSO'} :
                        {id: 'custpage_create_rma', label: 'Create RMA', functionName: 'createRMA'};

            form.addButton({
                id: buttonValues.id,
                label: buttonValues.label,
                functionName: buttonValues.functionName
            });

            form.clientScriptModulePath = './cs_handle_case_rma.js';
        } catch (e) {
            log.error('addButton error', e);
        }
    };
    const populateSublistFromJSON = (form, jsonString) => {
        try {
            const data = JSON.parse(jsonString);

            const sublist = form.getSublist({ id: 'custpage_case_item_lines' });
            data.forEach((item, index) => {
                sublist.setSublistValue({ id: 'custpage_item', line: index, value: item.internalId });
                sublist.setSublistValue({ id: 'custpage_item_qty', line: index, value: item.returnQty });
            });


            log.debug('populateSublistFromJSON', `Processed ${data.length} lines from JSON`);
        } catch (e) {
            log.error('Error populating sublist from JSON', e);
        }
    };
    const createCustomSubtabAndSublist = (form, type) => {
        try {
            const listType = ui.SublistType.LIST
            const sublist = form.addSublist({
                id: 'custpage_case_item_lines',
                type: listType,
                label: 'Items',
                tab: 'custom276' /////////// SB
            });

            const view = type === 'view' ? true : false;

            addSublistField(sublist, 'custpage_item', ui.FieldType.SELECT, 'Item', false, false, 'item');
            addSublistField(sublist, 'custpage_item_qty', ui.FieldType.INTEGER, 'Quantity to Return');

            log.debug('createCustomSubtabAndSublist', 'Sublist with columns created successfully');
        } catch (e) {
            log.error('Error creating subtab/sublist', e);
        }
    };
    const addSublistField = (sublist, id, type, label, disabled = false, hidden = false, source = '') => {
        try {
            const fieldCreated = sublist.addField({ id, type, label, source });

            if (disabled) fieldCreated.updateDisplayType({ displayType: ui.FieldDisplayType.DISABLED });
            if (hidden) fieldCreated.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
        } catch (e) {
            log.error(`Error adding field ${id}`, e);
        }
    };

    const afterSubmit = (context) => {
        try {
            // if (context.type !== context.UserEventType.CREATE) return;
            log.debug('afterSubmit Starting')
            const casePrev = context.newRecord
            const form = casePrev.getValue({ fieldId: 'customform' });
            const caseId = casePrev.id;
            if (form != 130) return log.audit('No RMA Case', 'Case id: ' + caseId);

            const caseRec = loadCaseRecord(caseId);
            const caseNumber = caseRec.getValue({ fieldId: 'casenumber' });
            if (!caseNumber) return log.audit('No Case Number Fetched', 'Case Id: ' + caseId);
            const newCaseNumber = caseNumber.replace('CASE', 'TICKET');
            log.debug('newCaseNumber', newCaseNumber)
            setNewCaseNumber(caseRec, newCaseNumber);

        } catch (e) {
            log.error('afterSubmit error', e);
        }
    };
    const loadCaseRecord = (caseId) => {
        try {
            const caseRec = record.load({
                type: 'supportcase',
                id: caseId,
                isDynamic: false,
            });

            return caseRec;
        } catch (e) {
            log.error('loadCaseRecord error', e);
        }
    };
    const setNewCaseNumber = (caseRec, newCaseNumber) => {
        try {
            caseRec.setValue({ fieldId: 'casenumber', value: newCaseNumber });
            caseRec.save();
        } catch (e) {
            log.error('setNewCaseNumber error', e);
        }
    };

    return {
        beforeLoad,
        afterSubmit
    };
});