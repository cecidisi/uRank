
var RankingModel = (function(){
    'use strict';

    var _this;

    function RankingModel() {
        _this = this;
        this.cbRS = new RSContent();
        this.tuRS = new RSTagUser();
        this.clear();
    }


    /*******************************************
    * Functions
    *******************************************/
    var assignRankingPositions = function(_data, _score){
        var currentScore = Number.MAX_VALUE;
        var currentPos = 1;
        var itemsInCurrentPos = 0;
        _data.forEach(function(d, i){
            if(d.ranking[_score] > 0){
                if( d.ranking[_score] < currentScore ){
                    currentPos = currentPos + itemsInCurrentPos;
                    currentScore = d.ranking[_score];
                    itemsInCurrentPos = 1;
                } else{
                    itemsInCurrentPos++;
                }
                d.ranking.pos = currentPos;
            } else{
                d.ranking.pos = 0;
            }
        });
        return _data;
    };


    //  Calculates the number of positions changed by each recommendations, basing on the array "previousRanking"
    //  If there doesn't exist a previous ranking or a recommendation wasn't previously ranked, then the value 1000 is assigned
    var addPositionsChanged = function(_data){
        _data.forEach(function(d, i){
            if(_this.previousRanking.length == 0){
                d.ranking.posChanged = 1000;
                d.ranking.lastIndex = i;
            }
            else{
                var j = _.findIndex(_this.previousRanking, function(oldItem){ return oldItem.id == d.id; });

                d.lastIndex = j;
                if(_this.previousRanking[j].ranking.pos === 0)
                    d.ranking.posChanged = 1000;
                else
                    d.ranking.posChanged = _this.previousRanking[j].ranking.pos - d.ranking.pos;
            }
        });
        return _data;
    };



    /**
     *	Creates the ranking items with default values and calculates the weighted score for each selected keyword (tags in tag box)
     * */
    var updateRanking =  function(opt){
        var score = opt.mode;
        var cbWeight = (score == RANKING_MODE.overall) ? opt.rWeight : 1;
        var tuWeight = (score == RANKING_MODE.overall) ? (1- opt.rWeight) : 1;

        var ranking = _this.data.slice();
        ranking.forEach(function(d){ d.ranking = {}; });
        ranking = _this.cbRS.getCBScores({ data: ranking, keywords: opt.query, options: { rWeight: cbWeight } });
        ranking = _this.tuRS.getTagUserScores({ user: opt.user, keywords: opt.query, data: ranking, options: { rWeight: tuWeight } });
        ranking.forEach(function(d){
            d.ranking.overallScore = d.ranking.cbScore + d.ranking.tuScore;
        });


        var secScore = opt.mode == RANKING_MODE.by_CB ? RANKING_MODE.by_TU : (opt.mode == RANKING_MODE.by_TU ? RANKING_MODE.by_CB : undefined)

        ranking = ranking.sort(function(d1, d2){
            if(d1.ranking[score] > d2.ranking[score]) return -1;
            if(d1.ranking[score] < d2.ranking[score]) return 1;
            if(d1.ranking[secScore] && d1.ranking[secScore] > d2.ranking[secScore]) return -1;
            if(d1.ranking[secScore] && d1.ranking[secScore] < d2.ranking[secScore]) return 1;
            return 0;
        });
        ranking = assignRankingPositions(ranking, score);
        ranking = addPositionsChanged(ranking);
        return ranking;
    };



    var updateStatus =  function() {

        if(_this.ranking.length == 0)
            return RANKING_STATUS.no_ranking;

        if(_this.previousRanking.length == 0)
            return RANKING_STATUS.new;

        for(var i in _this.ranking) {
            if(_this.ranking[i].ranking.posChanged > 0)
                return RANKING_STATUS.update;
        }
        return RANKING_STATUS.unchanged;
    };



/****************************************************************************************************
 *
 *   RankingModel Prototype
 *
 ****************************************************************************************************/
    RankingModel.prototype = {

        setData: function(data) {
            this.data = data.slice() || [];
            return this;
        },

        addData: function(_data) {

            this.data = $.merge(this.data, _data)
            return this;
        },

        update: function(options) {
            var opt = $.extend(true, {
                query: [],
                mode: window.RANKING_MODE.by_CB,
                rWeight: 0.5,
                user: 'NN'
            }, options);
            this.query = opt.query;
            this.mode = options.mode;
            this.rWeight = options.rWeight;
            this.previousRanking = this.ranking.slice();
            this.ranking = updateRanking(opt);
            this.status = updateStatus();
            return this;
        },

        reset: function() {
            this.previousRanking = [];
            this.ranking = [];
            this.status = updateStatus();
            this.query = [];
            return this;
        },

        clear: function() {
            this.ranking = [];
            this.previousRanking = [];
            this.data = [];
            this.query = [];
            this.status = RANKING_STATUS.no_ranking;
            this.mode = RANKING_MODE.by_CB;
            return this;
        },

        getRanking: function() {
            return this.ranking;
        },

        getStatus: function() {
            return this.status;
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
        }
    };

    return RankingModel;
})();




