    Ext.define('Rally.technicalservices.DataExportDialog', {
        extend: 'Rally.ui.dialog.Dialog',
        logger: new Rally.technicalservices.Logger(),
        autoShow: true,
        title: 'Data Dialog',

        constructor(config) {
            Ext.apply(this, config);
            
            this.title = this.title;
            this.items = this._initializeItems();
            this.logger.log('Data dialog constructor', this.title, this.items);
            
            this.callParent(arguments);
       },
       _initializeItems() {
           let items = [];
           this.logger.log('_initializeItems', this.data);
           items.push(this._buildGrid());
           items.push({
 xtype: 'container',
itemId: 'button-container',
layout: { type: 'hbox' },
items: [{
                    xtype: 'rallybutton',
                    text: 'Export',
                    scope: this,
                    handler: this._export
                }, {
                    xtype: 'rallybutton',
                    text: 'Close',
                    scope: this,
                    handler: this._close
                }] 
});
           return items;
      },
      _buildGrid() {
          this.logger.log('_buildGrid');
          
          let store = Ext.create('Rally.data.custom.Store', {
              data: this.data,
              pageSize: 10
          });
          
          return {
              xtype: 'rallygrid',
              store,
              columnCfgs: this._getColumnCfgs(this.data),
              height: this.height - 100,
              pagingToolbarCfg: {
                  pageSizes: [5, 10, 25]
               }
          };
      },
      _getColumnCfgs(data) {
          let headers = Ext.Object.getKeys(data[0]);
          let column_cfgs = [];
          Ext.each(headers, (header) => {
              column_cfgs.push({ flex: 1, text: header, dataIndex: header });
          });
          return column_cfgs;  
      },
      _export() {
          let file_name = 'export.csv';
          let data_hash = {};
          Ext.each(Ext.Object.getKeys(this.data[0]), (key) => {
              data_hash[key] = key;
          });
          this.logger.log('_export', data_hash, this.data);
          
          let export_text = Rally.technicalservices.FileUtilities.convertDataArrayToCSVText(this.data, data_hash);
          Rally.technicalservices.FileUtilities.saveTextAsFile(export_text, file_name);
      },
      _close() {
          this.destroy();
      }
    });
