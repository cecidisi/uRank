var TagCloudDefault = (function(){

    var _this;
    // Settings
    var s = {};
    //  Classes
    var tagcloudDefaultClass = 'urank-tagcloud-default',
        tagcloudControlsClass = 'urank-tagcloud-controls',
        tagContainerOuterClass = 'urank-tagcloud-tag-container-outer',
        tagContainerClass = 'urank-tagcloud-tag-container',
        tagClass = 'urank-tagcloud-tag',
        selectedClass = 'selected',
        disabledClass = 'disabled',
        //dimmedClass = 'dimmed',
        //activeClass = 'active',
        draggingClass = 'dragging',
        tagHintClass = 'urank-tagcloud-tag-hint',
        keywordHintClass = 'urank-tagcloud-tag-cooccurence-hint',
        documentHintClass = 'urank-tagcloud-tag-document-hint';
    //  Ids
    var tagIdPrefix = '#urank-tag-',
        tagPiePrefix = '#urank-tag-pie-';
    //   Attributes
    var tagPosAttr = 'tag-pos';
    //  Helpers
    var backgroudGradient = "top, rgb(0, 102, 255), rgb(20, 122, 255), rgb(0, 102, 255)";
    var $root = $(''), $tagContainer = $(''),

        tagHoverStyle = {
            background: function() {
	            	    	var hoverBackground = '-webkit-linear-gradient('+backgroudGradient+')'; 
					    	
						    if (navigator.userAgent.search("MSIE") >= 0) {
								return '-ms-linear-gradient('+backgroudGradient+')';  
							}
							else if (navigator.userAgent.search("Chrome") >= 0) {
								return '-webkit-linear-gradient('+backgroudGradient+')';  
							}
							else if (navigator.userAgent.search("Firefox") >= 0) {
								return '-moz-linear-gradient('+backgroudGradient+')'; 
							}
							else if (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0) {
								return '-webkit-linear-gradient('+backgroudGradient+')'; 
							}
							else if (navigator.userAgent.search("Opera") >= 0) {
								return '-o-linear-gradient('+backgroudGradient+')'; 
							}
							return hoverBackground;
						},
            border: 'solid 1px rgb(0, 102, 255)',
            color: '#eee',
            'text-shadow': ''
        },

        tagHintPinOptions = {
            document: {
                top: - 6, right: -7, container: '.'+tagContainerOuterClass
            },
            cooccurence: {
                bottom: -10, right: -7, container: '.'+tagContainerOuterClass
            }
        },

        pieOptions = {
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

        customScrollOptions = {
            axis: 'y',
            theme: 'light',
            scrollbarPosition: 'outside',
            autoHideScrollbar: true,
            scrollEasing: 'linear',
            scrollInertia: 0,
            mouseWheel: { enable: true, axis: 'y' },
            keyboard: { enable: true },
            advanced: { updateOnContentResize: true },
            callbacks: {
                whileScrolling: function(){
                    if(_this.tagHintMode)
                        pinTagHints($('.'+tagClass+'.'+selectedClass));
                }
            }
        },


        draggableOptions = {
            revert: 'invalid',
            helper: 'clone',
            appendTo: '.urank-tagbox-container',
            zIndex: 999,
            start: function(event, ui){
                _this.isTagDragged = true;
                $(this).find('.'+keywordHintClass).css('visibility', 'hidden');
                $(this).find('.'+documentHintClass).css('visibility', 'hidden');

                //    $(this).hide();

            },
            drag: function(event, ui){

            },
            stop: function(event, ui){
                _this.isTagDragged = false;
                $(this).show();
            }
        };


    /// Tag Cloud root and container event handlers
    var onRootScrolled = function(event) {
        event.stopPropagation();
        if(_this.tagHintMode)
            pinTagHints($('.'+tagClass+'.'+selectedClass));
    };


    //  Constructor
    function TagCloudDefault(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            onTagInCloudMouseEnter: function(index){},
            onTagInCloudMouseLeave: function(index){},
            onTagInCloudClick: function(index){},
            onDocumentHintClick: function(index){},
            onKeywordHintMouseEnter : function(index){},
            onKeywordHintMouseLeave : function(index){},
            onKeywordHintClick : function(index){},
        }, arguments);

        this.keywords = [];
        this.isTagDragged = false;
        this.tagHintMode = false;
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Internal functions

    var extendKeywordsWithColorCategory = function(keywords){

        var extent = d3.extent(keywords, function(k){ return k['repeated']; });
        var range = (extent[1] - 1) * 0.1;   // / TAG_CATEGORIES;

        keywords.forEach(function(k){
            var colorCategory = parseInt((k['repeated'] - 1/*extent[0]*/) / range);
            k['colorCategory'] = (colorCategory < TAG_CATEGORIES) ? colorCategory : TAG_CATEGORIES - 1;
        });
        return keywords;
    };


    var pinTagHints = function($tag) {
        $tag.find('.'+documentHintClass).css('visibility', 'visible').pin(tagHintPinOptions.document);
        $tag.find('.'+keywordHintClass).css('visibility', 'visible').pin(tagHintPinOptions.cooccurence);
    };


    var setTagProperties = function($tag) {

        // Set default style
        $tag.removeClass(selectedClass).removeClass(disabledClass).removeAttr('data-hint')
        .css({
            background: getGradientString($tag.data('originalColor')),
            border: '1px solid ' + $tag.data('originalColor'),
            color: '', textShadow: '', cursor: ''
        })
        // Set event handlers
        .off().on({
            mousedown : function(event){ if(event.which == 1 && !$(this).hasClass(disabledClass)) event.stopPropagation(); },
            mouseenter: function(event){ s.onTagInCloudMouseEnter.call(this, $(this).attr(tagPosAttr)) },
            mouseleave: function(event){ s.onTagInCloudMouseLeave.call(this, $(this).attr(tagPosAttr)) },
            click: function(event){ event.stopPropagation(); s.onTagInCloudClick.call(this, $(this).attr(tagPosAttr)) }
        });

        // Set draggable
        if($tag.is('.ui-draggable'))
            $tag.draggable('destroy');
        $tag.draggable(draggableOptions);

        $tag.find('.'+documentHintClass).css('visibility', '')
        $tag.find('.'+keywordHintClass).css('visibility', '')

        return $tag;
    };



    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype methods

    /**
    * * @param {array of objects} keywords Description
    */
    var _build = function(keywords, data, colorScale, opt){
        this.keywords = extendKeywordsWithColorCategory(keywords);
        this.data = data;
        this.colorScale = colorScale;
        this.opt = opt;

        // Empty tag container and add appropriate class/es
        $root = $(s.root).empty().addClass(tagcloudDefaultClass);

        //  Create tagcloud controls
        var $tagcloudControls = $('<div/>').appendTo($root).addClass(tagcloudControlsClass);
        var $tagInput = $('<input>', { type: 'text', placeholder: 'Enter keyword' }).appendTo($tagcloudControls);
        var $addButton = $('<button/>').appendTo($tagcloudControls).append($('<span/>'));


        // Create tag contained
        var $outerTagContainer = $('<div></div>').appendTo($root)
            .addClass(tagContainerOuterClass)
            .on('scroll', onRootScrolled);

        $tagContainer = $('<div></div>').appendTo($outerTagContainer).addClass(tagContainerClass);

        this.keywords.forEach(function(k, i){
            var $tag = $('<div></div>', { class: tagClass, id: 'urank-tag-' + i, 'tag-pos': i, stem: k.stem, text: k.term }).appendTo($tagContainer)//.appendTo($root);
            $tag.hide().fadeIn((i+1)*20);

            // Append pie chart section for document indicator
            var termUpperCase = k.term.toUpperCase(),
                percentage = Math.floor(k.inDocument.length/_this.data.length * 100),
                tooltipMsg = k.inDocument.length + " (" + percentage + "%) documents contain " + termUpperCase + ". Click to highlight documents";

            var $docHint = $('<div></div>', { class: tagHintClass+' '+documentHintClass+' hint--right hint--info hint--rounded', id: 'urank-tag-pie-' + i, 'data-hint': tooltipMsg }).appendTo($tag);
            pieOptions.data.content[0].value = k.inDocument.length;
            pieOptions.data.content[1].value = _this.data.length - k.inDocument.length || 0.1;
            var tagPie = new d3pie(tagPiePrefix+''+i, pieOptions);

            // Append red circle section for keywords in proximity indicator
            if(k.keywordsInProximity.length > 0) {
                tooltipMsg = k.keywordsInProximity.length + " other keywords frequently found close to " + termUpperCase + "\n Click to lock view";
                var $proyKeywordsIndicator = $('<div></div>', { class: tagHintClass+' '+keywordHintClass+' hint--right hint--info hint--rounded', 'data-hint': tooltipMsg, text: k.keywordsInProximity.length}).appendTo($tag);
            }

            $tag.data({ 'originalColor': _this.colorScale(k.colorCategory) });
            setTagProperties($tag);
        });

        if(this.opt.customScrollBars) {
            $outerTagContainer.mCustomScrollbar(customScrollOptions);
        }
    };



    var _reset = function() {
        this.build(this.keywords, this.data, this.colorScale, this.opt);
    };



    /**
	 *	Detach tag from tag box and return it to container (tag cloud)
	 *
	 * */
    var _restoreTag = function(index){

        var $tag = $(tagIdPrefix + '' + index);
        // Change class
        $tag.removeClass().addClass(tagClass);

        setTagProperties($tag);

        // Re-append to tag container, in the corresponding postion
        var tagIndex = parseInt($tag.attr(tagPosAttr));
        var i = tagIndex - 1;
        var firstTagIndex = $tagContainer.find('.'+ tagClass + ':eq(0)').attr(tagPosAttr);
        // second condition checks if the tag is NOT in Tag Cloud
        while(i >= firstTagIndex && !$(tagIdPrefix + '' + i).hasClass(tagClass))
            --i;

        //  Save offset in tagBox before detaching
        var oldOffset = $tag.offset();
        $tag = $tag.detach();

        //Calculate where the tag should be inserted in the tag container
        if(i >= firstTagIndex)    // Current tag inserted after another (tag-pos == i)
            $(tagIdPrefix + '' + i).after($tag);
        else                      // Current tag inserted in first position of tag container
            $tagContainer.prepend($tag);

        //  Save new offset in tag cloud container for animation
        var newOffset = $tag.offset();

        // Detach tag from tag cloud, attach temporarily to body and place it in old position (in tagBox)
        $tag = $tag.detach()
            .appendTo('body')
            .css({ position: 'absolute', top: oldOffset.top, left: oldOffset.left, 'z-index': 9999 });

        // Animate tag moving from tag box to tag cloud
        $tag.animate({ top: newOffset.top, left: newOffset.left }, 1200, 'swing', function(){
            //  Detach from body after motion animation is complete and append to tag container again
            $tag = $tag.detach();
            if(i >= firstTagIndex)
                $(tagIdPrefix + '' + i).after($tag);
            else
                $tagContainer.prepend($tag);

            $tag.css({ position: '', top: '', left: '', 'z-index': '' })
                .draggable(draggableOptions);
        });

    };


    var _hoverTag = function(index) {
        var $tag = $(tagIdPrefix + '' + index);
        if(!_this.tagHintMode) {
            $tag.css(tagHoverStyle);
            pinTagHints($tag);
        }
    };


    var _unhoverTag = function(index) {
        var $tag = $(tagIdPrefix + '' + index);

        if(!_this.tagHintMode) {
            $tag.find('.'+documentHintClass).css('visibility', '');
            $tag.find('.'+keywordHintClass).css('visibility', '');
            var color = $tag.data('originalColor');
            $tag.css({ background: getGradientString(color), border: '1px solid ' + color, color: '#111' });
        }
    };


    var _tagClicked = function(index) {

        if(!_this.isTagDragged) {

            _hoverTag(index);
            var $tag = $(tagIdPrefix + '' + index).addClass(selectedClass);
            //$tag.find('.'+keywordHintClass).css('visibility', 'visible');
            //$tag.find('.'+documentHintClass).css('visibility', 'visible');

            var proxKeywords = _this.keywords[index].keywordsInProximity;

            $tag.siblings().each(function(i, sibling){
                var $siblingTag = $(sibling);
                $siblingTag.find('.'+keywordHintClass).off().css('visibility', 'hidden');
                $siblingTag.find('.'+documentHintClass).off().css('visibility', 'hidden');

                // sibling tags that are not KW in proximity of current tag are dimmend and active class removed so they can't be dragged
                if(_.findIndex(proxKeywords, function(proxKw){ return proxKw.stem == $siblingTag.attr('stem') }) === -1) {
                    $siblingTag.addClass(disabledClass).css({ background: '', border: '' });
                }
                else {                                      // Active tags are the ones co-occuring with the selected tag. A tooltip is added during proxKeywordsmode
                    var selectedKeyword = $tag.getText();
                    var currentKeyword = $siblingTag.getText();
                    var numberCoOccurrences = _this.keywords[index].keywordsInProximity[$siblingTag.attr('stem')];
                    var tooltip = currentKeyword + ' and ' + selectedKeyword + ' appear in proximity ' + numberCoOccurrences + ' times';
                    $siblingTag.addClass('hint--left hint--rounded').attr('data-hint', tooltip);
                    if($siblingTag.is('ui-draggable'))
                        $siblingTag.draggable('destroy');
                    $siblingTag.draggable(draggableOptions);
                }
            });

            if($tag.is('.ui-draggable'))
                $tag.draggable('destroy');
            $tag.draggable(draggableOptions);

            _this.tagHintMode = true;
        }
    };



    var _keywordHintMouseEntered = function(index) {
        var $tag = $(tagIdPrefix + '' + index),
            $redCircle = $tag.find(keywordHintClass),
            proxKeywords = _this.keywords[index].keywordsInProximity;

        $tag.siblings().each(function(i, siblingTag){
            if(_.findIndex(proxKeywords, function(proxKw){ return proxKw.stem == $(siblingTag).attr('stem') }) === -1) {
                $(siblingTag).css({ background: '', border: '' }).addClass(dimmedClass);
            }
        });
    };



    var _keywordHintMouseLeft = function(index) {
    };


    var _keywordHintClicked = function(index) {
    };



    var _documentHintClicked = function(index) {
    };



    var _clearEffects = function() {

        if(_this.tagHintMode) {
            $('.'+tagClass).each(function(i, tag){
                setTagProperties($(tag));
            });
            _this.tagHintMode = false;
        }
    };



    var _clear = function() {
       // $outerTagContainer.mCustomScrollbar('destroy');
        $root.empty();
    };


    var _destroy = function() {
      //  $outerTagContainer.mCustomScrollbar('destroy');
        $root.empty().removeClass(tagcloudDefaultClass);
    };


    TagCloudDefault.prototype = {
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

    return TagCloudDefault;
})();

