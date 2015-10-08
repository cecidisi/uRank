var Ranking = (function(){

    var RANKING = {};
    var s, _this;
    var width, height, margin;
    var x, y, color, xAxis, yAxis, xUpperLimit;
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
            onItemClicked: function(document){},
            onItemMouseEnter: function(document){},
            onItemMouseLeave: function(document){},
            lightBackgroundColor: '',
            darkBackgroundColor: ''
        }, arguments);
        this.opt = {};
        this.isRankingDrawn = false;
    }

    RANKING.Settings = {
        getInitData: function(rankingModel, opt){
            var a = [];
            var rankingData = rankingModel.getRanking().slice();
            var score = rankingModel.getMode();

            rankingData.forEach(function(d, i){
                if(d.ranking.overallScore > 0) {
                    // Tag information
                    d.bars = [];
                    var x0 = 0;
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

                    if(score != window.RANKING_MODE.by_CB_only) {
                        x0 = (score == window.RANKING_MODE.by_CB || score == window.RANKING_MODE.by_TU) ? 1 : x0;
                        d.bars.push({
                            desc: 'TU',
                            x0: x0,
                            x1: x0 + d.ranking.tuScore,
                            color: 'rgb(140, 140, 140)'
                        });

                        // Tag information
                        d.tags = [];
                        var tagsObj = d.ranking.tuMisc.tags;
                        Object.keys(tagsObj).forEach(function(tk, j){
                            d.tags.push(tagsObj[tk]);
                            d.tags[j].term = tk;
                            d.tags[j].color = color(d.tags[j].stem);
                        });
                    }
                    a.push(d);
                }
            });
            return a;
        },
        getXUpperLimit: function(rMode) {
            if(rMode === RANKING_MODE.overall || rMode === RANKING_MODE.by_CB_only) return 1; return 2;
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
        drawNew: function(rankingModel, opt){
            _this.clear();
            _this.isRankingDrawn = true;
            // Define input variables
            data = RANKING.Settings.getInitData(rankingModel, opt);
            // Define canvas dimensions
            margin = { top: 0, bottom: 0, left: 0, right: 0 };
            width = $root.width() - margin.left - margin.right;
            height = opt.listHeight;
            xUpperLimit = RANKING.Settings.getXUpperLimit(rankingModel.getMode());

            // Define scales
		    x = d3.scale.linear()
                .domain([0, xUpperLimit])
                .rangeRound( [0, width] );

            y = d3.scale.ordinal()
                .domain(data.map(function(d){ return d.id; }))
//                .rangeBands( [0, height], .02);
                .rangeBands( [0, height]);

            // Define axis' function
            xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
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

            //// Create drop shadow to use as filter when a bar is hovered or selected
            RANKING.Render.createShadow();
            //// Add stacked bars
            RANKING.Render.drawStackedBars();
            RANKING.Render.drawTagsAndUsersHints(rankingModel.getQuery(), rankingModel.getMaxTagFrequency());
        },

        /******************************************************************************************************************
        *
        *	Redraw updated ranking and animate with transitions to depict changes
        *
        * ***************************************************************************************************************/
        redrawUpdated: function(rankingModel, opt){

            // Define input variables
            data = RANKING.Settings.getInitData(rankingModel, opt);
            width = $root.width()
            RANKING.Render.updateCanvasDimensions(opt.listHeight);

            // Redefine x & y scales' domain
            d3.select(s.root).select('.'+svgClass).attr("width", width)
            svg.attr("width", width);

            xUpperLimit = RANKING.Settings.getXUpperLimit(rankingModel.getMode());
            x.rangeRound( [0, width] )
             .domain([0, xUpperLimit]).copy();

//            y.rangeBands( [0, height], .02);
            y.rangeBands( [0, height]);
            y.domain(data.map(function(d){ return d.id })).copy();


            var transition = svg.transition().duration(750),
                delay = function(d, i) { return i * 50; };

            transition.select('.'+xClass+'.'+axisClass).call(xAxis)
                .selectAll("g").delay(delay);

            transition.select('.'+yClass+'.'+axisClass).call(yAxis)
                .selectAll("g").delay(delay);

            RANKING.Render.drawStackedBars();
            RANKING.Render.drawTagsAndUsersHints(rankingModel.getQuery(), rankingModel.getMaxTagFrequency());
        },



        /******************************************************************************************************************
        *
        *	Draw stacked bars either on draw or update methods. Animate with width transition
        *
        * ***************************************************************************************************************/
        drawStackedBars: function(){
            svg.selectAll('.'+stackedbarClass).data([]).exit();
            svg.selectAll('.'+stackedbarClass).remove();
            //svg.selectAll('.'+stackedbarClass).data(data).enter();

            setTimeout(function(){

                var stackedBars = svg.selectAll('.'+stackedbarClass)
                    .data(data).enter()
                    .append("g")
                    .attr("class", stackedbarClass)
                    .attr("id", function(d){ return "urank-ranking-stackedbar-" + d.id; })
                    .attr( "transform", function(d) {return "translate(0, " + y(d.id) + ")"; })
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
                    .attr('transform', 'translate(0, 0.2)')
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
        drawTagsAndUsersHints: function(query, maxTagFreq) {

            setTimeout(function(){

                var tagHintWidth = query.length * 6 + 6;
                var userHintWidth = 24;
                var xTagHintOffset = x(xUpperLimit) - tagHintWidth - userHintWidth;
                var xUserHintOffset = x(xUpperLimit) - userHintWidth;
                var maxBarHeight = y.rangeBand();

                // Define scales
                var xTU = d3.scale.ordinal().domain(query.map(function(q){ return q.stem; })).rangeBands( [0, tagHintWidth-6], .2);
                var yTU = d3.scale.linear().domain([0, maxTagFreq]).rangeRound([maxBarHeight, 0]);

                // Define axis' function
                var xAxisTU = d3.svg.axis().scale(xTU).orient("bottom").tickValues('');
                var yAxisTU = d3.svg.axis().scale(yTU).orient("left").tickValues('');

                var stackedbars = svg.selectAll('.'+stackedbarClass);

                var tagHints = stackedbars.append('g')
                    .attr('width', tagHintWidth)
                    .attr('height', maxBarHeight)
                    .attr("transform", function(d, i){ "translate(" + xTagHintOffset + "," + y(i) + ")" });

                // draw x axis
                tagHints.append('g')
                    .attr('class', xClass + ' ' + axisClass)
                    .attr('width', xTU.rangeBand())
                    .attr('transform', function(d, i){ return 'translate(' + xTagHintOffset + ',' + maxBarHeight + ')' })
                    .call(xAxisTU)
                    .selectAll('text');

                // draw y axis
                tagHints.append('g')
                    .attr('class', yClass + ' ' + axisClass)
                    .attr('height', maxBarHeight)
                    .attr('transform', function(d, i){ return 'translate(' + xTagHintOffset + ',0)' })
                    .call(yAxisTU)
                    .selectAll('text');

                // draw vertical tag bars
                tagHints.selectAll('.tag-bar')
                    .data(function(d) { return d.tags })
                    .enter()
                    .append("rect")
                    .attr("class", 'tag-bar')
                    .attr("x", function(t) { return xTagHintOffset + xTU(t.stem); })
                    .attr("width", xTU.rangeBand())
                    .attr("y", function(t) { return yTU(t.tagged); })
                    .attr("height", function(t){ return maxBarHeight - yTU(t.tagged); })
                    .style("fill", function(t) { return t.color; });

                // draw user hint
                var userHints = stackedbars.append('g')
                    .attr('class', 'urank-ranking-user-hint')
                    .attr('transform', function(d, i){ 'translate(' + xUserHintOffset + ',' + y(i) + ')' });

                userHints.append('svg:image')
                    .attr('xlink:href', function(d){ return d.ranking.tuMisc.users > 0 ? '../media/user.png' : '' })
                    .attr('x', xUserHintOffset)
                    .attr('width', 13)
                    .attr('y', 12)
                    .attr('height', 13)

                userHints.append('text')
                    .attr('dx', xUserHintOffset + 9)
                    .attr('dy', 15)
                    .text(function(d){ return d.ranking.tuMisc.users > 0 ? d.ranking.tuMisc.users : '' });

            }, 801);

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

            // update x-axis
            svg.select('.'+xClass + '.'+axisClass).call(xAxis.orient('bottom'));

            // Update bars
            svg.selectAll('.'+stackedbarClass).attr('width', width);
            svg.selectAll('rect.'+backgroundClass).attr('width', width);

            svg.selectAll('.'+barClass)
                .attr("x", function(d) { return x(d.x0); })
                .attr("width", function(d) { return x(d.x1) - x(d.x0); });
        }
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  Prototype methods

    var _build = function(data, containerHeight) {
        $root = $(s.root);
        return this;
    }


    var _update = function(rankingModel, opt){
        var updateFunc = {};
        updateFunc[RANKING_STATUS.new] = RANKING.Render.drawNew;
        updateFunc[RANKING_STATUS.update] = RANKING.Render.redrawUpdated;
        updateFunc[RANKING_STATUS.unchanged] = RANKING.Render.redrawUpdated;
        updateFunc[RANKING_STATUS.no_ranking] = _this.clear;
        updateFunc[rankingModel.getStatus()].call(this, rankingModel, opt);
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
                .style('filter', 'url(#drop-shadow)')
                .text(function(d){ return d.score });
        }
        return this;
    };


    var _unhoverItem = function(id) {
        if(this.isRankingDrawn) {
            svg.select(stackedbarPrefix +''+ id).selectAll('.'+barClass)
                .attr('transform', 'translate(0, 0.2)')
                .style('filter', '')
                .text('');

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
