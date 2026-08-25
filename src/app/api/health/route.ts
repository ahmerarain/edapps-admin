import { NextResponse } from "next/server";
import { loadKeys } from "@/lib/keys";

export async function GET() {
  const keys = loadKeys();
  return NextResponse.json({ ok: true, publicKey: keys.publicHex });
}
