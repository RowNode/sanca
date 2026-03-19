import { NextResponse } from "next/server";

import { getKeeperDecisionHistory } from "@/lib/server/keeper";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pool = searchParams.get("pool") || undefined;
    const history = await getKeeperDecisionHistory(pool);
    return NextResponse.json(history);
  } catch (error) {
    console.error("[api/keeper/decisions] failed", error);
    return NextResponse.json(
      { error: "Failed to load keeper decision history." },
      { status: 500 },
    );
  }
}
