import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const ARC_TESTNET_USDC_TOKEN_ADDRESS =
  process.env.ARC_USDC_TOKEN_ADDRESS ??
  "0x3600000000000000000000000000000000000000";
const ARC_TESTNET_BLOCKCHAIN = "ARC-TESTNET";
const TERMINAL_STATES = new Set(["COMPLETE", "FAILED", "CANCELLED", "DENIED"]);

type CircleTransactionData = {
  id?: string;
  state?: string;
  txHash?: string;
  transactionHash?: string;
  blockchain?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Arc Testnet payments.`);
  }

  return value;
}

export function getCircleClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey: requireEnv("CIRCLE_API_KEY"),
    entitySecret: requireEnv("CIRCLE_ENTITY_SECRET"),
  });
}

function getTransactionHash(transaction?: CircleTransactionData) {
  return transaction?.txHash ?? transaction?.transactionHash ?? null;
}

export async function createAgentFeeTransfer(runId: string) {
  const client = getCircleClient();
  const sourceWalletAddress = requireEnv("CIRCLE_WALLET_ADDRESS");
  const destinationAddress = requireEnv("CIRCLE_FEE_RECEIVER_ADDRESS");
  const amount = process.env.AGENT_ANALYSIS_FEE_USDC ?? "0.005";

  const transferResponse = await client.createTransaction({
    blockchain: ARC_TESTNET_BLOCKCHAIN,
    walletAddress: sourceWalletAddress,
    tokenAddress: ARC_TESTNET_USDC_TOKEN_ADDRESS,
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

  return {
    transactionId: transaction.id,
    state: transaction.state ?? "INITIATED",
    txHash: getTransactionHash(transaction),
    amount,
    currency: "USDC" as const,
    sourceWalletAddress,
    destinationAddress,
    network: "Arc Testnet",
    blockchain: ARC_TESTNET_BLOCKCHAIN,
    tokenAddress: ARC_TESTNET_USDC_TOKEN_ADDRESS,
    explorerBaseUrl: process.env.ARC_EXPLORER_URL ?? "https://testnet.arcscan.app",
  };
}

export async function getAgentFeeTransferStatus(transactionId: string) {
  const client = getCircleClient();
  const response = await client.getTransaction({
    id: transactionId,
  });
  const transaction = response.data?.transaction as CircleTransactionData | undefined;
  const state = transaction?.state ?? "UNKNOWN";
  const txHash = getTransactionHash(transaction);
  const explorerBaseUrl = process.env.ARC_EXPLORER_URL ?? "https://testnet.arcscan.app";

  return {
    transactionId,
    state,
    txHash,
    terminal: TERMINAL_STATES.has(state),
    explorerUrl: txHash ? `${explorerBaseUrl}/tx/${txHash}` : explorerBaseUrl,
  };
}
