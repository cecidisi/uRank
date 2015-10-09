var DocViewer = (function(){

    var _this;
    // Settings
    var s = {};
    // Classes
    var docViewerOuterClass = 'urank-docviewer-outer',
        docViewerContainerClass = 'urank-docviewer-container',
        defaultDocViewerContainerClass = 'urank-docviewer-container-default',
        detailsSectionClass = 'urank-docviewer-details-section',
        contentSectionOuterClass = 'urank-docviewer-content-section-outer',
        contentSectionClass = 'urank-docviewer-content-section';
    // Id prefix
    var detailItemIdPrefix = '#urank-docviewer-details-';
    // Selectors
    var $root = $(''), $container = $(''),
        $detailsSection = $(''),
        $contentSection = $('');
    // Helper
    var customScrollOptions = {
        axis: 'y',
        theme: 'light',
        //scrollbarPosition: 'outside',
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
        }
    };



    function DocViewer(arguments) {
        s = $.extend({
            root: '',
            onDocViewerHidden: function(){}
        }, arguments);
        _this = this;
    }


    var _build = function(opt) {

        this.opt = opt.misc;

        if(s.root == '') {
            $('.'+docViewerOuterClass).remove();
            $root = $('<div/>').appendTo('body').addClass(docViewerOuterClass).hide();
            $container = $('<div/>').appendTo($root).addClass(docViewerContainerClass);
        }
        else {
            $root = $(s.root).empty();
            $container = $root;
        }

        $root.on('click', function(event){ event.stopPropagation(); s.onDocViewerHidden.call(this); });
        $container.on('click', function(event){ event.stopPropagation() });

        // Append details section, titles and placeholders for doc details
        $detailsSection = $("<div class='" + detailsSectionClass + "'></div>").appendTo($container);

        var $titleContainer = $('<div/>').appendTo($detailsSection);
        $("<label>Title:</label>").appendTo($titleContainer);
        $("<h3 id='urank-docviewer-details-title'></h3>").appendTo($titleContainer);
        var $authorSection = $('<div/>').appendTo($detailsSection);
        $('<label/>').appendTo($authorSection).html('Author:');
        $('<span/>', { id: 'urank-docviewer-details-author' }).appendTo($authorSection);

        this.opt.facetsToShow.forEach(function(facetName){
            var $facetContainer = $('<div></div>').appendTo($detailsSection);
            $("<label>" + facetName.capitalizeFirstLetter() + ":</label>").appendTo($facetContainer);
            $("<span id='urank-docviewer-details-" + facetName + "'></span>").appendTo($facetContainer);
        });

        // Append content section for snippet placeholder
        var $contentSectionOuter = $('<div></div>').appendTo($container).addClass(contentSectionOuterClass);
        $contentSection = $('<div></div>').appendTo($contentSectionOuter).addClass(contentSectionClass);
        $('<p></p>').appendTo($contentSection);

        $root.on('mousedown', function(event){ event.stopPropagation(); });

        if(this.opt.customScrollBars)
            $contentSectionOuter.css('overflowY', 'hidden').mCustomScrollbar(customScrollOptions);
    };



    /**
    * @private
    * Description
    * @param {type} document Description
    * @param {Array} keywords (only stems)
    */
    var _showDocument = function(document, keywords, colorScale){

        $root.show();
        $(detailItemIdPrefix + 'title').html(getStyledText(document.title, keywords, colorScale));
        $(detailItemIdPrefix + 'author').html(document.creator);

        var getFacet = function(facetName, facetValue){
            return facetName == 'year' ? parseDate(facetValue) : facetValue;
        };

        var facets = (this.opt && this.opt.facetsToShow) ? this.opt.facetsToShow : [];
        facets.forEach(function(facet){
            //console.log(getFacet(facet, document.facets[facet]));
            //$(detailItemIdPrefix + '' + facet).html(getFacet(facet, document.facets[facet]));
            $(detailItemIdPrefix + '' + facet).html(document.facets[facet]);
        });

        $contentSection.empty();
        var $p = $('<p></p>').appendTo($contentSection).html(getStyledText(document.description, keywords, colorScale));
        $p.hide().fadeIn('slow').scrollTo('top');
    };


    var _clear = function(){
        $root.hide();
        // Clear details section
        $(detailItemIdPrefix + 'title').empty();
        $(detailItemIdPrefix + 'author').empty();
        var facets = (this.opt && this.opt.facetsToShow) ? this.opt.facetsToShow : [];
        facets.forEach(function(facet){
            $(detailItemIdPrefix + '' + facet).empty();
        });
        // Clear content section
        $contentSection.empty();
    };


    var _destroy = function() {
        $root.empty().removeClass(docViewerContainerClass)
    };


    // Prototype
    DocViewer.prototype = {
        build: _build,
        clear: _clear,
        showDocument: _showDocument,
        destroy: _destroy
    };

    return DocViewer;
})();
