# aqueduct
A barebones vanilla JavaScript single-page application router. Only **2,358 bytes***!

_* When minified with `npx uglify-js aqueduct.js -c -m -o aqueduct.min.js`_

## Quick start

1. Import Aqueduct

**Note** Aqueduct is built as an ECMAScript (ES) module. It can be imported into another module like this:

```javascript
import Aqueduct from './aqueduct.min.js';
```

Or it can be imported directly into the HTML document like this:

```html
<script type="module" src="aqueduct.min.js"></script>
```

2. Instantiate Aqueduct:

```javascript
const aqueduct = new Aqueduct({
  root: '#root',
  routes: [
    {
      path: '/',
      view: '/app.html'
    }
  ],
});
```

**That's it!** 🎉

## Configuration
The Aqueduct constructor takes a `config` object with the following properties:

| Property      | Type       | Required? | Value                            |
| ------------- | ---------- | --------- | -------------------------------- |
| `root`        | `string`   | No        | CSS selector for root element    |
| `routes`      | `object[]` | No        | List of route objects            |
| `injectables` | `object`   | No        | Dictionary of injectable objects |

If `root` is not provided or can't be found, Aqueduct will fall back to the `<body>` element.

If `routes` is not provided or is empty, no routes will be available to load.

If `injectables` is provided, then the `injectables` object will be passed as a parameter to the constructor of any route `component` classes that are instantiated. This is a simplistic dependency injection to provide components access to common services without using the global scope.

### Route objects

Route objects define the paths, views, and components that each route should use. Aqueduct only supports single-level routing. Route matching is simplistic and prioritizes a perfect match first, followed by the route path with the most "path parts;" that is, when finding a match for `/foo/bar/baz`, the route path `/foo/bar` will take priority over `/foo`.

| Property    | Type     | Required? | Value                                     |
| ----------- | -------- | --------- | ----------------------------------------- |
| `path`      | `string` | Yes       | Absolute path to the route                |
| `view`      | `string` | No        | Absolute path to the route view HTML file |
| `component` | `class`  | No        | Route component class                     |

The `path` should always start with a forward slash. The root path should be `'/'`. Aqueduct will attempt to sanitize your paths for consistency.

The `view` path should always start with a forward slash. If `view` is not provided, it will attempt to load the view file as `{path}.html`.

If `component` is provided, then an instance of the `component` class will be instantiated when the route loads, and deleted when the route unloads.

### Component classes

If a route object specifies a component class, it must be a `class` (or a `function` class) that can be instantiated with a constructor, and can optionally implement the following public interface:

| Function   | Usage                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `init()`   | Called when route is loaded after component is instantiated. May optionally be `async`.        |
| `uninit()` | Called when route is unloaded before component instance is deleted. May optionally be `async`. |

The component is responsible for any DOM manipulation, data loading, etc. For example, the component class may load JSON data from a server when its `init()` function is called, and update a `<p>` element in the view with a new value from that JSON data.

### `RouteChangedEvent`

Aqueduct dispatches a `RouteChangedEvent` whenever the route changes. This is a subclass of `Event` with the event name `routeChanged` and the following properties:

| Property        | Type     | Value                                     |
| --------------- | -------- | ----------------------------------------- |
| `previousRoute` | `object` | Route object for the previous route       |
| `currentRoute`  | `object` | Route object for the current route        |

The application can listen for this event to perform logic whenever the route changes like this:

```javascript
window.addEventListener('routeChanged', (routeChangedEvent) => {
  if (routeChangedEvent.previousRoute.path === '/') {
    // Perform some action
  }
});
```
