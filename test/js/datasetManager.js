function datasetManager(){

    var datasetMappings = {

        DS_uni_leiden_all_pretty: {
            description: 'Leiden Ranking - All (pretty)',
            file: 'leiden_all_pretty.json',
            featureField: 'ranks',
            invert: true,
            defaultFeatures: ['Collaboration', 'Top_10Perc_Cited', 'Industry', 'International']
        },
        DS_uni_leiden_AT_pretty: {
            description: 'Leiden Ranking - Austria (pretty)',
            file: 'leiden_AT_pretty.json',
            featureField: 'ranks',
            invert: true,
            defaultFeatures: ['Collaboration', 'Top_10Perc_Cited', 'Industry', 'International']
        },
        DS_uni_leiden_all_short: {
            description: 'Leiden Ranking - All (original)',
            file: 'leiden_all_short.json',
            featureField: 'ranks',
            invert: true,
            defaultFeatures: ['P_top10', 'P_collab', 'P_int_collab', 'P_UI_collab']
        },
        DS_uni_leiden_AT_short: {
            description: 'Leiden Ranking - Austria (original)',
            file: 'leiden_AT_short.json',
            featureField: 'ranks',
            invert: true,
            defaultFeatures: ['P_top10', 'P_collab', 'P_int_collab', 'P_UI_collab']
        },
        DS_uni_qs_all: {
            description: 'QS Ranking - All (pretty)',
            file: 'qs_red500_zeros_pretty.json',
            featureField: 'ranks',
            invert: true,
            defaultFeatures: ['Overall', 'International_Faculty', 'International_Students', 'Citations_per_Facutly', 'Academic']
//            defaultFeatures: ['Faculty', 'International_Faculty', 'International_Students', 'Overall', 'Citations_per_Facutly', 'Employer', 'Academic']
        }

//        DS_Uni2: {
//            description: 'Universities II',
//            file: 'universities-new.json',
//            featureField: 'ranks',
//            invert: true,
//            defaultFeatures: ['P', 'P_top10', 'P_collab', 'PP_industry_collab', 'P_UI_collab']
//        }
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
                if(datasetMappings[datasetId].changeId) {
                    data.forEach(function(d, i){
                        d.id = 'item-'+i;
                    });
                }
                console.log('Dataset '+ datasetId +' retrieved --> (' + data.length + ' documents)');
                callback.call(this, data, datasetMappings[datasetId]);
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
