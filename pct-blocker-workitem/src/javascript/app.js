Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {
 xtype: 'container', itemId: 'selection_box', layout: { type: 'hbox' }, padding: 10 
},
        {
 xtype: 'container', itemId: 'time_box', layout: { type: 'hbox' }, padding: 10 
},
        { xtype: 'container', itemId: 'display_box' },
        { xtype: 'tsinfolink' }
    ],
    
    chartTitle: 'Blockers as a percentage of Work Items',
    pickerOptions: [
        { name: 'Last Complete Month', value: -1 },
        { name: 'Last 2 Complete Months', value: -2 },
        { name: 'Last 3 Complete Months', value: -3 },
        { name: 'Last 6 Complete Months', value: -6 },
        { name: 'Last 12 Complete Months', value: -12 }
    ],
    types: ['HierarchicalRequirement', 'Defect'],
    defaultPickerOption: 'Last 3 Complete Months',
    launch() {
        this._initialize();
    },
    _initialize() {
        var store = Ext.create('Ext.data.Store', {
            fields: ['name', 'value'],
            data: this.pickerOptions
        });

        let me = this;

        var store = Ext.create('Ext.data.Store', {
            fields: ['name', 'value'],
            data: this.pickerOptions
        });

        this.down('#selection_box').add({
            xtype: 'radiogroup',
            fieldLabel: 'Select data for ',
            defaults: {
                flex: 1
            },
            layout: 'hbox',
            items: [
                {
                    boxLabel: 'Time Period',
                    name: 'timebox',
                    inputValue: 'T',
                    id: 'radio1',
                    checked: true,
                    margin: '0 0 0 10'   
                }, {
                    boxLabel: 'Iteration',
                    name: 'timebox',
                    inputValue: 'I',
                    id: 'radio2',
                    margin: '0 0 0 10'
                }, {
                    boxLabel: 'Release',
                    name: 'timebox',
                    inputValue: 'R',
                    id: 'radio3',
                    margin: '0 0 0 10'
                }
            ],
            listeners: {
                change(rb) {
                    if (rb.lastValue.timebox == 'T') {
                        me.down('#time_box').removeAll();
                            me.down('#time_box').add({
                                xtype: 'combobox',
                                store,
                                queryMode: 'local',
                                fieldLabel: 'Show data from',
                                displayField: 'name',
                                valueField: 'value',
                                minWidth: 300,
                                value: -3,
                                name: 'TimePeriod',
                                listeners: {
                                    scope: me,
                                    select: me._buildChart,
                                    ready: me._buildChart
                                }
                            });
                    } else if (rb.lastValue.timebox == 'I') {
                            // console.log('me>>',me);
                            me.down('#time_box').removeAll();
                            me.down('#time_box').add({
                                xtype: 'rallyiterationcombobox',
                                fieldLabel: 'Iteration: ',
                                minWidth: 300,
                                listeners: {
                                    scope: me,
                                    select(icb) {
                                        me._getReleaseOrIterationOids(icb);
                                    },
                                    ready(icb) {
                                        me._getReleaseOrIterationOids(icb);
                                    }
                                }
                            });
                    } else if (rb.lastValue.timebox == 'R') {
                            me.down('#time_box').removeAll();
                            me.down('#time_box').add({
                                xtype: 'rallyreleasecombobox',
                                fieldLabel: 'Release: ',
                                minWidth: 300,
                                value: -3,
                                listeners: {
                                    scope: me,
                                    select(icb) {
                                        me._getReleaseOrIterationOids(icb);
                                    },
                                    ready(icb) {
                                        me._getReleaseOrIterationOids(icb);
                                    }                                 
}
                            });
                    }
                }
            }
        });
        
        let cb = this.down('#time_box').add({
            xtype: 'combobox',
            store,
            queryMode: 'local',
            fieldLabel: 'Show data from',
            displayField: 'name',
            valueField: 'value',
            minWidth: 300,
            value: -3,
            listeners: {
                scope: this,
                select: this._buildChart  
            }
        });
        this.down('#selection_box').add({
            xtype: 'rallybutton',
            itemId: 'btn-data',
            text: 'Data...',
            scope: this, 
            margin: '0 0 0 10',
            handler: this._viewData
        });
        this._buildChart(cb);
    }, 

    _getReleaseOrIterationOids(cb) {
        let me = this;
        me.logger.log('_getReleaseOrIterationOids', cb);
        me.timeboxValue = cb;
        Deft.Chain.parallel([
                me._getReleasesOrIterations
        ], me).then({
            scope: me,
            success(results) {
                me.logger.log('Results:', results);
                
                me.timebox_oids = Ext.Array.map(results[0], timebox => timebox.get('ObjectID'));
                me._buildChart(cb);
            },
            failure(msg) {
                Ext.Msg.alert('Problem Loading Timebox data', msg);
            }
        });
    },

    _getReleasesOrIterations() {
        let deferred = Ext.create('Deft.Deferred');
        let me = this;
        this.logger.log('_getReleasesOrIterations>>', me.timeboxValue);

        let timeboxModel = '';
        let filters = [];

        if (me.timeboxValue.name == 'Iteration') {
            timeboxModel = 'Iteration';
            filters = [{
                    property: 'Name',
                    operator: '=',
                    value: me.timeboxValue.getRecord().get('Name')
                },                
                {
                    property: 'StartDate',
                    operator: '=',
                    value: me.timeboxValue.getRecord().get('StartDate').toISOString()
                },
                {
                    property: 'EndDate',
                    operator: '=',
                    value: me.timeboxValue.getRecord().get('EndDate').toISOString()
                }
            ];
        } else if (me.timeboxValue.name == 'Release') {
            timeboxModel = 'Release';  
            filters = [{
                    property: 'Name',
                    operator: '=',
                    value: me.timeboxValue.getRecord().get('Name')
                },                
                {
                    property: 'ReleaseStartDate',
                    operator: '=',
                    value: me.timeboxValue.getRecord().get('ReleaseStartDate').toISOString()
                },
                {
                    property: 'ReleaseDate',
                    operator: '=',
                    value: me.timeboxValue.getRecord().get('ReleaseDate').toISOString()
                }
            ];
        }

        Ext.create('Rally.data.wsapi.Store', {
            model: timeboxModel,
            fetch: ['ObjectID'],
            filters: Rally.data.wsapi.Filter.and(filters)
        }).load({
            callback(records, operation, successful) {
                if (successful) {
                    // console.log('records',records,'operation',operation,'successful',successful);
                    deferred.resolve(records);
                } else {
                    me.logger.log('Failed: ', operation);
                    deferred.reject(`Problem loading: ${operation.error.errors.join('. ')}`);
                }
            }
        });
        return deferred.promise;
    },

    _viewData() {
        this.logger.log('_viewData');
        
        let data = this.down('#crt').calculator.getData();  
        let height = this.getHeight() || 500;
        let width = this.getWidth() || 800;
        
        if (width > 800) {
            width = 800;
        }
        if (height > 550) {
            height = 550;
        }
        if (height < 200) {
            alert('The app panel is not tall enough to allow for displaying data.');
        } else {        
            Ext.create('Rally.technicalservices.DataExportDialog', {
                draggable: true,
                modal: true,
                width,
                height,
                autoShow: true,
                title: `Data for ${this.chartTitle}`,
                data
            });
        }
     },    

    _buildChart(cb) {
        let me = this;

        let project = this.getContext().getProject().ObjectID;  
        // var start_date = Rally.util.DateTime.add(new Date(),"month",cb.getValue());

        let start_date, 
end_date = new Date();
        if (cb.name == 'Iteration') {
            if (me.timeboxValue) {
                start_date = new Date(me.timeboxValue.getRecord().get('StartDate'));
                end_date = new Date(me.timeboxValue.getRecord().get('EndDate'));
            }
        } else if (cb.name == 'Release') {
            if (me.timeboxValue) {
                start_date = new Date(me.timeboxValue.getRecord().get('ReleaseStartDate'));
                end_date = new Date(me.timeboxValue.getRecord().get('ReleaseDate'));
            }
        } else {
            start_date = Rally.technicalservices.Toolbox.getBeginningOfMonthAsDate(Rally.util.DateTime.add(new Date(), 'month', cb.getValue()));
        }

        let find = {
 $and: [{ ScheduleState: 'In-Progress' }, { _ProjectHierarchy: project }, { _TypeHierarchy: { $in: this.types } },
                      {
 $or: [{
                          _ValidFrom: { $gt: Rally.util.DateTime.toIsoString(start_date) }
                      }, {
                          __At: Rally.util.DateTime.toIsoString(start_date)
                      }]
                      }]
                };

        if (cb.name == 'Iteration') {
            find.Iteration = { $in: this.timebox_oids };
        } else if (cb.name == 'Release') {
            find.Release = { $in: this.timebox_oids };
        }

        this.logger.log('_buildChart', project, start_date);
        
        this.down('#display_box').removeAll();
        
        let chart = this.down('#display_box').add({
            xtype: 'rallychart',
            itemId: 'crt',
            chartColors: ['#8bbc21', '#c42525'],
            calculatorType: 'Rally.technicalservices.calculator.StateTouchCalculator',
            calculatorConfig: {
                startDate: start_date,
                endDate: new Date()
            },
            storeConfig: {
                fetch: ['Blocked', 'BlockedReason', 'Name', 'FormattedID'],
                limit: 'Infinity',
                find,
                removeUnauthorizedSnapshots: true
            },
            chartConfig: {
                    chart: {
                        type: 'column'
                    },
                    title: {
                        text: this.chartTitle
                    },
                    yAxis: {
                        min: 0,
                        title: { text: '' },
                        max: 100,
                        labels: {
                            format: '{value}%'
                        }
                    },
                    plotOptions: {
                        column: {
                            stacking: 'normal'
                        }
                    }
            }
        });
    },
});
