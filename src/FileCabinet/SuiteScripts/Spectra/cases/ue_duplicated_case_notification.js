/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/ui/message', 'N/search', 'N/url'], (serverWidget, message, search, url) => {

    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} context.form - Current form
     * @param {ServletRequest} context.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = (context) => {
        try {
            if (context.type !== context.UserEventType.VIEW && context.type !== context.UserEventType.EDIT) return;
            const rec = context.newRecord;
            const { customerId, customerName, caseNumber, productId, serialNumber, dateCreated } = getCaseData(rec);
            if (!serialNumber) return log.audit(caseNumber, 'No serial number');

            const duplicateCases = searchDuplicateCases(customerId, productId, serialNumber, caseNumber);
            if (duplicateCases.length <= 0) return log.audit('No duplicates for ' + caseNumber);

            const message = createMessage(duplicateCases);
            const form = context.form;
            showDuplicatesNotification(form, message)
        } catch (e) {
            log.error('beforeLoad error', e);
        }
    };

    const getCaseData = (rec) => {
        try {
            const customerId = rec.getValue({ fieldId: 'company' });
            const customerName = rec.getText({ fieldId: 'company' });
            const caseNumber = rec.getValue({ fieldId: 'casenumber' });
            const productId = rec.getValue({ fieldId: 'custevent_lot_numbered_new' });
            const serialNumber = rec.getValue({ fieldId: 'custevent_case_pump_serialno' });
            const dateCreated = rec.getValue({ fieldId: 'datecreated' });

            // log.debug('customerId', customerId);
            // log.debug('customerName', customerName);
    
            return {
                customerId,
                customerName,
                caseNumber,
                productId,
                serialNumber,
                dateCreated
            }
        } catch (e) {
            log.error('getCaseData error', e);
        }
    };

    const searchDuplicateCases = (customerId, productId, serialNumber, currCaseNumber) => {
        try {
            const supportcaseSearchObj = search.create({
                type: "supportcase",
                filters:
                    [
                        // ["company.internalid", "anyof", customerId],
                        // "OR",
                        ["custevent_lot_numbered_new", "contains", productId],
                        "AND",
                        ["custevent_case_pump_serialno", "contains", serialNumber],
                        "AND",
                        ["casenumber", "isnot", currCaseNumber]
                    ],
                columns:
                    [
                        search.createColumn({ name: "casenumber", label: "Number" }),
                        // search.createColumn({ name: "title", label: "Subject" }),
                        // search.createColumn({ name: "company", label: "Company" }),
                        // search.createColumn({ name: "createddate", label: "Date Created" }),
                    ]
            });

            const results = supportcaseSearchObj.run().getRange({ start: 0, end: 100 });
            const cases = results.map(r => {
                return {
                    caseId: r.id,
                    caseNumber: r.getValue('casenumber'),
                    // company: r.getText('company')
                }
            });

            return cases;
        } catch (e) {
            log.error('searchDuplicateCases error', e);
            return [];
        }
    };

    const createMessage = (duplicateCases) => {
        try {
            let message = 'This Case may have duplicates: <br>';
            message += duplicateCases.map(c => '<a target="_blank" href="' + getCaseRelativeURL(c.caseId) + '">' + c.caseNumber + '</a><br>').join(' ');
            // log.debug('message', message)
            return message;
        } catch (e) {
            log.error('createMessage error', e);
        }
    }
    const getCaseRelativeURL = (caseId) => {
        try {
            const caseURL = url.resolveRecord({
                recordType: 'supportcase',
                recordId: caseId,
                isEditMode: false
            });
            return caseURL;
        } catch (e) {
            log.error('getCaseRelativeURL error', e);
        }
    }

    const showDuplicatesNotification = (form, createdMessage) => {
        try {
            form.addPageInitMessage({
                type: message.Type.WARNING,
                title: 'Warning',
                message: createdMessage
            });
        } catch (e) {
            log.error('showDuplicatesNotification error', e);
        }
    }

    return { beforeLoad }

});
