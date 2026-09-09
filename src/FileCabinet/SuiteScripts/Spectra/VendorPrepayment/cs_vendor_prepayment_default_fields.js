/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/record'], (record) => {

    function pageInit(context) {
        try {
            if (context.mode !== 'create') return;

            const urlParams = new URLSearchParams(window.location.search);
            const billId = urlParams.get('billId');

            if (!billId) return;

            const billRecord = record.load({
                type: record.Type.VENDOR_BILL,
                id: billId,
                isDynamic: false
            });

            const rec = context.currentRecord;

            const fieldMap = [
                'entity',
                'subsidiary',
                'currency',
                'location',
                'department',
                'class',
                'exchangerate',
                'custbody_bdc_payment_method',
                'custbody_bill_payment_type'
            ];

            fieldMap.forEach((fieldId) => {
                const value = billRecord.getValue({ fieldId });
                if (value !== '' && value !== null) {
                    try {
                        rec.setValue({ fieldId, value });
                    } catch (fieldErr) {
                        log.debug(`Could not set ${fieldId}`, fieldErr.message);
                    }
                }
            });

            const billTranId = billRecord.getValue({ fieldId: 'tranid' });
            const billMemo = billRecord.getValue({ fieldId: 'memo' });
            const newMemo = `Prepayment ref Vendor Bill #${billTranId}${billMemo ? ' - ' + billMemo : ''}`;
            rec.setValue({ fieldId: 'memo', value: newMemo });

            setTimeout(() => {
                const billTotal = billRecord.getValue({ fieldId: 'usertotal' });
                rec.setValue({ fieldId: 'payment', value: billTotal });
            }, 1000);
        } catch (e) {
            console.error('pageInit error', e);
        }
    }

    return { pageInit };
});