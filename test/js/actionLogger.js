if(!Math.roundTo)
    Math.roundTo = function(value, places) { return +(Math.round(value + "e+" + places)  + "e-" + places); }

window.ActionLogger = (function(){

    var _this;
    var storageKey = 'urank-test';

    function ActionLogger(){
        _this = this;
        this.action = {
            // urank
            tagHovered: 'tag hovered',
            tagClicked: 'tag clicked',
            tagDropped: 'tag dropped',
            multipleTagsDropped: 'multiple tags dropped',
            tagWeightChanged: 'tag weight changed',
            tagDeleted: 'tag deleted',
            documentClicked: 'document clicked',
            documentBookmarked: 'document bookmarked',
            documentUnbookmarked: 'document unbookmarked',
            documentWatched: 'document watched',
            documentUnwatched: 'document unwatched',
            frequencyChanged: 'frequency range changed',
            wordSearched: 'keyword searched',
            reset: 'reset',
            // misc
            ipLogged: 'IP logged',
            topicSelected: 'topic selected'
        };
        this.buffer = [];
    }

    function getStdv(arr, mean) {
        var sum = 0;
        arr.forEach(function(a){
            sum += Math.pow((a - mean), 2);
        });
        return Math.sqrt(sum / arr.length);
    }

    ActionLogger.prototype = {
        log: function(action, info) {
            this.buffer.push({
                action: action,
                info: info || {},
                timestamp: $.now()
            });
        },
        getActionCount: function(){
//            var logFiles = [
//                'test-2015-10-13_10-43-45.json',
//                'test-2015-10-13_10-43-56.json',
//                'test-2015-10-14_01-53-15.json',
//                'test-2015-10-14_09-14-11.json',
//                'test-2015-10-14_09-14-40.json',
//                'test-2015-10-14_09-51-21.json',
//                'test-2015-10-14_09-53-45.json',
//                'test-2015-10-14_11-15-33.json',
//                'test-2015-10-14_11-26-31.json',
//                'test-2015-10-14_11-40-34.json',
//                'test-2015-10-14_12-26-16.json',
//                'test-2015-10-14_12-27-13.json',
//                'test-2015-10-14_12-58-12.json'
//            ];

            var logFiles = [];
            for(var i=1; i<=16; ++i)
                logFiles.push('test-'+i+'.json');


            var actionCount = {}, actionsByUser = [], logStats = {}, logStatsArray = [], loadedFiles = 0;
            Object.keys(_this.action).forEach(function(action){
                var a = _this.action[action];
                actionCount[a] = Array.apply(null, Array(logFiles.length)).map(Number.prototype.valueOf,0);;
            });
            logFiles.forEach(function(file, i){
                actionsByUser.push({ user: (i+1), file: file});
            });

            $.when(
                logFiles.forEach(function(file, i){
                    $.getJSON('./logs/' + file, function(logs){
                        logs.forEach(function(log, j){
                            actionCount[log.action][i]++;
                        });

                        loadedFiles++;
                        if(loadedFiles === logFiles.length) {
                            Object.keys(actionCount).forEach(function(a){
                                logStats[a] = {};
                                logStats[a].total = actionCount[a].reduce(function(previous, current){ return previous+current }, 0);
                                logStats[a].mean = Math.roundTo(logStats[a].total / logFiles.length, 2);
                                logStats[a].std = Math.roundTo(getStdv(actionCount[a], logStats[a].mean), 2);

                                logStatsArray.push({
                                    action: a,
                                    total: logStats[a].total,
                                    mean: logStats[a].mean,
                                    std: logStats[a].std
                                });

                                for(i=0; i<logFiles.length;i++) {
                                    actionsByUser[i][a] = actionCount[a][i];
                                }
                            });
//                            console.log('LOG STATS');
//                            console.log(logStats);
                            console.log('LOG STATS ARRAY');
                            console.log(logStatsArray);
                            console.log(JSON.stringify(logStatsArray));
                            console.log('LOG STATS BY USER');
                            console.log(actionsByUser);
                            console.log(JSON.stringify(actionsByUser));
                        }
                    })
                })

            ).then(function(){
//                console.log('Action Count');
//                console.log(actionCount);
            });

        },
        getActionCountByUser: function(){


        },
        getFullLogs: function(){
            return this.buffer;
        },
        saveLogs: function(path){


        }
    };
    return ActionLogger;
})();
