function datasetManager(){

    var datasetMappings = {

        DS_Ro: {
            description: 'Robots',
            file: 'dataset_Ro.json'
        },
        DS_AR: {
            description: 'Augmented Reality',
            file: 'dataset_AR.json'
        },
        DS_WW: {
            description: 'Women in Workforce',
            file: 'dataset_WW.json'
        },
        DS_CE: {
            description: 'Circular Economy',
            file: 'dataset_CE.json'
        },
        DS_test: {
            description: 'Time Series Visualization',
            file: 'test.json',
            parse: true
        }
    };

    function adaptJSON(_data) {
        var data = [];
        _data.xml.records.record.forEach(function(d, i){
            data.push({
                id: d.isbn + '-doc-' + i,
                title: d.titles.title,
                creator: d.contributors.authors.author.join(', '),
                description: d.abstract || '',
                uri: d.urls['web-urls'].url,
                facets: {
                    year: d.dates.year
                },

            });
        });
        return data
    }


    this.getIDsAndDescriptions = function(){
        var idsAndDescriptions = [];
        Object.keys(datasetMappings).forEach(function(id, i){
            idsAndDescriptions.push({ id: id, description: datasetMappings[id].description });
        });
        return idsAndDescriptions;
    };


    this.getDataset = function(datasetId, callback){

        if(datasetMappings[datasetId]){
            $.getJSON('datasets/'+datasetMappings[datasetId].file, function(data){
                if(datasetMappings[datasetId].parse) {
                    data = adaptJSON(data);
                }
                console.log('Dataset '+ datasetId +' retrieved');
                callback.call(this, data);
            })
            .fail(function(jqXHR, textStatus, errorThrown) { console.log('getJSON request failed! ' + textStatus + ' --- ' + errorThrown.message);
                                                           console.log(jqXHR);
            });
        }
        else {
            console.log("Invalid dataset id (value=" + datasetId + ')');
        }
    };

    this.getDescription = function(id) {
        return datasetMappings[id].description;
    };

}
