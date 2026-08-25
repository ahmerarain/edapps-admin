import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listSchools, createSchool } from "@/lib/tickets";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await listSchools());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as { name?: string; contact?: string };
    if (!body.name?.trim()) return NextResponse.json({ error: "School name required" }, { status: 400 });
    return NextResponse.json(await createSchool(body.name, body.contact || ""));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}
