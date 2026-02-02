import type { Db, Collection, WithId, Document } from "mongodb";

export type TransactionType = "credit" | "debit";

export interface TransactionDocument extends WithId<Document> {
  userId: string;
  walletId: string;
  amount: number;
  type: TransactionType;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export const getTransactionCollection = (db: Db): Collection<TransactionDocument> =>
  db.collection<TransactionDocument>("transactions");

export const ensureTransactionIndexes = async (db: Db) => {
  const col = getTransactionCollection(db);
  await col.createIndex({ walletId: 1, createdAt: -1 });
  await col.createIndex({ userId: 1, createdAt: -1 });
};
