export type School = {
  id: string;
  school_code: string;
  name: string;
  contact: string;
  status: string;
};

export type License = {
  id: string;
  school_id: string;
  license_type: string;
  status: string;
  expires_at: string;
  max_machines: number;
  activation_pin?: string;
};

export type Machine = {
  id: string;
  license_id: string;
  machine_id: string;
  status: string;
  activated_at: string;
  last_seen_at: string;
};

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}

export function schoolLabel(schools: School[], id: string): string {
  const s = schools.find((x) => x.id === id);
  return s ? `${s.school_code} — ${s.name}` : id;
}

export function credsText(licenseId: string, pin: string): string {
  return `SMS Register activation\nLicense ID: ${licenseId}\nPIN: ${pin}\nEnter both, then tap Activate online.`;
}
