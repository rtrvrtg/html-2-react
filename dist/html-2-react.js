(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.html2React = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = require('./lib/html-2-react');

},{"./lib/html-2-react":3}],2:[function(require,module,exports){
/**
 * @file
 * Mutators.
 */

var defaultMutators = {};

var mapStyle = function(str) {
  if (!str || !str.length) {
    return {};
  }
  return str.split(/\s*;\s*/)
  .filter(function(i) {
    return i.length;
  })
  .map(function(i) {
    return i.split(/:/);
  })
  .reduce(function(agg, i) {
    var k = i.shift();
    agg[k] = i.map(function(ii) {
      return ii.replace(/^\s*/, '').replace(/\s*$/, '');
    }).join(':');
    return agg;
  }, {});
};

var capitalize = function(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Handle appropriate style attribute camelcasing for React.
 *
 * @see https://facebook.github.io/react/tips/inline-styles.html
 */
var adjustStylesForReact = function(styles) {
  for (var i in styles) {
    var key = i;
    if (i.indexOf('-') === 0) {
      // Vendor prefixes get capitalised.
      key = i.replace(/^-/, '').split('-').map(capitalize).join('')
    }
    else {
      key = i.split('-').map(function(str, index) {
        if (index === 0) {
          return str;
        }
        else {
          return capitalize(str);
        }
      }).join('');
    }
    styles[key] = styles[i];
    delete styles[i];
  }
};

/**
 * Maps the style attribute to a react compatible attribute.
 */
defaultMutators.mapClass = function(elem) {
  if (this.isDomNode(elem)) {
    if (!!elem.attributes && !!elem.attributes.class && !!elem.attributes.class.length) {
      elem.attributes.className = elem.attributes.class;
      delete elem.attributes.class;
    }
  }
};

/**
 * Maps the style attribute to a react compatible attribute.
 */
defaultMutators.mapStyle = function(elem) {
  if (this.isDomNode(elem)) {
    if (!!elem.attributes && !!elem.attributes.style && !!elem.attributes.style.length) {
      elem.attributes.style = mapStyle(elem.attributes.style);
      adjustStylesForReact(elem.attributes.style);
    }
  }
};

module.exports = defaultMutators;

},{}],3:[function(require,module,exports){
(function (global){
/**
 * @file
 * HTML to React converter.
 */

var jQuery = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null),
    React = (typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null),
    mutators = require('./mutators'),
    defaultMutators = require('./default-mutators');

/**
 * Parses HTML and returns React elements.
 */
var Html2React = function(inputHTML, options) {
  var defaultOptions = {
    useDefaultMutators: true
  };

  var state = {
    parsed: null,
    options: jQuery.extend({}, defaultOptions, options)
  };

  var priv = {};

  /**
   * Converts a NamedNodeMap to a plain old JS object.
   */
  priv.namedNodeMapToObject = function(nnm) {
    var obj = {};
    for (var i = 0; i < nnm.length; i++) {
      var attr = nnm.item(i),
      attrName = attr.name;
      if (attrName == 'class') {
        attrName = 'className';
      }
      obj[attrName] = attr.value;
    }
    return obj;
  };

  /**
   * Converts a single DOMNode into data to be handled by the React converter.
   */
  priv.parseNode = function(node) {
    if (node.nodeType == 1) {
      var out = {};
      out.nodeName = node.nodeName.toLowerCase();
      out.attributes = priv.namedNodeMapToObject(node.attributes);
      out.children = [].slice.call(node.childNodes).map(function(cn) {
        return priv.parseNode(cn);
      }).filter(function(cn) {
        return cn !== null;
      });
      return out;
    }
    else if (node.nodeType == 3) {
      return node.textContent;
    }
    else if (node.nodeType == 9) {
      return priv.parseNode(node.childNodes[0]);
    }
    return null;
  };

  /**
   * Initialises the class and parses the submitted HTML.
   */
  priv.init = function() {
    try {
      var wrapped = '<div class="html2react-parsed">' + inputHTML + '</div>';
      var html = jQuery.parseHTML(wrapped);
      state.parsed = priv.parseNode(html[0]);
      if (!!state.options.useDefaultMutators) {
        for (var i in defaultMutators) {
          pub.mutateEach(defaultMutators[i]);
        }
      }
    }
    catch(e) {
      console.log(e);
    }
  };

  /**
   * Converts a single HTML tag into a React element.
   *
   * Recursively calls itself to convert the element's children.
   */
  priv.elemToReact = function(elem, chain) {
    if (!chain) {
      chain = [0];
    }
    if (pub.isDomNode(elem)) {
      var nodeName = elem.nodeName,
      attributes = elem.attributes;
      attributes.key = chain.join('.');

      if (elem.children.length) {
        return React.createElement(
          nodeName,
          attributes,
          elem.children.map(function(c, i) {
            return priv.elemToReact(c, chain.concat([i]));
          })
        );
      }
      else {
        return React.createElement(
          nodeName,
          attributes
        );
      }
    }
    else {
      return elem;
    }
  };

  /**
   * Recursively mutate a single element using a particular function.
   */
  priv.mutateEach = function(elem, eachNode) {
    eachNode.call(pub, elem);
    if (!!elem.children && !!elem.children.length) {
      elem.children.forEach(function(child) {
        return priv.mutateEach(child, eachNode);
      });
    }
  };

  var pub = {};

  /**
   * Says whether the HTML submitted was parsed successfully or not.
   */
  pub.success = function() {
    return state.parsed !== null;
  };

  /**
   * Mutate the parsed tree before the elements are converted to React.
   *
   * @param function eachNode
   *   Mutator function to run on each node.
   */
  pub.mutateEach = function(eachNode) {
    if (state.parsed !== null) {
      if (!eachNode) {
        eachNode = function(elem) {};
      }
      priv.mutateEach(state.parsed, eachNode);
    }
  };

  /**
   * Determines if the current element is a parsed DOMNode.
   */
  pub.isDomNode = function(elem) {
    return (
      jQuery.isPlainObject(elem) &&
      !!elem.nodeName.length &&
      jQuery.isPlainObject(elem.attributes)
    );
  };

  /**
   * Defines a set of mutators that can be run through Html2React.mutateEach.
   */
  pub.mutators = mutators;

  /**
   * Returns React elements parsed from the HTML.
   */
  pub.toReact = function() {
    return priv.elemToReact(state.parsed);
  };

  priv.init();

  return pub;
};

module.exports = Html2React;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./default-mutators":2,"./mutators":4}],4:[function(require,module,exports){
/**
 * @file
 * Mutators.
 */

var optional = require('optional');
var ReactRouter = optional('react-router');

// Start set of mutators.
var mutators = {};

/**
 * If we have an internal link,
 * and we have react-router in our project,
 * allow react-router to take it over.
 */
mutators.reactRouterLink = function(elem) {
  if (this.isDomNode(elem)) {
    if (
      elem.nodeName === 'a' &&
      !!elem.attributes.href &&
      elem.attributes.href.indexOf('/') === 0 &&
      !!ReactRouter &&
      !!ReactRouter.Link
    ) {
      elem.nodeName = ReactRouter.Link;
      elem.attributes.to = attributes.href;
      delete elem.attributes.href;
    }
  }
};

module.exports = mutators;

},{"optional":5}],5:[function(require,module,exports){
(function (process){
module.exports = function(module, options){
  try{
    if(module[0] in {".":1}){
      module = process.cwd() + module.substr(1);
    }
    return require(module);
  }catch(err){ 
    if (err.code !== "MODULE_NOT_FOUND" && options && options.rethrow) {
      throw err;
    }
  }
  return null;
};

}).call(this,require('_process'))

},{"_process":6}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kZWZhdWx0LW11dGF0b3JzLmpzIiwibGliL2h0bWwtMi1yZWFjdC5qcyIsImxpYi9tdXRhdG9ycy5qcyIsIm5vZGVfbW9kdWxlcy9vcHRpb25hbC9vcHRpb25hbC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9odG1sLTItcmVhY3QnKTtcbiIsIi8qKlxuICogQGZpbGVcbiAqIE11dGF0b3JzLlxuICovXG5cbnZhciBkZWZhdWx0TXV0YXRvcnMgPSB7fTtcblxudmFyIG1hcFN0eWxlID0gZnVuY3Rpb24oc3RyKSB7XG4gIGlmICghc3RyIHx8ICFzdHIubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIHJldHVybiBzdHIuc3BsaXQoL1xccyo7XFxzKi8pXG4gIC5maWx0ZXIoZnVuY3Rpb24oaSkge1xuICAgIHJldHVybiBpLmxlbmd0aDtcbiAgfSlcbiAgLm1hcChmdW5jdGlvbihpKSB7XG4gICAgcmV0dXJuIGkuc3BsaXQoLzovKTtcbiAgfSlcbiAgLnJlZHVjZShmdW5jdGlvbihhZ2csIGkpIHtcbiAgICB2YXIgayA9IGkuc2hpZnQoKTtcbiAgICBhZ2dba10gPSBpLm1hcChmdW5jdGlvbihpaSkge1xuICAgICAgcmV0dXJuIGlpLnJlcGxhY2UoL15cXHMqLywgJycpLnJlcGxhY2UoL1xccyokLywgJycpO1xuICAgIH0pLmpvaW4oJzonKTtcbiAgICByZXR1cm4gYWdnO1xuICB9LCB7fSk7XG59O1xuXG52YXIgY2FwaXRhbGl6ZSA9IGZ1bmN0aW9uKHN0cikge1xuICByZXR1cm4gc3RyLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xufTtcblxuLyoqXG4gKiBIYW5kbGUgYXBwcm9wcmlhdGUgc3R5bGUgYXR0cmlidXRlIGNhbWVsY2FzaW5nIGZvciBSZWFjdC5cbiAqXG4gKiBAc2VlIGh0dHBzOi8vZmFjZWJvb2suZ2l0aHViLmlvL3JlYWN0L3RpcHMvaW5saW5lLXN0eWxlcy5odG1sXG4gKi9cbnZhciBhZGp1c3RTdHlsZXNGb3JSZWFjdCA9IGZ1bmN0aW9uKHN0eWxlcykge1xuICBmb3IgKHZhciBpIGluIHN0eWxlcykge1xuICAgIHZhciBrZXkgPSBpO1xuICAgIGlmIChpLmluZGV4T2YoJy0nKSA9PT0gMCkge1xuICAgICAgLy8gVmVuZG9yIHByZWZpeGVzIGdldCBjYXBpdGFsaXNlZC5cbiAgICAgIGtleSA9IGkucmVwbGFjZSgvXi0vLCAnJykuc3BsaXQoJy0nKS5tYXAoY2FwaXRhbGl6ZSkuam9pbignJylcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBrZXkgPSBpLnNwbGl0KCctJykubWFwKGZ1bmN0aW9uKHN0ciwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gY2FwaXRhbGl6ZShzdHIpO1xuICAgICAgICB9XG4gICAgICB9KS5qb2luKCcnKTtcbiAgICB9XG4gICAgc3R5bGVzW2tleV0gPSBzdHlsZXNbaV07XG4gICAgZGVsZXRlIHN0eWxlc1tpXTtcbiAgfVxufTtcblxuLyoqXG4gKiBNYXBzIHRoZSBzdHlsZSBhdHRyaWJ1dGUgdG8gYSByZWFjdCBjb21wYXRpYmxlIGF0dHJpYnV0ZS5cbiAqL1xuZGVmYXVsdE11dGF0b3JzLm1hcENsYXNzID0gZnVuY3Rpb24oZWxlbSkge1xuICBpZiAodGhpcy5pc0RvbU5vZGUoZWxlbSkpIHtcbiAgICBpZiAoISFlbGVtLmF0dHJpYnV0ZXMgJiYgISFlbGVtLmF0dHJpYnV0ZXMuY2xhc3MgJiYgISFlbGVtLmF0dHJpYnV0ZXMuY2xhc3MubGVuZ3RoKSB7XG4gICAgICBlbGVtLmF0dHJpYnV0ZXMuY2xhc3NOYW1lID0gZWxlbS5hdHRyaWJ1dGVzLmNsYXNzO1xuICAgICAgZGVsZXRlIGVsZW0uYXR0cmlidXRlcy5jbGFzcztcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogTWFwcyB0aGUgc3R5bGUgYXR0cmlidXRlIHRvIGEgcmVhY3QgY29tcGF0aWJsZSBhdHRyaWJ1dGUuXG4gKi9cbmRlZmF1bHRNdXRhdG9ycy5tYXBTdHlsZSA9IGZ1bmN0aW9uKGVsZW0pIHtcbiAgaWYgKHRoaXMuaXNEb21Ob2RlKGVsZW0pKSB7XG4gICAgaWYgKCEhZWxlbS5hdHRyaWJ1dGVzICYmICEhZWxlbS5hdHRyaWJ1dGVzLnN0eWxlICYmICEhZWxlbS5hdHRyaWJ1dGVzLnN0eWxlLmxlbmd0aCkge1xuICAgICAgZWxlbS5hdHRyaWJ1dGVzLnN0eWxlID0gbWFwU3R5bGUoZWxlbS5hdHRyaWJ1dGVzLnN0eWxlKTtcbiAgICAgIGFkanVzdFN0eWxlc0ZvclJlYWN0KGVsZW0uYXR0cmlidXRlcy5zdHlsZSk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlZmF1bHRNdXRhdG9ycztcbiIsIi8qKlxuICogQGZpbGVcbiAqIEhUTUwgdG8gUmVhY3QgY29udmVydGVyLlxuICovXG5cbnZhciBqUXVlcnkgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snalF1ZXJ5J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydqUXVlcnknXSA6IG51bGwpLFxuICAgIFJlYWN0ID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdCddIDogbnVsbCksXG4gICAgbXV0YXRvcnMgPSByZXF1aXJlKCcuL211dGF0b3JzJyksXG4gICAgZGVmYXVsdE11dGF0b3JzID0gcmVxdWlyZSgnLi9kZWZhdWx0LW11dGF0b3JzJyk7XG5cbi8qKlxuICogUGFyc2VzIEhUTUwgYW5kIHJldHVybnMgUmVhY3QgZWxlbWVudHMuXG4gKi9cbnZhciBIdG1sMlJlYWN0ID0gZnVuY3Rpb24oaW5wdXRIVE1MLCBvcHRpb25zKSB7XG4gIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICB1c2VEZWZhdWx0TXV0YXRvcnM6IHRydWVcbiAgfTtcblxuICB2YXIgc3RhdGUgPSB7XG4gICAgcGFyc2VkOiBudWxsLFxuICAgIG9wdGlvbnM6IGpRdWVyeS5leHRlbmQoe30sIGRlZmF1bHRPcHRpb25zLCBvcHRpb25zKVxuICB9O1xuXG4gIHZhciBwcml2ID0ge307XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgTmFtZWROb2RlTWFwIHRvIGEgcGxhaW4gb2xkIEpTIG9iamVjdC5cbiAgICovXG4gIHByaXYubmFtZWROb2RlTWFwVG9PYmplY3QgPSBmdW5jdGlvbihubm0pIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBubm0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyID0gbm5tLml0ZW0oaSksXG4gICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgIGlmIChhdHRyTmFtZSA9PSAnY2xhc3MnKSB7XG4gICAgICAgIGF0dHJOYW1lID0gJ2NsYXNzTmFtZSc7XG4gICAgICB9XG4gICAgICBvYmpbYXR0ck5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBzaW5nbGUgRE9NTm9kZSBpbnRvIGRhdGEgdG8gYmUgaGFuZGxlZCBieSB0aGUgUmVhY3QgY29udmVydGVyLlxuICAgKi9cbiAgcHJpdi5wYXJzZU5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT0gMSkge1xuICAgICAgdmFyIG91dCA9IHt9O1xuICAgICAgb3V0Lm5vZGVOYW1lID0gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgb3V0LmF0dHJpYnV0ZXMgPSBwcml2Lm5hbWVkTm9kZU1hcFRvT2JqZWN0KG5vZGUuYXR0cmlidXRlcyk7XG4gICAgICBvdXQuY2hpbGRyZW4gPSBbXS5zbGljZS5jYWxsKG5vZGUuY2hpbGROb2RlcykubWFwKGZ1bmN0aW9uKGNuKSB7XG4gICAgICAgIHJldHVybiBwcml2LnBhcnNlTm9kZShjbik7XG4gICAgICB9KS5maWx0ZXIoZnVuY3Rpb24oY24pIHtcbiAgICAgICAgcmV0dXJuIGNuICE9PSBudWxsO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09IDMpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHRDb250ZW50O1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09IDkpIHtcbiAgICAgIHJldHVybiBwcml2LnBhcnNlTm9kZShub2RlLmNoaWxkTm9kZXNbMF0pO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcblxuICAvKipcbiAgICogSW5pdGlhbGlzZXMgdGhlIGNsYXNzIGFuZCBwYXJzZXMgdGhlIHN1Ym1pdHRlZCBIVE1MLlxuICAgKi9cbiAgcHJpdi5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciB3cmFwcGVkID0gJzxkaXYgY2xhc3M9XCJodG1sMnJlYWN0LXBhcnNlZFwiPicgKyBpbnB1dEhUTUwgKyAnPC9kaXY+JztcbiAgICAgIHZhciBodG1sID0galF1ZXJ5LnBhcnNlSFRNTCh3cmFwcGVkKTtcbiAgICAgIHN0YXRlLnBhcnNlZCA9IHByaXYucGFyc2VOb2RlKGh0bWxbMF0pO1xuICAgICAgaWYgKCEhc3RhdGUub3B0aW9ucy51c2VEZWZhdWx0TXV0YXRvcnMpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBkZWZhdWx0TXV0YXRvcnMpIHtcbiAgICAgICAgICBwdWIubXV0YXRlRWFjaChkZWZhdWx0TXV0YXRvcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNhdGNoKGUpIHtcbiAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBzaW5nbGUgSFRNTCB0YWcgaW50byBhIFJlYWN0IGVsZW1lbnQuXG4gICAqXG4gICAqIFJlY3Vyc2l2ZWx5IGNhbGxzIGl0c2VsZiB0byBjb252ZXJ0IHRoZSBlbGVtZW50J3MgY2hpbGRyZW4uXG4gICAqL1xuICBwcml2LmVsZW1Ub1JlYWN0ID0gZnVuY3Rpb24oZWxlbSwgY2hhaW4pIHtcbiAgICBpZiAoIWNoYWluKSB7XG4gICAgICBjaGFpbiA9IFswXTtcbiAgICB9XG4gICAgaWYgKHB1Yi5pc0RvbU5vZGUoZWxlbSkpIHtcbiAgICAgIHZhciBub2RlTmFtZSA9IGVsZW0ubm9kZU5hbWUsXG4gICAgICBhdHRyaWJ1dGVzID0gZWxlbS5hdHRyaWJ1dGVzO1xuICAgICAgYXR0cmlidXRlcy5rZXkgPSBjaGFpbi5qb2luKCcuJyk7XG5cbiAgICAgIGlmIChlbGVtLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICBub2RlTmFtZSxcbiAgICAgICAgICBhdHRyaWJ1dGVzLFxuICAgICAgICAgIGVsZW0uY2hpbGRyZW4ubWFwKGZ1bmN0aW9uKGMsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiBwcml2LmVsZW1Ub1JlYWN0KGMsIGNoYWluLmNvbmNhdChbaV0pKTtcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgIG5vZGVOYW1lLFxuICAgICAgICAgIGF0dHJpYnV0ZXNcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gZWxlbTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlY3Vyc2l2ZWx5IG11dGF0ZSBhIHNpbmdsZSBlbGVtZW50IHVzaW5nIGEgcGFydGljdWxhciBmdW5jdGlvbi5cbiAgICovXG4gIHByaXYubXV0YXRlRWFjaCA9IGZ1bmN0aW9uKGVsZW0sIGVhY2hOb2RlKSB7XG4gICAgZWFjaE5vZGUuY2FsbChwdWIsIGVsZW0pO1xuICAgIGlmICghIWVsZW0uY2hpbGRyZW4gJiYgISFlbGVtLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgZWxlbS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgIHJldHVybiBwcml2Lm11dGF0ZUVhY2goY2hpbGQsIGVhY2hOb2RlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICB2YXIgcHViID0ge307XG5cbiAgLyoqXG4gICAqIFNheXMgd2hldGhlciB0aGUgSFRNTCBzdWJtaXR0ZWQgd2FzIHBhcnNlZCBzdWNjZXNzZnVsbHkgb3Igbm90LlxuICAgKi9cbiAgcHViLnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc3RhdGUucGFyc2VkICE9PSBudWxsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBNdXRhdGUgdGhlIHBhcnNlZCB0cmVlIGJlZm9yZSB0aGUgZWxlbWVudHMgYXJlIGNvbnZlcnRlZCB0byBSZWFjdC5cbiAgICpcbiAgICogQHBhcmFtIGZ1bmN0aW9uIGVhY2hOb2RlXG4gICAqICAgTXV0YXRvciBmdW5jdGlvbiB0byBydW4gb24gZWFjaCBub2RlLlxuICAgKi9cbiAgcHViLm11dGF0ZUVhY2ggPSBmdW5jdGlvbihlYWNoTm9kZSkge1xuICAgIGlmIChzdGF0ZS5wYXJzZWQgIT09IG51bGwpIHtcbiAgICAgIGlmICghZWFjaE5vZGUpIHtcbiAgICAgICAgZWFjaE5vZGUgPSBmdW5jdGlvbihlbGVtKSB7fTtcbiAgICAgIH1cbiAgICAgIHByaXYubXV0YXRlRWFjaChzdGF0ZS5wYXJzZWQsIGVhY2hOb2RlKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgaWYgdGhlIGN1cnJlbnQgZWxlbWVudCBpcyBhIHBhcnNlZCBET01Ob2RlLlxuICAgKi9cbiAgcHViLmlzRG9tTm9kZSA9IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICByZXR1cm4gKFxuICAgICAgalF1ZXJ5LmlzUGxhaW5PYmplY3QoZWxlbSkgJiZcbiAgICAgICEhZWxlbS5ub2RlTmFtZS5sZW5ndGggJiZcbiAgICAgIGpRdWVyeS5pc1BsYWluT2JqZWN0KGVsZW0uYXR0cmlidXRlcylcbiAgICApO1xuICB9O1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIGEgc2V0IG9mIG11dGF0b3JzIHRoYXQgY2FuIGJlIHJ1biB0aHJvdWdoIEh0bWwyUmVhY3QubXV0YXRlRWFjaC5cbiAgICovXG4gIHB1Yi5tdXRhdG9ycyA9IG11dGF0b3JzO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIFJlYWN0IGVsZW1lbnRzIHBhcnNlZCBmcm9tIHRoZSBIVE1MLlxuICAgKi9cbiAgcHViLnRvUmVhY3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcHJpdi5lbGVtVG9SZWFjdChzdGF0ZS5wYXJzZWQpO1xuICB9O1xuXG4gIHByaXYuaW5pdCgpO1xuXG4gIHJldHVybiBwdWI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEh0bWwyUmVhY3Q7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBNdXRhdG9ycy5cbiAqL1xuXG52YXIgb3B0aW9uYWwgPSByZXF1aXJlKCdvcHRpb25hbCcpO1xudmFyIFJlYWN0Um91dGVyID0gb3B0aW9uYWwoJ3JlYWN0LXJvdXRlcicpO1xuXG4vLyBTdGFydCBzZXQgb2YgbXV0YXRvcnMuXG52YXIgbXV0YXRvcnMgPSB7fTtcblxuLyoqXG4gKiBJZiB3ZSBoYXZlIGFuIGludGVybmFsIGxpbmssXG4gKiBhbmQgd2UgaGF2ZSByZWFjdC1yb3V0ZXIgaW4gb3VyIHByb2plY3QsXG4gKiBhbGxvdyByZWFjdC1yb3V0ZXIgdG8gdGFrZSBpdCBvdmVyLlxuICovXG5tdXRhdG9ycy5yZWFjdFJvdXRlckxpbmsgPSBmdW5jdGlvbihlbGVtKSB7XG4gIGlmICh0aGlzLmlzRG9tTm9kZShlbGVtKSkge1xuICAgIGlmIChcbiAgICAgIGVsZW0ubm9kZU5hbWUgPT09ICdhJyAmJlxuICAgICAgISFlbGVtLmF0dHJpYnV0ZXMuaHJlZiAmJlxuICAgICAgZWxlbS5hdHRyaWJ1dGVzLmhyZWYuaW5kZXhPZignLycpID09PSAwICYmXG4gICAgICAhIVJlYWN0Um91dGVyICYmXG4gICAgICAhIVJlYWN0Um91dGVyLkxpbmtcbiAgICApIHtcbiAgICAgIGVsZW0ubm9kZU5hbWUgPSBSZWFjdFJvdXRlci5MaW5rO1xuICAgICAgZWxlbS5hdHRyaWJ1dGVzLnRvID0gYXR0cmlidXRlcy5ocmVmO1xuICAgICAgZGVsZXRlIGVsZW0uYXR0cmlidXRlcy5ocmVmO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBtdXRhdG9ycztcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obW9kdWxlLCBvcHRpb25zKXtcbiAgdHJ5e1xuICAgIGlmKG1vZHVsZVswXSBpbiB7XCIuXCI6MX0pe1xuICAgICAgbW9kdWxlID0gcHJvY2Vzcy5jd2QoKSArIG1vZHVsZS5zdWJzdHIoMSk7XG4gICAgfVxuICAgIHJldHVybiByZXF1aXJlKG1vZHVsZSk7XG4gIH1jYXRjaChlcnIpeyBcbiAgICBpZiAoZXJyLmNvZGUgIT09IFwiTU9EVUxFX05PVF9GT1VORFwiICYmIG9wdGlvbnMgJiYgb3B0aW9ucy5yZXRocm93KSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
