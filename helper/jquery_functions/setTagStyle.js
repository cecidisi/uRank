
(function($) {

    $.fn.setTagStyle = function(bgGradient) {

        function getNavBackground() {
            var originalBackground = '-webkit-linear-gradient('+bgGradient+')';
            if (navigator.userAgent.search("MSIE") >= 0) {
                return '-ms-linear-gradient('+bgGradient+')';
            } else if (navigator.userAgent.search("Chrome") >= 0) {
                return '-webkit-linear-gradient('+bgGradient+')';
            } else if (navigator.userAgent.search("Firefox") >= 0) {
                return '-moz-linear-gradient('+bgGradient+')';
            } else if (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0) {
                return '-webkit-linear-gradient('+bgGradient+')';
            } else if (navigator.userAgent.search("Opera") >= 0) {
                return '-o-linear-gradient('+bgGradient+')';
            } return originalBackground;
        };

        var $tag = $(this);

        if($tag.hasClass('disabled'))
            return $tag.css({ background: '', border: '' });

        if($tag.hasClass('active') && ($tag.hasClass('hovered') || $tag.hasClass('selected') || $tag.hasClass('added')))
            return $tag.css({
                background: '',
                border: ''
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

        if($tag.hasClass('active')/* || $tag.hasClass('addable')*/)
            return $tag.css({
//                background: function() { return getGradientString($tag.data('originalColor')) },
                background: '#555',
                border: '',
            });
        return $tag;
    };
}(jQuery));
