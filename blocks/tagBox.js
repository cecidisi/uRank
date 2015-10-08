var TagBox = (function(){

    var _this;
    // Settings
    var s = {};
    //  Classes
    var tagboxClass = 'urank-tagbox',
        tagboxContainerClass = 'urank-tagbox-container',
        clearBtnClass = 'urank-tagbox-clear-btn',
        tagInBoxClass = 'urank-tagbox-tag',
        tagDeleteButtonClass = 'urank-tagbox-tag-delete-button',
        tagWeightsliderClass = 'urank-tagbox-tag-weight-slider',
        weightSliderRangeClass = 'urank-tagbox-tag-weight-slider-range',
        weightSliderHandleClass = 'urank-tagbox-tag-weight-slider-handle',
        rankingModeHeaderClass = 'urank-tagbox-ranking-mode-header',
        rankingModeHeaderInnerClass = 'urank-tagbox-ranking-mode-header-inner',
        headerSectionClass = 'urank-tagbox-ranking-mode-header-section',
        highlightedClass = 'urank-tagbox-ranking-mode-header-highlighted',
        headerStyleClass = 'urank-header-style',
        modeLegendClass = 'urank-ranking-mode-legend',
        legendWeightBar = 'urank-tagbox-ranking-weight-bar';

    //  Id prefix
    var tagIdPrefix = '#urank-tag-';
    //  Attribute
    var tagPosAttr = 'tag-pos';
    //  Custom Event
    var tagBoxChangeEvent = 'tagBoxChange';
    //  Helpers
    var $root, $tagContainer, $rankingModeHeader, $splitRankings, $sumRankings, $contentHeader, $socialHeader, $resetBtn, $message;

    var onTagboxChanged = function(){
        if(_this.selectedKeywords.length == 0) {
            setTimeout(function(){
                $message.show();
                $resetBtn.hide();
            }, 1);
        }
        else {
            $resetBtn.css('display', '');
            $message.hide();
        }
        setTimeout(function(){
            s.onChange.call(this, _this.selectedKeywords)   // Bind onChange event handler for custom event
        }, 0);
    };

    function Tagbox(arguments) {

        _this = this;
        s = $.extend({
            root: '',
            droppableClass: 'urank-tagcloud-tag',
            onChange: function(selectedKeywords){},
            onModeChanged: function(mode){},
            onRankingWeightChanged: function(rWeight) {},
            onTagDropped: function(tagIndices){},
            onTagDeleted: function(index){},
            onTagWeightchanged: function(){},
            onTagInBoxMouseEnter: function(index){},
            onTagInBoxMouseLeave: function(index){},
            onTagInBoxClick: function(index){},
            onReset: function(){},
            defaultBlockStyle: true
        }, arguments);

        this.selectedKeywords = [];
        this.actionLog = {};  // fields: action, keyword, color, oldWeight, newWeight, timestamp -- not all of them used for every case

        this.droppableOptions = {
            tolerance: 'touch',
            drop: function(event, ui){
                ui.draggable.data('dropped', true);
                var tagIndices = [$(ui.draggable).attr(tagPosAttr)];
                ui.draggable.data('addedTags').forEach(function(index){
                    tagIndices.push(index);
                });
                s.onTagDropped.call(this, tagIndices);
                $tagContainer.trigger(tagBoxChangeEvent);
            }
        };

        this.sliderOptions = {
            orientation: 'horizontal',
            animate: true,
            range: "min",
            min: 0,
            max: 1,
            step: 0.1,
            value: 1,
            start: function(event, ui) {},
            slide: function(event, ui) {
                var $tag  = $(this.parentNode);
                var color = $tag.data('queryTermColor');
                $tag.css("background", "rgba("+ hexToR(color) + ', ' + hexToG(color) + ', ' + hexToB(color) + "," + ui.value + ")");
            },
            stop: function(event, ui) {
                var term = $(this.parentNode).getText(),
                    indexToChange = _.findIndex(_this.selectedKeywords, function(sk){ return sk.term == term });
                _this.selectedKeywords[indexToChange].weight = ui.value;
                $tagContainer.trigger(tagBoxChangeEvent);
            }
        };

        this.rankingWeightSliderOptions = {
            animate: true,
            //range: 'min',
            min: 0,
            max: 1,
            step: 0.1,
            value: 0.5,
            slide: function(event, ui) {
                $('.'+legendWeightBar+"[name='content']").css('background', 'rgba(0,0,0,' + ui.value + ')');
                $('.'+legendWeightBar+"[name='social']").css('background', 'rgba(0,0,0,' + (1 - ui.value) + ')');
            },
            stop: function(event, ui) {
                s.onRankingWeightChanged.call(this, ui.value);
            }
        };

        $root = $(s.root);
    }



    var buildRankingModeHeader = function() {

        $rankingModeHeader = $('<div/>').appendTo($root).addClass(rankingModeHeaderClass + ' ' + headerStyleClass)

        // split cb and tu rankings
        $splitRankings = $('<div/>').appendTo($rankingModeHeader).addClass(rankingModeHeaderInnerClass);//.hide();

        $contentHeader = $('<div/>').appendTo($splitRankings).addClass(headerSectionClass + ' ' + highlightedClass)
            .on('click', function(){ s.onModeChanged.call(this, RANKING_MODE.by_CB) });
        $('<div/>', { class: modeLegendClass, text: 'Content Ranking' }).appendTo($contentHeader).append($('<span/>'));

        $socialHeader = $('<div/>').appendTo($splitRankings).addClass(headerSectionClass)
            .on('click', function(){ s.onModeChanged.call(this, RANKING_MODE.by_TU) });
        $('<div/>', { class: modeLegendClass, text: 'Social Ranking' }).appendTo($socialHeader).append($('<span/>'));
        // Sum button
        $('<button/>', { title: 'Aggregate rankings' }).appendTo($splitRankings).addClass('sum').html("<span></span>")
            .on('click', function(){ s.onModeChanged.call(this, RANKING_MODE.overall) });

        //
        $sumRankings = $('<div/>').appendTo($rankingModeHeader).addClass(rankingModeHeaderInnerClass).hide();

        var $sumHeader = $('<div/>').appendTo($sumRankings).addClass(headerSectionClass + ' long ' + highlightedClass)
            .on('click', function(){ s.onModeChanged.call(this, RANKING_MODE.overall) });

        // header legend
        $('<div/>', { name: 'content' }).appendTo($sumHeader).addClass(legendWeightBar)
        $('<div/>', { name: 'content' , text: ' Content Ranking ' }).appendTo($sumHeader).addClass(modeLegendClass);
        $('<div/>', { text: ' + ' }).appendTo($sumHeader).addClass(modeLegendClass + ' plus-symbol').html('<span></span>');
        $('<div/>', { name: 'social' }).appendTo($sumHeader).addClass(legendWeightBar)
        $('<div/>', { name: 'social', text: ' Social Ranking' }).appendTo($sumHeader).addClass(modeLegendClass);//.append($('<span/>'));

        // ranking weight slider
        $('<div/>', { title: "Move right to increase Content Ranking's weight" }).appendTo($sumHeader).slider(_this.rankingWeightSliderOptions);

        // Split button
        $('<button/>', { title: 'Split rankings' }).appendTo($sumRankings).addClass('split').html("<span></span>")
            .on('click', function(){ s.onModeChanged.call(this, RANKING_MODE.by_CB) });
    };




    var _build = function(opt) {

        this.selectedKeywords = [];
        this.destroy();
        $root = $(s.root).addClass(tagboxClass);

        var tagboxContainerClasses = (opt.misc.defaultBlockStyle) ? tagboxContainerClass +' '+ headerStyleClass : tagboxContainerClass;
        $tagContainer = $('<div/>').appendTo($root).addClass(tagboxContainerClasses)
            .off(tagBoxChangeEvent, onTagboxChanged)
            .on(tagBoxChangeEvent, onTagboxChanged)
            .droppable(this.droppableOptions);                       // bind droppable behavior to tag box;
        $message = $('<p>' + STR_DROP_TAGS_HERE + '</p>').appendTo($tagContainer);
        $resetBtn = $('<a/>', { href: '#' }).appendTo($tagContainer).addClass(clearBtnClass).on('click', function(){ s.onReset.call(this); }).hide();

        if(opt['content-based-only']) {
            $tagContainer.addClass('large');
        }
        else {
            buildRankingModeHeader();
        }
        return this;
    };


    var _clear = function() {
        this.selectedKeywords = [];
        if($tagContainer) {
            $tagContainer.find('.'+tagInBoxClass).remove();
            //$tagContainer.append('<p>' + STR_DROP_TAGS_HERE + '</p>');
            $message.show();
            $resetBtn.hide();
        }
        //$root.find('.'+tagboxContainerClass).empty().append('<p>' + STR_DROP_TAGS_HERE + '</p>');
        return this;
    };


/*
    tag = { index, stem, term, color }
*/
    var _dropTag = function(tag){
        var $tag = $(tagIdPrefix + '' + tag.index);
        if ($tag.hasClass(s.droppableClass)) {

            // Append dragged tag to tag box
            $tagContainer.append($tag);
            // Change tag's class
            $tag.removeClass().addClass(tagInBoxClass);
            // Append "delete" button
            $('<span></span>').appendTo($tag).addClass(tagDeleteButtonClass);
            // Add new div to make it a slider
            var weightSlider = $("<div class='" + tagWeightsliderClass + "'></div>").appendTo($tag).slider(this.sliderOptions);
            weightSlider.find('.ui-slider-range').addClass(weightSliderRangeClass).css('background', tag.color);
            weightSlider.find('.ui-slider-handle').addClass(weightSliderHandleClass);
            // Retrieve color in weightColorScale for the corresponding label
            var rgbSequence = hexToR(tag.color) + ', ' + hexToG(tag.color) + ', ' + hexToB(tag.color);
            // Set tag's style
            $tag.data('queryTermColor', tag.color).css({
                background: 'rgba(' + rgbSequence + ', 1)',
                color: '',
                border: 'solid 2px ' + tag.color
            }).off().on({
                mouseenter: s.onTagInBoxMouseEnter($tag.attr(tagPosAttr)),
                mouseleave: s.onTagInBoxMouseLeave($tag.attr(tagPosAttr)),
                click: s.onTagInBoxClick($tag.attr(tagPosAttr))
            }).on('click', '.'+tagDeleteButtonClass, $tag.attr(tagPosAttr), function(event){  //  Event handler for delete button
                event.stopPropagation(); s.onTagDeleted.call(this, event.data);
            });

            _this.selectedKeywords.push(tag);
        }
        return this;
    };


    var _deleteTag = function(index) {
        var $tag = $(tagIdPrefix + '' + index),
            term = $tag.getText();
        $tag.find('.'+tagDeleteButtonClass).remove();
        $tag.find('.'+tagWeightsliderClass).remove();

        var indexToDelete = _.findIndex(_this.selectedKeywords, function(sk){ return sk.term == term });
        _this.selectedKeywords.splice(indexToDelete, 1);
        $tagContainer.trigger(tagBoxChangeEvent);

        return this;
    };

    var _reset = function() {
        _this.selectedKeywords.forEach(function(kw){
            $('.'+tagInBoxClass).find('.'+tagDeleteButtonClass).remove();
            $('.'+tagInBoxClass).find('.'+tagWeightsliderClass).remove();
        });

        _this.selectedKeywords = [];
        $tagContainer.trigger(tagBoxChangeEvent);
    };

    var _destroy = function() {
        if($(s.root).hasClass(tagboxClass)) {
            $tagContainer.droppable('destroy');
            $root.empty().removeClass(tagboxContainerClass);
        }
        return this;
    };


    var _getHeight = function(){
        return $(s.root).height();
    };


    var _updateRankingMode = function(mode) {

        if(mode == RANKING_MODE.overall) {
            $splitRankings.hide();
            $sumRankings.show();
        }
        else {
            $splitRankings.show();
            $sumRankings.hide();
            if(mode == RANKING_MODE.by_CB) {
                $contentHeader.addClass(highlightedClass);
                $socialHeader.removeClass(highlightedClass);
            }
            else {
                $contentHeader.removeClass(highlightedClass);
                $socialHeader.addClass(highlightedClass);
            }
        }
        return this;
    };


    var _updateRankingWeight = function(rWeight) {
            console.log($('.'+legendWeightBar+"[name='content']"));

    };


    // Prototype
    Tagbox.prototype = {
        build: _build,
        reset: _reset,
        clear: _clear,
        dropTag: _dropTag,
        deleteTag: _deleteTag,
        updateRankingMode: _updateRankingMode,
        destroy: _destroy,
        getHeight: _getHeight
    };

    return Tagbox;
})();


