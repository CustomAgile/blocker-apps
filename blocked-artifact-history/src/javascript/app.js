Ext.define('blocked-artifact-history', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {
 xtype: 'container',
itemId: 'header_box',
layout: { type: 'hbox' },
items: [
            { xtype: 'container', itemId: 'control_box', layout: { type: 'hbox' } },
            { xtype: 'container', itemId: 'button_box', layout: { type: 'hbox' } },
            {
 xtype: 'container', itemId: 'summary_box', padding: 10, tpl: '<tpl><font color="grey"><b><i>{message}</i></b></color></tpl>' 
},

        ] 
},
        { xtype: 'container', itemId: 'display_box' },
        { xtype: 'tsinfolink' }
    ],
    invalidDateString: 'Invalid Date',
    dateFormat: 'MM/dd/YYYY',
    showOptionsStore: [[true, 'Current Blocked Items'], [false, 'Items Blocked on or after']],
    lookbackFetchFields: ['ObjectID', '_PreviousValues.Blocked', '_SnapshotNumber', 'Name', 'FormattedID', '_ProjectHierarchy', 'Feature', '_TypeHierarchy', 'Blocked', '_ValidFrom', '_ValidTo', 'BlockedReason', 'c_BlockerOwnerFirstLast', 'c_BlockerCategory', 'c_BlockerCreationDate', 'DirectChildrenCount', 'Feature', 'Iteration', 'ScheduleState'],
    featureHash: {},
    launch() {
        let defaultDate = Rally.util.DateTime.add(new Date(), 'month', -3);
        this.down('#control_box').add({
            xtype: 'rallycheckboxfield',
            itemId: 'chk-blocked',
            fieldLabel: 'Blocked Only',
            labelAlign: 'right',
            labelWidth: 100,
            margin: 10,
            listeners: {
                scope: this,
                change() { this._filterBlocked(); }
            }
        });

        this.down('#control_box').add({
            xtype: 'rallydatefield',
            itemId: 'from-date-picker',
            fieldLabel: 'Items blocked on or after',
            labelAlign: 'right',
            labelWidth: 150,
            value: defaultDate,
            margin: 10,
        });

        this.down('#button_box').add({
            xtype: 'rallybutton',
            itemId: 'run-button',
            text: 'Run',
            margin: 10,
            scope: this,
            width: 75,
            handler: this._run,
        });

        this.down('#button_box').add({
            xtype: 'rallybutton',
            itemId: 'export-button',
            text: 'Export',
            margin: 10,
            scope: this,
            width: 75,
            handler: this._exportData,
        });
    },
    _getFromDateControl() {
        return this.down('#from-date-picker');
    },
    _getFromDate() {
        if (this._getFromDateControl()) {
            let fromDate = this._getFromDateControl().getValue();
            if (!isNaN(Date.parse(fromDate))) {
                return fromDate;
            }
        }
        return null;
    },
    _filterBlocked(store) {
        let filterBlocked = this._showOnlyBlockedItems();

        if (store == undefined) {
            let grid = this._getGrid();
            if (grid == null) { return; }
            store = grid.getStore();
        }

        if (filterBlocked === true) {
            store.filterBy(item => (item.get('Blocked') === true));
        } else {
            store.clearFilter();
        }
        this._updateSummary(store.count());
    },
    _updateSummary(totalResults) {
        let blocked = '';
        if (this._showOnlyBlockedItems()) {
            blocked = 'blocked';
        }
        let msg = Ext.String.format('{0} {1} items found.', totalResults, blocked);
        this.down('#summary_box').update({ message: msg });
    },
    _showOnlyBlockedItems() {
        if (this.down('#chk-blocked')) {
            this.logger.log('showOnlyBlockedItems ', this.down('#chk-blocked').getValue());
            return this.down('#chk-blocked').getValue();
        }
        return false;
    },
    _run() {
        let fromDate = this._getFromDate();
        if (isNaN(Date.parse(fromDate))) {
            Rally.ui.notify.Notifier.showWarning({ message: 'No date selected.  Please select a date and try again.' });
            return;
        }
        let current_project_id = this.getContext().getProject().ObjectID;

        this.setLoading(true);
        this._fetchLookbackStore(current_project_id, fromDate).then({
            scope: this,
            success: this._calculateAgingForBlockers
        });
    },
    _fetchLookbackStore(currentProjectId, fromDate) {
        let deferred = Ext.create('Deft.Deferred');

        let find = {};
        let isoFromDate = Rally.util.DateTime.toIsoString(fromDate);
        find._ValidTo = { $gte: isoFromDate };
        find.$or = [{ '_PreviousValues.Blocked': true }, { Blocked: true }];
        find._TypeHierarchy = 'HierarchicalRequirement';
        find._ProjectHierarchy = currentProjectId;

        Ext.create('Rally.data.lookback.SnapshotStore', {
            scope: this,
            listeners: {
                scope: this,
                load(store, data, success) {
                    this.logger.log('fetchLookbackStore load', data.length, success);
                    let snaps_by_oid = Rally.technicalservices.Toolbox.aggregateSnapsByOidForModel(data);
                    deferred.resolve(snaps_by_oid);
                }
            },
            autoLoad: true,
            fetch: this.lookbackFetchFields,
            hydrate: ['Iteration', 'Project', 'ScheduleState'],
            find,
            sort: { _ValidFrom: 1 }
        });
        return deferred.promise;
    },
    _fetchFeatureHash() {
        let deferred = Ext.create('Deft.Deferred');
        let me = this;
        me.logger.log('_fetchFeatureHash start');
        Ext.create('Rally.data.lookback.SnapshotStore', {
            scope: this,
            listeners: {
                scope: this,
                load(store, data, success) {
                    me.logger.log('_fetchFeatureHash returned data', data);
                    Ext.each(data, function (d) {
                        let key = d.get('ObjectID').toString();
                        this.featureHash[key] = d.getData();
                    }, this);
                    deferred.resolve(data);
                }
            },
            autoLoad: true,
            fetch: ['Name', 'FormattedID', 'ObjectID'],
            find: {
                _TypeHierarchy: 'PortfolioItem/Feature',
                __At: 'current'
            }
        });
        return deferred.promise;
    },
    _renderGrid(data) {
        let columns = [
            {
               // xtype: 'templatecolumn',
                text: 'FormattedID',
                dataIndex: 'FormattedID',
                renderer(v, m, r) {
                    let link_text = r.get('FormattedID');
                    if (v) {
                        return Ext.String.format('<a href="{0}" target="_blank">{1}</a>', Rally.nav.Manager.getDetailUrl(`/userstory/${r.get('ObjectID')}`), link_text);
                    }
                }
            },
            { text: 'Name', dataIndex: 'Name', flex: 1 },
            {
 text: 'Project', flex: 1, dataIndex: 'Project', renderer: this._objectNameRenderer 
},
            //    {text: 'Feature', dataIndex: 'Feature', renderer: this._featureOidRenderer},
            { text: 'Total Blocked Time (Days)', dataIndex: 'totalBlocked', renderer: this._decimalRenderer }];
        columns.push({ text: 'Average Resolution Time (Days)', dataIndex: 'averageResolutionTime', renderer: this._decimalRenderer });
        columns.push({ text: '#Durations', dataIndex: 'numDurations' });
        columns.push({ text: 'Iteration Blocked In', dataIndex: 'startValue', renderer: this._iterationRenderer });
        columns.push({ text: 'Current Iteration', dataIndex: 'currentValue', renderer: this._iterationRenderer });
        columns.push({ text: 'Current Schedule State', dataIndex: 'ScheduleState' });
        columns.push({ text: 'Currently Blocked', dataIndex: 'Blocked', renderer: this._yesNoRenderer });
        if (this.down('#data-grid')) {
            this.down('#data-grid').destroy();
        }

        let pageSize = data.length;
        let grid = Ext.create('Rally.ui.grid.Grid', {
            itemId: 'data-grid',
            store: Ext.create('Rally.data.custom.Store', {
                data,
                autoLoad: true,
                remoteSort: false,
                remoteFilter: false,
                pageSize,
                scroll: 'vertical',
                listeners: {
                    scope: this,
                    load(store) {
                        this._filterBlocked(store);
                    }
                }
            }),
            showPagingToolbar: false,
            columnCfgs: columns

        });
        this.down('#display_box').add(grid);

        this.setLoading(false);
    },
    _getGrid() {
        return this.down('#data-grid');
    },
    _decimalRenderer(v, m, r) {
        if (!isNaN(v)) {
            return v.toFixed(1);
        }
        return v;
    },
    _yesNoRenderer(v, m, r) {
        if (v === true) {
            return 'Yes';
        }
        return 'No';
    },
    _featureOidRenderer(v, m, r) {
        if (v && typeof v === 'object') {
            return Ext.String.format('{0}: {1}', v.FormattedID, v.Name);
        }
        return v;
    },
    _objectNameRenderer(v, m, r) {
        if (v && typeof v === 'object') {
            return v.Name;
        }
        return v;
    },
    _iterationRenderer(v, m, r) {
        if (v && typeof v === 'object') {
            return v.Name;
        }
        return 'Unscheduled';
    },

    _calculateAgingForBlockers(snapsByOid) {
        this.logger.log('_calculateAgingForBlockers', snapsByOid);
        let desiredFields = ['ObjectID', 'FormattedID', 'Name', 'Feature', 'Project', 'BlockedReason', 'Blocked', 'ScheduleState'];
        let data = [];
        let fromDate = this._getFromDate() || null;

        Ext.Object.each(snapsByOid, function (oid, snaps) {
            let fieldObj = AgingCalculator.getFieldHash(snaps, desiredFields);
            let agingObj = AgingCalculator.calculateDurations(snaps, 'Blocked', true, fromDate);
            let mobilityObj = AgingCalculator.calculateMobility(snaps, '_PreviousValues.Blocked', 'Blocked', true, 'Iteration');
            let record = _.extend(fieldObj, mobilityObj);

            this.logger.log(fieldObj, agingObj, mobilityObj);

            record.numDurations = agingObj.durations.length;
            if (agingObj.durations.length > 0) {
                record.totalBlocked = Ext.Array.sum(agingObj.durations);
                let mean_array = agingObj.durations;
                record.averageResolutionTime = Ext.Array.mean(agingObj.durations);
                data.push(record);
            }
        }, this);
        this.logger.log('_calculateAgingForBlockers', data);

        this._renderGrid(data);
    },
    _exportData() {
        let filename = Ext.String.format('blockers-{0}.csv', Rally.util.DateTime.format(new Date(), 'Y-m-d'));
        let csv = Rally.technicalservices.FileUtilities.getCSVFromGrid(this._getGrid());
        this.logger.log('_exportData', filename, csv);
        Rally.technicalservices.FileUtilities.saveCSVToFile(csv, filename);
    }
});
