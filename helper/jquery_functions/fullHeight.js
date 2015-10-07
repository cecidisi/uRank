
(function($) {

    $.fn.fullHeight = function() {
        var m = {
            border: {
                top: $(this).css('border-top-width') || '0px',
                bottom: $(this).css('border-bottom-width') || '0px'
            },
            padding: {
                top: $(this).css('padding-top') || '0px',
                bottom: $(this).css('padding-bottom') || '0px'
            }
        };

        return $(this).height()
            + parseInt(m.border.top.replace('px', ''))
            + parseInt(m.padding.top.replace('px', ''))
            + parseInt(m.border.bottom.replace('px', ''))
            + parseInt(m.padding.bottom.replace('px', ''));
    };
}(jQuery));
