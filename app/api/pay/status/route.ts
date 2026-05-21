import { NextResponse } from "next/server";
import { getAgentFeeTransferStatus } from "@/lib/circle";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("id");

  if (!transactionId) {
    return NextResponse.json(
      {
        success: false,
        message: "Transaction id is required.",
      },
      { status: 400 },
    );
  }

  try {
    const status = await getAgentFeeTransferStatus(transactionId);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch transaction status.",
      },
      { status: 500 },
    );
  }
}
