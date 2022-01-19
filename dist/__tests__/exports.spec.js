"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fastifyPlugin = require("../index");
(0, globals_1.describe)('exports plugin', () => {
    (0, globals_1.test)('fastify plugin exported', async () => {
        (0, globals_1.expect)(fastifyPlugin).toBeDefined();
    });
});
//# sourceMappingURL=exports.spec.js.map