/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../utils.js', '../best_buy_suiteQL.js'],

    (lib, SQL) => {

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (context) => {
            try {
                if (context.type !== context.UserEventType.EDIT) return;

                const oldRecord = context.oldRecord;
                const newRecord = context.newRecord;

                const { statusChanged, isInactive } = itemStatusChanged(oldRecord, newRecord);

                if (!statusChanged) return;

                const sku = newRecord.getValue({ fieldId: 'itemid' });
                log.debug(sku);
                const responseGet = lib.callBestBuyEndPoint('OF11', { method: 'GET', sku });
                const bestBuyOfferName = responseGet?.offers[0]?.shop_sku;
                log.debug('responseGet', responseGet);
                if (!bestBuyOfferName) return log.audit(`Item: ${sku} does not exist in Best Buy`);

                log.debug('shop_sku API Response', responseGet.offers[0].shop_sku);


                const csvRows = [];

                let quantity = 0;
                if (!isInactive) {
                    const itemId = newRecord.id;
                    const qtyAvailableQL = lib.runQuery(SQL.INVENTORY_ITEM_QTY_AVAILABLE_SAVANNAH, [itemId]);
                    quantity = parseFloat(qtyAvailableQL[0]?.custitem_qty_in_savannah);
                }
                log.debug('qtyAvailable', quantity);

                csvRows.push(lib.createStockRow(sku, quantity));

                const csvFile = lib.createStockCSVFile(csvRows);
                const responsePost = lib.callBestBuyEndPoint('STO01', { method: 'POST', csvFile });

                log.audit(`API Response Item: ${sku}, IsInactive:${isInactive}`, responsePost)

                // const onlinePriceQL = lib.runQuery(SQL.INVENTORY_ITEM_ONLINE_PRICE, [itemId, lib.ONLINE_PRICE_LEVEL]);
                // const onlinePrice = parseFloat(onlinePriceQL[0]?.unitprice);
                // log.debug('onlinePrice', onlinePrice);
                // if (!onlinePrice) return log.error(`No Online price found for ${sku}`);



            } catch (e) {
                log.error('afterSubmit error', e);
            }
        }

        const itemStatusChanged = (oldRecord, newRecord) => {
            try {
                const oldStatus = oldRecord.getValue({ fieldId: 'isinactive' });
                const newStatus = newRecord.getValue({ fieldId: 'isinactive' });

                const statusChanged = oldStatus !== newStatus ? true : false;
                return {
                    statusChanged: statusChanged,
                    isInactive: newStatus
                };

            } catch (e) {
                log.error('itemStatusChanged error', e);
            }
        }

        return {
            afterSubmit
        }

    });
