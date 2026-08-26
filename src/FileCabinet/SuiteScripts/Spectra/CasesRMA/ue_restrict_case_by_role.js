/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/error'], (runtime, error) => {

    const beforeLoad = (scriptContext) => {
        if (scriptContext.type !== scriptContext.UserEventType.VIEW &&
            scriptContext.type !== scriptContext.UserEventType.EDIT) {
            return;
        }

        const restrictedRoles = [1077, 1021, 1075, 1071, 1072];
        const currentUser = runtime.getCurrentUser();
        const currentUserRole = currentUser.role;
        // log.debug('Current User Role', currentUserRole);
        if (currentUserRole === 3) return;

        const currentRecord = scriptContext.newRecord;
        const caseProfile = currentRecord.getValue({ fieldId: 'profile' });
        // log.debug('Case Profile', caseProfile);
        if (caseProfile == 2) {
            if (!restrictedRoles.includes(currentUserRole)) {
                throw createError('Case Access Denied', 'You do not have permission to view or edit this case. This is a RMA case only available to the Accounting team.').message;
            }
        }
        // log.debug('Case Profile', caseProfile);
        if (caseProfile != 2) {
            if (restrictedRoles.includes(currentUserRole)) {
                throw createError('Case Access Denied', 'You do not have permission to view or edit this case. This is a non-RMA case only available to the Customer Service team.').message;
            }
        }
    }

    const createError = (name, message) => {
        return error.create({
            name: name,
            message: message,
            notifyOff: true
        });
    };

    return { beforeLoad };
});
