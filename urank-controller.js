
var UrankController = (function(){

    var _this,
        s = {},
        contentList, tagCloud, tagBox, visCanvas, docViewer;

    // Color scales
    var tagColorRange = colorbrewer.Blues[TAG_CATEGORIES + 1].slice(1, TAG_CATEGORIES+1);
  //  tagColorRange.splice(tagColorRange.indexOf("#08519c"), 1, "#2171b5");
    var queryTermColorRange = colorbrewer.Set1[9];
    queryTermColorRange.splice(queryTermColorRange.indexOf("#ffff33"), 1, "#ffd700");

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var EVTHANDLER = {

        onLoad: function(data, keywords) {
            contentList.build(data);
            tagCloud.build(keywords, data.length);
            tagBox.build();
            visCanvas.build();
            docViewer.build();
            _this.selectedId = STR_UNDEFINED;
            _this.selectedKeywords = [];
            s.onLoad.call(this, _this.keywords);
        },
        onChange: function(selectedKeywords, newQueryTermColorScale) {

            _this.selectedKeywords = selectedKeywords;
            _this.queryTermColorScale = newQueryTermColorScale;
            _this.selectedId = STR_UNDEFINED;

            var rankingData = _this.rankingModel.update(selectedKeywords, _this.rankingMode);
            var status = _this.rankingModel.getStatus();
            contentList.update(rankingData, status, _this.selectedKeywords, _this.queryTermColorScale);
            visCanvas.update(_this.rankingModel, $(s.contentListRoot).height(), _this.queryTermColorScale);
            docViewer.clear();
            tagCloud.removeEffects();
            s.onChange.call(this, rankingData, _this.selectedKeywords);
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
            visCanvas.highlightItems(idsArray);
            s.onDocumentHintClick.call(this, index);
        },
        onTagDeleted: function(index) {
            tagCloud.restoreTag(index);
            s.onTagDeleted.call(this, index);
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
            tagCloud.removeEffects();
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
            //this.data[i].isSelected = ! this.data[index].isSelected;         //CHECK
            contentList.switchFaviconOnOrOff(documentId);
            s.onFaviconClicked.call(this, documentId);
        },
        onWatchiconClicked: function(documentId) {
            contentList.watchOrUnwatchListItem(documentId);
            s.onWatchiconClicked.call(this, documentId);
        },
        // Event handlers to return
        onRankByOverallScore: function() {
            _this.rankingMode = RANKING_MODE.overall_score;
            EVTHANDLER.onChange(tagBox.getKeywordsInBox(), _this.queryTermColorScale);
            s.onRankByOverallScore.call(this);
        },
        onRankByMaximumScore: function() {
            _this.rankingMode = RANKING_MODE.max_score;
            EVTHANDLER.onChange(tagBox.getKeywordsInBox(), _this.queryTermColorScale);
            s.onRankByMaximumScore.call(this);
        },
        onReset: function() {
            _this.rankingModel.reset();
            contentList.reset();
            tagCloud.reset();
            tagBox.clear();
            visCanvas.clear();
            docViewer.clear();
            _this.selectedId = STR_UNDEFINED;
            _this.selectedKeywords = [];
            s.onReset.call(this);
        },
        onResize: function(event) {
            visCanvas.resize();
        },
        onClear: function(event){
            event.stopPropagation();
            if(event.which == 1) {
                contentList.deselectAllListItems();
                contentList.hideUnrankedListItems(_this.rankingModel.getRanking());
                visCanvas.deselectAllItems();
                docViewer.clear();
                tagCloud.removeEffects();
            }
        }
    };



    // Constructor
    function Urank(arguments) {

        _this = this;
        this.rankingModel = new RankingModel();
        this.selectedKeywords = [];
        this.selectedId = STR_UNDEFINED;

        // user-defined arguments
        s = $.extend({
            tagCloudRoot: '',
            tagBoxRoot: '',
            contentListRoot: '',
            visCanvasRoot: '',
            docViewerRoot: '',
            tagColorArray: tagColorRange,
            queryTermColorArray: queryTermColorRange,
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
            onDocumentHintClick: function(index){},
            onKeywordHintMouseEnter: function(index){},
            onKeywordHintMouseLeave: function(index){},
            onKeywordHintClick: function(index){},
            onTagDeleted: function(index){},
            onTagInBoxMouseEnter: function(index){},
            onTagInBoxMouseLeave: function(index){},
            onTagInBoxClick: function(index){},
            onReset: function(){},
            onRankByOverallScore: function(){},
            onRankByMaximumScore: function(){}
        }, arguments);

        // Set color scales
        s.tagColorArray = s.tagColorArray.length >= TAG_CATEGORIES ? s.tagColorArray : tagColorRange;
        this.tagColorScale = d3.scale.ordinal().domain(d3.range(0, TAG_CATEGORIES, 1)).range(s.tagColorArray);
        s.queryTermColorArray = s.queryTermColorArray.length >= TAG_CATEGORIES ? s.queryTermColorArray : queryTermColorRange;
        this.queryTermColorScale = d3.scale.ordinal().range(s.queryTermColorArray);

        var options = {
            contentList: {
                root: s.contentListRoot,
                onItemClicked: EVTHANDLER.onItemClicked,
                onItemMouseEnter: EVTHANDLER.onItemMouseEnter,
                onItemMouseLeave: EVTHANDLER.onItemMouseLeave,
                onFaviconClicked: EVTHANDLER.onFaviconClicked,
                onWatchiconClicked: EVTHANDLER.onWatchiconClicked
            },

            tagCloud: {
                root: s.tagCloudRoot,
                colorScale: this.tagColorScale,
                dropIn: s.tagBoxRoot,
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
                colorScale: _this.queryTermColorScale,
                onChange: EVTHANDLER.onChange,
                onTagDeleted: EVTHANDLER.onTagDeleted,
                onTagInBoxMouseEnter: EVTHANDLER.onTagInBoxMouseEnter,
                onTagInBoxMouseLeave: EVTHANDLER.onTagInBoxMouseLeave,
                onTagInBoxClick: EVTHANDLER.onTagInBoxClick
            },

            visCanvas: {
                root: s.visCanvasRoot,
                //visModule: VIS_MODULES.ranking,
                onItemClicked: EVTHANDLER.onItemClicked,
                onItemMouseEnter: EVTHANDLER.onItemMouseEnter,
                onItemMouseLeave: EVTHANDLER.onItemMouseLeave
            },

            docViewer: {
                root: s.docViewerRoot,
            }
        };

        contentList = new ContentList(options.contentList);
        tagCloud = new TagCloud(options.tagCloud);
        tagBox = new TagBox(options.tagBox);
        visCanvas = new VisCanvas(options.visCanvas);
        docViewer = new DocViewer(options.docViewer);

        $(window).resize(EVTHANDLER.onResize);
        $('body').on('mousedown', EVTHANDLER.onClear);
    }



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    function extendKeywordsWithColorCategory(keywords){

        var extent = d3.extent(keywords, function(k){ return k['repeated']; });
        var range = (extent[1] - 1) * 0.1;   // / TAG_CATEGORIES;

        keywords.forEach(function(k){
            var colorCategory = parseInt((k['repeated'] - 1/*extent[0]*/) / range);
            k['colorCategory'] = (colorCategory < TAG_CATEGORIES) ? colorCategory : TAG_CATEGORIES - 1;
        });
        return keywords;
    };


    var _loadData = function(data) {

        data = JSON.parse(data);
        var kwOptions = {
            minRepetitions : (parseInt(data.length * 0.05) >= 5) ? parseInt(data.length * 0.05) : 5
        };

        var keywordExtractor = new KeywordExtractor(kwOptions);

        data.forEach(function(d){
            d.isSelected = false;
            d.title = d.title.clean();
            d.description = d.description.clean();
            var document = (d.description) ? d.title +'. '+ d.description : d.title;
            keywordExtractor.addDocument(document.removeUnnecessaryChars(), d.id);
        });

        keywordExtractor.processCollection();

        data.forEach(function(d, i){
            d.keywords = keywordExtractor.listDocumentKeywords(i);
        });
        this.data = data;
        var keywords = keywordExtractor.getCollectionKeywords();
        this.keywords = extendKeywordsWithColorCategory(keywords);
        this.rankingMode = RANKING_MODE.overall_score;
        _this.rankingModel.setData(this.data);

        EVTHANDLER.onLoad.call(this, this.data, this.keywords);
    };


    var _reset = function() {
        EVTHANDLER.onReset.call(this);
    };

    var _rankByOverallScore = function() {
        EVTHANDLER.onRankByOverallScore.call(this);
    };

    var _rankByMaximumScore = function() {
        EVTHANDLER.onRankByMaximumScore.call(this);
    };


    Urank.prototype = {
        loadData: _loadData,
        reset: _reset,
        rankByOverallScore: _rankByOverallScore,
        rankByMaximumScore: _rankByMaximumScore
    };

    return Urank;
})();
