
window.bookmarkLoader = (function(){
    'use strict';

    var _this;
    //  cosntructor
    function bookmarkLoader() {
        _this = this;
        this.userItemMatrix = {};       //  boolean values
        this.itemTagMatrix = {};        //  counts repetitions
        this.userTagMatrix = {};        //  counts repetitions
        this.maxTagAcrossDocs = {};     //  highest frequency of each tag in a document. Depends on item-tag matrix
        this.maxTagAccrossUsers = {};   //  highest frequency of each tag for a user. Depends on user-tag matrix

        this.init();
    }


    bookmarkLoader.prototype = {

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
    return bookmarkLoader;
})();
