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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kZWZhdWx0LW11dGF0b3JzLmpzIiwibGliL2h0bWwtMi1yZWFjdC5qcyIsImxpYi9tdXRhdG9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2h0bWwtMi1yZWFjdCcpO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogTXV0YXRvcnMuXG4gKi9cblxudmFyIGRlZmF1bHRNdXRhdG9ycyA9IHt9O1xuXG52YXIgbWFwU3R5bGUgPSBmdW5jdGlvbihzdHIpIHtcbiAgaWYgKCFzdHIgfHwgIXN0ci5sZW5ndGgpIHtcbiAgICByZXR1cm4ge307XG4gIH1cbiAgcmV0dXJuIHN0ci5zcGxpdCgvXFxzKjtcXHMqLylcbiAgLmZpbHRlcihmdW5jdGlvbihpKSB7XG4gICAgcmV0dXJuIGkubGVuZ3RoO1xuICB9KVxuICAubWFwKGZ1bmN0aW9uKGkpIHtcbiAgICByZXR1cm4gaS5zcGxpdCgvOi8pO1xuICB9KVxuICAucmVkdWNlKGZ1bmN0aW9uKGFnZywgaSkge1xuICAgIHZhciBrID0gaS5zaGlmdCgpO1xuICAgIGFnZ1trXSA9IGkubWFwKGZ1bmN0aW9uKGlpKSB7XG4gICAgICByZXR1cm4gaWkucmVwbGFjZSgvXlxccyovLCAnJykucmVwbGFjZSgvXFxzKiQvLCAnJyk7XG4gICAgfSkuam9pbignOicpO1xuICAgIHJldHVybiBhZ2c7XG4gIH0sIHt9KTtcbn07XG5cbnZhciBjYXBpdGFsaXplID0gZnVuY3Rpb24oc3RyKSB7XG4gIHJldHVybiBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSBhcHByb3ByaWF0ZSBzdHlsZSBhdHRyaWJ1dGUgY2FtZWxjYXNpbmcgZm9yIFJlYWN0LlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9mYWNlYm9vay5naXRodWIuaW8vcmVhY3QvdGlwcy9pbmxpbmUtc3R5bGVzLmh0bWxcbiAqL1xudmFyIGFkanVzdFN0eWxlc0ZvclJlYWN0ID0gZnVuY3Rpb24oc3R5bGVzKSB7XG4gIGZvciAodmFyIGkgaW4gc3R5bGVzKSB7XG4gICAgdmFyIGtleSA9IGk7XG4gICAgaWYgKGkuaW5kZXhPZignLScpID09PSAwKSB7XG4gICAgICAvLyBWZW5kb3IgcHJlZml4ZXMgZ2V0IGNhcGl0YWxpc2VkLlxuICAgICAga2V5ID0gaS5yZXBsYWNlKC9eLS8sICcnKS5zcGxpdCgnLScpLm1hcChjYXBpdGFsaXplKS5qb2luKCcnKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGtleSA9IGkuc3BsaXQoJy0nKS5tYXAoZnVuY3Rpb24oc3RyLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHJldHVybiBjYXBpdGFsaXplKHN0cik7XG4gICAgICAgIH1cbiAgICAgIH0pLmpvaW4oJycpO1xuICAgIH1cbiAgICBzdHlsZXNba2V5XSA9IHN0eWxlc1tpXTtcbiAgICBkZWxldGUgc3R5bGVzW2ldO1xuICB9XG59O1xuXG4vKipcbiAqIE1hcHMgdGhlIHN0eWxlIGF0dHJpYnV0ZSB0byBhIHJlYWN0IGNvbXBhdGlibGUgYXR0cmlidXRlLlxuICovXG5kZWZhdWx0TXV0YXRvcnMubWFwQ2xhc3MgPSBmdW5jdGlvbihlbGVtKSB7XG4gIGlmICh0aGlzLmlzRG9tTm9kZShlbGVtKSkge1xuICAgIGlmICghIWVsZW0uYXR0cmlidXRlcyAmJiAhIWVsZW0uYXR0cmlidXRlcy5jbGFzcyAmJiAhIWVsZW0uYXR0cmlidXRlcy5jbGFzcy5sZW5ndGgpIHtcbiAgICAgIGVsZW0uYXR0cmlidXRlcy5jbGFzc05hbWUgPSBlbGVtLmF0dHJpYnV0ZXMuY2xhc3M7XG4gICAgICBkZWxldGUgZWxlbS5hdHRyaWJ1dGVzLmNsYXNzO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBNYXBzIHRoZSBzdHlsZSBhdHRyaWJ1dGUgdG8gYSByZWFjdCBjb21wYXRpYmxlIGF0dHJpYnV0ZS5cbiAqL1xuZGVmYXVsdE11dGF0b3JzLm1hcFN0eWxlID0gZnVuY3Rpb24oZWxlbSkge1xuICBpZiAodGhpcy5pc0RvbU5vZGUoZWxlbSkpIHtcbiAgICBpZiAoISFlbGVtLmF0dHJpYnV0ZXMgJiYgISFlbGVtLmF0dHJpYnV0ZXMuc3R5bGUgJiYgISFlbGVtLmF0dHJpYnV0ZXMuc3R5bGUubGVuZ3RoKSB7XG4gICAgICBlbGVtLmF0dHJpYnV0ZXMuc3R5bGUgPSBhZGp1c3RTdHlsZXNGb3JSZWFjdChtYXBTdHlsZShlbGVtLmF0dHJpYnV0ZXMuc3R5bGUpKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmYXVsdE11dGF0b3JzO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogSFRNTCB0byBSZWFjdCBjb252ZXJ0ZXIuXG4gKi9cblxudmFyIGpRdWVyeSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydqUXVlcnknXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ2pRdWVyeSddIDogbnVsbCksXG4gICAgUmVhY3QgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snUmVhY3QnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1JlYWN0J10gOiBudWxsKSxcbiAgICBSZWFjdFJvdXRlciA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSZWFjdFJvdXRlciddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUmVhY3RSb3V0ZXInXSA6IG51bGwpLFxuICAgIG11dGF0b3JzID0gcmVxdWlyZSgnLi9tdXRhdG9ycycpLFxuICAgIGRlZmF1bHRNdXRhdG9ycyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1tdXRhdG9ycycpO1xuXG4vKipcbiAqIFBhcnNlcyBIVE1MIGFuZCByZXR1cm5zIFJlYWN0IGVsZW1lbnRzLlxuICovXG52YXIgSHRtbDJSZWFjdCA9IGZ1bmN0aW9uKGlucHV0SFRNTCwgb3B0aW9ucykge1xuICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgdXNlRGVmYXVsdE11dGF0b3JzOiB0cnVlXG4gIH07XG5cbiAgdmFyIHN0YXRlID0ge1xuICAgIHBhcnNlZDogbnVsbCxcbiAgICBvcHRpb25zOiAkLmV4dGVuZCh7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpXG4gIH07XG5cbiAgdmFyIHByaXYgPSB7fTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBOYW1lZE5vZGVNYXAgdG8gYSBwbGFpbiBvbGQgSlMgb2JqZWN0LlxuICAgKi9cbiAgcHJpdi5uYW1lZE5vZGVNYXBUb09iamVjdCA9IGZ1bmN0aW9uKG5ubSkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5ubS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBubm0uaXRlbShpKSxcbiAgICAgIGF0dHJOYW1lID0gYXR0ci5uYW1lO1xuICAgICAgaWYgKGF0dHJOYW1lID09ICdjbGFzcycpIHtcbiAgICAgICAgYXR0ck5hbWUgPSAnY2xhc3NOYW1lJztcbiAgICAgIH1cbiAgICAgIG9ialthdHRyTmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIHNpbmdsZSBET01Ob2RlIGludG8gZGF0YSB0byBiZSBoYW5kbGVkIGJ5IHRoZSBSZWFjdCBjb252ZXJ0ZXIuXG4gICAqL1xuICBwcml2LnBhcnNlTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PSAxKSB7XG4gICAgICB2YXIgb3V0ID0ge307XG4gICAgICBvdXQubm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICBvdXQuYXR0cmlidXRlcyA9IHByaXYubmFtZWROb2RlTWFwVG9PYmplY3Qobm9kZS5hdHRyaWJ1dGVzKTtcbiAgICAgIG91dC5jaGlsZHJlbiA9IFtdLnNsaWNlLmNhbGwobm9kZS5jaGlsZE5vZGVzKS5tYXAoZnVuY3Rpb24oY24pIHtcbiAgICAgICAgcmV0dXJuIHByaXYucGFyc2VOb2RlKGNuKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PSAzKSB7XG4gICAgICByZXR1cm4gbm9kZS50ZXh0Q29udGVudDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PSA5KSB7XG4gICAgICByZXR1cm4gcHJpdi5wYXJzZU5vZGUobm9kZS5jaGlsZE5vZGVzWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpc2VzIHRoZSBjbGFzcyBhbmQgcGFyc2VzIHRoZSBzdWJtaXR0ZWQgSFRNTC5cbiAgICovXG4gIHByaXYuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgd3JhcHBlZCA9ICc8ZGl2IGNsYXNzPVwiaHRtbDJyZWFjdC1wYXJzZWRcIj4nICsgaW5wdXRIVE1MICsgJzwvZGl2Pic7XG4gICAgICB2YXIgaHRtbCA9IGpRdWVyeS5wYXJzZUhUTUwod3JhcHBlZCk7XG4gICAgICBzdGF0ZS5wYXJzZWQgPSBwcml2LnBhcnNlTm9kZShodG1sWzBdKTtcbiAgICAgIGlmICghIXN0YXRlLm9wdGlvbnMudXNlRGVmYXVsdE11dGF0b3JzKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gZGVmYXVsdE11dGF0b3JzKSB7XG4gICAgICAgICAgcHViLm11dGF0ZUVhY2goZGVmYXVsdE11dGF0b3JzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaChlKSB7XG4gICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgc2luZ2xlIEhUTUwgdGFnIGludG8gYSBSZWFjdCBlbGVtZW50LlxuICAgKlxuICAgKiBSZWN1cnNpdmVseSBjYWxscyBpdHNlbGYgdG8gY29udmVydCB0aGUgZWxlbWVudCdzIGNoaWxkcmVuLlxuICAgKi9cbiAgcHJpdi5lbGVtVG9SZWFjdCA9IGZ1bmN0aW9uKGVsZW0sIGNoYWluKSB7XG4gICAgaWYgKCFjaGFpbikge1xuICAgICAgY2hhaW4gPSBbMF07XG4gICAgfVxuICAgIGlmIChwdWIuaXNEb21Ob2RlKGVsZW0pKSB7XG4gICAgICB2YXIgbm9kZU5hbWUgPSBlbGVtLm5vZGVOYW1lLFxuICAgICAgYXR0cmlidXRlcyA9IGVsZW0uYXR0cmlidXRlcztcbiAgICAgIGF0dHJpYnV0ZXMua2V5ID0gY2hhaW4uam9pbignLicpO1xuXG4gICAgICBpZiAoZWxlbS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgbm9kZU5hbWUsXG4gICAgICAgICAgYXR0cmlidXRlcyxcbiAgICAgICAgICBlbGVtLmNoaWxkcmVuLm1hcChmdW5jdGlvbihjLCBpKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJpdi5lbGVtVG9SZWFjdChjLCBjaGFpbi5jb25jYXQoW2ldKSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICBub2RlTmFtZSxcbiAgICAgICAgICBhdHRyaWJ1dGVzXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmVseSBtdXRhdGUgYSBzaW5nbGUgZWxlbWVudCB1c2luZyBhIHBhcnRpY3VsYXIgZnVuY3Rpb24uXG4gICAqL1xuICBwcml2Lm11dGF0ZUVhY2ggPSBmdW5jdGlvbihlbGVtLCBlYWNoTm9kZSkge1xuICAgIGVhY2hOb2RlLmNhbGwocHViLCBlbGVtKTtcbiAgICBpZiAoISFlbGVtLmNoaWxkcmVuICYmICEhZWxlbS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIGVsZW0uY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICByZXR1cm4gcHJpdi5tdXRhdGVFYWNoKGNoaWxkLCBlYWNoTm9kZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIHB1YiA9IHt9O1xuXG4gIC8qKlxuICAgKiBTYXlzIHdoZXRoZXIgdGhlIEhUTUwgc3VibWl0dGVkIHdhcyBwYXJzZWQgc3VjY2Vzc2Z1bGx5IG9yIG5vdC5cbiAgICovXG4gIHB1Yi5zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHN0YXRlLnBhcnNlZCAhPT0gbnVsbDtcbiAgfTtcblxuICAvKipcbiAgICogTXV0YXRlIHRoZSBwYXJzZWQgdHJlZSBiZWZvcmUgdGhlIGVsZW1lbnRzIGFyZSBjb252ZXJ0ZWQgdG8gUmVhY3QuXG4gICAqXG4gICAqIEBwYXJhbSBmdW5jdGlvbiBlYWNoTm9kZVxuICAgKiAgIE11dGF0b3IgZnVuY3Rpb24gdG8gcnVuIG9uIGVhY2ggbm9kZS5cbiAgICovXG4gIHB1Yi5tdXRhdGVFYWNoID0gZnVuY3Rpb24oZWFjaE5vZGUpIHtcbiAgICBpZiAoc3RhdGUucGFyc2VkICE9PSBudWxsKSB7XG4gICAgICBpZiAoIWVhY2hOb2RlKSB7XG4gICAgICAgIGVhY2hOb2RlID0gZnVuY3Rpb24oZWxlbSkge307XG4gICAgICB9XG4gICAgICBwcml2Lm11dGF0ZUVhY2goc3RhdGUucGFyc2VkLCBlYWNoTm9kZSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIHRoZSBjdXJyZW50IGVsZW1lbnQgaXMgYSBwYXJzZWQgRE9NTm9kZS5cbiAgICovXG4gIHB1Yi5pc0RvbU5vZGUgPSBmdW5jdGlvbihlbGVtKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIGpRdWVyeS5pc1BsYWluT2JqZWN0KGVsZW0pICYmXG4gICAgICAhIWVsZW0ubm9kZU5hbWUubGVuZ3RoICYmXG4gICAgICBqUXVlcnkuaXNQbGFpbk9iamVjdChlbGVtLmF0dHJpYnV0ZXMpXG4gICAgKTtcbiAgfTtcblxuICAvKipcbiAgICogRGVmaW5lcyBhIHNldCBvZiBtdXRhdG9ycyB0aGF0IGNhbiBiZSBydW4gdGhyb3VnaCBIdG1sMlJlYWN0Lm11dGF0ZUVhY2guXG4gICAqL1xuICBwdWIubXV0YXRvcnMgPSBtdXRhdG9ycztcblxuICAvKipcbiAgICogUmV0dXJucyBSZWFjdCBlbGVtZW50cyBwYXJzZWQgZnJvbSB0aGUgSFRNTC5cbiAgICovXG4gIHB1Yi50b1JlYWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHByaXYuZWxlbVRvUmVhY3Qoc3RhdGUucGFyc2VkKTtcbiAgfTtcblxuICBwcml2LmluaXQoKTtcblxuICByZXR1cm4gcHViO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIdG1sMlJlYWN0O1xuIiwiLyoqXG4gKiBAZmlsZVxuICogTXV0YXRvcnMuXG4gKi9cblxudmFyIG11dGF0b3JzID0ge307XG5cbi8qKlxuICogSWYgd2UgaGF2ZSBhbiBpbnRlcm5hbCBsaW5rLFxuICogYW5kIHdlIGhhdmUgcmVhY3Qtcm91dGVyIGluIG91ciBwcm9qZWN0LFxuICogYWxsb3cgcmVhY3Qtcm91dGVyIHRvIHRha2UgaXQgb3Zlci5cbiAqL1xubXV0YXRvcnMucmVhY3RSb3V0ZXJMaW5rID0gZnVuY3Rpb24oZWxlbSkge1xuICBpZiAodGhpcy5pc0RvbU5vZGUoZWxlbSkpIHtcbiAgICBpZiAoXG4gICAgICBlbGVtLm5vZGVOYW1lID09PSAnYScgJiZcbiAgICAgICEhZWxlbS5hdHRyaWJ1dGVzLmhyZWYgJiZcbiAgICAgIGVsZW0uYXR0cmlidXRlcy5ocmVmLmluZGV4T2YoJy8nKSA9PT0gMCAmJlxuICAgICAgISFSZWFjdFJvdXRlciAmJlxuICAgICAgISFSZWFjdFJvdXRlci5MaW5rXG4gICAgKSB7XG4gICAgICBlbGVtLm5vZGVOYW1lID0gUmVhY3RSb3V0ZXIuTGluaztcbiAgICAgIGVsZW0uYXR0cmlidXRlcy50byA9IGF0dHJpYnV0ZXMuaHJlZjtcbiAgICAgIGRlbGV0ZSBlbGVtLmF0dHJpYnV0ZXMuaHJlZjtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbXV0YXRvcnM7XG4iXX0=
