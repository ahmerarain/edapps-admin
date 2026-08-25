import { NextResponse } from "next/server";
import { loadKeys } from "@/lib/keys";
import { verifyFromDesktop } from "@/lib/tickets";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { licenseId?: string; machineId?: string };
    if (!body.licenseId || !body.machineId) {
      return NextResponse.json({ error: "licenseId and machineId required" }, { status: 400 });
    }
    const ticket = await verifyFromDesktop(loadKeys(), {
      licenseId: body.licenseId,
      machineId: body.machineId,
    });
    return NextResponse.json(ticket);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
