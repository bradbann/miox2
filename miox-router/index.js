/**
 * Created by evio on 16/7/21.
 */
'use strict';

import compose from '../miox/src/compose';
import Layer from './layer';
const methods = ['patch'];

export default class Router {
    constructor(opts){
        if (!(this instanceof Router)) {
            return new Router(opts);
        }
        this.opts = opts || {};
        this.methods = this.opts.methods || ['PATCH'];
        this.params = {};
        this.stack = [];
    }

    patch(name, path){
        let middleware;

        if (typeof path === 'string' || path instanceof RegExp) {
            middleware = Array.prototype.slice.call(arguments, 2);
        } else {
            middleware = Array.prototype.slice.call(arguments, 1);
            path = name;
            name = null;
        }

        this.register(path, ['patch'], middleware, {
            name: name
        });

        return this;
    }

    use(){
        let router = this;
        let middleware = Array.prototype.slice.call(arguments);
        let path = '(.*)';

        // support array of paths
        if (Array.isArray(middleware[0]) && typeof middleware[0][0] === 'string') {
            middleware[0].forEach(function (p) {
                router.use.apply(router, [p].concat(middleware.slice(1)));
            });

            return this;
        }

        if (typeof middleware[0] === 'string') {
            path = middleware.shift();
        }

        middleware.forEach(function (m) {
            if (m.router) {
                m.router.stack.forEach(function (nestedLayer) {
                    if (path) nestedLayer.setPrefix(path);
                    if (router.opts.prefix) nestedLayer.setPrefix(router.opts.prefix);
                    router.stack.push(nestedLayer);
                });

                if (router.params) {
                    Object.keys(router.params).forEach(function (key) {
                        m.router.param(key, router.params[key]);
                    });
                }
            } else {
                router.register(path, [], m, { end: false });
            }
        });

        return this;
    }

    prefix(prefix){
        prefix = prefix.replace(/\/$/, '');

        this.opts.prefix = prefix;

        this.stack.forEach(function (route) {
            route.setPrefix(prefix);
        });

        return this;
    }

    routes(){
        let router = this;

        let dispatch = function dispatch(ctx, next) {
            let path = router.opts.routerPath || ctx.routerPath || ctx.req.pathname;
            let matched = router.match(path, ctx.method);
            let layerChain;

            if (ctx.matched) {
                ctx.matched.push.apply(ctx.matched, matched.path);
            } else {
                ctx.matched = matched.path;
            }

            if (!matched.route) return next();

            layerChain = matched.pathAndMethod.reduce(function(memo, layer) {
                memo.push(function(ctx, next) {
                    ctx.captures = layer.captures(path, ctx.captures);
                    ctx.params = layer.params(path, ctx.captures, ctx.params);
                    return next();
                });
                return memo.concat(layer.stack);
            }, []);

            return compose(layerChain)(ctx, next);
        };

        dispatch.router = this;

        return dispatch;
    }

    all(name, path, middleware){
        var middleware;

        if (typeof path === 'string') {
            middleware = Array.prototype.slice.call(arguments, 2);
        } else {
            middleware = Array.prototype.slice.call(arguments, 1);
            path = name;
            name = null;
        }

        this.register(path, methods, middleware, {
            name: name
        });

        return this;
    }

    register(path, methods, middleware, opts){
        opts = opts || {};

        var router = this;
        var stack = this.stack;

        // support array of paths
        if (Array.isArray(path)) {
            path.forEach(function (p) {
                router.register.call(router, p, methods, middleware, opts);
            });

            return this;
        }

        // create route
        var route = new Layer(path, methods, middleware, {
            end: opts.end === false ? opts.end : true,
            name: opts.name,
            sensitive: opts.sensitive || this.opts.sensitive || false,
            strict: opts.strict || this.opts.strict || false,
            prefix: opts.prefix || this.opts.prefix || ""
        });

        if (this.opts.prefix) {
            route.setPrefix(this.opts.prefix);
        }

        // add parameter middleware
        Object.keys(this.params).forEach(function (param) {
            route.param(param, this.params[param]);
        }, this);

        stack.push(route);

        return route;
    }

    route(name){
        var routes = this.stack;

        for (var len = routes.length, i=0; i<len; i++) {
            if (routes[i].name && routes[i].name === name) {
                return routes[i];
            }
        }

        return false;
    }

    url(name, params){
        var route = this.route(name);

        if (route) {
            var args = Array.prototype.slice.call(arguments, 1);
            return route.url.apply(route, args);
        }

        return new Error("No route found for name: " + name);
    }

    match(path, method){
        var layers = this.stack;
        var layer;
        var matched = {
            path: [],
            pathAndMethod: [],
            route: false
        };

        for (var len = layers.length, i = 0; i < len; i++) {
            layer = layers[i];

            if (layer.match(path)) {
                matched.path.push(layer);
                if (layer.methods.length === 0 || !~layer.methods.indexOf(method)) {
                    matched.pathAndMethod.push(layer);
                    if (layer.methods.length) matched.route = true;
                }
            }
        }

        return matched;
    }

    param(param, middleware){
        this.params[param] = middleware;
        this.stack.forEach(function (route) {
            route.param(param, middleware);
        });
        return this;
    }

    static url(path, params){
        return Layer.prototype.url.call({path: path}, params);
    }
}