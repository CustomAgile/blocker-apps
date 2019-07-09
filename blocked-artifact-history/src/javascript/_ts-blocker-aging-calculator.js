Ext.define('AgingCalculator', {
    singleton: true,
    getFieldHash(snapsForOid, arrayOfFields) {
        let fieldHash = {};
        Ext.each(snapsForOid, (snap) => {
            Ext.each(arrayOfFields, (f) => {
                let snapVal = snap[f];
                let currentVal = fieldHash[f] || '';
                fieldHash[f] = snapVal;
            });
        });
        return fieldHash;
    },
    getFieldCurrentValue(snapsForOid, field) {
        return snapsForOid[snapsForOid.length - 1][field];
    },
    calculateMobility(snapsForOid, previousValueField, currentField, fieldValue, mobilityField) {
        let startValue = null;
        let currentValue = null;
        if (snapsForOid.length > 0) {
            let previousValue = snapsForOid[0][currentField];
            var previousValueField = `_PreviousValues.${currentField}`;
            if (snapsForOid[0][previousValueField] != undefined) {
                previousValue = snapsForOid[0][previousValueField];
            }

            Ext.each(snapsForOid, (snap) => {
                if (snap[currentField] != previousValue) {
                    if (snap[currentField] === fieldValue) {
                        startValue = snap[mobilityField];
                    }
                }
                previousValue = snap[currentField];
            }, this);

            currentValue = snapsForOid[snapsForOid.length - 1][mobilityField];
        }
        return { startValue, currentValue };
    },
    calculateDurations(snapsForOid, currentField, fieldValue, blockedAfterDate) {
        let granularity = 'hour';
        let conversionDivisor = 24;
        let threshhold = 24;
        let ages = [];
        let earliestStartDate = null;
        let lastEndDate = null;

        if (snapsForOid.length > 0) {
            let startDate = null;
            let endDate = Rally.util.DateTime.fromIsoString(snapsForOid[0]._ValidFrom);
            if (blockedAfterDate == undefined || blockedAfterDate == null) {
                blockedAfterDate = Rally.util.DateTime.fromIsoString(snapsForOid[0]._ValidFrom);
            }

            let previousValue = snapsForOid[0][currentField];
            let previousValueField = `_PreviousValues.${currentField}`;
            if (snapsForOid[0][previousValueField] != undefined) {
                previousValue = snapsForOid[0][previousValueField];
            } else {
                previousValue = false;
            }
            let isCurrent = false;
            Ext.each(snapsForOid, (snap) => {
                if (snap[currentField] != previousValue) {
                    let date = Rally.util.DateTime.fromIsoString(snap._ValidFrom);
                    if (snap[currentField] === fieldValue && date >= blockedAfterDate) {
                        startDate = date;
                        if (earliestStartDate == null) {
                            earliestStartDate = date;
                        }
                    }
                    if (startDate && previousValue === fieldValue) {
                        lastEndDate = date;
                        let diff = Rally.util.DateTime.getDifference(date, startDate, granularity);
                        if (diff >= threshhold) {
                            ages.push(diff / conversionDivisor);
                        }
                        startDate = null;
                    }
                }
                previousValue = snap[currentField];
                if (Rally.util.DateTime.fromIsoString(snap._ValidTo) > new Date()) {
                    isCurrent = true;
                }
            }, this);

            if (startDate != null && isCurrent) {
                let diff = Rally.util.DateTime.getDifference(new Date(), startDate, granularity);
                if (diff >= threshhold) {
                    ages.push(diff / conversionDivisor);
                }
            }
        }
        return { durations: ages, earliestStartDate, lastEndDate };
    }

});
