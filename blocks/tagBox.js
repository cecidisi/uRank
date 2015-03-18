var TagBox = (function(){

    // Settings
    var s = {};
    //  Classes
    var tagboxContainerClass = 'urank-tagbox-container',
        tagInBoxClass = 'urank-tagbox-tag',
        tagDeleteButtonClass = 'urank-tagbox-tag-delete-button',
        tagWeightsliderClass = 'urank-tagbox-tag-weight-slider';
    //  Ids


    var _this;


    function Tagbox(arguments) {

        s = $.extend({
            root: '',
            colorScale: function(){},
            droppableClass: 'urank-tagcloud-tag',
            onChange: function(selectedKeywords, colorscale){},
            onTagDeleted: function(index){},
            onTagInBoxMouseEnter: function(index){},
            onTagInBoxMouseLeave: function(index){},
            onTagInBoxClick: function(index){}
        }, arguments);

        _this = this;

        // Bind onChange event handler for custom event
        $(s.root).on('tagBoxChange', function(){ s.onChange.call(this, _this.getKeywordsInBox(), s.colorScale) });

        this.droppableOptions = {
            tolerance: 'touch',
            drop: function(event, ui){
                _this.dropTag(ui.draggable);
                //s.onChange.call(this, _this.getKeywordsInBox(), s.colorScale)
                $(s.root).trigger('tagBoxChange');
            }
        };

        this.sliderOptions = {
            orientation: 'horizontal',
            animate: true,
            range: "min",
            min: 0,
            max: 1,
            step: 0.2,
            value: 1,
            slide: function(event, ui) {
                _this.updateTagStyle(this.parentNode, ui.value);
            },
            stop: function(event, ui) {
                //s.onChange.call(this, _this.getKeywordsInBox(), s.colorScale);
                $(s.root).trigger('tagBoxChange');
            }
        };
    }



    var _build = function() {
        // bind droppable behavior to tag box
        $(s.root)
            .addClass(tagboxContainerClass)
            //.on('tagBoxChange', s.onChange(_this.getKeywordsInBox(), s.colorScale))
            .droppable(this.droppableOptions);
    };


    var _clear = function() {
        $(s.root).empty();
        $('<p></p>').appendTo($(s.root)).text(STR_DROP_TAGS_HERE);
        //TAGCLOUD.updateTagColor();
    };


    var _dropTag = function(tag){
        var $tag = $(tag);
        // Set tag box legend
        $(s.root).find('p').remove();

        if ($tag.hasClass(s.droppableClass)) {
            // Append dragged tag onto tag box
            $(s.root).append($tag);

            // Change tag's class
            $tag.removeClass().addClass(tagInBoxClass);

            // Append "delete" icon to tag and bind event handler
            $("<span class='" + tagDeleteButtonClass + "'/></span>").appendTo(tag)
                .click(function(){
                s.onTagDeleted($tag.attr('tag-pos'));
                $(s.root).trigger('tagBoxChange');
                //s.onChange(_this.getKeywordsInBox(), s.colorScale);

            });

            // Add new div to make it a slider
            var weightSlider = $("<div class='" + tagWeightsliderClass + "'></div>").appendTo($tag).slider(this.sliderOptions);

            // Retrieve color in weightColorScale for the corresponding label
            var color = s.colorScale($tag.data('stem'));
            var rgbSequence = hexToR(color) + ', ' + hexToG(color) + ', ' + hexToB(color);

            // Set tag's style
            $tag
            .css({
                background: 'rgba(' + rgbSequence + ', 1)',
                color: '',
                border: 'solid 2px ' + color
            })
            .off()
            .on({
                mouseenter: s.onTagInBoxMouseEnter($tag.attr('tag-pos')),
                mouseleave: s.onTagInBoxMouseLeave($tag.attr('tag-pos')),
                click: s.onTagInBoxClick($tag.attr('tag-pos'))
            });
        }
    };


    var _updateTagStyle = function(tag, weight){
        var color = s.colorScale($(tag).data('stem'));
        $(tag).css("background", "rgba("+ hexToR(color) + ', ' + hexToG(color) + ', ' + hexToB(color) + "," + weight + ")");
    };



    /**
	 *	Retrieves the selected keywords (in tag box) and the weight assigned by the user
	 *	@return array. Each item is an object containing 'term' and 'weight'
	 * */
    var _getKeywordsInBox = function() {

        var  weightedKeywords = [];
        $('.'+tagInBoxClass).each(function(i, tag){
            var term = $(tag).text();
            var stem = $(tag).data('stem');
            var weight = parseFloat( $(tag).find('.'+tagWeightsliderClass).slider("value"));
            weightedKeywords.push({ 'term': term, 'stem': stem, 'weight': weight });
        });
        return weightedKeywords;
    }


    Tagbox.prototype = {
        build: _build,
        clear: _clear,
        dropTag: _dropTag,
        updateTagStyle: _updateTagStyle,
        getKeywordsInBox: _getKeywordsInBox

    };

    return Tagbox;
})();



/*    var _updateTagColorScale = function(){

        // Clear color scale domain
        weightColorScale.domain([]);

        for(var i = 0; i < selectedTags.length; i++){
            // Reasign keyword to color scale domain
            var stem = d3.select(selectedTags[i][0]).data()[0].stem;
            var aux = weightColorScale(stem);
            var rgbSequence = hexToR(aux) + "," + hexToG(aux) + "," + hexToB(aux);
            var value = $(selectedTags[i][0]).find(".div-slider").slider("value");

            d3.select(selectedTags[i][0])
            .style("background", "rgba("+ rgbSequence + ", " + value + ")")
            .style("border", "solid 0.2em " + aux);
        }
    };*/
