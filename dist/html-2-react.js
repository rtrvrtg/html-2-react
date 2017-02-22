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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kZWZhdWx0LW11dGF0b3JzLmpzIiwibGliL2h0bWwtMi1yZWFjdC5qcyIsImxpYi9tdXRhdG9ycy5qcyIsIm5vZGVfbW9kdWxlcy9vcHRpb25hbC9vcHRpb25hbC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2h0bWwtMi1yZWFjdCcpO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogTXV0YXRvcnMuXG4gKi9cblxudmFyIGRlZmF1bHRNdXRhdG9ycyA9IHt9O1xuXG52YXIgbWFwU3R5bGUgPSBmdW5jdGlvbihzdHIpIHtcbiAgaWYgKCFzdHIgfHwgIXN0ci5sZW5ndGgpIHtcbiAgICByZXR1cm4ge307XG4gIH1cbiAgcmV0dXJuIHN0ci5zcGxpdCgvXFxzKjtcXHMqLylcbiAgLmZpbHRlcihmdW5jdGlvbihpKSB7XG4gICAgcmV0dXJuIGkubGVuZ3RoO1xuICB9KVxuICAubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICByZXR1cm4gaS5zcGxpdCgvOi8pO1xuICB9KVxuICAucmVkdWNlKGZ1bmN0aW9uKGFnZywgaSkge1xuICAgIHZhciBrID0gaS5zaGlmdCgpO1xuICAgIGFnZ1trXSA9IGkubWFwKGZ1bmN0aW9uKGlpKSB7XG4gICAgICByZXR1cm4gaWkucmVwbGFjZSgvXlxccyovLCAnJykucmVwbGFjZSgvXFxzKiQvLCAnJyk7XG4gICAgfSkuam9pbignOicpO1xuICAgIHJldHVybiBhZ2c7XG4gIH0sIHt9KTtcbn07XG5cbnZhciBjYXBpdGFsaXplID0gZnVuY3Rpb24oc3RyKSB7XG4gIHJldHVybiBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSBhcHByb3ByaWF0ZSBzdHlsZSBhdHRyaWJ1dGUgY2FtZWxjYXNpbmcgZm9yIFJlYWN0LlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9mYWNlYm9vay5naXRodWIuaW8vcmVhY3QvdGlwcy9pbmxpbmUtc3R5bGVzLmh0bWxcbiAqL1xudmFyIGFkanVzdFN0eWxlc0ZvclJlYWN0ID0gZnVuY3Rpb24oc3R5bGVzKSB7XG4gIGZvciAodmFyIGkgaW4gc3R5bGVzKSB7XG4gICAgdmFyIGtleSA9IGk7XG4gICAgaWYgKGkuaW5kZXhPZignLScpID09PSAwKSB7XG4gICAgICAvLyBWZW5kb3IgcHJlZml4ZXMgZ2V0IGNhcGl0YWxpc2VkLlxuICAgICAga2V5ID0gaS5yZXBsYWNlKC9eLS8sICcnKS5zcGxpdCgnLScpLm1hcChjYXBpdGFsaXplKS5qb2luKCcnKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGtleSA9IGkuc3BsaXQoJy0nKS5tYXAoZnVuY3Rpb24oc3RyLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHJldHVybiBjYXBpdGFsaXplKHN0cik7XG4gICAgICAgIH1cbiAgICAgIH0pLmpvaW4oJycpO1xuICAgIH1cbiAgICBzdHlsZXNba2V5XSA9IHN0eWxlc1tpXTtcbiAgICBkZWxldGUgc3R5bGVzW2ldO1xuICB9XG59O1xuXG4vKipcbiAqIE1hcHMgdGhlIHN0eWxlIGF0dHJpYnV0ZSB0byBhIHJlYWN0IGNvbXBhdGlibGUgYXR0cmlidXRlLlxuICovXG5kZWZhdWx0TXV0YXRvcnMubWFwQ2xhc3MgPSBmdW5jdGlvbihlbGVtKSB7XG4gIGlmICh0aGlzLmlzRG9tTm9kZShlbGVtKSkge1xuICAgIGlmICghIWVsZW0uYXR0cmlidXRlcyAmJiAhIWVsZW0uYXR0cmlidXRlcy5jbGFzcyAmJiAhIWVsZW0uYXR0cmlidXRlcy5jbGFzcy5sZW5ndGgpIHtcbiAgICAgIGVsZW0uYXR0cmlidXRlcy5jbGFzc05hbWUgPSBlbGVtLmF0dHJpYnV0ZXMuY2xhc3M7XG4gICAgICBkZWxldGUgZWxlbS5hdHRyaWJ1dGVzLmNsYXNzO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBNYXBzIHRoZSBzdHlsZSBhdHRyaWJ1dGUgdG8gYSByZWFjdCBjb21wYXRpYmxlIGF0dHJpYnV0ZS5cbiAqL1xuZGVmYXVsdE11dGF0b3JzLm1hcFN0eWxlID0gZnVuY3Rpb24oZWxlbSkge1xuICBpZiAodGhpcy5pc0RvbU5vZGUoZWxlbSkpIHtcbiAgICBpZiAoISFlbGVtLmF0dHJpYnV0ZXMgJiYgISFlbGVtLmF0dHJpYnV0ZXMuc3R5bGUgJiYgISFlbGVtLmF0dHJpYnV0ZXMuc3R5bGUubGVuZ3RoKSB7XG4gICAgICBlbGVtLmF0dHJpYnV0ZXMuc3R5bGUgPSBtYXBTdHlsZShlbGVtLmF0dHJpYnV0ZXMuc3R5bGUpO1xuICAgICAgYWRqdXN0U3R5bGVzRm9yUmVhY3QoZWxlbS5hdHRyaWJ1dGVzLnN0eWxlKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmYXVsdE11dGF0b3JzO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogSFRNTCB0byBSZWFjdCBjb252ZXJ0ZXIuXG4gKi9cblxudmFyIGpRdWVyeSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydqUXVlcnknXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ2pRdWVyeSddIDogbnVsbCksXG4gICAgUmVhY3QgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snUmVhY3QnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1JlYWN0J10gOiBudWxsKSxcbiAgICBtdXRhdG9ycyA9IHJlcXVpcmUoJy4vbXV0YXRvcnMnKSxcbiAgICBkZWZhdWx0TXV0YXRvcnMgPSByZXF1aXJlKCcuL2RlZmF1bHQtbXV0YXRvcnMnKTtcblxuLyoqXG4gKiBQYXJzZXMgSFRNTCBhbmQgcmV0dXJucyBSZWFjdCBlbGVtZW50cy5cbiAqL1xudmFyIEh0bWwyUmVhY3QgPSBmdW5jdGlvbihpbnB1dEhUTUwsIG9wdGlvbnMpIHtcbiAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgIHVzZURlZmF1bHRNdXRhdG9yczogdHJ1ZVxuICB9O1xuXG4gIHZhciBzdGF0ZSA9IHtcbiAgICBwYXJzZWQ6IG51bGwsXG4gICAgb3B0aW9uczogalF1ZXJ5LmV4dGVuZCh7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpXG4gIH07XG5cbiAgdmFyIHByaXYgPSB7fTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBOYW1lZE5vZGVNYXAgdG8gYSBwbGFpbiBvbGQgSlMgb2JqZWN0LlxuICAgKi9cbiAgcHJpdi5uYW1lZE5vZGVNYXBUb09iamVjdCA9IGZ1bmN0aW9uKG5ubSkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5ubS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBubm0uaXRlbShpKSxcbiAgICAgIGF0dHJOYW1lID0gYXR0ci5uYW1lO1xuICAgICAgaWYgKGF0dHJOYW1lID09ICdjbGFzcycpIHtcbiAgICAgICAgYXR0ck5hbWUgPSAnY2xhc3NOYW1lJztcbiAgICAgIH1cbiAgICAgIG9ialthdHRyTmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIHNpbmdsZSBET01Ob2RlIGludG8gZGF0YSB0byBiZSBoYW5kbGVkIGJ5IHRoZSBSZWFjdCBjb252ZXJ0ZXIuXG4gICAqL1xuICBwcml2LnBhcnNlTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PSAxKSB7XG4gICAgICB2YXIgb3V0ID0ge307XG4gICAgICBvdXQubm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICBvdXQuYXR0cmlidXRlcyA9IHByaXYubmFtZWROb2RlTWFwVG9PYmplY3Qobm9kZS5hdHRyaWJ1dGVzKTtcbiAgICAgIG91dC5jaGlsZHJlbiA9IFtdLnNsaWNlLmNhbGwobm9kZS5jaGlsZE5vZGVzKS5tYXAoZnVuY3Rpb24oY24pIHtcbiAgICAgICAgcmV0dXJuIHByaXYucGFyc2VOb2RlKGNuKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PSAzKSB7XG4gICAgICByZXR1cm4gbm9kZS50ZXh0Q29udGVudDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PSA5KSB7XG4gICAgICByZXR1cm4gcHJpdi5wYXJzZU5vZGUobm9kZS5jaGlsZE5vZGVzWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpc2VzIHRoZSBjbGFzcyBhbmQgcGFyc2VzIHRoZSBzdWJtaXR0ZWQgSFRNTC5cbiAgICovXG4gIHByaXYuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgd3JhcHBlZCA9ICc8ZGl2IGNsYXNzPVwiaHRtbDJyZWFjdC1wYXJzZWRcIj4nICsgaW5wdXRIVE1MICsgJzwvZGl2Pic7XG4gICAgICB2YXIgaHRtbCA9IGpRdWVyeS5wYXJzZUhUTUwod3JhcHBlZCk7XG4gICAgICBzdGF0ZS5wYXJzZWQgPSBwcml2LnBhcnNlTm9kZShodG1sWzBdKTtcbiAgICAgIGlmICghIXN0YXRlLm9wdGlvbnMudXNlRGVmYXVsdE11dGF0b3JzKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gZGVmYXVsdE11dGF0b3JzKSB7XG4gICAgICAgICAgcHViLm11dGF0ZUVhY2goZGVmYXVsdE11dGF0b3JzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaChlKSB7XG4gICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgc2luZ2xlIEhUTUwgdGFnIGludG8gYSBSZWFjdCBlbGVtZW50LlxuICAgKlxuICAgKiBSZWN1cnNpdmVseSBjYWxscyBpdHNlbGYgdG8gY29udmVydCB0aGUgZWxlbWVudCdzIGNoaWxkcmVuLlxuICAgKi9cbiAgcHJpdi5lbGVtVG9SZWFjdCA9IGZ1bmN0aW9uKGVsZW0sIGNoYWluKSB7XG4gICAgaWYgKCFjaGFpbikge1xuICAgICAgY2hhaW4gPSBbMF07XG4gICAgfVxuICAgIGlmIChwdWIuaXNEb21Ob2RlKGVsZW0pKSB7XG4gICAgICB2YXIgbm9kZU5hbWUgPSBlbGVtLm5vZGVOYW1lLFxuICAgICAgYXR0cmlidXRlcyA9IGVsZW0uYXR0cmlidXRlcztcbiAgICAgIGF0dHJpYnV0ZXMua2V5ID0gY2hhaW4uam9pbignLicpO1xuXG4gICAgICBpZiAoZWxlbS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgbm9kZU5hbWUsXG4gICAgICAgICAgYXR0cmlidXRlcyxcbiAgICAgICAgICBlbGVtLmNoaWxkcmVuLm1hcChmdW5jdGlvbihjLCBpKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJpdi5lbGVtVG9SZWFjdChjLCBjaGFpbi5jb25jYXQoW2ldKSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICBub2RlTmFtZSxcbiAgICAgICAgICBhdHRyaWJ1dGVzXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmVseSBtdXRhdGUgYSBzaW5nbGUgZWxlbWVudCB1c2luZyBhIHBhcnRpY3VsYXIgZnVuY3Rpb24uXG4gICAqL1xuICBwcml2Lm11dGF0ZUVhY2ggPSBmdW5jdGlvbihlbGVtLCBlYWNoTm9kZSkge1xuICAgIGVhY2hOb2RlLmNhbGwocHViLCBlbGVtKTtcbiAgICBpZiAoISFlbGVtLmNoaWxkcmVuICYmICEhZWxlbS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIGVsZW0uY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICByZXR1cm4gcHJpdi5tdXRhdGVFYWNoKGNoaWxkLCBlYWNoTm9kZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIHB1YiA9IHt9O1xuXG4gIC8qKlxuICAgKiBTYXlzIHdoZXRoZXIgdGhlIEhUTUwgc3VibWl0dGVkIHdhcyBwYXJzZWQgc3VjY2Vzc2Z1bGx5IG9yIG5vdC5cbiAgICovXG4gIHB1Yi5zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHN0YXRlLnBhcnNlZCAhPT0gbnVsbDtcbiAgfTtcblxuICAvKipcbiAgICogTXV0YXRlIHRoZSBwYXJzZWQgdHJlZSBiZWZvcmUgdGhlIGVsZW1lbnRzIGFyZSBjb252ZXJ0ZWQgdG8gUmVhY3QuXG4gICAqXG4gICAqIEBwYXJhbSBmdW5jdGlvbiBlYWNoTm9kZVxuICAgKiAgIE11dGF0b3IgZnVuY3Rpb24gdG8gcnVuIG9uIGVhY2ggbm9kZS5cbiAgICovXG4gIHB1Yi5tdXRhdGVFYWNoID0gZnVuY3Rpb24oZWFjaE5vZGUpIHtcbiAgICBpZiAoc3RhdGUucGFyc2VkICE9PSBudWxsKSB7XG4gICAgICBpZiAoIWVhY2hOb2RlKSB7XG4gICAgICAgIGVhY2hOb2RlID0gZnVuY3Rpb24oZWxlbSkge307XG4gICAgICB9XG4gICAgICBwcml2Lm11dGF0ZUVhY2goc3RhdGUucGFyc2VkLCBlYWNoTm9kZSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIHRoZSBjdXJyZW50IGVsZW1lbnQgaXMgYSBwYXJzZWQgRE9NTm9kZS5cbiAgICovXG4gIHB1Yi5pc0RvbU5vZGUgPSBmdW5jdGlvbihlbGVtKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIGpRdWVyeS5pc1BsYWluT2JqZWN0KGVsZW0pICYmXG4gICAgICAhIWVsZW0ubm9kZU5hbWUubGVuZ3RoICYmXG4gICAgICBqUXVlcnkuaXNQbGFpbk9iamVjdChlbGVtLmF0dHJpYnV0ZXMpXG4gICAgKTtcbiAgfTtcblxuICAvKipcbiAgICogRGVmaW5lcyBhIHNldCBvZiBtdXRhdG9ycyB0aGF0IGNhbiBiZSBydW4gdGhyb3VnaCBIdG1sMlJlYWN0Lm11dGF0ZUVhY2guXG4gICAqL1xuICBwdWIubXV0YXRvcnMgPSBtdXRhdG9ycztcblxuICAvKipcbiAgICogUmV0dXJucyBSZWFjdCBlbGVtZW50cyBwYXJzZWQgZnJvbSB0aGUgSFRNTC5cbiAgICovXG4gIHB1Yi50b1JlYWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHByaXYuZWxlbVRvUmVhY3Qoc3RhdGUucGFyc2VkKTtcbiAgfTtcblxuICBwcml2LmluaXQoKTtcblxuICByZXR1cm4gcHViO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIdG1sMlJlYWN0O1xuIiwiLyoqXG4gKiBAZmlsZVxuICogTXV0YXRvcnMuXG4gKi9cblxudmFyIG9wdGlvbmFsID0gcmVxdWlyZSgnb3B0aW9uYWwnKTtcbnZhciBSZWFjdFJvdXRlciA9IG9wdGlvbmFsKCdyZWFjdC1yb3V0ZXInKTtcblxuLy8gU3RhcnQgc2V0IG9mIG11dGF0b3JzLlxudmFyIG11dGF0b3JzID0ge307XG5cbi8qKlxuICogSWYgd2UgaGF2ZSBhbiBpbnRlcm5hbCBsaW5rLFxuICogYW5kIHdlIGhhdmUgcmVhY3Qtcm91dGVyIGluIG91ciBwcm9qZWN0LFxuICogYWxsb3cgcmVhY3Qtcm91dGVyIHRvIHRha2UgaXQgb3Zlci5cbiAqL1xubXV0YXRvcnMucmVhY3RSb3V0ZXJMaW5rID0gZnVuY3Rpb24oZWxlbSkge1xuICBpZiAodGhpcy5pc0RvbU5vZGUoZWxlbSkpIHtcbiAgICBpZiAoXG4gICAgICBlbGVtLm5vZGVOYW1lID09PSAnYScgJiZcbiAgICAgICEhZWxlbS5hdHRyaWJ1dGVzLmhyZWYgJiZcbiAgICAgIGVsZW0uYXR0cmlidXRlcy5ocmVmLmluZGV4T2YoJy8nKSA9PT0gMCAmJlxuICAgICAgISFSZWFjdFJvdXRlciAmJlxuICAgICAgISFSZWFjdFJvdXRlci5MaW5rXG4gICAgKSB7XG4gICAgICBlbGVtLm5vZGVOYW1lID0gUmVhY3RSb3V0ZXIuTGluaztcbiAgICAgIGVsZW0uYXR0cmlidXRlcy50byA9IGF0dHJpYnV0ZXMuaHJlZjtcbiAgICAgIGRlbGV0ZSBlbGVtLmF0dHJpYnV0ZXMuaHJlZjtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbXV0YXRvcnM7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG1vZHVsZSwgb3B0aW9ucyl7XG4gIHRyeXtcbiAgICBpZihtb2R1bGVbMF0gaW4ge1wiLlwiOjF9KXtcbiAgICAgIG1vZHVsZSA9IHByb2Nlc3MuY3dkKCkgKyBtb2R1bGUuc3Vic3RyKDEpO1xuICAgIH1cbiAgICByZXR1cm4gcmVxdWlyZShtb2R1bGUpO1xuICB9Y2F0Y2goZXJyKXsgXG4gICAgaWYgKGVyci5jb2RlICE9PSBcIk1PRFVMRV9OT1RfRk9VTkRcIiAmJiBvcHRpb25zICYmIG9wdGlvbnMucmV0aHJvdykge1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIl19
