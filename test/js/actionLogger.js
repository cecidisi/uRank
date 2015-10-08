window.ActionLogger = (function(){

    var _this;
    var storageKey = 'urank-test';

    function ActionLogger(){
        _this = this;
        this.buffer = [];
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
            topicSelected: 'topic selected'
        };
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
