import { randomBytes } from "node:crypto";
import { canonical } from "./canonical";
import { db, nextCode, nowIso, publicUrl, type DbLicense, type DbMachine, type DbSchool } from "./db";
import { signCanonical, type KeyPair } from "./keys";

export type LicensePayload = {
  licenseId: string;
  schoolId: string;
  schoolCode: string;
  schoolName: string;
  machineId: string;
  licenseType: string;
  status: string;
  issuedAt: string;
  expiresAt: string;
  maxMachines: number;
  verificationIntervalDays: number;
  offlineGracePeriodDays: number;
  apiBaseUrl: string;
};

export type SignedTicket = {
  payload: LicensePayload;
  signature: string;
};

export type RenewalPayload = {
  kind: "renew";
  licenseId: string;
  machineId: string;
  issuedAt: string;
  expiresAt: string;
  status: string;
  verificationIntervalDays: number;
  offlineGracePeriodDays: number;
};

export type SignedRenewal = {
  payload: RenewalPayload;
  signature: string;
};

export function encodeRenewalCode(signed: SignedRenewal): string {
  const body = Buffer.from(canonical(signed.payload), "utf8").toString("base64url");
  const sig = Buffer.from(signed.signature, "hex").toString("base64url");
  return `SMSR1.${body}.${sig}`;
}

export function issueTicket(keys: KeyPair, payload: LicensePayload): SignedTicket {
  const signature = signCanonical(keys.seed, canonical(payload));
  return { payload, signature };
}

export function parseRequest(raw: string | Record<string, unknown>): { machineId: string; appVersion: string } {
  const text = typeof raw === "string" ? raw.trim() : JSON.stringify(raw);
  if (text.startsWith("{")) {
    const obj = JSON.parse(text) as { machineId?: string; appVersion?: string };
    if (!obj.machineId || !/^[a-f0-9]{64}$/i.test(obj.machineId)) {
      throw new Error("Activation request is missing a machine id");
    }
    return { machineId: obj.machineId.toLowerCase(), appVersion: obj.appVersion || "" };
  }
  const hex = text.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  if (hex.length === 64) return { machineId: hex, appVersion: "" };
  throw new Error("Paste the full activation request copied from the school laptop");
}

export async function createSchool(name: string, contact: string) {
  const id = "id_" + randomBytes(8).toString("hex");
  const schoolCode = await nextCode("SCH");
  const now = nowIso();
  const { data, error } = await db()
    .from("schools")
    .insert({
      id,
      school_code: schoolCode,
      name: name.trim(),
      contact: contact.trim(),
      status: "active",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbSchool;
}

export async function getSchool(id: string) {
  const { data, error } = await db().from("schools").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as DbSchool | null;
}

export async function listSchools() {
  const { data, error } = await db().from("schools").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as DbSchool[];
}

export async function createLicense(schoolId: string, expiresAt: string, maxMachines: number, licenseType: string) {
  const school = await getSchool(schoolId);
  if (!school) throw new Error("School not found");
  if (school.status !== "active") throw new Error("School is disabled");
  const id = await nextCode("LIC");
  const now = nowIso();
  const { data, error } = await db()
    .from("licenses")
    .insert({
      id,
      school_id: schoolId,
      license_type: licenseType || "subscription",
      status: "active",
      issued_at: now,
      expires_at: expiresAt,
      max_machines: maxMachines || 1,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbLicense;
}

export async function getLicense(id: string) {
  const { data, error } = await db().from("licenses").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as DbLicense | null;
}

export async function listLicenses(schoolId?: string) {
  let q = db().from("licenses").select("*").order("created_at", { ascending: false });
  if (schoolId) q = q.eq("school_id", schoolId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as DbLicense[];
}

export async function listMachines(licenseId?: string) {
  let q = db().from("machines").select("*").order("activated_at", { ascending: false });
  if (licenseId) q = q.eq("license_id", licenseId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as DbMachine[];
}

async function activeMachineCount(licenseId: string): Promise<number> {
  const { count, error } = await db()
    .from("machines")
    .select("*", { count: "exact", head: true })
    .eq("license_id", licenseId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function issueForMachine(
  keys: KeyPair,
  licenseId: string,
  requestRaw: string | Record<string, unknown>,
  apiBaseUrl: string = publicUrl()
): Promise<SignedTicket> {
  const license = await getLicense(licenseId);
  if (!license) throw new Error("License not found");
  if (license.status === "revoked" || license.status === "suspended") {
    throw new Error("License is " + license.status);
  }
  const school = await getSchool(license.school_id);
  if (!school || school.status !== "active") throw new Error("School is not active");
  const { machineId } = parseRequest(requestRaw);

  const { data: existing } = await db()
    .from("machines")
    .select("*")
    .eq("license_id", licenseId)
    .eq("machine_id", machineId)
    .maybeSingle();
  const activeCount = await activeMachineCount(licenseId);
  const now = nowIso();

  if (existing) {
    if (existing.status !== "active") {
      if (activeCount >= license.max_machines) throw new Error("Machine limit reached — revoke an old laptop first");
      const { error } = await db()
        .from("machines")
        .update({ status: "active", last_seen_at: now, activated_at: now })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db().from("machines").update({ last_seen_at: now }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    }
  } else {
    if (activeCount >= license.max_machines) throw new Error("Machine limit reached — revoke an old laptop first");
    const { error } = await db().from("machines").insert({
      id: "mch_" + randomBytes(8).toString("hex"),
      license_id: licenseId,
      machine_id: machineId,
      status: "active",
      activated_at: now,
      last_seen_at: now,
      created_at: now,
    });
    if (error) throw new Error(error.message);
  }

  const payload: LicensePayload = {
    licenseId: license.id,
    schoolId: school.id,
    schoolCode: school.school_code,
    schoolName: school.name,
    machineId,
    licenseType: license.license_type,
    status: license.status,
    issuedAt: now,
    expiresAt: license.expires_at,
    maxMachines: license.max_machines,
    verificationIntervalDays: license.verification_interval_days,
    offlineGracePeriodDays: license.offline_grace_days,
    apiBaseUrl,
  };
  return issueTicket(keys, payload);
}

export async function verifyFromDesktop(
  keys: KeyPair,
  body: { licenseId: string; machineId: string },
  apiBaseUrl: string = publicUrl()
): Promise<SignedTicket> {
  const license = await getLicense(body.licenseId);
  if (!license) throw new Error("License not found");
  const school = await getSchool(license.school_id);
  if (!school) throw new Error("School not found");
  const { data: machine } = await db()
    .from("machines")
    .select("*")
    .eq("license_id", body.licenseId)
    .eq("machine_id", body.machineId.toLowerCase())
    .maybeSingle();
  if (!machine) throw new Error("This machine is not activated");

  const now = nowIso();
  await db().from("machines").update({ last_seen_at: now }).eq("id", machine.id);

  let status = license.status;
  if (school.status !== "active") status = "revoked";
  if (machine.status !== "active") status = "revoked";
  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now() && status === "active") {
    status = "expired";
  }

  const payload: LicensePayload = {
    licenseId: license.id,
    schoolId: school.id,
    schoolCode: school.school_code,
    schoolName: school.name,
    machineId: body.machineId.toLowerCase(),
    licenseType: license.license_type,
    status,
    issuedAt: now,
    expiresAt: license.expires_at,
    maxMachines: license.max_machines,
    verificationIntervalDays: license.verification_interval_days,
    offlineGracePeriodDays: license.offline_grace_days,
    apiBaseUrl,
  };
  return issueTicket(keys, payload);
}

export async function revokeMachine(id: string) {
  const { data, error } = await db().from("machines").update({ status: "revoked" }).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Machine not found");
  return { ok: true };
}

export async function issueRenewalForMachine(keys: KeyPair, machineRowId: string) {
  const { data: machine, error: mErr } = await db().from("machines").select("*").eq("id", machineRowId).maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!machine) throw new Error("Machine not found");
  if (machine.status !== "active") throw new Error("This machine is not active");

  const license = await getLicense(machine.license_id);
  if (!license) throw new Error("License not found");
  if (license.status === "revoked" || license.status === "suspended") {
    throw new Error("License is " + license.status);
  }
  const school = await getSchool(license.school_id);
  if (!school || school.status !== "active") throw new Error("School is not active");
  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
    throw new Error("License expiry is in the past. Set a new expiry date after payment, then copy the code.");
  }

  const payload: RenewalPayload = {
    kind: "renew",
    licenseId: license.id,
    machineId: machine.machine_id,
    issuedAt: nowIso(),
    expiresAt: license.expires_at,
    status: "active",
    verificationIntervalDays: license.verification_interval_days,
    offlineGracePeriodDays: license.offline_grace_days,
  };
  const signed: SignedRenewal = {
    payload,
    signature: signCanonical(keys.seed, canonical(payload)),
  };
  return {
    code: encodeRenewalCode(signed),
    expiresAt: payload.expiresAt,
    licenseId: payload.licenseId,
    machineId: payload.machineId,
  };
}

export async function updateLicense(
  id: string,
  patch: {
    status?: string;
    expiresAt?: string;
    maxMachines?: number;
    verificationIntervalDays?: number;
    offlineGraceDays?: number;
  }
) {
  const row = await getLicense(id);
  if (!row) throw new Error("License not found");
  const now = nowIso();
  const { data, error } = await db()
    .from("licenses")
    .update({
      status: patch.status ?? row.status,
      expires_at: patch.expiresAt ?? row.expires_at,
      max_machines: patch.maxMachines ?? row.max_machines,
      verification_interval_days: patch.verificationIntervalDays ?? row.verification_interval_days,
      offline_grace_days: patch.offlineGraceDays ?? row.offline_grace_days,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbLicense;
}

export async function updateSchool(id: string, patch: { name?: string; contact?: string; status?: string }) {
  const row = await getSchool(id);
  if (!row) throw new Error("School not found");
  const { data, error } = await db()
    .from("schools")
    .update({
      name: patch.name ?? row.name,
      contact: patch.contact ?? row.contact,
      status: patch.status ?? row.status,
      updated_at: nowIso(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbSchool;
}
