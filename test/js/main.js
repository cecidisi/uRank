(function(){

    var _this = this;
    this.dsm = new datasetManager();

    var listCustomOptions = {     //  set when customContentListType = true
        selectors: {
            ul: '.test-ul',
            liClass: '.test-li',
            liTitle: '.test-li-title',
            liRankingContainer: '.test-li-ranking-container',
            watchicon: '',
            favicon: ''
        },
        misc: {
            liHoverClass: 'test-li-hover',  // No '.'!!!
            liLightBackgroundClass: 'test-li-light-background',
            liDarkBackgroundClass: 'test-li-dark-background'
        }
    };

    var visCanvasOptions = {
        lightBackgroundColor: '#dedede',
        darkBackgroundColor: '#efefef'
    };


    // Fill dataset select options and bind event handler
    var datasetOptions = "";
    this.dsm.getIDsAndDescriptions().forEach(function(ds){
        datasetOptions += "<option value='" + ds.id + "'>" + ds.description + "</option>";
    });
    $("#select-dataset").html(datasetOptions)



    function buildCustomList(data) {

        var $ul = $('<ul></ul>').appendTo($('#contentlist')).addClass('test-ul');
        data.forEach(function(d, i){
            // li element
            var $li = $('<li></li>', { id: 'test-li-' + i }).appendTo($ul).addClass('test-li');
            // ranking container
            var $rankingDiv = $("<div></div>").appendTo($li).addClass('test-li-ranking-container').css('visibility', 'hidden');
            // title container
            var $titleDiv = $("<div></div>").appendTo($li).addClass('test-li-title-container');
            $('<h3></h3>', { id: 'test-li-title-' + i, class: 'test-li-title', html: d.title, title: d.title + '\n' + d.description }).appendTo($titleDiv);
        });
    }



    // Event handler for dataset-select change
    var selectDatasetChanged = function(){

        $('.processing-message').css('visibility', 'visible');
        var datasetId = $("#select-dataset").val();
        setTimeout(function(){
            _this.dsm.getDataset(datasetId, function(dataset){
                //  Test custom list
 /*               buildCustomList(dataset);
                _this.urank.loadData(dataset, { customContentList: true, contentListCustomOptions: listCustomOptions, visCanvasOptions: visCanvasOptions });*/
                // To run with default list comment 2 previous lines and uncomment the following one
                _this.urank.loadData(dataset/*, { tagCloudModule: 'landscape' }*/);
                $('.processing-message').css('visibility', 'hidden');
            });
        }, 10);
    };

    //  uRank initialization options
    var urankOptions = {
        tagCloudRoot: '#tagcloud',
        tagBoxRoot: '#tagbox',
        contentListRoot: '#contentlist',
        visCanvasRoot: '#viscanvas',
        docViewerRoot: '#docviewer'
    };

    // uRank initialization function to be passed as callback
    var init = function(urank){

        _this.urank = urank;
        // Bind event handlers for dataset select
        $("#select-dataset").change(selectDatasetChanged);
        // Bind event handlers for urank specific buttons
        $('#btn-reset').off().on('click', urank.reset);
        $('#btn-sort-by-overall-score').off().on('click', urank.rankByOverallScore);
        $('#btn-sort-by-max-score').off().on('click', urank.rankByMaximumScore);

        $('#select-dataset').trigger('change');
    };

    //  Calling Urank
    UrankLoader(init, urankOptions);

})();

