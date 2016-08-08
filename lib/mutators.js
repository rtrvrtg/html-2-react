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
