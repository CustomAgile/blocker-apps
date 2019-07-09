Ext.define('Rally.technicalservices.Toolbox', {
    singleton: true,
    /**
     * Returns beginnig of month as date for the current time zone
     * 
     */
    getBeginningOfMonthAsDate(dateInMonth) {
        let year = dateInMonth.getFullYear();
        let month = dateInMonth.getMonth();
        return new Date(year, month, 1, 0, 0, 0, 0);
    },
    getEndOfMonthAsDate(dateInMonth) {
        let year = dateInMonth.getFullYear();
        let month = dateInMonth.getMonth();
        let day = new Date(year, month + 1, 0).getDate();
        return new Date(year, month, day, 0, 0, 0, 0);
    },
    aggregateSnapsByOid(snaps) {
        // Return a hash of objects (key=ObjectID) with all snapshots for the object
        let snaps_by_oid = {};
        Ext.each(snaps, (snap) => {
            let oid = snap.ObjectID || snap.get('ObjectID');
            if (snaps_by_oid[oid] == undefined) {
                snaps_by_oid[oid] = [];
            }
            snaps_by_oid[oid].push(snap);
        });
        return snaps_by_oid;
    },
    getCaseInsensitiveKey(obj, inputStr) {
        let new_key = inputStr;
        Ext.Object.each(obj, (key, val) => {
            if (new_key.toLowerCase() == key.toLowerCase()) {
                new_key = key;  
            }
         });
        return new_key;
    },
    aggregateSnapsByOidForModel(snaps) {
        // Return a hash of objects (key=ObjectID) with all snapshots for the object
        let snaps_by_oid = {};
        Ext.each(snaps, (snap) => {
            let oid = snap.ObjectID || snap.get('ObjectID');
            if (snaps_by_oid[oid] == undefined) {
                snaps_by_oid[oid] = [];
            }
            snaps_by_oid[oid].push(snap.getData());
        });
        return snaps_by_oid;
    },
    getDateBuckets(startDate, endDate, granularity) {
        let bucketStartDate = Rally.technicalservices.Toolbox.getBeginningOfMonthAsDate(startDate);
        let bucketEndDate = Rally.technicalservices.Toolbox.getEndOfMonthAsDate(endDate);
       
        let date = bucketStartDate;
        
        let buckets = []; 
        while (date < bucketEndDate && bucketStartDate < bucketEndDate) {
            buckets.push(date);
            date = Rally.util.DateTime.add(date, granularity, 1);
        }
        return buckets;  
    },
    formatDateBuckets(buckets, dateFormat) {
            let categories = [];
            Ext.each(buckets, (bucket) => {
                categories.push(Rally.util.DateTime.format(bucket, dateFormat));
            });
            categories[categories.length - 1] += '*'; 
            return categories; 
    },

});
