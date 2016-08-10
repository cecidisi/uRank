
window.RSTagUser = (function(){
    'use strict';

    var _this;
    //  constructor
    function RSTagUser() {
        _this = this;
        this.simsDocUser = {};       //  1 if item was bookmarked by u, otherwise jaccard similarity
        this.simsDocTag = {};        //  keys are doc ids counts repetitions
        this.simsTagUser = {};        //  counts repetitions
    }



    RSTagUser.prototype = {

        init: function(args) {
            this.simsDocUser = args.simsDocUser || {};
            this.simsDocTag = args.simsDocTag || {};
            this.simsTagUser = args.simsTagUser || {};

            console.log(args);
        },

        clear: function() {
            this.simsDocUser = {};
            this.simsDocTag = {};
            this.simsTagUser = {};
        },

        getTagUserScores: function(args) {
            var p = $.extend(true, {
                user: 'new',
                keywords: [],
                data: [],
                options: {
                    tWeight: 1.0,
                    uWeight: 1.0,
                    neighborhoodSize: 20,
                    numRecs: 0,
                    sort: false
                }
            }, args);

            var _data = p.data.slice(),
                keywords = p.keywords,
                user = p.user,
                vSize = parseFloat(p.options.neighborhoodSize);

            ////////////////////////////////////////////
            //   Compute neighborhood
            ////////////////////////////////////////////                    
            if(p.options.uWeight) {
                var initNeighbors = [], neighbors = [];
                keywords.forEach(function(k){
                    initNeighbors = _.union(neighbors, Object.keys(_this.simsTagUser[k.stem]));
                });

                for(var i=0, len=initNeighbors.length; i<len; ++i) {
                    var v = initNeighbors[i];
                    if(v != user) {
                        var simUV = 0.0;
                        keywords.forEach(function(k) {
                            var tag = k.stem;
                            simUV += (_this.simsTagUser[tag] && _this.simsTagUser[tag][v]) ? _this.simsTagUser[tag][v] : 0.0;
                        });
                        if(simUV) {
                            neighbors.push({ user: v, simUV: simUV });
                        }
                    }
                }
                // Sort neighborhood
                neighbors = neighbors.sort(function(v1, v2){
                    if(v1.simUV > v2.simUV) return -1;
                    if(v1.simUV < v2.simUV) return 1;
                    return 0;
                }).slice(0, vSize);
            }
            ////////////////////////////////////////////
            //   Set keywords weights
            ////////////////////////////////////////////
            var simUT = {};
            keywords.forEach(function(k){ simUT[k.stem] = k.weight });
            ////////////////////////////////////////////
            //   Scores
            ////////////////////////////////////////////
            for(var i=0, docsLen=_data.length; i<docsLen; i++) {
                var doc = _data[i],
                    dID = doc.id;
                    //dID = (doc.id).split("doc-").length > 0 ? (doc.id).split("doc-")[1] : doc.id;
                //  Checks that current user has not made any boomark or selected the doc yet
                if (!_this.simsDocUser[dID] || !_this.simsDocUser[dID][p.user]) {

                    var tScore = 0.0, uScore = 0.0, tScoresByTag = {}, uScoresByTag = {};

                    for(var k=0; k<keywords.length; ++k) {                        
                        var tag = keywords[k].stem;
                        ////////////////////////////////////////////
                        //   T-score
                        ////////////////////////////////////////////
                        if(p.options.tWeight) {
                            tScoresByTag[tag] = (_this.simsDocTag[dID] && _this.simsDocTag[dID][tag]) ? _this.simsDocTag[dID][tag] * simUT[tag] * p.options.tWeight: 0.0;
                            tScore += tScoresByTag[tag];
                        }
                        ////////////////////////////////////////////
                        //   U-score
                        ////////////////////////////////////////////
                        uScoresByTag[tag] = 0.0;
                        // search in neighborhood for current tag
                        var simCurDocUsers = {};
                        if(p.options.uWeight) {
                            for(var j=0, nLen=neighbors.length; j<nLen; ++j) {
                                var v = neighbors[j];
                                var simDocNeighbor = (_this.simsDocUser[dID] && _this.simsDocUser[dID][v.user]) ? _this.simsDocUser[dID][v.user] : 0.0;
                                var simTagNeighbor = (_this.simsTagUser[tag] && _this.simsTagUser[tag][v.user]) ? _this.simsTagUser[tag][v.user] : 0.0;
                                var curUscore = (simTagNeighbor * simDocNeighbor * simUT[tag] * p.options.uWeight) / vSize;
                                uScoresByTag[tag] += curUscore;
                            }
                            uScore += uScoresByTag[tag];
                        }
                    }

                    if(!_data[i].ranking) _data[i].ranking;
                    _data[i].ranking.tScore = { total: tScore, scoresByTag: tScoresByTag };
                    _data[i].ranking.uScore = { total: uScore, scoresByTag: uScoresByTag };

                    //console.log('T-score = ' +  _data[i].ranking.tScore.total);
                    //console.log('U-score = ' + _data[i].ranking.uScore.total);
   
                } // end if (!_this.simsDocUser[p.user] || !_this.simsDocUser[p.user][dID])
            }   // end for _data iteration
            return _data;
        }   // end getTagUserScores

    };
    return RSTagUser;
})();

