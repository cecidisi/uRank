
var Urank = (function(){

    /////
    var _this, s = {},
        contentList, tagCloud, tagBox, visCanvas, docViewer;
    // Color scales
//    var tagColorRange = colorbrewer.Blues[TAG_CATEGORIES + 1].slice(1, TAG_CATEGORIES+1);
    var tagColorRange = colorbrewer.Greys[TAG_CATEGORIES + 2].slice(2, TAG_CATEGORIES+2);
  //  tagColorRange.splice(tagColorRange.indexOf("#08519c"), 1, "#2171b5");
    var queryTermColorRange = colorbrewer.Set1[9];
    queryTermColorRange.splice(queryTermColorRange.indexOf("#ffff33"), 1, "#ffd700");

    //   defaults
    var defaultInitOptions = {
        root: 'body',
        tagCloudRoot: '',
        tagBoxRoot: '',
        contentListRoot: '',
        visCanvasRoot: '',
        docViewerRoot: '',
        onLoad: function(keywords){},
        onChange: function(rankingData, selecedKeywords){},
        onItemClicked: function(documentId){},
        onItemMouseEnter: function(documentId){},
        onItemMouseLeave: function(documentId){},
        onFaviconClicked: function(documentId){},
        onWatchiconClicked: function(documentId){},
        onTagInCloudMouseEnter: function(index){},
        onTagInCloudMouseLeave: function(index){},
        onTagInCloudClick: function(index){},
        onTagDeleted: function(index){},
        onTagDropped: function(droppedTags, dropMode){},
        onTagInBoxMouseEnter: function(index){},
        onTagInBoxMouseLeave: function(index){},
        onTagInBoxClick: function(index){},
        onTagFrequencyChanged: function(min, max){},
        onKeywordEntered: function(term){},
        onDocViewerHidden: function(){}
    };

    var defaultLoadOptions = {
        model: {
        //    'content-based-only': true
            content: true,
            social: false
        },
        tagCloud : {
            module: 'default'      // default || landscape
        },
        contentList: {
            header: true,        // boolean
            custom: false,
            customOptions: {     //  only used when contentListType.custom = true
                selectors: {
                    root: '',
                    ul: '',
                    liClass: '',
                    liTitle: '',
                    liRankingContainer: '',  // will be formatted
                    watchicon: '',           // adds watchicon in placeholder
                    favicon: ''              // adds favicon in placeholder
                },
                classes: {
                    liHoverClass: '',
                    liLightBackgroundClass: '',
                    liDarkBackgroundClass: ''
                },
                misc: {
                    hideScrollbar: false
                }
            },
        },
        visCanvas : {
            module: 'default',
            ranking: {},
            customOptions: {               // use only if contentList.custom = true and background in the ranking should match different light and dark background colors
                lightBackgroundColor: '',
                darkBackgroundColor: ''
            },
            misc: {
                hideScrollbar: true
            }
        },
        tagBox: {
            ranking: {},
            misc: {
                defaultBlockStyle: true
            }
        },
        docViewer: {
            misc: {
                defaultBlockStyle: true,
                customScrollBars: true,
                facetsToShow: []
            }
        },
        misc: {
            tagColorArray: tagColorRange,
            queryTermColorArray: queryTermColorRange,
        },
        keywordExtractor: {
            minDocFrequency: 2,
            minRepetitionsInDocument: 1,
            maxKeywordDistance: 5,
            minRepetitionsProxKeywords: 4
        }
    };





    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var EVTHANDLER = {

        onLoad: function(data, options) {

            _this.clear();
        //    var o = $.extend(true, defaultLoadOptions, options || {});
            _this.loadOpt = $.extend(true, defaultLoadOptions, options || {});

            //  Set color scales (need to be reset every time a new dataset is loaded)
            _this.loadOpt.tagColorArray = _this.loadOpt.misc.tagColorArray.length >= TAG_CATEGORIES ? _this.loadOpt.misc.tagColorArray : tagColorRange;
            _this.loadOpt.queryTermColorArray = _this.loadOpt.misc.queryTermColorArray.length >= TAG_CATEGORIES ? _this.loadOpt.misc.queryTermColorArray : queryTermColorRange;
            _this.tagColorScale = null;
            _this.tagColorScale = d3.scale.ordinal().domain(d3.range(0, TAG_CATEGORIES, 1)).range(_this.loadOpt.tagColorArray);
            _this.queryTermColorScale = null;
            _this.queryTermColorScale = d3.scale.ordinal().range(_this.loadOpt.queryTermColorArray);

            //  Initialize keyword extractor
            var keywordExtractorOptions = { minRepetitions: (parseInt(data.length * 0.05) >= 5) ? parseInt(data.length * 0.05) : 5 };
            var keywordExtractor = new KeywordExtractor(keywordExtractorOptions);

            //  Clean documents and add them to the keyword extractor
            _this.data = typeof data == 'string' ? JSON.parse(data) : data.slice();

            _this.data.forEach(function(d, i){
                d.index = i;
                d.title = d.title.clean();
                d.description = d.description.clean();
                var document = (d.description) ? d.title +'. '+ d.description : d.title;
                keywordExtractor.addDocument(document.removeUnnecessaryChars(), d.id);
            });

            //  Extract collection and document keywords
            keywordExtractor.processCollection();
            //  Assign document keywords
            _this.data.forEach(function(d, i){
                d.keywords = keywordExtractor.listDocumentKeywords(i);
            });

            //  Assign collection keywords and set other necessary variables
            _this.keywords = keywordExtractor.getCollectionKeywords();
            _this.keywordsDict = keywordExtractor.getCollectionKeywordsDictionary();
            _this.rMode = RANKING_MODE.by_CB.attr;
            _this.rWeight = 0.5;
            _this.rankingModel.clear().setData(_this.data);
            _this.selectedKeywords = [];
            _this.selectedId = undefined;
            RANKING_MODE.by_CB.active = _this.loadOpt.model.content;
            RANKING_MODE.by_TU.active = _this.loadOpt.model.social;

            _this.loadOpt.tagBox.ranking = _this.loadOpt.model;
//            _this.loadOpt.visCanvas.ranking = _this.loadOpt.model;
            tagCloud.build(_this.keywords, _this.data, _this.tagColorScale, _this.loadOpt.tagCloud, _this.keywordsDict);
            tagBox.build(_this.loadOpt.tagBox);
            contentList.build(_this.data, _this.loadOpt.contentList, tagBox.getHeight());
            visCanvas.build(_this.data, contentList.getListHeight(), _this.loadOpt.visCanvas);
            docViewer.build(_this.loadOpt.docViewer);

            //  Bind event handlers to resize window and undo effects on random click
            $(window).off('resize', EVTHANDLER.onResize).resize(EVTHANDLER.onResize);
            $(document).off('keydown', EVTHANDLER.onKeyDown).on('keydown', EVTHANDLER.onKeyDown);
            $(s.root).off({
                'mousedown': EVTHANDLER.onRootMouseDown,
                'click': EVTHANDLER.onRootClick
            }).on({
                'mousedown': EVTHANDLER.onRootMouseDown,
                'click': EVTHANDLER.onRootClick
            });
            //  Custom callback
            s.onLoad.call(this, _this.keywords);
        },

        onChange: function(selectedKeywords) {

            _this.selectedKeywords = selectedKeywords || _this.selectedKeywords;
            _this.selectedId = undefined;

            var updateOpt = {
                user: 'NN',
                query: _this.selectedKeywords,
                mode: _this.rMode,
                rWeight: _this.rMode === RANKING_MODE.overall.attr ? _this.rWeight : 1,
                ranking: _this.loadOpt.model
            };

            var rankingData = _this.rankingModel.update(updateOpt).getRanking();
            var status = _this.rankingModel.getStatus();

            console.log(_this.rankingModel);
            contentList.update(rankingData, status, _this.selectedKeywords, _this.queryTermColorScale);
            visCanvas.update(_this.rankingModel, {
                colorSclae: _this.queryTermColorScale,
                height: contentList.getListHeight(),
                ranking: _this.loadOpt.model
            });
            docViewer.clear();
            tagCloud.clearEffects();

            s.onChange.call(this, rankingData, _this.selectedKeywords, status);
        },

        onTagDropped: function(tagIndices) {
            var droppedTags = [];
            var dropMode = tagIndices.length > 1 ? 'multiple' : 'single';
            tagIndices.forEach(function(index){
                var queryTermColor = _this.queryTermColorScale(_this.keywords[index].stem);
                var tag = { index: index, stem: _this.keywords[index].stem, term: _this.keywords[index].term, color: queryTermColor, weight: 1 };
                tagBox.dropTag(tag);
                tagCloud.updateClonOfDroppedTag(index, queryTermColor);
                droppedTags.push(tag);
            });
            s.onTagDropped.call(this, droppedTags, dropMode);
        },

        onTagDeleted: function(index) {
            tagBox.deleteTag(index);
            tagCloud.restoreTag(index);
            s.onTagDeleted.call(this, index);
        },

        onTagInCloudMouseEnter: function(index) {
            tagCloud.hoverTag(index);
            s.onTagInCloudMouseEnter.call(this, index);
        },

        onTagInCloudMouseLeave: function(index) {
            tagCloud.unhoverTag(index);
            s.onTagInCloudMouseLeave.call(this, index);
        },

        onTagInCloudClick: function(index) {
            //tagCloud.tagClicked(index);
            var idsArray = _this.keywords[index].inDocument;
            contentList.highlightListItems(idsArray);
            visCanvas.highlightItems(idsArray).resize(contentList.getListHeight());
            s.onTagInCloudClick.call(this, index);
        },

        onKeywordEntered: function(keyword){
            tagCloud.focusTag(keyword);
            s.onKeywordEntered.call(this, keyword);
        },

        onTagFrequencyChanged: function(min, max){
            tagCloud.showTagsWithinRange(min, max)
            s.onTagFrequencyChanged.call(this, min, max);
        },

        onTagInBoxMouseEnter: function(index) {
            // TODO
            s.onTagInBoxMouseEnter.call(this, index);
        },

        onTagInBoxMouseLeave: function(index) {
            // TODO
            s.onTagInBoxMouseLeave.call(this, index);
        },

        onTagInBoxClick: function(index) {
            // TODO
            s.onTagInBoxClick.call(this, index);
        },

        onItemClicked : function(documentId) {
//            _this.selectedId = _this.selectedId === documentId ? STR_UNDEFINED : documentId;
            _this.selectedId = documentId;

//            if(_this.selectedId !== STR_UNDEFINED) {    // select
                contentList.selectListItem(documentId);
                visCanvas.selectItem(documentId);
                docViewer.showDocument(_this.rankingModel.getDocumentById(documentId), _this.selectedKeywords.map(function(k){return k.stem}), _this.queryTermColorScale);
//            }
//            else {                   // deselect
//                contentList.deselectAllListItems();
//                visCanvas.deselectAllItems();
//                docViewer.clear();
//            }
            tagCloud.clearEffects();
            s.onItemClicked.call(this, documentId);
        },

        onItemMouseEnter: function(documentId) {
            contentList.hover(documentId);
            visCanvas.hoverItem(documentId);
            s.onItemMouseEnter.call(this, documentId);
        },

        onItemMouseLeave: function(documentId) {
            contentList.unhover(documentId);
            visCanvas.unhoverItem(documentId);
            s.onItemMouseLeave.call(this, documentId);
        },

        onFaviconClicked: function(documentId){
            contentList.toggleFavicon(documentId);
            s.onFaviconClicked.call(this, documentId);
        },

        onWatchiconClicked: function(documentId) {
            contentList.toggleWatchListItem(documentId);
            s.onWatchiconClicked.call(this, documentId);
        },


        onDocViewerHidden: function() {
            docViewer.clear();
            contentList.deselectAllListItems();
            visCanvas.deselectAllItems();
        },

        onRootMouseDown: function(event){
            event.stopPropagation();
            if(event.which == 1) {
                tagCloud.clearEffects();
            }
        },

        onRootClick: function(event) {
            if(event.which == 1) {
                contentList.clearEffects();
                visCanvas.clearEffects().resize(contentList.getListHeight());
                docViewer.clear();
            }
        },

        onParallelBlockScrolled: function(sender, offset) {
            if(sender === contentList)
                visCanvas.scrollTo(offset);
            else if(sender == visCanvas)
                contentList.scrollTo(offset);
        },

        onResize: function(event) {
            visCanvas.resize();
        },

        onKeyDown: function(event){
            if(event.keyCode === 27)
                EVTHANDLER.onDocViewerHidden();
        },

        // Event handlers to return

        onRankingModeChange: function(mode) {
            setTimeout(function(){
                if(_this.rMode !== mode) {
                    _this.rMode = mode;
                    tagBox.updateRankingMode(_this.rMode);
                    if(_this.selectedKeywords.length > 0)
                        EVTHANDLER.onChange();
                }
            }, 0);
        },

        onRankingWeightChange: function(rWeight) {
            setTimeout(function(){
                _this.rWeight = rWeight;
                if(_this.selectedKeywords.length > 0)
                    EVTHANDLER.onChange();
            }, 0);
        },

        onReset: function(event) {
            if(event) event.stopPropagation();
            contentList.reset();
            tagBox.reset();
            //tagCloud.reset();
            visCanvas.reset();
            docViewer.clear();
            _this.selectedKeywords.forEach(function(kw){
                setTimeout(function(){
                    tagCloud.restoreTag(kw.index);
                }, 0);
            });
            _this.selectedKeywords = [];
        },

        onDestroy: function() {
            tagCloud.destroy();
            tagBox.destroy();
            contentList.destroy();
            visCanvas.destroy();
            docViewer.destroy();
        },

        onClear: function() {
            tagCloud.clear();
            tagBox.clear();
            docViewer.clear();
//            contentList.clear();
            //visCanvas.destroy();
        }
    };



    // Constructor
    function Urank(arguments) {

        _this = this;
        // default user-defined arguments
        s = $.extend(true, defaultInitOptions, arguments || {});

        var options = {
            contentList: {
                root: s.contentListRoot,
                onItemClicked: EVTHANDLER.onItemClicked,
                onItemMouseEnter: EVTHANDLER.onItemMouseEnter,
                onItemMouseLeave: EVTHANDLER.onItemMouseLeave,
                onFaviconClicked: EVTHANDLER.onFaviconClicked,
                onWatchiconClicked: EVTHANDLER.onWatchiconClicked,
                onScroll: EVTHANDLER.onParallelBlockScrolled
            },

            tagCloud: {
                root: s.tagCloudRoot,
                onTagInCloudMouseEnter: EVTHANDLER.onTagInCloudMouseEnter,
                onTagInCloudMouseLeave: EVTHANDLER.onTagInCloudMouseLeave,
                onTagInCloudClick: EVTHANDLER.onTagInCloudClick,
                onKeywordEntered: EVTHANDLER.onKeywordEntered,
                onTagFrequencyChanged: EVTHANDLER.onTagFrequencyChanged
            },

            tagBox: {
                root: s.tagBoxRoot,
                onChange: EVTHANDLER.onChange,
                onModeChanged: EVTHANDLER.onRankingModeChange,
                onRankingWeightChanged: EVTHANDLER.onRankingWeightChange,
                onTagDropped: EVTHANDLER.onTagDropped,
                onTagDeleted: EVTHANDLER.onTagDeleted,
                onTagInBoxMouseEnter: EVTHANDLER.onTagInBoxMouseEnter,
                onTagInBoxMouseLeave: EVTHANDLER.onTagInBoxMouseLeave,
                onTagInBoxClick: EVTHANDLER.onTagInBoxClick,
                onReset: EVTHANDLER.onReset
            },

            visCanvas: {
                root: s.visCanvasRoot,
                onItemClicked: EVTHANDLER.onItemClicked,
                onItemMouseEnter: EVTHANDLER.onItemMouseEnter,
                onItemMouseLeave: EVTHANDLER.onItemMouseLeave,
                onScroll: EVTHANDLER.onParallelBlockScrolled
            },

            docViewer: {
                root: s.docViewerRoot,
                onDocViewerHidden: EVTHANDLER.onDocViewerHidden
            }
        };

        this.data = [];
        this.keywords = [];
        this.keywordsDict = {};
        this.rankingModel = new RankingModel();

        contentList = new ContentList(options.contentList);
        tagCloud = new TagCloud(options.tagCloud);
        tagBox = new TagBox(options.tagBox);
        visCanvas = new VisCanvas(options.visCanvas);
        docViewer = new DocViewer(options.docViewer);
    }



    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Miscelaneous

    var MISC = {
        getCurrentState: function(){
            return {
                mode: _this.rMode,
                status: _this.rankingModel.getStatus(),
                selectedKeywords: _this.selectedKeywords.map(function(sk){ return { term: sk.term, weight: sk.weight } }),
                ranking: _this.rankingModel.getRanking().map(function(d){
                    return {
                        id: d.id,
                        title: d.title,
                        rankingPos: d.rankingPos,
                        overallScore: d.overallScore,
                        maxScore: d.maxScore,
                        positionsChanged: d.positionsChanged,
                        weightedKeywords: d.weightedKeywords.map(function(wk){ return { term: wk.term, weightedScore: wk.weightedScore } })
                    }
                })
            };
        }

    };



    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype


    Urank.prototype = {
        loadData: EVTHANDLER.onLoad,
        reset: EVTHANDLER.onReset,
        clear: EVTHANDLER.onClear,
        destroy: EVTHANDLER.onDestroy,
        getCurrentState: MISC.getCurrentState
    };

    return Urank;
})();
