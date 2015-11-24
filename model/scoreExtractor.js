window.ScoreExtractor = (function(){

    var _this;

    function ScoreExtractor() {
        _this = this;
        this.items = [];
        this.normalizedScores = [];
        this.scoreSet = [];
        this.scoreSetDict = {};
    }


    ScoreExtractor.prototype = {

        addItem: function(_item){
            this.items.push(_item);
            return this;
        },

        process: function(featureField){
            // extarct score set
            this.scoreSet = [];
            this.scoreSetDict = {};

            this.items.forEach(function(d, i){
                if(Array.isArray(d.scores)) {
                    d[featureField].forEach(function(s){});
                }
                else {
                    Object.keys(d[featureField]).forEach(function(feature, i){
                        if(!_this.scoreSetDict[feature])
                            _this.scoreSetDict[feature] = { index: i, repeated: 0, max: 0 };
                        _this.scoreSetDict[feature].repeated++;
                        _this.scoreSetDict[feature].max = d.scores[feature] > _this.scoreSetDict[feature].max ? d.scores[feature]: _this.scoreSetDict[feature].max;
                    });
                }
            });

            Object.keys(_this.scoreSetDict).forEach(function(score){
                _this.scoreSet.push({
                    name: score,
                    stem: score,
                    term: score,
                    index: _this.scoreSetDict[score].index,
                    repeated: _this.scoreSetDict[score].repeated,
                    max: _this.scoreSetDict[score].max
                });
            });

            // get normalized scores
            var scoreKeys = Object.keys(this.scoreSetDict);
            this.normalizedScores = [];
            this.items.forEach(function(item, i){
                _this.normalizedScores.push({});
                scoreKeys.forEach(function(score){
                    _this.normalizedScores[i][score] = {
                        normScore: Math.roundTo(item.scores[score] / _this.scoreSetDict[score].max, 2),
                        score: item.scores[score]
                    }
                });
            });
        },

        getNormalizedItemScores: function(index){
            return this.normalizedScores[index];
        },

        getAllNormalizedScores: function(){
            return this.normalizedScores;
        },

        getScoreSet: function(){
            return { dict: _this.scoreSetDict, array: _this.scoreSet };
        }

    };

    return ScoreExtractor;
})();
