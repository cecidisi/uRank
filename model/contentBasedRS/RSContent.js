
window.RSContent = (function(){
    'use strict';

    var _this = this;

    function RSContent() {}

    var getEuclidenNorm = function(docKeywords) {
        var acumSquares = 0;
        Object.keys(docKeywords).forEach(function(k){
            acumSquares += docKeywords[k] * docKeywords[k];
        });
        return Math.sqrt(acumSquares);
    };


/****************************************************************************************************
 *
 *   content-based Ranking Prototype
 *
 ****************************************************************************************************/
    RSContent.prototype = {

        getCBScores: function(_data, _keywords) {

            if(_keywords.length > 0) {
                _data.forEach(function(d, i) {
                    var docNorm = getEuclidenNorm(d.keywords);
                    var unitQueryVectorDot = parseFloat(1.00/Math.sqrt(_keywords.length));
                    var max = 0;
                    _keywords.forEach(function(q) {
                    // termScore = tf-idf(d, t) * unitQueryVector(t) * weight(query term) / |d|   ---    |d| = euclidenNormalization(d)
                        var termScore = (d.keywords[q.stem]) ? ((parseFloat(d.keywords[q.stem]) / docNorm) * unitQueryVectorDot *   parseFloat(q.weight)).round(3) :  0;
                        // if item doesn't contain query term => maxScore and overallScore are not changed
                        d.cbScore += termScore;
                        d.cbMaxScore = termScore > d.maxScore ? termScore : d.maxScore;
                        d.cbKeywords.push({ term: q.term, stem: q.stem, weightedScore: termScore });
                    });
                });
            }
        return _data;
        };

    return RSContent;
})();




