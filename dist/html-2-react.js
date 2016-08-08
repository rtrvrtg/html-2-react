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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kZWZhdWx0LW11dGF0b3JzLmpzIiwibGliL2h0bWwtMi1yZWFjdC5qcyIsImxpYi9tdXRhdG9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvaHRtbC0yLXJlYWN0Jyk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBNdXRhdG9ycy5cbiAqL1xuXG52YXIgZGVmYXVsdE11dGF0b3JzID0ge307XG5cbnZhciBtYXBTdHlsZSA9IGZ1bmN0aW9uKHN0cikge1xuICBpZiAoIXN0ciB8fCAhc3RyLmxlbmd0aCkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICByZXR1cm4gc3RyLnNwbGl0KC9cXHMqO1xccyovKVxuICAuZmlsdGVyKGZ1bmN0aW9uKGkpIHtcbiAgICByZXR1cm4gaS5sZW5ndGg7XG4gIH0pXG4gIC5tYXAoZnVuY3Rpb24oaSkge1xuICAgIHJldHVybiBpLnNwbGl0KC86Lyk7XG4gIH0pXG4gIC5yZWR1Y2UoZnVuY3Rpb24oYWdnLCBpKSB7XG4gICAgdmFyIGsgPSBpLnNoaWZ0KCk7XG4gICAgYWdnW2tdID0gaS5qb2luKCc6Jyk7XG4gICAgcmV0dXJuIGFnZztcbiAgfSwge30pO1xufTtcblxudmFyIGNhcGl0YWxpemUgPSBmdW5jdGlvbihzdHIpIHtcbiAgcmV0dXJuIHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn07XG5cbi8qKlxuICogSGFuZGxlIGFwcHJvcHJpYXRlIHN0eWxlIGF0dHJpYnV0ZSBjYW1lbGNhc2luZyBmb3IgUmVhY3QuXG4gKlxuICogQHNlZSBodHRwczovL2ZhY2Vib29rLmdpdGh1Yi5pby9yZWFjdC90aXBzL2lubGluZS1zdHlsZXMuaHRtbFxuICovXG52YXIgYWRqdXN0U3R5bGVzRm9yUmVhY3QgPSBmdW5jdGlvbihzdHlsZXMpIHtcbiAgZm9yICh2YXIgaSBpbiBzdHlsZXMpIHtcbiAgICB2YXIga2V5ID0gaTtcbiAgICBpZiAoaS5pbmRleE9mKCctJykgPT09IDApIHtcbiAgICAgIC8vIFZlbmRvciBwcmVmaXhlcyBnZXQgY2FwaXRhbGlzZWQuXG4gICAgICBrZXkgPSBpLnJlcGxhY2UoL14tLywgJycpLnNwbGl0KCctJykubWFwKGNhcGl0YWxpemUpLmpvaW4oJycpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAga2V5ID0gaS5zcGxpdCgnLScpLm1hcChmdW5jdGlvbihzdHIsIGluZGV4KSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGNhcGl0YWxpemUoc3RyKTtcbiAgICAgICAgfVxuICAgICAgfSkuam9pbignJyk7XG4gICAgfVxuICAgIHN0eWxlc1trZXldID0gc3R5bGVzW2ldO1xuICAgIGRlbGV0ZSBzdHlsZXNbaV07XG4gIH1cbn07XG5cbi8qKlxuICogTWFwcyB0aGUgc3R5bGUgYXR0cmlidXRlIHRvIGEgcmVhY3QgY29tcGF0aWJsZSBhdHRyaWJ1dGUuXG4gKi9cbmRlZmF1bHRNdXRhdG9ycy5tYXBDbGFzcyA9IGZ1bmN0aW9uKGVsZW0pIHtcbiAgaWYgKHRoaXMuaXNEb21Ob2RlKGVsZW0pKSB7XG4gICAgaWYgKCEhZWxlbS5hdHRyaWJ1dGVzICYmICEhZWxlbS5hdHRyaWJ1dGVzLmNsYXNzICYmICEhZWxlbS5hdHRyaWJ1dGVzLmNsYXNzLmxlbmd0aCkge1xuICAgICAgZWxlbS5hdHRyaWJ1dGVzLmNsYXNzTmFtZSA9IGVsZW0uYXR0cmlidXRlcy5jbGFzcztcbiAgICAgIGRlbGV0ZSBlbGVtLmF0dHJpYnV0ZXMuY2xhc3M7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIE1hcHMgdGhlIHN0eWxlIGF0dHJpYnV0ZSB0byBhIHJlYWN0IGNvbXBhdGlibGUgYXR0cmlidXRlLlxuICovXG5kZWZhdWx0TXV0YXRvcnMubWFwU3R5bGUgPSBmdW5jdGlvbihlbGVtKSB7XG4gIGlmICh0aGlzLmlzRG9tTm9kZShlbGVtKSkge1xuICAgIGlmICghIWVsZW0uYXR0cmlidXRlcyAmJiAhIWVsZW0uYXR0cmlidXRlcy5zdHlsZSAmJiAhIWVsZW0uYXR0cmlidXRlcy5zdHlsZS5sZW5ndGgpIHtcbiAgICAgIGVsZW0uYXR0cmlidXRlcy5zdHlsZSA9IGFkanVzdFN0eWxlc0ZvclJlYWN0KG1hcFN0eWxlKGVsZW0uYXR0cmlidXRlcy5zdHlsZSkpO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBkZWZhdWx0TXV0YXRvcnM7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBIVE1MIHRvIFJlYWN0IGNvbnZlcnRlci5cbiAqL1xuXG52YXIgalF1ZXJ5ID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ2pRdWVyeSddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnalF1ZXJ5J10gOiBudWxsKSxcbiAgICBSZWFjdCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSZWFjdCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUmVhY3QnXSA6IG51bGwpLFxuICAgIFJlYWN0Um91dGVyID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0Um91dGVyJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdFJvdXRlciddIDogbnVsbCksXG4gICAgbXV0YXRvcnMgPSByZXF1aXJlKCcuL211dGF0b3JzJyksXG4gICAgZGVmYXVsdE11dGF0b3JzID0gcmVxdWlyZSgnLi9kZWZhdWx0LW11dGF0b3JzJyk7XG5cbi8qKlxuICogUGFyc2VzIEhUTUwgYW5kIHJldHVybnMgUmVhY3QgZWxlbWVudHMuXG4gKi9cbnZhciBIdG1sMlJlYWN0ID0gZnVuY3Rpb24oaW5wdXRIVE1MLCBvcHRpb25zKSB7XG4gIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICB1c2VEZWZhdWx0TXV0YXRvcnM6IHRydWVcbiAgfTtcblxuICB2YXIgc3RhdGUgPSB7XG4gICAgcGFyc2VkOiBudWxsLFxuICAgIG9wdGlvbnM6ICQuZXh0ZW5kKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0aW9ucylcbiAgfTtcblxuICB2YXIgcHJpdiA9IHt9O1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIE5hbWVkTm9kZU1hcCB0byBhIHBsYWluIG9sZCBKUyBvYmplY3QuXG4gICAqL1xuICBwcml2Lm5hbWVkTm9kZU1hcFRvT2JqZWN0ID0gZnVuY3Rpb24obm5tKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm5tLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgYXR0ciA9IG5ubS5pdGVtKGkpLFxuICAgICAgYXR0ck5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICBpZiAoYXR0ck5hbWUgPT0gJ2NsYXNzJykge1xuICAgICAgICBhdHRyTmFtZSA9ICdjbGFzc05hbWUnO1xuICAgICAgfVxuICAgICAgb2JqW2F0dHJOYW1lXSA9IGF0dHIudmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgc2luZ2xlIERPTU5vZGUgaW50byBkYXRhIHRvIGJlIGhhbmRsZWQgYnkgdGhlIFJlYWN0IGNvbnZlcnRlci5cbiAgICovXG4gIHByaXYucGFyc2VOb2RlID0gZnVuY3Rpb24obm9kZSkge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09IDEpIHtcbiAgICAgIHZhciBvdXQgPSB7fTtcbiAgICAgIG91dC5ub2RlTmFtZSA9IG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIG91dC5hdHRyaWJ1dGVzID0gcHJpdi5uYW1lZE5vZGVNYXBUb09iamVjdChub2RlLmF0dHJpYnV0ZXMpO1xuICAgICAgb3V0LmNoaWxkcmVuID0gW10uc2xpY2UuY2FsbChub2RlLmNoaWxkTm9kZXMpLm1hcChmdW5jdGlvbihjbikge1xuICAgICAgICByZXR1cm4gcHJpdi5wYXJzZU5vZGUoY24pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09IDMpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHRDb250ZW50O1xuICAgIH1cbiAgICBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09IDkpIHtcbiAgICAgIHJldHVybiBwcml2LnBhcnNlTm9kZShub2RlLmNoaWxkTm9kZXNbMF0pO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcblxuICAvKipcbiAgICogSW5pdGlhbGlzZXMgdGhlIGNsYXNzIGFuZCBwYXJzZXMgdGhlIHN1Ym1pdHRlZCBIVE1MLlxuICAgKi9cbiAgcHJpdi5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciB3cmFwcGVkID0gJzxkaXYgY2xhc3M9XCJodG1sMnJlYWN0LXBhcnNlZFwiPicgKyBpbnB1dEhUTUwgKyAnPC9kaXY+JztcbiAgICAgIHZhciBodG1sID0galF1ZXJ5LnBhcnNlSFRNTCh3cmFwcGVkKTtcbiAgICAgIHN0YXRlLnBhcnNlZCA9IHByaXYucGFyc2VOb2RlKGh0bWxbMF0pO1xuICAgICAgaWYgKCEhc3RhdGUub3B0aW9ucy51c2VEZWZhdWx0TXV0YXRvcnMpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBkZWZhdWx0TXV0YXRvcnMpIHtcbiAgICAgICAgICBwdWIubXV0YXRlRWFjaChkZWZhdWx0TXV0YXRvcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNhdGNoKGUpIHtcbiAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBzaW5nbGUgSFRNTCB0YWcgaW50byBhIFJlYWN0IGVsZW1lbnQuXG4gICAqXG4gICAqIFJlY3Vyc2l2ZWx5IGNhbGxzIGl0c2VsZiB0byBjb252ZXJ0IHRoZSBlbGVtZW50J3MgY2hpbGRyZW4uXG4gICAqL1xuICBwcml2LmVsZW1Ub1JlYWN0ID0gZnVuY3Rpb24oZWxlbSwgY2hhaW4pIHtcbiAgICBpZiAoIWNoYWluKSB7XG4gICAgICBjaGFpbiA9IFswXTtcbiAgICB9XG4gICAgaWYgKHB1Yi5pc0RvbU5vZGUoZWxlbSkpIHtcbiAgICAgIHZhciBub2RlTmFtZSA9IGVsZW0ubm9kZU5hbWUsXG4gICAgICBhdHRyaWJ1dGVzID0gZWxlbS5hdHRyaWJ1dGVzO1xuICAgICAgYXR0cmlidXRlcy5rZXkgPSBjaGFpbi5qb2luKCcuJyk7XG5cbiAgICAgIGlmIChlbGVtLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICBub2RlTmFtZSxcbiAgICAgICAgICBhdHRyaWJ1dGVzLFxuICAgICAgICAgIGVsZW0uY2hpbGRyZW4ubWFwKGZ1bmN0aW9uKGMsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiBwcml2LmVsZW1Ub1JlYWN0KGMsIGNoYWluLmNvbmNhdChbaV0pKTtcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgIG5vZGVOYW1lLFxuICAgICAgICAgIGF0dHJpYnV0ZXNcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gZWxlbTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlY3Vyc2l2ZWx5IG11dGF0ZSBhIHNpbmdsZSBlbGVtZW50IHVzaW5nIGEgcGFydGljdWxhciBmdW5jdGlvbi5cbiAgICovXG4gIHByaXYubXV0YXRlRWFjaCA9IGZ1bmN0aW9uKGVsZW0sIGVhY2hOb2RlKSB7XG4gICAgZWFjaE5vZGUuY2FsbChwdWIsIGVsZW0pO1xuICAgIGlmICghIWVsZW0uY2hpbGRyZW4gJiYgISFlbGVtLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgZWxlbS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgIHJldHVybiBwcml2Lm11dGF0ZUVhY2goY2hpbGQsIGVhY2hOb2RlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICB2YXIgcHViID0ge307XG5cbiAgLyoqXG4gICAqIFNheXMgd2hldGhlciB0aGUgSFRNTCBzdWJtaXR0ZWQgd2FzIHBhcnNlZCBzdWNjZXNzZnVsbHkgb3Igbm90LlxuICAgKi9cbiAgcHViLnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc3RhdGUucGFyc2VkICE9PSBudWxsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBNdXRhdGUgdGhlIHBhcnNlZCB0cmVlIGJlZm9yZSB0aGUgZWxlbWVudHMgYXJlIGNvbnZlcnRlZCB0byBSZWFjdC5cbiAgICpcbiAgICogQHBhcmFtIGZ1bmN0aW9uIGVhY2hOb2RlXG4gICAqICAgTXV0YXRvciBmdW5jdGlvbiB0byBydW4gb24gZWFjaCBub2RlLlxuICAgKi9cbiAgcHViLm11dGF0ZUVhY2ggPSBmdW5jdGlvbihlYWNoTm9kZSkge1xuICAgIGlmIChzdGF0ZS5wYXJzZWQgIT09IG51bGwpIHtcbiAgICAgIGlmICghZWFjaE5vZGUpIHtcbiAgICAgICAgZWFjaE5vZGUgPSBmdW5jdGlvbihlbGVtKSB7fTtcbiAgICAgIH1cbiAgICAgIHByaXYubXV0YXRlRWFjaChzdGF0ZS5wYXJzZWQsIGVhY2hOb2RlKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgaWYgdGhlIGN1cnJlbnQgZWxlbWVudCBpcyBhIHBhcnNlZCBET01Ob2RlLlxuICAgKi9cbiAgcHViLmlzRG9tTm9kZSA9IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICByZXR1cm4gKFxuICAgICAgalF1ZXJ5LmlzUGxhaW5PYmplY3QoZWxlbSkgJiZcbiAgICAgICEhZWxlbS5ub2RlTmFtZS5sZW5ndGggJiZcbiAgICAgIGpRdWVyeS5pc1BsYWluT2JqZWN0KGVsZW0uYXR0cmlidXRlcylcbiAgICApO1xuICB9O1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIGEgc2V0IG9mIG11dGF0b3JzIHRoYXQgY2FuIGJlIHJ1biB0aHJvdWdoIEh0bWwyUmVhY3QubXV0YXRlRWFjaC5cbiAgICovXG4gIHB1Yi5tdXRhdG9ycyA9IG11dGF0b3JzO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIFJlYWN0IGVsZW1lbnRzIHBhcnNlZCBmcm9tIHRoZSBIVE1MLlxuICAgKi9cbiAgcHViLnRvUmVhY3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcHJpdi5lbGVtVG9SZWFjdChzdGF0ZS5wYXJzZWQpO1xuICB9O1xuXG4gIHByaXYuaW5pdCgpO1xuXG4gIHJldHVybiBwdWI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEh0bWwyUmVhY3Q7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBNdXRhdG9ycy5cbiAqL1xuXG52YXIgbXV0YXRvcnMgPSB7fTtcblxuLyoqXG4gKiBJZiB3ZSBoYXZlIGFuIGludGVybmFsIGxpbmssXG4gKiBhbmQgd2UgaGF2ZSByZWFjdC1yb3V0ZXIgaW4gb3VyIHByb2plY3QsXG4gKiBhbGxvdyByZWFjdC1yb3V0ZXIgdG8gdGFrZSBpdCBvdmVyLlxuICovXG5tdXRhdG9ycy5yZWFjdFJvdXRlckxpbmsgPSBmdW5jdGlvbihlbGVtKSB7XG4gIGlmICh0aGlzLmlzRG9tTm9kZShlbGVtKSkge1xuICAgIGlmIChcbiAgICAgIGVsZW0ubm9kZU5hbWUgPT09ICdhJyAmJlxuICAgICAgISFlbGVtLmF0dHJpYnV0ZXMuaHJlZiAmJlxuICAgICAgZWxlbS5hdHRyaWJ1dGVzLmhyZWYuaW5kZXhPZignLycpID09PSAwICYmXG4gICAgICAhIVJlYWN0Um91dGVyICYmXG4gICAgICAhIVJlYWN0Um91dGVyLkxpbmtcbiAgICApIHtcbiAgICAgIGVsZW0ubm9kZU5hbWUgPSBSZWFjdFJvdXRlci5MaW5rO1xuICAgICAgZWxlbS5hdHRyaWJ1dGVzLnRvID0gYXR0cmlidXRlcy5ocmVmO1xuICAgICAgZGVsZXRlIGVsZW0uYXR0cmlidXRlcy5ocmVmO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBtdXRhdG9ycztcbiJdfQ==
