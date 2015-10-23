function UrankLoader(callback, args) {

    //  Find path to urank root
    var scripts = document.getElementsByTagName('script'),
        i = 0;

    while(i<scripts.length && scripts[i].src.indexOf('urank-loader.js') == -1)
        i++;

    var pathToUrank = scripts[i].src.replace('urank-loader.js', '');
    console.log(pathToUrank);

    var loadAll = function() {

        Modernizr.load([
            {
                test: window.jQuery,
                nope: pathToUrank + 'dependencies/jquery.js'
            },
            {
                test: window.jQuery.ui,
                nope: [pathToUrank + 'dependencies/jquery-ui.min.js'/*, pathToUrank + 'dependencies/theme/jquery-ui.min.css'*/]
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
                nope: pathToUrank + 'dependencies/d3pie.min.js'
            },
            {
                test: window._,
                nope: pathToUrank + 'dependencies/underscore-min.js'
            },
            {
                load: [
                    pathToUrank + 'dependencies/hint.min.css',
                    pathToUrank + 'dependencies/theme/jquery-ui.min.css',
                    pathToUrank + 'dependencies/velocity.js',
                    pathToUrank + 'dependencies/velocity.ui.js',
                    pathToUrank + 'dependencies/jquery.mousewheel.min.js',
                    pathToUrank + 'dependencies/malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar.css',
                    pathToUrank + 'dependencies/malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar.js',
                    pathToUrank + 'libs/natural-custom.js',
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
                    pathToUrank + 'modules/tagcloud/tagCloudDefault.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/createLandscape/installLocationMainWindow.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/createLandscape/stockwatcher.nocache.js',
                    pathToUrank + 'modules/tagcloud/landscape/css/landscape.css',
                    pathToUrank + 'modules/tagcloud/landscape/js/libs/javascript.util.min.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/libs/jsts.min.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/libs/underscore.js', // needs to be loaded after stockwatcher.nocache.js
                    pathToUrank + 'modules/tagcloud/landscape/js/libs/d3.layout.cloud.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/drawLancscape/Documents.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/drawLancscape/Isolines.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/drawLancscape/LandscapeConfig.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/drawLancscape/LandscapeHitsMetaData.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/drawLancscape/LandscapeLabels.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/drawLancscape/LandscapeState.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/drawLancscape/WordsCloud.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/drawLancscape/STRTreeJSTS.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/drawLancscape/SVGFilter.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/preProcessing/DataPreProcessor.js',
                    pathToUrank + 'modules/tagcloud/landscape/js/utils/CosineSimilarity.js',
                    pathToUrank + 'modules/tagcloud/landscape/LandscapeController.js',
                    pathToUrank + 'modules/tagcloud/landscape/LandscapeTagCloud.js',
                    pathToUrank + 'modules/viscanvas/ranking.js',
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
                    pathToUrank + 'css/urank-blocks-default.css',
                    pathToUrank + 'css/vis-ranking.css',
                    pathToUrank + 'urank.js'
                ],
                complete: function(){
                     setTimeout(function(){
                        console.log('urank loaded');
                        var urank = new Urank(args);
                        callback.call(this, urank); // call entry point
                    }, 500);
                }
            }
        ]);
    };


    var isModernizr = window.Modernizr || false;
    var isModernizrLoad = (isModernizr && window.Modernizr.load) ? true : false;

    if(!isModernizr || !isModernizrLoad) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = pathToUrank + 'libs/modernizr-custom.js';
        script.onload = loadAll;
        head.appendChild(script);
    }
    else
        loadAll();

}

