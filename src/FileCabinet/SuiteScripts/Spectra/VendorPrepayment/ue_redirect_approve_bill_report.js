/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/url'], (ui, url) => {

    const beforeLoad = (context) => {
        // log.debug('con',context.request.headers.cookie)

        // if (context.type === context.UserEventType.CREATE) addVendorPrepaymentButton(context);
        if (context.type !== context.UserEventType.VIEW) return;

        addVendorPrepaymentButton(context);

        const status = context.newRecord.getValue({ fieldId: 'status' });
        log.debug({
            title: 'status',
            details: status
        });

        if (status === 'Pending Approval' || status === 'Open') {
            const field = context.form.addField({
                id: 'custpage_redirect',
                type: 'inlinehtml',
                label: 'redirect'
            });

            const cookie = context.request.headers.cookie;
            if (cookie.includes('workflowbutton%3D')) {

                field.defaultValue = `
            <script>
                setTimeout(function() {
                // const lastUrl = window.sessionStorage.getItem('url');
                // console.log(lastUrl)

                // if (lastUrl && lastUrl.includes('workflowbutton=')) 
                window.location.replace('/app/accounting/transactions/vendorbillmanager.nl?type=apprv');

                }, 300);
            </script>`;
            }

        }
    };

    const addVendorPrepaymentButton = (context) => {
        try {
            const form = context.form;
            const currentRecordId = context.newRecord.id;

            const newPrepaymentUrl = url.resolveRecord({
                recordType: 'vendorprepayment',
                isEditMode: true,
                params: {
                    billId: currentRecordId
                }
            });

            form.addButton({
                id: 'custpage_create_prepayment',
                label: 'Create Vendor Prepayment',
                functionName: `window.open('${newPrepaymentUrl}', '_self')`
            });
        } catch (e) {
            log.error('addVendorPrepaymentButton error', e);
        }
    }

    return { beforeLoad };

});