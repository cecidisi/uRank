(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';

        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';

        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }

        var n = loadNodeModulesSync(x, y);
        if (n) return n;

        throw new Error("Cannot find module '" + x + "'");

        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }

            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }

        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }

            return loadAsFileSync(x + '/index');
        }

        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }

            var m = loadAsFileSync(x);
            if (m) return m;
        }

        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');

            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }

            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);

    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};

    require.define = function (filename, fn) {
        if (require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
        }

        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;

        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };

        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};
});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process){var process = module.exports = {};

process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }

    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();
});

require.define("vm",function(require,module,exports,__dirname,__filename,process){module.exports = require("vm-browserify")});

require.define("/node_modules/vm-browserify/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"index.js"}});

require.define("/node_modules/vm-browserify/index.js",function(require,module,exports,__dirname,__filename,process){var Object_keys = function (obj) {
    if (Object.keys) return Object.keys(obj)
    else {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    }
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

var Script = exports.Script = function NodeScript (code) {
    if (!(this instanceof Script)) return new Script(code);
    this.code = code;
};

Script.prototype.runInNewContext = function (context) {
    if (!context) context = {};

    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';

    document.body.appendChild(iframe);

    var win = iframe.contentWindow;

    forEach(Object_keys(context), function (key) {
        win[key] = context[key];
    });

    if (!win.eval && win.execScript) {
        // win.eval() magically appears when this is called in IE:
        win.execScript('null');
    }

    var res = win.eval(this.code);

    forEach(Object_keys(win), function (key) {
        context[key] = win[key];
    });

    document.body.removeChild(iframe);

    return res;
};

Script.prototype.runInThisContext = function () {
    return eval(this.code); // maybe...
};

Script.prototype.runInContext = function (context) {
    // seems to be just runInNewContext on magical context objects which are
    // otherwise indistinguishable from objects except plain old objects
    // for the parameter segfaults node
    return this.runInNewContext(context);
};

forEach(Object_keys(Script.prototype), function (name) {
    exports[name] = Script[name] = function (code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
    };
});

exports.createScript = function (code) {
    return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
    // not really sure what this one does
    // seems to just make a shallow copy
    var copy = {};
    if(typeof context === 'object') {
        forEach(Object_keys(context), function (key) {
            copy[key] = context[key];
        });
    }
    return copy;
};
});

require.define("/lib/natural/phonetics/soundex.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Phonetic = require('./phonetic');

function transformLipps(token) {
    return token.replace(/[bfpv]/g, '1');
}

function transformThroats(token) {
    return token.replace(/[cgjkqsxz]/g, '2');
}

function transformToungue(token) {
    return token.replace(/[dt]/g, '3');
}

function transformL(token) {
    return token.replace(/l/g, '4');
}

function transformHum(token) {
    return token.replace(/[mn]/g, '5');
}

function transformR(token) {
    return token.replace(/r/g, '6');
}

function condense(token) {
    return token.replace(/(\d)[hw]?\1+/g, '$1').replace(/[hw]/g, '');
}

function padRight0(token) {
    if(token.length < 4)
        return token + Array(4 - token.length).join('0');
    else
        return token;
}

var SoundEx = new Phonetic();
module.exports = SoundEx;

SoundEx.process = function(token, maxLength) {
    token = token.toLowerCase();

    return token.charAt(0).toUpperCase() + padRight0(condense(transformLipps(transformThroats(
        transformToungue(transformL(transformHum(transformR(
            token.substr(1, token.length - 1).replace(/[aeiouy]/g, '')))))))
                )).substr(0, (maxLength && maxLength - 1) || 3);
};

// export for tests;
SoundEx.transformLipps = transformLipps;
SoundEx.transformThroats = transformThroats;
SoundEx.transformToungue = transformToungue;
SoundEx.transformL = transformL;
SoundEx.transformHum = transformHum;
SoundEx.transformR = transformR;
SoundEx.condense = condense;
SoundEx.padRight0 = padRight0;
});

require.define("/lib/natural/phonetics/phonetic.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords');
var Tokenizer = new require('../tokenizers/aggressive_tokenizer')
    tokenizer = new Tokenizer();

module.exports = function() {
    this.compare = function(stringA, stringB) {
        return this.process(stringA) == this.process(stringB);
    };

    this.attach = function() {
	var phonetic = this;

        String.prototype.soundsLike = function(compareTo) {
            return phonetic.compare(this, compareTo);
        }

        String.prototype.phonetics = function() {
            return phonetic.process(this);
        }

        String.prototype.tokenizeAndPhoneticize = function(keepStops) {
            var phoneticizedTokens = [];

            tokenizer.tokenize(this).forEach(function(token) {
                if(keepStops || stopwords.words.indexOf(token) < 0)
                    phoneticizedTokens.push(token.phonetics());
            });

            return phoneticizedTokens;
        }
    };
};
});

require.define("/lib/natural/stemmers/token.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2015, Luís Rodrigues

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module.exports = (function () {
  'use strict';

  /**
   * Stemmer token constructor.
   *
   * @param {String} string Token string.
   */
  var Token = function (string) {
    this.vowels   = '';
    this.regions  = {};
    this.string   = string;
    this.original = string;
  }

  /**
   * Set vowels.
   *
   * @param  {String|Array} vowels List of vowels.
   * @return {Token}               Token instance.
   */
  Token.prototype.usingVowels = function (vowels) {
    this.vowels = vowels;
    return this;
  };

  /**
   * Marks a region by defining its starting index or providing a callback
   * function that does.
   *
   * @param  {String}       region   Region name.
   * @param  {Array|Number} args     Callback arguments or region start index.
   * @param  {Function}     callback Function that determines the start index (optional).
   * @param  {Object}       context  Callback context (optional, defaults to this).
   * @return {Token}                 Token instance.
   */
  Token.prototype.markRegion = function (region, args, callback, context) {
    if (typeof callback === 'function') {
      this.regions[region] = callback.apply(context || this, [].concat(args));

    } else if (!isNaN(args)) {
      this.regions[region] = args;
    }

    return this;
  };

  /**
   * Replaces all instances of a string with another.
   *
   * @param  {String} find    String to be replaced.
   * @param  {String} replace Replacement string.
   * @return {Token}          Token instance.
   */
  Token.prototype.replaceAll = function (find, replace) {
    this.string = this.string.split(find).join(replace);
    return this;
  };

  /**
   * Replaces the token suffix if in a region.
   *
   * @param  {String} suffix  Suffix to replace.
   * @param  {String} replace Replacement string.
   * @param  {String} region  Region name.
   * @return {Token}          Token instance.
   */
  Token.prototype.replaceSuffixInRegion = function (suffix, replace, region) {
    var suffixes = [].concat(suffix);
    for (var i = 0; i < suffixes.length; i++) {
      if (this.hasSuffixInRegion(suffixes[i], region)) {
        this.string = this.string.slice(0, -suffixes[i].length) + replace;
        return this;
      }
    }
    return this;
  };

  /**
   * Determines whether the token has a vowel at the provided index.
   *
   * @param  {Integer} index Character index.
   * @return {Boolean}       Whether the token has a vowel at the provided index.
   */
  Token.prototype.hasVowelAtIndex = function (index) {
    return this.vowels.indexOf(this.string[index]) !== -1;
  };

  /**
   * Finds the next vowel in the token.
   *
   * @param  {Integer} start Starting index offset.
   * @return {Integer}       Vowel index, or the end of the string.
   */
  Token.prototype.nextVowelIndex = function (start) {
    var index = (start >= 0 && start < this.string.length) ? start : this.string.length;
    while (index < this.string.length && !this.hasVowelAtIndex(index)) {
      index++;
    }
    return index;
  };

  /**
   * Finds the next consonant in the token.
   *
   * @param  {Integer} start Starting index offset.
   * @return {Integer}       Consonant index, or the end of the string.
   */
  Token.prototype.nextConsonantIndex = function (start) {
    var index = (start >= 0 && start < this.string.length) ? start : this.string.length;
    while (index < this.string.length && this.hasVowelAtIndex(index)) {
      index++;
    }
    return index;
  };

  /**
   * Determines whether the token has the provided suffix.
   * @param  {String}  suffix Suffix to match.
   * @return {Boolean}        Whether the token string ends in suffix.
   */
  Token.prototype.hasSuffix = function (suffix) {
    return this.string.slice(-suffix.length) === suffix;
  };

  /**
   * Determines whether the token has the provided suffix within the specified
   * region.
   *
   * @param  {String}  suffix Suffix to match.
   * @param  {String}  region Region name.
   * @return {Boolean}        Whether the token string ends in suffix.
   */
  Token.prototype.hasSuffixInRegion = function (suffix, region) {
    var regionStart = this.regions[region] || 0,
      suffixStart   = this.string.length - suffix.length;
    return this.hasSuffix(suffix) && suffixStart >= regionStart;
  };

  return Token;
})();

})

require.define("/lib/natural/util/stopwords.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words =
    [
        'all', 'another', 'any', 'both', 'each', 'other', 'others', 'same', 'such', 'the', 'and', 'that',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
        'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '$', '1',
        '2', '3', '4', '5', '6', '7', '8', '9', '0', '_', 'i', 'ii', 'iii', 'iv', 'v',
        'copyright', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'first', 'second', 'third', 'fourth', 'fifth', 'minor', 'data', 'left',
        'right', 'sample', 'analysis', 'test', 'author', 'article', 'day', 'month', 'year', 'decade', 'century', 'least', 'review', 'worst', 'survey', 'study', 'show',
        'paper', 'research', 'researcher', 'end', 'lack', 'detail', 'focus', 'need', 'elsevier', 'approach', 'method', 'methodology', 'technique', 'type', 'situation',
        'rather', 'hypothesis', 'part', 'deal', 'way', 'story', 'process', 'return', 'phase', 'finding', 'purpose', 'position', 'explanation', 'evidence', 'hand', 'half',
        'model', 'design', 'limitation', 'implication', 'originality', 'value', 'reason', 'result', 'theory', 'effect', 'publication', 'abstract', 'fact', 'factor',
        'alternative', 'within', 'view', 'insight', 'range', 'point', 'assumption', 'field', 'majority', 'minority', 'statistic', 'discussion', 'question', 'address',
        'instance', 'aspect', 'actor', 'citation', 'strategy', 'overview', 'cause', 'future', 'retrospective', 'setting', 'outcome', 'measure', 'age', 'number',
        'forecast', 'conclusion', 'motivation', 'exploration', 'literature', 'type', 'variable', 'composition', 'phenomenon', 'mechanism', 'log', 'size', 'area', 'self',
        'sector', 'pattern', 'support', 'group', 'challenge', 'focu', 'period', 'attempt', 'report', 'evaluation', 'mean', 'seek', 'regression', 'quantile', 'panel',
        'today', 'example', 'novel', 'account', 'investigation', 'book', 'participant', 'goal', 'characteristic', 'case', 'introduction', 'scenario', 'implementation',
        'domain', 'footstep', 'selection', 'generalization', 'feedback', 'framework', 'addition', 'search', 'scale', 'trial', 'issue', 'degree', 'application', 'step',
        'function', 'module', 'state', 'level', 'concept', 'advantage', 'disadvantage', 'representation', 'problem', 'use', 'person', 'source', 'argument', 'essay',
        'notion', 'struggle', 'responsibility', 'response', 'principle', 'moment', 'kind', 'sorce', 'guideline', 'recommendation', 'rate', 'cas', 'ratio', 'estimate',
        'term', 'percent', 'basis', 'amount', 'indicator', 'utilization', 'ltd', 'amp', 'chapter', 'such', 'different', 'form', 'importance', 'new',
    '__key'
    ];

// tell the world about the noise words.
exports.words = words;
});

require.define("/lib/natural/phonetics/metaphone.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Phonetic = require('./phonetic');

function dedup(token) {
    return token.replace(/([^c])\1/g, '$1');
}

function dropInitialLetters(token) {
    if(token.match(/^(kn|gn|pn|ae|wr)/))
        return token.substr(1, token.length - 1);

    return token;
}

function dropBafterMAtEnd(token) {
    return token.replace(/mb$/, 'm');
}

function cTransform(token) {
    token = token.replace(/([^s]|^)(c)(h)/g, '$1x$3').trim();
    token = token.replace(/cia/g, 'xia');
    token = token.replace(/c(i|e|y)/g, 's$1');
    token = token.replace(/c/g, 'k');

    return token;
}

function dTransform(token) {
    token = token.replace(/d(ge|gy|gi)/g, 'j$1');
    token = token.replace(/d/g, 't');

    return token;
}

function dropG(token) {
    token = token.replace(/gh(^$|[^aeiou])/g, 'h$1');
    token = token.replace(/g(n|ned)$/g, '$1');

    return token;
}

function transformG(token) {
    token = token.replace(/([^g]|^)(g)(i|e|y)/g, '$1j$3');
    token = token.replace(/gg/g, 'g');
    token = token.replace(/g/g, 'k');

    return token;
}

function dropH(token) {
    return token.replace(/([aeiou])h([^aeiou])/g, '$1$2');
}

function transformCK(token) {
    return token.replace(/ck/g, 'k');
}
function transformPH(token) {
    return token.replace(/ph/g, 'f');
}

function transformQ(token) {
    return token.replace(/q/g, 'k');
}

function transformS(token) {
    return token.replace(/s(h|io|ia)/g, 'x$1');
}

function transformT(token) {
    token = token.replace(/t(ia|io)/g, 'x$1');
    token = token.replace(/th/, '0');

    return token;
}

function dropT(token) {
    return token.replace(/tch/g, 'ch');
}

function transformV(token) {
    return token.replace(/v/g, 'f');
}

function transformWH(token) {
    return token.replace(/^wh/, 'w');
}

function dropW(token) {
    return token.replace(/w([^aeiou]|$)/g, '$1');
}

function transformX(token) {
    token = token.replace(/^x/, 's');
    token = token.replace(/x/g, 'ks');
    return token;
}

function dropY(token) {
    return token.replace(/y([^aeiou]|$)/g, '$1');
}

function transformZ(token) {
    return token.replace(/z/, 's');
}

function dropVowels(token) {
    return token.charAt(0) + token.substr(1, token.length).replace(/[aeiou]/g, '');
}

var Metaphone = new Phonetic();
module.exports = Metaphone;

Metaphone.process = function(token, maxLength) {
    maxLength == maxLength || 32;
    token = token.toLowerCase();
    token = dedup(token);
    token = dropInitialLetters(token);
    token = dropBafterMAtEnd(token);
    token = transformCK(token);
    token = cTransform(token);
    token = dTransform(token);
    token = dropG(token);
    token = transformG(token);
    token = dropH(token);
    token = transformPH(token);
    token = transformQ(token);
    token = transformS(token);
    token = transformX(token);
    token = transformT(token);
    token = dropT(token);
    token = transformV(token);
    token = transformWH(token);
    token = dropW(token);
    token = dropY(token);
    token = transformZ(token);
    token = dropVowels(token);

    token.toUpperCase();
    if(token.length >= maxLength)
        token = token.substring(0, maxLength);

    return token.toUpperCase();
};

// expose functions for testing
Metaphone.dedup = dedup;
Metaphone.dropInitialLetters = dropInitialLetters;
Metaphone.dropBafterMAtEnd = dropBafterMAtEnd;
Metaphone.cTransform = cTransform;
Metaphone.dTransform = dTransform;
Metaphone.dropG = dropG;
Metaphone.transformG = transformG;
Metaphone.dropH = dropH;
Metaphone.transformCK = transformCK;
Metaphone.transformPH = transformPH;
Metaphone.transformQ = transformQ;
Metaphone.transformS = transformS;
Metaphone.transformT = transformT;
Metaphone.dropT = dropT;
Metaphone.transformV = transformV;
Metaphone.transformWH = transformWH;
Metaphone.dropW = dropW;
Metaphone.transformX = transformX;
Metaphone.dropY = dropY;
Metaphone.transformZ = transformZ;
Metaphone.dropVowels = dropVowels;
});

require.define("/lib/natural/phonetics/double_metaphone.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Phonetic = require('./phonetic');

var DoubleMetaphone = new Phonetic();
module.exports = DoubleMetaphone;

function isVowel(c) {
	return c && c.match(/[aeiouy]/i);
}

function truncate(string, length) {
    if(string.length >= length)
        string = string.substring(0, length);

    return string;
}

function process(token, maxLength) {
	token = token.toUpperCase();
	var primary = '', secondary = '';
    var pos = 0;
    maxLength == maxLength || 32;

    function subMatch(startOffset, stopOffset, terms) {
        return subMatchAbsolute(pos + startOffset, pos + stopOffset, terms);
    }

    function subMatchAbsolute(startOffset, stopOffset, terms) {
        return terms.indexOf(token.substring(startOffset, stopOffset)) > -1;
    }

    function addSecondary(primaryAppendage, secondaryAppendage) {
    	primary += primaryAppendage;
    	secondary += secondaryAppendage;
    }

    function add(primaryAppendage) {
    	addSecondary(primaryAppendage, primaryAppendage);
    }

    function addCompressedDouble(c, encoded) {
    	if(token[pos + 1] == c)
    		pos++;
    	add(encoded || c);
    }

    function handleC() {
        if(pos > 1 && !isVowel(token[pos - 2])
                && token[pos - 1] == 'A' && token[pos + 1] == 'H'
                    && (token[pos + 2] != 'I' && token[pos + 2] != 'I')
                        || subMatch(-2, 4, ['BACHER', 'MACHER'])) {
            add('K');
            pos++;
        } else if(pos == 0 && token.substring(1, 6) == 'EASAR') {
            add('S');
            pos++;
        } else if(token.substring(pos + 1, pos + 4) == 'HIA') {
            add('K');
            pos++;
        } else if(token[pos + 1] == 'H') {
            if(pos > 0 && token.substring(pos + 2, pos + 4) == 'AE') {
                addSecondary('K', 'X');
                pos++;
            } else if(pos == 0
                        && (subMatch(1, 6, ['HARAC', 'HARIS'])
                            || subMatch(1, 3, ['HOR', 'HUM', 'HIA', 'HEM']))
                        && token.substring(pos + 1, pos + 5) != 'HORE') {
                add('K');
                pos++;
            } else {
                if((subMatchAbsolute(0, 3, ['VAN', 'VON']) || token.substring(0,  3) == 'SCH')
                    || subMatch(-2, 4, ['ORCHES', 'ARCHIT', 'ORCHID'])
                    || subMatch(2, 3, ['T', 'S'])
                    || ((subMatch(-1, 0, ['A', 'O', 'U', 'E']) || pos == 0)
                        && subMatch(2, 3, ['B', 'F', 'H', 'L', 'M', 'N', 'R', 'V', 'W']))) {
                    add('K');
                } else if(pos > 0) {
                    if(token.substring(0, 2) == 'MC') {
                        add('K');
                    } else {
                        addSecondary('X', 'K');
                    }
                } else {
                    add('X');
                }

                pos++;
            }
        } else if(token.substring(pos, pos + 2) == 'CZ'
                && token.substring(pos - 2, pos + 1) != 'WICZ') {
            addSecondary('S', 'X');
            pos++;
        } else if(token.substring(pos, pos + 3) == 'CIA') {
            add('X');
            pos += 2;
        } else if(token[pos + 1] == 'C' && pos != 1 && token[0] != 'M') {
            if(['I', 'E', 'H'].indexOf(token[pos + 2]) > -1
                    && token.substring(pos + 2, pos + 4) != 'HU') {
                if(pos == 1 && token[pos - 1] == 'A'
                        || subMatch(-1, 4, ['UCCEE', 'UCCES'])) {
                    add('KS');
                } else {
                   add('X');
                }

               pos +=2;
            } else {
                add('K');
                pos++;
            }
        } else if(['K', 'G', 'Q'].indexOf(token[pos + 1]) > -1) {
            add('K');
            pos++;
        } else if(['E', 'I', 'Y'].indexOf(token[pos + 1]) > -1) {
            if(subMatch(1, 3, ['IA', 'IE', 'IO'])) {
                addSecondary('S', 'X');
            } else {
                add('S');
            }
            pos++;
        } else {
            add('K');
            if(token[pos + 1] == ' ' && ['C', 'Q', 'G'].indexOf(token[pos + 2])) {
                pos += 2;
            } else if(['C', 'K', 'Q'].indexOf(token[pos + 1]) > -1
                    && !subMatch(1, 3, ['CE', 'CI'])) {
                pos++;
            }
        }
    }

    function handleD() {
    	if(token[pos + 1] == 'G') {
    		if(['I', 'E', 'Y'].indexOf(token[pos + 2]) > -1)  {
    			add('J');
    			pos += 2;
    		} else {
    			add('TK');
    			pos++;
    		}
	    } else if(token[pos + 1] == 'T') {
    		add('T');
	    	pos++;
    	} else
    		addCompressedDouble('D', 'T');
    }

    function handleG() {
        if(token[pos + 1] == 'H') {
            if(pos > 0 && !isVowel(token[pos - 1])) {
                add('K');
                pos++;
            } else if(pos == 0) {
                if(token[pos + 2] == 'I') {
                    add('J');
                } else {
                    add('K');
                }
                pos++;
            } else if(pos > 1
                && (['B', 'H', 'D'].indexOf(token[pos - 2]) > -1
                    || ['B', 'H', 'D'].indexOf(token[pos - 3]) > -1
                    || ['B', 'H'].indexOf(token[pos - 4]) > -1)) {
                pos++;
            } else {
                if(pos > 2
                        && token[pos - 1] == 'U'
                        && ['C', 'G', 'L', 'R', 'T'].indexOf(token[pos - 3]) > -1) {
                    add('F');
                } else if(token[pos - 1] != 'I') {
                    add('K');
                }

                pos++;
            }
        } else if(token[pos + 1] == 'N') {
            if(pos == 1 && startsWithVowel && !slavoGermanic) {
                addSecondary('KN', 'N');
            } else {
                if(token.substring(pos + 2, pos + 4) != 'EY'
                        && (token[pos + 1] != 'Y'
                            && !slavoGermanic)) {
                    addSecondary('N', 'KN');
                } else
                    add('KN');
            }
            pos++;
        } else if(token.substring(pos + 1, pos + 3) == 'LI' && !slavoGermanic) {
            addSecondary('KL', 'L');
            pos++;
        } else if(pos == 0 && (token[pos + 1] == 'Y'
                || subMatch(1, 3, ['ES', 'EP', 'EB', 'EL', 'EY', 'IB', 'IL', 'IN', 'IE', 'EI', 'ER']))) {
            addSecondary('K', 'J')
        } else {
            addCompressedDouble('G', 'K');
        }
    }

    function handleH() {
		// keep if starts a word or is surrounded by vowels
		if((pos == 0 || isVowel(token[pos - 1])) && isVowel(token[pos + 1])) {
			add('H');
			pos++;
		}
    }

    function handleJ() {
        var jose = (token.substring(pos + 1, pos + 4) == 'OSE');

        if(san || jose) {
            if((pos == 0 && token[pos + 4] == ' ')
                    || san) {
                add('H');
            } else
                add('J', 'H');
        } else {
            if(pos == 0/* && !jose*/) {
                addSecondary('J', 'A');
            } else if(isVowel(token[pos - 1]) && !slavoGermanic
                    && (token[pos + 1] == 'A' || token[pos + 1] == 'O')) {
                addSecondary('J', 'H');
            } else if(pos == token.length - 1) {
                addSecondary('J', ' ');
            } else
                addCompressedDouble('J');
        }
    }

    function handleL() {
    	if(token[pos + 1] == 'L') {
    		if(pos == token.length - 3 && (
    					subMatch(-1, 3, ['ILLO', 'ILLA', 'ALLE']) || (
    						token.substring(pos - 1, pos + 3) == 'ALLE' &&
    						(subMatch(-2, -1, ['AS', 'OS']) > -1 ||
    						['A', 'O'].indexOf(token[token.length - 1]) > -1)))) {
    			addSecondary('L', '');
    			pos++;
    			return;
    		}
    		pos++;
    	}
    	add('L');
    }

    function handleM() {
    	addCompressedDouble('M');
    	if(token[pos - 1] == 'U' && token[pos + 1] == 'B' &&
    			((pos == token.length - 2  || token.substring(pos + 2, pos + 4) == 'ER')))
    		pos++;
    }

    function handleP() {
    	if(token[pos + 1] == 'H') {
    		add('F');
    		pos++;
    	} else {
    		addCompressedDouble('P');

			if(token[pos + 1] == 'B')
    			pos++;
    	}
    }

    function handleR() {
    	if(pos == token.length - 1 && !slavoGermanic
    			&& token.substring(pos - 2, pos) == 'IE'
    			&& !subMatch(-4, -3, ['ME', 'MA'])) {
    		addSecondary('', 'R');
    	} else
	    	addCompressedDouble('R');
    }

    function handleS() {
        if(pos == 0 && token.substring(0, 5) == 'SUGAR') {
            addSecondary('X', 'S');
        } else if(token[pos + 1] == 'H') {
            if(subMatch(2, 5, ['EIM', 'OEK', 'OLM', 'OLZ'])) {
                add('S');
            } else {
                add('X');
            }
            pos++;
        } else if(subMatch(1, 3, ['IO', 'IA'])) {
            if(slavoGermanic) {
                add('S');
            } else {
                addSecondary('S', 'X');
            }
            pos++;
        } else if((pos == 0 && ['M', 'N', 'L', 'W'].indexOf(token[pos + 1]) > -1)
                || token[pos + 1] == 'Z') {
            addSecondary('S', 'X');
            if(token[pos + 1] == 'Z')
                pos++;
        } else if(token.substring(pos, pos + 2) == 'SC') {
            if(token[pos + 2] == 'H') {
                if(subMatch(3, 5, ['ER', 'EN'])) {
                    addSecondary('X', 'SK');
                } else if(subMatch(3, 5, ['OO', 'UY', 'ED', 'EM'])) {
                    add('SK');
                } else if(pos == 0 && !isVowel(token[3]) && token[3] != 'W') {
                    addSecondary('X', 'S');
                } else {
                    add('X');
                }
            } else if(['I', 'E', 'Y'].indexOf(token[pos + 2]) > -1) {
                add('S');
            } else {
                add('SK');
            }

            pos += 2;
        } else if(pos == token.length - 1
                && subMatch(-2, 0, ['AI', 'OI'])) {
            addSecondary('', 'S');
        } else if(token[pos + 1] != 'L' && (
                token[pos - 1] != 'A' && token[pos - 1] != 'I')) {
            addCompressedDouble('S');
            if(token[pos + 1] == 'Z')
                pos++;
        }
    }

    function handleT() {
        if(token.substring(pos + 1, pos + 4) == 'ION') {
            add('XN');
            pos += 3;
        } else if(subMatch(1, 3, ['IA', 'CH'])) {
            add('X');
            pos += 2;
        } else if(token[pos + 1] == 'H'
                || token.substring(1, 2) == 'TH') {
            if(subMatch(2, 4, ['OM', 'AM'])
                    || ['VAN ', 'VON '].indexOf(token.substring(0, 4)) > -1
                    || token.substring(0, 3) == 'SCH') {
                add('T');
            } else
                addSecondary('0', 'T');
            pos++;
        } else {
            addCompressedDouble('T');

            if(token[pos + 1] == 'D')
                pos++;
        }
    }

    function handleX() {
    	if(pos == 0) {
    		add('S');
    	} else if(!(pos == token.length - 1
	    		&& (['IAU', 'EAU', 'IEU'].indexOf(token.substring(pos - 3, pos)) > -1
	    			|| ['AU', 'OU'].indexOf(token.substring(pos - 2, pos)) > -1))) {
    		add('KS');
    	}
    }

    function handleW() {
        if(pos == 0) {
            if(token[1] == 'H') {
                add('A');
            } else if (isVowel(token[1])) {
                addSecondary('A', 'F');
            }
        } else if((pos == token.length - 1 && isVowel(token[pos - 1])
                    || subMatch(-1, 4, ['EWSKI', 'EWSKY', 'OWSKI', 'OWSKY'])
                    || token.substring(0, 3) == 'SCH')) {
                addSecondary('', 'F');
                pos++;
        } else if(['ICZ', 'ITZ'].indexOf(token.substring(pos + 1, pos + 4)) > -1) {
            addSecondary('TS', 'FX');
            pos += 3;
        }
    }

    function handleZ() {
        if(token[pos + 1] == 'H') {
            add('J');
            pos++;
        } else if(subMatch(1, 3, ['ZO', 'ZI', 'ZA'])
                || (slavoGermanic && pos > 0 && token[pos - 1] != 'T')) {
            addSecondary('S', 'TS');
            pos++;
        } else
            addCompressedDouble('Z', 'S');
    }

    var san = (token.substring(0, 3) == 'SAN');
    var startsWithVowel = isVowel(token[0]);
    var slavoGermanic = token.match(/(W|K|CZ|WITZ)/);

    if(subMatch(0, 2, ['GN', 'KN', 'PN', 'WR', 'PS'])) {
    	pos++;
    }

    while(pos < token.length) {
    	switch(token[pos]) {
	        case 'A': case 'E': case 'I': case 'O': case 'U': case 'Y':
	        case 'Ê': case 'É': case 'É': case'À':
		        if(pos == 0)
		        	add('A');
		        break;
		    case 'B':
		    	addCompressedDouble('B', 'P');
		    	break;
            case 'C':
                handleC();
                break;
	        case 'Ç':
	            add("S");
	            break;
	        case 'D':
	        	handleD();
	        	break;
	        case 'F': case 'K': case 'N':
	        	addCompressedDouble(token[pos]);
	        	break;
            case 'G':
                handleG();
                break;
	        case 'H':
	        	handleH();
	        	break;
            case 'J':
                handleJ();
                break;
	        case 'L':
	        	handleL();
	        	break;
	        case 'M':
	        	handleM();
	        	break;
	        case 'Ñ':
	        	add('N');
	        	break;
	        case 'P':
	        	handleP();
	        	break;
	        case 'Q':
	        	addCompressedDouble('Q', 'K');
	        	break;
	        case 'R':
	        	handleR();
	        	break;
            case 'S':
                handleS();
                break;
            case 'T':
                handleT();
                break;
	        case 'V':
	        	addCompressedDouble('V', 'F');
	        	break;
            case 'W':
                handleW();
                break;
	        case 'X':
	        	handleX();
	        	break;
	        case 'Z':
	        	handleZ();
	        	break;
    	}

        if(primary.length >= maxLength && secondary.length >= maxLength) {
            break;
        }

    	pos++;
    }

    return [truncate(primary, maxLength), truncate(secondary, maxLength)];
}

function compare(stringA, stringB) {
    var encodingsA = process(stringA),
        encodingsB = process(stringB);

    return encodingsA[0] == encodingsB[0] ||
        encodingsA[1] == encodingsB[1];
};

DoubleMetaphone.compare = compare
DoubleMetaphone.process = process;
DoubleMetaphone.isVowel = isVowel;
});

require.define("/lib/natural/stemmers/porter_stemmer.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer');

// denote groups of consecutive consonants with a C and consecutive vowels
// with a V.
function categorizeGroups(token) {
    return token.replace(/[^aeiou]+/g, 'C').replace(/[aeiouy]+/g, 'V');
}

// denote single consonants with a C and single vowels with a V
function categorizeChars(token) {
    return token.replace(/[^aeiou]/g, 'C').replace(/[aeiouy]/g, 'V');
}

// calculate the "measure" M of a word. M is the count of VC sequences dropping
// an initial C if it exists and a trailing V if it exists.
function measure(token) {
    if(!token)
	return -1;

    return categorizeGroups(token).replace(/^C/, '').replace(/V$/, '').length / 2;
}

// determine if a token end with a double consonant i.e. happ
function endsWithDoublCons(token) {
    return token.match(/([^aeiou])\1$/);
}

// replace a pattern in a word. if a replacement occurs an optional callback
// can be called to post-process the result. if no match is made NULL is
// returned.
function attemptReplace(token, pattern, replacement, callback) {
    var result = null;

    if((typeof pattern == 'string') && token.substr(0 - pattern.length) == pattern)
        result = token.replace(new RegExp(pattern + '$'), replacement);
    else if((pattern instanceof RegExp) && token.match(pattern))
        result = token.replace(pattern, replacement);

    if(result && callback)
        return callback(result);
    else
        return result;
}

// attempt to replace a list of patterns/replacements on a token for a minimum
// measure M.
function attemptReplacePatterns(token, replacements, measureThreshold) {
    var replacement = null;

    for(var i = 0; i < replacements.length; i++) {
	if(measureThreshold == null || measure(attemptReplace(token, replacements[i][0], '')) > measureThreshold)
	    replacement = attemptReplace(token, replacements[i][0], replacements[i][1]);

	if(replacement)
	    break;
    }

    return replacement;
}

// replace a list of patterns/replacements on a word. if no match is made return
// the original token.
function replacePatterns(token, replacements, measureThreshold) {
    var result = attemptReplacePatterns(token, replacements, measureThreshold);
    token = result == null ? token : result;

    return token;
}

// step 1a as defined for the porter stemmer algorithm.
function step1a(token) {
    if(token.match(/(ss|i)es$/))
        return token.replace(/(ss|i)es$/, '$1');

    if(token.substr(-1) == 's' && token.substr(-2, 1) != 's')
        return token.replace(/s?$/, '');

    return token;
}

// step 1b as defined for the porter stemmer algorithm.
function step1b(token) {
    if(token.substr(-3) == 'eed') {
	if(measure(token.substr(0, token.length - 3)) > 0)
            return token.replace(/eed$/, 'ee');
    } else {
	var result = attemptReplace(token, /ed|ing$/, '', function(token) {
	    if(categorizeGroups(token).indexOf('V') > 0) {
		var result = attemptReplacePatterns(token, [['at', 'ate'],  ['bl', 'ble'], ['iz', 'ize']]);

		if(result)
		    return result;
		else {
		    if(endsWithDoublCons(token) && token.match(/[^lsz]$/))
			return token.replace(/([^aeiou])\1$/, '$1');

		    if(measure(token) == 1 && categorizeChars(token).substr(-3) == 'CVC' && token.match(/[^wxy]$/))
			return token + 'e';
		}

		return token;
	    }

	    return null;
	});

	if(result)
	    return result;
    }

    return token;
}

// step 1c as defined for the porter stemmer algorithm.
function step1c(token) {
    if(categorizeGroups(token).substr(-2, 1) == 'V') {
        if(token.substr(-1) == 'y')
            return token.replace(/y$/, 'i');
    }

    return token;
}

// step 2 as defined for the porter stemmer algorithm.
function step2(token) {
    return replacePatterns(token, [['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'],
        ['izer', 'ize'], ['abli', 'able'], ['alli', 'al'], ['entli', 'ent'], ['eli', 'e'],
        ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'], ['ator', 'ate'],['alism', 'al'],
        ['iveness', 'ive'], ['fulness', 'ful'], ['ousness', 'ous'], ['aliti', 'al'],
        ['iviti', 'ive'], ['biliti', 'ble']], 0);
}

// step 3 as defined for the porter stemmer algorithm.
function step3(token) {
    return replacePatterns(token, [['icate', 'ic'], ['ative', ''], ['alize', 'al'],
				   ['iciti', 'ic'], ['ical', 'ic'], ['ful', ''], ['ness', '']], 0);
}

// step 4 as defined for the porter stemmer algorithm.
function step4(token) {
    return replacePatterns(token, [['al', ''], ['ance', ''], ['ence', ''], ['er', ''],
        ['ic', ''], ['able', ''], ['ible', ''], ['ant', ''],
        ['ement', ''], ['ment', ''], ['ent', ''], [/([st])ion/, '$1'], ['ou', ''], ['ism', ''],
        ['ate', ''], ['iti', ''], ['ous', ''], ['ive', ''],
        ['ize', '']], 1);
}

// step 5a as defined for the porter stemmer algorithm.
function step5a(token) {
    var m = measure(token);

    if((m > 1 && token.substr(-1) == 'e') || (m == 1 && !(categorizeChars(token).substr(-4, 3) == 'CVC' && token.match(/[^wxy].$/))))
        return token.replace(/e$/, '');

    return token;
}

// step 5b as defined for the porter stemmer algorithm.
function step5b(token) {
    if(measure(token) > 1) {
        if(endsWithDoublCons(token) && token.substr(-2) == 'll')
           return token.replace(/ll$/, 'l');
    }

    return token;
}

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
    return step5b(step5a(step4(step3(step2(step1c(step1b(step1a(token.toLowerCase())))))))).toString();
};

//exports for tests
PorterStemmer.step1a = step1a;
PorterStemmer.step1b = step1b;
PorterStemmer.step1c = step1c;
PorterStemmer.step2 = step2;
PorterStemmer.step3 = step3;
PorterStemmer.step4 = step4;
PorterStemmer.step5a = step5a;
PorterStemmer.step5b = step5b;
});

require.define("/lib/natural/stemmers/stemmer.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords');
var Tokenizer = require('../tokenizers/aggressive_tokenizer');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];

        new Tokenizer().tokenize(text).forEach(function(token) {
            if(keepStops || stopwords.words.indexOf(token) == -1)
                stemmedTokens.push(stemmer.stem(token));
        });

        return stemmedTokens;
    };
    
    stemmer.tokenize = function(text, keepStops) {
    	var allTokens = [];
    	
    	new Tokenizer().tokenize(text).forEach(function(token) {
    		if (keepStops || stopwords.words.indexOf(token) == -1) {
            	var resultToken = token.toLowerCase();
           		allTokens.push(resultToken);
         	}
      	});

     	return allTokens;
    };


    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };

        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
        
        String.prototype.tokenize = function(keepStops) {
            return stemmer.tokenize(this, keepStops);
        };
    };
}
});

require.define("/lib/natural/tokenizers/aggressive_tokenizer.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

AggressiveTokenizer = function() {
    Tokenizer.call(this);
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/\W+/));
};
});

require.define("/lib/natural/tokenizers/tokenizer.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = function() {
};

Tokenizer.prototype.trim = function(array) {
    if(array[array.length - 1] == '')
        array.pop();

    if(array[0] == '')
        array.shift();

    return array;
};

// expose an attach function that will patch String with a tokenize method
Tokenizer.prototype.attach = function() {
    var tokenizer = this;

    String.prototype.tokenize = function() {
        return tokenizer.tokenize(this);
    }
};

Tokenizer.prototype.tokenize = function() {};

module.exports = Tokenizer;
});

require.define("util",function(require,module,exports,__dirname,__filename,process){var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};
});

require.define("events",function(require,module,exports,__dirname,__filename,process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};
});

require.define("/lib/natural/stemmers/porter_stemmer_ru.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2012, Polyakov Vladimir, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_ru');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

function attemptReplacePatterns(token, patterns) {
	var replacement = null;
	var i = 0, isReplaced = false;
	while ((i < patterns.length) && !isReplaced) {
		if (patterns[i][0].test(token)) {
			replacement = token.replace(patterns[i][0], patterns[i][1]);
			isReplaced = true;
		}
		i++;
	}
	return replacement;
};

function perfectiveGerund(token) {
	var result = attemptReplacePatterns(token, [
			[/[ая]в(ши|шись)$/g, ''],
			[/(ив|ивши|ившись|ывши|ывшись|ыв)$/g, '']
		]);
	return result;
};

function adjectival(token) {
	var result = adjective(token);
	if (result != null) {
		var pariticipleResult = participle(result);
		result = pariticipleResult ? pariticipleResult : result;
	}
	return result;
};

function adjective(token) {
	var result = attemptReplacePatterns(token, [
			[/(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/g, '']
		]);
	return result;
};

function participle(token) {
	var result = attemptReplacePatterns(token, [
		[/([ая])(ем|нн|вш|ющ|щ)$/g, '$1'],
		[/(ивш|ывш|ующ)$/g, '']
	]);
	return result;
};

function reflexive(token) {
	var result = attemptReplacePatterns(token, [
		[/(ся|сь)$/g, '']
	]);
	return result;
};

function verb(token) {
	var result = attemptReplacePatterns(token, [
		[/([ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)$/g, '$1'],
		[/(ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|ит|ыт|ены|ить|ыть|ишь|ую|ю)$/g, '']
	]);
	return result;
};

function noun(token) {
	var result = attemptReplacePatterns(token, [
		[/(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/g, '']
	]);
	return result;
};

function superlative (token) {
	var result = attemptReplacePatterns(token, [
		[/(ейш|ейше)$/g, '']
	]);
	return result;
};

function derivational (token) {
	var result = attemptReplacePatterns(token, [
		[/(ост|ость)$/g, '']
	]);
	return result;
};

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
	token = token.toLowerCase().replace(/ё/g, 'е');
	var volwesRegexp = /^(.*?[аеиоюяуыиэ])(.*)$/g;
	var RV = volwesRegexp.exec(token);
	if (!RV || RV.length < 3) {
		return token;
	}
	var head = RV[1];
	RV = RV[2];
	volwesRegexp.lastIndex = 0;
	var R2 = volwesRegexp.exec(RV);
	var result = perfectiveGerund(RV);
	if (result === null) {
		var resultReflexive = reflexive(RV) || RV;
		result = adjectival(resultReflexive);
		if (result === null) {
			result = verb(resultReflexive);
			if (result === null) {
				result = noun(resultReflexive);
				if (result === null) {
					result = resultReflexive;
				}
			}
		}
	}
	result = result.replace(/и$/g, '');
	var derivationalResult = result
	if (R2 && R2[2]) {
		derivationalResult = derivational(R2[2]);
		if (derivationalResult != null) {
			derivationalResult = derivational(result);
		} else {
			derivationalResult = result;
		}
	}

	var superlativeResult = superlative(derivationalResult) || derivationalResult;

	superlativeResult = superlativeResult.replace(/(н)н/g, '$1');
	superlativeResult = superlativeResult.replace(/ь$/g, '');
	return head + superlativeResult;
};
});

require.define("/lib/natural/stemmers/stemmer_ru.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2012, Polyakov Vladimir, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_ru');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_ru');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];

        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(new RegExp('[а-яё0-9]+', 'gi'))) {
                    resultToken = stemmer.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });

        return stemmedTokens;
    };
    
    stemmer.tokenize = function(text, keepStops) {
    	var allTokens = [];
    	
    	new Tokenizer().tokenize(text).forEach(function(token) {
    		if (keepStops || stopwords.words.indexOf(token) == -1) {
            	var resultToken = token.toLowerCase();
           		allTokens.push(resultToken);
         	}
      	});

     	return allTokens;
    };	    

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };

        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
        
        String.prototype.tokenize = function(keepStops) {
            return stemmer.tokenize(this, keepStops);
        };
    };
}
});

require.define("/lib/natural/util/stopwords_ru.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Polyakov Vladimir, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    'о', 'после', 'все', 'также', 'и', 'другие', 'все', 'как', 'во', 'быть',
    'потому', 'был', 'до', 'являюсь', 'между', 'все', 'но', 'от', 'иди', 'могу',
    'подойди', 'мог', 'делал', 'делаю', 'каждый', 'для', 'откуда', 'иметь', 'имел',
    'он', 'имеет', 'её', 'здесь', 'его', 'как', 'если', 'в', 'оно', 'за',
    'делать', 'много', 'я', 'может быть', 'более', 'самый', 'должен',
    'мой', 'никогда', 'сейчас', 'из', 'на', 'только', 'или', 'другой', 'другая',
    'другое', 'наше', 'вне', 'конец', 'сказал', 'сказала', 'также', 'видел', 'c',
    'немного', 'все еще', 'так', 'затем', 'тот', 'их', 'там', 'этот', 'они', 'те',
    'через', 'тоже', 'под', 'над', 'очень', 'был', 'путь', 'мы', 'хорошо',
    'что', 'где', 'который', 'пока', 'кто', 'с кем', 'хотел бы', 'ты', 'твои',
    'а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н',
    'o', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь',
    'э', 'ю', 'я','$', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '_'];

// tell the world about the noise words.
exports.words = words;
});

require.define("/lib/natural/tokenizers/aggressive_tokenizer_ru.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

AggressiveTokenizer = function() {
    Tokenizer.call(this);
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.clearEmptyString = function(array) {
	return array.filter(function(a) {
		return a != '';
	});
};

AggressiveTokenizer.prototype.clearText = function(text) {
	return text.replace(new RegExp('«|»|!|\\?', 'g'), ' ');
};

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    text = this.clearText(text);
    return this.clearEmptyString(text.split(/-|[|$|\b|\(|\)|[ \s\xA0'\.,:"]+/gi));
};
});





require.define("/lib/natural/stemmers/porter_stemmer_ru.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2012, Polyakov Vladimir, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_ru');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

function attemptReplacePatterns(token, patterns) {
	var replacement = null;
	var i = 0, isReplaced = false;
	while ((i < patterns.length) && !isReplaced) {
		if (patterns[i][0].test(token)) {
			replacement = token.replace(patterns[i][0], patterns[i][1]);
			isReplaced = true;
		}
		i++;
	}
	return replacement;
};

function perfectiveGerund(token) {
	var result = attemptReplacePatterns(token, [
			[/[ая]в(ши|шись)$/g, ''],
			[/(ив|ивши|ившись|ывши|ывшись|ыв)$/g, '']
		]);
	return result;
};

function adjectival(token) {
	var result = adjective(token);
	if (result != null) {
		var pariticipleResult = participle(result);
		result = pariticipleResult ? pariticipleResult : result;
	}
	return result;
};

function adjective(token) {
	var result = attemptReplacePatterns(token, [
			[/(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/g, '']
		]);
	return result;
};

function participle(token) {
	var result = attemptReplacePatterns(token, [
		[/([ая])(ем|нн|вш|ющ|щ)$/g, '$1'],
		[/(ивш|ывш|ующ)$/g, '']
	]);
	return result;
};

function reflexive(token) {
	var result = attemptReplacePatterns(token, [
		[/(ся|сь)$/g, '']
	]);
	return result;
};

function verb(token) {
	var result = attemptReplacePatterns(token, [
		[/([ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)$/g, '$1'],
		[/(ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|ит|ыт|ены|ить|ыть|ишь|ую|ю)$/g, '']
	]);
	return result;
};

function noun(token) {
	var result = attemptReplacePatterns(token, [
		[/(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/g, '']
	]);
	return result;
};

function superlative (token) {
	var result = attemptReplacePatterns(token, [
		[/(ейш|ейше)$/g, '']
	]);
	return result;
};

function derivational (token) {
	var result = attemptReplacePatterns(token, [
		[/(ост|ость)$/g, '']
	]);
	return result;
};

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
	token = token.toLowerCase().replace(/ё/g, 'е');
	var volwesRegexp = /^(.*?[аеиоюяуыиэ])(.*)$/g;
	var RV = volwesRegexp.exec(token);
	if (!RV || RV.length < 3) {
		return token;
	}
	var head = RV[1];
	RV = RV[2];
	volwesRegexp.lastIndex = 0;
	var R2 = volwesRegexp.exec(RV);
	var result = perfectiveGerund(RV);
	if (result === null) {
		var resultReflexive = reflexive(RV) || RV;
		result = adjectival(resultReflexive);
		if (result === null) {
			result = verb(resultReflexive);
			if (result === null) {
				result = noun(resultReflexive);
				if (result === null) {
					result = resultReflexive;
				}
			}
		}
	}
	result = result.replace(/и$/g, '');
	var derivationalResult = result
	if (R2 && R2[2]) {
		derivationalResult = derivational(R2[2]);
		if (derivationalResult != null) {
			derivationalResult = derivational(result);
		} else {
			derivationalResult = result;
		}
	}

	var superlativeResult = superlative(derivationalResult) || derivationalResult;

	superlativeResult = superlativeResult.replace(/(н)н/g, '$1');
	superlativeResult = superlativeResult.replace(/ь$/g, '');
	return head + superlativeResult;
};
});



require.define("/lib/natural/stemmers/porter_stemmer_fr.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2014, Ismaël Héry

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
 * Spec for the French Porter Stemmer can be found at:
 * http://snowball.tartarus.org/algorithms/french/stemmer.html
 */

var Stemmer = require('./stemmer_fr');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// Export
PorterStemmer.stem = stem;

// Exports for test purpose
PorterStemmer.prelude = prelude;
PorterStemmer.regions = regions;
PorterStemmer.endsinArr = endsinArr;

/**
 * Stem a word thanks to Porter Stemmer rules
 * @param  {String} token Word to be stemmed
 * @return {String}       Stemmed word
 */
function stem(token) {
  token = prelude(token.toLowerCase());

  if (token.length == 1)
    return token;

  var regs = regions(token);

  var r1_txt, r2_txt, rv_txt;
  r1_txt = token.substring(regs.r1);
  r2_txt = token.substring(regs.r2);
  rv_txt = token.substring(regs.rv);

  // Step 1
  var beforeStep1 = token;
  var suf, pref2, pref3, letterBefore, letter2Before, i;
  var doStep2a = false;

  if ((suf = endsinArr(r2_txt, ['ance', 'iqUe', 'isme', 'able', 'iste', 'eux', 'ances', 'iqUes', 'ismes', 'ables', 'istes'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(token, ['icatrice', 'icateur', 'ication', 'icatrices', 'icateurs', 'ications'])) != '') {
    if (endsinArr(r2_txt, ['icatrice', 'icateur', 'ication', 'icatrices', 'icateurs', 'ications']) != '') {
      token = token.slice(0, -suf.length); // delete
    } else {
      token = token.slice(0, -suf.length) + 'iqU'; // replace by iqU
    }
  } else if ((suf = endsinArr(r2_txt, ['atrice', 'ateur', 'ation', 'atrices', 'ateurs', 'ations'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2_txt, ['logie', 'logies'])) != '') {
    token = token.slice(0, -suf.length) + 'log'; // replace with log
  } else if ((suf = endsinArr(r2_txt, ['usion', 'ution', 'usions', 'utions'])) != '') {
    token = token.slice(0, -suf.length) + 'u'; // replace with u
  } else if ((suf = endsinArr(r2_txt, ['ence', 'ences'])) != '') {
    token = token.slice(0, -suf.length) + 'ent'; // replace with ent
  }
  // ement(s)
  else if ((suf = endsinArr(r1_txt, ['issement', 'issements'])) != '') {
    if (!isVowel(token[token.length - suf.length - 1])) {
      token = token.slice(0, -suf.length); // delete
      r1_txt = token.substring(regs.r1);
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
  } else if ((suf = endsinArr(r2_txt, ['ativement', 'ativements'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2_txt, ['ivement', 'ivements'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(token, ['eusement', 'eusements'])) != '') {
    if ((suf = endsinArr(r2_txt, ['eusement', 'eusements'])) != '')
      token = token.slice(0, -suf.length); // delete
    else if ((suf = endsinArr(r1_txt, ['eusement', 'eusements'])) != '')
      token = token.slice(0, -suf.length) + 'eux'; // replace by eux
    else if ((suf = endsinArr(rv_txt, ['ement', 'ements'])) != '')
      token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2_txt, ['ablement', 'ablements', 'iqUement', 'iqUements'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(rv_txt, ['ièrement', 'ièrements', 'Ièrement', 'Ièrements'])) != '') {
    token = token.slice(0, -suf.length) + 'i'; // replace by i
  } else if ((suf = endsinArr(rv_txt, ['ement', 'ements'])) != '') {
    token = token.slice(0, -suf.length); // delete
  }
  // ité(s)
  else if ((suf = endsinArr(token, ['icité', 'icités'])) != '') {
    if (endsinArr(r2_txt, ['icité', 'icités']) != '')
      token = token.slice(0, -suf.length); // delete
    else
      token = token.slice(0, -suf.length) + 'iqU'; // replace by iqU
  } else if ((suf = endsinArr(token, ['abilité', 'abilités'])) != '') {
    if (endsinArr(r2_txt, ['abilité', 'abilités']) != '')
      token = token.slice(0, -suf.length); // delete
    else
      token = token.slice(0, -suf.length) + 'abl'; // replace by abl
  } else if ((suf = endsinArr(r2_txt, ['ité', 'ités'])) != '') {
    token = token.slice(0, -suf.length); // delete if in R2
  } else if ((suf = endsinArr(token, ['icatif', 'icative', 'icatifs', 'icatives'])) != '') {
    if ((suf = endsinArr(r2_txt, ['icatif', 'icative', 'icatifs', 'icatives'])) != '') {
      token = token.slice(0, -suf.length); // delete
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
    if ((suf = endsinArr(r2_txt, ['atif', 'ative', 'atifs', 'atives'])) != '') {
      token = token.slice(0, -suf.length - 2) + 'iqU'; // replace with iqU
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
  } else if ((suf = endsinArr(r2_txt, ['atif', 'ative', 'atifs', 'atives'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2_txt, ['if', 'ive', 'ifs', 'ives'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(token, ['eaux'])) != '') {
    token = token.slice(0, -suf.length) + 'eau'; // replace by eau
  } else if ((suf = endsinArr(r1_txt, ['aux'])) != '') {
    token = token.slice(0, -suf.length) + 'al'; // replace by al
  } else if ((suf = endsinArr(r2_txt, ['euse', 'euses'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r1_txt, ['euse', 'euses'])) != '') {
    token = token.slice(0, -suf.length) + 'eux'; // replace by eux
  } else if ((suf = endsinArr(rv_txt, ['amment'])) != '') {
    token = token.slice(0, -suf.length) + 'ant'; // replace by ant
    doStep2a = true;
  } else if ((suf = endsinArr(rv_txt, ['emment'])) != '') {
    token = token.slice(0, -suf.length) + 'ent'; // replace by ent
    doStep2a = true;
  } else if ((suf = endsinArr(rv_txt, ['ment', 'ments'])) != '') {
    // letter before must be a vowel in RV
    letterBefore = token[token.length - suf.length - 1];
    if (isVowel(letterBefore) && endsin(rv_txt, letterBefore + suf)) {
      token = token.slice(0, -suf.length); // delete
      doStep2a = true;
    }
  }

  // re compute regions
  r1_txt = token.substring(regs.r1);
  r2_txt = token.substring(regs.r2);
  rv_txt = token.substring(regs.rv);

  // Step 2a
  var beforeStep2a = token;
  var step2aDone = false;
  if (beforeStep1 === token || doStep2a) {
    step2aDone = true;
    if ((suf = endsinArr(rv_txt, ['îmes', 'ît', 'îtes', 'i', 'ie', 'Ie', 'ies', 'ir', 'ira', 'irai', 'iraIent', 'irais', 'irait', 'iras', 'irent', 'irez', 'iriez', 'irions', 'irons', 'iront', 'is', 'issaIent', 'issais', 'issait', 'issant', 'issante', 'issantes', 'issants', 'isse', 'issent', 'isses', 'issez', 'issiez', 'issions', 'issons', 'it'])) != '') {
      letterBefore = token[token.length - suf.length - 1];
      if (!isVowel(letterBefore) && endsin(rv_txt, letterBefore + suf))
        token = token.slice(0, -suf.length); // delete
    }
  }

  // Step 2b
  if (step2aDone && token === beforeStep2a) {
    if ((suf = endsinArr(rv_txt, ['é', 'ée', 'ées', 'és', 'èrent', 'er', 'era', 'erai', 'eraIent', 'erais', 'erait', 'eras', 'erez', 'eriez', 'erions', 'erons', 'eront', 'ez', 'iez', 'Iez'])) != '') {
      token = token.slice(0, -suf.length); // delete
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    } else if ((suf = endsinArr(rv_txt, ['ions'])) != '' && endsinArr(r2_txt, ['ions'])) {
      token = token.slice(0, -suf.length); // delete
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
    // add 'Ie' suffix to pass test for 'évanouie'
    else if ((suf = endsinArr(rv_txt, ['âmes', 'ât', 'âtes', 'a', 'ai', 'aIent', 'ais', 'ait', 'ant', 'ante', 'antes', 'ants', 'as', 'asse', 'assent', 'asses', 'assiez', 'assions'])) != '') {
      token = token.slice(0, -suf.length); // delete

      letterBefore = token[token.length - 1];
      if (letterBefore === 'e' && endsin(rv_txt, 'e' + suf))
        token = token.slice(0, -1);

      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
  }

  // Step 3
  if (!(token === beforeStep1)) {
    if (token[token.length - 1] === 'Y')
      token = token.slice(0, -1) + 'i';
    if (token[token.length - 1] === 'ç')
      token = token.slice(0, -1) + 'c';
  } // Step 4
  else {
    letterBefore = token[token.length - 1];
    letter2Before = token[token.length - 2];

    if (letterBefore === 's' && ['a', 'i', 'o', 'u', 'è', 's'].indexOf(letter2Before) == -1) {
      token = token.slice(0, -1);
      r1_txt = token.substring(regs.r1);
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }

    if ((suf = endsinArr(r2_txt, ['ion'])) != '') {
      letterBefore = token[token.length - suf.length - 1];
      if (letterBefore === 's' || letterBefore === 't') {
        token = token.slice(0, -suf.length); // delete
        r1_txt = token.substring(regs.r1);
        r2_txt = token.substring(regs.r2);
        rv_txt = token.substring(regs.rv);
      }
    }

    if ((suf = endsinArr(rv_txt, ['ier', 'ière', 'Ier', 'Ière'])) != '') {
      token = token.slice(0, -suf.length) + 'i'; // replace by i
      r1_txt = token.substring(regs.r1);
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
    if ((suf = endsinArr(rv_txt, 'e')) != '') {
      token = token.slice(0, -suf.length); // delete
      r1_txt = token.substring(regs.r1);
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
    if ((suf = endsinArr(rv_txt, 'ë')) != '') {
      if (token.slice(token.length - 3, -1) === 'gu')
        token = token.slice(0, -suf.length); // delete
    }
  }

  // Step 5
  if ((suf = endsinArr(token, ['enn', 'onn', 'ett', 'ell', 'eill'])) != '') {
    token = token.slice(0, -1); // delete last letter
  }

  // Step 6
  i = token.length - 1;
  while (i > 0) {
    if (!isVowel(token[i])) {
      i--;
    } else if (i !== token.length - 1 && (token[i] === 'é' || token[i] === 'è')) {
      token = token.substring(0, i) + 'e' + token.substring(i + 1, token.length);
      break;
    } else {
      break;
    }
  }

  return token.toLowerCase();

};

/**
 * Compute r1, r2, rv regions as required by french porter stemmer algorithm
 * @param  {String} token Word to compute regions on
 * @return {Object}       Regions r1, r2, rv as offsets from the begining of the word
 */
function regions(token) {
  var r1, r2, rv, len;
  var i;

  r1 = r2 = rv = len = token.length;

  // R1 is the region after the first non-vowel following a vowel,
  for (var i = 0; i < len - 1 && r1 == len; i++) {
    if (isVowel(token[i]) && !isVowel(token[i + 1])) {
      r1 = i + 2;
    }
  }
  // Or is the null region at the end of the word if there is no such non-vowel.

  // R2 is the region after the first non-vowel following a vowel in R1
  for (i = r1; i < len - 1 && r2 == len; i++) {
    if (isVowel(token[i]) && !isVowel(token[i + 1])) {
      r2 = i + 2;
    }
  }
  // Or is the null region at the end of the word if there is no such non-vowel.

  // RV region
  var three = token.slice(0, 3);
  if (isVowel(token[0]) && isVowel(token[1])) {
    rv = 3;
  }
  if (three === 'par' || three == 'col' || three === 'tap')
    rv = 3;
  // the region after the first vowel not at the beginning of the word or null
  else {
    for (i = 1; i < len - 1 && rv == len; i++) {
      if (isVowel(token[i])) {
        rv = i + 1;
      }
    }
  }

  return {
    r1: r1,
    r2: r2,
    rv: rv
  };
};

/**
 * Pre-process/prepare words as required by french porter stemmer algorithm
 * @param  {String} token Word to be prepared
 * @return {String}       Prepared word
 */
function prelude(token) {
  token = token.toLowerCase();

  var result = '';
  var i = 0;

  // special case for i = 0 to avoid '-1' index
  if (token[i] === 'y' && isVowel(token[i + 1])) {
    result += token[i].toUpperCase();
  } else {
    result += token[i];
  }

  for (i = 1; i < token.length; i++) {
    if ((token[i] === 'u' || token[i] === 'i') && isVowel(token[i - 1]) && isVowel(token[i + 1])) {
      result += token[i].toUpperCase();
    } else if (token[i] === 'y' && (isVowel(token[i - 1]) || isVowel(token[i + 1]))) {
      result += token[i].toUpperCase();
    } else if (token[i] === 'u' && token[i - 1] === 'q') {
      result += token[i].toUpperCase();
    } else {
      result += token[i];
    }
  }

  return result;
};

/**
 * Return longest matching suffixes for a token or '' if no suffix match
 * @param  {String} token    Word to find matching suffix
 * @param  {Array} suffixes  Array of suffixes to test matching
 * @return {String}          Longest found matching suffix or ''
 */
function endsinArr(token, suffixes) {
  var i, longest = '';
  for (i = 0; i < suffixes.length; i++) {
    if (endsin(token, suffixes[i]) && suffixes[i].length > longest.length)
      longest = suffixes[i];
  }

  return longest;
};


function isVowel(letter) {
  return (letter == 'a' || letter == 'e' || letter == 'i' || letter == 'o' || letter == 'u' || letter == 'y' || letter == 'â' || letter == 'à' || letter == 'ë' ||
    letter == 'é' || letter == 'ê' || letter == 'è' || letter == 'ï' || letter == 'î' || letter == 'ô' || letter == 'û' || letter == 'ù');
};

function endsin(token, suffix) {
  if (token.length < suffix.length) return false;
  return (token.slice(-suffix.length) == suffix);
};
});

require.define("/lib/natural/stemmers/stemmer_fr.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2014, Ismaël Héry

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_fr');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_fr');

module.exports = function() {
   var stemmer = this;

   stemmer.stem = function(token) {
      return token;
   };

   stemmer.tokenizeAndStem = function(text, keepStops) {
      var stemmedTokens = [];

      new Tokenizer().tokenize(text).forEach(function(token) {
         if (keepStops || stopwords.words.indexOf(token) == -1) {
            var resultToken = token.toLowerCase();
            if (resultToken.match(/[a-zâàëéêèïîôûùç0-9]/gi)) {
               resultToken = stemmer.stem(resultToken);
            }
            stemmedTokens.push(resultToken);
         }
      });

      return stemmedTokens;
   };

   stemmer.attach = function() {
      String.prototype.stem = function() {
         return stemmer.stem(this);
      };

      String.prototype.tokenizeAndStem = function(keepStops) {
         return stemmer.tokenizeAndStem(this, keepStops);
      };
   };
}


});

require.define("/lib/natural/util/stopwords_fr.js",function(require,module,exports,__dirname,__filename,process){
/*
 Copyright (c) 2014, Ismaël Héry

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

// A list of commonly used french words that have little meaning and can be excluded
// from analysis.

var words = ['être', 'avoir', 'faire', 'a', 'au', 'aux', 'avec', 'ce', 'ces', 'dans', 'de', 'des', 'du', 
			 'elle', 'en', 'et', 'eux', 'il', 'je', 'la', 'le', 'leur', 'lui', 'ma', 'mais', 'me', 'même',
			 'mes', 'moi', 'mon', 'ne', 'nos', 'notre', 'nous', 'on', 'ou', 'où', 'par', 'pas', 'pour', 'qu',
			 'que', 'qui', 'sa', 'se', 'ses', 'son', 'sur', 'ta', 'te', 'tes', 'toi', 'ton', 'tu', 'un', 
			 'une', 'vos', 'votre', 'vous', 'c', 'd', 'j', 'l', 'à', 'm', 'n', 's', 't', 'y', 'été', 
			 'étée', 'étées', 'étés', 'étant', 'suis', 'es', 'est', 'sommes', 'êtes', 'sont', 'serai',
			 'seras', 'sera', 'serons', 'serez', 'seront', 'serais', 'serait', 'serions', 'seriez',
			 'seraient', 'étais', 'était', 'étions', 'étiez', 'étaient', 'fus', 'fut', 'fûmes', 'fûtes', 
			 'furent', 'sois', 'soit', 'soyons', 'soyez', 'soient', 'fusse', 'fusses', 'fût', 'fussions', 
			 'fussiez', 'fussent', 'ayant', 'eu', 'eue', 'eues', 'eus', 'ai', 'as', 'avons', 'avez', 'ont',
			 'aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront', 'aurais', 'aurait', 'aurions', 'auriez', 
			 'auraient', 'avais', 'avait', 'avions', 'aviez', 'avaient', 'eut', 'eûmes', 'eûtes', 'eurent', 
			 'aie', 'aies', 'ait', 'ayons', 'ayez', 'aient', 'eusse', 'eusses', 'eût', 'eussions', 'eussiez', 
			 'eussent', 'ceci', 'cela', 'cet', 'cette', 'ici', 'ils', 'les', 'leurs', 'quel', 'quels', 'quelle',
			 'quelles', 'sans', 'soi',  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
      		 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '$', '1',
        	 '2', '3', '4', '5', '6', '7', '8', '9', '0', '_', 'i', 'ii', 'iii', 'iv', 'v',
			 ];

exports.words = words;

});

require.define("/lib/natural/tokenizers/aggressive_tokenizer_fr.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/[^a-z0-9äâàéèëêïîöôùüûœç]+/i));
};

});




require.define("/lib/natural/stemmers/porter_stemmer_it.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2012, Leonardo Fenu, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_it');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;


function isVowel(letter){
	return (letter == 'a' || letter == 'e' || letter == 'i' || letter == 'o' || letter == 'u' || letter == 'à' ||
			letter == 'è' || letter == 'ì' || letter == 'ò' || letter == 'ù');
};

function getNextVowelPos(token,start){
	start = start + 1;
	var length = token.length;
	for (var i = start; i < length; i++) {
		if (isVowel(token[i])) {
			return i;
		}
	}
	return length;
};

function getNextConsonantPos(token,start){
	length=token.length
			for (var i = start; i < length; i++)
				if (!isVowel(token[i])) return i;
			return length;
};


function endsin(token, suffix) {
	if (token.length < suffix.length) return false;
	return (token.slice(-suffix.length) == suffix);
};

function endsinArr(token, suffixes) {
	for(var i=0;i<suffixes.length;i++){
		if (endsin(token, suffixes[i])) return suffixes[i];
	}
	return '';
};

function replaceAcute(token) {
	var str=token.replace(/á/gi,'à');
	str=str.replace(/é/gi,'è');
	str=str.replace(/í/gi,'ì');
	str=str.replace(/ó/gi,'ò');
	str=str.replace(/ú/gi,'ù');
	return str;
};

function vowelMarking(token) {
	function replacer(match, p1, p2, p3){
  		return p1+p2.toUpperCase()+p3;
	};	
	str=token.replace(/([aeiou])(i|u)([aeiou])/g, replacer);	
	return str;
}


// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
	
	token = token.toLowerCase();
	token = replaceAcute(token);
	token = token.replace(/qu/g,'qU');	
	token = vowelMarking(token);
	
	if (token.length<3){
		return token;
	}

	var r1 = r2 = rv = len = token.length;
	// R1 is the region after the first non-vowel following a vowel, 
	for(var i=0; i < token.length-1 && r1==len;i++){
 		if(isVowel(token[i]) && !isVowel(token[i+1]) ){
 			r1=i+2;
 		}
	}
	// Or is the null region at the end of the word if there is no such non-vowel.  

	// R2 is the region after the first non-vowel following a vowel in R1
	for(var i=r1; i< token.length-1 && r2==len;i++){
		if(isVowel(token[i]) && !isVowel(token[i+1])){
			r2=i+2;
		}
	}

	// Or is the null region at the end of the word if there is no such non-vowel. 

	// If the second letter is a consonant, RV is the region after the next following vowel, 
	
	// RV as follow

	if (len > 3) {
		if(!isVowel(token[1])) {
			// If the second letter is a consonant, RV is the region after the next following vowel
			rv = getNextVowelPos(token, 1) +1;
		} else if (isVowel(token[0]) && isVowel(token[1])) { 
			// or if the first two letters are vowels, RV is the region after the next consonant
			rv = getNextConsonantPos(token, 2) + 1;
		} else {
			//otherwise (consonant-vowel case) RV is the region after the third letter. But RV is the end of the word if these positions cannot be found.
			rv = 3;
		}
	}

	var r1_txt = token.substring(r1);
	var r2_txt = token.substring(r2);
	var rv_txt = token.substring(rv);

	var token_orig = token;

	// Step 0: Attached pronoun

	var pronoun_suf = new Array('glieli','glielo','gliene','gliela','gliele','sene','tene','cela','cele','celi','celo','cene','vela','vele','veli','velo','vene','mela','mele','meli','melo','mene','tela','tele','teli','telo','gli','ci', 'la','le','li','lo','mi','ne','si','ti','vi');	
	var pronoun_suf_pre1 = new Array('ando','endo');	
	var pronoun_suf_pre2 = new Array('ar', 'er', 'ir');
	var suf = endsinArr(token, pronoun_suf);

	if (suf!='') {
		var pre_suff1 = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre1);
		var pre_suff2 = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre2);	
		
		if (pre_suff1 != '') {
			token = token.slice(0,-suf.length);
		}
		if (pre_suff2 != '') {
			token = token.slice(0,  -suf.length)+ 'e';
		}
	}

	if (token != token_orig) {
		r1_txt = token.substring(r1);
		r2_txt = token.substring(r2);
		rv_txt = token.substring(rv);
	}

	var token_after0 = token;

	// Step 1:  Standard suffix removal
	
	if ((suf = endsinArr(r2_txt, new  Array('ativamente','abilamente','ivamente','osamente','icamente'))) != '') {
		token = token.slice(0, -suf.length);	// delete
	} else if ((suf = endsinArr(r2_txt, new  Array('icazione','icazioni','icatore','icatori','azione','azioni','atore','atori'))) != '') {
		token = token.slice(0,  -suf.length);	// delete
	} else if ((suf = endsinArr(r2_txt, new  Array('logia','logie'))) != '') {
		token = token.slice(0,  -suf.length)+ 'log'; // replace with log
	} else if ((suf =endsinArr(r2_txt, new  Array('uzione','uzioni','usione','usioni'))) != '') {
		token = token.slice(0,  -suf.length) + 'u'; // replace with u
	} else if ((suf = endsinArr(r2_txt, new  Array('enza','enze'))) != '') {
		token = token.slice(0,  -suf.length)+ 'ente'; // replace with ente
	} else if ((suf = endsinArr(rv_txt, new  Array('amento', 'amenti', 'imento', 'imenti'))) != '') {
		token = token.slice(0,  -suf.length);	// delete
	} else if ((suf = endsinArr(r1_txt, new  Array('amente'))) != '') {
		token = token.slice(0,  -suf.length); // delete
	} else if ((suf = endsinArr(r2_txt, new Array('atrice','atrici','abile','abili','ibile','ibili','mente','ante','anti','anza','anze','iche','ichi','ismo','ismi','ista','iste','isti','istà','istè','istì','ico','ici','ica','ice','oso','osi','osa','ose'))) != '') {
		token = token.slice(0,  -suf.length); // delete
	} else if ((suf = endsinArr(r2_txt, new  Array('abilità', 'icità', 'ività', 'ità'))) != '') {
		token = token.slice(0,  -suf.length); // delete
	} else if ((suf = endsinArr(r2_txt, new  Array('icativa','icativo','icativi','icative','ativa','ativo','ativi','ative','iva','ivo','ivi','ive'))) != '') {
		token = token.slice(0,  -suf.length);
	}
	
	
	if (token != token_after0) {
		r1_txt = token.substring(r1);
		r2_txt = token.substring(r2);
		rv_txt = token.substring(rv);
	}
	

	var token_after1 = token;
	
	// Step 2:  Verb suffixes

	if (token_after0 == token_after1) {
		if ((suf = endsinArr(rv_txt, new Array('erebbero','irebbero','assero','assimo','eranno','erebbe','eremmo','ereste','eresti','essero','iranno','irebbe','iremmo','ireste','iresti','iscano','iscono','issero','arono','avamo','avano','avate','eremo','erete','erono','evamo','evano','evate','iremo','irete','irono','ivamo','ivano','ivate','ammo','ando','asse','assi','emmo','enda','ende','endi','endo','erai','Yamo','iamo','immo','irai','irei','isca','isce','isci','isco','erei','uti','uto','ita','ite','iti','ito','iva','ivi','ivo','ono','uta','ute','ano','are','ata','ate','ati','ato','ava','avi','avo','erà','ere','erò','ete','eva','evi','evo','irà','ire','irò','ar','ir'))) != '') {
			token = token.slice(0, -suf.length);
		}
	}

	
	r1_txt = token.substring(r1);
	r2_txt = token.substring(r2);
	rv_txt = token.substring(rv);

	// Always do step 3. 

	if ((suf = endsinArr(rv_txt, new Array('ia', 'ie', 'ii', 'io', 'ià', 'iè','iì', 'iò','a','e','i','o','à','è','ì','ò'))) != '') {
		token = token.slice(0, -suf.length);
	} 

	r1_txt = token.substring(r1);
	r2_txt = token.substring(r2);
	rv_txt = token.substring(rv);
	
	if ((suf =endsinArr(rv_txt, new  Array('ch'))) != '') {
		token = token.slice(0,  -suf.length) + 'c'; // replace with c
	} else if ((suf =endsinArr(rv_txt, new  Array('gh'))) != '') {
		token = token.slice(0,  -suf.length) + 'g'; // replace with g
	}

	
	r1_txt = token.substring(r1);
	r2_txt = token.substring(r2);
	rv_txt = token.substring(rv);

	return token.toLowerCase();

};
});

require.define("/lib/natural/stemmers/stemmer_it.js",function(require,module,exports,__dirname,__filename,process){
var stopwords = require('../util/stopwords_it');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_it');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(/[a-zàèìòù0-9]/gi)) {
                    resultToken = stemmer.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });
        
        return stemmedTokens;
    };
    
    stemmer.tokenize = function(text, keepStops) {
    	var allTokens = [];
    	
    	new Tokenizer().tokenize(text).forEach(function(token) {
    		if (keepStops || stopwords.words.indexOf(token) == -1) {
            	var resultToken = token.toLowerCase();
           		allTokens.push(resultToken);
         	}
      	});

     	return allTokens;
    };	    

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
        
        String.prototype.tokenize = function(keepStops) {
            return stemmer.tokenize(this, keepStops);
        };
    };
    

}
});

require.define("/lib/natural/util/stopwords_it.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, David Przybilla, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    'ad','al','allo','ai','agli','all','agl','alla','alle','con','col','coi','da','dal','dallo',
    'dai','dagli','dall','dagl','dalla','dalle','di','del','dello','dei','degli','dell','degl',
    'della','delle','in','nel','nello','nei','negli','nell','negl','nella','nelle','su','sul',
    'sullo','sui','sugli','sull','sugl','sulla','sulle','per','tra','contro','io','tu','lui',
    'lei','noi','voi','loro','mio','mia','miei','mie','tuo','tua','tuoi','tue','suo','sua','suoi',
    'sue','nostro','nostra','nostri','nostre','vostro','vostra','vostri','vostre','mi','ti','ci',
    'vi','lo','la','li','le','gli','ne','il','un','uno','una','ma','ed','se','perché','anche','come',
    'dov','dove','che','chi','cui','non','più','quale','quanto','quanti','quanta','quante','quello',
    'quelli','quella','quelle','questo','questi','questa','queste','si','tutto','tutti','a','c','e',
    'i','l','o','ho','hai','ha','abbiamo','avete','hanno','abbia','abbiate','abbiano','avrò','avrai',
    'avrà','avremo','avrete','avranno','avrei','avresti','avrebbe','avremmo','avreste','avrebbero',
    'avevo','avevi','aveva','avevamo','avevate','avevano','ebbi','avesti','ebbe','avemmo','aveste',
    'ebbero','avessi','avesse','avessimo','avessero','avendo','avuto','avuta','avuti','avute','sono',
    'sei','è','siamo','siete','sia','siate','siano','sarò','sarai','sarà','saremo','sarete','saranno',
    'sarei','saresti','sarebbe','saremmo','sareste','sarebbero','ero','eri','era','eravamo','eravate',
    'erano','fui','fosti','fu','fummo','foste','furono','fossi','fosse','fossimo','fossero','essendo',
    'faccio','fai','facciamo','fanno','faccia','facciate','facciano','farò','farai','farà','faremo',
    'farete','faranno','farei','faresti','farebbe','faremmo','fareste','farebbero','facevo','facevi',
    'faceva','facevamo','facevate','facevano','feci','facesti','fece','facemmo','faceste','fecero',
    'facessi','facesse','facessimo','facessero','facendo','sto','stai','sta','stiamo','stanno','stia',
    'stiate','stiano','starò','starai','starà','staremo','starete','staranno','starei','staresti',
    'starebbe','staremmo','stareste','starebbero','stavo','stavi','stava','stavamo','stavate','stavano',
    'stetti','stesti','stette','stemmo','steste','stettero','stessi','stesse','stessimo','stessero','stando',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n','o', 'p', 'q', 'r', 's', 't', 'u', 
    'v', 'w', 'x', 'y', 'z', '$', '1','2', '3', '4', '5', '6', '7', '8', '9', '0', '_', 'i', 'ii', 'iii', 'iv', 'v'];
    
// tell the world about the noise words.    
exports.words = words;

});

require.define("/lib/natural/tokenizers/aggressive_tokenizer_it.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, Chris Umbel,David Przybilla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/\W+/));
};

});


require.define("/lib/natural/stemmers/porter_stemmer_es.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2012, David Przybilla, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_es');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;


function isVowel(letter){
	return (letter == 'a' || letter == 'e' || letter == 'i' || letter == 'o' || letter == 'u' || letter == 'á' || letter == 'é' ||
			letter == 'í' || letter == 'ó' || letter == 'ú');
};

function getNextVowelPos(token,start){
	length=token.length
			for (var i = start; i < length; i++)
				if (isVowel(token[i])) return i;
			return length;
};

function getNextConsonantPos(token,start){
	length=token.length
			for (var i = start; i < length; i++)
				if (!isVowel(token[i])) return i;
			return length;
};


function endsin(token, suffix) {
	if (token.length < suffix.length) return false;
	return (token.slice(-suffix.length) == suffix);
};

function endsinArr(token, suffixes) {
	for(var i=0;i<suffixes.length;i++){
		if (endsin(token, suffixes[i])) return suffixes[i];
	}
	return '';
};

function removeAccent(token) {
	var str=token.replace(/á/gi,'a');
	str=str.replace(/é/gi,'e');
	str=str.replace(/í/gi,'i');
	str=str.replace(/ó/gi,'o');
	str=str.replace(/ú/gi,'u');
	return str;
};

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
	token = token.toLowerCase();

	if (token.length<3){
		return token;
	}

	var r1,r2,rv,len= token.length;
	//looking for regions after vowels

	for(var i=0; i< token.length-1 && r1==len;i++){
 		if(isVowel(token[i]) && !isVowel(token[i+1]) ){
 			r1=i+2;
 		}

	}

	for(var i=r1; i< token.length-1 && r2==len;i++){
		if(isVowel(token[i]) && !isVowel(token[i+1])){
			r2=i+2;
		}
	}

	if (len > 3) {
			if(isVowel(token[1])) {
				// If the second letter is a consonant, RV is the region after the next following vowel
				rv = getNextVowelPos(token, 2) +1;
			} else if (isVowel(token[0]) && isVowel(token[1])) {
				// or if the first two letters are vowels, RV is the region after the next consonant
				rv = getNextConsonantPos(token, 2) + 1;
			} else {
				//otherwise (consonant-vowel case) RV is the region after the third letter. But RV is the end of the word if these positions cannot be found.
				rv = 3;
			}
		}

	var r1_txt = token.substring(r1-1);
	var r2_txt = token.substring(r2-1);
	var rv_txt = token.substring(rv-1);


	var token_orig = token;

	// Step 0: Attached pronoun
	var pronoun_suf = new Array('me', 'se', 'sela', 'selo', 'selas', 'selos', 'la', 'le', 'lo', 'las', 'les', 'los', 'nos');
	var pronoun_suf_pre1 = new Array('éndo', 'ándo', 'ár', 'ér', 'ír');
	var pronoun_suf_pre2 = new Array('ando', 'iendo', 'ar', 'er', 'ir');
	var suf = endsinArr(token, pronoun_suf);


	if (suf!='') {

		var pre_suff = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre1);

		if (pre_suff != '') {

				token = removeAccent(token.slice(0,-suf.length));
		} else {
			var pre_suff = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre2);

			if (pre_suff != '' ||
				(endsin(token, 'yendo' ) &&
				(token.slice(-suf.length-6,1) == 'u'))) {
				token = token.slice(0,-suf.length);
			}
		}
	}

		if (token != token_orig) {
			r1_txt = token.substring(r1-1);
			r2_txt = token.substring(r2-1);
			rv_txt = token.substring(rv-1);
		}
		var token_after0 = token;

		if ((suf = endsinArr(r2_txt, new Array('anza', 'anzas', 'ico', 'ica', 'icos', 'icas', 'ismo', 'ismos', 'able', 'ables', 'ible', 'ibles', 'ista', 'istas', 'oso', 'osa', 'osos', 'osas', 'amiento', 'amientos', 'imiento', 'imientos'))) != '') {
			token = token.slice(0, -suf.length);
		} else if ((suf = endsinArr(r2_txt, new  Array('icadora', 'icador', 'icación', 'icadoras', 'icadores', 'icaciones', 'icante', 'icantes', 'icancia', 'icancias', 'adora', 'ador', 'ación', 'adoras', 'adores', 'aciones', 'ante', 'antes', 'ancia', 'ancias'))) != '') {
			token = token.slice(0,  -suf.length);
		} else if ((suf = endsinArr(r2_txt, new  Array('logía', 'logías'))) != '') {
			token = token.slice(0,  -suf.length)+ 'log';
		} else if ((suf =endsinArr(r2_txt, new  Array('ución', 'uciones'))) != '') {
			token = token.slice(0,  -suf.length) + 'u';
		} else if ((suf = endsinArr(r2_txt, new  Array('encia', 'encias'))) != '') {
			token = token.slice(0,  -suf.length)+ 'ente';
		} else if ((suf = endsinArr(r2_txt, new  Array('ativamente', 'ivamente', 'osamente', 'icamente', 'adamente'))) != '') {
			token = token.slice(0,  -suf.length);
		} else if ((suf = endsinArr(r1_txt, new  Array('amente'))) != '') {
			token = token.slice(0,  -suf.length);
		} else if ((suf = endsinArr(r2_txt, new  Array('antemente', 'ablemente', 'iblemente', 'mente'))) != '') {
			token = token.slice(0,  -suf.length);
		} else if ((suf = endsinArr(r2_txt, new  Array('abilidad', 'abilidades', 'icidad', 'icidades', 'ividad', 'ividades', 'idad', 'idades'))) != '') {
			token = token.slice(0,  -suf.length);
		} else if ((suf = endsinArr(r2_txt, new  Array('ativa', 'ativo', 'ativas', 'ativos', 'iva', 'ivo', 'ivas', 'ivos'))) != '') {
			token = token.slice(0,  -suf.length);
		}

		if (token != token_after0) {
			r1_txt = token.substring(r1-1);
			r2_txt = token.substring(r2-1);
			rv_txt = token.substring(rv-1);
		}
		var token_after1 = token;

		if (token_after0 == token_after1) {
			// Do step 2a if no ending was removed by step 1.
			if ((suf = endsinArr(rv_txt, new Array('ya', 'ye', 'yan', 'yen', 'yeron', 'yendo', 'yo', 'yó', 'yas', 'yes', 'yais', 'yamos'))) != '' && (token.substring(suf.length-1,1) == 'u')) {
				token = token.slice(0, -suf.length);
			}

			if (token != token_after1) {
				r1_txt = token.substring(r1-1);
				r2_txt = token.substring(r2-1);
				rv_txt = token.substring(rv-1);
			}
			var token_after2a = token;

			// Do Step 2b if step 2a was done, but failed to remove a suffix.
			if (token_after2a == token_after1) {

				if ((suf = endsinArr(rv_txt,new Array('en', 'es', 'éis', 'emos'))) != '') {
					token = token.slice(0,-suf.length);
					if (endsin(token, 'gu')) {
						token = token.slice(0,-1);
					}
				} else if ((suf = endsinArr(rv_txt, new Array('arían', 'arías', 'arán', 'arás', 'aríais', 'aría', 'aréis', 'aríamos', 'aremos', 'ará', 'aré', 'erían', 'erías', 'erán', 'erás', 'eríais', 'ería', 'eréis', 'eríamos', 'eremos', 'erá', 'eré', 'irían', 'irías', 'irán', 'irás', 'iríais', 'iría', 'iréis', 'iríamos', 'iremos', 'irá', 'iré', 'aba', 'ada', 'ida', 'ía', 'ara', 'iera', 'ad', 'ed', 'id', 'ase', 'iese', 'aste', 'iste', 'an', 'aban', 'ían', 'aran', 'ieran', 'asen', 'iesen', 'aron', 'ieron', 'ado', 'ido', 'ando', 'iendo', 'ió', 'ar', 'er', 'ir', 'as', 'abas', 'adas', 'idas', 'ías', 'aras', 'ieras', 'ases', 'ieses', 'ís', 'áis', 'abais', 'íais', 'arais', 'ierais', '  aseis', 'ieseis', 'asteis', 'isteis', 'ados', 'idos', 'amos', 'ábamos', 'íamos', 'imos', 'áramos', 'iéramos', 'iésemos', 'ásemos'))) != '') {

					token = token.slice(0, -suf.length);

				}
			}
		}

		// Always do step 3.
		r1_txt = token.substring(r1-1);
		r2_txt = token.substring(r2-1);
		rv_txt = token.substring(rv-1);

		if ((suf = endsinArr(rv_txt, new Array('os', 'a', 'o', 'á', 'í', 'ó'))) != '') {
			token = token.slice(0, -suf.length);
		} else if ((suf = endsinArr(rv_txt ,new Array('e','é'))) != '') {
			token = token.slice(0,-1);
			rv_txt = token.substring(rv-1);
			if (endsin(rv_txt,'u') && endsin(token,'gu')) {
				token = token.slice(0,-1);
			}
		}

		return removeAccent(token);

};

});
require.define("/lib/natural/stemmers/stemmer_es.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2012, David Przybilla, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_es');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_es');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(new RegExp('[a-záéíóúüñ0-9]+', 'gi'))) {
                    resultToken = stemmer.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });
        
        return stemmedTokens;
    };
  
   	stemmer.tokenize = function(text, keepStops) {
    	var allTokens = [];
    	
    	new Tokenizer().tokenize(text).forEach(function(token) {
    		if (keepStops || stopwords.words.indexOf(token) == -1) {
            	var resultToken = token.toLowerCase();
           		allTokens.push(resultToken);
         	}
      	});

     	return allTokens;
    };	

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
        
        String.prototype.tokenize = function(keepStops) {
            return stemmer.tokenize(this, keepStops);
        };
    };
}

});

require.define("/lib/natural/util/stopwords_es.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, David Przybilla, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    'a','un','el','ella','y','sobre','de','la','que','en',
    'los','del','se','las','por','un','para','con','no',
    'una','su','al','lo','como','más','pero','sus','le',
    'ya','o','porque','cuando','muy','sin','sobre','también',
    'me','hasta','donde','quien','desde','nos','durante','uno',
    'ni','contra','ese','eso','mí','qué','otro','él','cual',
    'poco','mi','tú','te','ti','sí','a', 'b', 'c', 'd', 'e',
    'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 
    'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '$', 
    '1','2', '3', '4', '5', '6', '7', '8', '9', '0', '_', 
    'i', 'ii', 'iii', 'iv', 'v'];
    
// tell the world about the noise words.    
exports.words = words;

});

require.define("/lib/natural/tokenizers/aggressive_tokenizer_es.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, Chris Umbel,David Przybilla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/[^a-zA-Zá-úÁ-ÚñÑüÜ]+/));
};

});


require.define("/lib/natural/stemmers/porter_stemmer_fa.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, Chris Umbel
Farsi Porter Stemmer by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_fa');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// disabled stemming for Farsi
// Farsi stemming will be supported soon
PorterStemmer.stem = function(token) {
    return token;
};
});
require.define("/lib/natural/stemmers/stemmer_fa.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, Chris Umbel
Farsi Stemmer by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_fa');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_fa');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if(keepStops || stopwords.words.indexOf(token) == -1)
                stemmedTokens.push(stemmer.stem(token));
        });
        
        return stemmedTokens;
    };
    
    stemmer.tokenize = function(text, keepStops) {
    	var allTokens = [];
    	
    	new Tokenizer().tokenize(text).forEach(function(token) {
    		if (keepStops || stopwords.words.indexOf(token) == -1) {
            	var resultToken = token.toLowerCase();
           		allTokens.push(resultToken);
         	}
      	});

     	return allTokens;
    };	    

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
        
		String.prototype.tokenize = function(keepStops) {
            return stemmer.tokenize(this, keepStops);
        };        
    };
}

});

require.define("/lib/natural/util/stopwords_fa.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, Chris Umbel
Farsi Stop Words by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    // Words
    'از', 'با', 'یه', 'برای', 'و', 'باید', 'شاید',

    // Symbols
    '؟', '!', '٪', '.', '،', '؛', ':', ';', ',',
    
    // Numbers
    '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '۰'
];
    
// tell the world about the noise words.    
exports.words = words;

});

require.define("/lib/natural/tokenizers/aggressive_tokenizer_fa.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, Chris Umbel
Farsi Aggressive Tokenizer by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.clearEmptyString = function(array) {
	return array.filter(function(a) {
		return a != '';
	});
};

AggressiveTokenizer.prototype.clearText = function(text) {
	return text.replace(new RegExp('\.\:\+\-\=\(\)\"\'\!\?\،\,\؛\;', 'g'), ' ');
};

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    text = this.clearText(text);
    return this.clearEmptyString(text.split(/\s+/));
};

});


require.define("/lib/natural/stemmers/porter_stemmer_no.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2014, Kristoffer Brabrand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_no');

// Get the part of the token after the first non-vowel following a vowel
function getR1(token) {
    var match = token.match(/[aeiouyæåø]{1}[^aeiouyæåø]([A-Za-z0-9_æøåÆØÅäÄöÖüÜ]+)/);

    if (match) {
        var preR1Length = match.index + 2;

        if (preR1Length < 3 && preR1Length > 0) {
            return token.slice(3);
        } else if (preR1Length >= 3) {
            return match[1];
        } else {
            return token;
        }
    }

    return null;
}

function step1(token) {
    // Perform step 1a-c
    var step1aResult = step1a(token),
        step1bResult = step1b(token),
        step1cResult = step1c(token);

    // Returne the shortest result string (from 1a, 1b and 1c)
    if (step1aResult.length < step1bResult.length) {
        return (step1aResult.length < step1cResult.length) ? step1aResult : step1cResult;
    } else {
        return (step1bResult.length < step1cResult.length) ? step1bResult : step1cResult;
    }
}

// step 1a as defined for the porter stemmer algorithm.
function step1a(token) {
    var r1 = getR1(token);

    if (!r1) {
        return token;
    }

    var r1Match = r1.match(/(a|e|ede|ande|ende|ane|ene|hetene|en|heten|ar|er|heter|as|es|edes|endes|enes|hetenes|ens|hetens|ers|ets|et|het|ast)$/);

    if (r1Match) {
        return token.replace(new RegExp(r1Match[1] + '$'), '');
    }

    return token;
}

// step 1b as defined for the porter stemmer algorithm.
function step1b(token) {
    var r1 = getR1(token);

    if (!r1) {
        return token;
    }

    if (token.match(/(b|c|d|f|g|h|j|l|m|n|o|p|r|t|v|y|z)s$/)) {
        return token.slice(0, -1);
    }

    if (token.match(/([^aeiouyæåø]k)s$/)) {
        return token.slice(0, -1);
    }

    return token;
}

// step 1c as defined for the porter stemmer algorithm.
function step1c(token) {
    var r1 = getR1(token);

    if (!r1) {
        return token;
    }

    if (r1.match(/(erte|ert)$/)) {
        return token.replace(/(erte|ert)$/, 'er');
    }

    return token;
}

// step 2 as defined for the porter stemmer algorithm.
function step2(token) {
    var r1 = getR1(token);

    if (!r1) {
        return token;
    }

    if (r1.match(/(d|v)t$/)) {
        return token.slice(0, -1);
    }

    return token;
}

// step 3 as defined for the porter stemmer algorithm.
function step3(token) {
    var r1 = getR1(token);

    if (!r1)
        return token;

    var r1Match = r1.match(/(leg|eleg|ig|eig|lig|elig|els|lov|elov|slov|hetslov)$/);

    if (r1Match) {
        return token.replace(new RegExp(r1Match[1] + '$'), '');
    }

    return token;
}

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
    return step3(step2(step1(token.toLowerCase()))).toString();
};

//exports for tests
PorterStemmer.getR1  = getR1;
PorterStemmer.step1  = step1;
PorterStemmer.step1a = step1a;
PorterStemmer.step1b = step1b;
PorterStemmer.step1c = step1c;
PorterStemmer.step2  = step2;
PorterStemmer.step3  = step3;
});

require.define("/lib/natural/stemmers/stemmer_no.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2014, Kristoffer Brabrand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_no');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_no');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.addStopWord = function(stopWord) {
        stopwords.words.push(stopWord);
    };

    stemmer.addStopWords = function(moreStopWords) {
        stopwords.words = stopwords.words.concat(moreStopWords);
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];

        new Tokenizer().tokenize(text).forEach(function(token) {
            if(keepStops || stopwords.words.indexOf(token.toLowerCase()) == -1)
                stemmedTokens.push(stemmer.stem(token));
        });

        return stemmedTokens;
    };
 
 
    stemmer.tokenize = function(text, keepStops) {
    	var allTokens = [];
    	
    	new Tokenizer().tokenize(text).forEach(function(token) {
    		if (keepStops || stopwords.words.indexOf(token) == -1) {
            	var resultToken = token.toLowerCase();
           		allTokens.push(resultToken);
         	}
      	});

     	return allTokens;
    };	
       
    

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };

        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
        
		String.prototype.tokenize = function(keepStops) {
            return stemmer.tokenize(this, keepStops);
        };        
    };
}

});

require.define("/lib/natural/util/stopwords_no.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2014, Kristoffer Brabrand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [
    'og','i','jeg','det','at','en','et','den','til','er','som',
    'på','de','med','han','av','ikke','der','så','var','meg',
    'seg','men','ett','har','om','vi','min','mitt','ha','hadde',
    'hun','nå','over','da','ved','fra','du','ut','sin','dem',
    'oss','opp','man','kan','hans','hvor','eller','hva','skal',
    'selv','sjøl','her','alle','vil','bli','ble','blitt','kunne',
    'inn','når','være','kom','noen','noe','ville','dere','som',
    'deres','kun','ja','etter','ned','skulle','denne','for','deg',
    'si','sine','sitt','mot','å','meget','hvorfor','dette','disse',
    'uten','hvordan','ingen','din','ditt','blir','samme','hvilken',
    'hvilke','sånn','inni','mellom','vår','hver','hvem','vors',
    'hvis','både','bare','enn','fordi','før','mange','også','slik',
    'vært','være','begge','siden','henne','hennar','hennes',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '$', '1',
    '2', '3', '4', '5', '6', '7', '8', '9', '0', '_', 'i', 'ii', 'iii', 'iv', 'v'];

// tell the world about the noise words.
exports.words = words;
});


require.define("/lib/natural/normalizers/normalizer_no.js",function(require,module,exports,__dirname,__filename,process){
	/*
 Copyright (c) 2014, Kristoffer Brabrand

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * Remove commonly used diacritic marks from a string as these
 * are not used in a consistent manner. Leave only ä, ö, ü.
 */
var remove_diacritics = function(text) {
    text = text.replace('à', 'a');
    text = text.replace('À', 'A');
    text = text.replace('á', 'a');
    text = text.replace('Á', 'A');
    text = text.replace('â', 'a');
    text = text.replace('Â', 'A');
    text = text.replace('ç', 'c');
    text = text.replace('Ç', 'C');
    text = text.replace('è', 'e');
    text = text.replace('È', 'E');
    text = text.replace('é', 'e');
    text = text.replace('É', 'E');
    text = text.replace('ê', 'e');
    text = text.replace('Ê', 'E');
    text = text.replace('î', 'i');
    text = text.replace('Î', 'I');
    text = text.replace('ñ', 'n');
    text = text.replace('Ñ', 'N');
    text = text.replace('ó', 'o');
    text = text.replace('Ó', 'O');
    text = text.replace('ô', 'o');
    text = text.replace('Ô', 'O');
    text = text.replace('û', 'u');
    text = text.replace('Û', 'U');
    text = text.replace('š', 's');
    text = text.replace('Š', 'S');

    return text;
};

// export the relevant stuff.
exports.remove_diacritics = remove_diacritics;
})

require.define("/lib/natural/tokenizers/aggressive_tokenizer_no.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2014, Kristoffer Brabrand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    normalizer = require('../normalizers/normalizer_no'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    text = normalizer.remove_diacritics(text);

    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/[^A-Za-z0-9_æøåÆØÅäÄöÖüÜ]+/));
};

});




require.define("/lib/natural/stemmers/porter_stemmer_pt.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2015, Luís Rodrigues

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module.exports = (function () {
  'use strict';

  var Stemmer     = require('./stemmer_pt'),
    Token         = require('./token'),
    PorterStemmer = new Stemmer();

  /**
   * Marks a region after the first non-vowel following a vowel, or the
   * null region at the end of the word if there is no such non-vowel.
   *
   * @param {Object} token Token to stem.
   * @param {Number} start Start index (defaults to 0).
   * @param {Number}       Region start index.
   */
   var markRegionN = function (start) {
    var index = start || 0,
      length = this.string.length,
      region = length;

    while (index < length - 1 && region === length) {
      if (this.hasVowelAtIndex(index) && !this.hasVowelAtIndex(index + 1)) {
        region = index + 2;
      }
      index++;
    }

    return region;
  };

  /**
   * Mark RV.
   *
   * @param  {Object} token Token to stem.
   * @return {Number}       Region start index.
   */
  var markRegionV = function () {
    var rv = this.string.length;

    if (rv > 3) {
      if (!this.hasVowelAtIndex(1)) {
        rv = this.nextVowelIndex(2) + 1;

      } else if (this.hasVowelAtIndex(0) && this.hasVowelAtIndex(1)) {
        rv = this.nextConsonantIndex(2) + 1;

      } else {
        rv = 3;
      }
    }

    return rv;
  };

  /**
   * Prelude.
   *
   * Nasalised vowel forms should be treated as a vowel followed by a consonant.
   *
   * @param  {String} token Word to stem.
   * @return {String}       Stemmed token.
   */
  function prelude (token) {
    return token
    .replaceAll('ã', 'a~')
    .replaceAll('õ', 'o~');
  }

  /**
   * Step 1: Standard suffix removal.
   *
   * This step should always be performed.
   *
   * @param  {Token} token Word to stem.
   * @return {Token}       Stemmed token.
   */
  function standardSuffix (token) {

    token.replaceSuffixInRegion([
      'amentos', 'imentos', 'aço~es', 'adoras', 'adores', 'amento', 'imento',

      'aça~o', 'adora', 'ância', 'antes', 'ismos', 'istas',

      'ador', 'ante', 'ável', 'ezas', 'icas', 'icos', 'ismo', 'ista', 'ível',
      'osas', 'osos',

      'eza', 'ica', 'ico', 'osa', 'oso'

      ], '', 'r2');

    token.replaceSuffixInRegion(['logias', 'logia'], 'log', 'r2');

    // token.replaceSuffixInRegion(['uço~es', 'uça~o'], 'u', 'r1');

    token.replaceSuffixInRegion(['ências', 'ência'], 'ente', 'r2');

    token.replaceSuffixInRegion([
      'ativamente', 'icamente', 'ivamente', 'osamente', 'adamente'
    ], '', 'r2');

    token.replaceSuffixInRegion('amente', '', 'r1');

    token.replaceSuffixInRegion([
      'antemente', 'avelmente', 'ivelmente', 'mente'
    ], '', 'r2');

    token.replaceSuffixInRegion([
      'abilidades', 'abilidade',
      'icidades', 'icidade',
      'ividades', 'ividade',
      'idades', 'idade'
    ], '', 'r2');

    token.replaceSuffixInRegion([
      'ativas', 'ativos', 'ativa', 'ativo',
      'ivas', 'ivos', 'iva', 'ivo'
    ], '', 'r2');

    if (token.hasSuffix('eiras') || token.hasSuffix('eira')) {
      token.replaceSuffixInRegion(['iras', 'ira'], 'ir', 'rv');
    }

    return token;
  }

  /**
   * Step 2: Verb suffix removal.
   *
   * Perform this step if no ending was removed in step 1.
   *
   * @param  {Token} token   Token to stem.
   * @return {Token}         Stemmed token.
   */
  function verbSuffix (token) {

    token.replaceSuffixInRegion([
      'aríamos', 'ássemos', 'eríamos', 'êssemos', 'iríamos', 'íssemos',

      'áramos', 'aremos', 'aríeis', 'ásseis', 'ávamos', 'éramos', 'eremos',
      'eríeis', 'ésseis', 'íramos', 'iremos', 'iríeis', 'ísseis',

      'ara~o', 'ardes', 'areis', 'áreis', 'ariam', 'arias', 'armos', 'assem',
      'asses', 'astes', 'áveis', 'era~o', 'erdes', 'ereis', 'éreis', 'eriam',
      'erias', 'ermos', 'essem', 'esses', 'estes', 'íamos', 'ira~o', 'irdes',
      'ireis', 'íreis', 'iriam', 'irias', 'irmos', 'issem', 'isses', 'istes',

      'adas', 'ados', 'amos', 'ámos', 'ando', 'aram', 'aras', 'arás', 'arei',
      'arem', 'ares', 'aria', 'asse', 'aste', 'avam', 'avas', 'emos', 'endo',
      'eram', 'eras', 'erás', 'erei', 'erem', 'eres', 'eria', 'esse', 'este',
      'idas', 'idos', 'íeis', 'imos', 'indo', 'iram', 'iras', 'irás', 'irei',
      'irem', 'ires', 'iria', 'isse', 'iste',

      'ada', 'ado', 'ais', 'ara', 'ará', 'ava', 'eis', 'era', 'erá', 'iam',
      'ias', 'ida', 'ido', 'ira', 'irá',

      'am', 'ar', 'as', 'ei', 'em', 'er', 'es', 'eu', 'ia', 'ir', 'is', 'iu', 'ou'

    ], '', 'rv');

    return token;
  }

  /**
   * Step 3: Delete suffix i.
   *
   * Perform this step if the word was changed, in RV and preceded by c.
   *
   * @param  {Token} token   Token to stem.
   * @return {Token}         Stemmed token.
   */
  function iPrecededByCSuffix (token) {

    if (token.hasSuffix('ci')) {
      token.replaceSuffixInRegion('i', '', 'rv');
    }

    return token;
  }

  /**
   * Step 4: Residual suffix.
   *
   * Perform this step if steps 1 and 2 did not alter the word.
   *
   * @param  {Token} token Token to stem.
   * @return {Token}       Stemmed token.
   */
  function residualSuffix (token) {

    token.replaceSuffixInRegion(['os', 'a', 'i', 'o', 'á', 'í', 'ó'], '', 'rv');

    return token;
  }

  /**
   * Step 5: Residual form.
   *
   * This step should always be performed.
   *
   * @param  {Token} token Token to stem.
   * @return {Token}       Stemmed token.
   */
  function residualForm (token) {

    var tokenString = token.string;

    if (token.hasSuffix('gue') || token.hasSuffix('gué') || token.hasSuffix('guê')) {
      token.replaceSuffixInRegion(['ue', 'ué', 'uê'], '', 'rv');
    }

    if (token.hasSuffix('cie') || token.hasSuffix('cié') || token.hasSuffix('ciê')) {
      token.replaceSuffixInRegion(['ie', 'ié', 'iê'], '', 'rv');
    }

    if (tokenString === token.string) {
      token.replaceSuffixInRegion(['e', 'é', 'ê'], '', 'rv');
    }

    token.replaceSuffixInRegion('ç', 'c', 'all');

    return token;
  }

  /**
   * Postlude.
   *
   * Turns a~, o~ back into ã, õ.
   *
   * @param  {String} token Word to stem.
   * @return {String}       Stemmed token.
   */
  function postlude (token) {
    return token
      .replaceAll('a~', 'ã')
      .replaceAll('o~', 'õ');
  }

  /**
   * Stems a word using a Porter stemmer algorithm.
   *
   * @param  {String} word Word to stem.
   * @return {String}      Stemmed token.
   */
  PorterStemmer.stem = function (word) {
    var token = new Token(word.toLowerCase()),
      original;

    token = prelude(token);

    token.usingVowels('aeiouáéíóúâêôàãõ')
      .markRegion('all', 0)
      .markRegion('r1', null, markRegionN)
      .markRegion('r2', token.regions.r1, markRegionN)
      .markRegion('rv', null, markRegionV);

    original = token.string;

    // Always do step 1.
    token = standardSuffix(token);

    // Do step 2 if no ending was removed by step 1.
    if (token.string === original) {
      token = verbSuffix(token);
    }

    // If the last step to be obeyed — either step 1 or 2 — altered the word,
    // do step 3. Alternatively, if neither steps 1 nor 2 altered the word, do
    // step 4.
    token = token.string !== original ? iPrecededByCSuffix(token) : residualSuffix(token);

    // Always do step 5.
    token = residualForm(token);

    token = postlude(token);

    return token.string;
  };

  return PorterStemmer;
})();

});


require.define("/lib/natural/stemmers/stemmer_pt.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2014, Ismaël Héry

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module.exports = function () {
  'use strict';

  var Stemmer = this,
    stopwords = require('../util/stopwords_pt'),
    Tokenizer = require('../tokenizers/aggressive_tokenizer_pt');

  Stemmer.stem = function (token) {
    return token;
  };

  Stemmer.addStopWords = function (word) {
    stopwords.words.push(word);
  };

  Stemmer.addStopWords = function (words) {
    stopwords.words = stopwords.words.concat(words);
  };

  Stemmer.tokenizeAndStem = function(text, keepStops) {
    var stemmedTokens = [];

    var tokenStemmer = function (token) {
      if (keepStops || stopwords.words.indexOf(token.toLowerCase()) === -1) {
        stemmedTokens.push(Stemmer.stem(token));
      }
    };

    new Tokenizer().tokenize(text).forEach(tokenStemmer);

    return stemmedTokens;
  };

  Stemmer.attach = function () {
    String.prototype.stem = function () {
      return Stemmer.stem(this);
    };

    String.prototype.tokenizeAndStem = function (keepStops) {
      return Stemmer.tokenizeAndStem(this, keepStops);
    };
  };
};

});

require.define("/lib/natural/util/stopwords_pt.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, Luís Rodrigues

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = ['a', 'à', 'ao', 'aos', 'aquela', 'aquelas', 'aquele', 'aqueles', 'aquilo', 'as', 'às', 'até', 
			'com', 'como', 'da', 'das', 'de', 'dela', 'delas', 'dele', 'deles', 'depois', 'do', 'dos', 'e',
			'ela', 'elas', 'ele', 'eles', 'em', 'entre', 'essa', 'essas', 'esse', 'esses', 'esta', 'estas',
			'este', 'estes', 'eu', 'isso', 'isto', 'já', 'lhe', 'lhes', 'mais', 'mas', 'me', 'mesmo', 'meu', 
			'meus', 'minha', 'minhas', 'muito', 'muitos', 'na', 'não', 'nas', 'nem', 'no', 'nos', 'nós', 'nossa', 
			'nossas', 'nosso', 'nossos', 'num', 'nuns', 'numa', 'numas', 'o', 'os', 'ou', 'para', 'pela', 'pelas', 
			'pelo', 'pelos', 'por', 'quais', 'qual', 'quando', 'que', 'quem', 'se', 'sem', 'seu', 'seus', 'só', 'sua',
			'suas', 'também', 'te', 'teu', 'teus', 'tu', 'tua', 'tuas', 'um', 'uma', 'umas', 'você', 'vocês', 'vos', 
			'vosso', 'vossos', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q',
			'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '$', '1','2', '3', '4', '5', '6', '7', '8', '9', '0', '_', 
			'i', 'ii', 'iii', 'iv', 'v'];
// tell the world about the noise words.
exports.words = words;

});

require.define("/lib/natural/tokenizers/aggressive_tokenizer_pt.js",function(require,module,exports,__dirname,__filename,process){
/*
Copyright (c) 2011, Chris Umbel,David Przybilla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.withoutEmpty = function(array) {
	return array.filter(function(a) {return a;});
};

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.withoutEmpty(this.trim(text.split(/[^a-zA-Zà-úÀ-Ú]/)));
};

});


require.define("/lib/natural/stemmers/porter_stemmer_gr.js",function(require,module,exports,__dirname,__filename,process){
/*
 *  adapted by using Joder Illi, Snowball mailing list implm
 *  https://gist.github.com/marians/942312
 */

var Stemmer = require('./stemmer_gr');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// Export
PorterStemmer.stem = stem;

/**
 * Stem a word thanks to Porter Stemmer rules
 * @param  {String} token Word to be stemmed
 * @return {String}       Stemmed word
 */
function stem(word) {
  	/*
	Put u and y between vowels into upper case
	*/
	word = word.replace(/([aeiouyäöü])u([aeiouyäöü])/g, '$1U$2');
	word = word.replace(/([aeiouyäöü])y([aeiouyäöü])/g, '$1Y$2');
	
	/*
	and then do the following mappings,
	(a) replace ß with ss,
	(a) replace ae with ä, Not doing these,
	have trouble with diphtongs
	(a) replace oe with ö, Not doing these,
	have trouble with diphtongs
	(a) replace ue with ü unless preceded by q. Not doing these,
	have trouble with diphtongs
	So in quelle, ue is not mapped to ü because it follows q, and in
	feuer it is not mapped because the first part of the rule changes it to
	feUer, so the u is not found.
	*/
	word = word.replace(/ß/g, 'ss');
	//word = word.replace(/ae/g, 'ä');
	//word = word.replace(/oe/g, 'ö');
	//word = word.replace(/([^q])ue/g, '$1ü');
	
	/*
	R1 and R2 are first set up in the standard way (see the note on R1
	and R2), but then R1 is adjusted so that the region before it contains at
	least 3 letters.
	R1 is the region after the first non-vowel following a vowel, or is
	the null region at the end of the word if there is no such non-vowel.
	R2 is the region after the first non-vowel following a vowel in R1,
	or is the null region at the end of the word if there is no such non-vowel.
	*/
	
	var r1Index = word.search(/[aeiouyäöü][^aeiouyäöü]/);
	var r1 = '';
	if (r1Index != -1) {
		r1Index += 2;
		r1 = word.substring(r1Index);
	}
	
	var r2Index = -1;
	var r2 = '';
	
	if (r1Index != -1) {
		var r2Index = r1.search(/[aeiouyäöü][^aeiouyäöü]/);
		if (r2Index != -1) {
			r2Index += 2;
			r2 = r1.substring(r2Index);
			r2Index += r1Index;
		} else {
			r2 = '';
		}
	}
	
	if (r1Index != -1 && r1Index < 3) {
		r1Index = 3;
		r1 = word.substring(r1Index);
	}
	
	/*
	Define a valid s-ending as one of b, d, f, g, h, k, l, m, n, r or t.
	Define a valid st-ending as the same list, excluding letter r.
	*/
	
	/*
	Do each of steps 1, 2 and 3.
	*/
	
	/*
	Step 1:
	Search for the longest among the following suffixes,
	(a) em ern er
	(b) e en es
	(c) s (preceded by a valid s-ending)
	*/
	var a1Index = word.search(/(em|ern|er)$/g);
	var b1Index = word.search(/(e|en|es)$/g);
	var c1Index = word.search(/([bdfghklmnrt]s)$/g);
	if (c1Index != -1) {
		c1Index++;
	}
	var index1 = 10000;
	var optionUsed1 = '';
	if (a1Index != -1 && a1Index < index1) {
		optionUsed1 = 'a';
		index1 = a1Index;
	}
	if (b1Index != -1 && b1Index < index1) {
		optionUsed1 = 'b';
		index1 = b1Index;
	}
	if (c1Index != -1 && c1Index < index1) {
		optionUsed1 = 'c';
		index1 = c1Index;
	}
	
	/*
	and delete if in R1. (Of course the letter of the valid s-ending is
	not necessarily in R1.) If an ending of group (b) is deleted, and the ending
	is preceded by niss, delete the final s.
	(For example, äckern -> äck, ackers -> acker, armes -> arm,
	bedürfnissen -> bedürfnis)
	*/
	
	if (index1 != 10000 && r1Index != -1) {
		if (index1 >= r1Index) {
			word = word.substring(0, index1);
			if (optionUsed1 == 'b') {
				if (word.search(/niss$/) != -1) {
					word = word.substring(0, word.length -1);
				}
			}
		}
	}
	/*
	Step 2:
	Search for the longest among the following suffixes,
	(a) en er est
	(b) st (preceded by a valid st-ending, itself preceded by at least 3
	letters)
	*/
	
	var a2Index = word.search(/(en|er|est)$/g);
	var b2Index = word.search(/(.{3}[bdfghklmnt]st)$/g);
	if (b2Index != -1) {
		b2Index += 4;
	}
	
	var index2 = 10000;
	var optionUsed2 = '';
	if (a2Index != -1 && a2Index < index2) {
		optionUsed2 = 'a';
		index2 = a2Index;
	}
	if (b2Index != -1 && b2Index < index2) {
		optionUsed2 = 'b';
		index2 = b2Index;
	}
	
	/*
	and delete if in R1.
	(For example, derbsten -> derbst by step 1, and derbst -> derb by
	step 2, since b is a valid st-ending, and is preceded by just 3 letters)
	*/
	
	if (index2 != 10000 && r1Index != -1) {
		if (index2 >= r1Index) {
			word = word.substring(0, index2);
		}
	}
	
	/*
	Step 3: d-suffixes (*)
	Search for the longest among the following suffixes, and perform the
	action indicated.
	end ung
	delete if in R2
	if preceded by ig, delete if in R2 and not preceded by e
	ig ik isch
	delete if in R2 and not preceded by e
	lich heit
	delete if in R2
	if preceded by er or en, delete if in R1
	keit
	delete if in R2
	if preceded by lich or ig, delete if in R2
	*/
	
	var a3Index = word.search(/(end|ung)$/g);
	var b3Index = word.search(/[^e](ig|ik|isch)$/g);
	var c3Index = word.search(/(lich|heit)$/g);
	var d3Index = word.search(/(keit)$/g);
	if (b3Index != -1) {
		b3Index ++;
	}
	
	var index3 = 10000;
	var optionUsed3 = '';
	if (a3Index != -1 && a3Index < index3) {
		optionUsed3 = 'a';
		index3 = a3Index;
	}
	if (b3Index != -1 && b3Index < index3) {
		optionUsed3 = 'b';
		index3 = b3Index;
	}
	if (c3Index != -1 && c3Index < index3) {
		optionUsed3 = 'c';
		index3 = c3Index;
	}
	if (d3Index != -1 && d3Index < index3) {
		optionUsed3 = 'd';
		index3 = d3Index;
	}
	
	if (index3 != 10000 && r2Index != -1) {
		if (index3 >= r2Index) {
			word = word.substring(0, index3);
			var optionIndex = -1;
			var optionSubsrt = '';
			if (optionUsed3 == 'a') {
				optionIndex = word.search(/[^e](ig)$/);
				if (optionIndex != -1) {
					optionIndex++;
					if (optionIndex >= r2Index) {
						word = word.substring(0, optionIndex);
					}
				}
			} else if (optionUsed3 == 'c') {
				optionIndex = word.search(/(er|en)$/);
				if (optionIndex != -1) {
					if (optionIndex >= r1Index) {
						word = word.substring(0, optionIndex);
					}
				}
			} else if (optionUsed3 == 'd') {
				optionIndex = word.search(/(lich|ig)$/);
				if (optionIndex != -1) {
					if (optionIndex >= r2Index) {
						word = word.substring(0, optionIndex);
					}
				}
			}
		}
	}
	
	/*
	Finally,
	turn U and Y back into lower case, and remove the umlaut accent from
	a, o and u.
	*/
	word = word.replace(/U/g, 'u');
	word = word.replace(/Y/g, 'y');
	word = word.replace(/ä/g, 'a');
	word = word.replace(/ö/g, 'o');
	word = word.replace(/ü/g, 'u');
	
	return word.toLowerCase(); 
};
});
require.define("/lib/natural/stemmers/stemmer_gr.js",function(require,module,exports,__dirname,__filename,process){
/*
	by santokh singh
*/

var stopwords = require('../util/stopwords_gr');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_gr');

module.exports = function() {
   var stemmer = this;

   stemmer.stem = function(token) {
      return token;
   };

   stemmer.tokenizeAndStem = function(text, keepStops) {
      var stemmedTokens = [];

      new Tokenizer().tokenize(text).forEach(function(token) {
         if (keepStops || stopwords.words.indexOf(token) == -1) {
            var resultToken = token.toLowerCase();
            if (resultToken.match(/[a-zäöüß0-9]/gi)) {
               resultToken = stemmer.stem(resultToken);
            }
            stemmedTokens.push(resultToken);
         }
      });

      return stemmedTokens;
   };
   
   
   stemmer.tokenize = function(text, keepStops) {
      var allTokens = [];

      new Tokenizer().tokenize(text).forEach(function(token) {
         if (keepStops || stopwords.words.indexOf(token) == -1) {
            var resultToken = token.toLowerCase();
            allTokens.push(resultToken);
         }
      });

      return allTokens;
   };


   stemmer.attach = function() {
      String.prototype.stem = function() {
         return stemmer.stem(this);
      };

      String.prototype.tokenizeAndStem = function(keepStops) {
         return stemmer.tokenizeAndStem(this, keepStops);
      };
      
      String.prototype.tokenize = function(keepStops) {
         return stemmer.tokenizeAndStem(this, keepStops);
      };
   };
}


});

require.define("/lib/natural/util/stopwords_gr.js",function(require,module,exports,__dirname,__filename,process){
// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [ 'ab', 'aber', 'alle', 'allem', 'allen', 'aller', 'alles', 'als', 'also', 'am', 'an', 'ander',
			  'andere', 'anderem', 'anderen', 'anderer', 'anderes', 'anderm', 'andern', 'anderr', 'anders',
			   'auch', 'auf', 'aus', 'bei', 'bin', 'bis', 'bist', 'da', 'damit', 'dann', 'das', 'dasselbe', 
			   'dazu', 'daß', 'dein', 'deine', 'deinem', 'deinen', 'deiner', 'deines', 'dem', 'demselben',
			   'den', 'denn', 'denselben', 'der', 'derer', 'derselbe', 'derselben', 'des', 'desselben', 'dessen',
			   'dich', 'die', 'dies', 'diese', 'dieselbe', 'dieselben', 'diesem', 'diesen', 'dieser', 'dieses',
			   'dir', 'doch', 'dort', 'du', 'durch', 'ein', 'eine', 'einem', 'einen', 'einer', 'eines', 'einig',
			   'einige', 'einigem', 'einigen', 'einiger', 'einiges', 'einmal', 'er', 'es', 'etwas', 'euch', 'euer',
			   'eure', 'eurem', 'euren', 'eurer', 'eures', 'für', 'gegen', 'gewesen', 'hab', 'habe', 'haben', 'hat',
			   'hatte', 'hatten', 'hier', 'hin', 'hinter', 'ich', 'ihm', 'ihn', 'ihnen', 'ihr', 'ihre', 'ihrem', 'ihren',
			   'ihrer', 'ihres', 'im', 'in', 'indem', 'ins', 'ist', 'jede', 'jedem', 'jeden', 'jeder', 'jedes', 'jene',
			   'jenem', 'jenen', 'jener', 'jenes', 'jetzt', 'kann', 'kein', 'keine', 'keinem', 'keinen', 'keiner', 
			   'keines', 'können', 'könnte', 'machen', 'man', 'manche', 'manchem', 'manchen', 'mancher', 'manches',
			   'mein', 'meine', 'meinem', 'meinen', 'meiner', 'meines', 'mich', 'mir', 'mit', 'muss', 'musste', 'nach',
			   'nicht', 'nichts', 'noch', 'nun', 'nur', 'ob', 'oder', 'ohne', 'sehr', 'sein', 'seine', 'seinem', 'seinen',
			   'seiner', 'seines', 'selbst', 'sich', 'sie', 'sind', 'so', 'solche', 'solchem', 'solchen', 'solcher',
			   'solches', 'soll', 'sollte', 'sondern', 'sonst', 'über', 'um', 'und', 'uns', 'unse', 'unsem', 'unsen', 'unser',
			   'unses', 'unter', 'viel', 'vom', 'von','vor', 'war', 'waren', 'warst', 'was', 'weg', 'weil', 'weiter',
			   'welche', 'welchem', 'welchen', 'welcher', 'welches', 'wenn', 'werde', 'werden', 'wie', 'wieder', 'will',
			   'wir', 'wird', 'wirst', 'wo', 'wollen', 'wollte', 'während', 'würde', 'würden', 'zu', 'zum', 'zur', 'zwar',
			   'zwischen', 'über', 'und', 'in', 'aus', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
			   'n','o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ö', 'ä', 'ü', 'ß', '$', '1','2', '3', '4', '5', '6', '7', 
			   '8', '9', '0', '_', 'i', 'ii', 'iii', 'iv', 'v'];

// tell the world about the noise words.
exports.words = words;
});

require.define("/lib/natural/tokenizers/aggressive_tokenizer_gr.js",function(require,module,exports,__dirname,__filename,process){
	var Tokenizer = require('./tokenizer'),
	    util = require('util');
	
	var AggressiveTokenizer = function() {
	    Tokenizer.call(this);    
	};
	util.inherits(AggressiveTokenizer, Tokenizer);
	
	module.exports = AggressiveTokenizer;
	
	AggressiveTokenizer.prototype.tokenize = function(text) {
	    // break a string up into an array of tokens by anything non-word
	    return this.trim(text.split(/[^a-z0-9äöüß]+/i));
	};

});


require.define("/lib/natural/stemmers/porter_stemmer_mul.js",function(require,module,exports,__dirname,__filename,process){

var Stemmer = require('./stemmer_mul');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
    return token; 
};

});
require.define("/lib/natural/stemmers/stemmer_mul.js",function(require,module,exports,__dirname,__filename,process){
var stopwords = require('../util/stopwords_mul');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_mul');

module.exports = function() {
   var stemmer = this;

   stemmer.stem = function(token) {
      return token;
   };

   stemmer.tokenizeAndStem = function(text, keepStops) {
      var stemmedTokens = [];

      new Tokenizer().tokenize(text).forEach(function(token) {
         if (keepStops || stopwords.words.indexOf(token) == -1) {
            var resultToken = token.toLowerCase();
            //if (resultToken.match(/[a-zâàëéêèïîôûùçäöüß0-9]/gi)) {
               resultToken = stemmer.stem(resultToken);
            //}
            stemmedTokens.push(resultToken);
         }
      });

      return stemmedTokens;
   };
   
   stemmer.tokenize = function(text, keepStops) {
      var allTokens = [];

      new Tokenizer().tokenize(text).forEach(function(token) {
         if (keepStops || stopwords.words.indexOf(token) == -1) {
            var resultToken = token.toLowerCase();
            allTokens.push(resultToken);
         }
      });

      return allTokens;
   };

   stemmer.attach = function() {
      String.prototype.stem = function() {
         return stemmer.stem(this);
      };

      String.prototype.tokenizeAndStem = function(keepStops) {
         return stemmer.tokenizeAndStem(this, keepStops);
      };
      
      String.prototype.tokenize = function(keepStops) {
         return stemmer.tokenize(this, keepStops);
      };
   };
}

});

require.define("/lib/natural/util/stopwords_mul.js",function(require,module,exports,__dirname,__filename,process){
// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [ 'all', 'another', 'any', 'both', 'each', 'other', 'others', 'same', 'such', 'the', 'and',
			  'that', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q',
			  'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '$', '1', '2', '3', '4', '5', '6', '7', '8', 
			  '9', '0', '_', 'ii', 'iii', 'iv', 'copyright', 'one', 'two', 'three', 'four', 'five', 'six', 
			  'seven', 'eight', 'nine', 'ten', 'first', 'second', 'third', 'fourth', 'fifth', 'minor', 
			  'data', 'left', 'right', 'sample', 'analysis', 'test', 'author', 'article', 'day', 'month', 
			  'year', 'decade', 'century', 'least', 'review', 'worst', 'survey', 'study', 'show', 'paper', 
			  'research', 'researcher', 'end', 'lack', 'detail', 'focus', 'need', 'elsevier', 'approach', 
			  'method', 'methodology', 'technique', 'type', 'situation', 'rather', 'hypothesis', 'part', 
			  'deal', 'way', 'story', 'process', 'return', 'phase', 'finding', 'purpose', 'position', 
			  'explanation', 'evidence', 'hand', 'half', 'model', 'design', 'limitation', 'implication', 
			  'originality', 'value', 'reason', 'result', 'theory', 'effect', 'publication', 'abstract', 
			  'fact', 'factor', 'alternative', 'within', 'view', 'insight', 'range', 'point', 'assumption', 
			  'field', 'majority', 'minority', 'statistic', 'discussion', 'question', 'address', 'instance', 
			  'aspect', 'actor', 'citation', 'strategy', 'overview', 'cause', 'future', 'retrospective', 
			  'setting', 'outcome', 'measure', 'age', 'number', 'forecast', 'conclusion', 'motivation', 
			  'exploration', 'literature', 'variable', 'composition', 'phenomenon', 'mechanism', 'log', 
			  'size', 'area', 'self', 'sector', 'pattern', 'support', 'group', 'challenge', 'focu', 
			  'period', 'attempt', 'report', 'evaluation', 'mean', 'seek', 'regression', 'quantile', 
			  'panel', 'today', 'example', 'novel', 'account', 'investigation', 'book', 'participant', 
			  'goal', 'characteristic', 'case', 'introduction', 'scenario', 'implementation', 'domain', 
			  'footstep', 'selection', 'generalization', 'feedback', 'framework', 'addition', 'search', 
			  'scale', 'trial', 'issue', 'degree', 'application', 'step', 'function', 'module', 'state', 
			  'level', 'concept', 'advantage', 'disadvantage', 'representation', 'problem', 'use', 'person', 
			  'source', 'argument', 'essay', 'notion', 'struggle', 'responsibility', 'response', 'principle', 
			  'moment', 'kind', 'sorce', 'guideline', 'recommendation', 'rate', 'cas', 'ratio', 'estimate', 
			  'term', 'percent', 'basis', 'amount', 'indicator', 'utilization', 'ltd', 'amp', 'chapter', 
			  'different', 'form', 'importance', 'new', 'able', 'about', 'above', 'abst', 'accordance', 
			  'according', 'accordingly', 'across', 'act', 'actually', 'added', 'adj', 'affected', 
			  'affecting', 'affects', 'after', 'afterwards', 'again', 'against', 'ah', 'almost', 
			  'alone', 'along', 'already', 'also', 'although', 'always', 'am', 'among', 'amongst', 
			  'an', 'announce', 'anybody', 'anyhow', 'anymore', 'anyone', 'anything', 'anyway', 
			  'anyways', 'anywhere', 'apparently', 'approximately', 'are', 'aren', 'arent', 'arise', 
			  'around', 'as', 'aside', 'ask', 'asking', 'at', 'auth', 'available', 'away', 'awfully', 
			  'back', 'be', 'became', 'because', 'become', 'becomes', 'becoming', 'been', 'before', 
			  'beforehand', 'begin', 'beginning', 'beginnings', 'begins', 'behind', 'being', 'believe', 
			  'below', 'beside', 'besides', 'between', 'beyond', 'biol', 'brief', 'briefly', 'but', 'by', 
			  'ca', 'came', 'can', 'cannot', 'causes', 'certain', 'certainly', 'co', 'com', 'come', 'comes', 
			  'contain', 'containing', 'contains', 'could', 'couldnt', 'date', 'did', 'do', 'does','doing', 
			  'done', 'down', 'downwards', 'due', 'during', 'ed', 'edu', 'eg', 'eighty', 'either', 'else', 
			  'elsewhere', 'ending', 'enough', 'especially', 'et', 'et-al', 'etc', 'even', 'ever', 'every', 
			  'everybody', 'everyone', 'everything', 'everywhere', 'ex', 'except', 'far', 'few', 'ff', 'fix', 
			  'followed', 'following', 'follows', 'for', 'former', 'formerly', 'forth', 'found', 'from', 
			  'further', 'furthermore', 'gave', 'get', 'gets', 'getting', 'give', 'given', 'gives', 'giving', 
			  'go', 'goes', 'gone', 'got', 'gotten', 'had', 'happens', 'hardly', 'has', 'have', 'having', 'he', 
			  'hed', 'hence', 'her', 'here', 'hereafter', 'hereby', 'herein', 'heres', 'hereupon', 'hers', 
			  'herself', 'hes', 'hi', 'hid', 'him', 'himself', 'his', 'hither', 'home', 'how', 'howbeit', 
			  'however', 'hundred', 'id', 'ie', 'if', 'im', 'immediate', 'immediately', 'important', 'in', 
			  'inc', 'indeed', 'index', 'information', 'instead', 'into', 'invention', 'inward', 'is', 'it', 
			  'itd', 'its', 'itself', 'just', 'keep	keeps', 'kept', 'kg', 'km', 'know', 'known', 'knows', 
			  'largely', 'last', 'lately', 'later', 'latter', 'latterly', 'less', 'lest', 'let', 'lets', 'like', 
			  'liked', 'likely', 'line', 'little', 'look', 'looking', 'looks', 'made', 'mainly', 'make', 'makes', 
			  'many', 'may', 'maybe', 'me', 'means', 'meantime', 'meanwhile', 'merely', 'mg', 'might', 'million', 
			  'miss', 'ml', 'more', 'moreover', 'most', 'mostly', 'mr', 'mrs', 'much', 'mug', 'must', 'my', 
			  'myself', 'na', 'name', 'namely', 'nay', 'nd', 'near', 'nearly', 'necessarily', 'necessary', 'needs', 
			  'neither', 'never', 'nevertheless', 'next', 'ninety', 'no', 'nobody', 'non', 'none', 'nonetheless', 
			  'noone', 'nor', 'normally', 'nos', 'not', 'noted', 'nothing', 'now', 'nowhere', 'obtain', 'obtained', 
			  'obviously', 'of', 'off', 'often', 'oh', 'ok', 'okay', 'old', 'omitted', 'on', 'once', 'ones', 'only', 
			  'onto', 'or', 'ord', 'otherwise', 'ought', 'our', 'ours', 'ourselves', 'out', 'outside', 'over', 
			  'overall', 'owing', 'own', 'page', 'pages', 'particular', 'particularly', 'past', 'per', 'perhaps', 
			  'placed', 'please', 'plus', 'poorly', 'possible', 'possibly', 'potentially', 'pp', 'predominantly', 
			  'present', 'previously', 'primarily', 'probably', 'promptly', 'proud', 'provides', 'put', 'que', 
			  'quickly', 'quite', 'qv', 'ran', 'rd', 're', 'readily', 'really', 'recent', 'recently', 'ref', 'refs', 
			  'regarding', 'regardless', 'regards', 'related', 'relatively', 'respectively', 'resulted', 'resulting', 
			  'results', 'run', 'said', 'saw', 'say', 'saying', 'says', 'sec', 'section', 'see', 'seeing', 'seem', 
			  'seemed', 'seeming', 'seems', 'seen', 'selves', 'sent', 'several', 'shall', 'she', 'shed', 'shes', 
			  'should', 'showed', 'shown', 'showns', 'shows', 'significant', 'significantly', 'similar', 'similarly', 
			  'since', 'slightly', 'so', 'some', 'somebody', 'somehow', 'someone', 'somethan', 'something', 'sometime', 
			  'sometimes', 'somewhat', 'somewhere', 'soon', 'sorry', 'specifically', 'specified', 'specify', 
			  'specifying', 'still', 'stop', 'strongly', 'sub', 'substantially', 'successfully', 'sufficiently', 
			  'suggest', 'sup', 'sure	t', 'take', 'taken', 'taking', 'tell', 'tends', 'th', 'than', 'thank', 'thanks', 
			  'thanx', 'their', 'theirs', 'them', 'themselves', 'then', 'thence', 'there', 'thereafter', 'thereby', 
			  'thered', 'therefore', 'therein', 'thereof', 'therere', 'theres', 'thereto', 'thereupon', 'these', 'they', 
			  'theyd', 'theyre', 'think', 'this', 'those', 'thou', 'though', 'thoughh', 'thousand', 'throug', 'through', 
			  'throughout', 'thru', 'thus', 'til', 'tip', 'to', 'together', 'too', 'took', 'toward', 'towards', 'tried', 
			  'tries', 'truly', 'try', 'trying', 'ts', 'twice', 'un', 'under', 'unfortunately', 'unless', 'unlike', 
			  'unlikely', 'until', 'unto', 'up', 'upon', 'ups', 'us', 'used', 'useful', 'usefully', 'usefulness', 'uses', 
			  'using', 'usually', 'various', 'very', 'via', 'viz', 'vol', 'vols', 'vs', 'want', 'wants', 'was', 'wasnt', 
			  'we', 'wed', 'welcome', 'went', 'were', 'werent', 'what', 'whatever', 'whats', 'when', 'whence', 'whenever', 
			  'where', 'whereafter', 'whereas', 'whereby', 'wherein', 'wheres', 'whereupon', 'wherever', 'whether', 'which', 
			  'while', 'whim', 'whither', 'who', 'whod', 'whoever', 'whole', 'whom', 'whomever', 'whos', 'whose', 'why', 
			  'widely', 'willing', 'wish', 'with', 'without', 'wont', 'words', 'world', 'would', 'wouldnt', 'www', 'yes', 
			  'yet', 'you', 'youd', 'your', 'youre', 'yours', 'yourself', 'yourselves', 
			  
			  'être', 'avoir', 'faire', 'au', 'aux', 'avec', 'ce', 'ces', 'dans', 'de', 'des', 'du', 'elle', 'en', 'eux', 
			  'il', 'je', 'la', 'le', 'leur', 'lui', 'ma', 'mais', 'même', 'mes', 'moi', 'mon', 'ne', 'notre', 'nous', 'ou', 
			  'où', 'par', 'pas', 'pour', 'qu', 'qui', 'sa', 'se', 'ses', 'son', 'sur', 'ta', 'te', 'tes', 'toi', 'ton', 'tu',
			   'une', 'vos', 'votre', 'vous', 			   
			   
			   'à', 'été', 'étée', 'étées', 'étés', 'étant', 'suis', 'es', 'est', 'sommes', 'êtes', 'sont', 'serai', 'seras', 'sera', 
			   'serons', 'serez', 'seront', 'serais', 'serait', 'serions', 'seriez', 'seraient', 'étais', 'était', 'étions', 'étiez', 
			   'étaient', 'fus', 'fut', 'fûmes', 'fûtes', 'furent', 'sois', 'soit', 'soyons', 'soyez', 'soient', 'fusse', 'fusses', 
			   'fût', 'fussions', 'fussiez', 'fussent', 'ayant', 'eu', 'eue', 'eues', 'eus', 'ai', 'avons', 'avez', 'ont', 'aurai', 
			   'auras', 'aura', 'aurons', 'aurez', 'auront', 'aurais', 'aurait', 'aurions', 'auriez', 'auraient', 'avais', 'avait', 
			   'avions', 'aviez', 'avaient', 'eut', 'eûmes', 'eûtes', 'eurent', 'aie', 'aies', 'ait', 'ayons', 'ayez', 'aient', 
			   'eusse', 'eusses', 'eût', 'eussions', 'eussiez', 'eussent', 'ceci', 'cela', 'cet', 'cette', 'ici', 'ils', 'les', 
			   'leurs', 'quel', 'quels', 'quelle', 'quelles', 'sans', 'soi', 'ad', 'al', 'allo', 'agli', 'agl', 'alla', 'alle', 
			   'con', 'col', 'coi', 'da', 'dal', 'dallo', 'dai', 'dagli', 'dall', 'dagl', 'dalla', 'dalle', 'di', 'del', 'dello', 
			   'dei', 'degli', 'dell', 'degl', 'della', 'delle', 'nel', 'nello', 'nei', 'negli', 'nell', 'negl', 'nella', 'nelle', 
			   'su', 'sul', 'sullo', 'sui', 'sugli', 'sull', 'sugl', 'sulla', 'sulle', 'tra', 'contro', 'io', 'lei', 'noi', 'voi', 
			   'loro', 'mio', 'mia', 'miei', 'mie', 'tuo', 'tua', 'tuoi', 'tue', 'suo', 'sua', 'suoi', 'sue', 'nostro', 'nostra', 
			   'nostri', 'nostre', 'vostro', 'vostra', 'vostri', 'vostre', 'mi', 'ti', 'ci', 'vi', 'lo', 'li', 'gli', 'uno', 'una',
			    'perché', 'anche', 'dov', 'dove', 'che', 'chi', 'cui', 'più', 'quale', 'quanto', 'quanti', 'quanta', 'quante', 'quello', 
			    'quelli', 'quella', 'questo', 'questi', 'questa', 'queste', 'si', 'tutto', 'tutti', 'ho', 'hai', 'ha', 'abbiamo', 'avete', 
			    'hanno', 'abbia', 'abbiate', 'abbiano', 'avrò', 'avrai', 'avrà', 'avremo', 'avrete', 'avranno', 'avrei', 'avresti', 
			    'avrebbe', 'avremmo', 'avreste', 'avrebbero', 'avevo', 'avevi', 'aveva', 'avevamo', 'avevate', 'avevano', 'ebbi', 'avesti', 
			    'ebbe', 'avemmo', 'aveste', 'ebbero', 'avessi', 'avesse', 'avessimo', 'avessero', 'avendo', 'avuto', 'avuta', 'avuti', 
			    'avute', 'sono', 'sei', 'è', 'siamo', 'siete', 'sia', 'siate', 'siano', 'sarò', 'sarai', 'sarà', 'saremo', 'sarete', 
			    'saranno', 'sarei', 'saresti', 'sarebbe', 'saremmo', 'sareste', 'sarebbero', 'ero', 'eri', 'era', 'eravamo', 'eravate', 
			    'erano', 'fui', 'fosti', 'fu', 'fummo', 'foste', 'furono', 'fossi', 'fosse', 'fossimo', 'fossero', 'essendo', 'faccio', 
			    'fai', 'facciamo', 'fanno', 'faccia', 'facciate', 'facciano', 'farò', 'farai', 'farà', 'faremo', 'farete', 'faranno', 
			    'farei', 'faresti', 'farebbe', 'faremmo', 'fareste', 'farebbero', 'facevo', 'facevi', 'faceva', 'facevamo', 'facevate', 
			    'facevano', 'feci', 'facesti', 'fece', 'facemmo', 'faceste', 'fecero', 'facessi', 'facesse', 'facessimo', 'facessero', 
			    'facendo', 'sto', 'stai', 'sta', 'stiamo', 'stanno', 'stia', 'stiate', 'stiano', 'starò', 'starai', 'starà', 'staremo', 
			    'starete', 'staranno', 'starei', 'staresti', 'starebbe', 'staremmo', 'stareste', 'starebbero', 'stavo', 'stavi', 'stava', 
			    'stavamo', 'stavate', 'stavano', 'stetti', 'stesti', 'stette', 'stemmo', 'steste', 'stettero', 'stessi', 'stesse', 
			    'stessimo', 'stessero', 'stando', 
			    
			    'aber', 'allem', 'allen', 'aller', 'alles', 'als', 'ander', 'andere', 'anderem', 'anderen', 'anderer', 'anderes', 'anderm', 
			    'andern', 'anderr', 'anders', 'auch', 'auf', 'aus', 'bei', 'bin', 'bis', 'bist', 'damit', 'dann', 'das', 'dasselbe', 'dazu', 
			    'daß', 'dein', 'deine', 'deinem', 'deinen', 'deiner', 'deines', 'dem', 'demselben', 'den', 'denn', 'denselben', 'der', 
			    'derer', 'derselbe', 'derselben', 'desselben', 'dessen', 'dich', 'die', 'dies', 'diese', 'dieselbe', 'dieselben', 'diesem', 
			    'diesen', 'dieser', 'dieses', 'dir', 'doch', 'dort', 'durch', 'ein', 'eine', 'einem', 'einen', 'einer', 'eines', 'einig', 
			    'einige', 'einigem', 'einigen', 'einiger', 'einiges', 'einmal', 'er', 'etwas', 'euch', 'euer', 'eure', 'eurem', 'euren', 
			    'eurer', 'eures', 'für', 'gegen', 'gewesen', 'hab', 'habe', 'haben', 'hat', 'hatte', 'hatten', 'hier', 'hin', 'hinter', 
			    'ich', 'ihm', 'ihn', 'ihnen', 'ihr', 'ihre', 'ihrem', 'ihren', 'ihrer', 'ihres', 'indem', 'ins', 'ist', 'jede', 'jedem', 
			    'jeden', 'jeder', 'jedes', 'jene', 'jenem', 'jenen', 'jener', 'jenes', 'jetzt', 'kann', 'kein', 'keine', 'keinem', 
			    'keinen', 'keiner', 'keines', 'können', 'könnte', 'machen', 'man', 'manche', 'manchem', 'manchen', 'mancher', 'manches', 
			    'mein', 'meine', 'meinem', 'meinen', 'meiner', 'meines', 'mich', 'mir', 'mit', 'muss', 'musste', 'nach', 'nicht', 
			    'nichts', 'noch', 'nun', 'nur', 'ob', 'oder', 'ohne', 'sehr', 'sein', 'seine', 'seinem', 'seinen', 'seiner', 'seines', 
			    'selbst', 'sich', 'sie', 'sind', 'solche', 'solchem', 'solchen', 'solcher', 'solches', 'soll', 'sollte', 'sondern', 
			    'sonst', 'über', 'um', 'und', 'uns', 'unse', 'unsem', 'unsen', 'unser', 'unses', 'unter', 'viel', 'vom', 'von', 'vor', 
			    'war', 'waren', 'warst', 'weg', 'weil', 'weiter', 'welche', 'welchem', 'welchen', 'welcher', 'welches', 'wenn', 'werde', 
			    'werden', 'wie', 'wieder', 'will', 'wir', 'wird', 'wirst', 'wo', 'wollen', 'wollte', 'während', 'würde', 'würden', 'zu', 
			    'zum', 'zur', 'zwar', 'zwischen']

// tell the world about the noise words.
exports.words = words;
});

require.define("/lib/natural/tokenizers/aggressive_tokenizer_mul.js",function(require,module,exports,__dirname,__filename,process){
var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
   	return text.trim().split(/\s+/);
};

});



/*
 * 
require.define("/lib/natural/stemmers/porter_stemmer_fr.js",function(require,module,exports,__dirname,__filename,process){

});
require.define("/lib/natural/stemmers/stemmer_ru.js",function(require,module,exports,__dirname,__filename,process){

});

require.define("/lib/natural/util/stopwords_ru.js",function(require,module,exports,__dirname,__filename,process){
// a list of commonly used words that have little meaning and can be excluded
// from analysis.
var words = [];

// tell the world about the noise words.
exports.words = words;
});

require.define("/lib/natural/tokenizers/aggressive_tokenizer_ru.js",function(require,module,exports,__dirname,__filename,process){

});

*/






require.define("/lib/natural/language/language_detecter.js",function(require,module,exports,__dirname,__filename,process){	
module.exports = function() {
    var languageDetector = this;
  	var models = require('../language/languageDetectorData')
  	
  	   var MAX_LENGTH = 4096;
      var MIN_LENGTH = 20;
      var MAX_GRAMS = 300;

      var NAME_MAP = {
        "ab": "Abkhazian",
        "af": "Afrikaans",
        "ar": "Arabic",
        "az": "Azeri",
        "be": "Belarusian",
        "bg": "Bulgarian",
        "bn": "Bengali",
        "bo": "Tibetan",
        "br": "Breton",
        "ca": "Catalan",
        "ceb": "Cebuano",
        "cs": "Czech",
        "cy": "Welsh",
        "da": "Danish",
        "de": "German",
        "el": "Greek",
        "en": "English",
        "eo": "Esperanto",
        "es": "Spanish",
        "et": "Estonian",
        "eu": "Basque",
        "fa": "Farsi",
        "fi": "Finnish",
        "fo": "Faroese",
        "fr": "French",
        "fy": "Frisian",
        "gd": "Scots Gaelic",
        "gl": "Galician",
        "gu": "Gujarati",
        "ha": "Hausa",
        "haw": "Hawaiian",
        "he": "Hebrew",
        "hi": "Hindi",
        "hmn": "Pahawh Hmong",
        "hr": "Croatian",
        "hu": "Hungarian",
        "hy": "Armenian",
        "id": "Indonesian",
        "is": "Icelandic",
        "it": "Italian",
        "ja": "Japanese",
        "ka": "Georgian",
        "kk": "Kazakh",
        "km": "Cambodian",
        "ko": "Korean",
        "ku": "Kurdish",
        "ky": "Kyrgyz",
        "la": "Latin",
        "lt": "Lithuanian",
        "lv": "Latvian",
        "mg": "Malagasy",
        "mk": "Macedonian",
        "ml": "Malayalam",
        "mn": "Mongolian",
        "mr": "Marathi",
        "ms": "Malay",
        "nd": "Ndebele",
        "ne": "Nepali",
        "nl": "Dutch",
        "nn": "Nynorsk",
        "no": "Norwegian",
        "nso": "Sepedi",
        "pa": "Punjabi",
        "pl": "Polish",
        "ps": "Pashto",
        "pt": "Portuguese",
        "pt-PT": "Portuguese (Portugal)",
        "pt-BR": "Portuguese (Brazil)",
        "ro": "Romanian",
        "ru": "Russian",
        "sa": "Sanskrit",
        "bs": "Serbo-Croatian",
        "sk": "Slovak",
        "sl": "Slovene",
        "so": "Somali",
        "sq": "Albanian",
        "sr": "Serbian",
        "sv": "Swedish",
        "sw": "Swahili",
        "ta": "Tamil",
        "te": "Telugu",
        "th": "Thai",
        "tl": "Tagalog",
        "tlh": "Klingon",
        "tn": "Setswana",
        "tr": "Turkish",
        "ts": "Tsonga",
        "tw": "Twi",
        "uk": "Ukrainian",
        "ur": "Urdu",
        "uz": "Uzbek",
        "ve": "Venda",
        "vi": "Vietnamese",
        "xh": "Xhosa",
        "zh": "Chinese",
        "zh-TW": "Traditional Chinese (Taiwan)",
        "zu": "Zulu"
      };

      var IANA_MAP = {
        "ab": 12026,
        "af": 40,
        "ar": 26020,
        "az": 26030,
        "be": 11890,
        "bg": 26050,
        "bn": 26040,
        "bo": 26601,
        "br": 1361,
        "ca": 3,
        "ceb": 26060,
        "cs": 26080,
        "cy": 26560,
        "da": 26090,
        "de": 26160,
        "el": 26165,
        "en": 26110,
        "eo": 11933,
        "es": 26460,
        "et": 26120,
        "eu": 1232,
        "fa": 26130,
        "fi": 26140,
        "fo": 11817,
        "fr": 26150,
        "fy": 1353,
        "gd": 65555,
        "gl": 1252,
        "gu": 26599,
        "ha": 26170,
        "haw": 26180,
        "he": 26592,
        "hi": 26190,
        "hr": 26070,
        "hu": 26200,
        "hy": 26597,
        "id": 26220,
        "is": 26210,
        "it": 26230,
        "ja": 26235,
        "ka": 26600,
        "kk": 26240,
        "km": 1222,
        "ko": 26255,
        "ku": 11815,
        "ky": 26260,
        "la": 26280,
        "lt": 26300,
        "lv": 26290,
        "mg": 1362,
        "mk": 26310,
        "ml": 26598,
        "mn": 26320,
        "mr": 1201,
        "ms": 1147,
        "ne": 26330,
        "nl": 26100,
        "nn": 172,
        "no": 26340,
        "pa": 65550,
        "pl": 26380,
        "ps": 26350,
        "pt": 26390,
        "ro": 26400,
        "ru": 26410,
        "sa": 1500,
        "bs": 1399,
        "sk": 26430,
        "sl": 26440,
        "so": 26450,
        "sq": 26010,
        "sr": 26420,
        "sv": 26480,
        "sw": 26470,
        "ta": 26595,
        "te": 26596,
        "th": 26594,
        "tl": 26490,
        "tlh": 26250,
        "tn": 65578,
        "tr": 26500,
        "tw": 1499,
        "uk": 26520,
        "ur": 26530,
        "uz": 26540,
        "vi": 26550,
        "zh": 26065,
        "zh-TW": 22
      };

      var SINGLETONS = [
        ["Armenian", "hy"],
        ["Hebrew", "he"],
        ["Bengali", "bn"],
        ["Gurmukhi", "pa"],
        ["Greek", "el"],
        ["Gujarati", "gu"],
        ["Oriya", "or"],
        ["Tamil", "ta"],
        ["Telugu", "te"],
        ["Kannada", "kn"],
        ["Malayalam", "ml"],
        ["Sinhala", "si"],
        ["Thai", "th"],
        ["Lao", "lo"],
        ["Tibetan", "bo"],
        ["Burmese", "my"],
        ["Georgian", "ka"],
        ["Mongolian", "mn"],
        ["Khmer", "km"],
        ["Pahawh Hmong", "hmn"]
      ];

      var UNKNOWN = 'unknown';

      var BASIC_LATIN = ["en", "ceb", "ha", "so", "tlh", "id", "haw", "la", "sw", "eu", "nr", "nso", "zu", "xh", "ss", "st", "tn", "ts"];
      var EXTENDED_LATIN = ["cs", "af", "pl", "hr", "ro", "sk", "sl", "tr", "hu", "az", "et", "sq", "ca", "es", "fr", "de", "nl", "it", "da", "is", "no", "sv", "fi", "lv", "pt", "ve", "lt", "tl", "cy", "vi"];
      var ALL_LATIN = BASIC_LATIN.concat(EXTENDED_LATIN);
      var CYRILLIC = ["ru", "uk", "kk", "uz", "mn", "sr", "mk", "bg", "ky"];
      var ARABIC = ["ar", "fa", "ps", "ur"];
      var DEVANAGARI = ["hi", "ne"];
      var PT = ["pt-BR", "pt-PT"];

      // Unicode char greedy regex block range matchers
      var unicodeBlockTests = {
        "Basic Latin": /[\u0000-\u007F]/g,
        "Latin-1 Supplement": /[\u0080-\u00FF]/g,
        "Latin Extended-A": /[\u0100-\u017F]/g,
        "Latin Extended-B": /[\u0180-\u024F]/g,
        "IPA Extensions": /[\u0250-\u02AF]/g,
        "Spacing Modifier Letters": /[\u02B0-\u02FF]/g,
        "Combining Diacritical Marks": /[\u0300-\u036F]/g,
        "Greek and Coptic": /[\u0370-\u03FF]/g,
        "Cyrillic": /[\u0400-\u04FF]/g,
        "Cyrillic Supplement": /[\u0500-\u052F]/g,
        "Armenian": /[\u0530-\u058F]/g,
        "Hebrew": /[\u0590-\u05FF]/g,
        "Arabic": /[\u0600-\u06FF]/g,
        "Syriac": /[\u0700-\u074F]/g,
        "Arabic Supplement": /[\u0750-\u077F]/g,
        "Thaana": /[\u0780-\u07BF]/g,
        "NKo": /[\u07C0-\u07FF]/g,
        "Devanagari": /[\u0900-\u097F]/g,
        "Bengali": /[\u0980-\u09FF]/g,
        "Gurmukhi": /[\u0A00-\u0A7F]/g,
        "Gujarati": /[\u0A80-\u0AFF]/g,
        "Oriya": /[\u0B00-\u0B7F]/g,
        "Tamil": /[\u0B80-\u0BFF]/g,
        "Telugu": /[\u0C00-\u0C7F]/g,
        "Kannada": /[\u0C80-\u0CFF]/g,
        "Malayalam": /[\u0D00-\u0D7F]/g,
        "Sinhala": /[\u0D80-\u0DFF]/g,
        "Thai": /[\u0E00-\u0E7F]/g,
        "Lao": /[\u0E80-\u0EFF]/g,
        "Tibetan": /[\u0F00-\u0FFF]/g,
        "Burmese": /[\u1000-\u109F]/g,
        "Georgian": /[\u10A0-\u10FF]/g,
        "Hangul Jamo": /[\u1100-\u11FF]/g,
        "Ethiopic": /[\u1200-\u137F]/g,
        "Ethiopic Supplement": /[\u1380-\u139F]/g,
        "Cherokee": /[\u13A0-\u13FF]/g,
        "Unified Canadian Aboriginal Syllabics": /[\u1400-\u167F]/g,
        "Ogham": /[\u1680-\u169F]/g,
        "Runic": /[\u16A0-\u16FF]/g,
        "Pahawh Hmong": /[\u16B0-\u16B8]/g,
        "Tagalog": /[\u1700-\u171F]/g,
        "Hanunoo": /[\u1720-\u173F]/g,
        "Buhid": /[\u1740-\u175F]/g,
        "Tagbanwa": /[\u1760-\u177F]/g,
        "Khmer": /[\u1780-\u17FF]/g,
        "Mongolian": /[\u1800-\u18AF]/g,
        "Limbu": /[\u1900-\u194F]/g,
        "Tai Le": /[\u1950-\u197F]/g,
        "New Tai Lue": /[\u1980-\u19DF]/g,
        "Khmer Symbols": /[\u19E0-\u19FF]/g,
        "Buginese": /[\u1A00-\u1A1F]/g,
        "Balinese": /[\u1B00-\u1B7F]/g,
        "Phonetic Extensions": /[\u1D00-\u1D7F]/g,
        "Phonetic Extensions Supplement": /[\u1D80-\u1DBF]/g,
        "Combining Diacritical Marks Supplement": /[\u1DC0-\u1DFF]/g,
        "Latin Extended Additional": /[\u1E00-\u1EFF]/g,
        "Greek Extended": /[\u1F00-\u1FFF]/g,
        "General Punctuation": /[\u2000-\u206F]/g,
        "Superscripts and Subscripts": /[\u2070-\u209F]/g,
        "Currency Symbols": /[\u20A0-\u20CF]/g,
        "Combining Diacritical Marks for Symbols": /[\u20D0-\u20FF]/g,
        "Letterlike Symbols": /[\u2100-\u214F]/g,
        "Number Forms": /[\u2150-\u218F]/g,
        "Arrows": /[\u2190-\u21FF]/g,
        "Mathematical Operators": /[\u2200-\u22FF]/g,
        "Miscellaneous Technical": /[\u2300-\u23FF]/g,
        "Control Pictures": /[\u2400-\u243F]/g,
        "Optical Character Recognition": /[\u2440-\u245F]/g,
        "Enclosed Alphanumerics": /[\u2460-\u24FF]/g,
        "Box Drawing": /[\u2500-\u257F]/g,
        "Block Elements": /[\u2580-\u259F]/g,
        "Geometric Shapes": /[\u25A0-\u25FF]/g,
        "Miscellaneous Symbols": /[\u2600-\u26FF]/g,
        "Dingbats": /[\u2700-\u27BF]/g,
        "Miscellaneous Mathematical Symbols-A": /[\u27C0-\u27EF]/g,
        "Supplemental Arrows-A": /[\u27F0-\u27FF]/g,
        "Braille Patterns": /[\u2800-\u28FF]/g,
        "Supplemental Arrows-B": /[\u2900-\u297F]/g,
        "Miscellaneous Mathematical Symbols-B": /[\u2980-\u29FF]/g,
        "Supplemental Mathematical Operators": /[\u2A00-\u2AFF]/g,
        "Miscellaneous Symbols and Arrows": /[\u2B00-\u2BFF]/g,
        "Glagolitic": /[\u2C00-\u2C5F]/g,
        "Latin Extended-C": /[\u2C60-\u2C7F]/g,
        "Coptic": /[\u2C80-\u2CFF]/g,
        "Georgian Supplement": /[\u2D00-\u2D2F]/g,
        "Tifinagh": /[\u2D30-\u2D7F]/g,
        "Ethiopic Extended": /[\u2D80-\u2DDF]/g,
        "Supplemental Punctuation": /[\u2E00-\u2E7F]/g,
        "CJK Radicals Supplement": /[\u2E80-\u2EFF]/g,
        "KangXi Radicals": /[\u2F00-\u2FDF]/g,
        "Ideographic Description Characters": /[\u2FF0-\u2FFF]/g,
        "CJK Symbols and Punctuation": /[\u3000-\u303F]/g,
        "Hiragana": /[\u3040-\u309F]/g,
        "Katakana": /[\u30A0-\u30FF]/g,
        "Bopomofo": /[\u3100-\u312F]/g,
        "Hangul Compatibility Jamo": /[\u3130-\u318F]/g,
        "Kanbun": /[\u3190-\u319F]/g,
        "Bopomofo Extended": /[\u31A0-\u31BF]/g,
        "CJK Strokes": /[\u31C0-\u31EF]/g,
        "Katakana Phonetic Extensions": /[\u31F0-\u31FF]/g,
        "Enclosed CJK Letters and Months": /[\u3200-\u32FF]/g,
        "CJK Compatibility": /[\u3300-\u33FF]/g,
        "CJK Unified Ideographs Extension A": /[\u3400-\u4DBF]/g,
        "Yijing Hexagram Symbols": /[\u4DC0-\u4DFF]/g,
        "CJK Unified Ideographs": /[\u4E00-\u9FFF]/g,
        "Yi Syllables": /[\uA000-\uA48F]/g,
        "Yi Radicals": /[\uA490-\uA4CF]/g,
        "Modifier Tone Letters": /[\uA700-\uA71F]/g,
        "Latin Extended-D": /[\uA720-\uA7FF]/g,
        "Syloti Nagri": /[\uA800-\uA82F]/g,
        "Phags-pa": /[\uA840-\uA87F]/g,
        "Hangul Syllables": /[\uAC00-\uD7AF]/g,
        "High Surrogates": /[\uD800-\uDB7F]/g,
        "High Private Use Surrogates": /[\uDB80-\uDBFF]/g,
        "Low Surrogates": /[\uDC00-\uDFFF]/g,
        "Private Use Area": /[\uE000-\uF8FF]/g,
        "CJK Compatibility Ideographs": /[\uF900-\uFAFF]/g,
        "Alphabetic Presentation Forms": /[\uFB00-\uFB4F]/g,
        "Arabic Presentation Forms-A": /[\uFB50-\uFDFF]/g,
        "Variation Selectors": /[\uFE00-\uFE0F]/g,
        "Vertical Forms": /[\uFE10-\uFE1F]/g,
        "Combining Half Marks": /[\uFE20-\uFE2F]/g,
        "CJK Compatibility Forms": /[\uFE30-\uFE4F]/g,
        "Small Form Variants": /[\uFE50-\uFE6F]/g,
        "Arabic Presentation Forms-B": /[\uFE70-\uFEFF]/g,
        "Halfwidth and Fullwidth Forms": /[\uFF00-\uFFEF]/g,
        "Specials": /[\uFFF0-\uFFFF]/g
      };

      function findRuns(text) {

        var relevantRuns = {};

        for (var key in unicodeBlockTests) {

          // Count the number of characters in each character block.
          var charCount = text.match(unicodeBlockTests[key]);

          // return run types that used for 40% or more of the string
          // always return basic latin if found more than 15%
          // and extended additional latin if over 10% (for Vietnamese)
          var pct = (charCount ? charCount.length : 0) / text.length;

          relevantRuns[key] = pct;

        }

        return relevantRuns;
      }

      function identify(text, callback) {

        var scripts = findRuns(text);

        // Identify the language.
        if (scripts["Hangul Syllables"] + scripts["Hangul Jamo"] + scripts["Hangul Compatibility Jamo"] >= 0.4) {
          callback.apply(undefined, ["ko"]);
          return;
        }

        if (scripts["Greek and Coptic"] >= 0.4) {
          callback.apply(undefined, ["el"]);
          return;
        }

        if (scripts["Hiragana"] + scripts["Katakana"] + scripts["Katakana Phonetic Extensions"] >= 0.2) {
          callback.apply(undefined, ["ja"]);
          return;
        }

        if (scripts["CJK Unified Ideographs"] + scripts["Bopomofo"] + scripts["Bopomofo Extended"] + scripts["KangXi Radicals"] >= 0.4) {
          callback.apply(undefined, ["zh"]);
          return;
        }

        if (scripts["Cyrillic"] >= 0.4) {
          check(text, CYRILLIC, callback);
          return;
        }

        if (scripts["Arabic"] + scripts["Arabic Presentation Forms-A"] + scripts["Arabic Presentation Forms-B"] >= 0.4) {
          check(text, ARABIC, callback);
          return;
        }

        if (scripts["Devanagari"] >= 0.4) {
          check(text, DEVANAGARI, callback);
          return;
        }

        // Try languages with unique scripts
        for (var i = 0, l = SINGLETONS.length; i < l; i++) {
          if (scripts[SINGLETONS[i][0]] >= 0.4) {
            callback.apply(undefined, [SINGLETONS[i][1]]);
            return;
          }
        }

        // Extended Latin
        if (scripts["Latin-1 Supplement"] + scripts["Latin Extended-A"] + scripts["IPA Extensions"] >= 0.4) {
          check(text, EXTENDED_LATIN, function(latinLang) {
            if (latinLang == "pt") {
              check(text, PT, callback);
            } else {
              callback.apply(undefined, [latinLang]);
            }
          });
          return;
        }

        if (scripts["Basic Latin"] >= 0.15) {
          check(text, ALL_LATIN, callback);
          return;
        }

        callback.apply(undefined, [UNKNOWN]);
      }

      function check(sample, langs, callback) {

        if (sample.length < MIN_LENGTH) {
          callback.apply(undefined, [UNKNOWN]);
          return;
        }

        var scores = {};
        var model = createOrderedModel(sample);
        for (var i = 0, l = langs.length; i < l; i++) {

          var lkey = langs[i].toLowerCase();

          var knownModel = createKnownModel(lkey) || null;

          if (!knownModel) {
            continue;
          }

          scores[lkey] = distance(model, knownModel);

        }

        var scoresArr = [];
        for (var index in scores) {
          scoresArr.push([index, scores[index]]);
        }

        if (scoresArr.length == 0) {
          callback.apply(undefined, [UNKNOWN]);
          return;
        }

        // we want the lowest score, less distance = greater chance of match
        var sortedScores = scoresArr.sort(function(objA, objB) {
          return objA[1] - objB[1]; // sort low-to-high
        });

        // return the best match we've now calculated
        callback.apply(undefined, [sortedScores[0][0]]);
      }

      function createOrderedModel(content) {
        // Create a list of trigrams in content sorted by frequency.
        var trigrams = {},
            sortedTrigrams = [];
        var content = content.toLowerCase();

        var contentArr = content.split("");
        for (var i = 0, l = contentArr.length - 2; i < l; i++) {
          var trigramKey = contentArr[i] + contentArr[i + 1] + contentArr[i + 2] + "";
          if (!trigrams[trigramKey]) {
            trigrams[trigramKey] = 1;
          } else {
            trigrams[trigramKey] += 1;
          }
        }

        // convert object to array
        for (var i in trigrams) {
          sortedTrigrams[sortedTrigrams.length] = [i, trigrams[i]];
        }

        // sort array results
        return sortedTrigrams.sort(function(objA, objB) {
          return objB[1] - objA[1]; // sort high-to-low
        });
      }

      var knownModelCache = {};

      function createKnownModel(key) {
        // Check if known model has been pre-computed in cache
        if (knownModelCache[key]) {
          return knownModelCache[key];
        }

        var data = models[key];
        if (!data) {
          return {};
        }

        // Extract known trigram model data
        var dataArr = data.match(/([\s\S]{1,3})/g);
        // Contruct known trigram object based on provided raw data
        var knownModel = {};
        for (var i = 0, l = dataArr.length; i < l; i++) {
          knownModel[dataArr[i]] = i;
        }

        // Store in known model pre-computed cache
        knownModelCache[key] = knownModel;

        return knownModel;
      }

      function distance(model, knownModel) {
        // Calculate the distance to the known model.
        var dist = 0;

        for (var i = 0, l = model.length; i < l; i++) {

          if (knownModel[model[i][0]]) {

            dist += Math.abs(model[i][1] - knownModel[model[i][0]]);

          } else {

            dist += MAX_GRAMS;

          }

        }

        return dist;
      }
      
         languageDetector.detect = function(text, callback) {
          // Return the ISO 639-2 language identifier, i.e. 'en'.

          if (!text) {
            callback.apply(undefined, [UNKNOWN]);
            return;
          }

          text = text.substr(0, MAX_LENGTH).replace(/[\u0021-\u0040]/g, '');

          identify(text, callback);

        }
        languageDetector.info = function(text, callback) {
          // Return language info tuple (id, code, name), i.e. ('en', 26110, 'English').

          this.detect(text, function(language) {

            if (language === UNKNOWN) {
              callback.apply(undefined, [[ UNKNOWN, UNKNOWN, UNKNOWN ]]);
              return;
            }

            callback.apply(undefined, [

              [ language, IANA_MAP[language], NAME_MAP[language] ]

            ]);

          });

        }
        languageDetector.code = function(text, callback) {
          // Return the language IANA code, i.e. 26110.

          this.detect(text, function(language) {

            if (language === UNKNOWN) {
              callback.apply(undefined, [ -1 ]);
              return;
            }

            callback.apply(undefined, [

              IANA_MAP[language]

            ]);

          });

        }
        languageDetector.name = function(text, callback) {
          // Return the full language name, i.e. 'English'.

          this.detect(text, function(language) {

            if (language === UNKNOWN) {
              callback.apply(undefined, [ UNKNOWN ]);
              return;
            }

            callback.apply(undefined, [

              NAME_MAP[language]

            ]);

          });

        }   
  
  }
});	

require.define("/lib/natural/language/languageDetectorData.js",function(require,module,exports,__dirname,__filename,process){	
	var models = {
		"af":"ie  didieen ingan  envan vang te n dverer e v ge bede  vende in tele dererset oor 'n'n at eersteordaarsie waes e saan onis in e ordee basirinonde wel  isande eeide dom ke  omeri woe gr dalewat void it rd  aalik wet d ope tngsse enduit st leenster ree aiesworg vstan s na prn o meal of  vierdleee k deiteerkik e re pn ve ie neeneliwer of datelnieikes etaage virheiir regedes vur proeleionwete l moe mdaasios d he toentardnge ooeurlleienn bekelinraa niontbesrdivoons n adeldignas sa grniskom uimenop insonaeres o son gig moe kors gesnalvole hgebruiangigeoetar wysligas n w asmetgs deut vaalerwditkenssekel huewedinn t seestikan pntwt ieni kan edoealiemegronte honsigeniergewn hor  maindne ek aatn ' skide tadatskagersoon ks i afteend eelhulneewoorikd vn mre artebrlankkeronaamtrestrkanreeleit ograhetevotandenist dobrutoeolgrskuikrwyminlgeg eg onstr vgtewaawe ansesiesevoeepagel hivinnses ws tteieitpre",
		"ar":" الالعلعرعراراق فيفي ين ية ن االمات من ي ا منالأة ااق  وااء الإ أنوالما  عللى ت اون هم اقيام ل اأن م االتلا الاان ها ال ة وا ارهالاميين وللأمنا علىن يالباد القد اذا ه ا باالدب امريلم  إن للسلاأمرريكمة ى اا ي عن هذء ار اكانقتلإسلالحوا  إلا أبالن مالسرة لإسن وهابي وير  كالة يات لاانتن أيكيالرالوة فدة الجقي وي الذالشاميانيذه عن لماهذهول اف اويبرية ل أم لم مايد  أيإرهع اعملولاإلىابين فختطلك نه ني إن دينف الذيي أي ب وأا عالختل تي قد لدي كل معاب اختار النعلام ومع س اكل لاءن بن تي معربم ب وق يقا لا مالفتطادادلمسله هذا محؤلابي ة من لهؤلكن لإرلتي أو ان عما فة أطافعب ل من عور يا  يسا تة براءعالقواقيةلعام يمي ميةنيةأي ابابغدبل رب عماغدامالملييس  بأ بع بغ ومباتبيةذلكعة قاوقييكي م مي ع عر قاا ورى ق اواتوم  هؤا بدامدي راتشعبلانلشعلقوليان هي تي ي وه يحجراجماحمددم كم لاولرهماعن قنة هي  بل به له ويا كاذااع ت متخاخابر ملمتمسلى أيستيطا لأ ليأمناستبعضة تري صداق وقولمد نتخنفسنهاهناأعمأنهائنالآالكحة د مر عربي",
		"az":"lərin ın larda an ir də ki  biən əriarıər dirnda kirinnınəsiini ed qa tə ba olasıilərın yaanı vəndəni araınıınd busi ib aq dəniyanə rə n bsınvə irilə ninəli de mübirn sri ək  az səar bilzərbu danediindmanun ərə halanyyəiyy il ner kə b isna nunır  da həa binəsinyanərb də mə qədırli olarbaazəcanlı nla et göalıaycbayeftistn ineftləycayətəcə laildnı tinldilikn hn moyuraqya əti aradaedəmassı ınaə dələayıiyilmaməkn dti yinyunət azıft i tllin ara  cə gə ko nə oya danacəkeyiilmirllayliylubn ərilrləunuverün ə oəni he ma on paaladeyi mimalməmətparyə ətl al mi sa əladıakıandardartayii ai qi yiliillisən on qolurlastəsə tantelyarədə me rə ve yea kat başdiyentetihəsi iik la mişn nnu qarrantərxanə aə gə t düamab kdileraetmi bkilmiln rqlar srassiysontimyerə k gü so sö te xaai barctidi erigörgüngəlhbəihəikiisilinmaimaqn kn tn vonuqanqəztə xalyibyihzetzırıb ə məze br in ir pr ta to üça oalianianlaqlazibri",
		"bg":"на  нато  пр зата  поитете а па с отза атаия  в е н даа н се кода от анипрене енио нни се  и но анеетоа вва ване па ооторанат ред неа ди п допро съли принияскитела ипо ри  е  каиракатниените зи со состче  раисто п из сае диники мин миа бавае вие полствт н въ ст тоазае оов ст ът и ниятнатра  бъ чеалне сен ести дленнисо оови об сла ратоконносровще  ре с  спватешеи вието вовестаа ка тдатентка леднетористрстъти тър теа за мад анаенои оинаитима скаслетвотерцияят  бе де паатевенви вити зи инарнововаповрезритса ята го щеалив пграе иедиелииликазкитлноменолираз ве гр им ме пъавиакоачавинво говданди до ед ериерождаитоковколлнимерначо золаон онапраравремсиястит птанха ше шенълг ба сиаробълв ргаре еелнемеикоимако коила лгао дозиоитподресриестот кт мт суст би дв дъ ма мо ни осалаансараатиацибешвъре редвемажави киалицаичекиялито бовоодиокапосродседслут итовувациачеся з во ил ск тр цеамиарибатби брабъд",
		"ca":" dees de la  lael que el coents d qu i en er  a ls nt  pee la d enperci ar ue al  seestat  ests  s  praci unresmens edels as p reles l'na a l ca d'elsa pia ns con letata ci da ara a e noant alt ds i dita re a scoms citaonsstaica por a inprotre pauesambiondesun  mada s sa ian mb  aml de dva pretere ee ca mciaunai encitra teonaos t en el cca ciol p trparr lt ae paqunta soameerar ee sadan as q si haalstes va m icintes ls mi aor  moistectlitm s toir a tespranstrom l sst nts meno r dd'al'aatsrias t tasenrs eixtars nn ltale at part mi lltictenser aqinantra fstiol a qforuraersariintactl'e fir se ttorsi stereca r feis em n dcarbre fo vi analii pix elll mposorml li l acfers resseu e mensaraerisa ssius orttotll porora citanassn costnesraca uverontha  tiitzgrat c n a vrencatnal riquat l dot srmauali ss fn ps vte t i bactetammanl tial faic  veblea nalltzaies s'le ompr c ncrtiit rreficanyon  sar ptur",
		"ceb":"ng sa  saangga nga ka ngan  an na ma nia sa non  pa sia ka m baonga iila mgmgaa piyaa aay ka alaingg mn sg nlan gina ni o sg pn n daag pagg syanayoo nsi  moa bg aailg bhana dasunagya manne pankon il laakaakoanabasko od yo  di ko uga ug kkanla lensurug  aiapaaw d sg dg gilenin iy sueneog ot abaahaas imo kia tagabaneronano kranronsilunausa usa gahianier ha i areryon puininakro to ure ed og wailimo n and o a ad du praroi sma n mulound taaraasaatoawadmue nedminamakmunniysanwa  tu una lbayigaikaitakinlismayos  arad aliamaersipaisamaonimt stin ak ap hiaboagpanoatag igangkagpai mihak slawor rs siytag al at ha hu ima hbu e sgmakaslagmonnahngor sra sabsamsulubauha lo readaakiayabahce d nlabpa paks ns stantawte umaura in lua cabiat awobatdaldlaeleg tg ugaygo habhini ei nkabkaplaylinnilpampaspropulta tonugaugmunt co gu mi pi tia oabuadladoaghagkao artbalcitdi dtodunentg egongugia ibaicein inuit kaa",
		"cs":" pr poní pro nana  přch  je neže  že se do ro st v  vepřese ho sta to vy zaou  a to  byla ce e vistle podí p vle ne sje ké by em ých odovaředdy eníkonli ně str záve  ka sve pit ládohorovroztervláím  kohodnispříský mi ob soa palibudednickkteku o sal ci e til ny né odlovárotsouání bu mo o astbylde ek ost mí taes jedky lasm pnesnímranremrosého de kt ni si výat jí ký mi pretaktany vřek ch li ná pa ředa dlednei pi vly mino no vpoltravalvnííchý přej ce kd lea sa zcene kedseklemikl latlo miénovpraskuskéstitavti ty vánvé y ny sí sí vě p dn ně sp čsa na tak dnídohe be mejnenaestinim znalnouná oviovéovýrskstátí třetů udeza é pém í d ir zvaleaněaveckédene zechen erýhlai siérlovmu nebnico bo mpadpotravroprý sedsi t ptictu tě u pu vvá výšzvýčníří ům  bl br ho ja re s  z  zda vaniatoblabriečneřeh vi nie ilairsitekovnoso oo poceodyohloliovoplapočprára ritrodry sd skossdtelu svatveřvitvlay pálnčssšen al",
		"cy":"yn dd  yn y yddethth  i aetd ych od ol edd ga gw'r au ddiad  cy gy ei o iadyr an bodwed bo ddel n y amdi edion  we ym ar rhodd ca maaeloeddaen addaer h yallei  llam eu fodfydl yn gwynd ai gmaeneuos  ned idoddoln cr hwydwyrai ar in rth fy he me yr'n diaesth chaii did r yy b dy haadai bn ioterottesy gyd  ad mr uncyndauddyedoi ci withlaelland odarydtho a  draidainddodydfyngynholio o awchwybyboych br by di fe na o' peartbyddrogall elaimr n nr arhywn ynn on r caed gd od wgangwyn dn fn onedni o'rr dud weiwrt an cw da ni pa pr wyd edaidimeudgwaiddim irilwyn bnolr orwy ch er fo ge hy i' ro sa trbobcwycyfdiodyneithelhynichll mddn rondpror cr gredrhau au cu yy cymdymryw  ac be bl co osadwae af d pefneicen eoles fergelh ghodiedir lafn hna nydodoofyrddrierosstwtwyydayng at de go id oe â 'chac achae'al bl d cd ldanddeddwdirdlaed elaelleneewngydhauhywi ai fiolionl al iliamedmonn sno oblolarefrn thiun ",
		"da":"er en  deet derde for fo i at  atre det handeereingden me oggerter er siand afor  st ti enog ar il r sigetilke r eaf kke ma påom på ed ge endnget se sler skelsernsigne ligr dska vihar be sean ikkllegenn fstet at drin ikes ng verr bsenedemenr i he etig lanmednd rne da ine tmmeund ome ee mherle r ft fså te  soelet e koestske ble fektmarbrue ael ersretsomtteve  la ud veagee de hlsemanrugselser fi op prdt e in mr m an re saionnerrest igetn soneorbt hvisår  frbile kensindommt m hv jedanentftenin mie oe pn onte kuellnasorer hr kstastodagerikunldemerr ar vrekrert otortør få må toboechee vi divekabns oelse t v al bo unansdreirekøborsoverent bør  kaaldbetgt iskkalkomlevn dn iprir prbrsøgtel så te vaal direjefisgsåiscjerkerogsschst t kuge diag d ag iilll alskn aon samstrtetvar moartashatte bhanhavklakonn tnedr ora rrevesvil el kr ovanne uessfrag ag dintngsrdetra åraktasiem gelgymholkanmnan hnskold",
		"de":"en er  dederie  didiescheincheichdenin te ch  eiungn dnd  beveres  zueitgenund un au inchtit ten daent veand geine mir dhenng nde voe dbermenei mit stterrent d ereren sste see sht desistne aufe aiscon rte re wegesuch fü sobeie enenr sachfürierparür  haas ert an pa sa sp wifortagzu dasreihe hrentesenvor scechetzheilann apd st staeselic ab sigte waitikein engeseitrazen im laartim llen wrderecsetstrteitte nie peheersg dnicvon al pran auserfr etzetüruf ag alsar chsendge igeionls n mngsnisnt ords ssse tüahle bedeem lenn iormprorkeruns dwahwerürk meageattellesthatn bollrafs atsc es fo gr jaabeaucbene negelien ur vre ritsag amagtahrbrade erdheritele n pn vor rbert sicwieübe is übchachie fe meriiedmmenerr astit at stis koarbds gann zr fr wranse t iweiwir br npam besd ddeue ge kefoet eutfenhselten rnpdr brhet wtz  fr ih ke maameangd seilel eraerhh di dkann fn lntsochragrd spdsprtio ar en kaarkass",
		"en":" ththehe ed  to iner ingng  annd  ofandto of  coat on in  a d t hee tiones  rere hat sa st haherthatioor  ''en  whe sentn ts aas foris t t beld e ars  waut ve ll al  mae i fo's an est hi mo se prs tatest tereretednt verd a wise e cectns  only toley r t caatits all nohiss oerscone oearf te wwasonssta'' stin astot h weid th  itce  diaved hcouproad ollry d se m soillctite toreveg tit  ch dehavoulty ulduse alarech me outovewitys chit aithoth ab te wos srest wtine be hncet sy te pelehins inte lile  doaidheyne s w as fr trendsai el ne su't ay houivelecn't yebutd oo ty o ho mebe cale ehadple at bu lad bs hsayt i are fghthilighintnotren is pa shayscomn sr ariny a unn com thi miby d ie de nt o bye rerioldomewheyea grar itymplounoneow r ss ftat ba vobousamtimvotaboantds ialinemanmen or poampcandere llesny ot rectesthoicaildir ndeoseouspresteeraperr oredrie bo lealiarsorerics mstr faessie istlaturi",
		"es":" dede  laos la el es  qu coe las que elue en ent en senteresconest ess d lo prlos y do ón ión unciódelo d poa dacistate adopreto para ea lra al e ese proar ia o e reidadadtrapors p a a paracia pacomno  di inienn lad ante smena con un lasnci trcioierntotivn dn eor s cencernio a sicis e madose ae cempicaivol pn cr eta tere desaez mpro as a ca suion cu juan da eneerona recro tar al anbiee per l cn pompten emistnesntao cso teseral dl mlesntro sorerá s qs ystoa aa raridese qiviliclo n aoneoraperpuer lre renunaía adacasereideminn sndoranrno ac ex go noa tabableeceectl al glidnsionsracriostruerust ha le mi mu ob pe pu soa ialeca ctoe ie uesoferficgobjo ma mplo pobis msa sepstestitadtody s ciandcescó dore meciecoesiintizal elarmienerorcrciriatictor as sice dene re tenderiespialidoinaincmito lomeplirass tsidsuptabuenuesuravo vor sa tiablaliasoastcorcticuedivducensetiimiinileco qoceortralrmarocrod",
		"et":"st  kaon ja  va on ja kose astle es as is ud  sada ga  taajasta ku pea kestistks ta al avaid saamiste val etnud teinn se tua value kiselu ma mes miet ikulinad el imene nna ha in ke võa sa tab e sesi la lie veksemalaslesrjutletsitusupauseustvar läaliarjde etei tigailmkuili tul ei me sõaalatadusei nikpeas ks osalsõnterul või el nea jateendi kitakarkorl olt maaolistivadään ju jä kü ma po ütaasaksat ed erihoii ska la nnioidpairitus ütl aa lo to vea eadaaidamianddlae jegagi gu i pidlik inijupkalkaskeskohs es pselsseui  pi siaruedaevafili vidainglääme na ndanimoleotsriss lsiat p en mu ol põ su vä üha la pagaaleapsarve aelaikalleloomalpett kteetisvatäneõnn es fi via ia oaabaapalaaltamaanue pe tealelihaahinivakonku liklm minn toduoonpsari si stut et sti uleuurvasvee ki ni nä raaigakaallatue eeisersi eii iisil imaitskkakuhl klatmajnduni niiomaoolrsoru rvas tseksonstet mtajtamudeuhovai ag os pa re",
		"eu":"en an etata  etizan eko ide baa egiz es giarrbidrenrriarela sku beasuesksuntas izeanekoelaik kubn an itzaubiza zan era baskeran brretentze as koa aa galdanide deeea ek katkonn dontuan du naataegiestk enikntuntzskatua de di ez hea da kak akiakoartatuazibatberitzkunn ho briartetatunezar al ar haakuatzbaidardeadeleenemaerriakiarin inakianarnazneao eorrra stetekzakzekzio da em hi ho ma oiaguateaurbesdindirdutertez eziharherhitia ienikaio ireitek bk gkidkorldan onkoo aoinorirakrearierikrratanteatu unaundunturrutez ezko au eg gu ir ki ora ha jabeagiai ailaitapearideze eeareekerdereezaezkgirgithori eianiekilainkintiraitaituk nkapkoakumlanldemaimanmenn gn una ntao hoa oropenrdiri rtastateltettiktuetziumeun uztzeazenziazin az bi bu el ga jo mu ti un za zia na oa sa ta zabaadiakealaandar audbakbalbegbehbuldaudendu duie be de he oeakeetehaelkenbeteetigabgingo gusgutguzhauibeinbineioairuiuriziizkizo",
		"fa":"ان ای ه ا اي دربه  بردر ران بهی ااز ين می  ازده ست است اس کهکه ايرند اين هايراود  راهای خوته را رایرد ن بکرد و  کرات براد کمانی د انخواشور بان ا ساتمیری اتما اواه ات عراق ر مراقعرای ب تا توار ر ان مه بور يد ی ک ام دا کناهدهد  آن می ني گفد اگفت کشا بنی ها کشو روت کنيوه موی ی ت شوال دارمه ن که ديه  ماامهد بزاروراگزا پيآن انتت افت ه نی خاماباتما مللنامير ی می ه آم ای منانسانيت دردهسازن دنه ورد او بي سو شدادهاندبا ت بر بز ازماستهن ره سوانوز ی ری س هساباام اورتخاخابخودد ددن رهاروزرگزنتخه شه ههستيت يم  دو دي مو نو هم کااد اریانیبر بودت هح هحالرش عه لی وم ژان سلآمراح توسداددامر دره ريکزی سلاشودلاحمريننده عيمايکاپيمگر  آژ ال بو مق مل ویآژاازمازیباربرنر آز سسعهشتهماتن آن پنس ه گوسعيانيومکا کامکند خا سرآورارداقدايمايیبرگت عتن خت د ور خرک زيرفتهقدال تمينن گه آه خه کورکويويوريوييی ک تی ش اق حا حق دس شک عم يکا تا دارجبينت مت وتايدستر حر سرناز بشکالل م کمز ندانواو اورهون ونديمز آو اع فر مت نه هر وز گز",
		"fi":"en in an on istta ja n tsa staaann p onssattatä  ka pasi  jan kllaän eenn vksiettnentaattä vaillitt jo kon s tuia  sua paa la llen mle ttena  ta veat  viutt saisesen ku nä päste ola taismaati a ooitpää pia valaineisiteltti sia kalliinkinstäuomvii ma seenä mua sestisslläloklä n jn otoivenytt liainet inan an nollplotenuställään todenmenokisuosä tääuksvat al ke tea eliitaiteiäisää  plelli tideikkki ntaovaystyt ä päyt ha pe täa naiki pi vnytnäypalteeun  mea messkaupaistuut voi eta heishtei oiikitajoumisninnutsiassävan ty yhaksimeloime n en hn loinomeottouksitstitettieukkä k ra tiajaasientigaiigitejankaakselaalanli näjoletiiusiäjä ova aantavaei erikankkulailisläimatoispelsilstytajtavttutyöyösä o ai pua ja laalarvassienimiimmitäka keskueleelinllooneri t ot ptu valvuo ei he hy my voalialoanoastattaukelielyhtiikakenkkilysminmyöohtomatusumiyksät äälös  ar eu hu naaatalkaluansarjennhankuun ysetsim",
		"fr":"es  dede  leentle nt la s d laionon re  pae le d l'e p co prtions  enne quer llesur en atiue  po d'par a et it  qumenonste  ett d redes unie s l supou au à coner  noaite cse té du  du déce e eis n ds a soe re sourresssieur seemeestus surantiqus puneussl'aprotertreendrs  cee at pun  ma ru réousrisrussseansar come mirencentet l av mo teil me onttena pdanpasquis es s inistllenoupré'unaird'air n eropts  daa sas au denmaimisorioutrmesiotteux a dienn antrommortouvs csontesverère il m  sa vea raisavadi n pstiven miainencforitélaroirremrenrroréssiet atur pe tod'uellerrersideineissmesporransitst t rutivaié lési di n' éta casse tin ndeprerats mstetaitchui uroès  es fo tr'adappauxe àettitilitnalopér dra rairors rtatutéà l afancaraartbrechédree fenslemn rn tndrnneonnposs ttiqure tualeandaveclacoue nembinsjoummerierèssemstrt iuesuniuveé dée  ch do eu fa lo ne raarlattec ical al'ol'émmintaormou r urle",
		"ha":" dada in an ya  wa yana ar a d mawa a aa ka s tawan a  ba kata a yn d ha na su sakinsa ata koa tsu  gaai  sha muwaiyama a wasayanka anishia ba ha camaba nann a muana yia g zai d kuakayi n kannke tar ciikin sko  raki ne a zmathaknine dnnaumandaa nadacikni rinunaarakumakk ce dumann yncisarakiawaci kankararin mandhi n tga owaashkamdanewansaaliami ab doancn rayai nsunuka al nea'acewcinmastakun abakowa rra  ja ƙaen r dsamtsa ruce i aabiidamutn gn jsana ƙharon i msuk ak jiyar'yakwamin 'yanebaninsruwi kn h adaken wshautu ƴabaytanƴanbinduke mn nokayinɗan faa ikkire za alaasuhani ymarranƙasaddarsgabirammau d tsabbabuagagarn b ɗaaciaikam dune si bi wkaskokwam amamfbbadinfangwai swatanoaredaiirima' laalldamikami shetumuni an ai ke kidagmaimfano nsuo dsakum  bi gw kwjamyyaa jfa uta hu'a ansaɗaddahinniyr sbatdargani tntaokiomisala lkacllawadwarammdomr mrassai loatshalkatli lokn cnartinafabubi gisamak",
		"haw":" kana  o ka  ma a  laa ia m i la anaai ia a oa ka ho k kea ai k ho iaua  na mee ke aau ke ma maiaku akahi ha ko e a l nome ku akakanno i aho ou  aii oa po lo aamaa n ani mhani iihokoune  iho iikionahoole e h heina waea akou ikahoe i lu a pahoie ierako u mkuamakoi kaii na ehinane oli hmeawahlake mo nu likaki a wmalhi e nu ohik kue lelera berineabeainalalo  pokon abolehe paumahva elakaunak oekeioia ieram oioa ehohoviehova uaunaarao sawao onauu nwa waihel ae alae ta aik hialeilalelalieikoloonu loauae oolahonmamnan auahalaunuaohooma aoii aluimamauikeapaeloliipoeaianoa ino moka'u ahoei ekaha lu neiholinoo eemaiwaoluadanaapa u kewahualamluao hooku h liahuamuui  il mo seeialaw hu ikaile pli lunuliio kiknohu e saaawaweenahalkollan le nea'uilokapokosa  pehoploaopepe  ad puaheaolia'lailohna'oomaauerikulwe akekeklaari ikukaklimnahnernuionoa udamkumlokmuaumawalwi 'i a'iaanaloetamu oheu pulauwa nuamo",
		"hi":"  हैमें मेने की के है  के की कोों को ा ह कासे ा के कं कया  कि सेका ी क ने औरऔर ना कि भी ी स जा परार  करी ह होही िया इस रहर कुनाता ान े स भी राे ह चु पापर चुननाव कहप्र भाराजहैंा सै कैं नी ल कीं ़ी था री ाव े ब प्क्षपा ले  देला हा ाजप था नहइस कर जपानहीभाजयोंर सहीं अम बा मा विरीकिए े प्या हीं मकारा जे ल ता दि सा हमा ना माक़्ता एक सं स्अमरक़ीताजमरीस्था थार् हुइराएक न कर मराकी जी न इर उन पहकहाते े अ तो सुति ती तो मिलिक ियो्रे अप फ़ लि लो समम कर्टहो ा चाई ानेिन ्य  उस क़ सक सैं पं हगी त कमानर नष्टस कस्ताँ ी बी म्री दो मि मु ले शां सज़ात्रथी लिएसी ़ा ़ारांगे दे म्व  ना बनंग्कांगा ग्रजा ज्यदी न मपारभा रहीरे रेसली सभाा राल ी अीकीे तेश  अं तक याई हकरनतक देशवर्ायाी भेस ्ष  गय जि थी बड यह वांतरअंतक़ गयाटी निकन्हपहलबड़मारर परनेाज़ि इी रे जे व्ट ्टी अब लग वर सीं भउन्क ककियदेखपूरफ़्यह यानरिकरियर्डलेकसकतहोंहोगा अा दा पाद ाराित ी ती पो को द ते नि सर हां दअपनजानत मथितपनीमहलर हलोगव कहनाहल हाँाज्ानािक्िस्",
		"hr":"je  na pr pona  je zaijene  i ti da  ko neli  bi da u ma mo a nih za a sko i sa pkojproju se  goostto va  do toe ni p od rano akoka ni  ka se mo sti nimaja privatsta suatie pta tske inij trcijjennoso s izom troiliitipos ala ia oe sijainiprestrla og ovo svektnjeo podirva nialiminrija ta zatsivao tod ojera  hra ma uhrvim ke o ioviredrivte bi e ogodi dlekumizvodine uenejedji ljenogsu  a  el mi o a daluelei uizvktrlumo doriradstoa kanjavae kmennico joj oveskitvrunavor di no s  ta tvi ii okakrošskovod sa ćea badiamoenigovijuku o noraravrujsmotavtruu pve  in placibitde dišemai mikaištjerki mogniknovnu ojioliplapodst stitratrevo  sm štdane zi tio istkonlo stvu sujeustće ći što dr im liadaaftaniao arsatae temoi kinejemkovlikljimjenafnernihnjaogooizomepotranri roirtkskateru iu ovi vrt me ugak amadrže ee ge mem emeenjenter ereergeurgo i bi zjetksio uodaonaprarebremroptrižav ci eu re te uv veajuan ",
		"hu":" a  az szaz  meen  el hoek gy tt ettsze feés  kitet beet ter kö éshogmegogysztte t azeta mneknt ségszáak  vaan ezera ta  miintköz iseszfelminnakorszer tea aa kis  cseleer mensi tekti  necsaentz ea talaerees lomltemonondrszszattezágány fo maai benel eneik jeltásáll ha le álagyaláiszy azteás  ale aegyelyforlatlt n aogaon re st ságt mán ét ült jegi k aküllamlenlásmáss kvezásoözö taa sa vaszatáetőkezletmagnemszéz mát éteölt de gy ké mo vá éra ba famiat atoattbefdtagyahati slasndtrt szot ktártésvanásáól  bé eg or pá pé vebanekeeküelőervetefogi akisládntenyenyiok omáos ránrássalt evályarágoálaégeényött táadóelhfejhethozilljárkésllomi ny ontrenresrins as esszzt  ez ka ke ko rea ha ndendó efogadgatgyehelk eketlesmánndenisozzt bt it étattosvalz ozakád ályáraésiész ak am es há ny töakaartatóaztbbeberciócsoem etietégali tiniistja kerki korkozl éljályen vni pálrorrólrüls cs ps ss vsokt jt ttartelvat",
		"id":"an  mekanangng  pemen di ke da seeng benganya teah beraka yadandi yann ppera mita pada ataadaya ta  inalaeriia a dn kam ga at eran dter kaa pariembn mri  baaanak ra  itaraelani aliranar erulaha basiawaebagann b hainimer la miandenawan saahalamn inda waa iduag mmi n arustelyak andalh di singminnggtakamibebdengatianih padrgasanua  dea targdareluhari ki mi pikain inyitumban tntupanpensahtantu a kbaneduekag dka kerndentaorausa du maa sai antbasendi dirakamlann sulial apaereertliamemrkasi talung aka aa waniaskentgarhaai iisakedmbeskatoruanuk uka ad toasaayabagdiadunerjmasna rekritsihus  bia hamadibersg shanik kemma n lnitr brjasa  ju or si tia yagaanyas culemeemuenyepaerberlgi h mi akelli melniaopartasiatahulaun unt at bu pu taagialuambbahbiser i tibeir ja k mkarlailallu mpangknjaor pa paspemrakriksebtamtemtoptukuniwar al ga ge ir ja mu na pr su unad adiaktannapobelbulderegaekeemaempeneenjesa",
		"is":"að um  aðir ið ur  ve í na  á  se er ogar og ver miinnnn  fyer fyr ek en ha heekk stki st ði  ba me viig riryri umg flegleins ð s ei þain kkir hr segieinga ingra sta va þeannen milsemtjóarðdi eithafillinsistlljndir ar esegun var bi el fo ge yfandaugbaubigegaelderðfirfooginittn snginumod oodsinta tt viðyfið eð f hr sé þva ea áem gi i fjarjórljam er áreirstrðarðirðustjundvegví ð vþaðþví fj ko sleikendertessfjáfurgirhúsjárn eri tarð þðarðurþes br hú kr le upa seggi sirtja kiðlenmeðmikn bnarnirnunr fr vriðrt stit vti unauppða óna al fr gra vallan da eiðeð fa frag egergiðgt hanhefhelherhrai ai ei vi þikijónjörka królíkm hn angar lramru ráðrónsvoviní bí hð hð kð mörð af fa lí rá sk sv tea ba fa ha ka uafiagnarnastberefuennerbergfi g agariðskerkkelanljólltma miðn vn ínanndanduniðnnannunu r orbergislösé t at htiltinuguvilyggá sð að bórnögnöku at fi fé ka ma no sa si ti áka ma ta ía þafaafsaldarf",
		"it":" dito la  dedi no  core ione d e le delne ti ell la unni i dper peent inonehe ta ziocheo da dna atoe s soi sllaa pli te  al cher  pa siconsta pra c seel ia si e p dae ii pontanoi callazinteon ntio s rii ao aun  anarearie ai eitamenri  ca il no poa santil in a laticiae cro annestglità  que lnta a como cra  le nealiereist ma è io lleme eraicaostprotaruna pida tat miattca mo nonparsti fa i  re suessinintoo lssittoa eamecolei ma o iza  sta aaleancanii miano ponisiotantti loi rociolionaonotra l a reriettlo nzaquestrtertta ba li teasse fenzfornnooloorirestor ci voa ial chie nliapreriauniver spimol al cransensoctic fi moa nce deiggigioitil slitll monolapacsimtituttvol ar fo ha saacce riremanntrratscotrotutva  do gi me sc tu ve via mbercanciti lieritàlliminn pnatndao eo fo uoreoroortstotentivvanartccoci cosdale vi iilainol pn cnitoleomepo riosa  ce es tra bandataderensersgi ialinaittizilanlormil",
		"kk":"ан ен ың  қа баай ндаын  са алді арыды ып  мұ біасыда най жамұнстағанн бұна боныңін ларсын деағатан көбірер меназаындыны меандеріболдыңқазатысы тынғы  кеар зақық алаалыаныараағыгентартертырайдардде ға  қобарің қан бе қыақсгердандарлықлғаынаір іріғас таа бгі едіелейдын кн толарыніп қстқтаң б ай ол соайтдағигелерлыпн аік ақтбағкенн қны ргерғаыр  аралғасабасберге етіна ндене нигрдыры сай ау кү ни от өзаудеп ияллтын жн оосыотырыпрі ткеты ы бы жылыысыі сқар бұ да же тұ құадыайлап атаенійлан мн сндындір мтайтіны тыс інд биа жауыдепдіңекеерийынкеллдыма нанонып жп ор бриярлаудашылы аықті аі біз ілің қ ас ек жо мә ос ре сеалддалдегдейе бет жасй блаулдаметнынсарсі ті ырыытаісің аөте ат ел жү ма то шыа аалтамаарластбұлдайдықек ельесіздікөтлемль н еп ар аресса та ттетұршы ы ды қыз қыт ко не ой ор сұ түальареаттдірев егіедаекіелдергердиядкеркетлыслісмедмпин дні нінп тпекрелртарілрінсенталшілы кы мыст",
		"ky":"ын ан  жаен да  таар ин  каары ал ба билар бо кыалан к сандагантар деандн б кеардменн таранын да мекыр чен ары  когендаркенктауу енеери шаалыат на  кө эматыдандепдынеп ненрын беканлуургытаншайыргүн  ар маагыактаныгы гызды рдаай бирболер н сндыун ча ында кагаайланаап га лгенчап крдытууыны ан өзамаатадинйт лгалоооо ри тиныз ып өрү па эка балгасыаштбизкелктетал не суакыентиндир калн дндеогоондоюнр бр мрансалстасы ураыгы аш ми сы туал артборелгениет жатйлокарн могуп ап жр эсынык юнч бу ура аак алдалубарбербоюге донегиектефтиз катлдын чн эн өндонефон сатторты удаул улаууды бы жы кыл ынаэкеясы ат до жы со чыаасайтастбаабашгаргындө е бек жыли бик ияскызлдалыкмдан жндини нинордрдостота терттитуртынуп ушуфтиыктүп өн  ай бү ич иш мо пр ре өк өта да уа эаймамдаттбекбулголдегегеейтелеенджаки киниириймактоликмакмесн ун шнттол олопарракрүүсырти тикттатөру жу сшкаы мызыылдэмеүрүөлүөтө же тү эл өна жады",
		"la":"um us ut et is  et in qutur presttio auam em aut dientin dict e esur atiionst  utae qua dent  su siituuntrumia es ter rentiraes equiio proit peritaoneiciius cot dbuspram e noeditiaue ibu se ader  fiiliquet ide oru teali peaedcitm dt stattemtist pstite cumereium exratta conctionira s i cu saeninisnteeriomire s aminos ti uer ma uem snemt m mo po uigenictm iriss st auae dom at c geas e ie pne  cainequos p ale enturo tritusuitatuiniiqum postresura ac fua eantnesnimsuntrae as d pa uoecu om tuad cutomns q eiex icutoruid ip mee seraeruiamideips iua sdo e deiuicaim m cm utiu hocatistnaton ptiregrits tsicspe en spdiseliliqlismenmusnumpossio an grabiaccectri uan leeccetegranonse uenuis fa tratee cfilna ni puls fui at ccedami einalegnosoripecropstauiaeneiueiuisiut tt utibtit da nea dandegeequhomimulorm mmnindonero er esittumutua pbisbitcerctadomfuti signintmodndunitribrtitasund aberrersiteitim to p",
		"lt":"as  pa kaai us os is  ne irir ti  prausinis ppasių  ta viiau ko sukaio pusi savo taialitų io jo s kstaiai bu nuiusmo  poiens stas meuvokad iš lato aisie kururi kuijočiaau metje  vaad  apand gr tikalasii pičis is vinko nės buvs a gaaipavimaspritik reetujos daentoliparantarataramagalimoiško s at be į mintin tus n jodarip rei tedžikasninteivie li secijgarlaiartlaurasno o ktą  arėjovičigapravis namenokirašs tietikaintkomtamaugavories b steimko nuspolriasauapime ne sik šii nia iciojasakstiui amelieo tpiečiu di pegriioslialins ds gta uot ja užauti sinomą ojeravdėlntio atojėl  to vyar inalico vseisu  mi pidiniš lansi tus baasaataklaomitat an jialsenajų nuoperrigs mvalytačio rai kliknetnė tistuoytięs ų sadaarido eikeisistlstma nessavsiotau kiaikaudiesoris rska geasteiget iamisamisnamomežiaabaaulikrką ntara tur madieei i tnasrinstotietuvvosų p dėareatsenėiliimakarms niar prods l o e pes ideik ja ",
		"lv":"as  la pa nees  unun  ka vaar s p ar viis ai  noja ijaiemem tu tievielataksienkstiess arakatvtvi ja pika  irir ta  sats  kāās  tiot s n ie taarīparpie prkā  at raam inātā  izjaslai naautiešs s ap ko stiekietjauus rī tikībana  gacijs i uzjums vms var ku majā stas u tādiekaikasska ci dakurlietasa peststāšannesnies ds mval di es reno to umuvaiši  vēkumnu ries tām ad et mu s l beaudturvijviņājubasgadi nikaos a vnototistsaiku aā aāk  toiedstuti u pvēlāci šogi ko pros rtāju su vvisaunks strzina aadīda darenaicikranasstīšu  mēa necii sie iņaju lasr tumsšiebu citi ainama pusra  au se sla saisešiiecikupārs bs ksotādā in li tranaesoikrmanne u k tuan av betbūtim isklīdnavrasri s gstiīdz aiarbcindasentgali plikmā nekpatrētsi traušivei br pu skalsamaedzekaešuiegjiskamlstnākoliprepēcrottāsusiēl ēs  bi de me pāa iaidajāiktkatliclodmi ni prirādrīgsimtrāu lutouz ēc ītā ce jā sva tagaaizatuba ciedu dzidzī",
		"mk":"на  ната атаија прто ја  заа н и а сте ите коот  де поа дво за  во од се несе  доа вка ањеа по пувација оициетоо нанини  влдекекањетќе  е а за иат влаго е нод пре го да ма ре ќеалии ди ниотнатово па ра соовепраштоње а еда датдоне ве де зе сконнитно ониотопарпристат н шта кацива вање пенила ладмакнесноспроренјат ин ме тоа га ма ракеаковорговедоенаи ииракедне ницнијостра ратредскатен ка сп јаа тадеарте ге икатласниоо сри  ба биаваатевнид ндендовдрждуве оен ереерии пи синакојнцио мо ооднпорскиспоствститвоти  об ова балнарабаре кед ентеѓуи оии меѓо дојапотразрашспрстот дци  бе гр др из стаа бидведглаекоендесеетсзаци тизаинсистки ковколку лицо зо иоваолкореориподрањрефржаровртисо торферценцит а  вр гл дп мо ни но оп ота ќабоадаасаашаба ботвааватвотги граде диндумевредуеноераес ењеже заки вилаитукоакоиланлкуложмотндунсто воа оалобров овиовнои ор ормој ретседст тертијтоафорцииѓу  ал ве вм ги ду",
		"mn":"ын  байн байийнуул улулсан  ханийн хгаасыний лсы бой бэн ах болол н боло хэонгголгуунгоыг жил молаглламон тє хуайдны он санхий аж орл ун тулгайгдлыйг  задэсн андэулаээ агаийгvй аа й алынн з аю зєаарад ар гvйзєважиал аюуг хлгvлж сниэснюулйдллыгнхиуудхам нэ сагийлахлєлрєнєгч таилллийлэхрийэх  ер эрвлєерєийллонлєгєвлєнх хоариих ханэр єн vvлж бтэйх хэрх vн ньvндалтйлєнь тєр га суаандааилцйгул алаан нрууэй  тон срилєриааггч лээн орэгсууэрэїїл yн бу дэ ол ту шиyндашиг тиг йл харшинэг єр  их хє хїам ангин йгалсан vн еналнд хууцааэд ээрєл vйладаайналаамтгахд хдалзарл бланн дсэнуллх бхэр бv да зоvрэаадгээлэнн ин энганэ талтынхурэл  на ни онvлэаг аж ай атабарг бгадгїйй хлт н мна ороульчинэж энэээдїй їлэ би тэ энаныдийдээлаллгалд логль н ун їр бралсонтайудлэлтэргєлє vй в  гэ хvарабvрд нд ол хлс лтын гнэгогтолыоёрр трээтавтогуурхоёхэлхэээлэёр  ав ас аш ду со чи эв єраалалдамжандасувэрг удвэжvvлцалэл",
		"no":"er en et  dedet i foril  fo meingom  ha ogter er ti stog tilne  vire  en sete or de kkeke ar ng r sene soe sderan somsteat ed r i av inmen at ko påhar sierepå ndeandelsetttteligt sdent iikkmedn srt serskat ekersenav lerr atene fr er tedeig  rehanllener bl frle  vee tlanmmenge be ik om å ellselstaver et sknteoneorer dske an ladelgenninr fr vse  poir jonmernenommsjo fl saernkomr mr orenvilalees n at f leblie ee ie vhetye  iral e oideitilitnnerant otaltattt  kaansasjge innkonlsepett dvi  utenteriolir pretrisstostrt a gaallapeg sillirakapnn oppr hrin br ope mertgerionkallsknes gj mi prange he reltenni sistjenkanlt nalrestorassdree be pmeln tnseortperregsjet pt v hv nå vaannatoe aestiseiskoilordpolra rakssetoi grak eg eleg aigeighm en fn vndrnskrert mundvarår  he no nyendeteflyg igheierindintlinn dn prnesaksiet btid al pa trag dige de kessholi dlagledn en in oprir bst  fe li ryairaked seasegi",
		"ne":"को का मा हरु नेनेपपालेपा समले  प्प्रकारा सएको भए छ  भा्रम गररुक र भारारत का विभएकालीली ा पीहरार्ो छना रु ालक्या बाएकाने न्ता बाकोार ा भाहर्रोक्षन् ारी निा नी स डुक्रजनायो ा छेवा्ता रात्यन्दहुना कामाी न्दा सेछन्म्बरोतसेवस्तस्रेका्त  बी हुक्तत्ररत र्नर्या राकाुको एक सं सुबीबबीसलकोस्यीबीीसीेकोो स्यक छन जन बि मु स्गर्ताहन्धबारमन्मस्रुललाईा वाई ाल िका त् मा यस रुताकबन्र बरण रुपरेकष्टसम्सी ाएकुकाुक् अध अन तथ थि दे पर बैतथाता दा द्दनी बाटयक्री रीहर्मलकासमसा अा एाट िय ो पो म्न ्ने्षा पा यो हाअधिडुवत भत सथा धिकपमाबैठमुदया युकर नरतिवानसारा आा जा हुद्ुपमुलेुवाैठको ब्तर्य ्यस क् मन रहचारतियदै निरनु पर्रक्र्दसमासुराउनान ानमारणालेि बियोुन्ुरक्त््बन्रा्ष  आर जल बे या साआएकएक कर्जलसणकात रद्रधानधि नकानमानि ममारम रहेराजलस्ला वारसकाहिलहेका तारेिन्िस्े सो नो रोत ्धि्मी्रस दु पन बत बन भनंयुआरमखि ण्डतकातालदी देखनियपनिप्तबतामी म्भर सरम्लमाविशषाकसंया डा मानकालमि भित ी पी रु भुनेे गेखिेर ो भो वो ह्भ ्र  ता नम ना",
		"nl":"en de  deet an  heer  van dvaneenhet geoor eeder enij aargente ver in meaanden weat in  da teeerndetersten v vo ziingn hvoois  optie aaedeerders beemetenkenn e ni veentijnjn meeietn wng nie ischtdatereie ijkn brdear e be amett del ondt h ale wop ren di onal andbijzij bi hi wior r dt v wae hllert anghijmenn an zrs  ome oe vendestn tpar pa pr zee ge pn pordoudraascht eegeichienaatek lenn mngent overd wer ma midaae klijmern gn oom sent bwij hoe melegemhebpenude bo jadiee eelierkle prorij er zae densindke n knd nennter hs ds et z b  co ik ko ovekehouik itilanns t gt m do le zoamse zg vit je ls maan inkerkeuit ha ka mo re st toagealsarkartbene re sertezeht ijdlemr vrtet pzegzicaakaalag alebbech e tebberzft ge ledmstn noekr it ot wteltteuurwe zit af li uiak allautdooe ieneergetegesheejaajkekeekelkomleemoen sortrecs os vtegtijvenwaawel an au bu gr pl ti'' adedage lecheeleftgergt ig ittj dpperda",
		"nr":"okula ngaa n ngna amaa iko  ukelelo elaanga ua kukuaba kuwa enzlelho ni ngoathphaethkhaanaisange nao nthoe ntheha esinyekwetjh kwise uma a nele hlaa elanbenndl noimiundungthinziye isiutho eebehetkutandsa elofunekosebbanuluakaeliwene i ameniba we nel wekuflwai n iszi  lokwalokelwgokonalekhi li ganbon iiingka o iakhanethuulakelmth imga  lendafannoki kendsi o waphhate ualakublunikho lezia lo usisnamemi abhulkus wosekazikhoiini uasiloliniuphuhlkhuno o yakoa bi eo ki l bemal yei indeiphmelekethakunngie kengo s yoso ma mkhjhaiswlwe ezdi a we akulunyumeza anyahlkuheen siiliitjzokihl eske hlohakpheluldlelukda ekaamb sezismbihondlaakujenzin bahami a boo aaliuseilesikhanwokokhhlunyasitanikuzo oufaswaindzaknislisgabmi  em koano elhwaufua ywo  inlimtlokatwakkanthwo zithndiyokyo mitmisaboekuhabinynanezekhealolu manhe ezokupubu zogamhelwanombamknzaolahumkukdu  lakomi yobui boduokwgap kabe  ilaluatje b",
		"nso":"go  go le a le  dia gya lo  yaa mka  kala  t o ya ta kba et wa  mo e a b se ba ma boe gt a o a lo tna o la delodi a so go keleo ang t eo bmo e te megoeo e lngwse e bkgoela wa gae kagoo m kgga ditolot he do d yeanelelwe  tlthuona tht whutanatlawanabaola megware ongt olaoe so sa yaloseta pi aenga ao etho kegwe hahloedi laao  tsakahlaalaswa we bjo ogoragahabgobletke diksa  i oba hlthedira nithbjaye no  samollwati manolee etseo woreto at ethe ykantshgonnetanokarge ho lok sw nai bdipi ooka ge omko emopelnt e amellegtlhme etephea eo no iwalokonyabolodiwegte e nta anyyeokgapolangri it uto mmitiareo fha gatothikao h itsheathaleiriphaahl teohltha rebonlha phdin pero mi omii t faaroasei lne lalogokol wot iomo bemogmoklenilelwema utanseamoa o feokgja pannagekgi iapagetlonra aem yoatltlokeltel kh poe oa wenti ebo ganhetmala fotlutiogasenkwamaeekammekgejala ringlekseplagofewagg yrolepeekoboko padilog",
		"pl":"ie nieem  ni po prdzi naże rzena łemwie w  żego  byprzowaię  do siowi pa zach egoał sięej wałym aniałeto  i  to tee p je z czybyłpanstakie jado  ch cz wiiała ppow mili enizie ta wało ać dy ak e w a  od stniarzyied ktodzcieczeia ielktóo ptórści sp wyjaktakzy  moałęproskitemłęs tre mjesmy  roedzeliiej rza nalean e sestle o si pki  coadaczne te zentny prerząy s ko o acham e no tolipodzia go kaby iegiernośrozspoychząd mnaczadzbiechomnio nostpraze ła  soa mczaiemić obiył yło mu móa tacjci e bichkanmi mieoścrowzenzyd al rea wdenedyił ko o wracśmy ma ra sz tye jiskji ka m sno o zrezwa ów łowść  obecheczezyi wja konmówne ni nownympolpotyde dl sya sakialidlaiczku oczst strszytrzwiay pza  wtchcesziecim la o msa waćy nzaczec gda zardco dare rienm nm wmiamożrawrdztantedtegwiłwtey zznazłoa rawibarcjicządoweż gdyiekje o dtałwalwszzedówięsa ba lu woalnarnba dzoe chodigiligm pmyśo conirelskustey wystz w",
		"ps":" د اؤ  اؤنو ې دره  پهنه چې  چېپه ه دته و اونوو د اوانوونهه ک داه ادې ښې  کېان لو هم و مکښېه مى ا نو ته کښرونکې ده له به رو  همه ووى او توندا  کو کړقام تررانه پې وې پ به خوتو د دد اه تو پيا  خپ دو را مش پرارورې م دمشر شو ورار دى  اد دى مود پلي و ک مق يوؤ دخپلسرهه چور  تا دې رو سر مل کاؤ اارهبرومه ه بو تپښت با دغ قب له وا پا پښد مد هلې ماتمو ه هوي ې بې ک ده قاال اماد نقبره نپار اث بي لا لراثاد خدارريخشرامقانۍ ه ره لولويو کوم دد لو مح مر وواتواريالواندخاند تسې لى نورو لي چړي ښتوې ل جو سيام بانتارتر ثارخو دو ر کل دمونندېو نول وه ى وي دې اې تې ي حک خب نه پوا دتې جوړحکمحکوخبردانر دغه قافمحکوالومتويلى دى ميرهپر کولې ه تي خا وک يا ځاؤ قانۍبى غو ه خو بودايدوړې کال بر قد مي وي کرؤ مات اييتى تياتيرخوادغودم ديمر وقديم خمانمې نيونږ ه يو سو چوانوروونږپورړه ړو ۍ دې ن اه زي سو شي هر هغ ښااتلاق انيبريبې ت اد بد سر مرى عرالانمى نى و خوئ ورکورېون وکړى چيمهيې ښتنکه کړيې خے ش تح تو در دپ صو عر ول يؤ پۀ څوا ا",
		"pt":"de  deos as que coão o d quue  a do ent sea ds de aes  prra da  es pato  o em cono p doestnteção da rema par tearaida e adeis  um poa aa pdadno te  noaçãproal come ds a asa cer mens eaisntoresa sadoists pteme ce sia o so ao ce pstata traura di pear e eserumamosse  cao e naa edesontpor in maecto qrias csteverciadosicastr ao emdase titoizapretos nãadanãoesseveor rans ns ttur ac faa renserina sso si é braespmo nosro um a nao icolizmino nonspritenticões tra magae niliimem ancinhantaspetivam anoarcasscere oeceemoga o mragso são au os saalica emaempiciidoinhissl dla licm cmaioncpecrams q ci en foa oamecarco dereirho io om orar asenter br exa uculdeve uha mprnceocaoverios osa semtesunivenzaççõe ad al an mi mo ve à a ia qalaamoblicencolcosctoe me vedegásiasitaivandoo torer dralreas fsidtrovelvidás  ap ar ce ou pú so via factarrbilcame fe iel forlemlidlo m dmarndeo oomoortperpúbr ureiremrosrressi",
		"pt-br":"eq ent enq eq ig eg ing  ididantete  es inadeag dadde ia ing br saestinqlinmo nq o aseq co li ni o a aa cadoasibradoriq ntao bor q nrassilstrta treus  a  ag an ca e  eq g  i  ir nc q  se veantar ciacone aeirel ig iliimoio ir ncio tro vel ap bo de fr tra ba ea ga vapoas busca cetcindese be setafrei aibuil irola liqnibntio co qos ra re reqs as ssansimtarto ult ba ci el em fi gr gu ia mu pe po re ri si su te via oa sabealcandaraargaribenboccarco do e fe ge le oem emoen es espexeficg ng sgraguaiasicaidiilaileinhl bl eleiloqmosmulnadniont ntoo go roceontoq posq vr br er ir sradranremrg riarios es pstastitigtiltraua ue va xeq '  ab ad ae al am aq ar b  bi bl bu cc ch di et ex fa ic il im is it ll m  me na ne ng nu ob ou pi qu ss st ti ub un v  x ' ca da fa ia na pa tabraciad adaadraerafealvambampan anaanganhanianoanqapaaq atiatoazib nbanbarbigbilbiqbliblubonbrebribsebucc fc icadcafcagcalcancc ",
		"pt-pt":"equentquequiguiuen linguqu uid co vede gueidanteo aa aadedadel ingmo nquntasequ nvel de o  sea cadoar estia inqio iqulino co portporta te  ag eq nc pi po saa da eantas ca ciadesdo gu imol pnciro rtustrtugu suesui  a  an ap ba bi ca fr gu in pe quaguapacondore fe geirfreho i aicaiguiroliqntio bo lo sor r ora reqs csimtarto ue uinult ci en ho mu ni re s  si sua sa vabeag al andanhapoatabanbenbicboicapcarcinco comctodeie be oe secaen er es exeficforgalgraiasichicoidiiliir iraisbla lismbomulna nhoniont o qo ro toc oioomboo os parpe r br er sranre recs as ssansboso statantratreu vugauguxeq ab ad al am aq ar au b  bo c  ch ct cu el es ex fa fi ga gr id ir ne ng nu ob oo pa ps pt r  ra ri ss st ta te tr ub un vi voa fa ia la ma oa rachaciactad afaageagralfalham ambamianaanganqaquaraarbarcargariarrasaatiautazib nbarbatberbigbilbiqbliboaboeborbsec ic lc pcadcamcasch chachechiciococcoicouctrcuecul",
		"ro":" de înde  a ul  coîn re e dea  di prle şi areat conui  şii dii  cue aluiernte cu  laa ccă dine cor ulune terla să tattre ac săestst tă  ca ma pecuristmâna di cnat cei aia in scu miatoaţiie  re sea aintntrtruuriă a fo paateinitulentminpreproa pe pe sei nă parrnarultor in ro tr unal aleartce e ee îfositanteomâostromru strver ex naa flornisrearit al eu noacecerilenalpriri stasteţie au da ju poar au eleereeriinan an cresse t atea că do fia satăcome şeurguvi siceilina recreprilrnertiurouveă p ar o  su videcdreoaronspe rii ad gea ma rainalicarcatecueneeptextiloiu n porisecu puneă cştiţia ch guai aniceae fiscl alicliumarnicnt nulrist ct ptictidu aucr as dr fa nu pu tocradisenţescgenit ivil dn dnd nu ondpenralrivrtestit dta to unixteândînsă s bl st uca ba ia lairastblabricheducdule measediespi li picaicăir iunjudlailulmaimenni pusputra rairopsilti trau sua udeursân întţă  lu mo s  sa sca uan atu",
		"ru":" на прто  нели  поно  в на ть не  и  коом про тоих  каатьото заие ователтор деой сти отах ми стр бе во раая ватей ет же ичеия ов сто обверго и ви пи сии исто восттра теелиерекотльнникнтио срорствчес бо ве да ин но с  со сп ст чталиамивиддете нельескестзали ниваконогоодножнольорировскося терчто мо са этантвсеерреслидеинаиноироитека ко колкомла нияо толоранредсь тивтичых  ви вс го ма слакоаниастбезделе де пем жнои дикаказкакки носо нопаприрроскити товые  вы до ме ни од ро св чиа наетазаатебесв пва е ве ме сез ениза знаиникамкахктоловмерможналницны нымораороот порравресрисросскат нтомчитшко бы о  тр уж чу шка ба ва рабиалаалоальаннатибинвесвново вшидалдатдное зегоелееннентетеи оилиисьит ициковленлькменмы нетни нныногнойномо побновеовнорыперпо прапреразропры се слисовтретсяуроцелчноь вькоьноэтоют я н ан ес же из кт ми мы пе се цеа ма па тавшажеак ал алеанеачиаютбнаболбы в ив сванградаждене к",
		"sk":" pr po ne a ch  na jení je  dona ova v to ho ou  toickterže  st zaostých sepro tee s žea p ktpre by o se kon přa sné ně stiakoistmu ameentky la pod ve obom vat kostaem le a vby e pko eriktesa éhoe vmertel ak sv záhlalaslo  taa nej li ne  saak aniateia sou soeníie  rece e noritic vya tké noso sstrti uje splovo poliová náaledene oku val am ro siniepoltra alalio vtor mo nici o ním  le pa s al atierooverovváních ja z ckée z odbylde dobneppraricspotak vša ae tlitme nejno nýco ta je aen estjí mi slostáu vfornoupospřesi tom vla zly ormrisza zák k at ckýdnodosdy jakkovny resrorstovan opda do e jhodlenný o zpozpriranu s abaj astit ktoo oobyodou pva áníí pým  in miať dovka nskáln an bu sl tre mechedni nkýcnícov příí a aj boa dideo ao dochpovsvoé s kd vo výbudichil ilini nímod oslouhravrozst stvtu u avály sí sí v hl li mea me bh si pi sitiládnemnovopouhlenoensmennesobote vedvláy n ma mu vábezbyvcho",
		"sl":"je  pr po je v  za napreda  daki ti ja ne  inin li no na ni  bijo  nenjee pi pprio pred doanjem ih  bo ki iz se soal  dee vi sko biliraove br obe bi novase za la  jaatiso ter taa sdele d dr oda nar jalji rit ka ko paa banie ser ililovo vtov ir ni voa jbi briitileto ntanše  le teenieriitakatporproalike oliov prari uarve  toa ia vakoarjatedi do ga le lo mero sodaoropod ma mo sia pbode negaju ka ljeravta a oe te zi di vilalitnihodostito varvedvol la no vsa daguajadejdnjedagovguajagjemkonku nijomoočipovrakrjastateva taj ed ejaentev i ii oijoistostskestr ra s  tr šearnbo drži jiloizvjenljansko do iom oraovorazržatakva venžav me čeameavie ie oekagrei tijail itekraljumorniko tobiodnranre stostvudiv ivan am sp st tu ve žeajoaleapodaldrue jednejoeloestetjevaijiik im itvmobnapnekpolposratskitičtomtontratudtvev bvilvsečit av gra zansastavtdane medsfori zkotmi nimo bo ood odloizot parpotrjeroitemval",
		"so":"ka ay da  ayaaloo aan kaan in  inadamaaaba soalibadaddsoo naahaku ta  wayo a somayaa ba ku la ooiyashaa addanabnta da mankauu y iayaha raa dh qaa kalabaadoohadliyoom ha sha da ia naaree ey y kya  ee iyaa aaqgaalam bua ba mad agaamaiyola a ca leenintshewaxyee si uua haasalkdhagu heeii iramado ao kqay ah ca wuankashaxaeeden ga haan an snaanayo dtaau buxuwuxxuu ci do ho taa ga uanaayodhiiinlaglinlkao isanu sunauun ga xa xuaababtaq aqaaraarlcaacireegeelisakallahneyqaarlasadsiiu dwad ad ar di jo ra sa u  yia ja qaadaataayah aleamkarias ayebusdalddudiidu duued egegeyhayhiiidainejoolaalaymarmeen bn dn mno o bo loogoonrgash sidu qunkushxa y d bi gu is ke lo me mu qo uga ea oa wadiadoagual antarkasaawibtabuld adagdando e sgalgayguuh ehaligaihiiriiyekenladlidlshmagmunn hn ina o no woodoororaqabqorrabritrtas osabskato u au hu uud uguulsuudwaaxusy by qy syadyayyih aa bo br go ji mi of ti um wi xoa x",
		"sq":"të  tënë për pë e sht në shse et ë së t sehe jë ër dhe paë në p që dhnjëë m njëshin  meqë  poe ne tishmë së me htë ka sie ke p i anëar  nuundve  ëse s mënukparuaruk jo rë ta ë fen it minhetn eri shqë d do ndsh ën atëhqiistë q gj ng tha ndo endimindir tratë bëri muartashqip koe medherije ka ngasi te ë kësi ma tievehjeiramunon po re  prim lito tur ë eë vët  ku sëe des ga itijetndëolishitje bë z gjekanshkëndës  de kj ru viaragovkjoor r prtorugtetugoaliarrat d tht i pipëizijnën noheshushët etika earëetëhumnd ndroshovarimtosva  fa fia sheni nmarndoporrissa sistësumëvizzit di mbaj anaatadëre aeshimejeslarn sntepolr nranresrrëtarë aë i at jo kë rea kai akthë hëni ii mia mennisshmstrt kt nt së gërkëve ai ci ed ja kr qe ta vea pcilel erëgjihtei tjenjitk dmënn tnyroripasra rierëstoruajyreëm ëny ar du ga jedëse ee zha hmeikainiiteithkohkraku limlisqënrëns st dt ttirtënverë j ba in tr zga aa ma tabr",
		"sr":" на је поје  и  не прга  свог а сих на којога у а пне ни ти  даом  ве сри сско оба нда е нно ного јој  зава е си пма никоброва коа идије пка ко когостсвествститраедиимапокпраразте  бо ви саавобрагосе иелиениза икиио преравраду сју ња  би до стастбојебои ним ку ланнебовоогоослојшпедстрчас го кр мо чла ма оакоачавелветвогедаиститиијеокослосрбчла бе ос от ре сеа ван богбровенграе оикаијакихкомли ну отаојнподрбсредројса снитачтваја ји  ка ов тра јавиаз анобиовикво говдние чегои оиваивоик инеиниипекипликло нашносо тод одионаојипочпрора рисродрстсе спостатићу ду ну очинша једјниће  м  ме ни он па сл теа уаваавеавнанаао атиациајуањабскворвосвскдине уеднезиекаеноетоењаживи ги ии ки тикуичкки крсла лавлитме меннацо но по уоднолиорносноспочепскречрпссвоскисласрпсу та тавтвеу бјезћи  ен жи им му од су та хр ча шт њеа да за ка тадуалоаниасованвачвањведви вновотвојву добдрудседу е бе де мем емаентенц",
		"ss":" ku lela ekua knga nga nngea llo  neetikwendze no l loelaemaentsi  kwtsii lwa lelkute kundni elofunesi sieletintfo tile khatsee lphaungi k emti sa  umisaelindlingsetwe isena angetfkheando n wentinyetfubena eutsletdzaimisekko lokeniye ba nkhebealoo klanga abaseb yehe lwakel te lakuswematiikhnekalakufi nokuatsmtshlawena t nagekuhlkubnguka akafutkankwa likuconkbananaulu se imakhumea ilestimulainilweza fo hul nohanli ipha stiskhuta dzibe emima endo tekea u kaanelekmelelwkunsislonutfanykhokulhlo baufuaphlune shalindiswo suseekwme ndvenguphhatne so lulnomte lolawunellu ha watmenete lwnemakozinkuhshabhagab inalemisteme eo ee twekdzeomewel luembnis ektsau lo ydleutelenswaphemkhntfukesitinye iwo aniphiwetsinnhlmalmbamfufu labsiktawno hlee uekiasealiulwve ekazelntabontekbo sigamaileuletfwmphumakupemtasidluishumtgeno wikeigahakabenetgankisndengiukhbekmo phuselelui tantdvoa yvo humlisdlagamivejenket",
		"st":"ng ho  lele  ho tsa msa la  kaa h diya ka  yaa tengets ba moa l selo  bowa tsaa bna ba  e  a a k maangtsese o ta da sha so o le ho ye ttlatsholoe le mo bo esebebeelathuelee kanae b th hatsoo ao k wakgotswthoo hong lahutditane mea e tlolaedielodi ona kewan o a papatjhhlo sasheletabaloklaoeo a ao smanto  hla nisae dswesetpa  nao mg lhet kggotahaethre e ejhaphelanotlg klekitsekgsenao disg mothe aithhlae ske molpelg hhabbetsanatsmo lwawe alalenntsdipkapiso mmutoaloe nsi ta o wemoswatsiokebedthe pha ywenkenenahwane oreatlanohelmotbo g ti bkgahorngonanno o ntlhshwkelphaetjbonellg sgolthaaledikkolbak ntikao d teohlg y loti hisileg boko ethana omatohoodilelmeldinkaro ouo monhahte me  ito fnenhebingbolbelhlepuolaltlohalophebahatheoarobatko banleho ioletle fekgepanakeg eakaeko perike ymmeamalhaeha faebomohmaeeteaemotsahio putaokgntlpalgeti le fokaseplatahlboteselahlonakga f puaseg amorkannahbohe p",
		"sv":"en  deet er tt om förar de att föing in at i detch an gen ant ssomte  octer halleoch sk sora r a mevarndeär  koon ansintn sna  en fr på st vaandntepå skata  viderällörs omda krika nst hoas stär dt fupp benger staltälör  avgerillng e sektadeeraersharll lldrinrnasäkundinnligns  ma pr upageav ivaktildaornsonts ttaäkr sj tiavtberelsetakolmenn dt kvtaår jukmann fninr irsäsjusso ära sachag bacdenettftehornbaollrnbstetil ef sia ae hed eftga ig it lermedn ind så tiv bl et fi säat dese agargetlanlssostr br ere retstat i ge he rea fallbosetslekletnernnanner frits ssenstotorvavygg ka så tr utad al aree ogonkomn an hngar hrent dtagtartreätt få hä sea da ia paleannarabyggt hanigtkanla n onomnskommr kr pr vs fs kt at pver bo br ku nåa ba edelenses finigem sn pnågor r orbers rt s as nskrt otentioven al ja p  r  saa hbetckedrae fe iedaenoeräessionjagm fne nnspror trarrivrätt et tustvadöre ar by kr miarb",
		"sw":" wawa a ka m ku yaa wya ni  maka a una za ia  naikama alia n amilikwa kwini haameanai n zaa hemai mi ykuwla o wa yatasem laatichii wuwaakili ekaira nca sikikatnch ka kia bajiambra ri rikadamatmbamesyo zi da hi i kja kuttekwan bia aakaao asichaeseezake mojoja hia zendha ji mu shiwat bwakearabw i himbtikwakwal hu mi mk ni ra uma lateeshinaishkimo k ira ialaaniaq azihini aidiimaitarairaqsha ms seaframaanoea elefrigo i iifaiwaiyokuslialiomajmkuno tanuliutawen ala jaadaidariawaba fa ndengenyao yu wua umowazye  ut via da taifdi ereingkinndao noa taitoausautowasyakzo  ji mwa paiaamuangbikbo dele weneengichiriitiitoki kirko kuumarmbomilngingoo longsi ta taku yumuusiuu wam af ba li si zia vamiatuawierifanfurgeri zisiizoleambimwanyeo ho monirezsaasersintattistu uinukiur wi yar da en mp ny ta ul wea ca faisapoayobardhie aekeenyeonhaihanhiyhuri simwkalkwelaklammakmsane nguru salswate ti ukuumaunauru",
		"tl":"ng ang na saan nansa na  ma caay n g anong gaat  paala sia nga g ng mitog cmansang singto ilaina di taagaiyaacag t atayaamalana aquia ca snag bag itan't  cuauag p nios 'y a m n la  lao nyan ayusacayon ya  ital apaatat nuanahaasapag gug ldi magabag aaraa pin anait si cusg buina tas n nhin hia'tali buganumaa dagcaqug d tuaonaricasi nniypina igcasiya'yyaoag ca hanilipansinualn snam lucanditguiy ngalhatnal isbagfra fr sua l coani bi daaloisaitamayo ssiluna in pil nnilo apatsact s uaaguailbindalg hndioonua  haindrans ntinuloengg finilahlo rairintong uinulono'yt a ara bad baycalgyailematn apaura tayy mantbani mnasnayno sti tiagsg gta uituno ib yaa uabiaticapig is la' do puapiayogosgullaltagtiltuny cy syonanoburibaisilamnacnatni ntood pa rgourg m adrastcaggaygsii pinolenlinm gmarnahto' dea hcatcauconiqulacmabminog parsal zaao dooipinodnteuhaula reilllitmacnito'tor orasumy p al mi umacoadaagdcab",
		"tlh":"tlhe' gh i'  'eu'  viatla'  ghej  ho ch mu tlngameywi'be'an ch ganchulh ing'e'hinjatlhi da jao' ughaq cha poey  'a je'ej pang ad  qaoh eh ah ghaje  luholaw' jiongpu'aj vadw' ' jha'is tah' 'angh 'ponam lawmo'qu'hbeol vamaghmu'ahvbejoghuch' vachhug lo quchohvaij  lalu'vis ne pu so ta va'acdi'hu'lahmoh 'o' mdaqhahn hnehu'may'ghoh vmehoy  ma nu'meel  ba be de ng' th dhvioq  wa' l'wihmeli'uq  bobogdelh ph tichvil qe wiahbbanenghaqhohov viq ha ti' n' p'a'hwiighlo'y'  du no yu'mo'vadajdaseghhommucom otlus  bi tu' hchmh qhovnisqaruj ' q'chh mhmojihparwij hu' d'a etlh gh jh llodmaqochwa'yuq di le pe ya'dicheechih ijain j 'j mlhwpa' 'i mi qi ro ru'beanpghighuh bhayhchiq npuod paqqayrdasoh do me qo sa' c' g' s'luamlardas d pgmeh nhtai'vj jjijlenngmqanqmevajwiv mo ni'la'pu'quar armdwig pghdh chamhlahquiloiqaiqij pj tj vladlhomarmugpusq sq trghrmasovta'tintu'u'dvetyliyu' to'ohaqqartat aylaytet hajhar",
		"tn":" di lego le  gong  tsya  yasa tlh mo boa mlo tsa e o ta bwa  kaa ka tka a gengoloo yla  a a detsmo se  tl batsh maba a ltseso na elo seelee do llhoe tdi e g kgditkgoo kanglhae me ewe aneo me ke longsetwanelatsotlao de bolangwgweo babaatla p o a ao aotla so edirthuga  gashwotsakahabhwaagao ggantswanamol kehut meonalelitslaokgadikgot falet waoseno t hsweediatsa ne sokoothkwakar tha ealatiro ndipisagatti anobot nn halenaloanyaroitiirio ssennetke ho maiikaekato ithre g mhatbo g let emoamaisorolfa iwakanshesi ao g kwenlolo obositla ythelwae n laore mmko thae aeo lhebolha  poisii blan nai talene gonrisirabon sag yg gphaogamelro golo w kwi l titlologpor jaa f nehoklot pue yutog thomokg koo famegorta  pents khthogeladiareeteasemonheooroomonennelilenngntlaboogoaranseegoheluo mogsanularagkolte etlbat tepuoamoofelatatiolerabtsiiromanaelegalwera dintlesekingyo a o reaotusoo rerejwaaemlamlek jwgwamok",
		"tr":"laren leran in  bi yaeride  kair arı ba de haın arabir ve sailele ndeda  buanainiınıer ve  yılmayıl olar n bndaayali ası geindn kesilannlaak anıenini nı rınsan ko yemazbaşilirinalıaz halınd da güeleılmığıekigüni biçidenkarsi  ile yna yorek n s içbu e bim ki lenri sın soün  taniniğitanyan sinatnınkanrı çinğı elin aır  aninen yola aral e slikn dsin al düanlne ya ım ına beadaalaamailmor sı yen meatıdi etikenla lı oru gö inande dmenun önea dat e ae gyar kuayıdanediiriünüği ılıemeeğii ki yıla çaa yalkdı edeel ndıra üne südıre kereik imiişimasn hsüryle ad fi gi sea karlaşıiyoklalığnemneyrmestetı unlver sı te toa saşkeklendkalliğmintıruluunuyapye ı işkaştı bü ke kiardartaşan inditi topı b va önakicakey filisiklekurmanncenlenunrakık  en yoa glismakn gtiryas iş yöalebilbulet i diyekilma n en tnu olurlate yönçık ay mü ço çıa aa batadergeli gi iillistldılu mekmlen çonuoplranratrdırkesiysonta tçıtın",
		"ts":" kuku na ka wa a n swa mya a k tiswihi la  ya le hia ta v vani  nandz maa h xia si nelei kanaa lngalo va le akaelairheka vuiwaa x kayi  waisasa ko ta ga wu wi tir ek mi nio yeloawuisiswai thlaa e ta ng laa yri eri rirhiekeumbu tndl yilani veswmbei la re kanglesulati yono wonalawxa nelyo leliko loamb a i y xaanewani sondfanendi ho lu kmbin'wke dyo falamnhlo songno  kou n haho okou hi mo n yonguo ku yatiu lvanuluandmbakumu vwo be ha riwdzasi  eno h hlo teyi ntilalokdzinge mualato a w byarhakutsawakrho'wa ndminlavtimleytikdletinmatlerletselhismellu ikaa angoengo x nkamusiwanienima  nhmi swoetitanmo hamiwe khhanlekntiunghakdzoete tsavahu fumkarvul wukulundi xnhuyisxikbisxi e yra hle huwekanoyena dsisolopfui wnyie nso ki funisotshkonnkuheli be hariimii eindvumntsimekommfuise mfhindlavutgani rbanbyamilintats dyu se xilekelkwa noi fasiza urio mrhae lin'etavoni akho woiki rau eo ezo yininkanyket",
		"uk":" на занняня на  прогого ськ по у відере мі неих ть пер віів  пе щольнми ні не ти атиеннміспрауваникпроравівн табудвлірів ко ріально омущо  виму ревся інн до упавланнкомли лінногупр бу з  роза и нновороостстаті ють мо ні якборва ваненьи пнь овіронстіта у вькоіст в  редо е пзабий нсьо во пприі п ку пі спа пабоансаціватвнии вимика неннічонаої повькиьноізнічн ав ма ор су чи іна зам ає вневтодоментжитзниим итлла нихницоваовиом портьсу рьсяідоільісь ва ді жи че і а ва наливезвноевеезезеництки кихконку ласля можначнимноїо бовуодиою ро роксноспотактвату у пцтвьния зі мії  вс гр де но па се ук їха оавтастаютварденди ду знаи зикоисяитикогменномну о но собуовопларанривробскатантимтисто траудочинчниі вію  а  во да кв ме об ск ти фі є а ра са уак аніартаснв увиквіздовдподівевіенсже и ми сикаичнкі ківміжнанносо уоблоднок олоотрренримрозсь сі тлатіву зугоудічи ше я ня уідпій інаія  ка ни ос си то тр уг",
		"ur":"یں  کیکے  کےنے  کہے ککی میں میہے وں کہ  ہےان ہیںور  کویا  ان نےسے  سے کرستا اواورتانر کی ک اسے ا پا ہو پررف  کاا کی ا ہیدر کو  ایں ک مش ملات صدراکسشرفمشرپاککستی م دی صد یہا ہن کوالیہ ے و بھ دواس ر انہیکا ے سئی ہ ایت ے ہت ک سالے ہا ے ب واار نی کہای ہے م سی لیانہانیر مر پریتن مھا یر  جا جنئے پر ں نہ کی وے د تو تھ گیایکل کنا کر ں میک  باا تدی ن سکیایوںے جال تو ں اے پ چاام بھیتی تے دوسس کملکن اہوریے  مو وکائیارتالےبھاردیری وہ ویزں دھی ی س رہ من نہ ور وہ ہنا ااستت ات پد کز مند وردوکلگی گیاہ پیز ے ت اع اپ جس جم جو سراپناکثتھاثریدیار درت رویسی ملاندووستپروچاہکثرکلاہ ہہندہو ے ل اک دا سن وز پیا چاء اتھاقااہ تھ دو ر بروارے ساتف کقاتلا لاءم مم کمن نوںو اکرنں ہھارہوئہی یش  ام لا مس پو پہانےت مت ہج کدونزیرس سش کف نل ہلاقلی وریوزیونوکھنگا ں سں گھنےھے ہ بہ جہر ی آی پ حا وف گاا جا گاد ادیاعظاہتجس جمہجو ر سر ہرنےس مسا سندسنگظم عظمل ملیےمل موہمہونگھو صورٹوہنکن گھ گے ں جں وں یہ دہن ہوںے حے گے ی اگ بع رو شا",
		"uz":"ан ганларга нг ингнинда ни идаариигаиниар ди  биани боданлга ҳа ва саги илан би б кў таир  маагаалабирри тгаланлика кагиатита адидагрга йи ми па бў қа қиа биллли асии тик илиллаардвчива иб ирилигнгаран ке ўза сахтбўлигикўррдарниса  бе бу да жаа тазиерии аилгйилманпахридти увчхта не со учайтллитла ай фр эт ҳоа қалиаробербилборимиистон ринтертилун фрақил ба олансефтзиркатмилнефсагчи ўра на те эна эам арнат иш ма нларличилшга иш му ўқаравази уиқ моқримучучунши энгқувҳам сў шибарбекдами ҳишиладолиоллориоқдр бра рлаунифт ўлгўқу де ка қўа ўабаамматлб кбошзбеи вим ин ишллаблейминн дндаоқ р мрилсидталтантидтонўзб ам киа ҳангандартаётдиренти ди ми ои эиройтинсуодиор си тиштобэтиқарқда бл ге до ду но пр ра фо қоа ма оайдалоамаблег ндолейрек ергжарзиди ки фий илолдилиблинми мман вн кн ўн ҳозиораосирасришркароқстотинхатшир ав рў ту ўта павтадаазаанлб ббойбу втог эгиндардендунидеионирлишгйхакелкўплио",
		"ve":"ha  vha mna  u a ntshwa a u nangavha ts dz khdzaa vya  yaa tho la  zw muedzvhuga shiza a k ngkha mahumne  ndo nlo dzishu haa do yndaelezwiahoangno  a elaa zhu shai n waanahi kano danoa hzwa th migana lsa handi u tandndiyo thedo ri vhoni ka urisi o tmbeo wanewe zo i te ni hsheusho kzi da a athu laa pzan i a slwaulai daka domisheditali  huiwa lui vhe  kaeloso ambavh sho vi klelu vdzou s fhmo nweo lumiwahisihela iveladztani maththiwi  urhatinele vheanya yhonisaalao aaluudiumb bvash te lilusnyahasledswahuso iumoonendetha itkhongomushake yea ivho mu nhinthomutayofhi satelhulhunuloithma  yolane v phgo i ao uhud pfukazhiuvhdzwingelwilawo mbou diteiswasie kndufheo hmelu bikabo guddzhkonifh tae duth hoi zwanulumadinwothanidiswitou bveetsu iadie mfhanahdalwin sisho inyamlayekaa fi uendi yaloi lusomulta delu k mbpha didadalio spfukhwe a ko nehenmasumeiniishudziraoniluknelisombadzuhomi szwonguaraunz",
		"vi":"ng  th chg t nhông kh trnh  côcôn tyty i tn t ngại  tich y lền  đưhi  gởgởiiềntiềởi  gi le vichoho khá vàhác pham hànáchôi i nượcợc  tôchúiệttôiên úngệt  cóc tcó húnviệđượ nag ci cn cn nt nvà n ln đàngác ất h lnamân ăm  hà là nă qu tạg mnămtạiới  lẹay e gh hi vi đle lẹ ều ời hânnhit t củ mộ về đian củalà mộtvề ànhết ột ủa  bi cáa canhcách ciềum tện  ho's avee'sel g nle'n vo cravs tthitravelận ến  ba cu sa đó đếc cchuhiềhuykhinhânhưongronthuthưtroy cày đếnườiườnề vờng vớcuộg điếtiệnngào tu cuộcvớià cài ơngươnải ộc ức  an lậ ra sẽ số tổa kbiếc nc đchứg vgiagàyhánhônhư hứci gi hi ki piênkhôlậpn kra rênsẽ t cthàtrêtổ u ny tìnhấy ập ổ c má đểai c sgườh vhoahoạinhm nmáyn gngưnhậo noa oànp csố t đy vào áy ăn đó để ướcần ển ớc  bá cơ cả cầ họ kỳ li mạ sở tặ vé vụ đạa đbaycơ g shanhươi skỳ m cn mn po boạiquasở thathátặnvàové vụ y bàn ángơ sầu ật ặngọc ở tững du lu ta to từ ở a vao c vcả du g lgiả",
		"xh":"la  kulo ngaa k ngoku kw uka nukuye a iyo elaelea unyewe wa amae niseababa ho enzo nngokubngeathfuno elelungubako eloezio kthekwana kweange ile ka esio y nae kethpha inkunnziandni ban ye nolwalun okanyzi li  neulua eeligoko lebeundisasebndo ezthoo ido beningkwindlunyalaa aeyoe ukan abthii ki no uo zelwsa sekayoheto oeka umhi bo so isiwenlweapha lya ekoana yokufiniimialiha awuwanentuththaza ulakho iianee aisouph leilezinnts siengnokonghlazwe elokaekilisazi lotsh amufuantiswo anguo s bainteniunewulhulseli euselanke nisemi li isiph ima oakamfu ziinkmalleymannyanekakhume koalotu i untuizwkelizii isi ganaseindi andinelalusisubokutmthkuslekmisnde zo weaniga ikosizno phue ehonondne ithkulgamgenpho izphehatkhuiinhanzo lu ulondaqo zikhelo m lwzisdleuhlmenolomeldelnzaokookwolukuknteswalawenk yai ygaqshaaqoe likhnkqule kaonkthuwo bonkupquba ykqudla eshe anolumbe iga zeo wakumgankete  olze kumemfesh",
		"zu":"okula nga nga n kua kthi ukezie nukule lo hi wa  noa uelawe a ini elezinuthamaelophaingabaathandenzethesima lel um katheungngengothonyekweeniiziye  kwndlho a ena zi hetkane ue iundiseisindakhaba i knomfun ez izke beno eisazwekelka akanzio ne komakwa neanyanghlai umthkubo kanaaneikhebekutha  isaziulusebalaonkbani eazwwen abhana ai nimilanhatlwa nainiakhli ngunkenokumeekeelwyo aphkus es okiph immeli i lo in amkhoza gokseklunkunlweshasikkufhaka ythusa o ukhuayohule aalienglu ne  koeliubadlee eith yoa lnelmis sikula osislokgeno zi aemiumaekaalomaniswthao ilonso uphuhlntuzimmalindwez bao o yi weulapheo yileo lwo welga tu hleokwfan lekazaseanindebo ngiule emmeninyambmbiganifuo santhelikaonai lfut fuze u anhlnin zoendsigu kgabufaishushkuzno gamkuh yenyanezzisdlukatdlatsh seikekuqgu osiswalul ziimae lkupmo nzaasiko kumleksheumtunyyokwanwamameonglismkhahlaleuseo aalugapsi hlonjeomto wokhhe komi s"
	};

module.exports = models; 
});	




require.define("/lib/natural/stemmers/multi_lingual_service.js",function(require,module,exports,__dirname,__filename,process){
	
	
module.exports = function() {
    var multiLingualService = this;
	var languageDetector = require('../language/language_detecter');
	languageDetector = new languageDetector()
	var stopwordsEn = require('../util/stopwords').words;
  //	stopwordsEn = stopwordsEn.map(function(word) { return word.stem(); });
	multiLingualService.setLanguage = function(language) {
		language = language || "en"; 		
		if(language == "en") {
        	stemmer = natural.PorterStemmer; //natural.LancasterStemmer;
        	stemmer.attach();
        	tokenizer =  natural.AggressiveTokenizer;
        	stopwords = stopwordsEn;
        }
    	else if(language == "it") {
    		stemmer = natural.PorterStemmerIt; //natural.LancasterStemmer;
	        stemmer.attach();
	        tokenizer = natural.AggressiveTokenizerIt;
	        stopwords = require('../util/stopwords_it').words;    		
    	}
    	else if (language == "fr") {
    		stemmer = natural.PorterStemmerIt; //natural.LancasterStemmer;
	        stemmer.attach();
	        tokenizer = natural.AggressiveTokenizerIt;  
	        stopwords = require('../util/stopwords_fr').words;    	  	
    	}
    	else if(language == "fa") {
    		stemmer = natural.PorterStemmerFa; //natural.LancasterStemmer;
	        stemmer.attach();
	        tokenizer = natural.AggressiveTokenizerFa; 
			stopwords = require('../util/stopwords_fa').words;    	  		           		
    	}
    	else if (language == "es") {
    		stemmer = natural.PorterStemmerEs; //natural.LancasterStemmer;
	        stemmer.attach();
	        tokenizer = natural.AggressiveTokenizerEs;    	
	        stopwords = require('../util/stopwords_es').words;    	  
    	}
    	else if (language == "pt") {
    		stemmer = natural.PorterStemmerPt; //natural.LancasterStemmer;
	        stemmer.attach();
	        tokenizer = natural.AggressiveTokenizerPt;  
	       	stopwords = require('../util/stopwords_pt').words;    	    	
    	}
    	else if (language == "ru") {
    		stemmer = natural.PorterStemmerRu; //natural.LancasterStemmer;
	        stemmer.attach();
	        tokenizer = natural.AggressiveTokenizerRu; 
	        stopwords = require('../util/stopwords_ru').words;    	     	
    	}
    	else if (language == "de") {
    		stemmer = natural.PorterStemmerGr; //natural.LancasterStemmer;
	        stemmer.attach();
	        tokenizer = natural.AggressiveTokenizerGr;  
	        stopwords = require('../util/stopwords_gr').words;    	    	
    	}
    	else {
    		// also for mul and unknown 
    		stemmer = natural.PorterStemmerMul; //natural.LancasterStemmer;
	        stemmer.attach();
	        tokenizer = natural.AggressiveTokenizerMul; 
	        stopwords = require('../util/stopwords_mul').words;    	     	
    	}
	}
    multiLingualService.stem = function(token, language) {
    	if(token instanceof Array) {
    		return token; 
    	}
    	multiLingualService.setLanguage(language);
		return stemmer.stem(token); 
    };

    multiLingualService.tokenizeAndStem = function(text, language, keepStops) {
    	multiLingualService.setLanguage(language);
    	return stemmer.tokenize(text, keepStops); 
    };
    
    multiLingualService.tokenize = function(text, language, keepStops) {
    	text = text.replace(/[&\/\\#,+()$~%.'":\\[\];*?<>{}]/g, '').toLowerCase();
    	multiLingualService.setLanguage(language);
    	return stemmer.tokenize(text, keepStops); 
    };
    
    multiLingualService.isTokenStopword = function(token, language) {
    	multiLingualService.setLanguage(language);    	
    	//token : language == "en" ? stemmer.stem(token) : token; 
    	return (stopwords.indexOf(token.toLowerCase()) > -1);  
    };
    
    multiLingualService.getTextLanguage = function(text, language) {
    	//if(language == "unknown" || language == "mul" || !language) {
    		languageDetector.info(text, function(languageInfo) {
    			language = languageInfo[0] == "unknown" ? language : languageInfo[0]; 
			});
    	//}
    	return language; 
    };
  }
});	



require.define("/lib/natural/stemmers/lancaster_stemmer.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer');
var ruleTable = require('./lancaster_rules').rules;

function acceptable(candidate) {
    if (candidate.match(/^[aeiou]/))
        return (candidate.length > 1);
    else
        return (candidate.length > 2 && candidate.match(/[aeiouy]/));
}

// take a token, look up the applicatble rule section and attempt some stemming!
function applyRuleSection(token, intact) {
    var section = token.substr( - 1);
    var rules = ruleTable[section];

    if (rules) {
        for (var i = 0; i < rules.length; i++) {
            if ((intact || !rules[i].intact)
            // only apply intact rules to intact tokens
            && token.substr(0 - rules[i].pattern.length) == rules[i].pattern) {
                // hack off only as much as the rule indicates
                var result = token.substr(0, token.length - rules[i].size);

                // if the rules wants us to apply an appendage do so
                if (rules[i].appendage)
                    result += rules[i].appendage;

                if (acceptable(result)) {
                    token = result;

                    // see what the rules wants to do next
                    if (rules[i].continuation) {
                        // this rule thinks there still might be stem left. keep at it.
                        // since we've applied a change we'll pass false in for intact
                        return applyRuleSection(result, false);
                    } else {
                        // the rule thinks we're done stemming. drop out.
                        return result;
                    }
                }
            }
        }
    }

    return token;
}

var LancasterStemmer = new Stemmer();
module.exports = LancasterStemmer;

LancasterStemmer.stem = function(token) {
    return applyRuleSection(token.toLowerCase(), true);
}});

require.define("/lib/natural/stemmers/lancaster_rules.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

exports.rules = {
    "a": [
        {
            "continuation": false,
            "intact": true,
            "pattern": "ia",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": true,
            "pattern": "a",
            "size": "1"
        }
    ],
    "b": [
        {
            "continuation": false,
            "intact": false,
            "pattern": "bb",
            "size": "1"
        }
    ],
    "c": [
        {
            "appendage": "s",
            "continuation": false,
            "intact": false,
            "pattern": "ytic",
            "size": "3"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ic",
            "size": "2"
       },
        {
            "appendage": "t",
            "continuation": true,
            "intact": false,
            "pattern": "nc",
            "size": "1"
        }
    ],
    "d": [
        {
            "continuation": false,
            "intact": false,
            "pattern": "dd",
            "size": "1"
        },
        {
            "appendage": "y",
            "continuation": true,
            "intact": false,
            "pattern": "ied",
            "size": "3"
        },
        {
            "appendage": "s",
            "continuation": false,
            "intact": false,
            "pattern": "ceed",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "eed",
            "size": "1"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ed",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "hood",
            "size": "4"
        }
    ],
    "e": [
        {
            "continuation": true,
            "intact": false,
            "pattern": "e",
            "size": "1"
        }
    ],
    "f": [
        {
            "appendage": "v",
            "continuation": false,
            "intact": false,
            "pattern": "lief",
            "size": "1"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "if",
            "size": "2"
        }
    ],
    "g": [
        {
            "continuation": true,
            "intact": false,
            "pattern": "ing",
            "size": "3"
        },
        {
            "appendage": "y",
            "continuation": false,
            "intact": false,
            "pattern": "iag",
            "size": "3"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ag",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "gg",
            "size": "1"
        }
    ],
    "h": [
        {
            "continuation": false,
            "intact": true,
            "pattern": "th",
            "size": "2"
        },
        {
            "appendage": "c",
            "continuation": false,
            "intact": false,
            "pattern": "guish",
            "size": "5"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ish",
            "size": "3"
        }
    ],
    "i": [
        {
            "continuation": false,
            "intact": true,
            "pattern": "i",
            "size": "1"
        },
        {
            "appendage": "y",
            "continuation": true,
            "intact": false,
            "pattern": "i",
            "size": "1"
        }
    ],
    "j": [
        {
            "appendage": "d",
            "continuation": false,
            "intact": false,
            "pattern": "ij",
            "size": "1"
        },
        {
            "appendage": "s",
            "continuation": false,
            "intact": false,
            "pattern": "fuj",
            "size": "1"
        },
        {
            "appendage": "d",
            "continuation": false,
            "intact": false,
            "pattern": "uj",
            "size": "1"
        },
        {
            "appendage": "d",
            "continuation": false,
            "intact": false,
            "pattern": "oj",
            "size": "1"
        },
        {
            "appendage": "r",
            "continuation": false,
            "intact": false,
            "pattern": "hej",
            "size": "1"
        },
        {
            "appendage": "t",
            "continuation": false,
            "intact": false,
            "pattern": "verj",
            "size": "1"
        },
        {
            "appendage": "t",
            "continuation": false,
            "intact": false,
            "pattern": "misj",
            "size": "2"
        },
        {
            "appendage": "d",
            "continuation": false,
            "intact": false,
            "pattern": "nj",
            "size": "1"
        },
        {
            "appendage": "s",
            "continuation": false,
            "intact": false,
            "pattern": "j",
            "size": "1"
        }
    ],
    "l": [
        {
            "continuation": false,
            "intact": false,
            "pattern": "ifiabl",
            "size": "6"
        },
        {
            "appendage": "y",
            "continuation": false,
            "intact": false,
            "pattern": "iabl",
            "size": "4"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "abl",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ibl",
            "size": "3"
        },
        {
            "appendage": "l",
            "continuation": true,
            "intact": false,
            "pattern": "bil",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "cl",
            "size": "1"
        },
        {
            "appendage": "y",
            "continuation": false,
            "intact": false,
            "pattern": "iful",
            "size": "4"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ful",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ul",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ial",
            "size": "3"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ual",
            "size": "3"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "al",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ll",
            "size": "1"
        }
    ],
    "m": [
        {
            "continuation": false,
            "intact": false,
            "pattern": "ium",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": true,
            "pattern": "um",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ism",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "mm",
            "size": "1"
        }
    ],
    "n": [
        {
            "appendage": "j",
            "continuation": true,
            "intact": false,
            "pattern": "sion",
            "size": "4"
        },
        {
            "appendage": "c",
            "continuation": false,
            "intact": false,
            "pattern": "xion",
            "size": "4"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ion",
            "size": "3"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ian",
            "size": "3"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "an",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "een",
            "size": "0"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "en",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "nn",
            "size": "1"
        }
    ],
    "p": [
        {
            "continuation": true,
            "intact": false,
            "pattern": "ship",
            "size": "4"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "pp",
            "size": "1"
        }
    ],
    "r": [
        {
            "continuation": true,
            "intact": false,
            "pattern": "er",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ear",
            "size": "0"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ar",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "or",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ur",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "rr",
            "size": "1"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "tr",
            "size": "1"
        },
        {
            "appendage": "y",
            "continuation": true,
            "intact": false,
            "pattern": "ier",
            "size": "3"
        }
    ],
    "s": [
        {
            "appendage": "y",
            "continuation": true,
            "intact": false,
            "pattern": "ies",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "sis",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "is",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ness",
            "size": "4"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ss",
            "size": "0"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ous",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": true,
            "pattern": "us",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": true,
            "pattern": "s",
            "size": "1"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "s",
            "size": "0"
        }
    ],
    "t": [
        {
            "appendage": "y",
            "continuation": false,
            "intact": false,
            "pattern": "plicat",
            "size": "4"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "at",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ment",
            "size": "4"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ent",
            "size": "3"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ant",
            "size": "3"
        },
        {
            "appendage": "b",
            "continuation": false,
            "intact": false,
            "pattern": "ript",
            "size": "2"
        },
        {
            "appendage": "b",
            "continuation": false,
            "intact": false,
            "pattern": "orpt",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "duct",
            "size": "1"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "sumpt",
            "size": "2"
        },
        {
            "appendage": "i",
            "continuation": false,
            "intact": false,
            "pattern": "cept",
            "size": "2"
        },
        {
            "appendage": "v",
            "continuation": false,
            "intact": false,
            "pattern": "olut",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "sist",
            "size": "0"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ist",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "tt",
            "size": "1"
        }
    ],
    "u": [
        {
            "continuation": false,
            "intact": false,
            "pattern": "iqu",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ogu",
            "size": "1"
        }
    ],
    "v": [
        {
            "appendage": "j",
            "continuation": true,
            "intact": false,
            "pattern": "siv",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "eiv",
            "size": "0"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "iv",
            "size": "2"
        }
    ],
    "y": [
        {
            "continuation": true,
            "intact": false,
            "pattern": "bly",
            "size": "1"
        },
        {
            "appendage": "y",
            "continuation": true,
            "intact": false,
            "pattern": "ily",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ply",
            "size": "0"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ly",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ogy",
            "size": "1"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "phy",
            "size": "1"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "omy",
            "size": "1"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "opy",
            "size": "1"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ity",
            "size": "3"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ety",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "lty",
            "size": "2"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "istry",
            "size": "5"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ary",
            "size": "3"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "ory",
            "size": "3"
        },
        {
            "continuation": false,
            "intact": false,
            "pattern": "ify",
            "size": "3"
        },
        {
            "appendage": "t",
            "continuation": true,
            "intact": false,
            "pattern": "ncy",
            "size": "2"
        },
        {
            "continuation": true,
            "intact": false,
            "pattern": "acy",
            "size": "3"
        }
    ],
    "z": [
        {
            "continuation": true,
            "intact": false,
            "pattern": "iz",
            "size": "2"
        },
        {
            "appendage": "s",
            "continuation": false,
            "intact": false,
            "pattern": "yz",
            "size": "1"
        }
    ]
};

});

require.define("/lib/natural/tokenizers/regexp_tokenizer.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require("util");
var _ = require('underscore')._;
var Tokenizer = require('./tokenizer');

// Base Class for RegExp Matching
RegexpTokenizer = function(options) {
    var options = options || {};
    this._pattern = options.pattern || this._pattern;
    this.discardEmpty = options.discardEmpty || true;

    // Match and split on GAPS not the actual WORDS
    this._gaps = options.gaps;

    if (this._gaps === undefined) {
        this._gaps = true;
    }
}

util.inherits(RegexpTokenizer, Tokenizer);

RegexpTokenizer.prototype.tokenize = function(s) {
    var results;

    if (this._gaps) {
        results = s.split(this._pattern);
        return (this.discardEmpty) ? _.without(results,'',' ') : results;
    } else {
        return s.match(this._pattern);
    }
}

exports.RegexpTokenizer = RegexpTokenizer;

/***
 * A tokenizer that divides a text into sequences of alphabetic and
 * non-alphabetic characters.  E.g.:
 *
 *      >>> WordTokenizer().tokenize("She said 'hello'.")
 *      ['She', 'said', 'hello']
 *
 */
WordTokenizer = function(options) {
    this._pattern = /\W+/;
    RegexpTokenizer.call(this,options)
}

util.inherits(WordTokenizer, RegexpTokenizer);
exports.WordTokenizer = WordTokenizer;

/***
 * A tokenizer that divides a text into sequences of alphabetic and
 * non-alphabetic characters.  E.g.:
 *
 *      >>> WordPunctTokenizer().tokenize("She said 'hello'.")
 *      ['She', 'said', "'", 'hello', "'."]
 *
 */
WordPunctTokenizer = function(options) {
    this._pattern = new RegExp(/(\w+|\!|\'|\"")/i);
    RegexpTokenizer.call(this,options)
}

util.inherits(WordPunctTokenizer, RegexpTokenizer);
exports.WordPunctTokenizer = WordPunctTokenizer;
});

require.define("/node_modules/underscore/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"underscore.js"}});

require.define("/node_modules/underscore/underscore.js",function(require,module,exports,__dirname,__filename,process){//     Underscore.js 1.3.3
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.3.3';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    if (obj.length === +obj.length) results.length = obj.length;
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = _.toArray(obj).reverse();
    if (context && !initial) iterator = _.bind(iterator, context);
    return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.max.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.min.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var shuffled = [], rand;
    each(obj, function(value, index, list) {
      rand = Math.floor(Math.random() * (index + 1));
      shuffled[index] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, val, context) {
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      if (a === void 0) return 1;
      if (b === void 0) return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, val) {
    var result = {};
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    each(obj, function(value, index) {
      var key = iterator(value, index);
      (result[key] || (result[key] = [])).push(value);
    });
    return result;
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator || (iterator = _.identity);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj)                                     return [];
    if (_.isArray(obj))                           return slice.call(obj);
    if (_.isArguments(obj))                       return slice.call(obj);
    if (obj.toArray && _.isFunction(obj.toArray)) return obj.toArray();
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.isArray(obj) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especcialy useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, (index == null) || guard ? 1 : index);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator) {
    var initial = iterator ? _.map(array, iterator) : array;
    var results = [];
    // The `isSorted` flag is irrelevant if the array only contains two elements.
    if (array.length < 3) isSorted = true;
    _.reduce(initial, function (memo, value, index) {
      if (isSorted ? _.last(memo) !== value || !memo.length : !_.include(memo, value)) {
        memo.push(value);
        results.push(array[index]);
      }
      return memo;
    }, []);
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays. (Aliased as "intersect" for back-compat.)
  _.intersection = _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = _.flatten(slice.call(arguments, 1), true);
    return _.filter(array, function(value){ return !_.include(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i, l;
    if (isSorted) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) func.apply(context, args);
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        result = func.apply(context, args);
      }
      whenDone();
      throttling = true;
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      if (immediate && !timeout) func.apply(context, args);
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      return memo = func.apply(this, arguments);
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) { return func.apply(this, arguments); }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var result = {};
    each(_.flatten(slice.call(arguments, 1)), function(key) {
      if (key in obj) result[key] = obj[key];
    });
    return result;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function.
  function eq(a, b, stack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // Invoke a custom `isEqual` method if one is provided.
    if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
    if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) return true;
    }
    // Add the first object to the stack of traversed objects.
    stack.push(a);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          // Ensure commutative equality for sparse arrays.
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent.
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    stack.pop();
    return result;
  }

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return toString.call(obj) == '[object Arguments]';
  };
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Is a given value a function?
  _.isFunction = function(obj) {
    return toString.call(obj) == '[object Function]';
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return toString.call(obj) == '[object String]';
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return toString.call(obj) == '[object Number]';
  };

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`?
  _.isNaN = function(obj) {
    // `NaN` is the only value for which `===` is not reflexive.
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return toString.call(obj) == '[object Date]';
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return toString.call(obj) == '[object RegExp]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Has own property?
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Escape a string for HTML interpolation.
  _.escape = function(string) {
    return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
  };

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /.^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    '\\': '\\',
    "'": "'",
    'r': '\r',
    'n': '\n',
    't': '\t',
    'u2028': '\u2028',
    'u2029': '\u2029'
  };

  for (var p in escapes) escapes[escapes[p]] = p;
  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
  var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

  // Within an interpolation, evaluation, or escaping, remove HTML escaping
  // that had been previously added.
  var unescape = function(code) {
    return code.replace(unescaper, function(match, escape) {
      return escapes[escape];
    });
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults(settings || {}, _.templateSettings);

    // Compile the template source, taking care to escape characters that
    // cannot be included in a string literal and then unescape them in code
    // blocks.
    var source = "__p+='" + text
      .replace(escaper, function(match) {
        return '\\' + escapes[match];
      })
      .replace(settings.escape || noMatch, function(match, code) {
        return "'+\n_.escape(" + unescape(code) + ")+\n'";
      })
      .replace(settings.interpolate || noMatch, function(match, code) {
        return "'+\n(" + unescape(code) + ")+\n'";
      })
      .replace(settings.evaluate || noMatch, function(match, code) {
        return "';\n" + unescape(code) + "\n;__p+='";
      }) + "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __p='';" +
      "var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
      source + "return __p;\n";

    var render = new Function(settings.variable || 'obj', '_', source);
    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for build time
    // precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' +
      source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      var wrapped = this._wrapped;
      method.apply(wrapped, arguments);
      var length = wrapped.length;
      if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
      return result(wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

}).call(this);
});

require.define("/lib/natural/tokenizers/treebank_word_tokenizer.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require("util"),
    Tokenizer = require('./tokenizer'),
    _ = require('underscore')._;

var contractions2 = [
    /(.)('ll|'re|'ve|n't|'s|'m|'d)\b/ig,
    /\b(can)(not)\b/ig,
    /\b(D)('ye)\b/ig,
    /\b(Gim)(me)\b/ig,
    /\b(Gon)(na)\b/ig,
    /\b(Got)(ta)\b/ig,
    /\b(Lem)(me)\b/ig,
    /\b(Mor)('n)\b/ig,
    /\b(T)(is)\b/ig,
    /\b(T)(was)\b/ig,
    /\b(Wan)(na)\b/ig];

var contractions3 = [
    /\b(Whad)(dd)(ya)\b/ig,
    /\b(Wha)(t)(cha)\b/ig
];

TreebankWordTokenizer = function() {
}

util.inherits(TreebankWordTokenizer, Tokenizer);

TreebankWordTokenizer.prototype.tokenize = function(text) {
    contractions2.forEach(function(regexp) {
	text = text.replace(regexp,"$1 $2");
    });

    contractions3.forEach(function(regexp) {
	text = text.replace(regexp,"$1 $2 $3");
    });

    // most punctuation
    text = text.replace(/([^\w\.\'\-\/\+\<\>,&])/g, " $1 ");

    // commas if followed by space
    text = text.replace(/(,\s)/g, " $1");

    // single quotes if followed by a space
    text = text.replace(/('\s)/g, " $1");

    // periods before newline or end of string
    text = text.replace(/\. *(\n|$)/g, " . ");

    return  _.without(text.split(/\s+/), '');
}

module.exports = TreebankWordTokenizer;
});

require.define("/lib/natural/inflectors/noun_inflector.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var SingularPluralInflector = require('./singular_plural_inflector'),
    util = require('util'),
    FormSet = require('./form_set');

function attach() {
    var inflector = this;

    String.prototype.singularizeNoun = function() {
        return inflector.singularize(this);
    }

    String.prototype.pluralizeNoun = function() {
        return inflector.pluralize(this);
    }
}

var NounInflector = function() {
    this.ambiguous = [
        'bison', 'bream', 'carp', 'chassis', 'cod', 'corps', 'debris', 'deer',
        'diabetes', 'equipment', 'elk', 'fish', 'flounder', 'gallows', 'graffiti',
        'headquarters', 'herpes', 'highjinks', 'homework', 'information',
        'mackerel', 'mews', 'money', 'news', 'rice', 'rabies', 'salmon', 'series',
        'sheep', 'shrimp', 'species', 'swine', 'trout', 'tuna', 'whiting', 'wildebeest'
    ];

    this.customPluralForms = [];
    this.customSingularForms = [];
    this.singularForms = new FormSet();
    this.pluralForms = new FormSet();

    this.attach = attach;

    this.addIrregular("child", "children");
    this.addIrregular("man", "men");
    this.addIrregular("person", "people");
    this.addIrregular("sex", "sexes");
    this.addIrregular("mouse", "mice");
    this.addIrregular("ox", "oxen");
    this.addIrregular("foot", "feet");
    this.addIrregular("tooth", "teeth");
    this.addIrregular("goose", "geese");
    this.addIrregular("initiative", "initiatives");
    this.addIrregular("cause", "causes");
    this.addIrregular("drive", "drives");
    this.addIrregular("gas", "gases");
    this.addIrregular("syndrome", "syndromes");

    // see if it is possible to unify the creation of both the singular and
    // plural regexes or maybe even just have one list. with a complete list
    // of rules it may only be possible for some regular forms, but worth a shot
    this.pluralForms.regularForms.push([/y$/i, 'ies']);
    this.pluralForms.regularForms.push([/ife$/i, 'ives']);
    this.pluralForms.regularForms.push([/(antenn|formul|nebul|vertebr|vit)a$/i, '$1ae']);
    this.pluralForms.regularForms.push([/(octop|vir|radi|nucle|fung|cact|stimul)us$/i, '$1i']);
    this.pluralForms.regularForms.push([/(buffal|tomat)o$/i, '$1oes']);
    this.pluralForms.regularForms.push([/(sis)$/i, 'ses']);
    this.pluralForms.regularForms.push([/(matr|vert|ind)(ix|ex)$/i, '$1ices']);
    this.pluralForms.regularForms.push([/(x|ch|ss|sh|s|z)$/i, '$1es']);
    this.pluralForms.regularForms.push([/^(?!talis|.*hu)(.*)man$/i, '$1men']);
    this.pluralForms.regularForms.push([/(.*)/i, '$1s']);

    this.singularForms.regularForms.push([/([^v])ies$/i, '$1y']);
    this.singularForms.regularForms.push([/ives$/i, 'ife']);
    this.singularForms.regularForms.push([/(antenn|formul|nebul|vertebr|vit)ae$/i, '$1a']);
    this.singularForms.regularForms.push([/(octop|vir|radi|nucle|fung|cact|stimul)(i)$/i, '$1us']);
    this.singularForms.regularForms.push([/(buffal|tomat)(oes)$/i, '$1o']);
    this.singularForms.regularForms.push([/(analy|naly|synop|parenthe|diagno|the)ses$/i, '$1sis']);
    this.singularForms.regularForms.push([/(vert|ind)(ices)$/i, '$1ex']);
    // our pluralizer won''t cause this form of appendix (appendicies)
    // but we should handle it
    this.singularForms.regularForms.push([/(matr|append)(ices)$/i, '$1ix']);
    this.singularForms.regularForms.push([/(x|ch|ss|sh|s|z)es$/i, '$1']);
    this.singularForms.regularForms.push([/men$/i, 'man']);
    this.singularForms.regularForms.push([/s$/i, '']);

    this.pluralize = function (token) {
        return this.ize(token, this.pluralForms, this.customPluralForms);
    };

    this.singularize = function(token) {
        return this.ize(token, this.singularForms, this.customSingularForms);
    };
};

util.inherits(NounInflector, SingularPluralInflector);

module.exports = NounInflector;
});

require.define("/lib/natural/inflectors/singular_plural_inflector.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var TenseInflector = function () {
};

TenseInflector.prototype.addSingular = function(pattern, replacement) {
    this.customSingularForms.push([pattern, replacement]);
};

TenseInflector.prototype.addPlural = function(pattern, replacement) {
    this.customPluralForms.push([pattern, replacement]);
};

TenseInflector.prototype.ize = function (token, formSet, customForms) {
    var restoreCase = this.restoreCase(token);
    return restoreCase(this.izeRegExps(token, customForms) || this.izeAbiguous(token) ||
        this.izeRegulars(token, formSet) || this.izeRegExps(token, formSet.regularForms) ||
        token);
}

TenseInflector.prototype.izeAbiguous = function (token) {
    if(this.ambiguous.indexOf(token.toLowerCase()) > -1)
        return token.toLowerCase();

    return false;
}

TenseInflector.prototype.pluralize = function (token) {
    return this.ize(token, this.pluralForms, this.customPluralForms);
};

TenseInflector.prototype.singularize = function(token) {
    return this.ize(token, this.singularForms, this.customSingularForms);
};

var uppercaseify = function(token) {
    return token.toUpperCase();
}
var capitalize = function(token) {
    return token[0].toUpperCase() + token.slice(1);
}
var lowercaseify = function(token) {
    return token.toLowerCase();
}

TenseInflector.prototype.restoreCase = function(token) {
    if (token[0] === token[0].toUpperCase()) {
        if (token[1] && token[1] === token[1].toLowerCase()) {
            return capitalize;
        } else {
            return uppercaseify;
        }
    } else {
        return lowercaseify;
    }
}

TenseInflector.prototype.izeRegulars = function(token, formSet) {
    token = token.toLowerCase();

    if(formSet.irregularForms[token])
        return formSet.irregularForms[token];

    return false;
}

TenseInflector.prototype.addForm = function(singularTable, pluralTable, singular, plural) {
    singular = singular.toLowerCase();
    plural = plural.toLowerCase();
    pluralTable[singular] = plural;
    singularTable[plural] = singular;
};

TenseInflector.prototype.addIrregular = function(singular, plural) {
    this.addForm(this.singularForms.irregularForms, this.pluralForms.irregularForms, singular, plural);
};

TenseInflector.prototype.izeRegExps = function(token, forms) {
        var i, form;
        for(i = 0; i < forms.length; i++) {
            form = forms[i];

            if(token.match(form[0]))
                return token.replace(form[0], form[1]);
        }

        return false;
    }

module.exports = TenseInflector;
});

require.define("/lib/natural/inflectors/form_set.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var FormSet = function() {
    this.regularForms = [];
    this.irregularForms = {};
}

module.exports = FormSet;
});

require.define("/lib/natural/inflectors/present_verb_inflector.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require('util'),
    SingularPluralInflector = require('./singular_plural_inflector'),
    FormSet = require('./form_set');

function attach() {
    var inflector = this;

    String.prototype.singularizePresentVerb = function() {
        return inflector.singularize(this);
    }

    String.prototype.pluralizePresentVerb = function() {
        return inflector.pluralize(this);
    }
}

var VerbInflector = function() {
    this.ambiguous = [
        'will'
    ];

    this.attach = attach;

    this.customPluralForms = [];
    this.customSingularForms = [];
    this.singularForms = new FormSet();
    this.pluralForms = new FormSet();

    this.addIrregular("am", "are");
    this.addIrregular("is", "are");
    this.addIrregular("was", "were");

    this.singularForms.regularForms.push([/ed$/i, 'ed']);
    this.singularForms.regularForms.push([/ss$/i, 'sses']);
    this.singularForms.regularForms.push([/x$/i, 'xes']);
    this.singularForms.regularForms.push([/(h|z|o)$/i, '$1es']);
    this.singularForms.regularForms.push([/$zz/i, 'zzes']);
    this.singularForms.regularForms.push([/$/i, 's']);

    this.pluralForms.regularForms.push([/sses$/i, 'ss']);
    this.pluralForms.regularForms.push([/xes$/i, 'x']);
    this.pluralForms.regularForms.push([/([cs])hes$/i, '$1h']);
    this.pluralForms.regularForms.push([/zzes$/i, 'zz']);
    this.pluralForms.regularForms.push([/([^h|z|o])es$/i, '$1e']);
    this.pluralForms.regularForms.push([/e?s$/i, '']);
};

util.inherits(VerbInflector, SingularPluralInflector);

module.exports = VerbInflector;
});

require.define("/lib/natural/inflectors/count_inflector.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

function nthForm(i) {
    teenth = (i % 100);

    if(teenth > 10 && teenth < 14)
        return 'th';
    else {
        switch(i % 10) {
            case 1:
                return 'st';
                break;
            case 2:
                return 'nd';
                break;
            case 3:
                return 'rd';
                break;
            default:
                return 'th';
        }
    }
}

function nth(i) {
    return i.toString() + nthForm(i);
}

function CountInflector() {}
CountInflector.nth = nth;

module.exports = CountInflector;

});


var StopWordsRemoverML = (function(){
	  var languagesStopWords = {
	    "da" : 
		' ad af alle alt anden at blev blive bliver da de dem den denne der deres det dette dig din disse dog du efter eller en end er et for fra ham han hans har havde have hende hendes her hos hun hvad hvis hvor i ikke ind jeg jer jo kunne man mange med meget men mig min mine mit mod ned noget nogle nu når og også om op os over på selv sig sin sine sit skal skulle som sådan thi til ud under var vi vil ville vor være været'.split(' '),  
		
	   "de" : 
		' aber alle allem allen aller alles als also am an ander andere anderem anderen anderer anderes anderm andern anderr anders auch auf aus bei bin bis bist da damit dann das dasselbe dazu daß dein deine deinem deinen deiner deines dem demselben den denn denselben der derer derselbe derselben des desselben dessen dich die dies diese dieselbe dieselben diesem diesen dieser dieses dir doch dort du durch ein eine einem einen einer eines einig einige einigem einigen einiger einiges einmal er es etwas euch euer eure eurem euren eurer eures für gegen gewesen hab habe haben hat hatte hatten hier hin hinter ich ihm ihn ihnen ihr ihre ihrem ihren ihrer ihres im in indem ins ist jede jedem jeden jeder jedes jene jenem jenen jener jenes jetzt kann kein keine keinem keinen keiner keines können könnte machen man manche manchem manchen mancher manches mein meine meinem meinen meiner meines mich mir mit muss musste nach nicht nichts noch nun nur ob oder ohne sehr sein seine seinem seinen seiner seines selbst sich sie sind so solche solchem solchen solcher solches soll sollte sondern sonst um und uns unse unsem unsen unser unses unter viel vom von vor war waren warst was weg weil weiter welche welchem welchen welcher welches wenn werde werden wie wieder will wir wird wirst wo wollen wollte während würde würden zu zum zur zwar zwischen über und in aus'.split(' '),
	    
	    "du" :     
		'  aan al alles als altijd andere ben bij daar dan dat de der deze die dit doch doen door dus een eens en er ge geen geweest haar had heb hebben heeft hem het hier hij hoe hun iemand iets ik in is ja je kan kon kunnen maar me meer men met mij mijn moet na naar niet niets nog nu of om omdat onder ons ook op over reeds te tegen toch toen tot u uit uw van veel voor want waren was wat werd wezen wie wil worden wordt zal ze zelf zich zij zijn zo zonder zou'.split(' '),     
	    
	    "es" :     
		' a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el ella ellas ellos en entre era erais eran eras eres es esa esas ese eso esos esta estaba estabais estaban estabas estad estada estadas estado estados estamos estando estar estaremos estará estarán estarás estaré estaréis estaría estaríais estaríamos estarían estarías estas este estemos esto estos estoy estuve estuviera estuvierais estuvieran estuvieras estuvieron estuviese estuvieseis estuviesen estuvieses estuvimos estuviste estuvisteis estuviéramos estuviésemos estuvo está estábamos estáis están estás esté estéis estén estés fue fuera fuerais fueran fueras fueron fuese fueseis fuesen fueses fui fuimos fuiste fuisteis fuéramos fuésemos ha habida habidas habido habidos habiendo habremos habrá habrán habrás habré habréis habría habríais habríamos habrían habrías habéis había habíais habíamos habían habías han has hasta hay haya hayamos hayan hayas hayáis he hemos hube hubiera hubierais hubieran hubieras hubieron hubiese hubieseis hubiesen hubieses hubimos hubiste hubisteis hubiéramos hubiésemos hubo la las le les lo los me mi mis mucho muchos muy más mí mía mías mío míos nada ni no nos nosotras nosotros nuestra nuestras nuestro nuestros o os otra otras otro otros para pero poco por porque que quien quienes qué se sea seamos sean seas seremos será serán serás seré seréis sería seríais seríamos serían serías seáis sido siendo sin sobre sois somos son soy su sus suya suyas suyo suyos sí también tanto te tendremos tendrá tendrán tendrás tendré tendréis tendría tendríais tendríamos tendrían tendrías tened tenemos tenga tengamos tengan tengas tengo tengáis tenida tenidas tenido tenidos teniendo tenéis tenía teníais teníamos tenían tenías ti tiene tienen tienes todo todos tu tus tuve tuviera tuvierais tuvieran tuvieras tuvieron tuviese tuvieseis tuviesen tuvieses tuvimos tuviste tuvisteis tuviéramos tuviésemos tuvo tuya tuyas tuyo tuyos tú un una uno unos vosotras vosotros vuestra vuestras vuestro vuestros y ya yo él éramos'.split(' '),
	    
	
	    "fi" :  
		'  aan al alles als altijd andere ben bij daar dan dat de der deze die dit doch doen door dus een eens en er ge geen geweest haar had heb hebben heeft hem het hier hij hoe hun iemand iets ik in is ja je kan kon kunnen maar me meer men met mij mijn moet na naar niet niets nog nu of om omdat onder ons ook op over reeds te tegen toch toen tot u uit uw van veel voor want waren was wat werd wezen wie wil worden wordt zal ze zelf zich zij zijn zo zonder zou'.split(' '),
	    
	    "fr" :
		' ai aie aient aies ait as au aura aurai auraient aurais aurait auras aurez auriez aurions aurons auront aux avaient avais avait avec avez aviez avions avons ayant ayez ayons c ce ceci celà ces cet cette d dans de des du elle en es est et eu eue eues eurent eus eusse eussent eusses eussiez eussions eut eux eûmes eût eûtes furent fus fusse fussent fusses fussiez fussions fut fûmes fût fûtes ici il ils j je l la le les leur leurs lui m ma mais me mes moi mon même n ne nos notre nous on ont ou par pas pour qu que quel quelle quelles quels qui s sa sans se sera serai seraient serais serait seras serez seriez serions serons seront ses soi soient sois soit sommes son sont soyez soyons suis sur t ta te tes toi ton tu un une vos votre vous y à étaient étais était étant étiez étions été étée étées étés êtes'.split(' '),
	   
	    "hu" : 
		' a abban ahhoz ahogy ahol aki akik akkor alatt amely amelyek amelyekben amelyeket amelyet amelynek ami amikor amit amolyan amíg annak arra arról az azok azon azonban azt aztán azután azzal azért be belül benne bár cikk cikkek cikkeket csak de e ebben eddig egy egyes egyetlen egyik egyre egyéb egész ehhez ekkor el ellen elsõ elég elõ elõször elõtt emilyen ennek erre ez ezek ezen ezt ezzel ezért fel felé hanem hiszen hogy hogyan igen ill ill. illetve ilyen ilyenkor ismét ison itt jobban jó jól kell kellett keressünk keresztül ki kívül között közül legalább legyen lehet lehetett lenne lenni lesz lett maga magát majd majd meg mellett mely melyek mert mi mikor milyen minden mindenki mindent mindig mint mintha mit mivel miért most már más másik még míg nagy nagyobb nagyon ne nekem neki nem nincs néha néhány nélkül olyan ott pedig persze rá s saját sem semmi sok sokat sokkal szemben szerint szinte számára talán tehát teljes tovább továbbá több ugyanis utolsó után utána vagy vagyis vagyok valaki valami valamint való van vannak vele vissza viszont volna volt voltak voltam voltunk által általában át én éppen és így õ õk õket össze úgy új újabb újra'.split(' '),
	    
	    "it" :
		' a abbia abbiamo abbiano abbiate ad agl agli ai al all alla alle allo anche avemmo avendo avesse avessero avessi avessimo aveste avesti avete aveva avevamo avevano avevate avevi avevo avrai avranno avrebbe avrebbero avrei avremmo avremo avreste avresti avrete avrà avrò avuta avute avuti avuto c che chi ci coi col come con contro cui da dagl dagli dai dal dall dalla dalle dallo degl degli dei del dell della delle dello di dov dove e ebbe ebbero ebbi ed era erano eravamo eravate eri ero essendo faccia facciamo facciano facciate faccio facemmo facendo facesse facessero facessi facessimo faceste facesti faceva facevamo facevano facevate facevi facevo fai fanno farai faranno farebbe farebbero farei faremmo faremo fareste faresti farete farà farò fece fecero feci fosse fossero fossi fossimo foste fosti fu fui fummo furono gli ha hai hanno ho i il in io l la le lei li lo loro lui ma mi mia mie miei mio ne negl negli nei nel nell nella nelle nello noi non nostra nostre nostri nostro o per perché più quale quanta quante quanti quanto quella quelle quelli quello questa queste questi questo sarai saranno sarebbe sarebbero sarei saremmo saremo sareste saresti sarete sarà sarò se sei si sia siamo siano siate siete sono sta stai stando stanno starai staranno starebbe starebbero starei staremmo staremo stareste staresti starete starà starò stava stavamo stavano stavate stavi stavo stemmo stesse stessero stessi stessimo steste stesti stette stettero stetti stia stiamo stiano stiate sto su sua sue sugl sugli sui sul sull sulla sulle sullo suo suoi ti tra tu tua tue tuo tuoi tutti tutto un una uno vi voi vostra vostre vostri vostro è'.split(' '),
	    
	    "jp" : 
		' これ それ あれ この その あの ここ そこ あそこ こちら どこ だれ なに なん 何 私 貴方 貴方方 我々 私達 あの人 あのかた 彼女 彼 です あります おります います は が の に を で え から まで より も どの と し それで しかし'.split(' '),
	    
	    "no" :     
		' alle at av bare begge ble blei bli blir blitt både båe da de deg dei deim deira deires dem den denne der dere deres det dette di din disse ditt du dykk dykkar då eg ein eit eitt eller elles en enn er et ett etter for fordi fra før ha hadde han hans har hennar henne hennes her hjå ho hoe honom hoss hossen hun hva hvem hver hvilke hvilken hvis hvor hvordan hvorfor i ikke ikkje ikkje ingen ingi inkje inn inni ja jeg kan kom korleis korso kun kunne kva kvar kvarhelst kven kvi kvifor man mange me med medan meg meget mellom men mi min mine mitt mot mykje ned no noe noen noka noko nokon nokor nokre nå når og også om opp oss over på samme seg selv si si sia sidan siden sin sine sitt sjøl skal skulle slik so som som somme somt så sånn til um upp ut uten var vart varte ved vere verte vi vil ville vore vors vort vår være være vært å'.split(' '),
	    
	    "pt" :     
		' a ao aos aquela aquelas aquele aqueles aquilo as até com como da das de dela delas dele deles depois do dos e ela elas ele eles em entre era eram essa essas esse esses esta estamos estas estava estavam este esteja estejam estejamos estes esteve estive estivemos estiver estivera estiveram estiverem estivermos estivesse estivessem estivéramos estivéssemos estou está estávamos estão eu foi fomos for fora foram forem formos fosse fossem fui fôramos fôssemos haja hajam hajamos havemos hei houve houvemos houver houvera houveram houverei houverem houveremos houveria houveriam houvermos houverá houverão houveríamos houvesse houvessem houvéramos houvéssemos há hão isso isto já lhe lhes mais mas me mesmo meu meus minha minhas muito na nas nem no nos nossa nossas nosso nossos num numa não nós o os ou para pela pelas pelo pelos por qual quando que quem se seja sejam sejamos sem serei seremos seria seriam será serão seríamos seu seus somos sou sua suas são só também te tem temos tenha tenham tenhamos tenho terei teremos teria teriam terá terão teríamos teu teus teve tinha tinham tive tivemos tiver tivera tiveram tiverem tivermos tivesse tivessem tivéramos tivéssemos tu tua tuas tém tínhamos um uma você vocês vos à às éramos'.split(' '),
	    
	    "ro" :
	    
		' acea aceasta această aceea acei aceia acel acela acele acelea acest acesta aceste acestea aceşti aceştia acolo acord acum ai aia aibă aici al ale alea altceva altcineva am ar are asemenea asta astea astăzi asupra au avea avem aveţi azi aş aşadar aţi bine bucur bună ca care caut ce cel ceva chiar cinci cine cineva contra cu cum cumva curând curînd când cât câte câtva câţi cînd cît cîte cîtva cîţi că căci cărei căror cărui către da dacă dar datorită dată dau de deci deja deoarece departe deşi din dinaintea dintr- dintre doi doilea două drept după dă ea ei el ele eram este eu eşti face fata fi fie fiecare fii fim fiu fiţi frumos fără graţie halbă iar ieri la le li lor lui lângă lîngă mai mea mei mele mereu meu mi mie mine mult multă mulţi mulţumesc mâine mîine mă ne nevoie nici nicăieri nimeni nimeri nimic nişte noastre noastră noi noroc nostru nouă noştri nu opt ori oricare orice oricine oricum oricând oricât oricînd oricît oriunde patra patru patrulea pe pentru peste pic poate pot prea prima primul prin puţin puţina puţină până pînă rog sa sale sau se spate spre sub sunt suntem sunteţi sută sînt sîntem sînteţi să săi său ta tale te timp tine toate toată tot totuşi toţi trei treia treilea tu tăi tău un una unde undeva unei uneia unele uneori unii unor unora unu unui unuia unul vi voastre voastră voi vostru vouă voştri vreme vreo vreun vă zece zero zi zice îi îl îmi împotriva în  înainte înaintea încotro încât încît între întrucât întrucît îţi ăla ălea ăsta ăstea ăştia şapte şase şi ştiu ţi ţie'.split(' '),
	    
	    "ru" :     
	      ' алло без близко более больше будем будет будете будешь будто буду будут будь бы бывает бывь был была были было быть в важная важное важные важный вам вами вас ваш ваша ваше ваши вверх вдали вдруг ведь везде весь вниз внизу во вокруг вон восемнадцатый восемнадцать восемь восьмой вот впрочем времени время все всегда всего всем всеми всему всех всею всю всюду вся всё второй вы г где говорил говорит год года году да давно даже далеко дальше даром два двадцатый двадцать две двенадцатый двенадцать двух девятнадцатый девятнадцать девятый девять действительно дел день десятый десять для до довольно долго должно другая другие других друго другое другой е его ее ей ему если есть еще ещё ею её ж же жизнь за занят занята занято заняты затем зато зачем здесь значит и из или им именно иметь ими имя иногда их к каждая каждое каждые каждый кажется как какая какой кем когда кого ком кому конечно которая которого которой которые который которых кроме кругом кто куда лет ли лишь лучше люди м мало между меля менее меньше меня миллионов мимо мира мне много многочисленная многочисленное многочисленные многочисленный мной мною мог могут мож может можно можхо мои мой мор мочь моя моё мы на наверху над надо назад наиболее наконец нам нами нас начала наш наша наше наши не него недавно недалеко нее ней нельзя нем немного нему непрерывно нередко несколько нет нею неё ни нибудь ниже низко никогда никуда ними них ничего но ну нужно нх о об оба обычно один одиннадцатый одиннадцать однажды однако одного одной около он она они оно опять особенно от отовсюду отсюда очень первый перед по под пожалуйста позже пока пор пора после посреди потом потому почему почти прекрасно при про просто против процентов пятнадцатый пятнадцать пятый пять раз разве рано раньше рядом с сам сама сами самим самими самих само самого самой самом самому саму свое своего своей свои своих свою сеаой себе себя сегодня седьмой сейчас семнадцатый семнадцать семь сих сказал сказала сказать сколько слишком сначала снова со собой собою совсем спасибо стал суть т та так такая также такие такое такой там твой твоя твоё те тебе тебя тем теми теперь тех то тобой тобою тогда того тоже только том тому тот тою третий три тринадцатый тринадцать ту туда тут ты тысяч у уж уже уметь хорошо хотеть хоть хотя хочешь часто чаще чего человек чем чему через четвертый четыре четырнадцатый четырнадцать что чтоб чтобы чуть шестнадцатый шестнадцать шестой шесть эта эти этим этими этих это этого этой этом этому этот эту я ﻿а'.split(' '), 
	      
	    "sv" :      
		' alla allt att av blev bli blir blivit de dem den denna deras dess dessa det detta dig din dina ditt du där då efter ej eller en er era ert ett från för ha hade han hans har henne hennes hon honom hur här i icke ingen inom inte jag ju kan kunde man med mellan men mig min mina mitt mot mycket ni nu när någon något några och om oss på samma sedan sig sin sina sitta själv skulle som så sådan sådana sådant till under upp ut utan vad var vara varför varit varje vars vart vem vi vid vilka vilkas vilken vilket vår våra vårt än är åt över'.split(' '), 
	      
	    "tr" : 
		' acaba altmış altı ama ancak arada aslında ayrıca bana bazı belki ben benden beni benim beri beş bile bin bir biri birkaç birkez birçok birşey birşeyi biz bizden bize bizi bizim bu buna bunda bundan bunlar bunları bunların bunu bunun burada böyle böylece da daha dahi de defa değil diye diğer doksan dokuz dolayı dolayısıyla dört edecek eden ederek edilecek ediliyor edilmesi ediyor elli en etmesi etti ettiği ettiğini eğer gibi göre halen hangi hatta hem henüz hep hepsi her herhangi herkesin hiç hiçbir iki ile ilgili ise itibaren itibariyle için işte kadar karşın katrilyon kendi kendilerine kendini kendisi kendisine kendisini kez ki kim kimden kime kimi kimse kırk milyar milyon mu mü mı nasıl ne neden nedenle nerde nerede nereye niye niçin o olan olarak oldu olduklarını olduğu olduğunu olmadı olmadığı olmak olması olmayan olmaz olsa olsun olup olur olursa oluyor on ona ondan onlar onlardan onları onların onu onun otuz oysa pek rağmen sadece sanki sekiz seksen sen senden seni senin siz sizden sizi sizin tarafından trilyon tüm var vardı ve veya ya yani yapacak yapmak yaptı yaptıkları yaptığı yaptığını yapılan yapılması yapıyor yedi yerine yetmiş yine yirmi yoksa yüz zaten çok çünkü öyle üzere üç şey şeyden şeyi şeyler şu şuna şunda şundan şunları şunu şöyle'.split(' ')  
		
	}
	
	function StopWordsRemoverML(arguments) {
		
	}
	
	StopWordsRemoverML.prototype.remove = function(text, language){
		var text = text.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '').replace( /\s\s+/g, ' ' );
		var stopWords = languagesStopWords[language]; 
	    if(!stopWords) {
	    	return  text.split(' ');
	    } 
	    var textArray =  text.split(' ');
	    var removeCondition = function(word){
			return _.contains(stopWords, word);
	    }    
	    var result = _.reject(textArray, removeCondition); 
	    return  _.reject(textArray, removeCondition);
	};  
	
	return StopWordsRemoverML; 
})();




require.define("/lib/natural/tfidf/tfidf.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._,
    Tokenizer = require('../tokenizers/regexp_tokenizer').WordTokenizer,
    tokenizer = new Tokenizer(),
    Stemmer = require('../stemmers/porter_stemmer'),
    stopwords = require('../util/stopwords').words,
    fs = require('fs');
    Stemmer.attach();
    var stemmedStopwords = stopwords.map(function(word) { return word.stem(); });

function buildDocument(text, key) {
	
	    Tokenizer = require('../tokenizers/regexp_tokenizer').WordTokenizer,
    tokenizer = new Tokenizer(),
    Stemmer = require('../stemmers/porter_stemmer'),
    stopwords = require('../util/stopwords').words,
    fs = require('fs');
    Stemmer.attach();
    var stemmedStopwords = stopwords.map(function(word) { return word.stem(); });
    var stopOut;

    if(typeof text === 'string') {
        text = tokenizer.tokenize(text.toLowerCase());
        text.forEach(function(t){
            t = (!t.isAllUpperCase()) ? t.toLowerCase() : t;
        });

        stopOut = true;
    } else if(!_.isArray(text)) {
        return text;
        stopOut = false;
    }

    return text.reduce(function(document, term) {
        if(!stopOut || (stemmedStopwords.indexOf(term) < 0)){
            document[term] = (document[term] ? document[term] + 1 : 1);
        }

        return document;
    }, {__key: key});
}

function buildDocumentML(text, language, key) {
	// var stopWordsRemoverML = new StopWordsRemoverML(); 
	// text = stopWordsRemoverML.remove(text, language);
    return text.reduce(function(document, term) {
        //if(!stopOut || (stemmedStopwords.indexOf(term) < 0)){
            document[term] = (document[term] ? document[term] + 1 : 1);
        //}

        return document;
    }, {__key: key}); 
}

function tf(term, document) {
    return document[term] ? document[term]: 0;
}

function documentHasTerm(term, document) {
    return document[term] && document[term] > 0;
}

function TfIdf(deserialized) {
    if(deserialized)
        this.documents = deserialized.documents;
    else
        this.documents = [];
}

module.exports = TfIdf;
TfIdf.tf = tf;

TfIdf.prototype.idf = function(term) {
    var docsWithTerm = this.documents.reduce(function(count, document) {
        return count + (documentHasTerm(term, document) ? 1 : 0);
    }, 1);

    return Math.log(this.documents.length + 1 / docsWithTerm /* inited to 1 so
        no addition needed */);
};

TfIdf.prototype.addDocument = function(document, key) {

    this.documents.push(buildDocument(document, key));
    //console.log(JSON.stringify(this.documents[this.documents.length-1]));
};

TfIdf.prototype.addDocumentML= function(document, language, key) {
    this.documents.push(buildDocumentML(document, language, key));
    //console.log(JSON.stringify(this.documents[this.documents.length-1]));
};

TfIdf.prototype.addFileSync = function(path, encoding, key) {
    if(encoding)
        encoding = 'UTF-8';

    var document = fs.readFileSync(path, 'UTF-8');
    this.documents.push(buildDocument(document, key));
};

TfIdf.prototype.tfidf = function(terms, d) {
    var _this = this;

    if(!_.isArray(terms))
        terms = tokenizer.tokenize(terms.toString().toLowerCase());

    return terms.reduce(function(value, term) {
        return value + (tf(term, _this.documents[d]) * _this.idf(term));
    }, 0.0);
};

TfIdf.prototype.listTerms = function(d) {
    var terms = [];

    for(term in this.documents[d]) {
		terms.push({term: term, tfidf: this.tfidf(term, d)})
    }

    return terms.sort(function(x, y) { return y.tfidf - x.tfidf });
}

TfIdf.prototype.tfidfML = function(terms, d) {
    var _this = this;
	var termsArray = [terms]
    return termsArray.reduce(function(value, term) {
        return value + (tf(term, _this.documents[d]) * _this.idf(term));
    }, 0.0);
};

TfIdf.prototype.listTermsML = function(d) {
    var terms = [];

    for(term in this.documents[d]) {
		terms.push({term: term, tfidf: this.tfidf(term, d)})
    }

    return terms.sort(function(x, y) { return y.tfidf - x.tfidf });
}

TfIdf.prototype.tfidfs = function(terms, callback) {
    var tfidfs = new Array(this.documents.length);

    for(var i = 0; i < this.documents.length; i++) {
        tfidfs[i] = this.tfidf(terms, i);

        if(callback)
            callback(i, tfidfs[i], this.documents[i].__key);
    }

    return tfidfs;
};
});

require.define("fs",function(require,module,exports,__dirname,__filename,process){// nothing to see here... no file methods for the browser
});

require.define("/lib/natural/analyzers/sentence_analyzer.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._;

/*
 Sentences Analizer Class
 From http://www.writingcentre.uottawa.ca/hypergrammar/sntpurps.html

 Take a POS input and analyse it for
  - Type of Sentense
     - Interrogative
       - Tag Questions
       -
     - Declarative
     - Exclamatory
     - Imperative

  - Parts of a Sentense
     - Subject
     - Predicate

  - Show Preposition Phrases
*/

var Sentences = function(pos, callback) {
    this.posObj = pos;
    this.senType = null;
    callback(this);
}

Sentences.prototype.part = function(callback) {
    var subject = [],
	predicat = [],
	verbFound = false;

    this.prepositionPhrases();

    for (var i = 0; i < this.posObj.tags.length; i++) {
        if (this.posObj.tags[i].pos == "VB") {
            if (i === 0) {
                verbFound = true;
            } else {
                // We need to Test for any EX before the VB
                if (this.posObj.tags[i - 1].pos != "EX") {
                    verbFound = true;
                } else {
                    predicat.push(this.posObj.tags[i].token);
                }
            }
        }

        // Add Pronoun Phrase (pp) Or Subject Phrase (sp)
        if (!verbFound) {
            if (this.posObj.tags[i].pp != true)
                this.posObj.tags[i].spos = "SP";

            subject.push(this.posObj.tags[i].token);
        } else {
            if (this.posObj.tags[i].pp != true)
                this.posObj.tags[i].spos = "PP";

            predicat.push(this.posObj.tags[i].token)
        }
    }

    if (subject.length == 0) {
	this.posObj.tags.push({token:"You",spos:"SP",pos:"PRP",added:true});
    }

    callback(this);
}

// Takes POS and removes IN to NN or NNS
// Adds a PP for each prepositionPhrases
Sentences.prototype.prepositionPhrases = function() {
    var remove = false;

    for (var i = 0; i < this.posObj.tags.length; i++) {
        if (this.posObj.tags[i].pos.match("IN")) {
            remove = true;
        }

        if (remove) {
            this.posObj.tags[i].pp = true;
        }

        if (this.posObj.tags[i].pos.match("NN")) {
            remove = false;
        }
    }
}

Sentences.prototype.subjectToString = function() {
    return this.posObj.tags.map(function(t){ if (t.spos == "SP" || t.spos == "S" ) return t.token }).join(' ');
}

Sentences.prototype.predicateToString = function() {
    return this.posObj.tags.map(function(t){ if (t.spos == "PP" || t.spos == "P" ) return t.token }).join(' ');
}

Sentences.prototype.implicitYou = function() {
    for (var i = 0; i < this.posObj.tags.length;i++) {
        if (this.posObj.tags[i].added) {
            return true;
        }
    }

    return false;
}

Sentences.prototype.toString = function() {
    return this.posObj.tags.map(function(t){return t.token}).join(' ');
}

// This is quick and incomplete.
Sentences.prototype.type = function(callback) {
    var callback = callback || false;

    // FIXME - punct seems useless
    var lastElement = this.posObj.punct();
    lastElement = (lastElement.length != 0) ? lastElement.pop() : this.posObj.tags.pop();

    if (lastElement.pos !== ".") {
        if (this.implicitYou()) {
            this.senType = "COMMAND";
        } else if (_(["WDT","WP","WP$","WRB"]).contains(this.posObj.tags[0].pos)) {
            // Sentences that start with: who, what where when why and how, then they are questions
            this.senType = "INTERROGATIVE";
        } else if (_(["PRP"]).contains(lastElement.pos)) {
            // Sentences that end in a Personal pronoun are most likely questions
            // eg. We should run away, should we [?]
            // eg. You want to see that again, do you [?]
            this.senType = "INTERROGATIVE";
        } else {
            this.senType = "UNKNOWN";
        }

    } else {
        switch(lastElement.token) {
            case "?": this.senType = "INTERROGATIVE"; break;
            case "!": this.senType = (this.implicitYou()) ? "COMMAND":"EXCLAMATORY"; break;
            case ".": this.senType = (this.implicitYou()) ? "COMMAND":"DECLARATIVE";	break;
        }
    }

    if (callback && _(callback).isFunction()) {
        callback(this);
    } else {
        return this.senType;
    }
}

module.exports = Sentences;
});

require.define("/lib/natural/ngrams/ngrams.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._,
    Tokenizer = require('../tokenizers/regexp_tokenizer').WordTokenizer,
    tokenizer = new Tokenizer();

exports.ngrams = function(sequence, n) {
    return ngrams(sequence, n);
}

exports.bigrams = function(sequence) {
    return ngrams(sequence, 2);
}

exports.trigrams = function(sequence) {
    return ngrams(sequence, 3);
}

var ngrams = function(sequence, n) {
    var result = [];

    if (!_(sequence).isArray()) {
        sequence = tokenizer.tokenize(sequence);
    }

    var count = _.max([0, sequence.length - n + 1]);

    for (var i = 0; i < count; i++) {
        result.push(sequence.slice(i, i + n));
    }

    return result;
}

});

require.define("/lib/natural/distance/jaro-winkler_distance.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2012, Adam Phillabaum, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

Unless otherwise stated by a specific section of code

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// Computes the Jaro distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
function distance(s1, s2) {
    if (typeof(s1) != "string" || typeof(s2) != "string") return 0;
    if (s1.length == 0 || s2.length == 0)
        return 0;
    s1 = s1.toLowerCase(), s2 = s2.toLowerCase();
    var matchWindow = (Math.floor(Math.max(s1.length, s2.length) / 2.0)) - 1;
    var matches1 = new Array(s1.length);
    var matches2 = new Array(s2.length);
    var m = 0; // number of matches
    var t = 0; // number of transpositions

    //debug helpers
    //console.log("s1: " + s1 + "; s2: " + s2);
    //console.log(" - matchWindow: " + matchWindow);

    // find matches
    for (var i = 0; i < s1.length; i++) {
	var matched = false;

	// check for an exact match
	if (s1[i] ==  s2[i]) {
		matches1[i] = matches2[i] = matched = true;
		m++
	}

	// check the "match window"
	else {
        	// this for loop is a little brutal
        	for (k = (i <= matchWindow) ? 0 : i - matchWindow;
        		(k <= i + matchWindow) && k < s2.length && !matched;
			k++) {
            		if (s1[i] == s2[k]) {
                		if(!matches1[i] && !matches2[k]) {
                	    		m++;
               		}

        	        matches1[i] = matches2[k] = matched = true;
        	    }
        	}
	}
    }

    if(m == 0)
        return 0.0;

    // count transpositions
    var k = 0;

    for(var i = 0; i < s1.length; i++) {
    	if(matches1[k]) {
    	    while(!matches2[k] && k < matches2.length)
                k++;
	        if(s1[i] != s2[k] &&  k < matches2.length)  {
                t++;
            }

    	    k++;
    	}
    }

    //debug helpers:
    //console.log(" - matches: " + m);
    //console.log(" - transpositions: " + t);
    t = t / 2.0;
    return (m / s1.length + m / s2.length + (m - t) / m) / 3;
}

// Computes the Winkler distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
// dj is the Jaro Distance (if you've already computed it), leave blank and the method handles it
function JaroWinklerDistance(s1, s2, dj) {
    var jaro;
    (typeof(dj) == 'undefined')? jaro = distance(s1,s2) : jaro = dj;
    var p = 0.1; //
    var l = 0 // length of the matching prefix
    while(s1[l] == s2[l] && l < 4)
        l++;

    return jaro + l * p * (1 - jaro);
}
module.exports = JaroWinklerDistance;
});

require.define("/lib/natural/distance/levenshtein_distance.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2012, Sid Nallu, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
 * contribution by sidred123
 */

/*
 * Compute the Levenshtein distance between two strings.
 * Algorithm based from Speech and Language Processing - Daniel Jurafsky and James H. Martin.
 */

function LevenshteinDistance (source, target, options) {
    options = options || {};
    options.insertion_cost = options.insertion_cost || 1;
    options.deletion_cost = options.deletion_cost || 1;
    options.substitution_cost = options.substitution_cost || 2;

    var sourceLength = source.length;
    var targetLength = target.length;
    var distanceMatrix = [[0]];

    for (var row =  1; row <= sourceLength; row++) {
        distanceMatrix[row] = [];
        distanceMatrix[row][0] = distanceMatrix[row-1][0] + options.deletion_cost;
    }

    for (var column = 1; column <= targetLength; column++) {
        distanceMatrix[0][column] = distanceMatrix[0][column-1] + options.insertion_cost;
    }

    for (var row = 1; row <= sourceLength; row++) {
        for (var column = 1; column <= targetLength; column++) {
            var costToInsert = distanceMatrix[row][column-1] + options.insertion_cost;
            var costToDelete = distanceMatrix[row-1][column] + options.deletion_cost;

            var sourceElement = source[row-1];
            var targetElement = target[column-1];
            var costToSubstitute = distanceMatrix[row-1][column-1];
            if (sourceElement !== targetElement) {
                costToSubstitute = costToSubstitute + options.substitution_cost;
            }
            distanceMatrix[row][column] = Math.min(costToInsert, costToDelete, costToSubstitute);
        }
    }
    return distanceMatrix[sourceLength][targetLength];
}

module.exports = LevenshteinDistance;
});

require.define("/lib/natural/distance/dice_coefficient.js",function(require,module,exports,__dirname,__filename,process){/*
Copyright (c) 2011, John Crepezzi, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// Get all of the pairs of letters for a string
var letterPairs = function (str) {
  var numPairs = str.length - 1;
  var pairs = new Array(numPairs);
  for (var i = 0; i < numPairs; i++) {
    pairs[i] = str.substring(i, i + 2);
  }
  return pairs;
};

// Get all of the pairs in all of the words for a string
var wordLetterPairs = function (str) {
  var allPairs = [], pairs;
  var words = str.split(/\s+/);
  for (var i = 0; i < words.length; i++) {
    pairs = letterPairs(words[i]);
    allPairs.push.apply(allPairs, pairs);
  }
  return allPairs;
};

// Perform some sanitization steps
var sanitize = function (str) {
  return str.toLowerCase().replace(/^\s+|\s+$/g, '');
};

// Compare two strings, and spit out a number from 0-1
var compare = function (str1, str2) {
  var pairs1 = wordLetterPairs(sanitize(str1));
  var pairs2 = wordLetterPairs(sanitize(str2));
  var intersection = 0, union = pairs1.length + pairs2.length;
  var i, j, pair1, pair2;
  for (i = 0; i < pairs1.length; i++) {
    pair1 = pairs1[i];
    for (j = 0; j < pairs2.length; j++) {
      pair2 = pairs2[j];
      if (pair1 == pair2) {
        intersection ++;
        delete pairs2[j];
        break;
      }
    }
  }
  return 2 * intersection / union;
};

module.exports = compare;
});

require.define("/lib/natural/entry.js",function(require,module,exports,__dirname,__filename,process){window.natural = {};

window.natural.SoundEx = require('./phonetics/soundex');
window.natural.Metaphone = require('./phonetics/metaphone');
window.natural.DoubleMetaphone = require('./phonetics/double_metaphone');
window.natural.PorterStemmer = require('./stemmers/porter_stemmer');
window.natural.PorterStemmerRu = require('./stemmers/porter_stemmer_ru');
window.natural.PorterStemmerFr = require('./stemmers/porter_stemmer_fr');
window.natural.PorterStemmerIt = require('./stemmers/porter_stemmer_it');
window.natural.PorterStemmerFa = require('./stemmers/porter_stemmer_fa');
window.natural.PorterStemmerPt = require('./stemmers/porter_stemmer_fa');
window.natural.PorterStemmerNo = require('./stemmers/porter_stemmer_pt');
window.natural.PorterStemmerEs = require('./stemmers/porter_stemmer_es');
window.natural.PorterStemmerGr = require('./stemmers/porter_stemmer_gr');
window.natural.PorterStemmerMul = require('./stemmers/porter_stemmer_mul');
window.natural.MultiLingualService = require('./stemmers/multi_lingual_service');
window.natural.LancasterStemmer = require('./stemmers/lancaster_stemmer');
window.natural.AggressiveTokenizerRu = require('./tokenizers/aggressive_tokenizer_ru');
window.natural.AggressiveTokenizerFr = require('./tokenizers/aggressive_tokenizer_fr');
window.natural.AggressiveTokenizerIt = require('./tokenizers/aggressive_tokenizer_it');
window.natural.AggressiveTokenizerFa = require('./tokenizers/aggressive_tokenizer_fa');
window.natural.AggressiveTokenizerEs = require('./tokenizers/aggressive_tokenizer_es');
window.natural.AggressiveTokenizerPt = require('./tokenizers/aggressive_tokenizer_pt');
window.natural.AggressiveTokenizerNo = require('./tokenizers/aggressive_tokenizer_no');
window.natural.AggressiveTokenizerGr = require('./tokenizers/aggressive_tokenizer_gr');
window.natural.AggressiveTokenizerMul = require('./tokenizers/aggressive_tokenizer_mul');
window.natural.AggressiveTokenizer = require('./tokenizers/aggressive_tokenizer');
window.natural.RegexpTokenizer = require('./tokenizers/regexp_tokenizer').RegexpTokenizer;
window.natural.WordTokenizer = require('./tokenizers/regexp_tokenizer').WordTokenizer;
window.natural.WordPunctTokenizer = require('./tokenizers/regexp_tokenizer').WordPunctTokenizer;
window.natural.TreebankWordTokenizer = require('./tokenizers/treebank_word_tokenizer');
/*
window.natural.BayesClassifier = require('./classifiers/bayes_classifier');
window.natural.LogisticRegressionClassifier = require('./classifiers/logistic_regression_classifier');
*/
window.natural.NounInflector = require('./inflectors/noun_inflector');
window.natural.PresentVerbInflector = require('./inflectors/present_verb_inflector');
window.natural.CountInflector = require('./inflectors/count_inflector');
window.natural.LanguageDetector = require('./language/language_detecter');
/*
window.natural.WordNet = require('./wordnet/wordnet');
*/
window.natural.TfIdf = require('./tfidf/tfidf');
window.natural.SentenceAnalyzer = require('./analyzers/sentence_analyzer');
window.natural.stopwords = require('./util/stopwords').words;
window.natural.NGrams = require('./ngrams/ngrams');
window.natural.JaroWinklerDistance = require('./distance/jaro-winkler_distance');
window.natural.LevenshteinDistance = require('./distance/levenshtein_distance');
window.natural.DiceCoefficient = require('./distance/dice_coefficient');
});
require("/lib/natural/entry.js");
})();
