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
