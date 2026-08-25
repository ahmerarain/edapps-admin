import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateSchool } from "@/lib/tickets";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as { name?: string; contact?: string; status?: string };
    return NextResponse.json(await updateSchool(id, body));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}
