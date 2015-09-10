var TagCloud = (function(){

    var _this, $root = $('');
    // Settings
    var s = {};
    //  Classes
    var tagcloudClass = 'urank-tagcloud',
        tagcloudControlsClass = 'urank-tagcloud-controls',
        notFoundClass = 'not-found',
        tagFreqSliderClass = 'urank-tagcloud-freq-slider',
        tagContainerOuterClass = 'urank-tagcloud-tag-container-outer',
        tagClass = 'urank-tagcloud-tag';

    var $tagInput = $(''), $notFoundLabel = $(''), $tagFreqLabel = $(''), minFreq = 0, maxFreq = 0;

    //  Constructor
    function TagCloud(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            onTagInCloudMouseEnter: function(index){},
            onTagInCloudMouseLeave: function(index){},
            onTagInCloudClick: function(index){},
            onKeywordEntered: function(keyword){},
            onTagFrequencyChanged(min, max){}
        }, arguments);
        this.keywords = [];
        this.keywordsDict = {};
    }


    var onTextEntered = function() {
        var stemmedText = $tagInput.val().stem();
        if(_this.keywordsDict[stemmedText])
            s.onKeywordEntered.call(this, _this.keywordsDict[stemmedText]);
        else
            $notFoundLabel.addClass(notFoundClass);
    };


    var onSlide = function(event, ui) {
        $tagFreqLabel.html('Keyword frequency: <strong>' + ui.values[0] + '</strong> - <strong>' + ui.values[1] + '</strong>');
    };

    var onSlideStopped = function(event, ui) {
        s.onTagFrequencyChanged.call(this, ui.values[0], ui.values[1]);
    };

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype methods

    /**
    * * @param {array of objects} keywords Description
    */
    var _build = function(keywords, data, colorScale, opt, keywordsDict){

        this.keywords = keywords;
        this.keywordsDict = keywordsDict;

        // Empty tag container and add appropriateclass
        $root = $(s.root).empty().addClass(tagcloudClass);
        //  Create tagcloud controls
        var $tagcloudControls = $('<div/>').appendTo($root).addClass(tagcloudControlsClass);

        minFreq = _this.keywords[_this.keywords.length - 1].repeated;
        maxFreq = _this.keywords[0].repeated;
        $tagFreqLabel = $('<label/>').appendTo($tagcloudControls).addClass('tag-freq').html('Keyword frequency: <strong>' + minFreq + '</strong> - <strong>' + maxFreq + '</strong>');

        var $tagFreqSlider = $('<div/>').appendTo($tagcloudControls)/*.addClass(tagFreqSliderClass)*/.slider({
            range: true,
            animate: true,
            min: minFreq,
            max: maxFreq,
            values: [minFreq, maxFreq],
            slide: onSlide,
            stop: onSlideStopped
        });

        // Separator
 //       $('<div/>').appendTo($tagcloudControls).addClass('sep-line');

        // Notfound message label
        $notFoundLabel = $('<a/>').appendTo($tagcloudControls);
        // Keyword search input
        $tagInput = $('<input>', { type: 'text', placeholder: 'Enter keyword' }).appendTo($tagcloudControls).addClass('not-found')
            .autocomplete({
                source: _this.keywords.map(function(k){ return k.term })
            })
            .on('keyup', function(e){
                $notFoundLabel.removeClass(notFoundClass);
                if(e.keyCode == 13 && $(this).val() != '')
                    onTextEntered();
            });
        // Add button
//        $('<button/>').appendTo($tagcloudControls).append($('<span/>'))
//            .on('click', onTextEntered);
        //$('<span/>').appendTo($tagcloudControls).addClass('search-icon');

        $('<a/>').appendTo($tagcloudControls).addClass('search-icon');

        // Create tag container
        var $outerTagContainer = $('<div></div>').appendTo($root).addClass(tagContainerOuterClass);
        // Initialize selected tagcloud module
        var tagcloudModule = TAGCLOUD_MODULES[opt.module] || TAGCLOUD_MODULES.default;
        this.tagcloud = new tagcloudModule($.extend(s, { root: '.'+tagContainerOuterClass }));
        this.tagcloud.clear();
        // Build tagcloud module
        var options = $.extend(opt.misc, { draggableClass: tagClass })
        this.tagcloud.build(keywords, data, colorScale, options, keywordsDict);
        return this;
    };


    var _reset = function() {
        if(this.tagcloud) this.tagcloud.reset();
        return this;
    };


    var _restoreTag = function(index){
        if(this.tagcloud) this.tagcloud.restoreTag(index);
        return this;
    };


    var _hoverTag = function(index) {
        if(this.tagcloud) this.tagcloud.hoverTag(index);
        return this;
    };


    var _unhoverTag = function(index) {
        if(this.tagcloud) this.tagcloud.unhoverTag(index);
        return this;
    };


    var _tagClicked = function(index) {
        if(this.tagcloud) this.tagcloud.tagClicked(index);
        return this;
    };

    var _updateClonOfDroppedTag = function(index, queryColor) {
        if(this.tagcloud) this.tagcloud.updateClonOfDroppedTag(index, queryColor);
        return this;
    };


    var _focusTag = function(keyword) {
        this.tagcloud.focusTag(keyword);
    };

    var _showTagsWithinRange = function(min, max) {
        this.tagcloud.showTagsWithinRange(min, max);
    };

    var _clearEffects = function() {
        if(this.tagcloud) this.tagcloud.clearEffects();
        return this;
    };


    var _clear = function() {
        if(this.tagcloud) this.tagcloud.clear();
        return this;
    };


    var _destroy = function() {
        if(this.tagcloud) this.tagcloud.destroy();
        $root.removeClass(tagcloudClass);
        return this;
    };


    TagCloud.prototype = {
        build: _build,
        reset: _reset,
        restoreTag: _restoreTag,
        hoverTag: _hoverTag,
        tagClicked:_tagClicked,
        unhoverTag: _unhoverTag,
        updateClonOfDroppedTag: _updateClonOfDroppedTag,
        focusTag: _focusTag,
        showTagsWithinRange: _showTagsWithinRange,
        clearEffects: _clearEffects,
        clear: _clear,
        destroy: _destroy
    };

    return TagCloud;
})();

