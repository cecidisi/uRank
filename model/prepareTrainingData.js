
var prepareTrainingData = (function(){

	var _this;
	function prepareTrainingData(){
		_this = this;
		this.simsDocUser = {};       //  1 if item was bookmarked by u, otherwise jaccard similarity
        this.simsDocTag = {};        //  keys are doc ids counts repetitions
        this.simsTagUser = {};        //  counts repetitions
        this.sumDocTags = {};
        this.sumUserTags = {};
        this.userProfile = {};
	}

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


    function getMeanSdMinMax(arr) {
    	var mean = parseFloat(arr.reduce(function(a1, a2){ return a1+a2 }) / arr.length),
    		sd = Math.sqrt(parseFloat(arr.map(function(a){ return Math.pow(a-mean, 2) }).reduce(function(a1, a2){ return (a1+a2)/arr.length })), 2);
    		min = parseFloat((0.0-mean)/sd),		// z-scored 0
    		max = parseFloat((Math.max.apply(null, arr)-mean)/sd),	// z-scored max
    		diffMinMax = max-min;
    	return { mean: mean, sd: sd, min: min, max: max, diffMinMax: diffMinMax };
    }

	prepareTrainingData.prototype = {

		clear: function(){
			this.simsDocUser = {};
	        this.simsDocTag = {};
	        this.simsTagUser = {};
	        this.sumDocTags = {};
	        this.sumUserTags = {};
	        this.userProfile = {};
		},
		processRawBookmarks: function(rawBookmarks){
			var bookmarks = [];

			rawBookmarks.forEach(function(d, i){
				d['tasks-results'].forEach(function(t){
                    t['questions-results'].forEach(function(q, j){
                        var keywords = getKeywords(t.query, q['question-number']);
                        var user = (d.user - 1) * 3 + q['question-number'];
                        q['selected-items'].forEach(function(d){
                            var usedKeywords = shuffle(keywords).slice(0, randomFromTo(2,keywords.length));
                            bookmarks.push({ user: user, doc: d.id, keywords: usedKeywords });
                        });
                    });
                });
			});

			return bookmarks;
		},

		/*****
		*
		*	@param bookmarks: array of objects ==> { user: 'user id', doc: 'document id', keywords: array of stemmed keywords }
		*	@param documents: array with all documents
		*****/
		getTrainingData: function(bookmarks, documents){

			bookmarks.forEach(function(b){
	            //  Count document-user occurrence
	           if(!_this.simsDocUser[b.doc]) _this.simsDocUser[b.doc] = {};
	            _this.simsDocUser[b.doc][b.user] = 1.0;

	            // Create empty user profile if it doesn't exist
	            if(!_this.userProfile[b.user]) _this.userProfile[b.user] = { tags: {}, totTags: 0 };

	            //  Initialize document in document-tag similarities if not exist
	            if(!_this.simsDocTag[b.doc]) _this.simsDocTag[b.doc] = {};

	            b.keywords.forEach(function(tag) {
					// Update document-tag sims.
	                _this.simsDocTag[b.doc][tag] = (_this.simsDocTag[b.doc][tag]) ? _this.simsDocTag[b.doc][tag] + 1 : 1;
					// Update tag-user sims.
	                if(!_this.simsTagUser[tag]) _this.simsTagUser[tag] = {};
	                _this.simsTagUser[tag][b.user] = _this.simsTagUser[tag][b.user] ? _this.simsTagUser[tag][b.user] + 1 : 1;
	                // update tag totals across users and documents ==> document tags and user tags
	                _this.sumDocTags[tag] = (_this.sumDocTags[tag]) ? _this.sumDocTags[tag] + 1 : 1
	                _this.sumUserTags[tag] = (_this.sumUserTags[tag]) ? _this.sumUserTags[tag] + 1 : 1
	                // update user profile with current tag
	                _this.userProfile[b.user].tags[tag] = (_this.userProfile[b.user].tags[tag]) ? _this.userProfile[b.user].tags[tag] + 1 : 1 ;
	                _this.userProfile[b.user].totTags++;
	            });

			});
			////////////////////////////////////////////////////////////////////////
			// Fill missing explicit document-user similarities with Jaccard coefficients
			////////////////////////////////////////////////////////////////////////
			documents.forEach(function(d){
				var dID = d.id;
					docKeywords = Object.keys(d.keywords);
				Object.keys(_this.userProfile).forEach(function(user){
					if(!_this.simsDocUser[dID] || !_this.simsDocUser[dID][user]) {
						var userKeywords = Object.keys(_this.userProfile[user].tags);
						// Compute Jaccard coefficient between document and user keywords
						var intersectionSize = _.intersection(docKeywords, userKeywords).length;
						var sim = parseFloat(intersectionSize / (docKeywords.length + userKeywords.length - intersectionSize));
						if(sim) {
							if(!_this.simsDocUser[dID]) _this.simsDocUser[dID] = {};
							_this.simsDocUser[dID][user] = sim;
							//console.log('doc = ' + dID + '; user = ' + user + '; sim = ' + _this.simsDocUser[dID][user]);
						}
					}
				});
			});
			////////////////////////////////////////////////////////////////////////
			//  Compute document-tag similarities and normalize in next loop
			////////////////////////////////////////////////////////////////////////
			var simsDocTagArray = [];
			Object.keys(_this.simsDocTag).forEach(function(dID){
				Object.keys(_this.simsDocTag[dID]).forEach(function(tag){
					_this.simsDocTag[dID][tag] = parseFloat(_this.simsDocTag[dID][tag] / _this.sumDocTags[tag]);
					simsDocTagArray.push(_this.simsDocTag[dID][tag]);
				});
			});

			var s = getMeanSdMinMax(simsDocTagArray);
			// Normalize t-scores. First z-normalization, then min-max
			Object.keys(_this.simsDocTag).forEach(function(dID){
				Object.keys(_this.simsDocTag[dID]).forEach(function(tag){
					_this.simsDocTag[dID][tag] = parseFloat((((_this.simsDocTag[dID][tag] - s.mean) / s.sd) - s.min) / s.diffMinMax);
				});
			});
			////////////////////////////////////////////////////////////////////////
			// Compute all user-tag similarities
			////////////////////////////////////////////////////////////////////////
			var simsTagUserArray = [];
			Object.keys(_this.simsTagUser).forEach(function(tag){
				Object.keys(_this.simsTagUser[tag]).forEach(function(user){
					_this.simsTagUser[tag][user] = parseFloat(_this.simsTagUser[tag][user] / _this.sumUserTags[tag]);
					simsTagUserArray.push(_this.simsTagUser[tag][user]);
				});
			});

			var s = getMeanSdMinMax(simsTagUserArray);
			Object.keys(_this.simsTagUser).forEach(function(tag){
				Object.keys(_this.simsTagUser[tag]).forEach(function(user){
					_this.simsTagUser[tag][user] = parseFloat((((_this.simsTagUser[tag][user] - s.mean) / s.sd) - s.min) / s.diffMinMax);
				});
			});

			return {
				simsDocUser: _this.simsDocUser,
				simsDocTag: _this.simsDocTag,
				simsTagUser: _this.simsTagUser
			};

		}


	}; // end prototype




	return prepareTrainingData;

})();
