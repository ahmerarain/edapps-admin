import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revokeMachine } from "@/lib/tickets";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    return NextResponse.json(await revokeMachine(id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}
