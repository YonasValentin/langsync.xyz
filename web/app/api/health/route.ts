/**
 * Health check endpoint for load balancers and monitoring.
 */

import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import { logger } from "@/lib/logger";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    pocketbase: "error",
  };

  const pocketbaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;

  if (!pocketbaseUrl) {
    checks.pocketbase = "error";
    checks.pocketbaseDetail = "NEXT_PUBLIC_POCKETBASE_URL is not configured";
    logger.error("Health check: NEXT_PUBLIC_POCKETBASE_URL not configured");
  } else {
    try {
      const pb = new PocketBase(pocketbaseUrl);
      await pb.health.check();
      checks.pocketbase = "ok";
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      checks.pocketbase = "error";
      checks.pocketbaseDetail = detail;
      logger.error("Health check: PocketBase connectivity failed", {
        url: pocketbaseUrl,
        error: detail,
      });
    }
  }

  const healthy = checks.app === "ok" && checks.pocketbase === "ok";

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
