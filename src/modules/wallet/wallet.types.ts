export interface CreateWalletBody {
  currency: string;
}

export interface WalletResponse {
  id: string;
  currency: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}
