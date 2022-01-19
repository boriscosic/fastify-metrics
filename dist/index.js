"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const prom_client_1 = __importDefault(require("prom-client"));
/**
 * Fastify metrics plugin
 * @param {FastifyInstance} fastify - Fastify instance
 */
const fastifyMetricsPlugin = async function fastifyMetrics(fastify, { enableDefaultMetrics = true, enableRouteMetrics = true, groupStatusCodes = false, ignoreHeadRequests = false, pluginName = 'metrics', invalidRouteGroup, blacklist, register, prefix, endpoint, metrics = {}, labelOverrides = {}, } = {}) {
    const plugin = {
        client: prom_client_1.default,
        clearRegister: function () {
            // dummy fn;
        },
    };
    const defaultOpts = {};
    if (register) {
        plugin.clearRegister = () => {
            register.clear();
        };
        defaultOpts.register = register;
    }
    if (prefix) {
        defaultOpts.prefix = prefix;
    }
    if (enableDefaultMetrics) {
        prom_client_1.default.collectDefaultMetrics(defaultOpts);
    }
    const labelNames = {
        method: (labelOverrides === null || labelOverrides === void 0 ? void 0 : labelOverrides.method) ? labelOverrides === null || labelOverrides === void 0 ? void 0 : labelOverrides.method : 'method',
        status: (labelOverrides === null || labelOverrides === void 0 ? void 0 : labelOverrides.status) ? labelOverrides === null || labelOverrides === void 0 ? void 0 : labelOverrides.status : 'status_code',
        route: (labelOverrides === null || labelOverrides === void 0 ? void 0 : labelOverrides.route) ? labelOverrides === null || labelOverrides === void 0 ? void 0 : labelOverrides.route : 'route',
        operation: (labelOverrides === null || labelOverrides === void 0 ? void 0 : labelOverrides.operation) ? labelOverrides === null || labelOverrides === void 0 ? void 0 : labelOverrides.operation : 'operation',
    };
    if (enableRouteMetrics) {
        const collectMetricsForUrl = (url) => {
            const queryIndex = url.indexOf('?');
            url = queryIndex === -1 ? url : url.substring(0, queryIndex);
            if (!blacklist) {
                return true;
            }
            if (Array.isArray(blacklist)) {
                return blacklist.indexOf(url) === -1;
            }
            if (typeof blacklist === 'string') {
                return blacklist !== url;
            }
            if (typeof blacklist.test === 'function') {
                return !blacklist.test(url);
            }
            return false;
        };
        const opts = {
            histogram: {
                name: 'http_request_duration_seconds',
                help: 'request duration in seconds',
                labelNames: [labelNames.status, labelNames.method, labelNames.route, labelNames.operation],
                buckets: [0.05, 0.1, 0.5, 1, 3, 5, 10],
                ...metrics.histogram,
            },
            summary: {
                name: 'http_request_summary_seconds',
                help: 'request duration in seconds summary',
                labelNames: [labelNames.status, labelNames.method, labelNames.route, labelNames.operation],
                percentiles: [0.5, 0.9, 0.95, 0.99],
                ...metrics.summary,
            },
        };
        if (register) {
            opts.histogram.registers = [register];
            opts.summary.registers = [register];
        }
        if (prefix) {
            opts.histogram.name = `${prefix}${opts.histogram.name}`;
            opts.summary.name = `${prefix}${opts.summary.name}`;
        }
        const routeHist = new prom_client_1.default.Histogram(opts.histogram);
        const routeSum = new prom_client_1.default.Summary(opts.summary);
        fastify.addHook('onRequest', (request, _, next) => {
            if (ignoreHeadRequests === true &&
                request.method.toLowerCase() === 'head') {
                next();
                return;
            }
            if (!request.raw.url || !collectMetricsForUrl(request.raw.url)) {
                next();
                return;
            }
            request.metrics = {
                hist: routeHist.startTimer(),
                sum: routeSum.startTimer(),
            };
            next();
        });
        fastify.addHook('onResponse', function (request, reply, next) {
            if (request.metrics) {
                const context = reply.context;
                const routeId = context.config.statsId ||
                    context.config.url ||
                    invalidRouteGroup ||
                    request.raw.url;
                const method = request.raw.method;
                const statusCode = groupStatusCodes
                    ? `${Math.floor(reply.raw.statusCode / 100)}xx`
                    : reply.raw.statusCode;
                const labels = {
                    [labelNames.method]: method,
                    [labelNames.route]: routeId,
                    [labelNames.status]: statusCode
                };
                if (request.query.operation) {
                    labels.operation = request.query.operation;
                }
                request.metrics.sum(labels);
                request.metrics.hist(labels);
            }
            next();
        });
    }
    if (endpoint) {
        fastify.route({
            url: endpoint,
            method: 'GET',
            logLevel: 'fatal',
            schema: {
                // hide route from swagger plugins
                hide: true,
            },
            handler: async (_, reply) => {
                const data = register
                    ? register.metrics()
                    : prom_client_1.default.register.metrics();
                void reply.type('text/plain').send(await data);
            },
        });
    }
    fastify.decorate(pluginName, plugin);
};
module.exports = (0, fastify_plugin_1.default)(fastifyMetricsPlugin, {
    fastify: '>=3.0.0',
    name: 'fastify-metrics',
});
//# sourceMappingURL=index.js.map