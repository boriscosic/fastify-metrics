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
(0, globals_1.beforeAll)(async () => {
    await app.register(fastifyPlugin, {
        endpoint: '/metrics',
        enableRouteMetrics: true,
        ignoreHeadRequests: true,
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
    (0, globals_1.test)('should not register route metrics when enableRouteMetrics is false', async () => {
        await app.inject({
            method: 'HEAD',
            url: '/test',
        });
        await app.inject({
            method: 'head',
            url: '/test',
        });
        const metrics = await app.inject({
            method: 'GET',
            url: '/metrics',
        });
        (0, globals_1.expect)(metrics.payload).toContain('');
    });
});
//# sourceMappingURL=ignore-head-requests.spec.js.map