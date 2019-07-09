/**
 * Created by kcorkan on 3/24/15.
 */

Ext.override(Ext.data.proxy.Server, {
    timeout: 180000,    
    processResponse(success, operation, request, response, callback, scope) {
        let me = this,
            reader,
            result;

        if (success === true) {
            reader = me.getReader();
            reader.applyDefaults = operation.action === 'read';
            result = reader.read(me.extractResponseData(response));

            if (result.success !== false) {
                Ext.apply(operation, {
                    response,
                    resultSet: result
                });

                operation.commitRecords(result.records);
                operation.setCompleted();
                operation.setSuccessful();
            } else {
                operation.setException(result.message);
                me.fireEvent('exception', this, response, operation);
            }
        } else {
            if (response) {
                me.setException(operation, response);
            }
            me.fireEvent('exception', this, response, operation);
        }

        if (typeof callback === 'function') {
            callback.call(scope || me, operation);
        }

        me.afterRequest(request, success);
    },

    setException(operation, response) {
        operation.setException({
            status: response.status,
            statusText: response.statusText
        });
    },

    extractResponseData: Ext.identityFn,

    applyEncoding(value) {
        return Ext.encode(value);
    }
});
