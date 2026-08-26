/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/query', 'N/ui/dialog', 'N/url'],
    /**
     * @param{query} query
     * @param{dialog} dialog
     */
    function (query, dialog, url) {

        const WARRANTY_CASE_FORM_ID = '93';
        let skipValidation = false;

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(context) {
            try {
                if (skipValidation) {
                    skipValidation = false;
                    return true;
                }

                log.debug(context)
                const caseRec = context.currentRecord;
                if (!caseRec.isNew) return true;

                const formId = caseRec.getValue({ fieldId: 'customform' });
                if (formId != WARRANTY_CASE_FORM_ID) return true;

                const { email, diagnosis, serialNumber } = getCaseData(caseRec);

                const results = runQuery(QUERY, [email, diagnosis, `%${serialNumber}`]);
                if (results.length <= 0) return true;

                showConfirmation(results);

                return false;
            } catch (e) {
                log.error('saveRecord error', e);
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
        const createMessage = (duplicateCases) => {
            try {
                let message = 'This Case may have duplicates: <br>';
                message += duplicateCases.map(c => '<a target="_blank" href="' + getCaseRelativeURL(c.id) + '">' + c.casenumber + '</a><br>').join(' ');
                // log.debug('message', message)
                return message;
            } catch (e) {
                log.error('createMessage error', e);
            }
        }
        const showConfirmation = (results) => {
            try {
                dialog.confirm({
                    title: 'Possible Duplicate Case',
                    message: `${createMessage(results)}<br>Do you want to continue saving?`
                }).then(function (result) {
                    if (result) {
                        skipValidation = true;
                        window.getNLMultiButtonByName('multibutton_submitter').onMainButtonClick(this);
                    }
                }).catch(function (reason) {
                    log.error('dialog.confirm error', reason);
                });
            } catch (e) {
                log.error('showConfirmation error', e);
            }
        }

        const getCaseData = (rec) => {
            try {
                const email = rec.getText({ fieldId: 'email' });
                const diagnosis = rec.getValue({ fieldId: 'custevent_case_diagnostics' });
                const serialNumber = rec.getValue({ fieldId: 'custevent_case_pump_serialno' });

                return {
                    email,
                    diagnosis,
                    serialNumber
                }
            } catch (e) {
                log.error('getCaseData error', e);
            }
        };

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

        const QUERY = `
            SELECT
	            id,
                casenumber,
	            email,
	            custevent_case_diagnostics,
	            custevent_case_pump_serialno,
	            datecreated
            FROM 
	            supportCase
            WHERE
	            (LOWER(email) = LOWER(?)
	            OR custevent_case_diagnostics = ?)
	            AND custevent_case_pump_serialno LIKE ?;
        `;

        return {
            saveRecord: saveRecord
        };

    });
