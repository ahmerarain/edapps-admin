import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { loadKeys } from "@/lib/keys";
import { issueForMachine } from "@/lib/tickets";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as { request?: string };
    const ticket = await issueForMachine(loadKeys(), id, body.request || "");
    return NextResponse.json(ticket);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}
