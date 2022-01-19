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
app.post('/test', async () => {
    return 'post test';
});
(0, globals_1.beforeAll)(async () => {
    await app.register(fastifyPlugin, {
        endpoint: '/metrics',
        invalidRouteGroup: 'INVALID_GROUP',
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
    (0, globals_1.test)('should register default metrics', async () => {
        await app.inject({
            method: 'GET',
            url: '/test',
        });
        await app.inject({
            method: 'POST',
            url: '/test',
        });
        const metrics = await app.inject({
            method: 'GET',
            url: '/metrics',
        });
        (0, globals_1.expect)(metrics.payload).toContain('# HELP http_request_duration_seconds request duration in seconds');
        (0, globals_1.expect)(metrics.payload).toContain('# TYPE http_request_duration_seconds histogram');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_duration_seconds_bucket{le="0.05",method="GET",route="/test",status_code="200"}');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_duration_seconds_sum{method="GET",route="/test",status_code="200"}');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_duration_seconds_count{method="GET",route="/test",status_code="200"}');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_duration_seconds_bucket{le="0.05",method="POST",route="/test",status_code="200"}');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_duration_seconds_sum{method="POST",route="/test",status_code="200"}');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_duration_seconds_count{method="POST",route="/test",status_code="200"}');
        (0, globals_1.expect)(metrics.payload).toContain('# HELP http_request_summary_seconds request duration in seconds summary');
        (0, globals_1.expect)(metrics.payload).toContain('# TYPE http_request_summary_seconds summary');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_summary_seconds{quantile="0.5",method="GET",route="/test",status_code="200"');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_summary_seconds{quantile="0.5",method="GET",route="/test",status_code="200"');
    });
    (0, globals_1.test)('should group unrecognised routes', async () => {
        await app.inject({
            method: 'GET',
            url: '/not-exists',
        });
        await app.inject({
            method: 'GET',
            url: '/not-exists-2',
        });
        const metrics = await app.inject({
            method: 'GET',
            url: '/metrics',
        });
        (0, globals_1.expect)(metrics.payload).toContain('# HELP http_request_duration_seconds request duration in seconds');
        (0, globals_1.expect)(metrics.payload).toContain('# TYPE http_request_duration_seconds histogram');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_duration_seconds_bucket{le="0.05",method="GET",route="INVALID_GROUP",status_code="404"}');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_duration_seconds_sum{method="GET",route="INVALID_GROUP",status_code="404"}');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_duration_seconds_count{method="GET",route="INVALID_GROUP",status_code="404"}');
        (0, globals_1.expect)(metrics.payload).toContain('# HELP http_request_summary_seconds request duration in seconds summary');
        (0, globals_1.expect)(metrics.payload).toContain('# TYPE http_request_summary_seconds summary');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_summary_seconds{quantile="0.5",method="GET",route="INVALID_GROUP",status_code="404"');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_summary_seconds{quantile="0.5",method="GET",route="INVALID_GROUP",status_code="404"');
        (0, globals_1.expect)(metrics.payload).toContain('http_request_summary_seconds_count{method="GET",route="INVALID_GROUP",status_code="404"} 2');
    });
});
//# sourceMappingURL=group_invalid_routes_metrics.spec.js.map