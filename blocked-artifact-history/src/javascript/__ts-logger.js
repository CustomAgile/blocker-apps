/*
 */
Ext.define('Rally.technicalservices.Logger', {
    constructor(config) {
        Ext.apply(this, config);
    },
    log(args) {
        let timestamp = `[ ${Ext.util.Format.date(new Date(), 'Y-m-d H:i:s.u')} ]`;
        // var output_args = arguments;
        // output_args.unshift( [ "[ " + timestamp + " ]" ] );
        // output_args = Ext.Array.push(output_args,arguments);
        
        let output_args = [];
        output_args = Ext.Array.push(output_args, [timestamp]);
        output_args = Ext.Array.push(output_args, Ext.Array.slice(arguments, 0));

        window.console && console.log(...output_args);
    }

});
