
var KeywordExtractor = (function(){

    var s = {};
    //  CONSTRUCTOR
    function KeywordExtractor(arguments) {
        s = $.extend({
            minDocFrequency: 5,
            minRepetitionsInDocument: 1,
            maxKeywordDistance: 5,
            minRepetitionsProxKeywords: 4
        }, arguments);


    }

    var collection = [],
        documentKeywords = [],
        collectionKeywords = [],
        allTokens = [];

    var stemmer = natural.PorterStemmer; //natural.LancasterStemmer;
    var tokenizer = new natural.WordTokenizer;
    var nounInflector = new natural.NounInflector();
    var tfidf = new natural.TfIdf();
    var stopWords = natural.stopwords;
    stemmer.attach();
    nounInflector.attach();

    var pos = new Pos();
    var lexer = new pos.Lexer();
    var tagger = new pos.Tagger();

    var POS = {
        NN: 'NN',           // singular noun
        NNS: 'NNS',         // plural noun
        NNP: 'NNP',         // proper noun
        JJ: 'JJ'            // adjective
    };




/************************************************************************************************************************************
*
*   PRIVATE METHODS
*
************************************************************************************************************************************/



    var extractDocumentKeywords = function() {

        //POS tagging
        collection.forEach(function(d, i) {
            d.taggedWords = tagger.tag(lexer.lex(d.text));
        });

        // Find out which adjectives are potentially important and worth keeping
        var keyAdjectives = getKeyAdjectives(collection);

        // Create each item's document to be processed by tf*idf
        collection.forEach(function(d) {
            d.tokens = getFilteredTokens(d.taggedWords, keyAdjectives);                                       // d.tokens contains raw nouns and important adjectives

            $.merge(allTokens, d.tokens);
            tfidf.addDocument(d.tokens.map(function(term){ return term.stem(); }).join(' '));                 // argument = string of stemmed terms in document array
        });

        // Save keywords for each document
        collection.forEach(function(d, i){
            documentKeywords.push(getDocumentKeywords(i));
        });
    };



    var getKeyAdjectives = function(_collection) {

        var candidateAdjectives = [],
            keyAdjectives = [];

        _collection.forEach(function(d, i) {
            // Find out which adjectives are potentially important and worth keeping
            d.taggedWords.forEach(function(tw){
                if(tw[1] == 'JJ'){
                    var adjIndex = _.findIndex(candidateAdjectives, function(ca){ return ca.adj === tw[0].toLowerCase() });
                    if(adjIndex == -1)
                        candidateAdjectives.push({ 'adj': tw[0].toLowerCase(), 'repeated': 1 });
                    else
                        candidateAdjectives[adjIndex].repeated++;
                }
            });
        });

        candidateAdjectives.forEach(function(ca){
            if(ca.repeated >= parseInt(_collection.length * 0.5))
                keyAdjectives.push(ca.adj);
        });
        return keyAdjectives;
    }


    // Filter out meaningless words, keeping only nouns (plurals are singularized) and key adjectives
    var getFilteredTokens = function(taggedWords, keyAdjectives) {
        var filteredTerms = [];
        taggedWords.forEach(function(tw){
            switch(tw[1]){
                case POS.NN:          // singular noun
                    tw[0] = (tw[0].isAllUpperCase()) ? tw[0] : tw[0].toLowerCase();
                    filteredTerms.push(tw[0]); break;
                case POS.NNS:         // plural noun
                    filteredTerms.push(tw[0].toLowerCase().singularizeNoun());
                    break;
                case POS.NNP:         // proper noun
                    tw[0] = (tagger.wordInLexicon(tw[0].toLowerCase())) ? tw[0].toLowerCase().singularizeNoun() : tw[0];
                    filteredTerms.push(tw[0]); break;
                case POS.JJ:
                    if(keyAdjectives.indexOf(tw[0]) > -1)
                        filteredTerms.push(tw[0]); break;
            }
        });
        return filteredTerms;
    }


    var getDocumentKeywords = function(dIndex) {
        var docKeywords = {};

        tfidf.listTerms(dIndex).forEach(function(item){
            if(isNaN(item.term) && parseFloat(item.tfidf) > 0 )
                docKeywords[item.term] = item.tfidf;
        });
        return docKeywords;
    }




    /////////////////////////////////////////////////////////////////////////////

    var extractGlobalKeywords = function() {

        var keywordDictionary = getKeywordDictionary(documentKeywords);

        // get keyword variations
        allTokens.forEach(function(token){
            var stem = token.stem();
            if(keywordDictionary[stem] && stopWords.indexOf(token.toLowerCase()) == -1)
                keywordDictionary[stem].variations[token] =
                    keywordDictionary[stem].variations[token] ? keywordDictionary[stem].variations[token] + 1 : 1;
        });

        // compute keywords in proximity
        keywordDictionary = computeKeywordsInProximity(keywordDictionary);


        // object to array
        _.keys(keywordDictionary).forEach(function(keyword){
            var proxKeywords = [];
            _.keys(keywordDictionary[keyword].keywordsInProximity).forEach(function(proxKeyword){
                var proxKeywordsRepetitions = keywordDictionary[keyword].keywordsInProximity[proxKeyword];
                if(proxKeywordsRepetitions >= s.minRepetitionsProxKeywords)
                    proxKeywords.push({ stem: proxKeyword, repeated: proxKeywordsRepetitions });
            });
            keywordDictionary[keyword].keywordsInProximity = proxKeywords.sort(function(proxK1, proxK2){
                if(proxK1.repeated < proxK2.repeated) return 1;
                if(proxK1.repeated > proxK2.repeated) return -1;
                return 0;
            });

            collectionKeywords.push(keywordDictionary[keyword]);
        });


        collectionKeywords = collectionKeywords
            //.filter(function(ck){ return ck.repeated >= minRepetitions })
            .sort(function(k1, k2){
                if(k1.repeated < k2.repeated) return 1;
                if(k1.repeated > k2.repeated) return -1;
                return 0;
            });

        collectionKeywords.forEach(function(k, i){
            k.term = getRepresentativeTerm(k);
        });
    };




    var getKeywordDictionary = function(_documentKeywords) {

        var keywordDictionary = {};
        _documentKeywords.forEach(function(docKeywords, i){

//            var sum = 0;
//            _.keys(docKeywords).forEach(function(term){
//                sum += docKeywords[term];
//            });
//            var mean = sum / _.keys(docKeywords).length;

            _.keys(docKeywords).forEach(function(stemmedTerm){
                if(!keywordDictionary[stemmedTerm]) {
                    keywordDictionary[stemmedTerm] = {
                        stem: stemmedTerm,
                        term: '',
                        repeated: 1,
                        variations: {},
                        inDocument : [collection[i].id],
                        keywordsInProximity: {}
                    };
                }
                else {
                    keywordDictionary[stemmedTerm].repeated++;
                    keywordDictionary[stemmedTerm].inDocument.push(collection[i].id);
                }
            });
        });


        _.keys(keywordDictionary).forEach(function(keyword){
            if(keywordDictionary[keyword].repeated < s.minDocFrequency)
                delete keywordDictionary[keyword];
        });
        return keywordDictionary;
    };


    var computeKeywordsInProximity = function(_keywordDictionary) {
        collection.forEach(function(d){
            tokenizer.tokenize(d.text).forEach(function(word, i, text){

                var current = word.stem();
                if(_keywordDictionary[current]) {   // current word is keyword

                    for(var j=i-s.maxKeywordDistance; j <= i+s.maxKeywordDistance; j++){
                        var prox = text[j] ? text[j].stem() : STR_UNDEFINED;

                        if(_keywordDictionary[prox] && current != prox) {
                            var proxStem = prox.stem();
                            _keywordDictionary[current].keywordsInProximity[proxStem] =
                                _keywordDictionary[current].keywordsInProximity[proxStem] ?
                                _keywordDictionary[current].keywordsInProximity[proxStem] + 1 : 1;
                        }
                    }
                }


            });
        });

        return _keywordDictionary;
    }






    var getRepresentativeTerm = function(k){

        var keys = _.keys(k.variations);

        // Only one variations
        if(keys.length == 1)
            return keys[0];

        // 2 variations, one in lower case and the other starting in uppercase --> return in lower case
        if(keys.length == 2 && !keys[0].isAllUpperCase() && !keys[1].isAllUpperCase() && keys[0].toLowerCase() === keys[1].toLowerCase())
            return keys[0].toLowerCase();

        // One variation is repeated >= 75%
        var repetitions = 0;
        for(var i = 0; i < keys.length; ++i)
            repetitions += k.variations[keys[i]];

        for(var i = 0; i < keys.length; ++i)
            if(k.variations[keys[i]] >= parseInt(repetitions * 0.75))
                return keys[i];

        // One variation end in 'ion', 'ment', 'ism' or 'ty'
        for(var i = 0; i < keys.length; ++i)
            if(keys[i].match(/ion$/) || keys[i].match(/ment$/) || keys[i].match(/ism$/) || keys[i].match(/ty$/))
                return keys[i].toLowerCase();

        // One variation matches keyword stem
        if(k.variations[k.stem])
            return k.stem;

        // Pick shortest variation
        var shortestTerm = keys[0];
        for(var i = 1; i < keys.length; i++){
            if(keys[i].length < shortestTerm.length)
                shortestTerm = keys[i];
        }
        return shortestTerm.toLowerCase();
    };



/********************************************************************************************************************************************
*
*   PROTOTYPE
*
*********************************************************************************************************************************************/




    KeywordExtractor.prototype = {
        addDocument: function(document, id) {
            document = (!Array.isArray(document)) ? document : document.join(' ');
            id = id || collection.length;
            collection.push({ id: id, text: document });
        },
        processCollection: function() {
            console.log('Started keyword extraction');
            var timestamp = $.now();
            extractDocumentKeywords();
            extractGlobalKeywords();
            console.log('Finished keyword extraction in ' + parseInt($.now() - timestamp).toTime());
            //console.log(collectionKeywords);
        },
        listDocumentKeywords: function(index) {
            return documentKeywords[index];
        },
        getCollectionKeywords: function() {
            return collectionKeywords;
        }

    };

    return KeywordExtractor;

})();












