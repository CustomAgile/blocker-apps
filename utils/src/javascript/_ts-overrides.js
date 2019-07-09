Ext.override(Rally.ui.chart.Chart, {
    _loadStore(storeConfig, storeRank) {
        let self = this;

        Ext.merge(storeConfig, {
            exceptionHandler(proxy, response, operation) {
                console.log(proxy, response, operation);
                if (response.status !== 200) {
                    self.queryValid = false;
                }
                if (response.status === 409) {
                    self.workspaceHalted = true;
                } else if (response.status === 503) {
                    self.serviceUnavailable = true;
                }
            }
        });

        storeConfig.limit = storeConfig.limit || Infinity;

        let store = Ext.create(this.storeType, storeConfig);
        store.rank = storeRank;

        store.on('load', this._storeLoadHandler, this);
        store.load({ params: { removeUnauthorizedSnapshots: true } });
    }
});
