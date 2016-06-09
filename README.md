# html-2-react

Converts HTML to React elements.

Designed to work within the browser, but should work anywhere.

## Dependencies

* React (of course)
* jQuery (for parsing the HTML)
* Gulp (for development only)

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

## Build instructions

`gulp dist`

## @TODO

* Allow selective enabling of ReactRouter link support
* Filtering of dangerous tags such as `<script>`
* Write some tests!
* Write some examples, especially backend ones!

## See also

* [react-render-html](https://github.com/noraesae/react-render-html)
