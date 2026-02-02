import type { FastifyInstance } from "fastify";
import { transactionController } from "./transaction.controller";
import { transactionHistorySchema } from "./transaction.schemas";

export default async function transactionRoutes(app: FastifyInstance) {
  const controller = transactionController(app);

  app.get(
    "/transactions",
    {
      preHandler: [app.authenticate],
      schema: transactionHistorySchema,
    },
    controller.history,
  );
}
