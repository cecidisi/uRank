var VisCanvas = (function(){

    //  Settings
    var _this, s = {}, $root = $('');
    // Classes
    var visCanvasContainerClass = 'urank-viscanvas-container',
        defaultVisCanvasContaienrClass = 'urank-viscanvas-container-default',
        visCanvasMessageClass = 'urank-viscanvas-message';

    function VisCanvas(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            onItemClicked: function(id){},
            onItemMouseEnter: function(id){},
            onItemMouseLEave: function(id){}
        }, arguments);
    }


    var _build = function(opt) {
        var containerClasses = (opt.defaultStyle) ? visCanvasContainerClass +' '+ defaultVisCanvasContaienrClass : visCanvasContainerClass;
        $root = $(s.root).empty().addClass(containerClasses);

        var visModule = VIS_MODULES[opt.module] || VIS_MODULES.ranking;
        this.vis = new visModule($.extend(s, opt.customOpt));
        this.clear();
    };


    var _update = function(rankingModel, containerHeight, colorScale) {
        this.vis.update(rankingModel, containerHeight, colorScale);
        $root.scrollTop();
    };

    var _resize = function(){
        this.vis.resize();
    };

    var _clear = function(){
        this.vis.clear();
        $root.append("<p class='" + visCanvasMessageClass + "'>" + STR_NO_VIS + "</p>");
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

    var _clearEffects = function() {
        if(this.vis) this.vis.clearEffects();
    };

    var _destroy = function() {
        if(this.vis)this.vis.clear();
        $root.removeClass(visCanvasContainerClass);
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
        destroy: _destroy
    };

    return VisCanvas;
})();
