export type PaymentStatus = "INITIATED" | "PENDING" | "CLEARED" | "FAILED";

export type AgentPaymentResult = {
  transactionId: string | null;
  status: PaymentStatus;
  amount: string;
  currency: "USDC";
  timestamp: string;
  txHash: string | null;
  explorerUrl: string | null;
  terminal: boolean;
  errorReason?: string;
};
