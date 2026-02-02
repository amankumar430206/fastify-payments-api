import type { FastifyInstance } from "fastify";
import { walletController } from "./wallet.controller";
import { createWalletSchema } from "./wallet.schemas";
import { creditWalletSchema, debitWalletSchema } from "../transaction/transaction.schemas";

export default async function walletRoutes(app: FastifyInstance) {
  const controller = walletController(app);

  app.post(
    "/wallets",
    {
      preHandler: [app.authenticate],
      schema: createWalletSchema,
    },
    controller.createWallet,
  );

  app.post(
    "/wallets/credit",
    {
      preHandler: [app.authenticate],
      schema: creditWalletSchema,
    },
    controller.credit,
  );

  app.post(
    "/wallets/debit",
    {
      preHandler: [app.authenticate],
      schema: debitWalletSchema,
    },
    controller.debit,
  );
}
