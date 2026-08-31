/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/search', 'N/url', 'N/runtime'], function (search, url, runtime) {

    function setAddress(rec) {
        rec.setValue({
            fieldId: 'shipaddress',
            value: 'Spectra Baby USA\n3430 Davie Rd Ste. #306\nDavie\nFL 33314\nUnited States'
        });
    }
    function populateFieldsOnTransform(rec) {
        try {
            const pastURL = document.referrer.indexOf('/app/accounting/transactions/rtnauth.nl') !== -1;
            if (!pastURL) return;
            console.log('starting copying')
            const rawData = sessionStorage.getItem('ns_transform_data');
            const payload = JSON.parse(rawData);
            const fields = payload.fields;
            for (let fieldId in fields) {
                if (fields[fieldId]) {
                    rec.setValue({
                        fieldId: fieldId,
                        value: fields[fieldId],
                        ignoreFieldChange: true
                    });
                }
            }
            sessionStorage.removeItem('ns_transform_data');
        } catch (e) {
            log.error('populateFieldsOnTransform error', e);
        }
    }
    function populateSONumber(rec) {
        try {
            const SONumber = rec.getText({ fieldId: 'createdfrom' });
            console.log(SONumber)
            const SONumberToSet = SONumber.split('#')[1];
            console.log(SONumberToSet)
            rec.setValue({ fieldId: 'custbody_ir_inv_number', value: SONumberToSet });
        } catch (e) {
            log.error('populateSONumber error', e);
        }
    }

    function pageInit(context) {
        try {
            const rec = context.currentRecord;
            setAddress(rec);
            populateFieldsOnTransform(rec);
            populateSONumber(rec);
        } catch (e) {
            log.error('pageInit error', e);
        }
    }

    function fieldChanged(context) {
        const rec = context.currentRecord;
        if (context.fieldId === 'entity') {
            setAddress(rec);
        }
        if (context.fieldId === 'custbody_ir_inv_number') {
            const soNumber = rec.getValue({ fieldId: 'custbody_ir_inv_number' });
            if (!soNumber) return;

            const customerId = rec.getValue({ fieldId: 'entity' });
            if (!customerId) return;

            const soId = searchSO(customerId, soNumber);
            if (!soId) {
                noSOFoundError(soNumber, rec);
                return;
            }

            const createdFrom = rec.getValue({ fieldId: 'createdfrom' });
            if (createdFrom) return;

            handleSONumber(soId, rec);
        }
    }

    function noSOFoundError(soNumber, rec) {
        try {
            alert('No Sales Order was found for the provided value: ' + soNumber + '. Please provide a valid PO# or Sales Order/Invoice number.');
            rec.setValue({ fieldId: 'custbody_ir_inv_number', value: '' });
        } catch (e) {
            log.error('noSOFoundError error', e);
        }
    }
    function handleSONumber(soId, rec) {
        try {

            storefilledValues(rec);

            const host = url.resolveDomain({
                hostType: url.HostType.APPLICATION,
                accountId: runtime.accountId
            });

            const finalUrl = `https://${host}/app/accounting/transactions/rtnauth.nl?memdoc=0&e=T&transform=salesord&id=${soId}&whence=`;

            window.isChanged = false;
            window.onbeforeunload = null;

            window.location.href = finalUrl;
        } catch (e) {
            console.log('handleSONumber error', e);
        }
    }
    function storefilledValues(rec) {
        try {
            const payload = {
                fields: {
                    custbody_shipment_dicrepancy: rec.getValue({ fieldId: 'custbody_shipment_dicrepancy' }),
                    memo: rec.getValue({ fieldId: 'memo' }),
                    custbody_sps_ic_contactphone: rec.getValue({ fieldId: 'custbody_sps_ic_contactphone' }),
                    custbody_sps_ic_contactfax: rec.getValue({ fieldId: 'custbody_sps_ic_contactfax' }),
                    custbody_sps_ic_contactemail: rec.getValue({ fieldId: 'custbody_sps_ic_contactemail' }),
                    custbody_ir_inv_number: rec.getValue({ fieldId: 'custbody_ir_inv_number' }),
                }
            }

            sessionStorage.setItem('ns_transform_data', JSON.stringify(payload));
        } catch (e) {
            log.error('storefilledValues error', e);
        }
    }
    function searchSO(customerId, string) {
        try {
            const salesOrderSearch = search.create({
                type: 'transaction',
                filters: [
                    ["type", "anyof", "SalesOrd", "CustInvc"],
                    "AND",
                    ["entity", "anyof", customerId],
                    "AND",
                    ['mainline', 'is', 'T'],
                    'AND',
                    [["otherrefnum", "equalto", string], "OR", ["numbertext", "is", string], "OR", ['tranid', 'is', string]],
                ],
                columns: ['internalid', 'createdfrom']
            });

            const searchResult = salesOrderSearch.run().getRange({ start: 0, end: 1 });

            if (searchResult.length > 0) {
                const result = searchResult[0];
                const recordType = searchResult[0].recordType;
                const recId = recordType === 'salesorder' ? searchResult[0].id : result.getValue({ name: 'createdfrom' });
                console.log(recordType + ': ' + recId);

                return recId;
            } else {
                return null;
            }
        } catch (e) {
            console.log('searchSO error', e);
        }
    };

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };
});