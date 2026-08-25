import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { loadKeys } from "@/lib/keys";
import { issueRenewalForMachine } from "@/lib/tickets";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    return NextResponse.json(await issueRenewalForMachine(loadKeys(), id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}
