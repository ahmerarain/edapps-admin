import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { loadKeys } from "@/lib/keys";
import { publicUrl } from "@/lib/db";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const keys = loadKeys();
  return NextResponse.json({ ok: true, publicKey: keys.publicHex, publicUrl: publicUrl() });
}
