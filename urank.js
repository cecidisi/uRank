
var Urank = (function(){

    var _this, s = {},
        contentList, tagCloud, tagBox, visCanvas, docViewer;
    // Color scales
    var tagColorRange = colorbrewer.Blues[TAG_CATEGORIES + 1].slice(1, TAG_CATEGORIES+1);
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
        onItemClicked: function(documentId, event){},
        onItemMouseEnter: function(documentId){},
        onItemMouseLeave: function(documentId){},
        onFaviconClicked: function(documentId, event){},
        onWatchiconClicked: function(documentId){},
        onTagInCloudMouseEnter: function(index){},
        onTagInCloudMouseLeave: function(index){},
        onTagInCloudClick: function(index){},
        onDocumentHintClick: function(index){},
        onKeywordHintMouseEnter: function(index){},
        onKeywordHintMouseLeave: function(index){},
        onKeywordHintClick: function(index){},
        onTagDeleted: function(index){},
        onTagDropped: function(index, queryTermColor){},
        onTagInBoxMouseEnter: function(index){},
        onTagInBoxMouseLeave: function(index){},
        onTagInBoxClick: function(index){},
        onReset: function(){},
        onRankByOverallScore: function(){},
        onRankByMaximumScore: function(){}
    };

    var defaultLoadOptions = {
        tagCloud : {
            module: 'default',      // default || landscape
            misc: {
                defaultBlockStyle: true,
                customScrollBars: true
            }
        },
        contentList: {
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
                    hideScrollbar: false, 
                    hideUrankedItems : true,
                    stopPropagation : true
                }
            },
        },
        visCanvas : {
            module: 'ranking',
            customOptions: {               // use only if contentList.custom = true and background in the ranking should match different light and dark background colors
                lightBackgroundColor: '',
                darkBackgroundColor: '',
                stopPropagation : true
            },
            misc: {
                hideScrollbar: true,             
            }
        },
        tagBox: {
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
	        extractedData : {
	        	keywords : {},
	        	keywordsDict: {}
	        }, 
	        extractionEnabled : true
        }
        
    };





    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var EVTHANDLER = {

        onLoad: function(data, options) {

            _this.clear();
            var o = $.extend(true, defaultLoadOptions, options || {});

            //  Set color scales (need to be reset every time a new dataset is loaded)
            o.tagColorArray = o.misc.tagColorArray.length >= TAG_CATEGORIES ? o.misc.tagColorArray : tagColorRange;
            o.queryTermColorArray = o.misc.queryTermColorArray.length >= TAG_CATEGORIES ? o.misc.queryTermColorArray : queryTermColorRange;
            _this.tagColorScale = null;
            _this.tagColorScale = d3.scale.ordinal().domain(d3.range(0, TAG_CATEGORIES, 1)).range(o.tagColorArray);
            _this.queryTermColorScale = null;
            _this.queryTermColorScale = d3.scale.ordinal().range(o.queryTermColorArray);

			//  Clean documents and add them to the keyword extractor
	        _this.data = typeof data == 'string' ? JSON.parse(data) : data.slice();
			
			if(o.keywordExtractor.extractionEnabled) {
	            //  Initialize keyword extractor
	            var keywordExtractorOptions = { minRepetitions: (parseInt(data.length * 0.05) >= 5) ? parseInt(data.length * 0.05) : 5 };
	            var keywordExtractor = new KeywordExtractor(keywordExtractorOptions);
	            	
	            _this.data.forEach(function(d, i){
	                d.index = i;
	                d.title = d.title.clean();
	                d.description = d.description.clean();
	                var document = (d.description) ? d.title +'. '+ d.description : d.title;
	               	d.facets.language = d.facets.language ? d.facets.language : "en"
	                keywordExtractor.addDocument(document.removeUnnecessaryChars(), d.id, d.facets.language );
	            });
	
	            //  Extract collection and document keywords
	            keywordExtractor.processCollection();
	
	            //  Assign document keywords
	            _this.data.forEach(function(d, i){
	                d.keywords = keywordExtractor.listDocumentKeywords(i);
	            });
	            o.keywordExtractor.extractedData.keywords = keywordExtractor.getCollectionKeywords();
	        	o.keywordExtractor.extractedData.keywordsDict = keywordExtractor.getCollectionKeywordsDictionary();
	        }
	        else {
	        	 o.keywordExtractor = options.keywordExtractor; 
	        }

            //  Assign collection keywords and set other necessary variables
            _this.keywords =  o.keywordExtractor.extractedData.keywords; 
            _this.keywordsDict = o.keywordExtractor.extractedData.keywordsDict; 
            _this.rankingMode = RANKING_MODE.overall_score;
            _this.rankingModel.clear().setData(_this.data);
            _this.selectedKeywords = [];
            _this.selectedId = STR_UNDEFINED;

            //  Build blocks
/*            var buildOpt = {
                contentList: o.contentList,
                tagCloud:    o.tagCloud, { customScrollBars: o.misc.customScrollBars }),
                tagBox:      $.extend(o.tagBox, { customScrollBars: o.misc.customScrollBars }),
                visCanvas:   $.extend(o.visCanvas, { customScrollBars: o.misc.customScrollBars }),
                docViewer:   $.extend(o.docViewer, { customScrollBars: o.misc.customScrollBars })
            };*/
            contentList.build(_this.data, o.contentList);
            tagCloud.build(_this.keywords, _this.data, _this.tagColorScale, o.tagCloud, _this.keywordsDict);
            tagBox.build(o.tagBox);
            visCanvas.build(contentList.getListHeight(), o.visCanvas);
            docViewer.build(o.docViewer);

            //  Bind event handlers to resize window and undo effects on random click
            $(window).off('resize', EVTHANDLER.onResize).resize(EVTHANDLER.onResize);
            $(s.root)
            .off({
                'mousedown': EVTHANDLER.onRootMouseDown,
                'click': EVTHANDLER.onRootClick
            }).on({
                'mousedown': EVTHANDLER.onRootMouseDown,
                'click': EVTHANDLER.onRootClick
            });

            //  Custom callback
            s.onLoad.call(this, _this.keywords);
        },
        
        init : function(elemNum) {
       		selectedKeywords = []; 
       		for(i = 0; i <elemNum; i++) {
       			if(i < _this.keywords.length) {
       				var keywordObj = {}
	       			keywordObj.stem = _this.keywords[i].stem; 
	            	keywordObj.term = _this.keywords[i].term;
	            	keywordObj.weight = 1; 
	            	EVTHANDLER.onTagDropped(i);
	            	selectedKeywords.push(keywordObj); 
	          
	           	}
       		}
       		EVTHANDLER.onChange(selectedKeywords); 
        },

        onChange: function(selectedKeywords) {

            _this.selectedKeywords = selectedKeywords;
            _this.selectedId = STR_UNDEFINED;

            var rankingData = _this.rankingModel.update(_this.selectedKeywords, _this.rankingMode).getRanking();
            var status = _this.rankingModel.getStatus();
            contentList.update(rankingData, status, _this.selectedKeywords, _this.queryTermColorScale);
            visCanvas.update(_this.rankingModel, _this.queryTermColorScale, contentList.getListHeight());
            docViewer.clear();
            tagCloud.clearEffects();

            s.onChange.call(this, rankingData, _this.selectedKeywords, status);
        },


        onTagDropped: function(index) {
            var queryTermColor = _this.queryTermColorScale(_this.keywords[index].stem);
            tagBox.dropTag(index, queryTermColor);
            s.onTagDropped.call(this, index, queryTermColor);
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
            // TODO
            s.onTagInCloudClick.call(this, index);
        },

        onKeywordHintEnter: function(index) {
            tagCloud.keywordHintMouseEntered(index);
            s.onKeywordHintMouseEnter.call(this, index);
        },

        onKeywordHintLeave: function(index) {
            tagCloud.keywordHintMouseLeft(index);
            s.onKeywordHintMouseLeave.call(this, index);
        },

        onKeywordHintClick: function(index) {
            tagCloud.keywordHintClicked(index);
            s.onKeywordHintClick.call(this, index);
        },

        onDocumentHintClick: function(index) {
            tagCloud.documentHintClicked(index);
            var idsArray = _this.keywords[index].inDocument;
            contentList.highlightListItems(idsArray);
            visCanvas.highlightItems(idsArray).resize(contentList.getListHeight());

            s.onDocumentHintClick.call(this, index);
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

        onItemClicked : function(documentId, event) {
            _this.selectedId = _this.selectedId === documentId ? STR_UNDEFINED : documentId;

            if(_this.selectedId !== STR_UNDEFINED) {    // select
                contentList.selectListItem(documentId);
                visCanvas.selectItem(documentId);
                docViewer.showDocument(_this.rankingModel.getDocumentById(documentId), _this.selectedKeywords.map(function(k){return k.stem}), _this.queryTermColorScale);
            }
            else {                   // deselect
                contentList.deselectAllListItems();
                visCanvas.deselectAllItems();
                docViewer.clear();
            }
            tagCloud.clearEffects();
            s.onItemClicked.call(this, documentId, event);
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

        onFaviconClicked: function(documentId, event){
            contentList.toggleFavicon(documentId);
            s.onFaviconClicked.call(this, documentId, event);
        },

        onWatchiconClicked: function(documentId) {
            contentList.toggleWatchListItem(documentId);
            s.onWatchiconClicked.call(this, documentId);
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

        // Event handlers to return
        onRankByOverallScore: function() {
            _this.rankingMode = RANKING_MODE.overall_score;
            EVTHANDLER.onChange(_this.selectedKeywords);
            s.onRankByOverallScore.call(this);
        },

        onRankByMaximumScore: function() {
            _this.rankingMode = RANKING_MODE.max_score;
            EVTHANDLER.onChange(_this.selectedKeywords);
            s.onRankByMaximumScore.call(this);
        },

        onReset: function(event) {
            if(event) event.stopPropagation();
            contentList.reset();
            tagCloud.reset();
            tagBox.clear();
            visCanvas.reset();
            docViewer.clear();
            _this.rankingModel.reset();
            _this.selectedId = STR_UNDEFINED;
            _this.selectedKeywords = [];
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
/*            contentList.destroy();
            visCanvas.destroy();*/
        }
    };



    // Constructor
    function Urank(arguments) {

        _this = this;
        // default user-defined arguments
        s = $.extend(defaultInitOptions, arguments);

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
                onDocumentHintClick: EVTHANDLER.onDocumentHintClick,
                onKeywordHintMouseEnter : EVTHANDLER.onKeywordHintEnter,
                onKeywordHintMouseLeave : EVTHANDLER.onKeywordHintLeave,
                onKeywordHintClick : EVTHANDLER.onKeywordHintClick
            },

            tagBox: {
                root: s.tagBoxRoot,
                onChange: EVTHANDLER.onChange,
                onTagDropped: EVTHANDLER.onTagDropped,
                onTagDeleted: EVTHANDLER.onTagDeleted,
                onTagInBoxMouseEnter: EVTHANDLER.onTagInBoxMouseEnter,
                onTagInBoxMouseLeave: EVTHANDLER.onTagInBoxMouseLeave,
                onTagInBoxClick: EVTHANDLER.onTagInBoxClick
            },

            visCanvas: {
                root: s.visCanvasRoot,
                onItemClicked: EVTHANDLER.onItemClicked,
                onItemMouseEnter: EVTHANDLER.onItemMouseEnter,
                onItemMouseLeave: EVTHANDLER.onItemMouseLeave,
                onScroll: EVTHANDLER.onParallelBlockScrolled
            },

            docViewer: {
                root: s.docViewerRoot
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
                mode: _this.rankingMode,
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
        init : EVTHANDLER.init,
        reset: EVTHANDLER.onReset,
        rankByOverallScore: EVTHANDLER.onRankByOverallScore,
        rankByMaximumScore: EVTHANDLER.onRankByMaximumScore,
        clear: EVTHANDLER.onClear,
        destroy: EVTHANDLER.onDestroy,
        getCurrentState: MISC.getCurrentState
    };

    return Urank;
})();
