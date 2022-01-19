"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fastify_1 = __importDefault(require("fastify"));
const fastifyPlugin = require("../index");
const app = (0, fastify_1.default)();
// Add a couple of routes to test
app.get('/test', async () => {
    return 'get test';
});
const METHOD_LABEL = 'http_method';
const ROUTE_LABEL = 'path';
const STATUS_LABEL = 'status_class';
(0, globals_1.beforeAll)(async () => {
    await app.register(fastifyPlugin, {
        endpoint: '/metrics',
        labelOverrides: {
            method: METHOD_LABEL,
            route: ROUTE_LABEL,
            status: STATUS_LABEL,
        },
    });
    await app.ready();
});
(0, globals_1.afterAll)(async () => {
    await app.close();
});
(0, globals_1.describe)('metrics plugin', () => {
    (0, globals_1.afterEach)(async () => {
        // Reset metrics after each test
        app.metrics.client.register.resetMetrics();
    });
    (0, globals_1.test)('should allow for labels to be overridden', async () => {
        await app.inject({
            method: 'GET',
            url: '/test',
        });
        const metrics = await app.inject({
            method: 'GET',
            url: '/metrics',
        });
        (0, globals_1.expect)(metrics.payload).toContain('# HELP http_request_duration_seconds request duration in seconds');
        (0, globals_1.expect)(metrics.payload).toContain('# TYPE http_request_duration_seconds histogram');
        (0, globals_1.expect)(metrics.payload).toContain(`http_request_duration_seconds_bucket{le="0.05",${METHOD_LABEL}="GET",${ROUTE_LABEL}="/test",${STATUS_LABEL}="200"}`);
        (0, globals_1.expect)(metrics.payload).toContain(`http_request_duration_seconds_sum{${METHOD_LABEL}="GET",${ROUTE_LABEL}="/test",${STATUS_LABEL}="200"}`);
        (0, globals_1.expect)(metrics.payload).toContain(`http_request_duration_seconds_count{${METHOD_LABEL}="GET",${ROUTE_LABEL}="/test",${STATUS_LABEL}="200"}`);
        (0, globals_1.expect)(metrics.payload).toContain('# HELP http_request_summary_seconds request duration in seconds summary');
        (0, globals_1.expect)(metrics.payload).toContain('# TYPE http_request_summary_seconds summary');
        (0, globals_1.expect)(metrics.payload).toContain(`http_request_summary_seconds{quantile="0.5",${METHOD_LABEL}="GET",${ROUTE_LABEL}="/test",${STATUS_LABEL}="200"`);
        (0, globals_1.expect)(metrics.payload).toContain(`http_request_summary_seconds{quantile="0.5",${METHOD_LABEL}="GET",${ROUTE_LABEL}="/test",${STATUS_LABEL}="200"`);
    });
});
//# sourceMappingURL=metrics_overridden_labels.spec.js.map