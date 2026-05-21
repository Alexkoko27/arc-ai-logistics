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

  if (!body.vehicleId || !body.shipmentId) {
    return NextResponse.json(
      {
        success: false,
        message: "vehicleId and shipmentId are required.",
      },
      { status: 400 },
    );
  }

  try {
    const run = await runPaidAgentAnalysis(body.vehicleId, body.shipmentId);
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
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Paid agent analysis failed.",
      },
      { status: 500 },
    );
  }
}
