var TagCloud = (function(){

    var _this, $root = $('');
    // Settings
    var s = {};
    //  Classes
    var tagCloudContainerClass = 'urank-tagcloud-container',
        defaultTagCloudContainerClass = 'urank-tagcloud-container-default',
        tagClass = 'urank-tagcloud-tag';
    //  Helper
    var helper = {
        tagHoverStyle: {
            background: '-webkit-linear-gradient(top, rgb(0, 102, 255), rgb(20, 122, 255), rgb(0, 102, 255))',
            border: 'solid 1px rgb(0, 102, 255)',
            color: '#eee',
            'text-shadow': ''
        },

        draggableOptions: {
            revert: 'invalid',
            helper: 'clone',
            appendTo: '.urank-tagbox-container',
            zIndex: 999,
            start: function(event, ui){ $(this).hide(); },
            stop: function(event, ui){ $(this).show(); }
        },

        pieOptions: {
            size: { pieOuterRadius: '100%', canvasHeight: '14', canvasWidth: '14' },
            effects: {
                load: { effect: "none" },
                pullOutSegmentOnClick: { effect: 'none', speed: 0, size: 0 },
                highlightSegmentOnMouseover: false
            },
            labels: {
                inner: { format: '' },
                lines: { enabled: false}
            },
            data: {
                content: [
                    { label: 'documentsIn', value: 0, color: '#65BA20' },
                    { label: 'documentsNotIn', value: 0, color: '#fafafa' },
                ]
            },
            misc: {
                colors: { segmentStroke: '#65a620' },
                canvasPadding: { top: 0, right: 0, bottom: 0, left: 0 },
                gradient: { enabled: true, percentage: 100, color: "#888" },
            }
        },

        documentHintPinOptions: { top: - 6, right: -7, container: '.'+tagCloudContainerClass },
        keywordHintPintOptions: { bottom: -10, right: -7, container: '.'+tagCloudContainerClass }
    };



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
        }, arguments, helper);
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype methods

    /**
    * * @param {array of objects} keywords Description
    */
    var _build = function(keywords, data, colorScale, opt){

        // Empty tag container and add appropriateclass
        var containerClasses = (opt.defaultBlockStyle) ? tagCloudContainerClass +' '+ defaultTagCloudContainerClass : tagCloudContainerClass;
        $root = $(s.root).empty().addClass(containerClasses);

        var tagcloudModule = TAGCLOUD_MODULES[opt.module] || TAGCLOUD_MODULES.default;
        this.tagcloud = new tagcloudModule(s);
        this.tagcloud.clear();
        this.tagcloud.build(keywords, data, colorScale);
    };



    var _reset = function() {
        if(this.tagcloud) this.tagcloud.reset();
    };


    var _restoreTag = function(index){
        if(this.tagcloud) this.tagcloud.restoreTag(index);
    };


    var _hoverTag = function(index) {
        if(this.tagcloud) this.tagcloud.hoverTag(index);
    };


    var _unhoverTag = function(index) {
        if(this.tagcloud) this.tagcloud.unhoverTag(index);
    };


    var _tagClicked = function(index) {
        if(this.tagcloud) this.tagcloud.tagClicked(index);
    };


    var _keywordHintMouseEntered = function(index) {
        if(this.tagcloud) this.tagcloud.keywordHintMouseEntered(index);
    };


    var _keywordHintMouseLeft = function(index) {
        if(this.tagcloud) this.tagcloud.keywordHintMouseLeft(index);
    };


    var _keywordHintClicked = function(index) {
        if(this.tagcloud) this.tagcloud.keywordHintClicked(index);
    };



    var _documentHintClicked = function(index) {
        if(this.tagcloud) this.tagcloud.documentHintClicked(index);
    };



    var _clearEffects = function() {
        if(this.tagcloud) this.tagcloud.clearEffects();
    };


    var _clear = function() {
        if(this.tagcloud) this.tagcloud.clear();
    };


    var _destroy = function() {
        if(this.tagcloud) this.tagcloud.destroy();
    };


    TagCloud.prototype = {
        build: _build,
        reset: _reset,
        restoreTag: _restoreTag,
        hoverTag: _hoverTag,
        tagClicked:_tagClicked,
        unhoverTag: _unhoverTag,
        keywordHintClicked: _keywordHintClicked,
        keywordHintMouseEntered: _keywordHintMouseEntered,
        keywordHintMouseLeft: _keywordHintMouseLeft,
        documentHintClicked: _documentHintClicked,
        clearEffects: _clearEffects,
        clear: _clear,
        destroy: _destroy
    };

    return TagCloud;
})();

