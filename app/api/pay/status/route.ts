import { NextResponse } from "next/server";
import { updateAgentPaymentStatus } from "@/lib/analytics/agentMetrics";
import { getCircleAgentPaymentStatus } from "@/lib/payments/circlePayment";

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

  const status = await getCircleAgentPaymentStatus(transactionId);

  await updateAgentPaymentStatus(status);

  return NextResponse.json({
    success: status.status !== "FAILED",
    status,
    message: status.errorReason,
  });
}
