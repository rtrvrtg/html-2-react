(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.html2React = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = require('./lib/html-2-react');

},{"./lib/html-2-react":2}],2:[function(require,module,exports){
(function (global){
/**
 * @file
 * HTML to React converter.
 */

var jQuery = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null),
    React = (typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null),
    ReactRouter = (typeof window !== "undefined" ? window['ReactRouter'] : typeof global !== "undefined" ? global['ReactRouter'] : null);

/**
 * Parses HTML and returns React elements.
 */
var Html2React = function(inputHTML) {
  var state = {
    parsed: null
  };

  var priv = {};

  /**
   * Converts a NamedNodeMap to a plain old JS object.
   */
  priv.namedNodeMapToObject = function(nnm) {
    var obj = {};
    for (var i = 0; i < nnm.length; i++) {
      var attr = nnm.item(i);
      obj[attr.name] = attr.value;
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
    onElem.call(pub, eachNode);
    elem.children.mutateEach(function(e) {
      return priv.mutate(e, eachNode);
    });
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
  pub.mutators = {
    /**
     * Converts all links into ReactRouter.Link objects.
     */
    reactRouterLink: function(elem) {
      if (pub.isDomNode(elem)) {
        // If we have an internal link,
        // and we have react-router in our project,
        // allow react-router to take it over.
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
    }
  };

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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9odG1sLTItcmVhY3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvaHRtbC0yLXJlYWN0Jyk7XG4iLCIvKipcbiAqIEBmaWxlXG4gKiBIVE1MIHRvIFJlYWN0IGNvbnZlcnRlci5cbiAqL1xuXG52YXIgalF1ZXJ5ID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ2pRdWVyeSddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnalF1ZXJ5J10gOiBudWxsKSxcbiAgICBSZWFjdCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSZWFjdCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUmVhY3QnXSA6IG51bGwpLFxuICAgIFJlYWN0Um91dGVyID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0Um91dGVyJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdFJvdXRlciddIDogbnVsbCk7XG5cbi8qKlxuICogUGFyc2VzIEhUTUwgYW5kIHJldHVybnMgUmVhY3QgZWxlbWVudHMuXG4gKi9cbnZhciBIdG1sMlJlYWN0ID0gZnVuY3Rpb24oaW5wdXRIVE1MKSB7XG4gIHZhciBzdGF0ZSA9IHtcbiAgICBwYXJzZWQ6IG51bGxcbiAgfTtcblxuICB2YXIgcHJpdiA9IHt9O1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIE5hbWVkTm9kZU1hcCB0byBhIHBsYWluIG9sZCBKUyBvYmplY3QuXG4gICAqL1xuICBwcml2Lm5hbWVkTm9kZU1hcFRvT2JqZWN0ID0gZnVuY3Rpb24obm5tKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm5tLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgYXR0ciA9IG5ubS5pdGVtKGkpO1xuICAgICAgb2JqW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIHNpbmdsZSBET01Ob2RlIGludG8gZGF0YSB0byBiZSBoYW5kbGVkIGJ5IHRoZSBSZWFjdCBjb252ZXJ0ZXIuXG4gICAqL1xuICBwcml2LnBhcnNlTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZiAobm9kZS5ub2RlVHlwZSA9PSAxKSB7XG4gICAgICB2YXIgb3V0ID0ge307XG4gICAgICBvdXQubm9kZU5hbWUgPSBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICBvdXQuYXR0cmlidXRlcyA9IHByaXYubmFtZWROb2RlTWFwVG9PYmplY3Qobm9kZS5hdHRyaWJ1dGVzKTtcbiAgICAgIG91dC5jaGlsZHJlbiA9IFtdLnNsaWNlLmNhbGwobm9kZS5jaGlsZE5vZGVzKS5tYXAoZnVuY3Rpb24oY24pIHtcbiAgICAgICAgcmV0dXJuIHByaXYucGFyc2VOb2RlKGNuKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PSAzKSB7XG4gICAgICByZXR1cm4gbm9kZS50ZXh0Q29udGVudDtcbiAgICB9XG4gICAgZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PSA5KSB7XG4gICAgICByZXR1cm4gcHJpdi5wYXJzZU5vZGUobm9kZS5jaGlsZE5vZGVzWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpc2VzIHRoZSBjbGFzcyBhbmQgcGFyc2VzIHRoZSBzdWJtaXR0ZWQgSFRNTC5cbiAgICovXG4gIHByaXYuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgd3JhcHBlZCA9ICc8ZGl2IGNsYXNzPVwiaHRtbDJyZWFjdC1wYXJzZWRcIj4nICsgaW5wdXRIVE1MICsgJzwvZGl2Pic7XG4gICAgICB2YXIgaHRtbCA9IGpRdWVyeS5wYXJzZUhUTUwod3JhcHBlZCk7XG4gICAgICBzdGF0ZS5wYXJzZWQgPSBwcml2LnBhcnNlTm9kZShodG1sWzBdKTtcbiAgICB9XG4gICAgY2F0Y2goZSkge1xuICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIHNpbmdsZSBIVE1MIHRhZyBpbnRvIGEgUmVhY3QgZWxlbWVudC5cbiAgICpcbiAgICogUmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIHRvIGNvbnZlcnQgdGhlIGVsZW1lbnQncyBjaGlsZHJlbi5cbiAgICovXG4gIHByaXYuZWxlbVRvUmVhY3QgPSBmdW5jdGlvbihlbGVtLCBjaGFpbikge1xuICAgIGlmICghY2hhaW4pIHtcbiAgICAgIGNoYWluID0gWzBdO1xuICAgIH1cbiAgICBpZiAocHViLmlzRG9tTm9kZShlbGVtKSkge1xuICAgICAgdmFyIG5vZGVOYW1lID0gZWxlbS5ub2RlTmFtZSxcbiAgICAgIGF0dHJpYnV0ZXMgPSBlbGVtLmF0dHJpYnV0ZXM7XG4gICAgICBhdHRyaWJ1dGVzLmtleSA9IGNoYWluLmpvaW4oJy4nKTtcblxuICAgICAgaWYgKGVsZW0uY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgIG5vZGVOYW1lLFxuICAgICAgICAgIGF0dHJpYnV0ZXMsXG4gICAgICAgICAgZWxlbS5jaGlsZHJlbi5tYXAoZnVuY3Rpb24oYywgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHByaXYuZWxlbVRvUmVhY3QoYywgY2hhaW4uY29uY2F0KFtpXSkpO1xuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgbm9kZU5hbWUsXG4gICAgICAgICAgYXR0cmlidXRlc1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBlbGVtO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmVjdXJzaXZlbHkgbXV0YXRlIGEgc2luZ2xlIGVsZW1lbnQgdXNpbmcgYSBwYXJ0aWN1bGFyIGZ1bmN0aW9uLlxuICAgKi9cbiAgcHJpdi5tdXRhdGVFYWNoID0gZnVuY3Rpb24oZWxlbSwgZWFjaE5vZGUpIHtcbiAgICBvbkVsZW0uY2FsbChwdWIsIGVhY2hOb2RlKTtcbiAgICBlbGVtLmNoaWxkcmVuLm11dGF0ZUVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgcmV0dXJuIHByaXYubXV0YXRlKGUsIGVhY2hOb2RlKTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgcHViID0ge307XG5cbiAgLyoqXG4gICAqIFNheXMgd2hldGhlciB0aGUgSFRNTCBzdWJtaXR0ZWQgd2FzIHBhcnNlZCBzdWNjZXNzZnVsbHkgb3Igbm90LlxuICAgKi9cbiAgcHViLnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc3RhdGUucGFyc2VkICE9PSBudWxsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBNdXRhdGUgdGhlIHBhcnNlZCB0cmVlIGJlZm9yZSB0aGUgZWxlbWVudHMgYXJlIGNvbnZlcnRlZCB0byBSZWFjdC5cbiAgICpcbiAgICogQHBhcmFtIGZ1bmN0aW9uIGVhY2hOb2RlXG4gICAqICAgTXV0YXRvciBmdW5jdGlvbiB0byBydW4gb24gZWFjaCBub2RlLlxuICAgKi9cbiAgcHViLm11dGF0ZUVhY2ggPSBmdW5jdGlvbihlYWNoTm9kZSkge1xuICAgIGlmIChzdGF0ZS5wYXJzZWQgIT09IG51bGwpIHtcbiAgICAgIGlmICghZWFjaE5vZGUpIHtcbiAgICAgICAgZWFjaE5vZGUgPSBmdW5jdGlvbihlbGVtKSB7fTtcbiAgICAgIH1cbiAgICAgIHByaXYubXV0YXRlRWFjaChzdGF0ZS5wYXJzZWQsIGVhY2hOb2RlKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgaWYgdGhlIGN1cnJlbnQgZWxlbWVudCBpcyBhIHBhcnNlZCBET01Ob2RlLlxuICAgKi9cbiAgcHViLmlzRG9tTm9kZSA9IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICByZXR1cm4gKFxuICAgICAgalF1ZXJ5LmlzUGxhaW5PYmplY3QoZWxlbSkgJiZcbiAgICAgICEhZWxlbS5ub2RlTmFtZS5sZW5ndGggJiZcbiAgICAgIGpRdWVyeS5pc1BsYWluT2JqZWN0KGVsZW0uYXR0cmlidXRlcylcbiAgICApO1xuICB9O1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIGEgc2V0IG9mIG11dGF0b3JzIHRoYXQgY2FuIGJlIHJ1biB0aHJvdWdoIEh0bWwyUmVhY3QubXV0YXRlRWFjaC5cbiAgICovXG4gIHB1Yi5tdXRhdG9ycyA9IHtcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhbGwgbGlua3MgaW50byBSZWFjdFJvdXRlci5MaW5rIG9iamVjdHMuXG4gICAgICovXG4gICAgcmVhY3RSb3V0ZXJMaW5rOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICBpZiAocHViLmlzRG9tTm9kZShlbGVtKSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGFuIGludGVybmFsIGxpbmssXG4gICAgICAgIC8vIGFuZCB3ZSBoYXZlIHJlYWN0LXJvdXRlciBpbiBvdXIgcHJvamVjdCxcbiAgICAgICAgLy8gYWxsb3cgcmVhY3Qtcm91dGVyIHRvIHRha2UgaXQgb3Zlci5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIGVsZW0ubm9kZU5hbWUgPT09ICdhJyAmJlxuICAgICAgICAgICEhZWxlbS5hdHRyaWJ1dGVzLmhyZWYgJiZcbiAgICAgICAgICBlbGVtLmF0dHJpYnV0ZXMuaHJlZi5pbmRleE9mKCcvJykgPT09IDAgJiZcbiAgICAgICAgICAhIVJlYWN0Um91dGVyICYmXG4gICAgICAgICAgISFSZWFjdFJvdXRlci5MaW5rXG4gICAgICAgICkge1xuICAgICAgICAgIGVsZW0ubm9kZU5hbWUgPSBSZWFjdFJvdXRlci5MaW5rO1xuICAgICAgICAgIGVsZW0uYXR0cmlidXRlcy50byA9IGF0dHJpYnV0ZXMuaHJlZjtcbiAgICAgICAgICBkZWxldGUgZWxlbS5hdHRyaWJ1dGVzLmhyZWY7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgUmVhY3QgZWxlbWVudHMgcGFyc2VkIGZyb20gdGhlIEhUTUwuXG4gICAqL1xuICBwdWIudG9SZWFjdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBwcml2LmVsZW1Ub1JlYWN0KHN0YXRlLnBhcnNlZCk7XG4gIH07XG5cbiAgcHJpdi5pbml0KCk7XG5cbiAgcmV0dXJuIHB1Yjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSHRtbDJSZWFjdDtcbiJdfQ==
