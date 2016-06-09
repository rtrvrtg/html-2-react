# html-2-react

Converts HTML to React elements.

## Dependencies

* React (of course)
* jQuery (for parsing the HTML)

## Usage

Here's an example React class that takes the `htmlcontent` property, and demonstrates parsing in context.

```jsx
var MyComponent = React.createClass({
  render: function() {
    var parsed = new Html2React(htmlText),
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

# @TODO

* Allow selective enabling of ReactRouter link support
* Filtering of dangerous tags such as `<script>`
