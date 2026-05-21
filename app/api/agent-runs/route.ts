import { NextResponse } from "next/server";
import { runPaidAgentAnalysis } from "@/lib/agentRun";
import { createAgentFeeTransfer } from "@/lib/circle";

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
    const payment = await createAgentFeeTransfer(run.id);

    return NextResponse.json({
      success: true,
      run: {
        ...run,
        payment: {
          ...run.payment,
          status: "submitted",
        },
      },
      payment,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Paid agent analysis failed.";
    const status = message.includes("required for Arc Testnet payments")
      ? 400
      : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
