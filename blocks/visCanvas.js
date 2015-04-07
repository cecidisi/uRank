var VisCanvas = (function(){

    //  Settings
    var s = {};
    // Classes
    var visCanvasContainerClass = 'urank-viscanvas-container',
        visCanvasMessageClass = 'urank-viscanvas-message';

    function VisCanvas(arguments) {
        s = $.extend({
            root: '',
            visModule: VIS_MODULES.ranking,
            onItemClicked: function(id){},
            onItemHovered: function(id){},
            onItemUnhovered: function(id){}
        }, arguments);
    }


    var _build = function() {
        $(s.root).addClass(visCanvasContainerClass);
        var visArguments = {
            root: s.root,
            onItemClicked: s.onItemClicked,
            onItemMouseEnter: s.onItemMouseEnter,
            onItemMouseLeave: s.onItemMouseLeave
        };

        this.vis = new s.visModule(visArguments);
        this.clear();
    };


    var _update = function(rankingModel, containerHeight, colorScale) {
        this.vis.update(rankingModel, containerHeight, colorScale);
        $(s.root).scrollTo('top');
    };

    var _resize = function(){
        this.vis.resize();
    };

    var _clear = function(){
        this.vis.clear();
        $(s.root).append("<p class='" + visCanvasMessageClass + "'>" + STR_NO_VIS + "</p>");
    };

    var _selectItem =function(id) {
        this.vis.selectItem(id);
    };

    var _deselectAllItems =function() {
        this.vis.deselectAllItems();
    };

    var _hoverItem = function(id) {
        this.vis.hoverItem(id);
    };

    var _unhoverItem = function(id) {
        this.vis.unhoverItem(id);
    };

    var _highlightItems = function(idsArray) {
        this.vis.highlightItems(idsArray);
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
        highlightItems: _highlightItems
    };

    return VisCanvas;
})();
