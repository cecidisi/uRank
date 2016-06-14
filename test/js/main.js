(function(){

    var _this = this;
    this.data = [];

    var dsm = new datasetManager();
    var actionLogger = new ActionLogger();

    var $message = $('.processing-message'),
        $numResultsMsg = $('.num-results-msg'),
        $bookmarks = $('.control-panel .container .bookmark-area'),
        $bookmarkTitle = $('.control-panel h4');

    var testOptionsDef = {
        model: {
            social: false
        },
        docViewer : {
            misc: {
                facetsToShow: ['year']
            }
        },
        keywordExtractor :{
            maxKeywordDistance: 2,
            minRepetitionsProxKeywords: 5
        }
    };

    var bookmarks = [];


    // Fill dataset select options and bind event handler
    var datasetOptions = "<option value='null'>Select topic</option>";
    dsm.getIDsAndDescriptions().forEach(function(ds){
        datasetOptions += "<option value='" + ds.id + "'>" + ds.description + "</option>";
    });
    $("#select-dataset").html(datasetOptions)

    // Event handler for dataset-select change
    var selectDatasetChanged = function(){
        var datasetId = $("#select-dataset").val(),
            topic= dsm.getDescription(datasetId);

        if(datasetId !== 'null') {
            $message.show();
            actionLogger.log(actionLogger.action.topicSelected, { datasetId: datasetId, topic: topic })
            setTimeout(function(){
                dsm.getDataset(datasetId, function(dataset){
                    _this.data = dataset;
                    testOptionsDef.keywordExtractor.minRepetitions = (parseInt(_this.data.length * 0.05) >= 5) ? parseInt(_this.data.length * 0.05) : 5
                    _this.urank.loadData(dataset, testOptionsDef);
                    $message.fadeOut();
                    $numResultsMsg.html(dataset.length + ' Results');
                });
            }, 0);
        }
    };


    var removeBookmark = function(document){
        _this.data[document.index].bookmarked = false;
        bookmarks.splice($('#bookmark-' + document.id).attr('b-index'), 1);
        $('#bookmark-' + document.id).slideUp().remove();
        $bookmarkTitle.html('Bookmarked Documents (' + bookmarks.length + ')');
        console.log(bookmarks);
    };

    var addBookmark = function(document){
        var $item = $('<div/>', { id: 'bookmark-' + document.id, 'b-index': bookmarks.length }).appendTo($bookmarks).addClass('item');
        $('<a/>', { class: 'doc-icon', href: '#' }).appendTo($item);
        $('<span/>').appendTo($item).html(document.title.substr(0, 35) + ' ...');
        $('<a/>', { class: 'remove-icon', href: '#'}).appendTo($item).on('click', function(event){
            removeBookmark(document);
            _this.urank.unbookmarkItem(document.id, document.index);
        });
        _this.data[document.index].bookmarked = true;
        bookmarks.push(_this.data[document.index]);
        $bookmarkTitle.html('Bookmarked Documents (' + bookmarks.length + ')');
        console.log(bookmarks);
    };


    /********************************************************************************************************/
    /******************************************* start uRank ************************************************/
    /********************************************************************************************************/


    //  uRank initialization options
    var urankOptions = {
        tagCloudRoot: '#tagcloud',
        tagBoxRoot: '#tagbox',
        contentListRoot: '#contentlist',
        visCanvasRoot: '#viscanvas',
        // tag actions -> exploration/control
        onTagInCloudMouseEnter: function(tag){
            actionLogger.log(actionLogger.action.tagHovered, tag);
        },
        onTagInCloudClick: function(tag){
            actionLogger.log(actionLogger.action.tagClicked, tag);
        },
        onTagDropped: function(droppedTags, dropMode){
            if(dropMode === 'single')
                actionLogger.log(actionLogger.action.tagDropped, droppedTags[0]);
            else
                actionLogger.log(actionLogger.action.multipleTagsDropped, droppedTags);
        },
        onTagDeleted: function(tag){
            actionLogger.log(actionLogger.action.tagDeleted, tag);
        },
        onTagWeightChanged: function(tag){
            actionLogger.log(actionLogger.action.tagWeightChanged, tag);
        },
        onReset: function(){
            actionLogger.log(actionLogger.action.reset);
        },
        // document actions
        onItemClicked: function(document){
            actionLogger.log(actionLogger.action.documentClicked, document);
        },
        onFaviconClicked: function(document){
            if(_this.data[document.index].bookmarked) {
                removeBookmark(document);
                actionLogger.log(actionLogger.action.documentUnbookmarked, document);
            }
            else {
                addBookmark(document);
                actionLogger.log(actionLogger.action.documentBookmarked, { document: document, keywords: _this.urank.getSelectedKeywords() });
            }
        },
        onWatchiconClicked: function(document){
            if(_this.data[document.index].watched) {
                actionLogger.log(actionLogger.action.documentUnwatched, document);
                _this.data[document.index].watched = false;
            }
            else {
                actionLogger.log(actionLogger.action.documentWatched, document);
                _this.data[document.index].watched = true;
            }
        },
        // misc
        onTagFrequencyChanged: function(min, max){
            actionLogger.log(actionLogger.action.frequencyChanged, { min: min, max: max });
        },
        onKeywordEntered: function(term){
            actionLogger.log(actionLogger.action.wordSearched, { term: term.term});
        }
    };

    // uRank initialization function to be passed as callback
    var init = function(urank){
        _this.urank = urank;
        //$('#select-dataset').trigger('change');
    };

    //  Calling Urank
    UrankLoader(init, urankOptions);

    /********************************************************************************************************/
    /******************************************* End uRank **************************************************/
    /********************************************************************************************************/

    // Bind event handlers for dataset select
    $("#select-dataset").change(selectDatasetChanged);
    // Bind event handlers for urank specific buttons
    $('#btn-action-logs').click(function(){
        console.log(actionLogger.getFullLogs());
    })

    $('#btn-finish').click(function(){
        var user = Math.random().toString(36).slice(2);
        localStorage['user'] = user;

        var host = './server/save-log.php';
        $.post(host, { data: actionLogger.getFullLogs(), filename: user+'__'+getTimestamp() })
            .done(function(response){
                console.log(response);
                window.location.href = 'test-finished.html';
            })
            .fail(function(jqXHR){
                console.log('post failed');
                console.log(jqXHR);
            });
    });


    $.get("http://ipinfo.io", function(response) {
        actionLogger.log(actionLogger.action.ipLogged, response);
    }, "jsonp");

    //actionLogger.getActionCount();

})();

