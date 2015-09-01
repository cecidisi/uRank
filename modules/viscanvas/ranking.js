var Ranking = (function(){

    var RANKING = {};
    var s, _this;
    var width, height, margin;
    var x, y, color, xAxis, yAxis;
    var svg;
    var data;
    var $root = $('');

    //  Classes
    var svgClass = 'urank-ranking-svg',
        axisClass = 'urank-ranking-axis',
        xClass = 'urank-ranking-x',
        xAxisLabelClass = 'urank-ranking-label',
        yClass = 'urank-ranking-y',
        stackedbarClass = 'urank-ranking-stackedbar',
        backgroundClass = 'urank-ranking-background',
        lightBackgroundClass = 'urank-ranking-light-background',
        darkBackgroundClass = 'urank-ranking-dark-background',
        barClass = 'urank-ranking-bar',
        tuSectionClass = 'urank-tag-user-section';

    // Id
    var stackedbarPrefix = '#urank-ranking-stackedbar-';

    function Ranking(arguments) {
        _this = this;
        s = $.extend({
            root: '.urank-viscanvas-container',
//            rootSocial: '.urank-viscanvas-container-social',
//            rootTagged: '.urank-viscanvas-container-tagged',
//            rootSeparation: '.urank-viscanvas-container-separation',
            onItemClicked: function(document){},
            onItemMouseEnter: function(document){},
            onItemMouseLeave: function(document){},
            lightBackgroundColor: '',
            darkBackgroundColor: ''
        }, arguments);

        this.isRankingDrawn = false;
    }

    RANKING.Settings = {
        getInitData: function(rankingModel, color){
            var a = [];
            var rankingData = rankingModel.getRanking().slice();
            var score = rankingModel.getMode();
            rankingData.forEach(function(d, i){
                if(d.ranking.overallScore > 0) {
                    var x0 = 0;
                    d.bars = [];
                    // keyword bars
                    d.ranking.cbKeywords.forEach(function(k, i){

                        d.bars.push({
                            desc: k.stem,
                            x0: x0,
                            x1: x0 + k.weightedScore,
                            color: color(k.stem)
                        });
                        x0 = d.bars[i].x1;
                    });

                    x0 = (score == window.RANKING_MODE.by_CB || score == window.RANKING_MODE.by_TU) ? 1 : x0;
                    d.bars.push({
                        desc: 'TU',
                        x0: x0,
                        x1: x0 + d.ranking.tuScore,
                        color: '#606060'
                    });
                    a.push(d);
                }
            });
            return a;
        }
    };


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    RANKING.Evt = {};


    RANKING.Evt.itemClicked = function(d, i){
        d3.event.stopPropagation();
        s.onItemClicked.call(this, d.id);
    };

    RANKING.Evt.itemMouseEntered = function(d, i){
        d3.event.stopPropagation();
        s.onItemMouseEnter.call(this, d.id);
    };

    RANKING.Evt.itemMouseLeft = function(d, i){
        d3.event.stopPropagation();
        s.onItemMouseLeave.call(this, d.id);
    };


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    RANKING.Render = {

        /******************************************************************************************************************
        *
        *	Draw ranking at first instance
        *
        * ***************************************************************************************************************/
        drawNew: function(rankingModel, colorScale, listHeight){
            _this.clear();
            _this.isRankingDrawn = true;
            // Define input variables
            data = RANKING.Settings.getInitData(rankingModel, colorScale);
            // Define canvas dimensions
            margin = { top: 0, bottom: 0, left: 0, right: 1 };
            width = $root.width() - margin.left - margin.right;
            height = listHeight;
            var xUpperLimit = rankingModel.getMode() == RANKING_MODE.overall ? 1 : 2;

            // Define scales
		    x = d3.scale.linear()
                .domain([0, xUpperLimit])
                .rangeRound( [0, width] );

            y = d3.scale.ordinal()
                .domain(data.map(function(d, i){ return i; }))
                .rangeBands( [0, height], .02);

            //color = colorScale;

            // Define axis' function
            xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
//                .tickFormat(function(value){ if(value > 0 && value < 2) return (value * 100 / 2) + '%'; return ''; });
                .tickValues('');

            yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickValues("");

            // Draw chart main components
            //// Add svg main components
            svg = d3.select(s.root).append("svg")
                .attr("class", svgClass)
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.append("g")
                .attr("class", xClass + ' ' + axisClass)
                .attr("transform", "translate(0," + (height) + ")")
                .call(xAxis)
                .selectAll('text');

            svg.append("g")
                .attr("class", yClass +' '+axisClass)
                .call(yAxis)
                .selectAll("text");


//            // svg tagged elements
//            svgTagged = d3.select(s.rootTagged).append("svg")
//                .attr("class", svgClass)
//                .attr("width", $('.urank-viscanvas-container-tagged').width())
//                .attr("height", height + margin.top + margin.bottom + 30)
//                .append("g")
//                .attr("width", $('.urank-viscanvas-container-tagged').width())
//                .attr("height", height + 30)
//                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            //// Create drop shadow to use as filter when a bar is hovered or selected
            RANKING.Render.createShadow();
            //// Add stacked bars
            RANKING.Render.drawStackedBars();
            RANKING.Render.drawTagsAndUsersHints();
        },

        /******************************************************************************************************************
        *
        *	Redraw updated ranking and animate with transitions to depict changes
        *
        * ***************************************************************************************************************/
        redrawUpdated: function(rankingModel, colorScale, listHeight){

            // Define input variables
            data = RANKING.Settings.getInitData(rankingModel, colorScale);
            width = $root.width()
            RANKING.Render.updateCanvasDimensions(listHeight);

            // Redefine x & y scales' domain
            d3.select(s.root).select('.'+svgClass).attr("width", width)
            svg.attr("width", width);

            var xUpperLimit = rankingModel.getMode() == RANKING_MODE.overall ? 1 : 2;
            x.rangeRound( [0, width] )
             .domain([0, xUpperLimit]).copy();

            y.rangeBands( [0, height], .02);
            y.domain(data.map(function(d, i){ return i; })).copy();


            var transition = svg.transition().duration(750),
                delay = function(d, i) { return i * 50; };

            transition.select('.'+xClass+'.'+axisClass).call(xAxis)
                .selectAll("g").delay(delay);

            transition.select('.'+yClass+'.'+axisClass).call(yAxis)
                .selectAll("g").delay(delay);

            RANKING.Render.drawStackedBars();
            RANKING.Render.drawTagsAndUsersHints();
        },



        /******************************************************************************************************************
        *
        *	Draw stacked bars either on draw or update methods. Animate with width transition
        *
        * ***************************************************************************************************************/
        drawStackedBars: function(){
            svg.selectAll('.'+stackedbarClass).data([]).exit();
            svg.selectAll('.'+stackedbarClass).remove();
            svg.selectAll('.'+stackedbarClass).data(data).enter();


            setTimeout(function(){
                var stackedBars = svg.selectAll('.'+stackedbarClass)
                    .data(data).enter()
                    .append("g")
                    .attr("class", stackedbarClass)
                    .attr("id", function(d, i){ return "urank-ranking-stackedbar-" + d.id; })
                    .attr( "transform", function(d, i) { return "translate(0, " + y(i) + ")"; } )
                    .on('click', RANKING.Evt.itemClicked)
                    .on('mouseover', RANKING.Evt.itemMouseEntered)
                    .on('mouseout', RANKING.Evt.itemMouseLeft);

                stackedBars.append('rect')
                    .attr('class', function(d, i){ if(i%2) return darkBackgroundClass; return lightBackgroundClass; })
                    .attr('x', 0)
                    .attr('width', width)
                    .attr('height', y.rangeBand())
                    .style('fill', function(d, i){
                        if(s.lightBackgroundColor != '' && s.darkBackgroundColor != '') {
                            if(i%2) return s.darkBackgroundColor;
                            return s.lightBackgroundColor;
                        }
                        return  '';
                    });


                stackedBars.selectAll('.'+barClass)
                    .data(function(d) { return d.bars })
                    .enter()
                    .append("rect")
                    .attr("class", barClass)
                    .attr("height", y.rangeBand())
                    .attr("x", function(d) { return x(d.x0); })
                    .attr("width", 0)
                    .style("fill", function(d) { return d.color; });

                var bars = stackedBars.selectAll('.'+barClass);

                var t0 = bars.transition()
                    .duration(500)
                    .attr({ "width": function(d) { return x(d.x1) - x(d.x0); } });

            }, 800);
        },

        /******************************************************************************************************************
        *
        *	Draw minimal views for tag- and user-based recommendations
        *
        * ***************************************************************************************************************/
        drawTagsAndUsersHints: function() {

            setTimeout(function(){
                var tagUserSection = svg.selectAll('.urank-ranking-stackedbar').append('g')
                    .attr('width', 50)
                    .attr('height', y.rangeBand())
                    .attr("transform", function(d, i){ "translate(" + x(0.8) + "," + y(i) + ")" })
;

                tagUserSection.append('rect')
                    .attr('class', tuSectionClass)
                    .attr('width', 50)
                    .attr('height', y.rangeBand())
                    .attr('x', x(1.8))
//                    .attr("transform", function(d, i){ "translate(" + x(0.8) + "," + y(i) + ")" })
                    .style('fill', 'red');



            }, 801);

            // svg tagged elements
            /*            svgTagged.selectAll('.'+stackedbarClass).data([]).exit();
            svgTagged.selectAll('.'+stackedbarClass).remove();
            svgTagged.selectAll('.'+stackedbarClass).data(data).enter();*/


            // svg tagged elements
            /*                stackedBars = svgTagged.selectAll('.'+stackedbarClass)
                .data(data).enter()
                .append("g")
                .attr("class", stackedbarClass)
                .attr("id", function(d, i){ return "urank-ranking-stackedbar-" + d.id; })
                .attr( "transform", function(d, i) { return "translate(0, " + y(i) + ")"; } )
                .on('click', RANKING.Evt.itemClicked)
                .on('mouseover', RANKING.Evt.itemMouseEntered)
                .on('mouseout', RANKING.Evt.itemMouseLeft);

                stackedBars.append('rect')
                    .attr('class', function(d, i){ if(i%2) return darkBackgroundClass; return lightBackgroundClass; })
                    .attr('x', 0)
                    .attr('width', $('.urank-viscanvas-container-tagged').width())
                    .attr('height', y.rangeBand())
                    .style('fill', function(d, i){
                        if(s.lightBackgroundColor != '' && s.darkBackgroundColor != '') {
                            if(i%2) return s.darkBackgroundColor;
                            return s.lightBackgroundColor;
                        }
                        return  '';
                    });

                stackedBars.selectAll('.'+barClass)
                    .data(function(d) {
                        for(var j = 0; j < RANKING.Settings.recData.length; j++) {
                            if(RANKING.Settings.recData[j].doc === d.id) {
                                var users = [];
                                users.push(RANKING.Settings.recData[j].misc.users);
                                return users;
                            }
                        }
                        return 0;
                    })
                    .enter()
                    .append("text")
                    .attr("x", $('.urank-viscanvas-container-tagged').width() * 0.8)
                    .attr("y", 11)
                    .text(function(d) { return d;});

                var highestTagValue = 0;
                stackedBars.selectAll('.'+barClass)
                    .data(function(d) {
                        for(var j = 0; j < RANKING.Settings.recData.length; j++) {
                            if(RANKING.Settings.recData[j].doc === d.id) {
                                var taggedData = [];
                                for(var tag in RANKING.Settings.recData[j].misc.tags) {
                                    if(RANKING.Settings.recData[j].misc.tags[tag].tagged !== undefined)
                                        taggedData.push({"tag": tag, "number": RANKING.Settings.recData[j].misc.tags[tag].tagged,
                                        "stem": RANKING.Settings.recData[j].misc.tags[tag].stem});
                                    if(RANKING.Settings.recData[j].misc.tags[tag].tagged > highestTagValue)
                                        highestTagValue = RANKING.Settings.recData[j].misc.tags[tag].tagged;
                                }
                                //console.log("taggedData: ", taggedData);
                                return taggedData;
                            }
                        }
                        return 0;
                    })
                    .enter()
                    .append("rect")
                    .attr("class", barClass)
                    .attr("height", function(d, i) { return (y.rangeBand() * 0.8) * d.number / highestTagValue; })
                    .attr("x", function(d, i) {
                        for(var j = 0; j < data[0].weightedKeywords.length; j++)
                            if(d.tag === data[0].weightedKeywords[j].term)
                                return 15 * j + 3;
                    })
                    .attr("y", function(d, i) { return y.rangeBand() -  (y.rangeBand() * 0.8) * d.number / highestTagValue; })
                    .attr("width", $('.urank-viscanvas-container-tagged').width() * 0.1)
                    .style("fill", function(d) { return color(d.stem); });*/



        },

        /******************************************************************************************************************
        *
        *	Create drop shadow for click effect on bars
        *
        * ***************************************************************************************************************/
        createShadow: function(){

            // filters go in defs element
            var defs = svg.append("defs");

            // create filter with id #drop-shadow
            // height=130% so that the shadow is not clipped
            var filter = defs.append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "130%");

            // SourceAlpha refers to opacity of graphic that this filter will be applied to
            // convolve that with a Gaussian with standard deviation 3 and store result
            // in blur
            filter.append("feGaussianBlur")
                .attr("in", "SourceAlpha")
                .attr("stdDeviation", 2)
                .attr("result", "blur");

            // translate output of Gaussian blur to the right and downwards with 2px
            // store result in offsetBlur
            filter.append("feOffset")
                .attr("in", "blur")
                .attr("dx", 0)
                .attr("dy", 2)
                .attr("result", "offsetBlur");

            // overlay original SourceGraphic over translated blurred opacity by using
            // feMerge filter. Order of specifying inputs is important!
            var feMerge = filter.append("feMerge");
            feMerge.append("feMergeNode").attr("in", "offsetBlur")
            feMerge.append("feMergeNode").attr("in", "SourceGraphic");

//
//            // svg tagged elements
//            // filters go in defs element
//            defs = svgTagged.append("defs");
//
//            // create filter with id #drop-shadow
//            // height=130% so that the shadow is not clipped
//            filter = defs.append("filter")
//            .attr("id", "drop-shadow")
//            .attr("height", "130%");
//
//            // SourceAlpha refers to opacity of graphic that this filter will be applied to
//            // convolve that with a Gaussian with standard deviation 3 and store result
//            // in blur
//            filter.append("feGaussianBlur")
//                .attr("in", "SourceAlpha")
//                .attr("stdDeviation", 2)
//                .attr("result", "blur");
//
//            // translate output of Gaussian blur to the right and downwards with 2px
//            // store result in offsetBlur
//            filter.append("feOffset")
//                .attr("in", "blur")
//                .attr("dx", 0)
//                .attr("dy", 2)
//                .attr("result", "offsetBlur");
//
//            // overlay original SourceGraphic over translated blurred opacity by using
//            // feMerge filter. Order of specifying inputs is important!
//            feMerge = filter.append("feMerge");
//            feMerge.append("feMergeNode").attr("in", "offsetBlur")
//            feMerge.append("feMergeNode").attr("in", "SourceGraphic");
        },

        /*****************************************************************************************************************
        *
        *	Adjust height of svg and other elements when the ranking changes
        *
        * ***************************************************************************************************************/
        updateCanvasDimensions: function(listHeight){

            height = listHeight;
            y.rangeBands(height, .01);

            d3.select(svg.node().parentNode)    // var svg = svg > g
                .attr('height', height + margin.top + margin.bottom);

            svg.attr("height", height + 30)
                .attr("transform", "translate(" + (margin.left) + ", 0)");

            // update axes
            svg.select('.'+xClass+'.'+axisClass).attr("transform", "translate(0," + (height) + ")").call(xAxis.orient('bottom'));


            // svg tagged elements
/*
            d3.select(svgTagged.node().parentNode)    // var svg = svg > g
                .attr('height', height + margin.top + margin.bottom + 30);

            svgTagged.attr("height", height + 30)
                .attr("transform", "translate(" + (margin.left) + ", 0)");

            // update axes
            svgTagged.select('.'+xClass+'.'+axisClass).attr("transform", "translate(0," + (height) + ")").call(xAxis.orient('bottom'));
*/
        },

        /*****************************************************************************************************************
        *
        *	Redraw without animating when the container's size changes
        *
        * ***************************************************************************************************************/
        resizeCanvas: function(containerHeight) {

            //  Resize container if containerHeight is specified
            if(containerHeight)
                $root.css('height', containerHeight);

            //  Recalculate width
            width = $root.width() - margin.left - margin.right;

            x.rangeRound([0, width]);
            y.rangeBands(height, .02);

            d3.select(svg.node().parentNode).attr('width', width + margin.left + margin.right);
            svg.attr("width", width);

            svg.selectAll('.' + darkBackgroundClass)
                .attr('width', width)
            svg.selectAll('.' + lightBackgroundClass)
                .attr('width', width)

//            svgTagged = d3.select(s.rootTagged).select("svg")
//            .attr("width", $('.urank-viscanvas-container-tagged').width());
//
//            svgTagged.selectAll('.' + darkBackgroundClass)
//                .attr("width", $('.urank-viscanvas-container-tagged').width())
//            svgTagged.selectAll('.' + lightBackgroundClass)
//                .attr("width", $('.urank-viscanvas-container-tagged').width())
//
//            svgTagged.selectAll("." + barClass)
//                .attr("width", $('.urank-viscanvas-container-tagged').width() * 0.1);
//
//            svgTagged.selectAll("text")
//                .attr("x", $('.urank-viscanvas-container-tagged').width() * 0.8);

            // update x-axis
            svg.select('.'+xClass + '.'+axisClass).call(xAxis.orient('bottom'));

            // Update bars
            svg.selectAll('.'+stackedbarClass).attr('width', width);
            svg.selectAll('rect.'+backgroundClass).attr('width', width);

            svg.selectAll('.'+barClass)
                .attr("x", function(d) { return x(d.x0); })
                .attr("width", function(d) { return x(d.x1) - x(d.x0); });


//
//            if(RANKING.Settings.view === "separated-score") {
//
//                // Update bars
//                svg.selectAll('.'+stackedbarClass).attr('width', width);
//                svg.selectAll('rect.'+backgroundClass).attr('width', width);
//
//                svg.selectAll('.'+barClass)
//                    .attr("x", function(d) { return x(d.x0); })
//                    .attr("width", function(d) { return x(d.x1) - x(d.x0); });
//
//                // svg social elements
//                d3.select(svgSocial.node().parentNode).attr('width',width + margin.left + margin.right);
//                svg.attr("width", width);
//
//                // update x-axis
//                svgSocial.select('.'+xClass + '.'+axisClass).call(xAxis.orient('bottom'));
//
//                // Update bars
//                var beta = RANKING.Settings.recData[0].misc.beta;
//                svgSocial.selectAll('.'+stackedbarClass).attr('width', width);
//                svgSocial.selectAll('rect.'+backgroundClass).attr('width', width);
//                svgSocial.selectAll('.'+barClass)
//                    .attr("x", function(d) { return x(d.x0); })
//                    .attr("width", function(d) {
//                            for(var i = 0; i < RANKING.Settings.recData.length; i++)
//                                if(RANKING.Settings.recData[i].doc === d.id)
//                                    return x(RANKING.Settings.recData[i].score);
//                            return 0; });
//            }
//
        }

    };

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype methods

    var _build = function(containerHeight) {
        $root = $(s.root)
        return this;
    }


    var _update = function(rankingModel, colorScale, listHeight, recData, view){

        var updateFunc = {};
        updateFunc[RANKING_STATUS.new] = RANKING.Render.drawNew;
        updateFunc[RANKING_STATUS.update] = RANKING.Render.redrawUpdated;
        updateFunc[RANKING_STATUS.unchanged] = RANKING.Render.redrawUpdated;
        updateFunc[RANKING_STATUS.no_ranking] = _this.clear;
        updateFunc[rankingModel.getStatus()].call(this, rankingModel, colorScale, listHeight, recData);
        return this;
    };

    var _clear = function(){
        this.isRankingDrawn = false;
        $root.empty();
        return this;
    };


    var _reset = function() {
        this.clear();
        return this;
    };

    var _selectItem = function(id){
        if(this.isRankingDrawn) {
            id = _.isArray(id) ? id : [id];
            svg.selectAll('.'+stackedbarClass).style('opacity', function(d){ return (id.indexOf(d.id) > -1) ? 1 : 0.3 });
/*            svgTagged.selectAll('.'+stackedbarClass).style('opacity', function(d){ return (id.indexOf(d.id) > -1) ? 1 : 0.3 });*/
        }
        return this;
    };


    var _deSelectAllItems = function(){
        if(this.isRankingDrawn) {
            svg.selectAll('.'+stackedbarClass).style('opacity', 1);
/*            svgTagged.selectAll('.'+stackedbarClass).style('opacity', 1);*/
        }
        return this;
    };


    var _hoverItem = function(id) {
        if(this.isRankingDrawn) {
            svg.select(stackedbarPrefix +''+ id).selectAll('.'+barClass)
                .attr('transform', 'translate(0, 0)')
                .style('filter', 'url(#drop-shadow)');

/*            svgTagged.select(stackedbarPrefix +''+ id).selectAll('.'+barClass)
                            .attr('transform', 'translate(0, 0)')
                            .style('filter', 'url(#drop-shadow)');*/
        }
        return this;
    };


    var _unhoverItem = function(id) {
        if(this.isRankingDrawn) {
            svg.select(stackedbarPrefix +''+ id).selectAll('.'+barClass)
                .attr('transform', 'translate(0, 0.2)')
                .style('filter', '');

/*
            svgTagged.select(stackedbarPrefix +''+ id).selectAll('.'+barClass)
                            .attr('transform', 'translate(0, 0.2)')
                            .style('filter', '');
*/
        }
        return this;
    };


    var _highlightItems = function(idsArray) {
        this.selectItem(idsArray);
        return this;
    };


    var _clearEffects = function() {
        this.deselectAllItems();
        return this;
    };


    //  Redraw without animating when the container's size changes
    var _resize = function(containerHeight){
        if(this.isRankingDrawn) RANKING.Render.resizeCanvas(containerHeight);
        return this;
    };

    var _getHeight = function() {
        return $('.'+svgClass).height();
    };


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    Ranking.prototype = {
        build: _build,
        update: _update,
        clear: _clear,
        reset: _reset,
        selectItem: _selectItem,
        deselectAllItems : _deSelectAllItems,
        hoverItem: _hoverItem,
        unhoverItem: _unhoverItem,
        highlightItems: _highlightItems,
        clearEffects: _clearEffects,
        resize: _resize,
        getHeight: _getHeight
    };

    return Ranking;
})();
