var TagCloud = (function(){

    var _this, $root = $('');
    // Settings
    var s = {};
    //  Classes
    var tagcloudClass = 'urank-tagcloud',
        tagClass = 'urank-tagcloud-tag';


    //  Constructor
    function TagCloud(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            onTagInCloudMouseEnter: function(index){},
            onTagInCloudMouseLeave: function(index){},
            onTagInCloudClick: function(index){},
            onDocumentHintClick: function(index){},
            onKeywordHintMouseEnter : function(index){},
            onKeywordHintMouseLeave : function(index){},
            onKeywordHintClick : function(index){}
        }, arguments);
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype methods

    /**
    * * @param {array of objects} keywords Description
    */
    var _build = function(keywords, data, colorScale, opt, keywordsDict){

        // Empty tag container and add appropriateclass
        $root = $(s.root).empty().addClass(tagcloudClass);

        var tagcloudModule = TAGCLOUD_MODULES[opt.module] || TAGCLOUD_MODULES.default;
        this.tagcloud = new tagcloudModule(s);
        this.tagcloud.clear();
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
        clearEffects: _clearEffects,
        clear: _clear,
        destroy: _destroy
    };

    return TagCloud;
})();

