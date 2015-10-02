
(function($) {

    $.fn.setTagStyle = function() {

        var $tag = $(this);

        if($tag.hasClass('disabled'))
            return $tag.css({ background: '', border: '' });

        if($tag.hasClass('active') && ($tag.hasClass('selected') || $tag.hasClass('hovered')))
            return $tag.css({
                background: function() {
                    var backgroudGradient = "top, rgb(0, 102, 255), rgb(20, 122, 255), rgb(0, 102, 255)";
                    var hoverBackground = '-webkit-linear-gradient('+backgroudGradient+')';
                    if (navigator.userAgent.search("MSIE") >= 0) {
                        return '-ms-linear-gradient('+backgroudGradient+')';
                    } else if (navigator.userAgent.search("Chrome") >= 0) {
                        return '-webkit-linear-gradient('+backgroudGradient+')';
                    } else if (navigator.userAgent.search("Firefox") >= 0) {
                        return '-moz-linear-gradient('+backgroudGradient+')';
                    } else if (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0) {
                        return '-webkit-linear-gradient('+backgroudGradient+')';
                    } else if (navigator.userAgent.search("Opera") >= 0) {
                        return '-o-linear-gradient('+backgroudGradient+')';
                    } return hoverBackground;
                },
                border: 'solid 2px rgb(0, 102, 255)'
            });

        if($tag.hasClass('dropped'))
//            return $tag.css({
//                background: $tag.data('queryColor'),
//                border: 'solid 2px ' + $tag.data('queryColor'),
//                color: 'white'
//            });
            return $tag.css({
                background: '',
                border: 'solid 2px ' + $tag.data('queryColor')
            });

        if($tag.hasClass('active') || $tag.hasClass('addable'))
            return $tag.css({
                background: function() { return getGradientString($tag.data('originalColor')) },
                border: function() { return '2px solid ' + $tag.data('originalColor') },
            });
        return $tag;
    };
}(jQuery));
