export interface WalletOperationBody {
  walletId: string;
  amount: number;
  metadata?: Record<string, unknown>;
}

export interface TransactionHistoryQuery {
  walletId: string;
  limit?: number;
  cursor?: string;
}
