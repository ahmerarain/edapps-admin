import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listLicenses, createLicense } from "@/lib/tickets";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const schoolId = new URL(req.url).searchParams.get("schoolId") || undefined;
    return NextResponse.json(await listLicenses(schoolId || undefined));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      schoolId?: string;
      expiresAt?: string;
      maxMachines?: number;
      licenseType?: string;
    };
    if (!body.schoolId || !body.expiresAt) {
      return NextResponse.json({ error: "schoolId and expiresAt required" }, { status: 400 });
    }
    return NextResponse.json(
      await createLicense(body.schoolId, body.expiresAt, body.maxMachines || 1, body.licenseType || "subscription")
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Sign in required" ? 401 : 400 });
  }
}
