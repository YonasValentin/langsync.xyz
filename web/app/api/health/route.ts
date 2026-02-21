/**
 * Health check endpoint for load balancers and monitoring.
 */

import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {
    app: "ok",
    pocketbase: "error",
  };

  // Check PocketBase connectivity
  try {
    const pb = new PocketBase(POCKETBASE_URL);
    await pb.health.check();
    checks.pocketbase = "ok";
  } catch {
    checks.pocketbase = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
