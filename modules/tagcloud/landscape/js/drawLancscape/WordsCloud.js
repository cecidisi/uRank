var WordsCloud = (function(){
	this.tagsList = []
	this.urankPrefix = ""; 
	this.landscapeTagCloudPrefix = "landscapeTagCloud_";
	tagColorScale = {}; 
	
	var me = this; 
	var tagPrefix = "#urank-tag-"; 
	var documentIndices = []; 
	var _this, $root = $('');
	 
	
	function WordsCloud(arguments) {
		_this = this;
		this.tagsList = []
		this.urankPrefix = ""; 
		this.landscapeTagCloudPrefix = "landscapeTagCloud_";
	}
	
    var EVTHANDLER = {

        onTagInCloudMouseEnter: function(index, labelObj) {
            _this.timestamp = $.now(); 
        	var $tag = $(tagPrefix+index);  
        	var stem = $tag.attr("stem");
        	var keyword = 	$tag.clone().children().remove().end().text();
        	if(index == -1 ) {
        		stem = labelObj.stem;
        		keyword = labelObj.label;
        	}

        	var tagDataset = landscapeController.dataProcessor.getObjectsBasedOnTag(stem); 
			if(landscapeConfig.getLandscapeType() == "standaloneLandscape") {
				landscapeController.stateCurrent.heighlightDocumentsByIds([]);
				var selctedTags = $("#eexcess_landscape_tag_cloud").find("div.isSelected");
				var stemList = []
				if(stem) {
					stemList.push(stem);
					var tagDataset = landscapeController.dataProcessor.getObjectsBasedOnTagList(stemList); 
				
					landscapeController.stateCurrent.heighlightDocumentsByIds(tagDataset.indices);
					if(!$tag.hasClass("isSelected")) {
						if(index >= 0) {
					 		_this.tagcloud.hoverTag(index);	
					 	}
					}
				}
			}
			
			var selctedTags = $("#landscapeLabel").find("text");
			selctedTags.each(function(index, tag) {
				var label = $(tag).html();
				if(label == keyword) { 
					if(!$tag.hasClass("isSelected")) {
						d3.select(tag).style("fill", "#94BFFF")
						d3.select(tag).style("font-weight", "bold");
		
						return; 
					}
		
				}
			});		
		
        },

        onTagInCloudMouseLeave: function(index, labelObj) {
        	var $tag = $(tagPrefix+index);  
        	var stem = $tag.attr("stem");
        	var keyword = 	$tag.clone().children().remove().end().text();
        	if(index == -1 ) {
        		stem = labelObj.stem;
        		keyword = labelObj.label;
        	}
			if (landscapeConfig.getLandscapeType() == "standaloneLandscape") {
				var selctedTags = $("#eexcess_landscape_tag_cloud").find("div.isSelected");
				var stemList = []
				selctedTags.each(function(index, tag) {
					var stem = $(tag).attr("stem");
					stemList.push(stem);
				});
				var tagDataset = landscapeController.dataProcessor.getObjectsBasedOnTagList(stemList);
				landscapeController.stateCurrent.heighlightDocumentsByIds(tagDataset.indices);

			}
        	

			if (!$tag.hasClass("isSelected")) {
				if(index >= 0) {
					_this.tagcloud.unhoverTag(index);
				}
			}
			 var timestamp =  $.now()-_this.timestamp;
			 if(timestamp > 1000 ) {
			     var component = "tagCloud"
			     if(labelObj) {
			         component = "landscape";
			     }
			     LoggingHandler.log({ action: "Keyword inspect", source: "landscape", component: component, value : keyword}); 
			 }            
            
			var selctedTags = $("#landscapeLabel").find("text");
			selctedTags.each(function(index, tag) {
				var label = $(tag).html();
				if(label == keyword) { 
					if (!d3.select(tag).classed("isSelected") ) {
						var color = d3.select(tag).attr("color")
						d3.select(tag).style("fill", color)
						d3.select(tag).style("font-weight", "");
						
					}

				}
			});


        },

        onTagInCloudClick: function(index, labelObj) {
        	var greyScales = ["#000000", "#333333", "#707070","#AAAAAA","#C0C0C0"].reverse(); 
         	var $tag = $(tagPrefix+index);  
        	var stem = $tag.attr("stem");
        	var keyword = 	$tag.clone().children().remove().end().text();
        	var colorCategory = 0; 
        	if(index == -1 ) {
        		stem = labelObj.stem;
        		keyword = labelObj.label;
        		colorCategory = labelObj.colorCategory; 
        	}
			 
        	if($tag.hasClass("isSelected")) {
        	    if(!labelObj) {
        	        LoggingHandler.log({ action: "Keyword removed", source: "landscape", component: "tagCloud", value : keyword});  
        	    }
        		$tag.removeClass("isSelected"); 
        		_this.tagcloud.unhoverTag(index);
        	}
        	else {
        		$tag.addClass("isSelected");
        		$tag.css(getTagHoverStyle());  
        		if(!labelObj) {
        		   LoggingHandler.log({ action: "Keyword added", source: "landscape", component: "tagCloud",  value : keyword}); // click on keyword 
        		}       		
        	}
        	var selctedTags = $("#eexcess_landscape_tag_cloud").find("div.isSelected");
        	var values = []
			var colorList = []
			var stemList = []
			selctedTags.each(function(index, tag){        
				var keyword = 	$(tag).clone().children().remove().end().text();
				var stem = $(tag).attr("stem");
				stemList.push(stem);
				var colorCategory =   $(tag).attr("colorCategory");
				$(tag).css(getTagHoverStyle()); 
				values.push(keyword)
				colorList.push(greyScales[colorCategory]); 
			}); 
			if(index == -1 ) {
				stemList.push(stem); 
				values.push(keyword)
				colorList.push(greyScales[colorCategory]); 
			}
			
			var tagDataset = landscapeController.dataProcessor.getObjectsBasedOnTagList(stemList); 
			landscapeController.stateCurrent.heighlightDocumentsByIds(tagDataset.indices);
	

			var selctedTags = $("#landscapeLabel").find("text");
			selctedTags.each(function(index, tag) {
				var k = $(tag).html();
				if($(tag).html() == keyword) {
					var stem = $(tag).attr("stem");
					if(d3.select(this).classed("isSelected")) {
						d3.select(this).classed("isSelected", false)
						var color = d3.select(tag).attr("color")
						d3.select(tag).style("fill", color)
						d3.select(tag).style("font-weight", "");
					}
					else {
				    	d3.select(this).classed("isSelected", true)
				    	d3.select(tag).style("fill", "#94BFFF")
						d3.select(tag).style("font-weight", "bold")
				   }
					
				}
			});	
			if(values.length == 0) {
				values = null; 
			}	
			
			FilterHandler.setInputData('keyword', {"colors" : colorList}); //Also OBJECT z.B.: ['red', 'blue', ...]
			FilterHandler.setCurrentFilterKeywords(tagDataset.dataList, values);	
        },

        onKeywordHintEnter: function(index) {
           
        },

        onKeywordHintLeave: function(index) {
         
          
        },

        onKeywordHintClick: function(index) {
           
            
        },

        onDocumentHintClick: function(index) {

        }
    };
	WordsCloud.prototype.onTagInCloudMouseLeave = EVTHANDLER.onTagInCloudMouseLeave;
	WordsCloud.prototype.onTagInCloudMouseEnter = EVTHANDLER.onTagInCloudMouseEnter;
	WordsCloud.prototype.onTagInCloudClick = EVTHANDLER.onTagInCloudClick;
	
	
	// -----------------------------------------------------------------------
	WordsCloud.prototype.draw = function(tagCloudObj, indices, keywordsDict ) {
		var arguments =  {
 			    root: "#eexcess_landscape_tag_cloud",
                onTagInCloudMouseEnter: EVTHANDLER.onTagInCloudMouseEnter,
                onTagInCloudMouseLeave: EVTHANDLER.onTagInCloudMouseLeave,
                onTagInCloudClick: EVTHANDLER.onTagInCloudClick,
                onDocumentHintClick: EVTHANDLER.onDocumentHintClick,
                onKeywordHintMouseEnter : EVTHANDLER.onKeywordHintEnter,
                onKeywordHintMouseLeave : EVTHANDLER.onKeywordHintLeave,
                onKeywordHintClick : EVTHANDLER.onKeywordHintClick
        }
           
        
        documentIndices = documentIndices; 
        var tagcloudClass = 'urank-tagcloud'; 
        var tagClass = 'urank-tagcloud-tag';
		var tagColorRange = colorbrewer.Blues[TAG_CATEGORIES + 1].slice(1, TAG_CATEGORIES+1);
		tagColorScale = d3.scale.ordinal().domain(d3.range(0, TAG_CATEGORIES, 1)).range(tagColorRange);
        this.tagcloud = new TagCloudDefault(arguments);
       	this.tagcloud.clear();
       	this.timestamp = 0; 
       	if(keywordsDict) {}
       	var misc = { customScrollBars: false, defaultBlockStyle: false, draggableClass: "urank-tagcloud-tag"}
       	
        var options = $.extend(misc, { draggableClass: tagClass })
        this.tagcloud.build(tagCloudObj.keywords, tagCloudObj.data, tagColorScale, options);
        var tagCloudElements = $("#eexcess_landscape_tag_cloud").children().first().children().first().children(); 
		if(landscapeConfig.getLandscapeType() == "standaloneLandscape") {
	        tagCloudElements.each(function(index, item){
	        	 $(item).draggable('destroy');
	        })
	    }
          
	}
	
	// -----------------------------------------------------------------------
	WordsCloud.prototype.unHoverAllTags = function(index){
		return this.tagsList; 		
	}
	
	// -----------------------------------------------------------------------	
	WordsCloud.prototype.clearTagCloud = function(){
		if(!landscapeConfig.getLandscapeType() == "standaloneLandscape") {
			 tagCloudCanvas.select("#landscapeTagsCloud").data([]).exit().remove(); 
		 }	
	}
	

	// -----------------------------------------------------------------------
	WordsCloud.prototype.getTagsList = function(index){
		return this.tagsList; 		
	}
	
	// -----------------------------------------------------------------------
	WordsCloud.prototype.redraw = function(){
		return this.tagsList; 		
	}
		
	// -----------------------------------------------------------------------
	WordsCloud.prototype.addUrankTagStyling = function(index, color){
		var tagId = this.landscapeTagCloudPrefix + index; 
		if(!d3.select("#"+tagId).empty()) {
			$tag = d3.select("#"+tagId); 
			var prevColor  = $tag.style("fill"); 
			$tag = d3.select("#"+tagId); 
			$tag.style("color", prevColor ); 
		    $tag.style("fill", color ); 
			$tag.style("font-weight", "bold"); 	
		}
	}
	
	
	// -----------------------------------------------------------------------
	WordsCloud.prototype.removeUrankTagStyling = function(index){
		var tagId = this.landscapeTagCloudPrefix + index; 
		if(!d3.select("#"+tagId).empty()) {
			$tag = d3.select("#"+tagId); 
			var prevColor  = $tag.style("color"); 
			$tag.style("fill", prevColor ); 
			$tag.style("font-weight", null);

		}
	}
	
	function getTagHoverStyle() {
		var backgroudGradient = "top, rgb(0, 102, 255), rgb(20, 122, 255), rgb(0, 102, 255)";
		tagHoverStyle = {
			background : function() {
				var hoverBackground = '-webkit-linear-gradient(' + backgroudGradient + ')';

				if (navigator.userAgent.match(/(MSIE |Trident.*rv[ :])([0-9]+)/) != null) {
					return '-ms-linear-gradient(' + backgroudGradient + ')';
				} else if (navigator.userAgent.search("Chrome") >= 0) {
					return '-webkit-linear-gradient(' + backgroudGradient + ')';
				} else if (navigator.userAgent.search("Firefox") >= 0) {
					return '-moz-linear-gradient(' + backgroudGradient + ')';
				} else if (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0) {
					return '-webkit-linear-gradient(' + backgroudGradient + ')';
				} else if (navigator.userAgent.search("Opera") >= 0) {
					return '-o-linear-gradient(' + backgroudGradient + ')';
				}
				return hoverBackground;
			}
		}
		return tagHoverStyle; 

	}
	

	function updateCloud(words) {
		
		var widthLandscapeCloud =  $( "#eexcess_landscape_tag_cloud" ).width()/2;
		var heightLandscapeCloud =  $( "#eexcess_landscape_tag_cloud" ).height()/2;
		var tagBox = 	this.tagBox; 
		var fill = landscapeConfig.getTagCloudColorPlate();
		
		var allLabelDivs  =$('#dragableLandscapeLabels').children(); 
		var createdLabelsDivs = {}
		$(allLabelDivs).each(function(index, item){                 
        	var text = $(item).attr("text");
        	var id =   $(item).attr("id");
        	var pos =  $(item).attr("tag-pos");
        	
        	createdLabelsDivs[text] = {"id":id, "pos":pos};           
    	});
    	var inBoxCreatedDivs = {}   
    	var test =  $('#eexcess_keywords_box.urank-tagbox-container'); 
    	var keywordBoxElements  = $('#eexcess_keywords_box.urank-tagbox-container').children(); 
		$(keywordBoxElements).each(function(index, item){         
        	var text = $(item).attr("text");
        	var id =   $(item).attr("id");
        	var pos =  $(item).attr("tag-pos");
			inBoxCreatedDivs[text] =  {"id":id, "pos":pos};
			createdLabelsDivs[text] = {"id":id, "pos":pos}; 
		});      
		var tagCounter = allLabelDivs.length; 
		var count = 0; 
		tagCloudCanvas.select("#landscapeTagsCloud").data([]).exit().remove(); 
		tagCloudCanvas.append("g")
	  		.attr("id","landscapeTagsCloud")
	        .attr("transform", "translate("+widthLandscapeCloud+","+widthLandscapeCloud+")")
	        .selectAll("text")
	        .data(words)
		      .enter().append("text")
		      .style("font-size", function(d) { 
		      	return d.size + "px"; 
		      })
		      .style("font-family", "Impact")
		      .style("fill", function(d, i) {
		      	if(d.text in inBoxCreatedDivs) {	  
		        	return $("#"+inBoxCreatedDivs[d.text].id).css("background-color");
				}			
		    	return fill[i];
		    	// return fill(i); 
		      })
		      .attr("text-anchor", "middle")
		      .attr("id",  function(d) {
		      	if(d.text in createdLabelsDivs) {
		      		return  "landscapeTagCloud_" + createdLabelsDivs[d.text].pos; 
		      	}
		    	
		        return "landscapeTagCloud_"+(count++);
		      })
		      .attr("stem",  function(d) {
		        return d.stem;
		      })
		      .attr("text",  function(d) {
		         return d.text; 
		      })
		       .attr("color",  function(d, i) {
		         // if(d.text in inBoxCreatedDivs) {	  
		        	// return $("#"+inBoxCreatedDivs[d.text].id).css("background-color");
				// }			
		    	return fill[i];
		      })
		      .attr("transform", function(d) {
		        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
		      }).text(function(d) {
		    	  return d.text; 
		      }).on("click", function(d, i) {
		    	  	var tag = $( this ).html();
		    	  	var stem = d3.select(this).attr("stem"); 
					if(landscapeConfig.getLandscapeType() == "standaloneLandscape") {
						var tagDataset = landscapeController.dataProcessor.getObjectsBasedOnTag(stem); 				
						FilterHandler.setCurrentFilterCategories('category', tagDataset.dataList, "tag", [tag]);
					}
			}).on("mouseover",function(d, i) {
		      		var color = d3.select(this).style("fill")
					d3.select(this).attr("color", color); 	    	  	
					d3.select(this).style("cursor", "pointer")
					d3.select(this).style("font-weight", "bold")
					d3.select(this).style("fill", "#B26200")

					var stem = d3.select(this).attr("stem"); 
					var text = d3.select(this).attr("text"); 
					var pos = d3.select(this).attr("pos"); 
					var tagDataset = landscapeController.dataProcessor.getObjectsBasedOnTag(stem); 
					if(landscapeConfig.getLandscapeType() == "standaloneLandscape") {
						landscapeController.stateCurrent.heighlightDocumentsByIds(tagDataset.indices);
					}		
					else if (landscapeConfig.getLandscapeType() == "urankLandscape") {
						var i = parseInt(d3.select(this).attr("tagCounter"));
						var tagIdPrefix = "urank-tag-";
						var tagClass = 'urank-tagcloud-tag';
						$('.' + tagClass).hide();
						if(text in createdLabelsDivs) {
							var tagId = createdLabelsDivs[text].id;		
							var mousePos = landscapeConfig.getCurrentMousePos();
							var padding = 4; 
							$('#'+tagId).css({'top':(mousePos[1]-padding),'left':(mousePos[0]-padding)}).fadeIn();
							$('#' + tagId).show();
						}
					}

// 					

		      }).on("mouseout", function(d, i) {
		      		var color = d3.select(this).attr("color")
					d3.select(this).style("fill", color);
					d3.select(this).style("font-weight", null)
					if(landscapeConfig.getLandscapeType() == "standaloneLandscape") {
						landscapeController.stateCurrent.heighlightDocumentsByIds([]);

					}

			});
	} 

	
    return WordsCloud;
})();


function WordsCloudLandscape() {
	
	this.tagsList = []
	this.urankPrefix = ""; 
	this.landscapeTagCloudPrefix = "landscapeTagCloud_";
	var me = this; 
	// -----------------------------------------------------------------------
	WordsCloudLandscape.prototype.draw = function(tags) {
		this.clearTagCloud(); 
		var widthLandscapeCloud =  $( "#eexcess_landscape_tag_cloud" ).width();
		var heightLandscapeCloud = $( "#eexcess_landscape_tag_cloud" ).height();

		var tagsData = [];
		tagsData = JSON.parse( JSON.stringify( tags ) );
		var min = 100000000;
		var max = 0;
		for(var i=0; i < tagsData.length; i++) {
			var size = tagsData[i].size; 
			if (size < min) {
				min = size;
			}
			if (size > max) {
				max = size;
			}
		
		}
		wordScale = d3.scale.linear().domain([ 0, max ]).range([ 14, max+12 ]);
		if(max > 60) {
			wordScale = d3.scale.linear().domain([ 0, max ]).range([ 14, 45+12 ]);
		}
		else {
		}

		d3.layout.cloud().size([ widthLandscapeCloud, heightLandscapeCloud ]).words(tagsData).padding(5).rotate(
				function() {
					return ~~(Math.random() * 2) * 1;
				}).font("Impact").fontSize(function(d) {
			return (wordScale(d.size));
		}).on("end", updateCloud).start();
	}
	
	// -----------------------------------------------------------------------	
	WordsCloudLandscape.prototype.clearTagCloud = function(){
		tagCloudCanvas.select("#landscapeTagsCloud").data([]).exit().remove(); 	
	}
	

	// -----------------------------------------------------------------------
	WordsCloudLandscape.prototype.getTagsList = function(index){
		return this.tagsList; 		
	}
		
	// -----------------------------------------------------------------------
	WordsCloudLandscape.prototype.addUrankTagStyling = function(index, color){
		var tagId = this.landscapeTagCloudPrefix + index; 
		if(!d3.select("#"+tagId).empty()) {
			$tag = d3.select("#"+tagId); 
			var prevColor  = $tag.style("fill"); 
			$tag = d3.select("#"+tagId); 
			$tag.style("color", prevColor ); 
		    $tag.style("fill", color ); 
			$tag.style("font-weight", "bold"); 	
		}
	}
	
	
	// -----------------------------------------------------------------------
	WordsCloudLandscape.prototype.removeUrankTagStyling = function(index){
		var tagId = this.landscapeTagCloudPrefix + index; 
		if(!d3.select("#"+tagId).empty()) {
			$tag = d3.select("#"+tagId); 
			var prevColor  = $tag.style("color"); 
			$tag.style("fill", prevColor ); 
			$tag.style("font-weight", null);

		}
	}
	
	
	function updateCloud(words) {
		
		var widthLandscapeCloud =  $( "#eexcess_landscape_tag_cloud" ).width()/2;
		var heightLandscapeCloud =  $( "#eexcess_landscape_tag_cloud" ).height()/2;
		var tagBox = 	this.tagBox; 
		var fill = landscapeConfig.getTagCloudColorPlate();
		
		var allLabelDivs  =$('#dragableLandscapeLabels').children(); 
		var createdLabelsDivs = {}
		$(allLabelDivs).each(function(index, item){                 
        	var text = $(item).attr("text");
        	var id =   $(item).attr("id");
        	var pos =  $(item).attr("tag-pos");
        	
        	createdLabelsDivs[text] = {"id":id, "pos":pos};           
    	});
    	var inBoxCreatedDivs = {}   
    	var test =  $('#eexcess_keywords_box.urank-tagbox-container'); 
    	var keywordBoxElements  = $('#eexcess_keywords_box').children().first().children(); 
		$(keywordBoxElements).each(function(index, item){         
        	var text = $(item).attr("text");
        	var id =   $(item).attr("id");
        	var pos =  $(item).attr("tag-pos");
			inBoxCreatedDivs[text] =  {"id":id, "pos":pos};
			createdLabelsDivs[text] = {"id":id, "pos":pos}; 
		});      
		var tagCounter = allLabelDivs.length; 
		var count = 0; 
		tagCloudCanvas.select("#landscapeTagsCloud").data([]).exit().remove(); 
		tagCloudCanvas.append("g")
	  		.attr("id","landscapeTagsCloud")
	        .attr("transform", "translate("+widthLandscapeCloud+","+widthLandscapeCloud+")")
	        .selectAll("text")
	        .data(words)
		      .enter().append("text")
		      .style("font-size", function(d) { 
		      	return d.size + "px"; 
		      })
		      .style("font-family", "Impact")
		      .style("fill", function(d, i) {
		      	if(d.text in inBoxCreatedDivs) {	  
		        	return $("#"+inBoxCreatedDivs[d.text].id).css("background-color");
				}			
		    	return fill[i];
		    	// return fill(i); 
		      })
		      .attr("text-anchor", "middle")
		      .attr("id",  function(d) {
		      	if(d.text in createdLabelsDivs) {
		      		return  "landscapeTagCloud_" + createdLabelsDivs[d.text].pos; 
		      	}
		    	
		        return "landscapeTagCloud_"+(count++);
		      })
		      .attr("stem",  function(d) {
		        return d.stem;
		      })
		      .attr("text",  function(d) {
		         return d.text; 
		      })
		       .attr("color",  function(d, i) {
		         // if(d.text in inBoxCreatedDivs) {	  
		        	// return $("#"+inBoxCreatedDivs[d.text].id).css("background-color");
				// }			
		    	return fill[i];
		      })
		      .attr("transform", function(d) {
		        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
		      }).text(function(d) {
		    	  return d.text; 
		      }).on("click", function(d, i) {
		    	  	var tag = $( this ).html();
		    	  	var stem = d3.select(this).attr("stem"); 
					if(landscapeConfig.getLandscapeType() == "standaloneLandscape") {
						var tagDataset = landscapeController.dataProcessor.getObjectsBasedOnTag(stem); 				
						FilterHandler.setCurrentFilterCategories('category', tagDataset.dataList, "tag", [tag]);
					}
			}).on("mouseover",function(d, i) {
		      		var color = d3.select(this).style("fill")
					d3.select(this).attr("color", color); 	    	  	
					d3.select(this).style("cursor", "pointer")
					d3.select(this).style("font-weight", "bold")
					d3.select(this).style("fill", "#B26200")

					var stem = d3.select(this).attr("stem"); 
					var text = d3.select(this).attr("text"); 
					var pos = d3.select(this).attr("pos"); 
					var tagDataset = landscapeController.dataProcessor.getObjectsBasedOnTag(stem); 
					if(landscapeConfig.getLandscapeType() == "standaloneLandscape") {
						landscapeController.stateCurrent.heighlightDocumentsByIds(tagDataset.indices);
					}		
					else if (landscapeConfig.getLandscapeType() == "urankLandscape") {
						var i = parseInt(d3.select(this).attr("tagCounter"));
						var tagIdPrefix = "urank-tag-";
						var tagClass = 'urank-tagcloud-tag';
						$('.' + tagClass).hide();
						if(text in createdLabelsDivs) {
							var tagId = createdLabelsDivs[text].id;		
							var mousePos = landscapeConfig.getCurrentMousePos();
							var padding = 4; 
							$('#'+tagId).css({'top':(mousePos[1]-padding),'left':(mousePos[0]-padding)}).fadeIn();
							$('#' + tagId).show();
						}
					}

// 					

		      }).on("mouseout", function(d, i) {
		      		var color = d3.select(this).attr("color")
					d3.select(this).style("fill", color);
					d3.select(this).style("font-weight", null)
					if(landscapeConfig.getLandscapeType() == "standaloneLandscape") {
						landscapeController.stateCurrent.heighlightDocumentsByIds([]);

					}

			});
	}
}