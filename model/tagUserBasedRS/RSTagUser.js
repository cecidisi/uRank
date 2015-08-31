
window.RSTagUser = (function(){
    'use strict';

    var _this;
    //  constructor
    function RSTagUser() {
        _this = this;
        this.userItemMatrix = {};       //  boolean values
        this.itemTagMatrix = {};        //  counts repetitions
        this.userTagMatrix = {};        //  counts repetitions
        this.maxTagAcrossDocs = {};     //  highest frequency of each tag in a document. Depends on item-tag matrix
        this.maxTagAccrossUsers = {};   //  highest frequency of each tag for a user. Depends on user-tag matrix

        this.init();
    }


    RSTagUser.prototype = {

        init: function() {

            var kw_aux = [
                { query: 'women in workforce', keywords: ['participation&woman&workforce', 'gap&gender&wage', 'inequality&man&salary&wage&woman&workforce']},       // 9
                { query: 'robot', keywords: ['autonomous&robot', 'human&interaction&robot', 'control&information&robot&sensor']},                                   // 7
                { query: 'augmented reality', keywords: ['environment&virtual', 'context&object&recognition', 'augmented&environment&image&reality&video&world']},  // 10
                { query: 'circular economy', keywords: ['management&waste', 'china&industrial&symbiosis', 'circular&economy&fossil&fuel&system&waste']}];           // 10

            function getKeywords(query, questionNumber) {
                var index = _.findIndex(kw_aux, function(kw){ return kw.query == query });
                return kw_aux[index].keywords[questionNumber - 1].split('&');
            }

            function randomFromTo(from, to){
                return Math.floor(Math.random() * (to - from + 1) + from);
            }

            function shuffle(o) {
                for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
                return o;
            }

            var recData = [];

            $.getJSON('../recommender/initial-bookmarks.json', function(data){
                console.log('RS initialized');

                data.forEach(function(r, i){
                    r['tasks-results'].forEach(function(t){
                        t['questions-results'].forEach(function(q, j){
                            var keywords = getKeywords(t.query, q['question-number']);
                            var user = (r.user - 1) * 3 + q['question-number'];

                            q['selected-items'].forEach(function(d){
                                var usedKeywords = shuffle(keywords).slice(0, randomFromTo(2,keywords.length));

                                recData.push({ user: user, doc: d.id, keywords: usedKeywords });
                            });
                        });
                    });
                });

                //  add all evaluation results to recommender
                recData.forEach(function(d){
                    _this.addBookmark(d);
                });
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.log('getJSON request failed! ' + textStatus + ' --- ' + errorThrown.message);
            });
        },

        addBookmark: function(args) {
            var p = $.extend({ user: undefined, doc: undefined, keywords: undefined }, args);

            if(p.user == undefined || p.doc == undefined || p.keywords == undefined)
                return 'Error -- parameter missing';

            //  update user-item matrix
           if(!_this.userItemMatrix[p.user])
               _this.userItemMatrix[p.user] = {};

            _this.userItemMatrix[p.user][p.doc] = true;

            //  item-tag matrix
            if(!_this.itemTagMatrix[p.doc])
                _this.itemTagMatrix[p.doc] = {};

            //  user-tag-matrix
            if(!_this.userTagMatrix[p.user])
                _this.userTagMatrix[p.user] = {};

            // update item-tag, user-tag and tagMax matrices
            p.keywords.forEach(function(k){
                _this.itemTagMatrix[p.doc][k] = (_this.itemTagMatrix[p.doc][k]) ? _this.itemTagMatrix[p.doc][k] + 1 : 1;
                _this.userTagMatrix[p.user][k] = (_this.userTagMatrix[p.user][k]) ? _this.userTagMatrix[p.user][k] + 1 : 1;

                if(!_this.maxTagAcrossDocs[k] || _this.itemTagMatrix[p.doc][k] > _this.maxTagAcrossDocs[k])
                    _this.maxTagAcrossDocs[k] = _this.itemTagMatrix[p.doc][k];

                if(!_this.maxTagAccrossUsers[k] || _this.userTagMatrix[p.user][k] > _this.maxTagAccrossUsers[k])
                    _this.maxTagAccrossUsers[k] = _this.userTagMatrix[p.user][k];
            });
            return 'success';
        },

        getTagUserScores: function(args) {
            var p = $.extend(true, {
                user: 'new',
                keywords: [],
                data: [],
                options: {
                    beta: args.beta,
                    neighborhoodSize: 20,
                    recSize: 0,
                }
            }, args);

            var _data = p.data;
           //  Get neighbors
            var neighbors = [];

            if(p.options.beta < 1) {
                _.keys(_this.userTagMatrix).forEach(function(user){
                    if(user != p.user) {
                        var userScore = 0;
                        p.keywords.forEach(function(k){
                            if(_this.userTagMatrix[user][k.term]) {
                                var normalizedFreq = _this.userTagMatrix[user][k.term] / _this.maxTagAccrossUsers[k.term];
                                var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.userTagMatrix[user][k.term])));
                                userScore += (normalizedFreq * k.weight * scalingFactor / p.keywords.length);
                            }
                        });
                        if(userScore > 0)
                            neighbors.push({ user: user, score: Math.roundTo(userScore, 3) });
                    }
                });

                neighbors = neighbors.sort(function(u1, u2){
                    if(u1.score > u2.score) return -1;
                    if(u1.score < u2.score) return 1;
                    return 0;
                }).slice(0, p.options.neighborhoodSize);
            }

            var recs = [];
            //   Keys are doc ids
            _data.forEach(function(doc){
                //  Checks that current user has not made any boomark or selected the doc yet
                if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][doc.id]) {

                    var tagBasedScore = 0,
                        userBasedScore = 0,
                        tags = {}, users = 0, beta = p.options.beta;

                    //  Compute tag-based score
                    if(p.options.beta > 0) {
                        p.keywords.forEach(function(k){
                            if(_this.itemTagMatrix[doc.id][k.term]) {
                                var normalizedFreq = _this.itemTagMatrix[doc.id][k.term] / _this.maxTagAcrossDocs[k.term];           // normalized item-tag frequency
                                var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.itemTagMatrix[doc.id][k.term])));   // raises final score of items bookmarked many times
                                var tagScore = Math.roundTo((normalizedFreq * k.weight * scalingFactor / p.keywords.length), 3);
                                tags[k.term] = { tagged: _this.itemTagMatrix[doc][k.term], score: tagScore, stem: k.stem };
                                tagBasedScore += tagScore;
                            }
                        });
                    }

                    //  compute user-based score => neighbor similarity * 1 | 0
                    if(p.options.beta < 1) {
                        neighbors.forEach(function(n){
                            if(_this.userItemMatrix[n.user] && _this.userItemMatrix[n.user][doc.id]) {
                                var userScore = (n.score / neighbors.length);
                                userBasedScore += userScore;
                                users++;
                            }
                        });
                    }

                    var finalScore = tagBasedScore * p.options.beta + userBasedScore * (1 - p.options.beta);
                    doc.tuScore = finalScore;
                    doc.tuMisc = {
                        tagcore: Math.roundTo(tagBasedScore, 3),
                        userScore: Math.roundTo(userBasedScore, 3),
                        tags: tags,
                        users: users
                    };

                }
            });
            return _data;
        },

        clear: function() {
            this.userItemMatrix = {};
            this.itemTagMatrix = {};
            this.userTagMatrix = {};
            this.maxTagAcrossDocs = {};
            this.maxTagAccrossUsers = {};
        },

        //  Miscelaneous

        getUserItemMatrix: function() {
            return this.userItemMatrix;
        },

        getUserTagMatrix: function() {
            return this.userTagMatrix;
        },

        getItemTagMatrix: function() {
            return this.itemTagMatrix;
        }

    };
    return RSTagUser;
})();
