import fastify, { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { config } from "../config/env";

export const buildFastify = (): FastifyInstance => {
  const app = fastify({
    logger: {
      level: config.logLevel,
      transport: config.nodeEnv === "development" ? { target: "pino-pretty", options: { colorize: true } } : undefined,
    },
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: "all",
        useDefaults: true,
        coerceTypes: true,
      },
    },
  });

  return app;
};

export default fp(async (app: FastifyInstance) => {
  // placeholder if you want to treat this as a plugin later
});
