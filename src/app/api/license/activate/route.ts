import { NextResponse } from "next/server";
import { loadKeys } from "@/lib/keys";
import { assertActivationPin, getLicense, issueForMachine } from "@/lib/tickets";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      licenseId?: string;
      pin?: string;
      request?: string | Record<string, unknown>;
      machineId?: string;
    };
    const request = body.request || body.machineId || "";
    if (!body.licenseId || !request) {
      return NextResponse.json({ error: "licenseId and request required" }, { status: 400 });
    }
    const license = await getLicense(body.licenseId);
    if (!license) throw new Error("Wrong license ID or PIN");
    assertActivationPin(license, body.pin);
    const ticket = await issueForMachine(loadKeys(), license.id, request);
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
