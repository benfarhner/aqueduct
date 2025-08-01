/** @module */

/**
 * @class
 * Implements a barebones single-page application with single-level routing
 * and route component support for business logic.
 */

export default class Aqueduct {
  /**
   * @private
   * @type {object}
   * Configuration object.
   */
  #config;

  /**
   * @private
   * @type {object}
   * The currently loaded route object.
   */
  #currentRoute;

  /**
   * @private
   * @type {object}
   * Dictionary of objects to inject into component constructors.
   */
  #injectables;

  /**
   * @private
   * @type {string}
   * Selector for the HTML element where route contents should be rendered.
   */
  #root;

  /**
   * @private
   * @type {object[]}
   * List of route objects
   */
  #routes;

  /**
   * @constructor
   * @param {object} config SPA configuration
   */
  constructor(config) {
    this.#config = config;
    this.#routes = config.routes ?? [];
    this.#injectables = config.injectables ?? {};

    if (this.#routes.length === 0) {
      console.warn('No routes provided');
    }

    // Sanitize all provided route paths
    this.#routes.forEach(i => i.path = this.#sanitizeRoutePath(i.path));

    // Initialize once the DOM has loaded
    window.addEventListener('load', this.init.bind(this));
  }

  /**
   * @private @function #sanitizeRoutePath
   * Sanitizes the given route path to prepare it for matching.
   * @param {string} routePath Route path to sanitize
   * @returns {string} Sanitized route path
   */
  #sanitizeRoutePath(routePath) {
    // Remove leading or trailing whitespace
    var sanitizedRoutePath = routePath?.trim() ?? '';

    // Add leading slash
    if (!sanitizedRoutePath.startsWith('/')) {
      sanitizedRoutePath = '/' + sanitizedRoutePath;
    }

    return sanitizedRoutePath;
  }

  /**
   * @private @function #matchRoute
   * Finds a matching route object for the given route path. Will throw an
   * exception if no match is found.
   * @param {string} routePath Route path to match
   * @returns {object} Matching route object
   * @throws No route found for path
   */
  #matchRoute(routePath) {
    // Sanitize the route path before matching
    const sanitizedRoutePath = this.#sanitizeRoutePath(routePath);

    // Find all routes that match the given path
    let matches = [];

    for (const route of this.#routes) {
      // Immediately return an exact match
      if (sanitizedRoutePath === route.path) {
        return route;
      }

      // Given route path must at least start with the defined route path. This
      // allows for more specific paths to fall under the parent.
      if (sanitizedRoutePath.startsWith(route.path)) {
        // Count the number of path parts for this match
        // Filtering out zero-length parts also deprioritizes the root
        let count = route.path.split('/').filter(i => i.length > 0).length;
        matches.push({ route, count });
      }
    }

    // Make sure there's at least 1 match
    if (matches.length === 0) {
      throw new Error(`No route found for path "${routePath}"`);
    }

    // If there's only 1 match, return it directly to improve performance
    if (matches.length === 1) {
      return matches[0].route;
    }

    // Find the route with the highest number of path parts, which should be the
    // most specific route match. This is a simplistic approach.
    return matches.sort((a, b) => b.count - a.count)[0].route;
  }

  /**
   * @private @function #loadRoute
   * Loads the route with the given path.
   * @param {string} routePath Route path to load
   * @returns {Promise}
   */
  async #loadRoute(routePath) {
    try {
      // Find a matching route object for the route path
      // If there's no match, an exception will be thrown and caught below
      const routeMatch = this.#matchRoute(routePath);

      // Dynamically load the route's view from the route's file path
      let viewPath = routeMatch.view ?? `${routeMatch.path}.html`;
      const response = await fetch(viewPath);

      if (!response.ok) {
        throw new Error(`Error loading route view for path "${routeMatch.path}": ${response.status} ${response.statusText}`);
      }

      // Inject the route view's contents as HTML in the root element
      this.#root.innerHTML = await response.text();

      // Unload current route component
      const previousRoute = this.#currentRoute;

      if (this.#currentRoute?.componentInstance) {
        if (this.#currentRoute.componentInstance.uninit) {
          await this.#currentRoute.componentInstance.uninit
            .bind(this.#currentRoute.componentInstance)();
        }

        // Free up memory
        delete this.#currentRoute.componentInstance;
      }

      // Load new route component
      this.#currentRoute = routeMatch;

      if (this.#currentRoute?.component) {
        // Construct a new instance of the route component
        this.#currentRoute.componentInstance =
          new this.#currentRoute.component(this.#injectables);

        if (this.#currentRoute.componentInstance.init) {
          await this.#currentRoute.componentInstance.init
            .bind(this.#currentRoute.componentInstance)();
        }
      }

      // Find all of the links that begin with `/` and plug them into the router
      this.#root.querySelectorAll('[href^="/"]').forEach(link => 
        link.addEventListener('click', async event => {
          event.preventDefault();
          await this.routeTo(new URL(event.target.href).pathname);
        })
      );
    
      // Dispatch a new event to indicate the route has changed
      window.dispatchEvent(new RouteChangedEvent(previousRoute,
        this.#currentRoute));
    } catch (e) {
      const errorMessage = `Failed to load route for path "${routePath}": ${e}`;
      console.error(errorMessage);
      this.#root.innerHTML = `<h1>Error</h1><p>${errorMessage}</p>`;
    }
  }

  /**
   * @function init
   * Initializes the single-page application. Should be called after document
   * loads, e.g.
   * `window.addEventListener('load', spa.init);`
   * @returns {Promise}
   */
  async init() {
    // Reference the root element
    this.#root = document.querySelector(this.#config.root);

    if (!this.#root) {
      console.error('Missing root element');
    }
    
    // Load route whenever the URL hash changes
    window.addEventListener('popstate', async () => {
      const routePath = new URL(window.location.href).pathname;
      await this.#loadRoute(routePath);
    });

    // Register global handler for easy routing
    window.routeTo = this.routeTo.bind(this);

    // Load current route
    await this.routeTo(new URL(window.location.href).pathname);
  }

  /**
   * Navigates to the given route path.
   * @param {string} routePath New route path
   */
  async routeTo(routePath) {
    const sanitizedRoutePath = this.#sanitizeRoutePath(routePath);
    window.history.pushState({}, "", sanitizedRoutePath);
    await this.#loadRoute(sanitizedRoutePath);
  }
}

/**
 * @class
 * An Event called when the route changes. Contains information about the
 * previous route and the new current route.
 * @property {object} previousRoute Previous route object
 * @property {object} currentRoute Current route object
 */
export class RouteChangedEvent extends Event {
  /**
   * @constructor
   * @param {object} previousRoute Previous route object
   * @param {object} currentRoute Current route object
   */
  constructor(previousRoute, currentRoute) {
    super('routeChanged');
    this.previousRoute = previousRoute;
    this.currentRoute = currentRoute;
  }
}
