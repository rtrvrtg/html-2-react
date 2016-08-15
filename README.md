# html-2-react

[![npm version](https://badge.fury.io/js/html-2-react.svg)](https://badge.fury.io/js/html-2-react)

Converts HTML to React elements.

Designed to work within the browser, but should work anywhere.

## Dependencies

* React (of course)
* jQuery (for parsing the HTML)
* Gulp (for development only)
* React Router (when using the React Router mutator)

## Usage

Here's an example React class that takes the `htmlcontent` property, and demonstrates parsing in context.

```jsx
var Html2React = require('html-2-react');

var MyComponent = React.createClass({
  render: function() {
    var parsed = new Html2React(this.props.htmlcontent),
        reactElems = [];
    if (parsed.success()) {
      reactElems = parsed.toReact();
    }
    return (
      <div>
        {reactElems}
      </div>
    );
  }
});
```

### Usage within browsers

If you use the distribution version of this library from `dist/html-2-react.js`, and don't want to have to build your app using Browserify or Webpack or whatever, you can use the `window.html2React` or `html2React` function instead of using the `require` statement above. The equivalent is as follows:

```jsx
var MyComponent = React.createClass({
  render: function() {
    var parsed = new html2React(this.props.htmlcontent),
        reactElems = [];
    if (parsed.success()) {
      reactElems = parsed.toReact();
    }
    return (
      <div>
        {reactElems}
      </div>
    );
  }
});
```

### Mutating elements before converting to React

Before you convert your markup to React elements, it may be useful to mutate some of the elements along the way. To this end, there's a function exposed on Html2React named `mutateEach`, which will run a function across every element in the parsed tree.

Below, we have an example that uses the built-in `reactRouterLink` mutator, which converts `<a>` tags to React Router Link elements.

```jsx
var parsed = new html2React(this.props.htmlcontent),
    reactElems = [];
if (parsed.success()) {
  parsed.mutateEach(parsed.mutators.reactRouterLink);
  reactElems = parsed.toReact();
}
```

Writing your own mutator is pretty easy. You'd define one and run it like so:

```jsx
function myMutator(elem) {
  if (this.isDomNode(elem)) {
    if (elem.nodeName == 'strong') {
      if (!elem.attributes) {
        elem.attributes = {};
      }
      if (!elem.attributes.className) {
        elem.attributes.className = 'beefy';
      }
      else {
        elem.attributes.className += ' bold';
      }
    }
  }
}

var parsed = new html2React(this.props.htmlcontent),
    reactElems = [];
if (parsed.success()) {
  parsed.mutateEach(myMutator);
  reactElems = parsed.toReact();
}
```

See how you can call `isDomNode` to determine if a current element is a valid element, before checking against its `nodeName`?

Whenever you're using a mutator, and are working with a valid DomNode, you can mutate the following properties:

* `nodeName`
* `attributes`
* `children`

If you just have a string, you're dealing with a text node.

### Options

* `useDefaultMutators`  
  html-2-react comes with a set of default mutators that helps automatically transform elements into a more React-friendly form. If set to `true`, these mutators are run when the elements are first parsed.  
  Default: `true`

## Build instructions

`gulp dist`

## @TODO

* Filtering of dangerous tags such as `<script>`
* Write some tests!
* Write some examples, especially backend ones!

## See also

* [react-render-html](https://github.com/noraesae/react-render-html)
