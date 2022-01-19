/// <reference types="node" />
import { FastifyPluginAsync } from 'fastify';
import { LabelValues } from 'prom-client';
import { FastifyMetrics, PluginOptions } from './plugin';
declare module 'fastify' {
    interface FastifyInstance {
        /**
         * Metrics interface
         */
        metrics: FastifyMetrics;
    }
    interface FastifySchema {
        /**
         * Hides metric route from swagger/openapi documentation
         */
        hide?: boolean;
    }
    interface FastifyRequest {
        metrics?: {
            /**
             * Request duration histogram
             * @param labels metric labels
             */
            hist: (labels?: LabelValues<string>) => void;
            /**
             * Request duration summary by quantiles
             * @param labels metric labels
             */
            sum: (labels?: LabelValues<string>) => void;
        };
    }
}
declare const _default: FastifyPluginAsync<PluginOptions, import("http").Server>;
export = _default;
//# sourceMappingURL=index.d.ts.map