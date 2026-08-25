import { NextResponse } from "next/server";
import { loadKeys } from "@/lib/keys";
import { issueForMachine } from "@/lib/tickets";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { licenseId?: string; request?: string; machineId?: string };
    const request = body.request || body.machineId || "";
    if (!body.licenseId || !request) {
      return NextResponse.json({ error: "licenseId and request required" }, { status: 400 });
    }
    const ticket = await issueForMachine(loadKeys(), body.licenseId, request);
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
