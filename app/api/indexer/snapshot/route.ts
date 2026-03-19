import { NextResponse } from "next/server";

import { getSerializedIndexerSnapshot } from "@/lib/server/mirror";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getSerializedIndexerSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[api/indexer/snapshot] failed", error);
    return NextResponse.json(
      { error: "Failed to load indexer snapshot from Hedera Mirror Node." },
      { status: 500 },
    );
  }
}
