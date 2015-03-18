# uRank

Use uRank to visualize a colleciton of documents and rank them according to keywords selected by the user


Include the following files in the header:
 * jquery (version 1.10.2 or higher)
 * modernizr (urank/dependencies/modernizr.js)
 * urank entry point (urank/urank.js)
 See the following example (assume urank folder is inside the folder scripts/)
<script type="text/javascript" src="libs/jquery-1.10.2.js" charset="utf-8"></script>
<script type="text/javascript" src="scripts/urank/dependencies/modernizr.js" charset="utf-8"></script>
<script type="text/javascript" src="scripts/urank/urank.js" charset="utf-8"></script>

In your code, call the Urank function passing 3 arguments: 
  * A callback function that will receive a UrankController object in the parameters
  * An object specifying initialization settings
  * A string with the path to urank folder

Example:
 
var options = {
   tagCloudRoot: '#tag_cloud',
   tagBoxRoot: '#tag_box',
   contentListRoot: '#content_list',
   visCanvasRoot: '#vis_canvas',
   docViewerRoot: '#doc_viewer'
};

var init = function(urank){
   $('#btn_reset').click(urank.reset);
   $('#btn_sort_by_overall_score').click(urank.rankByOverallScore);
   $('#btn_sort_by_max_score').click(urank.rankByMaximumScore);
   urank.loadData(data));
};

Urank(init, options, 'scripts/urank/');

options passes the DOM elements that will be roots for each specific component (see full list below). init is the callback function that receives a UrankController object: urank
This controller provides three event handlers that can be bound to your own DOM elements: reset, rankByOverallScore and rankByMaximumScore. Call urank's loadData
method and passing your data array
 
 
 
Full list of initizialization options:

   * tagCloudRoot: {string} DOM selector for tagCloud container
   * tagBoxRoot:  {string} DOM selector for tagBox container
   * contentListRoot:  {string} DOM selector for contentList container
   * visCanvasRoot:  {string} DOM selector for visCanvas container
   * docViewerRoot:  {string} DOM selector for docViewer container
   * tagColorArray: {array} (optional) HEX color strings for tags in Tag Cloud. It should be a palette for sequential data (see colorbrewer2.org)
   * queryTermColorArray: {array} (optional) HEX color strings for tags in Tag Box. It should be a palette for qualitative data (see colorbrewer2.org)
   
   Callbacks to be executed after homonymous methods (optional)
   * onLoad: receives array with keywords extracted from loaded data
   * onChange: receives two parameters: ranking data array and seleced keywords array
   * onReset
   * onRankByOverallScore
   * onRankByMaximumScore
   * onItemClicked: receives document id as parameter
   * onItemMouseEnter: receives document id as parameter
   * onItemMouseLeave: receives document id as parameter
   * onFaviconClicked: receives document id as parameter
   * onWatchiconClicked: receives document id as parameter
   * onTagInCloudMouseEnter: receives tag index in keywords array
   * onTagInCloudMouseLeave: receives tag index in keywords array
   * onTagInCloudClick: receives tag index in keywords array
   * onTagDeleted: receives tag index in keywords array
   * onTagInBoxMouseEnter: receives tag index in keywords array
   * onTagInBoxMouseLeave: receives tag index in keywords array
   * onTagInBoxClick: receives tag index in keywords array
