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
    if (jQuery.isPlainObject(elem)) {
      var nodeName = elem.nodeName,
          attributes = elem.attributes;
      attributes.key = chain.join('.');

      // If we have an internal link,
      // and we have react-router in our project,
      // allow react-router to take it over.
      if (
        nodeName === 'a' &&
        attributes.href.indexOf('/') === 0 &&
        !!ReactRouter &&
        !!ReactRouter.Link
      ) {
        nodeName = ReactRouter.Link;
        attributes.to = attributes.href;
        delete attributes.href;
      }

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

  var pub = {};

  /**
   * Says whether the HTML submitted was parsed successfully or not.
   */
  pub.success = function() {
    return state.parsed !== null;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9odG1sLTItcmVhY3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2h0bWwtMi1yZWFjdCcpO1xuIiwiLyoqXG4gKiBAZmlsZVxuICogSFRNTCB0byBSZWFjdCBjb252ZXJ0ZXIuXG4gKi9cblxudmFyIGpRdWVyeSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydqUXVlcnknXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ2pRdWVyeSddIDogbnVsbCksXG4gICAgUmVhY3QgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snUmVhY3QnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1JlYWN0J10gOiBudWxsKSxcbiAgICBSZWFjdFJvdXRlciA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSZWFjdFJvdXRlciddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUmVhY3RSb3V0ZXInXSA6IG51bGwpO1xuXG4vKipcbiAqIFBhcnNlcyBIVE1MIGFuZCByZXR1cm5zIFJlYWN0IGVsZW1lbnRzLlxuICovXG52YXIgSHRtbDJSZWFjdCA9IGZ1bmN0aW9uKGlucHV0SFRNTCkge1xuICB2YXIgc3RhdGUgPSB7XG4gICAgcGFyc2VkOiBudWxsXG4gIH07XG5cbiAgdmFyIHByaXYgPSB7fTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBOYW1lZE5vZGVNYXAgdG8gYSBwbGFpbiBvbGQgSlMgb2JqZWN0LlxuICAgKi9cbiAgcHJpdi5uYW1lZE5vZGVNYXBUb09iamVjdCA9IGZ1bmN0aW9uKG5ubSkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5ubS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBubm0uaXRlbShpKTtcbiAgICAgIG9ialthdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBzaW5nbGUgRE9NTm9kZSBpbnRvIGRhdGEgdG8gYmUgaGFuZGxlZCBieSB0aGUgUmVhY3QgY29udmVydGVyLlxuICAgKi9cbiAgcHJpdi5wYXJzZU5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT0gMSkge1xuICAgICAgdmFyIG91dCA9IHt9O1xuICAgICAgb3V0Lm5vZGVOYW1lID0gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgb3V0LmF0dHJpYnV0ZXMgPSBwcml2Lm5hbWVkTm9kZU1hcFRvT2JqZWN0KG5vZGUuYXR0cmlidXRlcyk7XG4gICAgICBvdXQuY2hpbGRyZW4gPSBbXS5zbGljZS5jYWxsKG5vZGUuY2hpbGROb2RlcykubWFwKGZ1bmN0aW9uKGNuKSB7XG4gICAgICAgIHJldHVybiBwcml2LnBhcnNlTm9kZShjbik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT0gMykge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dENvbnRlbnQ7XG4gICAgfVxuICAgIGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT0gOSkge1xuICAgICAgcmV0dXJuIHByaXYucGFyc2VOb2RlKG5vZGUuY2hpbGROb2Rlc1swXSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXNlcyB0aGUgY2xhc3MgYW5kIHBhcnNlcyB0aGUgc3VibWl0dGVkIEhUTUwuXG4gICAqL1xuICBwcml2LmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHdyYXBwZWQgPSAnPGRpdiBjbGFzcz1cImh0bWwycmVhY3QtcGFyc2VkXCI+JyArIGlucHV0SFRNTCArICc8L2Rpdj4nO1xuICAgICAgdmFyIGh0bWwgPSBqUXVlcnkucGFyc2VIVE1MKHdyYXBwZWQpO1xuICAgICAgc3RhdGUucGFyc2VkID0gcHJpdi5wYXJzZU5vZGUoaHRtbFswXSk7XG4gICAgfVxuICAgIGNhdGNoKGUpIHtcbiAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBzaW5nbGUgSFRNTCB0YWcgaW50byBhIFJlYWN0IGVsZW1lbnQuXG4gICAqXG4gICAqIFJlY3Vyc2l2ZWx5IGNhbGxzIGl0c2VsZiB0byBjb252ZXJ0IHRoZSBlbGVtZW50J3MgY2hpbGRyZW4uXG4gICAqL1xuICBwcml2LmVsZW1Ub1JlYWN0ID0gZnVuY3Rpb24oZWxlbSwgY2hhaW4pIHtcbiAgICBpZiAoIWNoYWluKSB7XG4gICAgICBjaGFpbiA9IFswXTtcbiAgICB9XG4gICAgaWYgKGpRdWVyeS5pc1BsYWluT2JqZWN0KGVsZW0pKSB7XG4gICAgICB2YXIgbm9kZU5hbWUgPSBlbGVtLm5vZGVOYW1lLFxuICAgICAgICAgIGF0dHJpYnV0ZXMgPSBlbGVtLmF0dHJpYnV0ZXM7XG4gICAgICBhdHRyaWJ1dGVzLmtleSA9IGNoYWluLmpvaW4oJy4nKTtcblxuICAgICAgLy8gSWYgd2UgaGF2ZSBhbiBpbnRlcm5hbCBsaW5rLFxuICAgICAgLy8gYW5kIHdlIGhhdmUgcmVhY3Qtcm91dGVyIGluIG91ciBwcm9qZWN0LFxuICAgICAgLy8gYWxsb3cgcmVhY3Qtcm91dGVyIHRvIHRha2UgaXQgb3Zlci5cbiAgICAgIGlmIChcbiAgICAgICAgbm9kZU5hbWUgPT09ICdhJyAmJlxuICAgICAgICBhdHRyaWJ1dGVzLmhyZWYuaW5kZXhPZignLycpID09PSAwICYmXG4gICAgICAgICEhUmVhY3RSb3V0ZXIgJiZcbiAgICAgICAgISFSZWFjdFJvdXRlci5MaW5rXG4gICAgICApIHtcbiAgICAgICAgbm9kZU5hbWUgPSBSZWFjdFJvdXRlci5MaW5rO1xuICAgICAgICBhdHRyaWJ1dGVzLnRvID0gYXR0cmlidXRlcy5ocmVmO1xuICAgICAgICBkZWxldGUgYXR0cmlidXRlcy5ocmVmO1xuICAgICAgfVxuXG4gICAgICBpZiAoZWxlbS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgbm9kZU5hbWUsXG4gICAgICAgICAgYXR0cmlidXRlcyxcbiAgICAgICAgICBlbGVtLmNoaWxkcmVuLm1hcChmdW5jdGlvbihjLCBpKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJpdi5lbGVtVG9SZWFjdChjLCBjaGFpbi5jb25jYXQoW2ldKSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICBub2RlTmFtZSxcbiAgICAgICAgICBhdHRyaWJ1dGVzXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuICB9O1xuXG4gIHZhciBwdWIgPSB7fTtcblxuICAvKipcbiAgICogU2F5cyB3aGV0aGVyIHRoZSBIVE1MIHN1Ym1pdHRlZCB3YXMgcGFyc2VkIHN1Y2Nlc3NmdWxseSBvciBub3QuXG4gICAqL1xuICBwdWIuc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzdGF0ZS5wYXJzZWQgIT09IG51bGw7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgUmVhY3QgZWxlbWVudHMgcGFyc2VkIGZyb20gdGhlIEhUTUwuXG4gICAqL1xuICBwdWIudG9SZWFjdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBwcml2LmVsZW1Ub1JlYWN0KHN0YXRlLnBhcnNlZCk7XG4gIH07XG5cbiAgcHJpdi5pbml0KCk7XG5cbiAgcmV0dXJuIHB1Yjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSHRtbDJSZWFjdDtcbiJdfQ==
