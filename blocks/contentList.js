var ContentList = (function(){

    var _this;
    // Settings
    var s = {};
    // Classes
    var contentListClass = 'urank-list',
        hiddenScrollbarClass = 'urank-hidden-scrollbar',
        hiddenScrollbarInnerClass = 'urank-hidden-scrollbar-inner',
        listContainerClass = 'urank-list-container',
        ulClass = 'urank-list-ul',
        ulPaddingBottomclass = 'urank-list-ul-padding-bottom',
        liClass = 'urank-list-li',
        liLightBackgroundClass = 'urank-list-li-lightbackground',
        liDarkBackgroundClass = 'urank-list-li-darkbackground',
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
        faviconDefaultClass = 'urank-list-li-button-favicon-default',
        faviconOffClass = 'urank-list-li-button-favicon-off',
        faviconOnClass = 'urank-list-li-button-favicon-on',
        watchiconClass = 'urank-list-li-button-watchicon',
        watchiconOffClass = 'urank-list-li-button-watchicon-off',
        watchiconOnClass = 'urank-list-li-button-watchicon-on',
        watchiconDefaultClass = 'urank-list-li-button-watchicon-default',
        selectedClass = 'selected',
        dimmedClass = 'dimmed',
        hoveredClass = 'hovered',
        watchedClass = 'watched',
        // default-style classes
        ulClassDefault = ulClass + '-default',
        liClassDefault = liClass + '-default',
        liTitleClassDefault = liTitleClass + '-default',
        // header classes
        headerClass = 'urank-list-header',
        headerPosAndshiftClass = 'urank-list-header-pos-and-shift',
        headerTitleClass = 'urank-list-header-title',
        headerStyleClass = 'urank-header-style';

    // Ids
    var liItem = '#urank-list-li-';

    var urankIdAttr = 'urank-id',
        originalIndex = 'original-index';
    // Helper
    var $root = $(''), $header = $(''), $listContainer = $(''), $scrollable = $(''), $ul = $('');

    var onScroll = function(event){
        event.stopPropagation();
        s.onScroll.call(this, _this, $(this).scrollTop());
    };

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Constructor

    function ContentList(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            onItemClicked: function(documentId, index){},
            onItemMouseEnter: function(documentId, index){},
            onItemMouseLeave: function(documentId, index){},
            onFaviconClicked: function(documentId, indext){},
            onWatchiconClicked: function(documentId, index){},
            defaultStyle: true
        }, arguments);

        this.data = [];
        this.dataDict = {};
        this.selectedKeywords = [];
        this.multipleHighlightMode = false;
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Internal functions

    var bindEventHandlers = function($li, id, index) {

        var onLiClick = function(event){
            event.stopPropagation();
//            hideUnrankedListItems();
            if(!$(this).hasClass(liUnrankedClass))
                s.onItemClicked.call(this, id, index);
        };
        var onLiMouseEnter = function(event){
            event.stopPropagation(); s.onItemMouseEnter.call(this, id, index);
        };
        var onLiMouseLeave = function(event){
            event.stopPropagation(); s.onItemMouseLeave.call(this, id, index);
        };
        var onWatchiconClick = function(/*event*/$item){
            //event.stopPropagation();
            //var $item = $(event.data)
            s.onWatchiconClicked.call(this, $item.attr(urankIdAttr), $item.attr(originalIndex));
        };
        var onFaviconClick = function(event){
            event.stopPropagation();
            var $item = $(event.data)
            s.onFaviconClicked.call(this, $item.attr(urankIdAttr), $item.attr(originalIndex));
        };

        $li.off({
            click: onLiClick,
            mouseenter: onLiMouseEnter,
            mouseleave: onLiMouseLeave
        }).on({
            click: onLiClick,
            mouseenter: onLiMouseEnter,
            mouseleave: onLiMouseLeave
        });
        $li.find('.'+watchiconClass).off().on('click', function(event){
            event.stopPropagation();
            s.onWatchiconClicked.call(this, $li.attr(urankIdAttr), $li.attr(originalIndex));
        });
        $li.find('.'+faviconClass).off().on('click', function(event){
            event.stopPropagation();
            s.onFaviconClicked.call(this, $li.attr(urankIdAttr), $li.attr(originalIndex));
        });
    };


    var formatTitles = function(colorScale) {
        _this.data.forEach(function(d, i){
            var formattedTitle = (d.title.length > 60) ? (d.title.substring(0, 56) + '...') : d.title + '';
            formattedTitle = (_this.selectedKeywords.length == 0) ? formattedTitle : getStyledText(formattedTitle, _this.selectedKeywords, colorScale);
            $('.'+liClass+'['+urankIdAttr+'="'+d.id+'"]').find('.'+liTitleClass).html(formattedTitle);
        });
    }


    var updateLiBackground = function(){
        $('.'+liClass).removeClass(liLightBackgroundClass).removeClass(liDarkBackgroundClass).removeClass(liUnrankedClass);

        _this.data.forEach(function(d, i) {
            var backgroundClass = (i % 2 == 0) ? liLightBackgroundClass : liDarkBackgroundClass;
            $('.'+liClass+'['+urankIdAttr+'="'+d.id+'"]').addClass(backgroundClass);
        });
    };


    var getColor = function(d) {
        if(d.ranking.posChanged > 0) return "rgba(0, 200, 0, 0.8)";
        if(d.ranking.posChanged < 0) return "rgba(250, 0, 0, 0.8)";
        return "rgba(128, 128, 128, 0.8)";
    };

    var getPosMoved = function(d) {
        if(d.ranking.posChanged == 1000) return STR_JUST_RANKED;
        if(d.ranking.posChanged > 0) return "+" + d.ranking.posChanged;
        if(d.ranking.posChanged < 0) return d.ranking.posChanged;
        return "=";
    };


    var showRankingPositions = function() {

        var color = function(d) {
            if(d.ranking.posChanged > 0) return "rgba(0, 200, 0, 0.8)";
            if(d.ranking.posChanged < 0) return "rgba(250, 0, 0, 0.8)";
            return "rgba(128, 128, 128, 0.8)";
        };

        var posMoved = function(d) {
            if(d.ranking.posChanged == 1000) return STR_JUST_RANKED;
            if(d.ranking.posChanged > 0) return "+" + d.ranking.posChanged;
            if(d.ranking.posChanged < 0) return d.ranking.posChanged;
            return "=";
        };

        _this.data.forEach(function(d, i){
            if(d.ranking.overallScore > 0){
                //var rankingDiv = $(liItem + '' + d.id).find('.'+liRankingContainerClass);
                var rankingDiv = $('.'+liClass+'['+urankIdAttr+'="'+d.id+'"]').find('.'+liRankingContainerClass);
                rankingDiv.css('visibility', 'visible');
                rankingDiv.find('.'+rankingPosClass).text(d.ranking.pos);
                rankingDiv.find('.'+rankingPosMovedClass).css('color', color(d)).text(posMoved(d));
            }
        });
    };


    var hideUnrankedListItems = function() {

//        if(_this.status !== RANKING_STATUS.no_ranking) {
//            _this.data.forEach(function(d){
//                var display = d.ranking.overallScore > 0 ? '' : 'none';
//                //$(liItem + '' + d.id).css('display', display);
//                $('.'+liClass+'['+urankIdAttr+'="'+d.id+'"]').css('display', display);
//            });
//            $ul.addClass(ulPaddingBottomclass);
//        }
        _this.multipleHighlightMode = false;
    };


    var removeMovingStyle = function() {
        $('.'+liClass).removeClass(liMovingUpClass).removeClass(liMovingDownClass).removeClass(liNotMovingClass);
    };


    var stopAnimation = function(){
        $('.'+liClass).stop(true, true);
        removeMovingStyle();
//        if(_this.animationTimeout) clearTimeout(_this.animationTimeout);
    };



    var sort = function(){

        var liHtml = [];
        _this.data.forEach(function(d, i){
            var $current = $('.'+liClass+'['+urankIdAttr+'="'+d.id+'"]').css('top', '');
            var $clon = $current.clone(true);
            liHtml.push($clon);
            $current.remove();
        });

        $ul.empty();
        liHtml.forEach(function($li){
            $ul.append($li);
            bindEventHandlers($li, $li.attr(urankIdAttr), $li.attr(originalIndex));
        });
    };


    var animateAccordionEffect = function() {
        var timeLapse = 50;
        var easing = 'swing';

        $('.'+liClass).each(function(i, item){
            var $item = $(item);
            var shift = (i+1) * 5;
            var duration = timeLapse * (i+1);

            $item.addClass(liMovingUpClass);
            if(i < 40) {
                $item.animate({ top: shift }, 0, easing).queue(function(){
                    $(this).animate({ top: 0 }, duration, easing)
                }).queue(function(){
                    $(this).css('top', '');
                }).dequeue();
            }
        });
    };



    var animateResortEffect = function() {
        var duration = 1500;
        var easing = 'swing';
        var acumHeight = 0;
        var listTop = $ul.position().top;
        var itemHeight = $('.'+liClass+'['+urankIdAttr+'="' + _this.data[0].id + '"]').fullHeight();
        var options = [];

        _this.data.forEach(function(d, i){
            var itemTop = $('.'+liClass+'['+urankIdAttr+'="'+d.id+'"]').position().top;
            var shift = 0;
            if((_this.status === RANKING_STATUS.new && d.ranking.pos > 0 && d.ranking.pos < 40) ||
               (d.ranking.pos > 0 && d.ranking.pos < 30) ||
               (d.ranking.prevPos > 0 && d.ranking.prevPos < 30)) {
                shift = listTop + (d.ranking.prevPos * itemHeight) - itemTop;
            }

            ((d.ranking.pos > 0 && d.ranking.pos < 30) || (d.ranking.prevPos > 0 && d.ranking.prevPos < 30)) ? listTop + (d.ranking.prevPos * itemHeight) - itemTop: 0
            options.push({
                shift: shift,
                movingClass: (d.ranking.posChanged > 0) ? liMovingUpClass : ((d.ranking.posChanged < 0) ? liMovingDownClass : ''),
                pos: d.ranking.pos,
                color: getColor(d),
                posMoved: getPosMoved(d)
            });
        });

        $('.'+liClass).each(function(i, item){
            var $item = $(item);

//            var rankingDiv = $item.find('.'+liRankingContainerClass);
//            rankingDiv.css('visibility', 'visible');
//            rankingDiv.find('.'+rankingPosClass).text(options[i].pos);
//            rankingDiv.find('.'+rankingPosMovedClass).css('color', options[i].color).text(options[i].posMoved);

            $item.addClass(options[i].movingClass);
            if(options[i].shift !== 0) {
                $item.animate({ top: '+=' + options[i].shift +'px'}, {duration: 0, complete: function(){
                    $(this).animate({ top: '0px' }, { duration: duration, easing: easing });
//                    console.log($.now() - _this.timestamp);
                } });
            }
        });

    };


    var animateUnchangedEffect = function () {
        var duration = 1000;
        var easing = 'linear';

        _this.data.forEach(function(d, i) {
            //var $item = $(liItem +''+ d.id);
            var $item = $('.'+liClass+'['+urankIdAttr+'="'+d.id+'"]');
            var startDelay = (i+1) * 30;

            setTimeout(function() {
                $item.addClass(liNotMovingClass);
                // item.removeClass(liNotMovingClass, duration, easing);
            }, startDelay);
        });
    };





    var buildCustomList = function() {

        var c = {
            root: _this.opt.customOptions.selectors.root,
            ul: _this.opt.customOptions.selectors.ul,
            liClass: _this.opt.customOptions.selectors.liClass,
            liTitle: _this.opt.customOptions.selectors.liTitle,
            liRankingContainer: _this.opt.customOptions.selectors.liRankingContainer,
            watchicon: _this.opt.customOptions.selectors.watchicon,
            favicon: _this.opt.customOptions.selectors.favicon,
            liHoverClass: _this.opt.customOptions.classes.liHoverClass,
            liLightBackgroundClass: _this.opt.customOptions.classes.liLightBackgroundClass,
            liDarkBackgroundClass: _this.opt.customOptions.classes.liDarkBackgroundClass,
            hideScrollbar: _this.opt.customOptions.misc.hideScrollbar
        };

        $ul = $(c.ul).addClass(ulClass);
        $root = $(c.root);

        if(c.hideScrollbar) {
            var $ulCopy = $ul.clone(true);
            $root.empty().addClass(hiddenScrollbarClass);
            $scrollable = $('<div></div>').appendTo($root)
                .addClass(hiddenScrollbarInnerClass)
                .on('scroll', onScroll)
                .append($ulCopy);
            $ul = $('.'+ulClass);
        }
        else {
            $scrollable = $root;
        }


        $(c.liClass).each(function(i, li){
            var $li = $(li),
                id = _this.data[i].id;

            $li.addClass(liClass).attr(urankIdAttr, id);
            $li.find(c.liTitle).addClass(liTitleClass);

            var $rankingDiv = $li.find(c.liRankingContainer).empty().addClass(liRankingContainerClass).css('visibility', 'hidden');
            $("<div></div>").appendTo($rankingDiv).addClass(rankingPosClass);
            $("<div></div>").appendTo($rankingDiv).addClass(rankingPosMovedClass);

            $li.find(c.watchicon).addClass(watchiconClass+' '+watchiconOffClass);
            $li.find(c.favicon).addClass(faviconClass+' '+faviconOffClass);

            bindEventHandlers($li, id, i);
        });

        hoveredClass = c.liHoverClass == '' ? hoveredClass : c.liHoverClass;
        liLightBackgroundClass = c.liLightBackgroundClass == '' ? liLightBackgroundClass : c.liLightBackgroundClass;
        liDarkBackgroundClass = c.liDarkBackgroundClass == '' ? liDarkBackgroundClass : c.liDarkBackgroundClass;
    };


    var buildDefaultList = function() {

        $root.find('.'+listContainerClass).remove();
        $root.find('.'+hiddenScrollbarInnerClass).remove();

        $listContainer = $('<div/>').appendTo($root).addClass(listContainerClass + ' ' + hiddenScrollbarClass);
        $scrollable = $('<div/>').appendTo($root)
            .addClass(hiddenScrollbarInnerClass)
            .on('scroll', onScroll);

        $ul = $('<ul></ul>').appendTo($scrollable).addClass(ulClass +' '+ ulClassDefault);

        _this.data.forEach(function(d, i){
            // li element
            var $li = $('<li></li>', { 'urank-id': d.id, 'original-index': i }).appendTo($ul).addClass(liClass +' '+ liClassDefault);
            // ranking section
            var $rankingDiv = $("<div></div>").appendTo($li).addClass(liRankingContainerClass).css('visibility', 'hidden');
            $("<div></div>").appendTo($rankingDiv).addClass(rankingPosClass);
            $("<div></div>").appendTo($rankingDiv).addClass(rankingPosMovedClass);
            // title section
            var $titleDiv = $("<div></div>").appendTo($li).addClass(liTitleContainerClass);
            $('<h3></h3>', { id: 'urank-list-li-title-' + i, class: liTitleClass +' '+ liTitleClassDefault, html: d.title/*, title: d.title + '\n' + d.description*/ }).appendTo($titleDiv);
            // buttons section
            var $buttonsDiv = $("<div></div>").appendTo($li).addClass(liButtonsContainerClass);
            $("<span>").appendTo($buttonsDiv).addClass(watchiconClass+' '+watchiconDefaultClass+' '+watchiconOffClass);
            var favIconStateClass = d.bookmarked ? faviconOnClass : faviconOffClass;
            $("<span>").appendTo($buttonsDiv).addClass(faviconClass+' '+faviconDefaultClass+' '+favIconStateClass);
            // Subtle animation
//            $li.animate({ opacity: 0 }, 0)
//                .queue(function(){
//                $(this).animate({ opacity: 1 }, (i+1)*100, 'swing')
//            }).queue(function(){
//                $(this).css('opacity', '');
//                bindEventHandlers($li, d.id, i);
//            }).dequeue();
            $li.hide().fadeIn((i+1)*100);
            bindEventHandlers($li, d.id, i);
        });
    };


    var buildHeader = function(height){

        $('.'+headerClass).remove();
        $header = $('<div/>').appendTo($root).addClass(headerClass+' '+headerStyleClass).css('height', height);
        var $headerPos = $('<div/>').appendTo($header).addClass(headerPosAndshiftClass);
        $('<div/>', { text: 'Position'}).appendTo($headerPos).addClass('label-container');

        var $headerShift = $('<div/>').appendTo($header).addClass(headerPosAndshiftClass);
        $('<div/>', { text: 'Country'}).appendTo($headerShift).addClass('label-container');

        var $headerTitle = $('<div/>').appendTo($header).addClass(headerTitleClass);
//        $('<p/>', { text: 'Document Titles'}).appendTo($headerTitle);
        $('<p/>', { text: 'Universities'}).appendTo($headerTitle);
    };

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype methods

    var _build = function(data, opt, headerHeight) {
        _this.originalData = data.slice();
        _this.data = data.slice();
        _this.selectedKeywords = [];
        _this.status = RANKING_STATUS.no_ranking;
        _this.opt = opt;
        _this.headerHeight = headerHeight || _this.headerHeight;
        $root = $(s.root).addClass(contentListClass);

        if(this.opt.header)
            buildHeader(_this.headerHeight);

        if(this.opt.custom)
            buildCustomList();
        else
            buildDefaultList();

        formatTitles();
        updateLiBackground();
    };



    /**
    * @private     * Description
    * @param {type} data : current ranking
    * @param {type} status Description
    */
//    var _update = function(data, status, selectedKeywords, colorScale) {
    var _update = function(rankingModel, options) {

        this.status = rankingModel.getStatus();
        this.data = (this.status != RANKING_STATUS.no_ranking) ? rankingModel.getRanking().slice() : this.data;
        this.dataDict = rankingModel.getRankingDict();
        this.selectedKeywords = rankingModel.getQuery().map(function(k){ return k.stem });

        _this.timestamp = $.now();
        $('.'+liClass).stop(true, true)
            .removeClass(liMovingUpClass).removeClass(liMovingDownClass).removeClass(liNotMovingClass)  //stop animation
            .removeClass(selectedClass).removeClass(dimmedClass);                                        // deselect all classes

//        console.log('Stop Animation');
//        stopAnimation();
//        console.log('Deselect items');
//        this.deselectAllListItems();
//        formatTitles(options.colorScale);

//        console.log('Hide unranked');
//        hideUnrankedListItems();
        var updateFunc = {};
        updateFunc[RANKING_STATUS.new] = animateAccordionEffect; //animateResortEffect;
        updateFunc[RANKING_STATUS.update] = animateResortEffect;
        updateFunc[RANKING_STATUS.unchanged] = animateUnchangedEffect;
        updateFunc[RANKING_STATUS.no_ranking] = _this.reset;

        updateLiBackground();
        sort();
        updateFunc[this.status]();
        showRankingPositions();
        setTimeout(removeMovingStyle, 3000);
        //  When animations are triggered too fast and they can't finished in order, older timeouts are canceled and only the last one is executed
        //  (list is resorted according to last ranking state)
    };



    var _reset = function() {
        _this.build(_this.originalData, _this.opt);
/*        this.data = _this.originalData.slice();
        this.selectedKeywords = [];
        updateLiBackground();
        sort();
        formatTitles();
        $('.'+liClass).show().find('.'+liRankingContainerClass).css('visibility', 'hidden');

        $ul.removeClass(ulPaddingBottomclass);*/
    };



    var _selectListItem = function(id) {
        //stopAnimation();
        $('.'+liClass+'['+urankIdAttr+'!='+id+']').addClass(dimmedClass);
        $('.'+liClass+'['+urankIdAttr+'="'+id+'"]').addClass(selectedClass);
    };


    var _deselectAllListItems = function() {
        //$('.'+liClass).removeClass(selectedClass, 1200, 'easeOutCirc').removeClass(dimmedClass);
        $('.'+liClass).removeClass(selectedClass).removeClass(dimmedClass);
    };


    // receives actual index
    var _hover = function(id) {
        $('.'+liClass+'['+urankIdAttr+'="'+id+'"]').addClass(hoveredClass);
    };


    var _unhover = function(id) {
        $('.'+liClass+'['+urankIdAttr+'="'+id+'"]').removeClass(hoveredClass);
    };


    var _highlightListItems = function(idArray) {
        stopAnimation();
        $('.'+liClass).each(function(i, li){
            var $li = $(li);
            if(idArray.indexOf($li.attr(urankIdAttr)) === -1)
                $li.addClass(dimmedClass);
//            else {
//                if(!$li.is(':visible'))
//                    $li.removeClass(liDarkBackgroundClass).removeClass(liLightBackgroundClass).addClass(liUnrankedClass);
//                $li.css({ display: '', opacity: ''});
//            }
        });



        $ul.removeClass(ulPaddingBottomclass);
        _this.multipleHighlightMode = true;
    };



    var _clearAllFavicons = function(){
        $('.'+liClass).find(' .' + faviconClass).removeClass(faviconOnClass);//.addClass(faviconOffClass);
    };


    var _toggleFavicon = function(id){
        //var favIcon = $(liItem + '' + id).find(' .' + faviconClass);
        var favIcon = $('.'+liClass+'['+urankIdAttr+'="'+id+'"]').find(' .' + faviconClass);
        var classToAdd = favIcon.hasClass(faviconOffClass) ? faviconOnClass : faviconOffClass;
        var classToRemove = classToAdd === faviconOnClass ? faviconOffClass : faviconOnClass;
        favIcon.switchClass(classToRemove, classToAdd);
    };


    var _toggleWatchListItem = function(id){
        var $li = $('.'+liClass+'['+urankIdAttr+'="'+id+'"]');
        var watchIcon = $li.find(' .' + watchiconClass);
        var classToAdd = watchIcon.hasClass(watchiconOffClass) ? watchiconOnClass : watchiconOffClass;
        var classToRemove = classToAdd === watchiconOnClass ? watchiconOffClass : watchiconOnClass;
        watchIcon.switchClass(classToRemove, classToAdd);
        $li.toggleClass(watchedClass);
    };


    var _clearEffects = function() {
        this.deselectAllListItems();
        if(this.multipleHighlightMode) hideUnrankedListItems();
    };


    var _clear = function() {
        console.log(_this.opt);
        if(!_this.opt.custom)
            $root.empty();
        /* todo else */
    };


    var _destroy = function() {
        if(!this.opt || !this.opt.custom) return;

        if(!this.opt.custom)
            $root.empty().removeClass(contentListClass+' '+hiddenScrollbarClass);
        else {
            if($listContainer.hasClass(hiddenScrollbarClass)) {
                var $ulCopy = $ul.clone(true);
                $root.empty().append($ulCopy);
            }
            $root.removeClass(contentListClass);
            $('.'+ulClass).removeClass(ulClass);
            $('.'+liClass).removeAttr(urankIdAttr)
                .removeClass(liClass+' '+liLightBackgroundClass+' '+liDarkBackgroundClass+' '+liUnrankedClass+' '+liMovingUpClass+' '+liMovingDownClass+' '+liNotMovingClass);
            $('.'+liRankingContainerClass).empty().removeClass(liRankingContainerClass);
            $('.'+liTitleClass).removeClass(liTitleClass);
            $('.'+watchiconClass).removeClass(watchiconClass+' '+watchiconOffClass+' '+watchiconOnClass);
            $('.'+faviconClass).removeClass(faviconClass+' '+faviconOffClass+' '+faviconOnClass);
        }
    };


    var _scrollTo = function(scroll) {
        $scrollable.off('scroll', onScroll)
            .scrollTop(scroll)
            .on('scroll', onScroll);
    };

    var _getListHeight = function() {
        return $ul.fullHeight();
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
        clear: _clear,
        destroy: _destroy,
        scrollTo: _scrollTo,
        getListHeight: _getListHeight
    };

    return ContentList;
})();


