import { NextResponse } from "next/server";

import { getKeeperPoolSummaries } from "@/lib/server/keeper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getKeeperPoolSummaries();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[api/keeper/pools] failed", error);
    return NextResponse.json(
      { error: "Failed to load keeper pool summaries." },
      { status: 500 },
    );
  }
}
