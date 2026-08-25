import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateLicense } from "@/lib/tickets";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as {
      status?: string;
      expiresAt?: string;
      maxMachines?: number;
    };
    return NextResponse.json(await updateLicense(id, body));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}
