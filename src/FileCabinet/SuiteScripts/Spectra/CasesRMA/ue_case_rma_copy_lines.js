/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/log', 'N/record', 'N/render', 'N/email'], function (search, log, record, render, email) {

    function beforeLoad(context) {

        try {

            if (context.type !== context.UserEventType.CREATE) return;
            if (!context.request) return;

            const caseId = context.request.parameters.fromcase;

            log.debug('caseId', caseId);

            if (!caseId) return;

            const recRMA = context.newRecord;
            const { revCode, caseLines } = getCaseData(caseId);
            log.debug('lines', caseLines)
            recRMA.setValue({ fieldId: 'custbody_created_from_case', value: caseId });
            recRMA.setValue({ fieldId: 'custbody_review_code', value: revCode });
            recRMA.setValue({ fieldId: 'orderstatus', value: 'B' });

            copyItemLines(recRMA, caseLines);

        } catch (error) {
            log.error('beforeLoad error', error);
        }
    }
    function copyItemLines(recRMA, caseLines) {

        const itemsJSON = JSON.parse(caseLines) || [];

        const itemMap = {};
        itemsJSON.forEach(line => {
            itemMap[line.internalId] = line.returnQty;
        });

        const lineCount = recRMA.getLineCount({ sublistId: 'item' });

        for (let i = lineCount - 1; i >= 0; i--) {

            const itemId = recRMA.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            const rate = recRMA.getSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: i
            });

            log.debug('line data', `${itemId} ${rate}`)
          
            if (itemMap[itemId] !== undefined) {

                recRMA.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i,
                    value: Number(itemMap[itemId])
                });
                recRMA.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i,
                    value: Number(rate) * Number(itemMap[itemId])
                });

            } else {

                recRMA.removeLine({
                    sublistId: 'item',
                    line: i
                });

            }
        }
    }
    function getCaseData(caseId) {

        try {
            const caseData = search.lookupFields({
                type: 'supportcase',
                id: caseId,
                columns: ['custevent_case_items_lines_json', 'custevent_review_code']
            });

            let revCode = caseData?.custevent_review_code[0]?.value;
            let caseLines = caseData?.custevent_case_items_lines_json;

            return { revCode, caseLines }
        } catch (error) {
            log.error('getCaseData error', error);
        }
    }

    function afterSubmit(context) {
        try {
            const rmaRec = context.newRecord;
            const caseId = rmaRec.getValue({
                fieldId: 'custbody_created_from_case'
            });

            if (!caseId) return log.audit('No Case', 'RMA not created from case');

            if (context.type === context.UserEventType.CREATE) sendFieldsToCase(rmaRec, caseId);
            log.debug(context.type)
        } catch (error) {
            log.error('afterSubmit error', error);
        }
    }

    function sendCreatedRMAEmail(rmaId, caseId, assigned, company) {
        try {
            const mergeResult = render.mergeEmail({
                templateId: 251,
                transactionId: Number(rmaId)
            });

            email.send({
                author: 'ra@spectrababyusa.com',
                recipients: company,
                subject: mergeResult.subject,
                body: mergeResult.body,
                relatedRecords: {
                    activityId: caseId,
                    transactionId: rmaId
                },
            });
        } catch (e) {
            log.error('sendCreatedRMAEmail error', e);
        }
    }
    function sendFieldsToCase(rmaRec, caseId) {
        try {
    
            const rec = record.load({
                type: record.Type.SUPPORT_CASE,
                id: caseId
            });

            const assigned = rec.getValue({
                fieldId: 'assigned',
            });
            const company = rec.getValue({
                fieldId: 'company',
            });

            
            rec.setValue({
                fieldId: 'custevent_rma_related',
                value: rmaRec.id
            });
            
            rec.setValue({
                fieldId: 'status',
                value: 2
            });
            
            rec.save();

            sendCreatedRMAEmail(rmaRec.id, caseId, assigned, company);

        } catch (e) {
            log.error('sendFieldsToCase error', e);
        }
    }

    return {
        beforeLoad,
        afterSubmit
    };

});