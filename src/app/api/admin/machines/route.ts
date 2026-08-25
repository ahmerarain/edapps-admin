import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listMachines } from "@/lib/tickets";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const licenseId = new URL(req.url).searchParams.get("licenseId") || undefined;
    return NextResponse.json(await listMachines(licenseId || undefined));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}
