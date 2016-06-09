/**
 * @file
 * HTML to React converter.
 */

var Html2React = function(inputHTML) {
  var state = {
    parsed: null
  };

  var priv = {};

  priv.namedNodeMapToObject = function(nnm) {
    var obj = {};
    for (var i = 0; i < nnm.length; i++) {
      var attr = nnm.item(i);
      obj[attr.name] = attr.value;
    }
    return obj;
  };

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

  pub.success = function() {
    return state.parsed !== null;
  };

  pub.toReact = function() {
    return priv.elemToReact(state.parsed);
  };

  priv.init();

  return pub;
};

module.exports = Html2React;
