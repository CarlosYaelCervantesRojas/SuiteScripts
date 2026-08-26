/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/redirect', 'N/record', 'N/search'], function (redirect, record, search) {

    function onRequest(context) {

        try {
            const caseId = context.request.parameters.caseId;
            const recType = context.request.parameters.recType;

            if (recType == 'rma') transformToRMA(context, caseId);
            if (recType == 'salesorder') transformToSO(caseId);

        } catch (e) {
            log.error('onRequest error', e);
        }
    }

    function transformToRMA(context, caseId) {
        try {
            const caseData = search.lookupFields({
                type: 'supportcase',
                id: caseId,
                columns: ['custevent_case_rel_so']
            });
            
            const soId = caseData?.custevent_case_rel_so[0]?.value;
            const { isValid, docNum, value } = isValidSO(soId);

            if (!isValid) return context.response.write(`<h2>Error: ${docNum} can not be returned.</h2><br/><p>Sales Order Status: ${value}<p/>`);

            redirect.toRecordTransform({
                fromType: record.Type.SALES_ORDER,
                fromId: soId,
                toType: record.Type.RETURN_AUTHORIZATION,
                parameters: {
                    fromcase: caseId
                }
            });
        } catch (e) {
            log.error('transformToRMA error', e);
        }
    }

    function transformToSO(caseId) {
        try {
            const { caseLines, company, caseNumber } = getCaseData(caseId);
            log.debug(caseNumber)
            const customerClass = getCustomerData(company);

            const newSO = record.create({
                type: record.Type.SALES_ORDER,
                isDynamic: false
            });

            newSO.setValue({
                fieldId: 'entity',
                value: company
            });
            newSO.setValue({
                fieldId: 'otherrefnum',
                // value: 'RMA-' + caseId
                value: caseNumber
            });
            newSO.setValue({
                fieldId: 'class',
                value: customerClass
            });
            newSO.setValue({
                fieldId: 'custbody_created_from_case',
                value: caseId
            });

            copyItemLines(newSO, caseLines);

            const newSOId = newSO.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            if (!newSOId) return log.error('Could not create SO', 'Case id: ' + caseId);

            sendfielSOtoCase(caseId, newSOId);

            redirect.toRecord({
                type: 'salesorder',
                id: newSOId,
            });

        } catch (e) {
            log.error('transformToSO error', e);
        }
    }
    function sendfielSOtoCase(caseId, newSOId) {
        try {
            var id = record.submitFields({
                type: 'supportcase',
                id: caseId,
                values: {
                    custevent_original_so_ecommerce: Number(newSOId)
                },
            });
        } catch (e) {
            log.error('sendfielSOtoCase error', e)
        }
    }
    function copyItemLines(so, caseLines) {

        const itemsJSON = JSON.parse(caseLines) || [];

        itemsJSON.forEach(line => {

            if (!line.internalId || !line.returnQty) return;

            so.insertLine({
                sublistId: 'item',
                line: 0
            });

            so.setSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: 0,
                value: line.internalId
            });

            so.setSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: 0,
                value: Number(line.returnQty)
            });

            so.setSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: 0,
                value: 0
            });

        });
    }
    function getCaseData(caseId) {

        try {
            const caseData = search.lookupFields({
                type: 'supportcase',
                id: caseId,
                columns: ['custevent_case_items_lines_json', 'company', 'casenumber']
            });
            log.debug('caseData', caseData)
            let caseLines = caseData?.custevent_case_items_lines_json;
            let company = caseData?.company[0]?.value;
            let caseNumber = caseData?.casenumber;

            return { caseLines, company, caseNumber };
        } catch (error) {
            log.error('getCaseData error', error);
        }
    }
    function getCustomerData(customerId) {

        try {
            const customerData = search.lookupFields({
                type: 'customer',
                id: customerId,
                columns: ['custentity_class_entity_record',]
            });

            let customerClass = customerData?.custentity_class_entity_record[0]?.value;

            return customerClass;
        } catch (error) {
            log.error('getCustomerData error', error);
        }
    }

    function isValidSO(soId) {
        try {
            const soData = search.lookupFields({
                type: 'salesorder',
                id: soId,
                columns: ['statusRef', 'tranid']
            });
            log.debug('data', soData)
            const value = soData?.statusRef?.[0]?.value;
            const docNum = soData?.tranid;

            const isValid = value == "pendingFulfillment" ? false : true;

            return { isValid, docNum, value }
        } catch (e) {
            log.error('isValidSO error', e);
        }
    }

    return {
        onRequest: onRequest
    };

});