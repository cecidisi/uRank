var TagCloudDefault = (function(){

    var _this;
    // Settings
    var s = {};
    //  Classes
    var tagcloudDefaultClass = 'urank-tagcloud-default',
        hiddenScrollbarClass = 'urank-hidden-scrollbar',
        hiddenScrollbarInnerClass = 'urank-hidden-scrollbar-inner',
        tagContainerClass = 'urank-tagcloud-tag-container',
        tagClass = 'urank-tagcloud-tag',
        activeClass = 'active',
        hoveredClass = 'hovered',
        selectedClass = 'selected',
        disabledClass = 'disabled',
        droppedClass = 'dropped',
        focusedClass = 'focused',
        hiddenClass = 'hidden',
        addableClass = 'addable',
        addedClass = 'added',
        tagHintClass = 'urank-tagcloud-tag-hint',
        keywordHintClass = 'urank-tagcloud-tag-cooccurence-hint',
        documentHintClass = 'urank-tagcloud-tag-document-hint',
        tooltipClass = 'urank-tagcloud-tag-tooltip',
        addIconClass = 'urank-tagcloud-tag-add-icon';
    //  Ids
    var tagIdPrefix = '#urank-tag-',
        tagPiePrefix = '#urank-tag-pie-';
    //   Attributes
    var tagPosAttr = 'tag-pos';
    //  Helpers
    var backgroudGradient = "top, rgb(0, 102, 255), rgb(20, 122, 255), rgb(0, 102, 255)";
    var $root = $(''), $scrollable = $(''), $tagContainer = $(''), $tooltip = $(''),
        tooltipTimeOut, fadeOutTimeOut,

        tagHintPinOptions = {
            document: { top: -6, right: -10, container: '.'+tagcloudDefaultClass },
            cooccurence: { bottom: -10, right: -10, container: '.'+tagcloudDefaultClass }
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
        };

    /// Tag Cloud root and container event handlers
    var onRootScrolled = function(event) {
        event.stopPropagation();
//        if(_this.tagHintMode)
//            pinTagHints($('.'+tagClass+'.'+selectedClass));
    };

    // Draggable event handlers
    var $draggedTag = undefined;
    var originalOffset = {};

    var onTagDragStarted = function(event, ui){
        _this.isTagDragged = true;
        $tooltip.hide();
        clearTimeout(tooltipTimeOut);
        clearTimeout(fadeOutTimeOut);

        $(this).data('dropped', false).data('addedTags', _this.addedTags);
        $(ui.helper).addClass('dragging');

        $draggedTag = $(this).clone()
            .attr('id', $(this).attr('id') + '-clon')
            .data('originalColor', $(this).data('originalColor'))
            .removeClass('ui-draggable').removeClass('ui-draggable-handle')
            .setTagStyle()
            .hide();
        $(this).after($draggedTag);

        // Start added tag animation
        originalOffset = { top: event.pageY, left: event.pageX };

        $('.'+addedClass).each(function(i, addedTag){
            var $addedTag = $(addedTag);
            var $clonAddedTag = $addedTag.clone()
                .attr('id', $(this).attr('id') + '-clon')
                .data('originalColor', $(this).data('originalColor'))
                .removeClass('ui-draggable').removeClass('ui-draggable-handle')
                .setTagStyle();

            var tagOffset = $addedTag.position();
            $addedTag.after($clonAddedTag);
            $addedTag.detach()
            .appendTo('body')
            .css({
                position: 'absolute',
                left: tagOffset.left,
                top: tagOffset.top,
                'z-index': 9999
            });
        });
    };

    var onTagDragged = function(event, ui){
        var currentOffset = { top: event.pageY - originalOffset.top, left: event.pageX - originalOffset.left };
        originalOffset = { top: event.pageY, left: event.pageX };

        _this.addedTags.forEach(function(i){
            var $addedTag = $(tagIdPrefix + '' + i);
            var tagOffset = $addedTag.position();
            $addedTag.css({ left: tagOffset.left + currentOffset.left, top: tagOffset.top + currentOffset.top });
        });

    };

    var onTagDragStopped =  function(event, ui){
        _this.isTagDragged = false;
        var $tag = $(this).data('addedTags', '');

        if($tag.data('dropped')) {
            $tag.draggable("destroy");
            $draggedTag.show().removeClass(hoveredClass);
        }
        else {
            $tag.removeClass(hoveredClass).removeClass(disabledClass).setTagStyle();
            $draggedTag.remove();
        }

        //  Added tags
        _this.addedTags.forEach(function(index){
            var $addedTag = $(tagIdPrefix + '' + index);
            var $clonAddedTag = $(tagIdPrefix + '' + index + '-clon');
            // Restore added tag position
            $addedTag = $addedTag.css({ position: '', left: '', top: '', 'z-index': '' });

            // If dragged tag isn't drop, re-attach added tags and remove clones
            if(!$tag.data('dropped')) {
                $addedTag = $addedTag.detach();
                $clonAddedTag.after($addedTag);
                $clonAddedTag.remove();
            }
        });

        originalOffset = {};
    };


    var draggableOptions = {
        revert: 'invalid',
        helper: 'clone',
        appendTo: '.urank-tagbox-container',
        zIndex: 999,
        start: onTagDragStarted,
        drag: onTagDragged,
        stop: onTagDragStopped
    };



    //  Constructor
    function TagCloudDefault(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            onTagInCloudMouseEnter: function(index){},
            onTagInCloudMouseLeave: function(index){},
            onTagInCloudClick: function(index){},
        }, arguments);

        this.keywords = [];
        this.isTagDragged = false;
        this.tagHintMode = false;
        this.selectedTag = undefined;
        this.addedTags = [];
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
        $tag.find('.doc-hint').pin(tagHintPinOptions.document);
    };


    var setTagProperties = function($tag) {

        // Set event handlers
        $tag.off().on({
            mousedown : function(event){ if(event.which == 1/* && !$(this).hasClass(disabledClass)*/) event.stopPropagation(); },
            mouseenter: function(event){ s.onTagInCloudMouseEnter.call(this, $(this).attr(tagPosAttr)) },
            mouseleave: function(event){ s.onTagInCloudMouseLeave.call(this, $(this).attr(tagPosAttr)) }
//            click: function(event){ event.stopPropagation(); s.onTagInCloudClick.call(this, $(this).attr(tagPosAttr)) }
//            click: _tagClicked
        });

        // Reset hints visibility
        $tag.find('.'+documentHintClass).css('visibility', '')

        // if it's not clon form dropped tag, add class active and make it drggable
        if(!$tag.hasClass(droppedClass)) {
            // Set default style
            $tag.addClass(activeClass);
            // Set draggable
            if($tag.is('.ui-draggable'))
                $tag.draggable('destroy');
            $tag.draggable(draggableOptions);
        }
        if ($tag.hasClass(hiddenClass))
            $tag.hide();

        return $tag.setTagStyle();
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

//        $tooltip = $('<div/>').appendTo($root).addClass(tooltipClass).width($root.width() - 10);
//        $("<p><strong name='num-docs'></strong> (<strong name='pctg-docs'></strong>) documents contain</p>").appendTo($tooltip);
//        $("<p><strong name='tag'></strong></p>").appendTo($tooltip);
//        $("<p><strong name='num-kw'></strong> other keywords in proximity</p>").appendTo($tooltip);
//        $tooltip.css('top', $root.position().top - $tooltip.fullHeight()).hide();

        $('<div/>').appendTo($root).addClass(hiddenScrollbarClass);

        $scrollable = $('<div/>').appendTo($root).addClass(hiddenScrollbarInnerClass)
            .on('scroll', onRootScrolled);
        $tagContainer = $('<div/>').appendTo($scrollable).addClass(tagContainerClass);

        this.keywords.forEach(function(k, i){
            // Append tag
            var $tag = $('<div/>', { id: 'urank-tag-' + i, 'tag-pos': i, stem: k.sore, term: k.score }).appendTo($tagContainer)
                .addClass(tagClass + ' ' + activeClass/* + ' hint--info hint--left'*/)
                .data({ 'originalColor': _this.colorScale(k.colorCategory) })
                .html('<label>'+k.term+'</label>')
                .hide()
                .fadeIn((i+1)*20);
            // Pie chart section for document hint
//            var docPctg = parseInt((k.inDocument.length * 100) / _this.data.length);
//            if(docPctg > 0 && docPctg < 5) { docPctg = 5; }
//            else {
//                if(docPctg%5 < 3) docPctg = docPctg - docPctg%5;
//                else docPctg = docPctg + 5 - docPctg%5;
//            }
//            var $docHint = $('<a/>', { class: 'doc-hint doc-hint-'+docPctg, href: '#' }).appendTo($tag);
//            // Red circle for keywords in proximity hint
//            if(k.keywordsInProximity.length > 0)
//                $('<a/>', { class: keywordHintClass, 'data-content': k.keywordsInProximity.length, href: '#' }).appendTo($tag);
//            // Add/remove icon
//            $('<a/>', { href: '#' }).appendTo($tag).addClass(addIconClass);
            setTagProperties($tag);
        });
        return this;
    };



    var _reset = function() {
        return this.build(this.keywords, this.data, this.colorScale, this.opt);
    };

    var _preselectTags = function(tagIndices){

        tagIndices.forEach(function(index){
            var $tag = $(tagIdPrefix+''+index);
            var $clonTag = $tag.clone()
                .attr('id', $tag.attr('id') + '-clon')
                .data('originalColor', $(this).data('originalColor'))
                .removeClass('ui-draggable').removeClass('ui-draggable-handle')
                .setTagStyle().css('opacity', '')
                .show();

            $tag.after($clonTag);
            $tag.detach().appendTo('body');
        });
    };


    var _hoverTag = function(index) {
        var $tag = $('.'+tagClass + '[tag-pos=' + index + ']');
        if(!_this.tagHintMode && !_this.isTagDragged) {
            if(!$tag.hasClass(droppedClass))
                $tag.addClass(hoveredClass).setTagStyle();
                    //.css(tagStyle.hover);
//            pinTagHints($tag);
//            tooltipTimeOut = setTimeout(function(){
//                $tooltip.find("[name='num-docs']").html(_this.keywords[index].inDocument.length);
//                $tooltip.find("[name='pctg-docs']").html(Math.floor(_this.keywords[index].inDocument.length/_this.data.length * 100) + '%');
//                $tooltip.find("[name='tag']").html(_this.keywords[index].term.toUpperCase());
//                $tooltip.find("[name='num-kw']").html(_this.keywords[index].keywordsInProximity.length);
//                $tooltip.fadeIn();
//                fadeOutTimeOut = setTimeout(function(){
//                    $tooltip.fadeOut();
//                }, 4000);
//            }, 500);
        }
    };


    var _unhoverTag = function(index) {
        var $tag = $('.'+tagClass + '[tag-pos=' + index + ']');

        if(!_this.tagHintMode && !_this.isTagDragged) {
            $tag.find('.'+documentHintClass).css('visibility', '');
            //if(!$tag.hasClass(droppedClass)) {
                $tag.removeClass(hoveredClass).setTagStyle();
            //}
//            clearTimeout(tooltipTimeOut);
//            clearTimeout(fadeOutTimeOut);
//            $tooltip.hide();
        }
    };


    var _tagClicked = function(event/*index*/) {
        event.stopPropagation();
        var index = $(this).attr(tagPosAttr);

        if(!_this.isTagDragged) {

            var $tag = $('.'+tagClass + '[tag-pos=' + index + ']');
            // There's already a selected class, add class added
            if(_this.selectedTag) {
                if($tag.hasClass(addableClass)) {
                    $tag.addClass(addedClass).removeClass(addableClass).setTagStyle();
                    _this.addedTags.push($tag.attr(tagPosAttr));
                }
                else if($tag.hasClass(addedClass)) {
                    $tag.addClass(addableClass).removeClass(addedClass).setTagStyle();
                    _this.addedTags.splice(_this.addedTags.indexOf($tag.attr(tagPosAttr)), 1);
                }
            }
            else {
                s.onTagInCloudClick(index)
                _this.selectedTag = index;
                $tag.addClass(selectedClass).removeClass(hiddenClass).setTagStyle();

                if(!$tag.hasClass(droppedClass)) {
                    if($tag.is('.ui-draggable'))
                        $tag.draggable('destroy');
                    $tag.draggable(draggableOptions);
                }

                // SIBLINGS
                var proxKeywords = _this.keywords[index].keywordsInProximity;
                $tag.siblings().each(function(i, sibling){

                    var $siblingTag = $(sibling);
                    if($siblingTag.is('.ui-draggable'))
                        $siblingTag.draggable('destroy');

                    $siblingTag.find('.'+documentHintClass).off().css('visibility', 'hidden');

                    // sibling tags that are not KW in proximity of current tag are dimmend and active class removed so they can't be dragged
                    if(_.findIndex(proxKeywords, function(proxKw){ return proxKw.stem == $siblingTag.attr('stem') }) === -1) {
                        $siblingTag.addClass(disabledClass).removeClass(activeClass).setTagStyle();
                    }
                    else {                                      // Active tags are the ones co-occuring with the selected tag. A tooltip is added during proxKeywordsmode
                        if(!$siblingTag.hasClass(droppedClass)) {
                            $siblingTag.addClass(activeClass).addClass(addableClass);
                            $siblingTag/*.draggable(draggableOptions)*/.show();
                        }
                    }
                    pinTagHints($tag);
                });
                _this.tagHintMode = true;
            }

        }
    };


    /**
	 *	Detach tag from tag box and return it to container (tag cloud)
	 *
	 * */
    var _restoreTag = function(index){

        var $tag = $(tagIdPrefix + '' + index);
        var $clonedTag = $(tagIdPrefix + '' + index + '-clon');
        // Change class
        $tag.removeClass().addClass(tagClass + ' ' + activeClass);

        //  Save offset in tagBox before detaching
        var oldOffset = $tag.offset();
        var newOffset = $clonedTag.offset();

        // Detach tag from tag cloud, attach temporarily to body and place it in old position (in tagBox)
        $tag = $tag.detach().appendTo('body')
            .css({ position: 'absolute', top: oldOffset.top, left: oldOffset.left, 'z-index': 9999 });

        // Animate tag moving from tag box to tag cloud
        $tag.animate({ top: newOffset.top, left: newOffset.left }, 1500, 'swing', function(){
            //  Detach from body after motion animation is complete and append to tag container again
            $tag = $tag.detach();
            $clonedTag.after($tag);
            $clonedTag.remove();
            $tag.css({ position: '', top: '', left: '', 'z-index': '' }).setTagStyle();
            setTagProperties($tag);
        });
    };


    var _focusTag = function(keyword/*, newOffset*/) {
        var $tag = $('.'+tagClass + '[tag-pos=' + keyword.index + ']');
        $tag.addClass(focusedClass).removeClass(hiddenClass).show();

        setTimeout(function(){
            $tag.removeClass(focusedClass, 2000);
        }, 5000);

        $scrollable.scrollTo('.'+tagClass + '[tag-pos=' + keyword.index + ']', { offsetTop: 10 });
        return this;
    };


    var _updateClonOfDroppedTag = function(index, queryColor) {
        console.log(index + ' --- ' + queryColor);
        var $tag = $(tagIdPrefix + '' + index + '-clon')
            .data('queryColor', queryColor)
            .removeClass(activeClass).removeClass(disabledClass).removeClass(selectedClass)
            .addClass(droppedClass)
            .setTagStyle();
        setTagProperties($tag);
        return this;
    };



    var _showTagsWithinRange = function(min, max) {
        _this.keywords.forEach(function(k, i){
            // class selector before id selector avoids hiding tags in tagbox. cloned tags remain visible
            var $tag = $('.'+tagClass + '' + tagIdPrefix + '' + i);

            if(k.repeated >= min && k.repeated <= max)
                $tag.removeClass(hiddenClass).show();
            else
                $tag.addClass(hiddenClass).hide();
        });
    };

    var _clearEffects = function() {

        _this.selectedTag = undefined;
        _this.addedTags = [];
        if(_this.tagHintMode) {
            $('.'+tagClass).each(function(i, tag){
                var $tag = $(tag);
                $tag.removeClass(disabledClass).removeClass(selectedClass).removeClass(hoveredClass).removeClass(addedClass).removeClass(addableClass)
                setTagProperties($tag);
            });
            _this.tagHintMode = false;
        }
        return this;
    };



    var _clear = function() {
        $root.empty();
        return this;
    };


    var _destroy = function() {
        $root.empty();
        return this;
    };


    TagCloudDefault.prototype = {
        build: _build,
        reset: _reset,
        preselectTags: _preselectTags,
        restoreTag: _restoreTag,
        hoverTag: _hoverTag,
        tagClicked:_tagClicked,
        unhoverTag: _unhoverTag,
        focusTag: _focusTag,
        updateClonOfDroppedTag: _updateClonOfDroppedTag,
        showTagsWithinRange: _showTagsWithinRange,
        clearEffects: _clearEffects,
        clear: _clear,
        destroy: _destroy
    };

    return TagCloudDefault;
})();

