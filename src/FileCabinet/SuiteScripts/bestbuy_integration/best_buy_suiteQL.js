/**
 * @NApiVersion 2.1
 */
define([],
    
    () => {

        const BESTBUY_CONFIG = `
            SELECT 
                custrecord_base_url BASE_URL, 
                custrecord_api_key API_KEY, 
                custrecord_shop_id SHOP_ID 
            FROM 
                CUSTOMRECORD_BEST_BUY_CONFIG 
            WHERE 
                id = 1;`; // Bets Buy Configuration record Id

        const  INVENTORY_ITEM_ONLINE_PRICE = `
            SELECT 
                unitprice
            FROM 
                pricing
            WHERE 
                item = ?
            AND 
                pricelevel = ?`;

        const INVENTORY_ITEM_QTY_AVAILABLE_SAVANNAH = `
            SELECT
                custitem_qty_in_savannah
            FROM
                item
            WHERE
                id = ?`;

        const INVENTORY_DATA_BY_ITEM_NAME_UPC_CODE = `
            SELECT
                id,
                itemid,
	            custitem_qty_in_savannah
            FROM
                inventoryitem
            WHERE
                itemid = ?
        `;

        return {
            BESTBUY_CONFIG,
            INVENTORY_ITEM_ONLINE_PRICE,
            INVENTORY_ITEM_QTY_AVAILABLE_SAVANNAH,
            INVENTORY_DATA_BY_ITEM_NAME_UPC_CODE
        }

    });
