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
    agg[k] = i.join(':');
    return agg;
  }, {});
};

var capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
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
      elem.attributes.style = adjustStylesForReact(mapStyle(elem.attributes.style));
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
    ReactRouter = (typeof window !== "undefined" ? window['ReactRouter'] : typeof global !== "undefined" ? global['ReactRouter'] : null),
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
    options: $.extend({}, defaultOptions, options)
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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kZWZhdWx0LW11dGF0b3JzLmpzIiwibGliL2h0bWwtMi1yZWFjdC5qcyIsImxpYi9tdXRhdG9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvaHRtbC0yLXJlYWN0Jyk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBNdXRhdG9ycy5cbiAqL1xuXG52YXIgZGVmYXVsdE11dGF0b3JzID0ge307XG5cbnZhciBtYXBTdHlsZSA9IGZ1bmN0aW9uKHN0cikge1xuICBpZiAoIXN0ciB8fCAhc3RyLmxlbmd0aCkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICByZXR1cm4gc3RyLnNwbGl0KC9cXHMqO1xccyovKVxuICAuZmlsdGVyKGZ1bmN0aW9uKGkpIHtcbiAgICByZXR1cm4gaS5sZW5ndGg7XG4gIH0pXG4gIC5tYXAoZnVuY3Rpb24oaSkge1xuICAgIHJldHVybiBpLnNwbGl0KC86Lyk7XG4gIH0pXG4gIC5yZWR1Y2UoZnVuY3Rpb24oYWdnLCBpKSB7XG4gICAgdmFyIGsgPSBpLnNoaWZ0KCk7XG4gICAgYWdnW2tdID0gaS5qb2luKCc6Jyk7XG4gICAgcmV0dXJuIGFnZztcbiAgfSwge30pO1xufTtcblxudmFyIGNhcGl0YWxpemUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0aGlzLnNsaWNlKDEpO1xufTtcblxuLyoqXG4gKiBIYW5kbGUgYXBwcm9wcmlhdGUgc3R5bGUgYXR0cmlidXRlIGNhbWVsY2FzaW5nIGZvciBSZWFjdC5cbiAqXG4gKiBAc2VlIGh0dHBzOi8vZmFjZWJvb2suZ2l0aHViLmlvL3JlYWN0L3RpcHMvaW5saW5lLXN0eWxlcy5odG1sXG4gKi9cbnZhciBhZGp1c3RTdHlsZXNGb3JSZWFjdCA9IGZ1bmN0aW9uKHN0eWxlcykge1xuICBmb3IgKHZhciBpIGluIHN0eWxlcykge1xuICAgIHZhciBrZXkgPSBpO1xuICAgIGlmIChpLmluZGV4T2YoJy0nKSA9PT0gMCkge1xuICAgICAgLy8gVmVuZG9yIHByZWZpeGVzIGdldCBjYXBpdGFsaXNlZC5cbiAgICAgIGtleSA9IGkucmVwbGFjZSgvXi0vLCAnJykuc3BsaXQoJy0nKS5tYXAoY2FwaXRhbGl6ZSkuam9pbignJylcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBrZXkgPSBpLnNwbGl0KCctJykubWFwKGZ1bmN0aW9uKHN0ciwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gY2FwaXRhbGl6ZShzdHIpO1xuICAgICAgICB9XG4gICAgICB9KS5qb2luKCcnKTtcbiAgICB9XG4gICAgc3R5bGVzW2tleV0gPSBzdHlsZXNbaV07XG4gICAgZGVsZXRlIHN0eWxlc1tpXTtcbiAgfVxufTtcblxuLyoqXG4gKiBNYXBzIHRoZSBzdHlsZSBhdHRyaWJ1dGUgdG8gYSByZWFjdCBjb21wYXRpYmxlIGF0dHJpYnV0ZS5cbiAqL1xuZGVmYXVsdE11dGF0b3JzLm1hcENsYXNzID0gZnVuY3Rpb24oZWxlbSkge1xuICBpZiAodGhpcy5pc0RvbU5vZGUoZWxlbSkpIHtcbiAgICBpZiAoISFlbGVtLmF0dHJpYnV0ZXMgJiYgISFlbGVtLmF0dHJpYnV0ZXMuY2xhc3MgJiYgISFlbGVtLmF0dHJpYnV0ZXMuY2xhc3MubGVuZ3RoKSB7XG4gICAgICBlbGVtLmF0dHJpYnV0ZXMuY2xhc3NOYW1lID0gZWxlbS5hdHRyaWJ1dGVzLmNsYXNzO1xuICAgICAgZGVsZXRlIGVsZW0uYXR0cmlidXRlcy5jbGFzcztcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogTWFwcyB0aGUgc3R5bGUgYXR0cmlidXRlIHRvIGEgcmVhY3QgY29tcGF0aWJsZSBhdHRyaWJ1dGUuXG4gKi9cbmRlZmF1bHRNdXRhdG9ycy5tYXBTdHlsZSA9IGZ1bmN0aW9uKGVsZW0pIHtcbiAgaWYgKHRoaXMuaXNEb21Ob2RlKGVsZW0pKSB7XG4gICAgaWYgKCEhZWxlbS5hdHRyaWJ1dGVzICYmICEhZWxlbS5hdHRyaWJ1dGVzLnN0eWxlICYmICEhZWxlbS5hdHRyaWJ1dGVzLnN0eWxlLmxlbmd0aCkge1xuICAgICAgZWxlbS5hdHRyaWJ1dGVzLnN0eWxlID0gYWRqdXN0U3R5bGVzRm9yUmVhY3QobWFwU3R5bGUoZWxlbS5hdHRyaWJ1dGVzLnN0eWxlKSk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlZmF1bHRNdXRhdG9ycztcbiIsIi8qKlxuICogQGZpbGVcbiAqIEhUTUwgdG8gUmVhY3QgY29udmVydGVyLlxuICovXG5cbnZhciBqUXVlcnkgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snalF1ZXJ5J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydqUXVlcnknXSA6IG51bGwpLFxuICAgIFJlYWN0ID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdCddIDogbnVsbCksXG4gICAgUmVhY3RSb3V0ZXIgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snUmVhY3RSb3V0ZXInXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1JlYWN0Um91dGVyJ10gOiBudWxsKSxcbiAgICBtdXRhdG9ycyA9IHJlcXVpcmUoJy4vbXV0YXRvcnMnKSxcbiAgICBkZWZhdWx0TXV0YXRvcnMgPSByZXF1aXJlKCcuL2RlZmF1bHQtbXV0YXRvcnMnKTtcblxuLyoqXG4gKiBQYXJzZXMgSFRNTCBhbmQgcmV0dXJucyBSZWFjdCBlbGVtZW50cy5cbiAqL1xudmFyIEh0bWwyUmVhY3QgPSBmdW5jdGlvbihpbnB1dEhUTUwsIG9wdGlvbnMpIHtcbiAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgIHVzZURlZmF1bHRNdXRhdG9yczogdHJ1ZVxuICB9O1xuXG4gIHZhciBzdGF0ZSA9IHtcbiAgICBwYXJzZWQ6IG51bGwsXG4gICAgb3B0aW9uczogJC5leHRlbmQoe30sIGRlZmF1bHRPcHRpb25zLCBvcHRpb25zKVxuICB9O1xuXG4gIHZhciBwcml2ID0ge307XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgTmFtZWROb2RlTWFwIHRvIGEgcGxhaW4gb2xkIEpTIG9iamVjdC5cbiAgICovXG4gIHByaXYubmFtZWROb2RlTWFwVG9PYmplY3QgPSBmdW5jdGlvbihubm0pIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBubm0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyID0gbm5tLml0ZW0oaSksXG4gICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgIGlmIChhdHRyTmFtZSA9PSAnY2xhc3MnKSB7XG4gICAgICAgIGF0dHJOYW1lID0gJ2NsYXNzTmFtZSc7XG4gICAgICB9XG4gICAgICBvYmpbYXR0ck5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBzaW5nbGUgRE9NTm9kZSBpbnRvIGRhdGEgdG8gYmUgaGFuZGxlZCBieSB0aGUgUmVhY3QgY29udmVydGVyLlxuICAgKi9cbiAgcHJpdi5wYXJzZU5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT0gMSkge1xuICAgICAgdmFyIG91dCA9IHt9O1xuICAgICAgb3V0Lm5vZGVOYW1lID0gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgb3V0LmF0dHJpYnV0ZXMgPSBwcml2Lm5hbWVkTm9kZU1hcFRvT2JqZWN0KG5vZGUuYXR0cmlidXRlcyk7XG4gICAgICBvdXQuY2hpbGRyZW4gPSBbXS5zbGljZS5jYWxsKG5vZGUuY2hpbGROb2RlcykubWFwKGZ1bmN0aW9uKGNuKSB7XG4gICAgICAgIHJldHVybiBwcml2LnBhcnNlTm9kZShjbik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT0gMykge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dENvbnRlbnQ7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT0gOSkge1xuICAgICAgcmV0dXJuIHByaXYucGFyc2VOb2RlKG5vZGUuY2hpbGROb2Rlc1swXSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXNlcyB0aGUgY2xhc3MgYW5kIHBhcnNlcyB0aGUgc3VibWl0dGVkIEhUTUwuXG4gICAqL1xuICBwcml2LmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHdyYXBwZWQgPSAnPGRpdiBjbGFzcz1cImh0bWwycmVhY3QtcGFyc2VkXCI+JyArIGlucHV0SFRNTCArICc8L2Rpdj4nO1xuICAgICAgdmFyIGh0bWwgPSBqUXVlcnkucGFyc2VIVE1MKHdyYXBwZWQpO1xuICAgICAgc3RhdGUucGFyc2VkID0gcHJpdi5wYXJzZU5vZGUoaHRtbFswXSk7XG4gICAgICBpZiAoISFzdGF0ZS5vcHRpb25zLnVzZURlZmF1bHRNdXRhdG9ycykge1xuICAgICAgICBmb3IgKHZhciBpIGluIGRlZmF1bHRNdXRhdG9ycykge1xuICAgICAgICAgIHB1Yi5tdXRhdGVFYWNoKGRlZmF1bHRNdXRhdG9yc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2goZSkge1xuICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIHNpbmdsZSBIVE1MIHRhZyBpbnRvIGEgUmVhY3QgZWxlbWVudC5cbiAgICpcbiAgICogUmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIHRvIGNvbnZlcnQgdGhlIGVsZW1lbnQncyBjaGlsZHJlbi5cbiAgICovXG4gIHByaXYuZWxlbVRvUmVhY3QgPSBmdW5jdGlvbihlbGVtLCBjaGFpbikge1xuICAgIGlmICghY2hhaW4pIHtcbiAgICAgIGNoYWluID0gWzBdO1xuICAgIH1cbiAgICBpZiAocHViLmlzRG9tTm9kZShlbGVtKSkge1xuICAgICAgdmFyIG5vZGVOYW1lID0gZWxlbS5ub2RlTmFtZSxcbiAgICAgIGF0dHJpYnV0ZXMgPSBlbGVtLmF0dHJpYnV0ZXM7XG4gICAgICBhdHRyaWJ1dGVzLmtleSA9IGNoYWluLmpvaW4oJy4nKTtcblxuICAgICAgaWYgKGVsZW0uY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgIG5vZGVOYW1lLFxuICAgICAgICAgIGF0dHJpYnV0ZXMsXG4gICAgICAgICAgZWxlbS5jaGlsZHJlbi5tYXAoZnVuY3Rpb24oYywgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHByaXYuZWxlbVRvUmVhY3QoYywgY2hhaW4uY29uY2F0KFtpXSkpO1xuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgbm9kZU5hbWUsXG4gICAgICAgICAgYXR0cmlidXRlc1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBlbGVtO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmVjdXJzaXZlbHkgbXV0YXRlIGEgc2luZ2xlIGVsZW1lbnQgdXNpbmcgYSBwYXJ0aWN1bGFyIGZ1bmN0aW9uLlxuICAgKi9cbiAgcHJpdi5tdXRhdGVFYWNoID0gZnVuY3Rpb24oZWxlbSwgZWFjaE5vZGUpIHtcbiAgICBlYWNoTm9kZS5jYWxsKHB1YiwgZWxlbSk7XG4gICAgaWYgKCEhZWxlbS5jaGlsZHJlbiAmJiAhIWVsZW0uY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICBlbGVtLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgcmV0dXJuIHByaXYubXV0YXRlRWFjaChjaGlsZCwgZWFjaE5vZGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBwdWIgPSB7fTtcblxuICAvKipcbiAgICogU2F5cyB3aGV0aGVyIHRoZSBIVE1MIHN1Ym1pdHRlZCB3YXMgcGFyc2VkIHN1Y2Nlc3NmdWxseSBvciBub3QuXG4gICAqL1xuICBwdWIuc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzdGF0ZS5wYXJzZWQgIT09IG51bGw7XG4gIH07XG5cbiAgLyoqXG4gICAqIE11dGF0ZSB0aGUgcGFyc2VkIHRyZWUgYmVmb3JlIHRoZSBlbGVtZW50cyBhcmUgY29udmVydGVkIHRvIFJlYWN0LlxuICAgKlxuICAgKiBAcGFyYW0gZnVuY3Rpb24gZWFjaE5vZGVcbiAgICogICBNdXRhdG9yIGZ1bmN0aW9uIHRvIHJ1biBvbiBlYWNoIG5vZGUuXG4gICAqL1xuICBwdWIubXV0YXRlRWFjaCA9IGZ1bmN0aW9uKGVhY2hOb2RlKSB7XG4gICAgaWYgKHN0YXRlLnBhcnNlZCAhPT0gbnVsbCkge1xuICAgICAgaWYgKCFlYWNoTm9kZSkge1xuICAgICAgICBlYWNoTm9kZSA9IGZ1bmN0aW9uKGVsZW0pIHt9O1xuICAgICAgfVxuICAgICAgcHJpdi5tdXRhdGVFYWNoKHN0YXRlLnBhcnNlZCwgZWFjaE5vZGUpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyBpZiB0aGUgY3VycmVudCBlbGVtZW50IGlzIGEgcGFyc2VkIERPTU5vZGUuXG4gICAqL1xuICBwdWIuaXNEb21Ob2RlID0gZnVuY3Rpb24oZWxlbSkge1xuICAgIHJldHVybiAoXG4gICAgICBqUXVlcnkuaXNQbGFpbk9iamVjdChlbGVtKSAmJlxuICAgICAgISFlbGVtLm5vZGVOYW1lLmxlbmd0aCAmJlxuICAgICAgalF1ZXJ5LmlzUGxhaW5PYmplY3QoZWxlbS5hdHRyaWJ1dGVzKVxuICAgICk7XG4gIH07XG5cbiAgLyoqXG4gICAqIERlZmluZXMgYSBzZXQgb2YgbXV0YXRvcnMgdGhhdCBjYW4gYmUgcnVuIHRocm91Z2ggSHRtbDJSZWFjdC5tdXRhdGVFYWNoLlxuICAgKi9cbiAgcHViLm11dGF0b3JzID0gbXV0YXRvcnM7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgUmVhY3QgZWxlbWVudHMgcGFyc2VkIGZyb20gdGhlIEhUTUwuXG4gICAqL1xuICBwdWIudG9SZWFjdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBwcml2LmVsZW1Ub1JlYWN0KHN0YXRlLnBhcnNlZCk7XG4gIH07XG5cbiAgcHJpdi5pbml0KCk7XG5cbiAgcmV0dXJuIHB1Yjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSHRtbDJSZWFjdDtcbiIsIi8qKlxuICogQGZpbGVcbiAqIE11dGF0b3JzLlxuICovXG5cbnZhciBtdXRhdG9ycyA9IHt9O1xuXG4vKipcbiAqIElmIHdlIGhhdmUgYW4gaW50ZXJuYWwgbGluayxcbiAqIGFuZCB3ZSBoYXZlIHJlYWN0LXJvdXRlciBpbiBvdXIgcHJvamVjdCxcbiAqIGFsbG93IHJlYWN0LXJvdXRlciB0byB0YWtlIGl0IG92ZXIuXG4gKi9cbm11dGF0b3JzLnJlYWN0Um91dGVyTGluayA9IGZ1bmN0aW9uKGVsZW0pIHtcbiAgaWYgKHRoaXMuaXNEb21Ob2RlKGVsZW0pKSB7XG4gICAgaWYgKFxuICAgICAgZWxlbS5ub2RlTmFtZSA9PT0gJ2EnICYmXG4gICAgICAhIWVsZW0uYXR0cmlidXRlcy5ocmVmICYmXG4gICAgICBlbGVtLmF0dHJpYnV0ZXMuaHJlZi5pbmRleE9mKCcvJykgPT09IDAgJiZcbiAgICAgICEhUmVhY3RSb3V0ZXIgJiZcbiAgICAgICEhUmVhY3RSb3V0ZXIuTGlua1xuICAgICkge1xuICAgICAgZWxlbS5ub2RlTmFtZSA9IFJlYWN0Um91dGVyLkxpbms7XG4gICAgICBlbGVtLmF0dHJpYnV0ZXMudG8gPSBhdHRyaWJ1dGVzLmhyZWY7XG4gICAgICBkZWxldGUgZWxlbS5hdHRyaWJ1dGVzLmhyZWY7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG11dGF0b3JzO1xuIl19
