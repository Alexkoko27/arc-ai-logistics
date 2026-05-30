import { NextResponse } from "next/server";
import { runPaidAgentAnalysis } from "@/lib/agentRun";
import { recordAgentPayment } from "@/lib/analytics/agentMetrics";
import { createCircleAgentPayment } from "@/lib/payments/circlePayment";

type AgentRunRequest = {
  vehicleId?: string;
  shipmentId?: string;
};

export async function POST(request: Request) {
  let body: AgentRunRequest;

  try {
    body = (await request.json()) as AgentRunRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  if (!body.shipmentId) {
    return NextResponse.json(
      {
        success: false,
        message: "shipmentId is required.",
      },
      { status: 400 },
    );
  }

  try {
    const run = await runPaidAgentAnalysis(body.shipmentId, body.vehicleId);
    const payment = await createCircleAgentPayment(run.id);

    recordAgentPayment({
      payment,
      shipment: run.shipment.reference,
    });

    return NextResponse.json({
      success: true,
      run: {
        ...run,
        payment: {
          ...run.payment,
          status: payment.status,
        },
      },
      payment,
      paymentError: payment.status === "FAILED" ? payment.errorReason : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Paid agent analysis failed.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
