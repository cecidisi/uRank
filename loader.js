
var pathToUrank = 'scripts/urank/';

Modernizr.load([{
    load: [
        pathToUrank + 'dependencies/colorbrewer.js',
        pathToUrank + 'dependencies/d3.v3.js',
        pathToUrank + 'dependencies/jquery-ui.js',
        pathToUrank + 'dependencies/ui/jquery-ui-1.10.4.custom.min.css',
        pathToUrank + 'dependencies/natural-adapted.js',
        pathToUrank + 'dependencies/underscore.js',
        pathToUrank + 'dependencies/pos/lexer.js',
        pathToUrank + 'dependencies/pos/lexicon.js',
        pathToUrank + 'dependencies/pos/pos.js',
        pathToUrank + 'dependencies/pos/POSTagger.js',
        pathToUrank + 'dependencies/my_libs/outerHTML.js',
        pathToUrank + 'dependencies/my_libs/scrollTo.js',
        pathToUrank + 'blocks/contentList.js',
        pathToUrank + 'blocks/docViewer.js',
        pathToUrank + 'blocks/tagBox.js',
        pathToUrank + 'blocks/tagCloud.js',
        pathToUrank + 'blocks/visCanvas.js',
        pathToUrank + 'vis/ranking.js',
        pathToUrank + 'model/rankingArray.js',
        pathToUrank + 'model/rankingModel.js',
        pathToUrank + 'helper/globals.js',
        pathToUrank + 'helper/keywordExtractor.js',
        pathToUrank + 'helper/settings.js',
        pathToUrank + 'helper/utils.js',
        pathToUrank + 'css/urank.css',
        pathToUrank + 'urank-controller.js'
    ],
    complete: function(){
        console.log('urank loaded');
        Vis();      // call entry point
    }

}]);
