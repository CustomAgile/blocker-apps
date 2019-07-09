Ext.define('Rally.technicalservices.BlockedToolbox', {
    singleton: true,
    /**
     * getBlockedDurations
     *   
     * Returns an array of objects that represent one blocked duration for an artifact and include the following properties:
     *     FormattedID
     *     Name
     *     DateBlocked
     *     DateUnblocked
     *     BlockedReason
     *     
     * Assumes the minimal fetch list:  
     *     Name
     *     FormattedID
     *     _ValidFrom
     *     Blocked
     *     BlockedReason
     *     _PreviousValues.Blocked
     *     _PreviousValues.BlockedReason
     *  
     * Also assumes snapshots are sorted by _ValidFrom in ascending order 
     * 
     */
    getBlockedDurations(snaps_by_oid) {
        let data = [];
        
        Ext.Object.each(snaps_by_oid, function (oid, snaps) {
            let last_blocked_time = null; 
            let data_record = {
 FormattedID: null, Name: null, BlockedReason: null, BlockedDate: null, UnblockedDate: null 
};
            
            Ext.each(snaps, (snap) => {
                data_record.FormattedID = snap.FormattedID;
                data_record.Name = snap.Name; 
                let is_blocked = snap.Blocked;
                let was_blocked = is_blocked;  
                if (snap._PreviousValues && (snap._PreviousValues.Blocked != undefined)) {
                    was_blocked = snap._PreviousValues.Blocked;
                } else if (snap['_PreviousValues.Blocked'] != null) {
                    was_blocked = snap['_PreviousValues.Blocked'];
                }
                
                let reason = snap.BlockedReason || ''; 
                
                let prev_reason = '';  
                if (snap._PreviousValues && (snap._PreviousValues.BlockedReason != undefined)) {
                    prev_reason = snap._PreviousValues.BlockedReason;
                } else if (snap['_PreviousValues.BlockedReason']) {
                    prev_reason = snap['_PreviousValues.BlockedReason'];
                }
                
                let date = Rally.util.DateTime.fromIsoString(snap._ValidFrom);
                if (was_blocked && prev_reason.length > 0 && (is_blocked == false)) {
                    data_record.UnblockedDate = date; 
                    data_record.BlockedReason = prev_reason; 
                    data.push(data_record); // We push this here so that we can start a new one.  
                    data_record = {
 FormattedID: snap.FormattedID, Name: snap.Name, BlockedReason: null, BlockedDate: null, UnblockedDate: null 
};
                    last_blocked_time = null;  
                } 
                
                if (is_blocked && (was_blocked == false)) {
                    last_blocked_time = date; 
                }
                if (is_blocked && reason.length > 0 && last_blocked_time) {
                    data_record.BlockedReason = reason; 
                    data_record.BlockedDate = last_blocked_time;
//                    last_blocked_time = null;  
                }
            }, this);
            
            if (data_record.BlockedDate && data_record.UnblockedDate == null) {
                data.push(data_record);
            }
        }, this);
        return data;  
    },
    getCountsByReason(snaps_by_oid) {
        let counts = {};
        let data = [];  
        Ext.Object.each(snaps_by_oid, (oid, snaps) => {
            let rec = { FormattedID: null, Name: null, BlockedReason: null };
            Ext.each(snaps, (snap) => {
                rec.Name = snap.Name;  
                rec.FormattedID = snap.FormattedID;
                if (snap.BlockedReason) {
                    if (counts[snap.BlockedReason] == undefined) {
                        counts[snap.BlockedReason] = 0; 
                    } 
                    rec.BlockedReason = snap.BlockedReason;
                    counts[snap.BlockedReason]++; 
                }
            });
            data.push(rec);
        }, this);
        return { counts, data };  
    },
    bucketDataByDate(artifacts, artifactProperty, dateInterval, dateFormat, bucketedDateStrings) {
        let buckets = {};

        Ext.each(bucketedDateStrings, (str) => {
            buckets[str] = 0;
        });
        
        Ext.Object.each(artifacts, (key, artifact) => {
            if (artifact[artifactProperty]) {
                let date = Rally.util.DateTime.fromIsoString(artifact[artifactProperty]);
                let bucket = Rally.util.DateTime.format(date, dateFormat);
                if (Ext.Array.contains(bucketedDateStrings, bucket)) {
                    buckets[bucket]++;
                }
            }
        });
        
        return buckets;  
    },
    aggregateBlockedTimelines(snaps_by_oid) {
        let export_data = [];  
        let reason_data = {};  
       
        // Assumption is that these snaps are still sorted by _ValidFrom in ascending order for each oid
        let block_action = {};  
        
        Ext.Object.each(snaps_by_oid, (oid, snaps) => {
            let last_blocked_date = null;
            let blocked_actions = [];  
            let formatted_id = snaps[0].get('FormattedID');

            Ext.each(snaps, (snap) => {
                let name = snap.get('Name');
                let reason = snap.get('BlockedReason') || null;
                let previous_reason = snap.get('_PreviousValues.BlockedReason') || null;
                let blocked = snap.get('Blocked');
                let was_blocked = snap.get('_PreviousValues.Blocked');
                let date = Rally.util.DateTime.fromIsoString(snap.get('_ValidFrom'));

                let rec = {
 FormattedID: formatted_id, BlockedDate: null, UnblockedDate: null, BlockedReason: null 
};
                if (blocked === true && was_blocked === false) {
                    // Transition to blocked
                    last_blocked_date = date;
                    rec.BlockedDate = last_blocked_date;
                    rec.BlockedReason = reason;  
                    rec.Name = name; 
                    blocked_actions.push(rec);
                }
                
                if (was_blocked === true && blocked === false) {
                    // Transition from blocked 
                    let rec_found = false; 
                    let idx = -1; 
                    for (let i = 0; i < blocked_actions.length; i++) {
                        if (blocked_actions[i].BlockedDate == last_blocked_date) {
                            idx = i;  
                        }
                    }

                    if (idx < 0) {
                        idx = blocked_actions.length; 
                        blocked_actions.push(rec);  
                    }
                    blocked_actions[idx].Name = name;  
                    blocked_actions[idx].UnblockedDate = date;  
                    blocked_actions[idx].BlockedReason = previous_reason;  
                    last_blocked_date = null; 
                }
            });
            block_action[formatted_id] = blocked_actions;
        });
        return block_action;         
    }
});
