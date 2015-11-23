
var RankingModel = (function(){
    'use strict';

    var _this;

    function RankingModel(attr) {
        _this = this;
        this.clear();
    }

    /*******************************************
    * Functions
    *******************************************/
    var assignRankingPositionsAndShift = function(_feature){
        var currentScore = Number.MAX_VALUE;
        var currentPos = 1;
        var itemsInCurrentPos = 0;
        var a = _this.ranking.slice();
        a.forEach(function(d, i){
            // position
            if(d.selectedFeatures[_feature] > 0){
                if( d.selectedFeatures[_feature] < currentScore ){
                    currentPos = currentPos + itemsInCurrentPos;
                    currentScore = d.selectedFeatures[_feature];
                    itemsInCurrentPos = 1;
                } else{
                    itemsInCurrentPos++;
                }
                d.ranking.pos = currentPos;
            } else{
                d.ranking.pos = 0;
            }
            // shift computation
            d.ranking.posChanged = d.ranking.prevPos > 0 ? d.ranking.prevPos - d.ranking.pos : 1000;
        });
        return a;
    };



    /**
     *	Creates the ranking items with default values and calculates the weighted score for each selected keyword (tags in tag box)
     * */
    var updateRanking =  function(opt){
//        var score = opt.mode;
//        var cbWeight = (score == RANKING_MODE.overall.attr) ? opt.rWeight : 1;
//        var tuWeight = (score == RANKING_MODE.overall.attr) ? (1- opt.rWeight) : 1;
//
        var ranking = _this.ranking.slice();
//
//        ranking.forEach(function(d){ d.ranking.prevPos = d.ranking.pos; });
//        if(opt.ranking.content)
//            ranking = _this.cbRS.getCBScores({ data: ranking, keywords: opt.query, options: { rWeight: cbWeight } });
//
//        ranking.forEach(function(d){
//            d.ranking.overallScore = 0;
//            if(opt.ranking.content)
//                d.ranking.overallScore += d.ranking.cbScore;
//            if(opt.ranking.social)
//                d.ranking.overallScore += d.ranking.tuScore;
//        });
//
//        var secScore = undefined;
//        if(opt.mode === RANKING_MODE.by_CB.attr && RANKING_MODE.by_TU.active) secScore = RANKING_MODE.by_TU.attr;
//        else if(opt.mode == RANKING_MODE.by_TU.attr && RANKING_MODE.by_CB.active) secScore = RANKING_MODE.by_CB.attr;
//        //var secScore = opt.mode == RANKING_MODE.by_CB.attr ? RANKING_MODE.by_TU.attr : (opt.mode == RANKING_MODE.by_TU ? RANKING_MODE.by_CB : undefined)
//
//        ranking = ranking.sort(function(d1, d2){
//            if(d1.ranking[score] > d2.ranking[score]) return -1;
//            if(d1.ranking[score] < d2.ranking[score]) return 1;
//            if(d1.ranking[secScore] && d1.ranking[secScore] > d2.ranking[secScore]) return -1;
//            if(d1.ranking[secScore] && d1.ranking[secScore] < d2.ranking[secScore]) return 1;
//            return 0;
//        });
//        ranking = assignRankingPositionsAndShift(ranking, score);
        return ranking;
    };



    var updateStatus =  function() {

        if(_this.ranking.length === 0)
            return _this.STATUS.no_ranking;
        return _this.STATUS.update;

//        if(_this.status === _this.STATUS.no_ranking)
//            return _this.STATUS.new;
//
//        for(var i in _this.ranking) {
//            if(_this.ranking[i].ranking.posChanged > 0)
//                return _this.STATUS.update;
//        }
//        return _this.STATUS.unchanged;
    };



/****************************************************************************************************
 *
 *   RankingModel Prototype
 *
 ****************************************************************************************************/
    RankingModel.prototype = {

        setData: function(data) {
            this.status = this.STATUS.no_ranking;
            this.data = data.slice() || [];
            this.ranking = this.data.slice();
            this.ranking.forEach(function(d, i){
                d.selectedFeatures = {};
                d.ranking = {
                    pos: i,
                    posChanged: 0,
                    prevPos: 0,
                    overallScore: 0
                };
            });
            return this;
        },

        update: function(options) {
            var opt = $.extend(true, {
                user: 'NN',
                query: [],
                mode: window.RANKING_MODE.by_CB.attr,
                rWeight: 0.5,
                ranking: { content: true, social: false }
            }, options);
            this.query = opt.query;
            this.mode = opt.mode;
            this.rWeight = opt.rWeight;
            this.ranking = this.query.length > 0 ? updateRanking(opt) : [];
            this.status = updateStatus();
            return this;
        },

        reset: function() {
            this.ranking = [];
            this.status = updateStatus();
            this.query = [];
            return this;
        },

        clear: function() {
            this.ranking = [];
            this.data = [];
            this.query = [];
            this.status = this.STATUS.no_ranking;
            this.scoreType = 'score';
            return this;
        },

        getRanking: function() {
            return this.ranking;
        },

        getStatus: function() {
            return this.status;
        },

        getRankingDict: function(){
            var dict = {};
            this.ranking.forEach(function(d){ dict[d.id] = d; });
            return dict;
        },

        getOriginalData: function() {
            return this.data;
        },

        getMode: function() {
            return this.mode;
        },

        getQuery: function() {
            return this.query;
        },

        getMaxTagFrequency: function(){
            return this.tuRS.getmaxSingleTagFrequency();
        },

        getActualIndex: function(index){
            if(this.status == RANKING_STATUS.no_ranking)
                return index;
            return this.ranking[index].originalIndex;
        },
        getDocumentById: function(id) {
            var getId = function(d){ return d.id === id };
            return this.status === RANKING_STATUS.no_ranking ? this.data[_.findIndex(this.data, getId)] : this.ranking[_.findIndex(this.ranking, getId)];
        },
        getDocumentByIndex: function(index) {
            return this.status === RANKING_STATUS.no_ranking ? this.data[index] : this.ranking[index];
        },
        STATUS: {
            no_ranking: 'no_ranking',
            new: 'new',
            update: 'update',
            unchanged: 'unchanged'
        },

        setScoreType: function(scoreType){ this.scoreType = scoreType; },

        selectFeatures: function(features){
            this.ranking.forEach(function(d) {
                d.selectedFeatures = {};
                features.forEach(function(f) {
                    d.selectedFeatures[f] = d.features[f][_this.scoreType];
                });
            });
            return this.ranking;
        },

        sortByFeature : function(feature, invert){
            feature = feature || 'normScore';
            invert = invert || false;
            _this.ranking.forEach(function(d){ d.ranking.prevPos = d.ranking.pos; });
            _this.ranking = _this.ranking.sort(function(d1, d2){
                if(d1.selectedFeatures[feature] > d2.selectedFeatures[feature]) return -1;
                if(d1.selectedFeatures[feature] < d2.selectedFeatures[feature]) return 1;
                return 0;
            });
            _this.ranking = assignRankingPositionsAndShift(feature);
            updateStatus();
            return this.ranking;
        }
    };

    return RankingModel;
})();




