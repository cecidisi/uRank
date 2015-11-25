
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
        onChange: function(rankingData, selectedFeatures){},
        onItemClicked: function(document){},
        onItemMouseEnter: function(document){},
        onItemMouseLeave: function(document){},
        onFaviconClicked: function(document){},
        onWatchiconClicked: function(document){},
        onTagInCloudMouseEnter: function(tag){},
        onTagInCloudMouseLeave: function(tag){},
        onTagInCloudClick: function(tag){},
        onTagDropped: function(droppedTags, dropMode){},
        onTagDeleted: function(tag){},
        onTagWeightChanged: function(tag){},
        onTagInBoxMouseEnter: function(index){},
        onTagInBoxMouseLeave: function(index){},
        onTagInBoxClick: function(index){},
        onTagFrequencyChanged: function(min, max){},
        onKeywordEntered: function(term){},
        onDocViewerHidden: function(){},
        onReset: function(){}
    };

    var defaultLoadOptions = {
        model: {
            normalize: true,
            featureField: 'ranks',
            defaultFeatures: [],
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
            maxNumberTags: 5,
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
            _this.loadOpt = $.extend(true, defaultLoadOptions, options || {});
            //  Set color scales (need to be reset every time a new dataset is loaded)
            _this.loadOpt.tagColorArray = _this.loadOpt.misc.tagColorArray.length >= TAG_CATEGORIES ? _this.loadOpt.misc.tagColorArray : tagColorRange;
            _this.loadOpt.queryTermColorArray = _this.loadOpt.misc.queryTermColorArray.length >= TAG_CATEGORIES ? _this.loadOpt.misc.queryTermColorArray : queryTermColorRange;
            _this.tagColorScale = null;
            _this.tagColorScale = d3.scale.ordinal().domain(d3.range(0, TAG_CATEGORIES, 1)).range(_this.loadOpt.tagColorArray);
            _this.queryTermColorScale = null;
            _this.queryTermColorScale = d3.scale.ordinal().range(_this.loadOpt.queryTermColorArray);


            _this.data = typeof data == 'string' ? JSON.parse(data) : data.slice();
            //  Initialize keyword extractor
            //var keywordExtractor = new KeywordExtractor(_this.loadOpt.keywordExtractor);

            //  Assign collection keywords and set other necessary variables

            _this.scoreType = _this.loadOpt.model.normalize ? 'normScore' : 'score';
            _this.featureField = _this.loadOpt.model.featureField;
            _this.rWeight = 0.5;

            // Feature extraction
            _this.scoreExtractor = new ScoreExtractor();
            _this.data.forEach(function(d, i){
                d.index = i;
                _this.scoreExtractor.addItem(d);
            });
            _this.scoreExtractor.process(_this.featureField);
            //  Assign document keywords
            _this.data.forEach(function(d, i){
                d.features = _this.scoreExtractor.getNormalizedItemScores(i);
            });
            _this.features = _this.scoreExtractor.getScoreSet().array;
            _this.featuresDict = _this.scoreExtractor.getScoreSet().dict;

            _this.selectedFeatures = [];
            _this.selectedId = undefined;
            _this.rankingModel.clear().setData(_this.data);
            _this.rankingModel.setScoreType(_this.scoreType);

            console.log(_this.data[0]);
            console.log(_this.features[0]);

            _this.loadOpt.tagBox.ranking = _this.loadOpt.model;
            tagBox.build(_this.features, _this.loadOpt.tagBox);
            tagCloud.build(_this.features, _this.data, _this.tagColorScale, _this.loadOpt.tagCloud, _this.featuresDict);
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

            console.log(_this.loadOpt.model.defaultFeatures);
            var preselectedFeatures = _this.loadOpt.model.defaultFeatures.map(function(pf){ return _this.featuresDict[pf].index });
            EVTHANDLER.onAutomaticTagSelected(preselectedFeatures);
            //  Custom callback
            s.onLoad.call(this, _this.features);
        },

        onAutomaticTagSelected: function(featureIndices){
            tagCloud.preselectTags(featureIndices);
            tagBox.preselectTags(featureIndices);
        },

        onChange: function(selectedFeatures) {

            _this.selectedFeatures = selectedFeatures || _this.selectedFeatures;
            _this.selectedId = undefined;

//            var updateOpt = {
//                user: 'NN',
//                query: _this.selectedFeatures,
//                mode: _this.rMode,
//                rWeight: _this.rMode === RANKING_MODE.overall.attr ? _this.rWeight : 1,
//                ranking: _this.loadOpt.model
//            };

            var tsmp = $.now();
            _this.rankedData = _this.rankingModel.selectFeatures(_this.selectedFeatures.map(function(f){ return f.name; }));
//            var status = _this.rankingModel.getStatus();
//            console.log(status);
//            console.log(_this.rankingModel);
//            setTimeout(function(){
//                console.log('Elapsed time = '+ ($.now() - tsmp));
//                contentList.update(rankingData, status, _this.selectedFeatures, _this.queryTermColorScale);

/*            contentList.update(_this.rankingModel, { colorScale: _this.queryTermColorScale });*/
//                console.log('Elapsed time = '+ ($.now() - tsmp));
//            }, 0);

            visCanvas.update({
                data: _this.rankedData,
                selectedFeatures: _this.selectedFeatures,
                colorScale: _this.queryTermColorScale
            });

//            }, 0);
            tagBox.updateSelectableFeatures();
            docViewer.clear();
            tagCloud.clearEffects();

//            s.onChange.call(this, rankingData, _this.selectedFeatures, status);
        },

        onTagInBoxClick: function(index) {
            var feature = _this.features[index].name;
            _this.rankedData = _this.rankingModel.sortByFeature(feature);
            contentList.update({ data: _this.rankedData, selectedFeatures: _this.selectedFeatures });
            visCanvas.update({
                data: _this.rankedData,
                selectedFeatures: _this.selectedFeatures,
                colorScale: _this.queryTermColorScale
            });

            s.onTagInBoxClick.call(this, index);
        },


        onFeatureTagChanged: function(oldTagIndex, newTagIndex){
            var queryTermColor = _this.queryTermColorScale(_this.features[newTagIndex].stem);
            var tag = $.extend(true, { color: queryTermColor, weight: 1 }, _this.features[newTagIndex]);

            tagCloud.preselectTags(newTagIndex);
            tagBox.dropTag(tag, oldTagIndex);
            tagCloud.updateClonOfDroppedTag(newTagIndex, queryTermColor);
            tagBox.removeTag(oldTagIndex);
            tagCloud.restoreTag(oldTagIndex);
        },


        onTagDropped: function(tagIndices) {
            var droppedTags = [];
            var dropMode = tagIndices.length > 1 ? 'multiple' : 'single';
            tagIndices.forEach(function(index){
                var queryTermColor = _this.queryTermColorScale(_this.features[index].stem);
                var tag = $.extend(true, { color: queryTermColor, weight: 1 }, _this.features[index]);
//                var tag = { index: index, stem: _this.features[index].stem, term: _this.features[index].term, name: _this.features[index].name, color: queryTermColor, weight: 1 };
                tagBox.dropTag(tag);
                tagCloud.updateClonOfDroppedTag(index, queryTermColor);
                droppedTags.push(tag);
            });
            s.onTagDropped.call(this, droppedTags, dropMode);
        },

        onTagDeleted: function(index) {
            tagBox.removeTag(index);
            tagCloud.restoreTag(index);
            var tag = { index: index, stem: _this.features[index].stem, term: _this.features[index].term };
            s.onTagDeleted.call(this, tag);
        },

        onTagWeightChanged: function(index, weight){
//            var tag = { index: index, stem: _this.features[index].stem, term: _this.features[index].term, weight: weight };
//            s.onTagWeightChanged.call(this, tag);
        },

        onTagInCloudMouseEnter: function(index) {
            tagCloud.hoverTag(index);
//            var tag = { index: index, term: _this.features[index].term }
//            s.onTagInCloudMouseEnter.call(this, tag);
        },

        onTagInCloudMouseLeave: function(index) {
            tagCloud.unhoverTag(index);
//            var tag = { index: index, term: _this.features[index].term }
//            s.onTagInCloudMouseLeave.call(this, tag);
        },

        onTagInCloudClick: function(index) {
            //tagCloud.tagClicked(index);
            var idsArray = _this.features[index].inDocument;
            contentList.highlightListItems(idsArray);
            visCanvas.highlightItems(idsArray).resize(contentList.getListHeight());
//            var tag = { index: index, term: _this.features[index].term }
//            s.onTagInCloudClick.call(this, tag);
        },

        onKeywordEntered: function(keyword){
            tagCloud.focusTag(keyword);
//            s.onKeywordEntered.call(this, keyword);
        },

        onTagFrequencyChanged: function(min, max){
            tagCloud.showTagsWithinRange(min, max)
//            s.onTagFrequencyChanged.call(this, min, max);
        },

        onTagInBoxMouseEnter: function(index) {
            // TODO
            s.onTagInBoxMouseEnter.call(this, index);
        },

        onTagInBoxMouseLeave: function(index) {
            // TODO
            s.onTagInBoxMouseLeave.call(this, index);
        },

        onItemClicked : function(documentId, index) {
//            _this.selectedId = _this.selectedId === documentId ? STR_UNDEFINED : documentId;
            _this.selectedId = documentId;
            contentList.selectListItem(documentId, index);
            visCanvas.selectItem(documentId, index);
            docViewer.showDocument(_this.rankingModel.getDocumentById(documentId), _this.selectedFeatures.map(function(k){return k.stem}), _this.queryTermColorScale);
            tagCloud.clearEffects();
//            s.onItemClicked.call(this, { index: index, id: documentId, title: _this.data[index].title });
        },

        onItemMouseEnter: function(documentId, index) {
            contentList.hover(documentId, index);
            visCanvas.hoverItem(documentId, index);
            s.onItemMouseEnter.call(this, { index: index, id: documentId, title: _this.data[index].title });
        },

        onItemMouseLeave: function(documentId, index) {
            contentList.unhover(documentId, index);
            visCanvas.unhoverItem(documentId, index);
            s.onItemMouseLeave.call(this, { index: index, id: documentId, title: _this.data[index].title });
        },

        onFaviconClicked: function(documentId, index){
            contentList.toggleFavicon(documentId), index;
            s.onFaviconClicked.call(this, { index: index, id: documentId, title: _this.data[index].title });
        },

        onWatchiconClicked: function(documentId, index) {
            contentList.toggleWatchListItem(documentId, index);
            s.onWatchiconClicked.call(this, { index: index, id: documentId, title: _this.data[index].title });
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
                    if(_this.selectedFeatures.length > 0)
                        EVTHANDLER.onChange();
                }
            }, 0);
        },

        onRankingWeightChange: function(rWeight) {
            setTimeout(function(){
                _this.rWeight = rWeight;
                if(_this.selectedFeatures.length > 0)
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
            _this.selectedFeatures.forEach(function(kw, i){
//                setTimeout(function(){
                    tagCloud.restoreTag(kw.index);
//                }, (i+1)*50);
            });
            _this.selectedFeatures = [];
            s.onReset.call(this);
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
        },

        bookmarkItem: function(documentId, index){
            _this.data[index].bookmarked = true;
            contentList.toggleFavicon(documentId);
        },

        unbookmarkItem: function(documentId, index){
            _this.data[index].bookmarked = false;
            contentList.toggleFavicon(documentId);
        },

        focusOnItem: function(itemId){
            contentList.focusOnItem(itemId);
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
                onTagWeightChanged: EVTHANDLER.onTagWeightChanged,
                onTagInBoxMouseEnter: EVTHANDLER.onTagInBoxMouseEnter,
                onTagInBoxMouseLeave: EVTHANDLER.onTagInBoxMouseLeave,
                onTagInBoxClick: EVTHANDLER.onTagInBoxClick,
                onAutomaticTagSelected: EVTHANDLER.onAutomaticTagSelected,
                onFeatureTagChanged: EVTHANDLER.onFeatureTagChanged,
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
        this.rankedData = [];
        this.features = [];
        this.featuresDict = {};
        this.rankingModel = new RankingModel();
        this.scoreExtractor = new ScoreExtractor();
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
                selectedFeatures: _this.selectedFeatures.map(function(sk){ return { term: sk.term, weight: sk.weight } }),
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
        },
        getSelectedFeatures: function(){ return _this.selectedFeatures }

    };


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype


    Urank.prototype = {
        loadData: EVTHANDLER.onLoad,
        clear: EVTHANDLER.onClear,
        destroy: EVTHANDLER.onDestroy,
        focusOnItem: EVTHANDLER.focusOnItem,
        bookmarkItem: EVTHANDLER.bookmarkItem,
        unbookmarkItem: EVTHANDLER.unbookmarkItem,
        getCurrentState: MISC.getCurrentState,
        getSelectedFeatures: MISC.getSelectedFeatures
    };

    return Urank;
})();
