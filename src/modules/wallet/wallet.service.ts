import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getWalletCollection } from "./wallet.model";
import { getTransactionCollection, TransactionType } from "../transaction/transaction.model";
import { NotFoundError, ConflictError } from "../../utils/errors";
import { enqueueJob } from "../../jobs/queue";

export class WalletService {
  constructor(private app: FastifyInstance) {}

  async createWallet(userId: string, currency: string) {
    const db = this.app.mongo.db;
    const wallets = getWalletCollection(db);

    const existing = await wallets.findOne({ userId, currency });
    if (existing) {
      throw new ConflictError("Wallet already exists for currency");
    }

    const now = new Date();
    const res = await wallets.insertOne({
      userId,
      currency,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    });

    const wallet = await wallets.findOne({ _id: res.insertedId });
    if (!wallet) throw new NotFoundError("Wallet not found after creation");

    return {
      id: wallet._id.toHexString(),
      currency: wallet.currency,
      balance: wallet.balance,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  async changeBalance(
    userId: string,
    walletId: string,
    amount: number,
    type: TransactionType,
    metadata?: Record<string, unknown>,
  ) {
    const client = this.app.mongo.client;
    const session = client.startSession();
    try {
      let resultTxId: string | null = null;
      await session.withTransaction(async () => {
        const db = this.app.mongo.db;
        const wallets = getWalletCollection(db);
        const txs = getTransactionCollection(db);

        const walletObjectId = new ObjectId(walletId);
        const wallet = await wallets.findOne({ _id: walletObjectId, userId }, { session });
        if (!wallet) throw new NotFoundError("Wallet not found");

        const balanceBefore = wallet.balance;
        const delta = type === "credit" ? amount : -amount;
        const newBalance = balanceBefore + delta;
        if (newBalance < 0) throw new ConflictError("Insufficient funds");

        const updateRes = await wallets.updateOne(
          { _id: walletObjectId, balance: balanceBefore },
          { $set: { balance: newBalance, updatedAt: new Date() } },
          { session },
        );
        if (updateRes.matchedCount === 0) {
          throw new ConflictError("Balance changed concurrently");
        }

        const txRes = await txs.insertOne(
          {
            userId,
            walletId,
            amount,
            type,
            balanceBefore,
            balanceAfter: newBalance,
            createdAt: new Date(),
            metadata: metadata || {},
          },
          { session },
        );
        resultTxId = txRes.insertedId.toHexString();
      });

      if (!resultTxId) {
        throw new Error("Transaction failed");
      }

      await enqueueJob(this.app, {
        type: "notification",
        payload: {
          userId,
          channel: "email",
          message: `Wallet ${type} of ${amount} processed`,
        },
      });

      return { transactionId: resultTxId };
    } finally {
      await session.endSession();
    }
  }

  async getTransactions(userId: string, walletId: string, limit: number, cursor?: string) {
    const db = this.app.mongo.db;
    const txs = getTransactionCollection(db);

    const query: any = { userId, walletId };
    if (cursor) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    const items = await txs
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .toArray();

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const last = items.pop()!;
      nextCursor = last._id.toHexString();
    }

    return {
      items: items.map((t) => ({
        id: t._id.toHexString(),
        amount: t.amount,
        type: t.type,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }
}
