var VisCanvas = (function(){

    //  Settings
    var _this, s = {};
    // Classes
    var viscanvasClass = 'urank-viscanvas',
        viscanvasContainerClass = 'urank-viscanvas-container',
        visCanvasMessageClass = 'urank-viscanvas-message';
    // Helper
    var $root, $visContainer;

    var customScrollOptions = {
        axis: 'y',
        theme: 'light',
        autoHideScrollbar: true,
        scrollEasing: 'linear',
        mouseWheel: {
            enable: true,
            axis: 'y'
        },
        keyboard: {
            enable: true
        },
        advanced: {
            updateOnContentResize: true
        },
        callbacks: {
            whileScrolling: function() {
                var scroll = this.mcs.top;
                s.onScroll.call(this, _this, scroll);
            }
        }
    };

    var onScroll = function(event) {
        event.stopPropagation();
        s.onScroll.call(this, _this, $(this).scrollTop());
    };


    function VisCanvas(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            onItemClicked: function(id){},
            onItemMouseEnter: function(id){},
            onItemMouseLeave: function(id){},
            onScroll: function(scroll){}
        }, arguments);
        $root = $(s.root);
    }


    var _build = function(opt) {
        $root = $(s.root).empty().addClass(viscanvasClass);
        $visContainer = $('<div></div>').appendTo($root).addClass(viscanvasContainerClass);

        var visModule = VIS_MODULES[opt.module] || VIS_MODULES.ranking;
        this.clear();
        this.vis = new visModule($.extend({}, s, { root: '.'+viscanvasContainerClass }, opt.customOpt));

        /*if(opt.customScrollBars)
            $root.mCustomScrollbar(customScrollOptions);*/

        $root.on('scroll', onScroll);
        return this;
    };


    var _update = function(rankingModel, colorScale, listHeight, containerHeight) {
        $root.scrollTo('top');
        this.vis.update(rankingModel, colorScale, listHeight, containerHeight);
        return this;
    };

    var _resize = function(){
        if(this.vis) this.vis.resize();
        return this;
    };

    var _clear = function(){
        if(this.vis) this.vis.clear();
    //    $root.append("<p class='" + visCanvasMessageClass + "'>" + STR_NO_VIS + "</p>");
        return this;
    };

    var _selectItem =function(id) {
        if(this.vis) this.vis.selectItem(id);
        return this;
    };

    var _deselectAllItems =function() {
        if(this.vis) this.vis.deselectAllItems();
        return this;
    };

    var _hoverItem = function(id) {
        if(this.vis) this.vis.hoverItem(id);
        return this;
    };

    var _unhoverItem = function(id) {
        if(this.vis) this.vis.unhoverItem(id);
        return this;
    };

    var _highlightItems = function(idsArray) {
        if(this.vis) this.vis.highlightItems(idsArray);
        return this;
    };

    var _clearEffects = function() {
        if(this.vis) if(this.vis) this.vis.clearEffects();
        return this;
    };

    var _destroy = function() {
        if(this.vis) this.vis.clear();
        $root.removeClass(viscanvasClass);
        return this;
    };

    var _scrollTo = function(offset) {
        $root.off('scroll', onScroll)
            .scrollTop(offset)
            .on('scroll', onScroll);
    };


    VisCanvas.prototype = {
        build: _build,
        update: _update,
        clear: _clear,
        resize: _resize,
        selectItem: _selectItem,
        deselectAllItems: _deselectAllItems,
        hoverItem: _hoverItem,
        unhoverItem: _unhoverItem,
        highlightItems: _highlightItems,
        clearEffects: _clearEffects,
        destroy: _destroy,
        scrollTo: _scrollTo
    };

    return VisCanvas;
})();
