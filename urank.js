function Urank(callback, args, pathToUrank) {


    Modernizr.addTest('defaultstyle', function(){
        if(args.style && args.style != 'default') return false; return true;
    })
    .load([{
        test: Modernizr.defaultstyle,
        yep: [pathToUrank + 'css/urank-blocks-default.css'],
        load: [
            pathToUrank + 'dependencies/colorbrewer.js',
            pathToUrank + 'dependencies/d3.v3.js',
            pathToUrank + 'dependencies/d3pie.js',
            pathToUrank + 'dependencies/jquery-ui.js',
            pathToUrank + 'dependencies/ui/jquery-ui-1.10.4.custom.min.css',
            pathToUrank + 'dependencies/natural-adapted.js',
            pathToUrank + 'dependencies/underscore.js',
            pathToUrank + 'dependencies/hint.min.css',
            pathToUrank + 'dependencies/pos/lexer.js',
            pathToUrank + 'dependencies/pos/lexicon.js',
            pathToUrank + 'dependencies/pos/pos.js',
            pathToUrank + 'dependencies/pos/POSTagger.js',
            pathToUrank + 'dependencies/my_libs/outerHTML.js',
            pathToUrank + 'dependencies/my_libs/scrollTo.js',
            pathToUrank + 'dependencies/my_libs/fullOffset.js',
            pathToUrank + 'dependencies/my_libs/fullWidth.js',
            pathToUrank + 'dependencies/my_libs/fullHeight.js',
            pathToUrank + 'dependencies/my_libs/pin.js',
            pathToUrank + 'model/keywordExtractor.js',
            pathToUrank + 'model/rankingArray.js',
            pathToUrank + 'model/rankingModel.js',
            pathToUrank + 'blocks/contentList.js',
            pathToUrank + 'blocks/docViewer.js',
            pathToUrank + 'blocks/tagBox.js',
            pathToUrank + 'blocks/tagCloud.js',
            pathToUrank + 'blocks/visCanvas.js',
            pathToUrank + 'vis/ranking.js',
            pathToUrank + 'helper/globals.js',
            pathToUrank + 'helper/settings.js',
            pathToUrank + 'helper/utils.js',
            pathToUrank + 'css/urank.css',
            pathToUrank + 'urank-controller.js'
        ],
/*        callback: function(testResult, key) {
            console.log(testResult);
            console.log(key);
        },*/
        complete: function(){
            console.log('urank loaded');
            var urank = new UrankController(args);
            callback.call(this, urank); // call entry point
        }

    }]);
}

