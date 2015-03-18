
var KeywordExtractor = (function(){

    //  CONSTRUCTOR
    function KeywordExtractor(arguments) {
        this.minRepetitions = arguments['minRepetitions'] || 2;
    }

    var collection = [],
        documentKeywords = [],
        collectionKeywords = [];

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




/********************************************************************************************************************************************
*
*   PRIVATE METHODS
*
*********************************************************************************************************************************************/




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
            if(isNaN(item.term) && parseFloat(item.tfidf) > 0 ){
                //docKeywords.push({ 'term': item.term, 'score': item.tfidf });
                docKeywords[item.term] = item.tfidf;
            }
        });
        return docKeywords;
    }




    /////////////////////////////////////////////////////////////////////////////

    var extractGlobalKeywords = function(minRepetitions) {

        collectionKeywords = getCandidateKeywords(documentKeywords).filter(function(ck){ return ck.repeated >= minRepetitions });

        collectionKeywords.sort(function(k1, k2){
            if(k1.repeated < k2.repeated) return 1;
            if(k1.repeated > k2.repeated) return -1;
            return 0;
        });

        getAllTokens(collection).forEach(function(token){
            var kIndex = _.findIndex(collectionKeywords, function(k){ return k.stem == token.stem() });
            if(kIndex >= 0 && stopWords.indexOf(token.toLowerCase()) == -1)
                collectionKeywords[kIndex].variations[token] = collectionKeywords[kIndex].variations[token] ? collectionKeywords[kIndex].variations[token] + 1 : 1;
        });

        collectionKeywords.forEach(function(k, i){
            k.term = getRepresentativeTerm(k);
        });
    };




    var getCandidateKeywords = function(_documentKeywords) {

        var candidateKeywords = [];
        _documentKeywords.forEach(function(docKeywords, i){

            var sum = 0;
            Object.keys(docKeywords).forEach(function(term){
                sum += docKeywords[term];
            });
            var mean = sum / Object.keys(docKeywords).length;

            Object.keys(docKeywords).forEach(function(stemmedTerm){
                var kIndex = _.findIndex(candidateKeywords, function(element){ return element.stem === stemmedTerm});
                if(docKeywords[stemmedTerm] >= mean && kIndex == -1)
                    candidateKeywords.push({ 'stem': stemmedTerm, 'term': '', 'repeated': 1, 'variations': {} });
                else if(kIndex > -1)
                    candidateKeywords[kIndex].repeated++;
            });
        });
        return candidateKeywords;
    }


    function getAllTokens(_collection) {

        var allTokens = [];
        _collection.forEach(function(d){
            d.tokens.forEach(function(term){
                allTokens.push(term);
            });
        });
        return allTokens;
    }



    var getRepresentativeTerm = function(k){

        var keys = Object.keys(k.variations);

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
    }



/********************************************************************************************************************************************
*
*   PROTOTYPE
*
*********************************************************************************************************************************************/




    KeywordExtractor.prototype = {
        addDocument: function(document) {
            document = (!Array.isArray(document)) ? document : document.join(' ');
            collection.push({ text: document });
        },
        processCollection: function() {
            console.log('start keyword extraction');
            var timestamp = $.now();
            extractDocumentKeywords();
            extractGlobalKeywords(this.minRepetitions);
            console.log(parseInt($.now() - timestamp).toTime());
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












