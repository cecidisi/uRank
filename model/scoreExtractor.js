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

        process: function(){
            // extarct score set
            this.scoreSet = [];
            this.scoreSetDict = {};

            this.items.forEach(function(d, i){
                if(Array.isArray(d.scores)) {
                    d.scores.forEach(function(s){});
                }
                else {
                    Object.keys(d.scores).forEach(function(score){
                        if(!_this.scoreSetDict[score])
                            _this.scoreSetDict[score] = { frequency: 0, max: 0 };
                        _this.scoreSetDict[score].frequency++;
                        _this.scoreSetDict[score].max = d.scores[score] > _this.scoreSetDict[score].max ? d.scores[score]: _this.scoreSetDict[score].max;
                    });
                }
            });

            Object.keys(_this.scoreSetDict).forEach(function(score){
                _this.getScoreSet.push({ score: score, frequency: _this.scoreSetDict[score].frequency, max: _this.scoreSetDict[score].max });
            });

            // get normalized scores
            var scoreKeys = Object.keys(this.scoreSetDict);
            this.normalizedScores = [];
            this.items.forEach(function(item){
                item.normalizedScores = {};
                scoreKeys.forEach(fucn);

            });

        },

        getNormalizedItemScores: function(){
            return this.normalizedScores;
        },

        getScoreSet: function(){
            return { dict: _this.scoreSetDict, array: _this.scoreSet };
        }

    };

    return ScoreExtractor;
})();
