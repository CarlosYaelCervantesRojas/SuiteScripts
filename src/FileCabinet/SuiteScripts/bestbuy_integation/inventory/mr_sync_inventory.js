/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/https', 'N/search', '../utils.js', '../best_buy_suiteQL.js'],
    /**
 * @param{file} file
 * @param{https} https
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (file, https, search, lib, SQL) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            try {
                const allOffers = getAllBestBuyOffers();
                return allOffers;
            } catch (e) {
                log.error('getInputData error', e);
            }
        }

        const getAllBestBuyOffers = (offers = new Set(), offset = 0, totalOffers = undefined) => {
            try {
                log.debug(offers.size, offers);
                if (offers.size == totalOffers) return [...offers];

                const max = 100;
                const response = lib.callBestBuyEndPoint('OF11_All', { method: 'GET', offset, max });
                if (!totalOffers) totalOffers = response?.total_count ? response?.total_count : 0;

                const responseOffers = response?.offers;
                const formatedOffers = responseOffers.map(o => {
                    return JSON.stringify({ shop_sku: o.shop_sku, reference: o.product_references[0].reference });
                });

                formatedOffers.forEach(o => offers.add(o));

                return getAllBestBuyOffers(offers, offers.size, totalOffers);

            } catch (e) {
                log.error('getAllBestBuyOffers', e);
                return [...offers];
            }
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                const value = JSON.parse(mapContext.value);
                const { shop_sku, reference } = value;

                const data = lib.runQuery(SQL.INVENTORY_DATA_BY_ITEM_NAME_UPC_CODE, [shop_sku]);
                if (data.length == 0) return log.error(`${shop_sku} | ${reference}`, `NO DATA FOUND: ${data}`);

                const { id, itemid, custitem_qty_in_savannah } = data[0];
                // log.debug('params', `${id}, ${itemid}, ${custitem_qty_in_savannah}`);

                const itemObj = {
                    sku: itemid,
                    quantity: custitem_qty_in_savannah
                }

                mapContext.write({
                    key: itemid,
                    value: itemObj
                });
            } catch (e) {
                log.error('map error', e);
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try {
                const values = JSON.parse(reduceContext.values);
                const { sku, quantity } = values;

                // log.debug('red', `${sku}, ${quantity}`)
                reduceContext.write({
                    key: sku,
                    value: { sku: sku, quantity: quantity }
                });
            } catch (e) {
                log.error('reduce error', e);
            }
        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            try {
                const csvRows = [];
                summaryContext.output.iterator().each(function (key, value) {
                    const parsedValue = JSON.parse(value);
                    // log.debug(key, value);
                    const { sku, quantity } = parsedValue;

                    csvRows.push(`${sku},${quantity},,update`);
                    return true;
                });

                const csvFile = lib.createStockCSVFile(csvRows);
               
                const response = lib.callBestBuyEndPoint('STO01', { method: 'POST', csvFile });
                log.audit('response', response);
            } catch (e) {
                log.error('summarize error', e);
            }
        }

        return { getInputData, map, reduce, summarize }

    });