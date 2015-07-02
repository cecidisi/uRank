
var LandscapeController = (function(){
 	this.landscapeVisData = {}
 	this.landscapeValuesData = {}
 	this.stateCurrent = new LandscapeState();
 	//this.exxcessVis = "";
 	// this.keywordExtractor = "";
 	this.dataProcessor = "";
 	this.receivedData = {}
 	this.landscapeTagCloudBuilder = "";
 	var prevLandscapeScale = -1; 
 	var landscapeInitialScaleCounter= 0; 
 	var me = this;


	function LandscapeController(data, keywordExtractor, keywords) {
		//-----------------------------------------------------------------------
		 d3line = d3.svg.line().x(function(d) {
			return d[0] * landscapeConfig.getWidth();
		}).y(function(d) {
			return d[1] * landscapeConfig.getHeight();
		}).interpolate("basic");
		 this.stateCurrent = new LandscapeState();
	//	 test = vis;
	//	 this.exxcessVis = vis;
		 this.landscapeVisData = {};
		 // this.keywordExtractor = "";
		 this.dataProcessor = new DataPreProcessor(data, keywordExtractor, keywords);
		 this.receivedData = data;
		 this.landscapeTagCloudBuilder = "";
		 me = this;

	}


	//-----------------------------------------------------------------------
	LandscapeController.prototype.drawLandscape = function(data, landscapTagCloudBuilderCallBack) {
		var timestamp = $.now();
		if(this.dataProcessor == "") {
			this.dataProcessor = new DataPreProcessor(data);
		}
		if(this.isReceivedDataPreviouseOne(data)) {

			this.landscapeValuesData = prevExtractedDataObj.landscapeValuesData; 
			this.landscapeVisData = this.dataProcessor.getProcessedLandscapeVisdata(this.landscapeValuesData);
		
		}
		else {
			this.dataProcessor.createInputForLandscape();
			var landscapeInputString = this.dataProcessor.getLandscapeInputString();
			var paramsConfig = this.dataProcessor.getLandscapParamsConfig();
			//var test = JSON.parse(landscapeInputString);
			this.landscapeValuesData = thematicLandscape.createLandscape(landscapeInputString, paramsConfig);
			this.landscapeVisData = this.dataProcessor.getProcessedLandscapeVisdata(this.landscapeValuesData);		
		}
		this.landscapeTagCloudBuilder = landscapTagCloudBuilderCallBack;
		prevExtractedDataObj.landscapeValuesData = this.landscapeValuesData; 
		prevExtractedDataObj.prevReceivedData = data;
		me = this;
		prepareLandscape();
		drawLandScape("");
		var debugOutput = "landscape elapsed time " +  (parseInt($.now() - timestamp).toTime()) + ", samplesize "+ data.length;
		console.log(debugOutput);

	};

	//-----------------------------------------------------------------------
	LandscapeController.prototype.redrawLandscape = function() {
		var timestamp = $.now();
		prepareLandscape("");
		drawLandScape("");
		var debugOutput = "landscape elapsed time " +  (parseInt($.now() - timestamp).toTime());
		console.log(debugOutput);

	};


	//-----------------------------------------------------------------------
	LandscapeController.prototype.getLandscapeVisData = function() {
		return this.landscapeVisData;
	};

	//-----------------------------------------------------------------------
	LandscapeController.prototype.setReceivedData = function(receivedData) {
		this.receivedData = receivedData;
	};

		//-----------------------------------------------------------------------
	LandscapeController.prototype.getLabels = function() {
		return this.landscapeVisData.labels.labels;
	};



	LandscapeController.prototype.isReceivedDataPreviouseOne = function(receivedData) {
		var isReceivedDataPrevOne = 0;
		if(typeof prevExtractedDataObj !== 'undefined') {
			if ( "prevReceivedData" in prevExtractedDataObj) {
				var previousData = prevExtractedDataObj["prevReceivedData"];
				if (previousData.length == receivedData.length) {
					for (var i = 0; i < previousData.length; i++) {
						var prevDocId = previousData[i].id;
						var recvDocId = receivedData[i].id;
						// recvDocId = recvDocId.replace(/\//g, "_");
						if (prevDocId == recvDocId) {
							isReceivedDataPrevOne = 1;
						}
						else {
							isReceivedDataPrevOne = 0;
							break;
						}
					}
				}
			}
		}
		if (typeof prevExtractedDataObj === 'undefined') {
			prevExtractedDataObj = {}
		}
		return (isReceivedDataPrevOne == 1);

	}



	//------------------------------------------------------------------------
	var prepareLandscape = function() {

		//create a new DIV to append the landscape drawing
		var visualisationpanelcontainer =  d3.select("#eexcess_landscape_box");
		var landscapeDiv = d3.select("#eexcess_landscape_vis_main");
		var landscapeTagCloudDiv = d3.select("#eexcess_landscape_tag_cloud");
		var widthLandscape =  $( "#eexcess_landscape_vis_main" ).width();
		var heightLandscape = $( "#eexcess_landscape_vis_main" ).height();

		var widthLandscapeCloud =  $( "#eexcess_landscape_tag_cloud" ).width();
		var heightLandscapeCloud = $( "#eexcess_landscape_tag_cloud" ).height();

		landscapeConfig.setWidth(widthLandscape);
		landscapeConfig.setHeight(heightLandscape);

		

		landscapeZoom = d3.behavior.zoom()
	    .translate([0, 0])
	    .scale(1)
	    .scaleExtent([1, 8])
	    .on("zoom", zoomLandscape);
		// initialize svgcanvas
		//--------------------------------------------------
		landscapeCanvas = landscapeDiv.append("svg")
			.attr("width", widthLandscape)//
			.attr("height", heightLandscape)//
			.attr("overflow", "hidden")
			.style("background-color", "#f1f1f1")
			.style("float","left")
			.call(landscapeZoom);
		svgcanvas = landscapeCanvas.append("g").attr("id", "kdApp_landscape").attr("scale", 0);


	if(landscapeConfig.getLandscapeType() == "urankLandscape") {
		tagCloudSvg = landscapeTagCloudDiv.append("svg")
			.attr("width", widthLandscapeCloud)//
			.attr("height", heightLandscapeCloud)//
			.attr("overflow", "hidden")
			.style("background-color", "#f1f1f1")
			.style("float","left");
		tagCloudCanvas = tagCloudSvg.append("g").attr("id", "landscapeTagsCloud");
	}
		//--------------------------------------------------
		// initialize Filter for 3D-Shapes effect
		//---------------------------------------
		svgFilter = new SVGFilter();
		svgFilter.addFilter();
		//---------------------------------------

		strTreeJSTS = new STRTreeJSTS();
		strTreeJSTSOld = new STRTreeJSTS();
		strTreeJSTSCurrent = strTreeJSTSOld;
		strTreeJSTSOldOld = strTreeJSTSOld;
		$("#loadingLandscape").remove();



	};
	//------------------------------------------------------------------------
	var drawLandScape = function(prevVisConfig) {
		me.stateCurrent = new LandscapeState();
		me.stateCurrent.init(me.landscapeVisData, "");
		me.stateCurrent.drawIsolines();
		var brushExtent = [[0, 0], [0, 0]];
		if(prevVisConfig != "" && prevVisConfig != null	&& prevVisConfig.brushExtent != null && prevVisConfig.brushExtent !="") {
			brushExtent = prevVisConfig.brushExtent;
		}

		initLandscapeBrush(brushExtent);

		landscapeBrushElem = svgcanvas.append("g")//
		.attr("class", "landscapeBrush")//
		.attr("id", "landscapeBrush")
		.call(landscapeBrush);

		me.stateCurrent.drawAllDocuments();
		me.stateCurrent.drawLabels();
		if(prevVisConfig != "" && prevVisConfig != null) {
			if(prevVisConfig.tags != null && prevVisConfig.tags !="") {
				stateCurrent.drawTagsCloud(prevVisConfig.tags);
			}
			var translate = [0,0];
			var scale = 1;
			if(prevVisConfig.translation != null && prevVisConfig.translation !="") {
				translate = prevVisConfig.translation;
			}
			if(prevVisConfig.scale != null && prevVisConfig.scale !="") {
				scale = prevVisConfig.scale;
			}
			me.stateCurrent.resetZoom(translate, scale);
		}
		d3.select(window)
		  .on('keydown', function() {
		  	if(d3.event.keyCode == 17) {
			landscapeOldMousedown = landscapeBrushElem.on('mousedown.brush');
			landscapeOldMouseUp = landscapeBrushElem.on('touchstart.brush');
			landscapeBrushElem.on("mousedown.brush", null).on("touchstart.brush",null);
				
		  	}
		})
		.on('keyup', function() {		
			 if(d3.event.keyCode == 17) {
				landscapeBrushElem.on("mousedown.brush", landscapeOldMousedown).on("touchstart.brush",landscapeOldMousedown);

		  	}
		});

	};

	//------------------------------------------------------------------------
	var zoomLandscape =  function() {
		var landscapeScale = 	d3.select("#kdApp_landscape").attr("scale"); 
		var scale = landscapeZoom.scale(); 

		if(scale == 1 && prevLandscapeScale == 1 && landscapeInitialScaleCounter > 0) {
			landscapeZoom.translate([0,0])
		}
		if(scale == 1) {
			prevLandscapeScale = -1; 
			landscapeInitialScaleCounter = landscapeInitialScaleCounter > 7 ? 8: landscapeInitialScaleCounter+1; 
		}
		else {
			landscapeInitialScaleCounter = 0; 
			prevLandscapeScale = scale; 
		}

	
	
		d3.select("#kdApp_landscape").attr("transform", "translate(" +  landscapeZoom.translate() + ")" + " scale(" + landscapeZoom.scale() + ")");
	
	};

	//------------------------------------------------------------------------
	var initLandscapeBrush = function(brushExtent) {
			var tagClass = 'urank-tagcloud-tag';
		landscapeBrush = d3.svg.brush()
		.x(d3.scale.linear().range([0, landscapeConfig.getWidth()]))
		.y(d3.scale.linear().range([0, landscapeConfig.getHeight()]))
		.extent(brushExtent).on("brushstart", function() {	
			if(d3.event.sourceEvent.ctrlKey) {
				return; 
			}
			$('.'+tagClass).hide();
			stateCurrent.clearTagCloud(); 
			isLandscapeZoomAble = false; 
			landscapeTranslate =   JSON.parse(JSON.stringify(landscapeZoom.translate()));  
			landscapeScale =   JSON.parse(JSON.stringify(landscapeZoom.scale())); 	
			landscapeZoom.on("zoom",null);

			
		})
		.on("brush", function() { 
			if(d3.event.sourceEvent.ctrlKey) {
				return; 
			}
		})
		.on("brushend", function() { 
			if(d3.event.sourceEvent.ctrlKey) {
				return; 
			}
			//landscapeZoom.on("zoom",null);
			var minBrushX = 0;
			var maxBrushX = 0;
			$('.'+tagClass).hide();
			$.each(landscapeBrush.extent(), function(index, element) {
				if (index == 0) {
					minBrushX = element[0];
				}
				if (index == 1) {
					maxBrushX = element[0];
				}
			});
			if(maxBrushX > minBrushX) {
				var documentIds = []; 
				var getCurrentlySelectetDocs = stateCurrent.getDocumentsWithinBrush();
				$.each(getCurrentlySelectetDocs, function(docId, data) {
					var id = parseInt( docId.split("_")[1]); 
					documentIds.push(id);
				});
				var datasetList = me.dataProcessor.getDatasetByIds(documentIds); 
				var tagCloundData =  me.dataProcessor.getTagCloudData(documentIds);
				var keywordsData =  me.dataProcessor.getTagCloudKeywordsAndData(documentIds);
				
				if(landscapeConfig.getLandscapeType() == "urankLandscape") {	
					if( me.landscapeTagCloudBuilder != "" &&  me.landscapeTagCloudBuilder !== 'undefined') {
						 me.landscapeTagCloudBuilder.call(this, tagCloundData); 
					}
					var wordsCloudLandscape = new WordsCloudLandscape();
					wordsCloudLandscape.draw(tagCloundData);
				}
				else {
					me.stateCurrent.drawTagsCloud(keywordsData);
				}
				// 
				
		
				if(landscapeConfig.getLandscapeType() != "urankLandscape") {
					FilterHandler.clearList();
					for(var i=0; i < datasetList.length; i++ ) {
						FilterHandler.singleItemSelected(datasetList[i], true); 
					}
				}
				landscapeZoom.on("zoom",zoomLandscape);
				landscapeZoom.translate(landscapeTranslate)
				landscapeZoom.scale(landscapeScale)		
				//me.stateCurrent.resetZoom(translate, scale);
	
			}
			
	
		});
	}; 
    return LandscapeController;

})();



