import { NextResponse } from "next/server";

export async function POST() {
  const walletAddress = process.env.CIRCLE_WALLET_ADDRESS;

  if (!walletAddress) {
    return NextResponse.json(
      {
        success: false,
        status: "missing_circle_wallet",
        message: "Create and fund a Circle ARC-TESTNET wallet first.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    status: "reservation_prepared",
    network: "Arc Testnet",
    chainId: process.env.ARC_CHAIN_ID ?? "5042002",
    walletAddress,
    explorer: process.env.ARC_EXPLORER_URL ?? "https://testnet.arcscan.app",
    message:
      "Circle wallet is configured. Next step: replace this with a real USDC transfer or smart contract call.",
  });
}
