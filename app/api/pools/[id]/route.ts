import { NextResponse } from "next/server";

import { getSerializedPoolDetail } from "@/lib/server/mirror";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const detail = await getSerializedPoolDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    console.error("[api/pools/[id]] failed", error);
    return NextResponse.json(
      { error: "Failed to load pool detail from Hedera Mirror Node." },
      { status: 500 },
    );
  }
}
