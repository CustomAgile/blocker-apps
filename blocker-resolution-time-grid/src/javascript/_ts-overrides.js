Ext.override(Rally.ui.combobox.ComboBox, {
  applyState(state) {
    this.setValue(state.value);

    this.store.on('load', function () {
        this.setValue(state.value);
        this.saveState();
    }, this, { single: true });

    this.on('ready', function () {
      this.setValue(state.value);
      this.saveState();
    }, this, { single: true });
  }
});

Ext.override(Ext.form.RadioGroup, {
  applyState(state) {
    if (state && state.value) {
        this.setValue(state.value);
    }
  },
  getState() {
        let me = this,
            state = {};

        if (me.getValue()) {
          state.value = me.getValue();
        }

        return state;
    },
    saveState() {
           let me = this,
               id = me.stateful && me.getStateId(),
               hasListeners = me.hasListeners,
               state;

           if (id) {
             console.log('saveState radio state', me.getState());
               state = me.getState() || {}; // pass along for custom interactions
               if (!hasListeners.beforestatesave || me.fireEvent('beforestatesave', me, state) !== false) {
                   Ext.state.Manager.set(id, state);
                   if (hasListeners.statesave) {
                       me.fireEvent('statesave', me, state);
                   }
               }
           }
       },

});

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
    },
});
