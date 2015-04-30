var Session = (function(){

    function Session() {
        this.session = [];
    }






    Session.prototype = {

        addLog: function(status, keywords, ) {




        },
        getLog: function(index) {
            return this.session[index];
        },
        getSession: function() {
            return this.session;
        }

    };

    return Session;

})();
