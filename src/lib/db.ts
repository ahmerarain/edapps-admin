import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type DbSchool = {
  id: string;
  school_code: string;
  name: string;
  contact: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DbLicense = {
  id: string;
  school_id: string;
  license_type: string;
  status: string;
  issued_at: string;
  expires_at: string;
  max_machines: number;
  verification_interval_days: number;
  offline_grace_days: number;
  activation_pin?: string;
  created_at: string;
  updated_at: string;
};

export type DbMachine = {
  id: string;
  license_id: string;
  machine_id: string;
  status: string;
  activated_at: string;
  last_seen_at: string;
  created_at: string;
};

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  // Prefer new secret key (sb_secret_...); fall back to legacy service_role
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function pad(n: number): string {
  return String(n).padStart(5, "0");
}

export async function nextCode(prefix: "SCH" | "LIC"): Promise<string> {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  if (prefix === "SCH") {
    const { data } = await db()
      .from("schools")
      .select("school_code")
      .like("school_code", like)
      .order("school_code", { ascending: false })
      .limit(1);
    const last = data?.[0]?.school_code ? Number(data[0].school_code.split("-").pop()) : 0;
    return `${prefix}-${year}-${pad((Number.isFinite(last) ? last : 0) + 1)}`;
  }
  const { data } = await db()
    .from("licenses")
    .select("id")
    .like("id", like)
    .order("id", { ascending: false })
    .limit(1);
  const last = data?.[0]?.id ? Number(data[0].id.split("-").pop()) : 0;
  return `${prefix}-${year}-${pad((Number.isFinite(last) ? last : 0) + 1)}`;
}

export function publicUrl(): string {
  const raw = (process.env.PUBLIC_URL || "").trim();
  if (raw) return raw.replace(/\/$/, "");
  const vercel = (process.env.VERCEL_URL || "").trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://127.0.0.1:3000";
}
