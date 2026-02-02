import type { FastifySchema } from "fastify";

export const createWalletSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["currency"],
    additionalProperties: false,
    properties: {
      currency: { type: "string", minLength: 3, maxLength: 3 },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            id: { type: "string" },
            currency: { type: "string" },
            balance: { type: "number" },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
      },
    },
  },
};
