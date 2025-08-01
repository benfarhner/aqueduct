# aqueduct
A barebones single-page application router. Only **2,443 bytes**!

## Quick start
1. Instantiate Aqueduct:
```
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
2. Initialize Aqueduct once the DOM has loaded:
```
window.addEventListener('load', aqueduct.init);
```

## Configuration
The Aqueduct constructor takes a `config` object with the following properties:

| Property      | Type       | Required? | Value                            |
| ------------- | ---------- | --------- | -------------------------------- |
| `root`        | `string`   | Yes       | CSS selector for root element    |
| `routes`      | `object[]` | No        | List of route objects            |
| `injectables` | `object`   | No        | Dictionary of injectable objects |

If `routes` is not provided, no routes will be available to load.

If `injectables` is provided, then the `injectables` object will be passed as a parameter to the constructor of any route `component` classes that are instantiated. This is a simplistic dependency injection to provide components access to common services without using the global scope.

### Route objects

Route objects define the paths, views, and components that each route should use. Aqueduct only supports single-level routing. Route matching is simplistic and prioritizes a perfect match first, followed by the route path with the most "path parts;" that is, when finding a match for `/foo/bar/baz`, the route path `/foo/bar` will take priority over `/foo`.

| Property    | Type     | Required? | Value |
| ----------- | -------- | --------- | ----- |
| `path`      | `string` | Yes       | Absolute path to the route |
| `view`      | `string` | No        | Absolute path to the route view HTML file |
| `component` | `class`  | No        | Route component class |

If `view` is not provided, it will attempt to load the view file as `{path}.html`.

If `component` is provided, then an instance of the `component` class will be instantiated when the route loads, and deleted when the route unloads. It must be a class (or a `function` class) that can be instantiated, and can optionally implement the following public interface:

| Function   | Usage |
| ---------- | ----- |
| `init()`   | Called when route is loaded after component is instantiated. May optionally be `async`. |
| `uninit()` | Called when route is unloaded before component instance is deleted. May optionally be `async`. |

## Notes
* Minified with `npx uglify-js aqueduct.js -c -m -o aqueduct.min.js`
