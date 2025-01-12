import { FastifyContext, FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import client, { LabelValues } from 'prom-client';
import {
  FastifyMetrics,
  MetricConfig,
  MetricsContextConfig,
  PluginOptions,
} from './plugin';

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
    hide?: boolean; // for compatibility with fastify-oas
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

/**
 * Fastify metrics plugin
 * @param {FastifyInstance} fastify - Fastify instance
 */
const fastifyMetricsPlugin: FastifyPluginAsync<PluginOptions> =
  async function fastifyMetrics(
    fastify: FastifyInstance,
    {
      enableDefaultMetrics = true,
      enableRouteMetrics = true,
      groupStatusCodes = false,
      ignoreHeadRequests = false,
      pluginName = 'metrics',
      invalidRouteGroup,
      blacklist,
      register,
      prefix,
      endpoint,
      metrics = {},
      labelOverrides = {},
    }: PluginOptions = {}
  ) {
    const plugin: FastifyMetrics = {
      client,
      clearRegister: function () {
        // dummy fn;
      },
    };
    const defaultOpts: client.DefaultMetricsCollectorConfiguration = {};

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
      client.collectDefaultMetrics(defaultOpts);
    }

    const labelNames = {
      method: labelOverrides?.method ? labelOverrides?.method : 'method',
      status: labelOverrides?.status ? labelOverrides?.status : 'status_code',
      route: labelOverrides?.route ? labelOverrides?.route : 'route',
      operation: labelOverrides?.operation ? labelOverrides?.operation : 'operation',
    };

    if (enableRouteMetrics) {
      const collectMetricsForUrl = (url: string) => {
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

      const opts: MetricConfig = {
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

      const routeHist = new client.Histogram(opts.histogram);
      const routeSum = new client.Summary(opts.summary);

      fastify.addHook('onRequest', (request, _, next) => {
        if (
          ignoreHeadRequests === true &&
          request.method.toLowerCase() === 'head'
        ) {
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
          const context: FastifyContext<MetricsContextConfig> =
            reply.context as FastifyContext<MetricsContextConfig>;
          const routeId =
            context.config.statsId ||
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

          if ((request as any).query.operation) {
            labels.operation = (request as any).query.operation;
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
            : client.register.metrics();

          void reply.type('text/plain').send(await data);
        },
      });
    }

    fastify.decorate(pluginName, plugin);
  };

export = fastifyPlugin(fastifyMetricsPlugin, {
  fastify: '>=3.0.0',
  name: 'fastify-metrics',
});
