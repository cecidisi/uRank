function datasetManager(){

    var datasetMappings = {

        DS_RS: {
            description: 'Recommender Systems',
            file: 'recommender_systems.json',
            parse: true
        },
        DS_VA: {
            description: 'Visual Analytics',
            file: 'visual-analytics.json',
            parse: true
        },
        DS_SRV: {
            description: 'Search Result Visualization',
            file: 'search_result_visualization.json',
            parse: true
        },

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
        }
    };

    function adaptJSON(_data) {
        var data = [];
        _data.xml.records.record.forEach(function(d, i){

            function getCreators(contributors) {
                if(contributors && contributors.authors && contributors.authors.author)
                    return Array.isArray(contributors.authors.author) ? contributors.authors.author.join('; ') : contributors.authors.author;
                if(contributors && contributors['secondary-authors'] && contributors['secondary-authors'].author)
                    return Array.isArray(contributors['secondary-authors'].author) ? contributors['secondary-authors'].author.join('; ') : contributors['secondary-authors'].author;
                return '';
            }
//            console.log('*************   ' + i + '   ************');
//            console.log(d);
            data.push({
                id: /*d.isbn ? (d.isbn + '-doc-' + i) :*/ 'doc-' + i,
                title: d.titles.title,
                creator: getCreators(d.contributors),
                description: d.abstract || '',
                uri: (d.urls && d.urls['web-urls'] && d.urls['web-urls'].url) ? d.urls['web-urls'].url : '',
                facets: {
                    year: (d.dates && d.dates.year) ? d.dates.year : ''
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
                console.log('Dataset '+ datasetId +' retrieved --> (' + data.length + ' documents)');
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
