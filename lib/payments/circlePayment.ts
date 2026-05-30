import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { AgentPaymentResult, PaymentStatus } from "@/lib/payments/types";

const ARC_TESTNET_BLOCKCHAIN = "ARC-TESTNET";
const DEFAULT_AGENT_FEE_USDC = "0.005";

type CircleTransactionData = {
  id?: string;
  state?: string;
  status?: string;
  txHash?: string;
  transactionHash?: string;
  createDate?: string;
  updateDate?: string;
};

function getAgentFeeAmount() {
  return process.env.AGENT_ANALYSIS_FEE_USDC ?? DEFAULT_AGENT_FEE_USDC;
}

function getExplorerUrl(txHash: string | null) {
  const explorerBaseUrl = process.env.ARC_EXPLORER_URL;

  if (!explorerBaseUrl || !txHash) return null;

  return `${explorerBaseUrl}/tx/${txHash}`;
}

function requirePaymentEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Circle payment execution.`);
  }

  return value;
}

function getCircleClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey: requirePaymentEnv("CIRCLE_API_KEY"),
    entitySecret: requirePaymentEnv("CIRCLE_ENTITY_SECRET"),
  });
}

function getTransactionHash(transaction?: CircleTransactionData) {
  return transaction?.txHash ?? transaction?.transactionHash ?? null;
}

function getTransactionTimestamp(transaction?: CircleTransactionData) {
  return transaction?.updateDate ?? transaction?.createDate ?? new Date().toISOString();
}

function normalizeCircleStatus(state?: string): PaymentStatus {
  const normalized = state?.toUpperCase();

  if (normalized === "CLEARED" || normalized === "COMPLETE" || normalized === "CONFIRMED") {
    return "CLEARED";
  }

  if (normalized === "FAILED" || normalized === "CANCELLED" || normalized === "DENIED") {
    return "FAILED";
  }

  if (normalized === "INITIATED") {
    return "INITIATED";
  }

  return "PENDING";
}

function isTerminal(status: PaymentStatus) {
  return status === "CLEARED" || status === "FAILED";
}

function failedPaymentResult(error: unknown): AgentPaymentResult {
  const message = error instanceof Error ? error.message : "Circle payment failed.";

  return {
    transactionId: null,
    status: "FAILED",
    amount: getAgentFeeAmount(),
    currency: "USDC",
    timestamp: new Date().toISOString(),
    txHash: null,
    explorerUrl: null,
    terminal: true,
    errorReason: message,
  };
}

function paymentResultFromTransaction(transaction: CircleTransactionData): AgentPaymentResult {
  const status = normalizeCircleStatus(transaction.state ?? transaction.status);
  const txHash = getTransactionHash(transaction);

  return {
    transactionId: transaction.id ?? null,
    status,
    amount: getAgentFeeAmount(),
    currency: "USDC",
    timestamp: getTransactionTimestamp(transaction),
    txHash,
    explorerUrl: getExplorerUrl(txHash),
    terminal: isTerminal(status),
  };
}

export async function createCircleAgentPayment(runId: string): Promise<AgentPaymentResult> {
  try {
    const client = getCircleClient();
    const sourceWalletAddress = requirePaymentEnv("CIRCLE_WALLET_ADDRESS");
    const destinationAddress = requirePaymentEnv("CIRCLE_FEE_RECEIVER_ADDRESS");
    const tokenAddress = requirePaymentEnv("ARC_USDC_TOKEN_ADDRESS");
    const amount = getAgentFeeAmount();

    const transferResponse = await client.createTransaction({
      blockchain: ARC_TESTNET_BLOCKCHAIN,
      walletAddress: sourceWalletAddress,
      tokenAddress,
      destinationAddress,
      amount: [amount],
      fee: {
        type: "level",
        config: {
          feeLevel: "MEDIUM",
        },
      },
      refId: runId,
    });
    const transaction = transferResponse.data as CircleTransactionData | undefined;

    if (!transaction?.id) {
      throw new Error("Circle transfer creation failed: no transaction ID returned.");
    }

    return paymentResultFromTransaction(transaction);
  } catch (error) {
    return failedPaymentResult(error);
  }
}

export async function getCircleAgentPaymentStatus(
  transactionId: string,
): Promise<AgentPaymentResult> {
  try {
    const client = getCircleClient();
    const response = await client.getTransaction({
      id: transactionId,
    });
    const transaction = response.data?.transaction as CircleTransactionData | undefined;

    if (!transaction) {
      throw new Error("Circle transaction status response was empty.");
    }

    return paymentResultFromTransaction({
      ...transaction,
      id: transaction.id ?? transactionId,
    });
  } catch (error) {
    return {
      ...failedPaymentResult(error),
      transactionId,
    };
  }
}
