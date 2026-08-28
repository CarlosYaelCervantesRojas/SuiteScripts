/**
 * @NApiVersion 2.1
 */
define(['N/https', 'N/query', 'N/record', 'N/runtime', 'N/file', './best_buy_suiteQL.js'],
    /**
 * @param{https} https
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 */
    (https, query, record, runtime, file, SQL) => {

        const ONLINE_PRICE_LEVEL = 5;
        const STOCK_FILE_TEMPLATE = 2847514; //SB
        const API_ALLOWED_CODES = [200, 201];

        const runQuery = (sql, params = []) => {
            try {
                const resultSet = query.runSuiteQL({
                    query: sql,
                    params: params
                });

                return resultSet.asMappedResults();
            } catch (e) {
                log.error('runQuery error', e);
            }
        }


        const createEndpoint = (endpoint, params) => {
            log.debug('createEndpoint', params)
            const { base_url, api_key, shop_id } = runQuery(SQL.BESTBUY_CONFIG)[0];

            const { sku, max, offset } = params;
            try {
                const ENDPOINTS = {
                    OF11: `offers?sku=${sku}&shop_id=${shop_id}`,
                    OF11_All: `offers?shop_id=${shop_id}&max=${max}&offset=${offset}`,
                    STO01: `offers/stock/imports?shop_id=${shop_id}`
                }

                return { url: `${base_url}${ENDPOINTS[endpoint]}`, key: api_key };
            } catch (e) {
                log.error('createEndpoint error', e);
            }
        }
        const callBestBuyEndPoint = (endpoint, params) => {
            try {
                log.debug('callBestBuyEndPoint', params);
                const { method, csvFile } = params;
                const { url, key } = createEndpoint(endpoint, params);
                log.debug('calling url', url);

                const boundary = '----NetSuiteBoundary' + new Date().getTime();
                const headers = {
                    'Authorization': key,
                    'Accept': 'application/json',
                    // 'Content-Type': `multipart/form-data; boundary=${boundary}`
                }

                let response;
                if (method == 'POST') {
                    headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
                    const body =
                        `--${boundary}\r\n` +
                        `Content-Disposition: form-data; name="file"; filename="stock_import.csv"\r\n` +
                        `Content-Type: text/csv\r\n` +
                        `\r\n` +
                        `${csvFile}\r\n` +
                        `--${boundary}--`
                    ;

                    response = https.post({
                        url: url,
                        headers: headers,
                        body: body
                    });
                } else if (method == 'GET') {
                    response = https.get({
                        url: url,
                        headers: headers,
                    });
                }


                if (!API_ALLOWED_CODES.includes(response.code)) return log.audit(response.code, response.body);

                return JSON.parse(response.body);
                // log.audit('Mirakl response code', response.code);
                // log.audit('Mirakl response body', response.body);
            } catch (e) {
                log.error('sendToMirakl error', e);
            }
        }

        const createStockRow = (sku, quantity) => {
            try {
                return `${sku},${quantity},,update`
            } catch (e) {
                log.error('createStockRow error', e);
            }
        }
        const createStockCSVFile = (csvRows) => {
            try {

                const templateFile = file.load({
                    id: STOCK_FILE_TEMPLATE
                });

                const csvContent = csvRows.join('\n');
                log.debug('csvContent', csvContent);

                const headerLine = templateFile.getContents().trim();
                const newContent = headerLine + '\n' + csvContent;

                const outputFile = file.create({
                    name: 'inventory_sync_output.csv',
                    fileType: file.Type.CSV,
                    contents: newContent,
                    folder: 2807302 // SB id
                });

                const fileId = outputFile.save();
                log.audit('CSV file Id Saved', fileId);
                return newContent;
            } catch (e) {
                log.error('createStockCSVFile error', e);
            }
        }



        return {
            callBestBuyEndPoint,
            runQuery,
            ONLINE_PRICE_LEVEL,
            createStockRow,
            createStockCSVFile,
        }

    });
