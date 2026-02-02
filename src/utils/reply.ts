import type { FastifyReply } from "fastify";
import { AppError } from "./errors";

export const sendSuccess = <T>(reply: FastifyReply, statusCode: number, data: T) => {
  return reply.code(statusCode).send({ data });
};

export const sendError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  }

  reply.log.error({ error }, "Unhandled error");
  return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Internal error" } });
};
