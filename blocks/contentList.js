

var ContentList = (function(){

    var _this, $root = $('');
    // Settings
    var s = {};
    // Classes
    var contentListContainerClass = 'urank-list-container',
        defaultContentListContainerClass = 'urank-list-container-default',
        ulClass = 'urank-list-ul',
        liClass = 'urank-list-li',
        liHoverClass = 'urank-list-li-hover',
        liLightBackground = 'urank-list-li-lightbackground',
        liDarkBackground = 'urank-list-li-darkbackground',
        liUnrankedClass = 'urank-list-li-unranked',
        liMovingUpClass = 'urank-list-li-movingup',
        liMovingDownClass = 'urank-list-li-movingdown',
        liNotMovingClass = 'urank-list-li-notmoving',
        liRankingContainerClass = 'urank-list-li-ranking-container',
        rankingPosClass = 'urank-list-li-ranking-pos',
        rankingPosMovedClass = 'urank-list-li-ranking-posmoved',
        liTitleContainerClass = 'urank-list-li-title-container',
        liTitleClass = 'urank-list-li-title',
        liButtonsContainerClass = 'urank-list-li-buttons-container',
        faviconClass = 'urank-list-li-button-favicon',
        faviconOffClass = 'urank-list-li-button-favicon-off',
        faviconOnClass = 'urank-list-li-button-favicon-on',
        watchiconClass = 'urank-list-li-button-watchicon',
        watchiconOffClass = 'urank-list-li-button-watchicon-off',
        watchiconOnClass = 'urank-list-li-button-watchicon-on',
        liWatchedClass = 'urank-list-li-watched';
    // Ids
    var liItem = '#urank-list-li-';
    // Helper
    var containerClasses;

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Constructor

    function ContentList(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            onItemClicked: function(document){},
            onItemMouseEnter: function(document){},
            onItemMouseLeave: function(document){},
            onFaviconClicked: function(document){},
            onWatchiconClicked: function(document){},
            defaultStyle: true
        }, arguments);

        this.data = [];
        this.selectedKeywords = [];
        this.multipleHighlightMode = false;
        this.actionLog = {};    // fields: doc_id, doc_title, timestamp

        containerClasses = (s.defaultStyle) ? contentListContainerClass +' '+ defaultContentListContainerClass : contentListContainerClass;
        $(s.root).addClass(containerClasses);
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Internal functions

    var bindEventHandlers = function($li, id) {

        $li.data('id', id).off()
        .on({
            click: function(event){
                event.stopPropagation(); s.onItemClicked.call(this, $li.data('id'));
            },
            mouseenter: function(event){
                event.stopPropagation(); s.onItemMouseEnter.call(this, $li.data('id'));
            },
            mouseleave: function(event){
                event.stopPropagation(); s.onItemMouseLeave.call(this, $li.data('id'));
            }
        })
        .on('click', '.'+liButtonsContainerClass + ' .' + watchiconClass, $li.data('id'),  function(event){
            event.stopPropagation(); s.onWatchiconClicked.call(this, event.data);
        })
        .on('click', '.'+liButtonsContainerClass + ' .' + faviconClass, $li.data('id'), function(event){
            event.stopPropagation(); s.onFaviconClicked.call(this, event.data);
        });
    };


    var formatTitles = function(colorScale) {
        _this.data.forEach(function(d, i){
            var formattedTitle = (d.title.length > 60) ? (d.title.substring(0, 56) + '...') : d.title + '';
            formattedTitle = (_this.selectedKeywords.length == 0) ? formattedTitle : getStyledText(formattedTitle, _this.selectedKeywords, colorScale);
            $(liItem +''+ d.id).find('.'+liTitleClass).html(formattedTitle);
        });
    }


    var updateLiBackground = function(){
        $('.'+liClass).removeClass(liLightBackground).removeClass(liDarkBackground).removeClass(liUnrankedClass);

        _this.data.forEach(function(d, i) {
            var backgroundClass = (i % 2 == 0) ? liLightBackground : liDarkBackground;
            $(liItem +''+ d.id).addClass(backgroundClass);
        });
    };


    var showRankingPositions = function() {

        var color = function(d) {
            if(d.positionsChanged > 0) return "rgba(0, 200, 0, 0.8)";
            if(d.positionsChanged < 0) return "rgba(250, 0, 0, 0.8)";
            return "rgba(128, 128, 128, 0.8)";
        };

        var posMoved = function(d) {
            //console.log(d.positionsChanged);
            if(d.positionsChanged == 1000) return STR_JUST_RANKED;
            if(d.positionsChanged > 0) return "+" + d.positionsChanged;
            if(d.positionsChanged < 0) return d.positionsChanged;
            return "=";
        };

        _this.data.forEach(function(d, i){
            if(d.overallScore > 0){
                var rankingDiv = $(liItem + '' + d.id).find('.'+liRankingContainerClass);
                rankingDiv.css('visibility', 'visible');
                rankingDiv.find('.'+rankingPosClass).text(d.rankingPos);
                rankingDiv.find('.'+rankingPosMovedClass).css('color', color(d)).text(posMoved(d));
            }
        });
    };


    var hideUnrankedListItems = function() {
        _this.data.forEach(function(d){
            var display = d.rankingPos > 0 ? '' : 'none';
            $(liItem + '' + d.id).css('display', display);
        });
        _this.multipleHighlightMode = false;
    };


    var removeMovingStyle = function() {
        $('.'+liClass).removeClass(liMovingUpClass).removeClass(liMovingDownClass);
    };


    var stopAnimation = function(){
        $('.'+liClass).stop(true, true);
        removeMovingStyle();
        // console.log(timeout);
        if(_this.animationTimeout) clearTimeout(_this.animationTimeout);
    };


    var animateAccordionEffect = function(initialDuration, timeLapse, easing) {
        initialDuration = initialDuration || 500;
        timeLapse = timeLapse || 50;
        easing = easing || 'swing';

        var acumHeight = 0;
        var listTop = $root.position().top;

        _this.data.forEach(function(d, i){

            var $item = $(liItem +''+ d.id);
            var itemTop = $item.position().top;
            var newPos = listTop + acumHeight - itemTop;

            if(d.rankingPos > 0) {
                var shift = (i+1) * 5;
                var shiftedPos = newPos + shift;
                var duration = initialDuration + timeLapse * i;

                $item.animate({top: shiftedPos}, 0, easing)
                .queue(function(){
                    $(this).animate({top: newPos}, duration, easing);
                })
                .queue(function(){
                    $(this).animate({top: newPos}, 0);
                })
                .dequeue();
            }
            else {
                $item.css('top', newPos);
            }
            acumHeight += $item.height();
        });
    };



    var animateResortEffect = function(duration, easing) {
        duration = duration || 1500;
        easing = easing || 'swing';

        var acumHeight = 0;
        var listTop = $root.position().top;

        _this.data.forEach(function(d, i){
            if(d.rankingPos > 0) {
                var item = $(liItem +''+ d.id);
                var itemTop = $(item).position().top;
                var shift = listTop +  acumHeight - itemTop;
                var movingClass = (d.positionsChanged > 0) ? liMovingUpClass : ((d.positionsChanged < 0) ? liMovingDownClass : '');

                item.addClass(movingClass);
                item.animate({"top": '+=' + shift+'px'}, duration, easing);

                acumHeight += $(item).height();
            }
        });
    };


    var animateUnchangedEffect = function (duration, easing) {
        duration = duration || 1000;
        easing = easing || 'linear';

        _this.data.forEach(function(d, i) {
            var item = $(liItem +''+ d.id);
            var startDelay = (i+1) * 30;

            setTimeout(function() {
                item.addClass(liNotMovingClass);
                console.log(ite.attr('class'));
                // item.removeClass(liNotMovingClass, duration, easing);
            }, startDelay);
        });
    };



    var sort = function(){

        $root.parent().scrollTo('top');
        var liHtml = new Array();

        _this.data.forEach(function(d, i){
            var current = $(liItem +''+ d.id);
            current.css('top', 0);
            var outer = $(current).outerHTML();
            liHtml.push(outer);
            current.remove();
        });

        var oldHtml = "";
        _this.data.forEach(function(d, i){
            $('.'+ulClass).html(oldHtml + '' + liHtml[i]);
            oldHtml = $('.'+ulClass).html();
        });
        // Re-binds on click event to list item. Removing and re-appending DOM elements destroys the bindings to event handlers
        $('.'+liClass).each(function(i, li){
            bindEventHandlers($(li), _this.data[i].id);
        });

    };


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype methods

    var _build = function(data) {

        this.data = data.slice();
        this.selectedKeywords = [];
        this.status = RANKING_STATUS.no_ranking;

        $root = $(s.root).empty().addClass(containerClasses);

        var $ul = $('<ul></ul>').appendTo($root).addClass(ulClass);

        this.data.forEach(function(d, i){
            // li element
            var $li = $('<li></li>', { id: 'urank-list-li-' + d.id }).appendTo($ul).addClass(liClass);
            // ranking container
            var $rankingDiv = $("<div></div>").appendTo($li).addClass(liRankingContainerClass).css('visibility', 'hidden');
            $("<div></div>").appendTo($rankingDiv).addClass(rankingPosClass);
            $("<div></div>").appendTo($rankingDiv).addClass(rankingPosMovedClass);
            // title container
            var $titleDiv = $("<div></div>").appendTo($li).addClass(liTitleContainerClass);
/*            var $h3Title = $('<h3></h3>').appendTo($titleDiv);
            $('<a>', { ref: '#', id: 'urank-list-li-title-' + i, html: d.title, title: d.title + '\n' + d.description }).appendTo($h3Title);*/
            $('<h3></h3>', { id: 'urank-list-li-title-' + i, class: liTitleClass, html: d.title, title: d.title + '\n' + d.description }).appendTo($titleDiv);
            // buttons container
            var $buttonsDiv = $("<div></div>").appendTo($li).addClass(liButtonsContainerClass);
            $("<span>").appendTo($buttonsDiv).addClass(watchiconClass).addClass(watchiconOffClass);
            $("<span>").appendTo($buttonsDiv).addClass(faviconClass).addClass(faviconOffClass);
            // Subtle animation
            $li.animate({'top': 5}, {
                'complete': function(){
                    $(this).animate({"top": 0}, (i+1)*100, 'swing', function(){
                        bindEventHandlers($li, d.id);
                    });
                }
            });
        });
        formatTitles();
        updateLiBackground();
    };



    /**
    * @private     * Description
    * @param {type} data : current ranking
    * @param {type} status Description
    */
    var _update = function(data, status, selectedKeywords, colorScale) {

        this.data = data.slice();
        this.selectedKeywords = selectedKeywords.map(function(k){ return k.stem });
        this.status = status;

        var accordionInitialDuration = 500,
            accordionTimeLapse = 50,
            accordionEasing = 'swing',
            resortingDuration = 1500,
            resortingEasing = 'swing',
            unchangedDuration = 1000,
            unchangedEasing = 'linear',
            removeDelay = 3000,
            timeout;

        stopAnimation();
        this.deselectAllListItems();
        formatTitles(colorScale);
        showRankingPositions();
        hideUnrankedListItems();

        var updateNew = function(){
            updateLiBackground();
            animateAccordionEffect(accordionInitialDuration, accordionTimeLapse, accordionEasing);
            return setTimeout(function(){
                sort();
            }, accordionInitialDuration + (accordionTimeLapse * data.length));
        };

        var updateUpdated = function(){
            updateLiBackground();
            animateResortEffect(resortingDuration, resortingEasing);
            return setTimeout(function() {
                sort();
            }, resortingDuration);
        };

        var updateUnchanged = function(){
            animateUnchangedEffect(unchangedDuration, unchangedEasing);
        };

        var updateFunc = {};
        updateFunc[RANKING_STATUS.new] = updateNew;
        updateFunc[RANKING_STATUS.update] = updateUpdated;
        updateFunc[RANKING_STATUS.unchanged] = updateUnchanged;
        updateFunc[RANKING_STATUS.no_ranking] = _this.reset;
        //  When animations are triggered too fast and they can't finished in order, older timeouts are canceled and only the last one is executed
        //  (list is resorted according to last ranking state)
        this.animationTimeout = updateFunc[this.status].call(this);

        setTimeout(function() {
            removeMovingStyle();
        }, removeDelay);
    };



    var _reset = function() {
        this.build(this.data);
    };



    var _selectListItem = function(id) {
        stopAnimation();
        $('.'+liClass).css("opacity", "0.3");
        $(liItem + '' + id).css("opacity", "1");
    };


    var _deselectAllListItems = function() {
        $('.'+liClass).css('opacity', '');
    };


    // receives actual index
    var _hover = function(id) {
        $(liItem +''+ id).addClass(liHoverClass);
    };


    var _unhover = function(id) {
        $(liItem +''+ id).removeClass(liHoverClass);
    };


    var _highlightListItems = function(idArray) {
        stopAnimation();   // fix bug
        $('.'+liClass).css('opacity', .2);
        idArray.forEach(function(id){
            var $li = $(liItem+''+id);
            if(!$li.is(':visible'))
                $li.removeClass(liDarkBackground).removeClass(liLightBackground).addClass(liUnrankedClass);
            $li.css({ display: '', opacity: ''});
        });
        _this.multipleHighlightMode = true;
    };



    var _clearAllFavicons = function(){
        $('.'+liClass).find(' .' + faviconClass).removeClass(faviconOnClass);//.addClass(faviconOffClass);
    };


    var _toggleFavicon = function(id){
        var favIcon = $(liItem + '' + id).find(' .' + faviconClass);
        var classToAdd = favIcon.hasClass(faviconOffClass) ? faviconOnClass : faviconOffClass;
        var classToRemove = classToAdd === faviconOnClass ? faviconOffClass : faviconOnClass;
        favIcon.switchClass(classToRemove, classToAdd);
    };


    var _toggleWatchListItem = function(id){
        var watchIcon = $(liItem + '' + id).find(' .' + watchiconClass);
        var classToAdd = watchIcon.hasClass(watchiconOffClass) ? watchiconOnClass : watchiconOffClass;
        var classToRemove = classToAdd === watchiconOnClass ? watchiconOffClass : watchiconOnClass;
        watchIcon.switchClass(classToRemove, classToAdd);
        $(liItem + '' + id).toggleClass(liWatchedClass);
    };


    var _clearEffects = function() {
        this.deselectAllListItems();
        if(this.multipleHighlightMode) hideUnrankedListItems();
    };


    var _destroy = function() {
        $root.empty().removeClass(contentListContainerClass);
    };

    // Prototype
    ContentList.prototype = {
        build: _build,
        reset: _reset,
        update: _update,
        hover: _hover,
        unhover: _unhover,
        selectListItem: _selectListItem,
        deselectAllListItems: _deselectAllListItems,
        highlightListItems: _highlightListItems,
        clearAllFavicons: _clearAllFavicons,
        toggleFavicon: _toggleFavicon,
        toggleWatchListItem: _toggleWatchListItem,
        clearEffects: _clearEffects,
        destroy: _destroy
    };

    return ContentList;
})();


