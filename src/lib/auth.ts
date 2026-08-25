import { cookies } from "next/headers";
import { loadKeys } from "./keys";

const COOKIE = "sms_admin";

export function sessionToken(): string {
  const keys = loadKeys();
  return "smslic_" + Buffer.from(keys.publicHex.slice(0, 16)).toString("hex");
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === sessionToken();
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Sign in required");
  }
}

export { COOKIE as ADMIN_COOKIE };
