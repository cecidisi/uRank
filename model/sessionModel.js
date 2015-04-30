var SessionModel = (function(){

    function SessionModel() {
        this.session = [];
    }






    SessionModel.prototype = {

        addLog: function(status, keywords, ) {




        },
        getLog: function(index) {
            return this.session[index];
        },
        getSession: function() {
            return this.session;
        }

    };

    return SessionModel;

})();
