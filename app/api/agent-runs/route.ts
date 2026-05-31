import { NextResponse } from "next/server";
import { runPaidAgentAnalysis } from "@/lib/agentRun";
import { recordAgentPayment } from "@/lib/analytics/agentMetrics";
import { createStoredAnalysisRun } from "@/lib/db/analysisPersistence";
import { createCircleAgentPayment } from "@/lib/payments/circlePayment";
import { z } from "zod";

const agentRunRequestSchema = z.object({
  vehicleId: z.string().optional(),
  shipmentId: z.string().min(1),
});

export async function POST(request: Request) {
  let body: z.infer<typeof agentRunRequestSchema>;

  try {
    body = agentRunRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Request body must include a valid shipmentId.",
      },
      { status: 400 },
    );
  }

  try {
    const run = await runPaidAgentAnalysis(body.shipmentId, body.vehicleId);
    let analysisRunId: string | null = null;

    try {
      analysisRunId = await createStoredAnalysisRun(run);
    } catch {
      analysisRunId = null;
    }

    const payment = await createCircleAgentPayment(run.id);

    await recordAgentPayment({
      analysisRunId,
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
