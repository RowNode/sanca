import { NextResponse } from "next/server";

import { getSerializedPools } from "@/lib/server/mirror";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pools = await getSerializedPools();
    return NextResponse.json(pools);
  } catch (error) {
    console.error("[api/pools] failed", error);
    return NextResponse.json(
      { error: "Failed to load pools from Hedera Mirror Node." },
      { status: 500 },
    );
  }
}
