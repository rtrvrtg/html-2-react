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
    }
  }
};

module.exports = defaultMutators;
