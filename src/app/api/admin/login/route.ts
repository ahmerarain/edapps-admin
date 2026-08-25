import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, sessionToken } from "@/lib/auth";
import { publicUrl } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { password?: string };
    const expected = process.env.ADMIN_PASSWORD || "change-me";
    if ((body.password || "") !== expected) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    const secure = publicUrl().startsWith("https://");
    const jar = await cookies();
    jar.set(ADMIN_COOKIE, sessionToken(), {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 12,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
