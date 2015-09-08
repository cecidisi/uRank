var TagCloud = (function(){

    var _this, $root = $('');
    // Settings
    var s = {};
    //  Classes
    var tagcloudClass = 'urank-tagcloud',
        tagcloudControlsClass = 'urank-tagcloud-controls',
        tagContainerOuterClass = 'urank-tagcloud-tag-container-outer',
        tagClass = 'urank-tagcloud-tag';

    var $tagInput = $(''), $notFoundLabel = $('');

    //  Constructor
    function TagCloud(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            onKeywordEntered: function(term){},
            onTagInCloudMouseEnter: function(index){},
            onTagInCloudMouseLeave: function(index){},
            onTagInCloudClick: function(index){},
        }, arguments);
        this.keywords = [];
        this.keywordsDict = {};
    }


    var onTextEntered = function() {
        var stemmedText = $tagInput.val().stem();
        if(_this.keywordsDict[stemmedText])
            s.onKeywordEntered.call(this, _this.keywordsDict[stemmedText]);
        else
            $notFoundLabel.css('visibility', 'visible');
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
        $tagInput = $('<input>', { type: 'text', placeholder: 'Enter keyword' }).appendTo($tagcloudControls)
            .autocomplete({
                source: _this.keywords.map(function(k){ return k.term })
            })
            .on('keyup', function(e){
                $notFoundLabel.css('visibility', 'hidden');
                if(e.keyCode == 13 && $(this).val() != '')
                    onTextEntered();
            });
        // Add button
        $('<button/>').appendTo($tagcloudControls).append($('<span/>'))
            .on('click', onTextEntered);
        // Notfound message label
        $notFoundLabel = $('<label/>').appendTo($tagcloudControls).addClass('message').text('Keyword not found!').css('visibility', 'hidden');

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

    var _updateDroppedTag = function(index, queryColor) {
        if(this.tagcloud) this.tagcloud.updateDroppedTag(index, queryColor);
        return this;
    };


    var _selectTag = function(keyword) {
        this.tagcloud.selectTag(keyword);
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
        updateDroppedTag: _updateDroppedTag,
        selectTag: _selectTag,
        clearEffects: _clearEffects,
        clear: _clear,
        destroy: _destroy
    };

    return TagCloud;
})();

