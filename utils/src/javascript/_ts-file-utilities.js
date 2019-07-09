Ext.define('Rally.technicalservices.FileUtilities', {
    singleton: true,
    logger: new Rally.technicalservices.Logger(),
    
    saveTextAsFile(textToWrite, fileName) {
        let textFileAsBlob = new Blob([textToWrite], { type: 'text/plain' });
        let fileNameToSaveAs = fileName;

        let downloadLink = document.createElement('a');
        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = 'Download File';
        if (window.webkitURL != null) {
            // Chrome allows the link to be clicked
            // without actually adding it to the DOM.
            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
        } else {
            // Firefox requires the link to be added to the DOM
            // before it can be clicked.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
            downloadLink.onclick = this.destroyClickedElement;
            downloadLink.style.display = 'none';
            document.body.appendChild(downloadLink);
        }
        downloadLink.click();
    },
    destroyClickedElement(event) {
        document.body.removeChild(event.target);
    },
    convertDataArrayToCSVText(data_array, requestedFieldHash) {
        let text = '';
        Ext.each(Object.keys(requestedFieldHash), (key) => {
            text += `${requestedFieldHash[key]},`;
        });
        text = text.replace(/,$/, '\n');
        
        Ext.each(data_array, function (d) {
            Ext.each(Object.keys(requestedFieldHash), (key) => {
                if (d[key]) {
                    if (typeof d[key] === 'object') {
                        if (d[key].FormattedID) {
                            text += Ext.String.format('"{0}",', d[key].FormattedID); 
                        } else if (d[key].Name) {
                            text += Ext.String.format('"{0}",', d[key].Name);                    
                        } else if (!isNaN(Date.parse(d[key]))) {
                            text += Ext.String.format('"{0}",', Rally.util.DateTime.formatWithDefaultDateTime(d[key]));
                        } else {
                            text += Ext.String.format('"{0}",', d[key].toString());
                        }
                    } else {
                        text += Ext.String.format('"{0}",', d[key]);                    
                    }
                } else {
                    text += ',';
                }
            }, this);
            text = text.replace(/,$/, '\n');
        }, this);
        return text;
    }
});
