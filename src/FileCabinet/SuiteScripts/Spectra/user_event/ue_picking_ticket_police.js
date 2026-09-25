/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/search', 'N/error', 'N/log'],
    (runtime, search, error, log) => {

        const beforeLoad = (context) => {
            try {
                // log.debug('beforeLoad type', context.type);
                if (context.type !== context.UserEventType.PRINT) {
                    return;
                }
                
                const rec = context.newRecord;
                // const verifyTerms = verifySOTerms(rec);
                // log.debug('verifySOTerms',verifyTerms);
                // if (!verifyTerms) {
                //     return;
                // }
                
                const user = runtime.getCurrentUser();
                const allowedRole = executeOnThisRole(user);
                log.debug('executeOnThisRole', allowedRole);
                // const allowedEmployee = isAllowedEmployee(user);
                // log.debug('isAllowedEmployee',allowedEmployee);

                // if ((!allowedRole || !allowedEmployee)) {
                //     handlePickingTicket(rec);
                // } 
                if (!allowedRole) {
                    handlePickingTicket(rec);
                } 

            } catch (e) {
                log.error('beforeLoad error', e);
                if (e.name === 'PICKING_TICKET_ALREADY_PRINTED') throw e.message;
            }
        };

        const executeOnThisRole = (user) => {
            try {    
                // const rolesNoReprint = [1024, 1041, 1048, 1028, 2];
                const rolesNoReprint = [1028]; // Mother's Milk, Inc. - Warehouse Operations
                const userRole = Number(user.role);
                return !rolesNoReprint.includes(userRole);
            } catch (error) {
                log.debug('executeOnThisRole error', error);
            }
        };

        // const isAllowedEmployee = (user) => {
        //     try {
        //         const userId   = Number(user.id); 
        //         const allowedEmployees = [
        //             1490278,  // Jessica Pennington
        //             18, // Rajhae Warehouse2
        //             1075225, // luzoft
        //         ];
        //         return allowedEmployees.includes(userId);
        //     } catch (error) {
        //         log.debug('isAllowedEmployee error', error);
        //     }
        // };

        const handlePickingTicket = (rec) => {
            const id = rec.id;
            const docid = rec.getValue('tranid');
            const isPrinted = isPickingTicketPrinted(id);
            log.debug('Is Picking Ticket Printed', isPrinted);

            if (isPrinted) {
                throw error.create({
                    name: 'PICKING_TICKET_ALREADY_PRINTED',
                    message: `Cannot print the picking ticket again because it has been already printed before. SO ${docid}`,
                    notifyOff: false
                });
            }
        };

        // const verifySOTerms = (rec) => {
        //     try {
        //        const termsSO = Number(rec.getValue('terms'));
        //        const allowedTerms = [
        //         4, // Due on Receipt
        //         13, // PIA - Payment in advance
        //        ];
        //        return allowedTerms.includes(termsSO);
        //     } catch (error) {
        //         log.error('verifySOTerms error', error);
        //     }
        // };

        const isPickingTicketPrinted = (internalId) => {
            try {
                const soSearch = search.create({
                    type: search.Type.SALES_ORDER,
                    filters: [
                        ['internalid', 'is', internalId],
                        'AND',
                        ['mainline', 'is', 'T'],
                        'AND',
                        ['printedpickingticket', 'is', 'T']
                    ],
                    columns: ['internalid']
                });
    
                const result = soSearch.run().getRange({ start: 0, end: 1 });
                return result && result.length > 0;
            } catch (error) {
                log.error('isPickingTicketPrinted error', error);
                return false;
            }
        };


        const beforeSubmit = (context) => {
            try {
                if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
                    return;
                }
                
                const newRec = context.newRecord;
                
                const isSync = isShippingCostSync(newRec);
                
                if (!isSync) {
                    const newShippingCost = getShippingCostfromSpecificField(newRec, 'shippingcost');
                    log.debug('Shipping cost changed', `New shipping cost: ${newShippingCost}`);
                    newRec.setValue({
                        fieldId: 'custbody_ship_amnt_apvl_so',
                        value: newShippingCost
                    });
                }
            } catch (error) {
                log.error('beforeSubmit error', error);
            }
        };

        const getShippingCostfromSpecificField = (rec, fieldId) => {
            try {
                const shippingCost = rec.getValue(fieldId);
                return shippingCost;
            } catch (error) {
                log.error('getShippingCostfromSpecificField error', error);
                return 0;
            }
        };

        const isShippingCostSync = (newRec) => {
            try {
                const shippingCost = getShippingCostfromSpecificField(newRec, 'shippingcost');
                const mirrorShippingCost = getShippingCostfromSpecificField(newRec, 'custbody_ship_amnt_apvl_so');
                return parseFloat(mirrorShippingCost) === parseFloat(shippingCost);
            } catch (error) {
                log.error('isShippingCostSync error', error);
                return false;
            }
        };

        return {
            beforeLoad,
            beforeSubmit
        };
    });
