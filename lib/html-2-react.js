/**
 * @file
 * HTML to React converter.
 */

var jQuery = require('jquery'),
    React = require('react'),
    ReactRouter = require('react-router');

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
