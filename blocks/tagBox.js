var TagBox = (function(){

    var _this;
    // Settings
    var s = {};
    //  Classes
    var tagboxClass = 'urank-tagbox',
        tagboxContainerClass = 'urank-tagbox-container',
        clearBtnClass = 'urank-tagbox-clear-btn',
        tagInBoxClass = 'urank-tagbox-tag',
        tagControls = 'urank-tagbox-tag-controls',
        tagNameClass = 'urank-tag-name',
        listContainerClass = 'urank-tag-list-container',
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
        if(_this.selectedFeatures.length == 0) {
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
            s.onChange.call(this, _this.selectedFeatures)   // Bind onChange event handler for custom event
        }, 0);
    };

    function Tagbox(arguments) {

        _this = this;
        s = $.extend({
            root: '',
            droppableClass: 'urank-tagcloud-tag',
            onChange: function(selectedFeatures){},
            onModeChanged: function(mode){},
            onRankingWeightChanged: function(rWeight) {},
            onTagDropped: function(tagIndices){},
            onTagDeleted: function(index){},
            onTagWeightChanged: function(index, weight){},
            onTagInBoxMouseEnter: function(index){},
            onTagInBoxMouseLeave: function(index){},
            onTagInBoxClick: function(index){},
            onFeatureTagChanged: function(oldIndex, newIndex){},
            onReset: function(){},
            defaultBlockStyle: true
        }, arguments);

        this.selectedFeatures = [];
        this.actionLog = {};  // fields: action, keyword, color, oldWeight, newWeight, timestamp -- not all of them used for every case

        this.droppableOptions = {
            tolerance: 'touch',
            drop: function(event, ui){
                ui.draggable.data('dropped', true);
                var tagIndices = [$(ui.draggable).attr(tagPosAttr)];
                this.selectedFeatures.push(_this.features[$(ui.draggable).attr(tagPosAttr)]);
                ui.draggable.data('addedTags').forEach(function(index){
                    tagIndices.push(index);
                    this.selectedFeatures.push(_this.features[index]);
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
                    indexToChange = _.findIndex(_this.selectedFeatures, function(sk){ return sk.term == term });
                _this.selectedFeatures[indexToChange].weight = ui.value;
                s.onTagWeightChanged.call(this, $(this.parentNode).attr(tagPosAttr), ui.value);
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




    var _build = function(features, opt) {

        this.features = features;
        this.selectedFeatures = [];
        this.destroy();
        $root = $(s.root).addClass(tagboxClass+' '+headerStyleClass);

        var tagboxContainerClasses = tagboxContainerClass;
        $tagContainer = $('<div/>').appendTo($root).addClass(tagboxContainerClasses)
            .off(tagBoxChangeEvent, onTagboxChanged)
            .on(tagBoxChangeEvent, onTagboxChanged)
            .droppable(this.droppableOptions);                       // bind droppable behavior to tag box;
        $message = $('<p>' + STR_DROP_TAGS_HERE + '</p>').appendTo($tagContainer);
        $resetBtn = $('<a/>', { href: '#' }).appendTo($tagContainer).addClass(clearBtnClass).on('click', function(){ s.onReset.call(this); }).hide();

        //if(!opt.ranking.content || !opt.ranking.social ) {
            $tagContainer.addClass('large');
//        }
//        else {
//            buildRankingModeHeader();
//        }

        $('body').on('click', function(){ $('.tag-list-container').removeClass('active') });
        return this;
    };


    var _preselectTags = function(tagIndices) {
        tagIndices = Array.isArray(tagIndices) ? tagIndices: [tagIndices];
        tagIndices.forEach(function(index){
            _this.selectedFeatures.push(_this.features[index]);
        });
        $tagContainer.trigger(tagBoxChangeEvent);
        s.onTagDropped.call(this, tagIndices);
        return this;
    }


    var _clear = function() {
        this.selectedFeatures = [];
        if($tagContainer) {
            $tagContainer.find('.'+tagInBoxClass).remove();
            //$tagContainer.append('<p>' + STR_DROP_TAGS_HERE + '</p>');
            $message.show();
            $resetBtn.hide();
        }
        return this;
    };


/*
    tag = { index, stem, term, color }
*/
    var _dropTag = function(tag, posToReplace){
        var $tag = $(tagIdPrefix + '' + tag.index);
        if ($tag.hasClass(s.droppableClass)) {
            // Append dragged tag to tag box
            if(posToReplace !== undefined) {
                $(tagIdPrefix + '' + posToReplace).after($tag);
            }
            else {
                $tagContainer.append($tag);
            }
            // Change tag's class
            $tag.removeClass().addClass(tagInBoxClass);
            // Append "delete" button
            //$('<span></span>').appendTo($tag).addClass(tagDeleteButtonClass);

            // Add new div to make it a slider
/*            var weightSlider = $("<div class='" + tagWeightsliderClass + "'></div>").appendTo($tag).slider(this.sliderOptions);
            weightSlider.find('.ui-slider-range').addClass(weightSliderRangeClass).css('background', tag.color);
            weightSlider.find('.ui-slider-handle').addClass(weightSliderHandleClass);*/
            // Retrieve color in weightColorScale for the corresponding label
            var rgbSequence = hexToR(tag.color) + ', ' + hexToG(tag.color) + ', ' + hexToB(tag.color);
            // Set tag's style
            $tag.data('queryTermColor', tag.color).css({
                background: 'rgba(' + rgbSequence + ', 0.8)'
                //color: '',
                //border: 'solid 2px ' + tag.color
            }).off().on({
                mouseenter: s.onTagInBoxMouseEnter($tag.attr(tagPosAttr)),
                mouseleave: s.onTagInBoxMouseLeave($tag.attr(tagPosAttr)),
                click: function(event){
                    //event.stopPropagation();
                    s.onTagInBoxClick.call(this, $tag.attr(tagPosAttr))
                }
            }).on('click', '.'+tagDeleteButtonClass, $tag.attr(tagPosAttr), function(event){  //  Event handler for delete button
                event.stopPropagation();
                var deletedTagIndex = event.data;
                _this.selectedFeatures.splice(deletedTagIndex, 1);
                $tagContainer.trigger(tagBoxChangeEvent);
                s.onTagDeleted.call(this, deletedTagIndex);
            });

            var $controls = $('<div/>').insertBefore($tag.find('label')).addClass(tagControls);
            var $select = $('<div/>', { class: 'control' }).insertAfter($tag.find('label'));
            $('<a/>', { class: 'select', href: '#' }).appendTo($select);

            var $tagListContainer = $('<div/>', { class: listContainerClass }).appendTo($tag);

            _this.features.forEach(function(f, i){
                $('<label/>', { pos: i, text: f.name }).appendTo($tagListContainer).click(function(evt){
                    evt.stopPropagation();
                    if(!$(this).hasClass('disabled')) {
                        var oldIndex = tag.index,
                            newIndex = $(this).attr('pos');
                        var indexToChange = _.findIndex(_this.selectedFeatures, function(sf){ return sf.name == tag.name });
                        _this.selectedFeatures[indexToChange] = _this.features[newIndex];
                        $tagContainer.trigger(tagBoxChangeEvent);

                        $('.'+listContainerClass).removeClass('active');
                        s.onFeatureTagChanged.call(this, oldIndex, newIndex );
                    }
                });
            });

            $tag.find('.'+listContainerClass + ' label[pos="' + tag.index + '"]').addClass('selected');
            $select.click(function(evt){
                evt.stopPropagation();
                var css = {
                    top: ($tag.find('.'+tagNameClass).position().top + 16) + 'px',
                    left: ($tag.find('.'+tagNameClass).fullOffset().left) + 'px',
                    width: ($tag.width() - 6) +'px'
                };
                $(this).parent().find('.'+listContainerClass).toggleClass('active').css(css);
            });

//            _this.selectedFeatures.push(tag);
        }
        return this;
    };


    var _updateSelectableFeatures = function(){

        $('.'+listContainerClass).find('label').removeClass('disabled').removeClass('selected');
        _this.selectedFeatures.forEach(function(tag){
            $('.'+listContainerClass).find('label[pos="' + tag.index + '"]').addClass('disabled');
            $(tagIdPrefix +''+ tag.index).find('label[pos="' + tag.index + '"]').addClass('selected');
        });
    };

    var _removeTag = function(index) {
        var $tag = $(tagIdPrefix + '' + index),
            name = $tag.getText();
//        $tag.find('.'+tagDeleteButtonClass).remove();
//        $tag.find('.'+tagWeightsliderClass).remove();
        $tag.find('.'+tagControls).remove();
        $tag.find('.'+listContainerClass).remove();
        $tag.find('.control').remove();

//        var indexToDelete = _.findIndex(_this.selectedFeatures, function(sk){ return sk.name == name });
//        _this.selectedFeatures.splice(indexToDelete, 1);
//        $tagContainer.trigger(tagBoxChangeEvent);

        return this;
    };

    var _reset = function() {
        _this.selectedFeatures.forEach(function(kw){
            $('.'+tagInBoxClass).find('.'+tagDeleteButtonClass).remove();
            $('.'+tagInBoxClass).find('.'+tagWeightsliderClass).remove();
        });

        _this.selectedFeatures = [];
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
        preselectTags: _preselectTags,
        dropTag: _dropTag,
        removeTag: _removeTag,
        updateRankingMode: _updateRankingMode,
        destroy: _destroy,
        getHeight: _getHeight,
        updateSelectableFeatures: _updateSelectableFeatures
    };

    return Tagbox;
})();


