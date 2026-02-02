import type { FastifySchema } from "fastify";

export const creditWalletSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["walletId", "amount"],
    additionalProperties: false,
    properties: {
      walletId: { type: "string" },
      amount: { type: "number", exclusiveMinimum: 0 },
      metadata: { type: "object", additionalProperties: true },
    },
  },
};

export const debitWalletSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["walletId", "amount"],
    additionalProperties: false,
    properties: {
      walletId: { type: "string" },
      amount: { type: "number", exclusiveMinimum: 0 },
      metadata: { type: "object", additionalProperties: true },
    },
  },
};

export const transactionHistorySchema: FastifySchema = {
  querystring: {
    type: "object",
    required: ["walletId"],
    additionalProperties: false,
    properties: {
      walletId: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 100 },
      cursor: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  amount: { type: "number" },
                  type: { type: "string" },
                  balanceBefore: { type: "number" },
                  balanceAfter: { type: "number" },
                  createdAt: { type: "string" },
                },
              },
            },
            nextCursor: { type: ["string", "null"] },
          },
        },
      },
    },
  },
};
