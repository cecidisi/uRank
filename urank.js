function Urank(callback, args, pathToUrank) {


    Modernizr
    .addTest('defaultstyle', function(){
        if(args.style && args.style != 'default') return false; return true;
    })
    .load([
        {
            test: window.jQuery,
            nope: pathToUrank + 'dependencies/jquery.js'
        },
        {
            test: window.jQuery.ui,
            nope: [pathToUrank + 'dependencies/jquery-ui.js', pathToUrank + 'dependencies/jquery-ui-custom.min.css']
        },
        {
            test: window.d3,
            nope: pathToUrank + 'dependencies/d3.min.js'
        },
        {
            test: window.colorbrewer,
            nope: pathToUrank + 'dependencies/colorbrewer.js'
        },
        {
            test: window.d3pie,
            nope: pathToUrank + 'dependencies/d3pie.js'
        },
        {
            test: window._,
            nope: pathToUrank + 'dependencies/underscore.js'
        },
        {
            test: Modernizr.defaultstyle,
            yep: pathToUrank + 'css/urank-blocks-default.css'
        },
        {
            load: [
                pathToUrank + 'dependencies/hint.min.css',
                pathToUrank + 'libs/natural-adapted.js',
                pathToUrank + 'libs/pos/lexer.js',
                pathToUrank + 'libs/pos/lexicon.js',
                pathToUrank + 'libs/pos/pos.js',
                pathToUrank + 'libs/pos/POSTagger.js',
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
                pathToUrank + 'helper/jquery_functions/outerHTML.js',
                pathToUrank + 'helper/jquery_functions/scrollTo.js',
                pathToUrank + 'helper/jquery_functions/fullOffset.js',
                pathToUrank + 'helper/jquery_functions/fullWidth.js',
                pathToUrank + 'helper/jquery_functions/fullHeight.js',
                pathToUrank + 'helper/jquery_functions/getText.js',
                pathToUrank + 'helper/jquery_functions/pin.js',
                pathToUrank + 'css/urank.css',
                pathToUrank + 'css/vis-ranking.css',
                pathToUrank + 'urank-controller.js'
            ],
            complete: function(){
                console.log('urank loaded');
                var urank = new UrankController(args);
                callback.call(this, urank); // call entry point
            }
        }
    ]);
}

