"use client";

import { useCallback, useEffect, useState } from "react";

type School = {
  id: string;
  school_code: string;
  name: string;
  contact: string;
  status: string;
};

type License = {
  id: string;
  school_id: string;
  license_type: string;
  status: string;
  expires_at: string;
  max_machines: number;
};

type Machine = {
  id: string;
  license_id: string;
  machine_id: string;
  status: string;
  activated_at: string;
  last_seen_at: string;
};

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}

function Card({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="mb-4 rounded-xl border border-rule bg-card p-5 shadow-sm">
      <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
      {hint ? <p className="mt-1 mb-4 text-sm text-ink-soft">{hint}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">{children}</label>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="mb-3 w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="mb-3 w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink"
    />
  );
}

function Btn({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base = "rounded-lg px-4 py-2 text-sm font-medium transition";
  const styles =
    variant === "primary"
      ? "bg-ink text-white hover:bg-ink/90"
      : variant === "danger"
        ? "border border-red-200 bg-white text-brick hover:bg-red-50"
        : "border border-rule bg-white text-ink hover:bg-paper-dark";
  return (
    <button type="button" {...props} className={`${base} ${styles} ${props.className || ""}`}>
      {children}
    </button>
  );
}

export default function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [meta, setMeta] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [schName, setSchName] = useState("");
  const [schContact, setSchContact] = useState("");
  const [licSchool, setLicSchool] = useState("");
  const [licExp, setLicExp] = useState("");
  const [licMax, setLicMax] = useState("1");
  const [licType, setLicType] = useState("subscription");
  const [issueLic, setIssueLic] = useState("");
  const [issueReq, setIssueReq] = useState("");
  const [issueErr, setIssueErr] = useState("");

  const refresh = useCallback(async () => {
    const sess = await api<{ publicUrl: string; publicKey: string }>("/api/admin/session");
    setMeta(`API: ${sess.publicUrl} · public key: ${sess.publicKey.slice(0, 16)}…`);
    const [s, l, m] = await Promise.all([
      api<School[]>("/api/admin/schools"),
      api<License[]>("/api/admin/licenses"),
      api<Machine[]>("/api/admin/machines"),
    ]);
    setSchools(s);
    setLicenses(l);
    setMachines(m);
    if (!licSchool && s.length) setLicSchool(s[0].id);
    if (!issueLic && l.length) setIssueLic(l[0].id);
  }, [licSchool, issueLic]);

  useEffect(() => {
    api<{ ok: boolean }>("/api/admin/session")
      .then(() => {
        setLoggedIn(true);
        return refresh();
      })
      .catch(() => setLoggedIn(false));
  }, [refresh]);

  async function login() {
    setLoginErr("");
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
      setLoggedIn(true);
      await refresh();
    } catch (e) {
      setLoginErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
  }

  async function createSchool() {
    await api("/api/admin/schools", {
      method: "POST",
      body: JSON.stringify({ name: schName, contact: schContact }),
    });
    setSchName("");
    setSchContact("");
    await refresh();
  }

  async function createLicense() {
    if (!licExp) return alert("Set an expiry date");
    await api("/api/admin/licenses", {
      method: "POST",
      body: JSON.stringify({
        schoolId: licSchool,
        expiresAt: new Date(licExp + "T23:59:59.000Z").toISOString(),
        maxMachines: Number(licMax || 1),
        licenseType: licType,
      }),
    });
    await refresh();
  }

  async function issueLicense() {
    setIssueErr("");
    try {
      const ticket = await api<{ payload?: { licenseId?: string } }>(
        "/api/admin/licenses/" + issueLic + "/issue",
        { method: "POST", body: JSON.stringify({ request: issueReq }) }
      );
      const blob = new Blob([JSON.stringify(ticket, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (ticket.payload?.licenseId || "license") + ".smslic";
      a.click();
    } catch (e) {
      setIssueErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function onTableClick(e: React.MouseEvent<HTMLDivElement>) {
    const t = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
    if (!t) return;
    const action = t.dataset.action;
    const id = t.dataset.id || "";
    if (action === "toggle-school") {
      const s = schools.find((x) => x.id === id);
      await api("/api/admin/schools/" + id, {
        method: "POST",
        body: JSON.stringify({ status: s?.status === "active" ? "disabled" : "active" }),
      });
      await refresh();
    }
    if (action === "toggle-license") {
      await api("/api/admin/licenses/" + id, {
        method: "POST",
        body: JSON.stringify({ status: t.dataset.to }),
      });
      await refresh();
    }
    if (action === "revoke-license") {
      if (!confirm("Revoke this license?")) return;
      await api("/api/admin/licenses/" + id, { method: "POST", body: JSON.stringify({ status: "revoked" }) });
      await refresh();
    }
    if (action === "set-expiry") {
      const l = licenses.find((x) => x.id === id);
      const cur = (l?.expires_at || "").slice(0, 10);
      const d = prompt("New expiry date (YYYY-MM-DD)", cur);
      if (!d) return;
      await api("/api/admin/licenses/" + id, {
        method: "POST",
        body: JSON.stringify({ expiresAt: new Date(d + "T23:59:59.000Z").toISOString() }),
      });
      await refresh();
    }
    if (action === "renewal") {
      try {
        const out = await api<{ code: string }>("/api/admin/machines/" + id + "/renewal", { method: "POST" });
        try {
          await navigator.clipboard.writeText(out.code);
          alert("Copied. WhatsApp this code to the school.");
        } catch {
          prompt("Copy renewal code:", out.code);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      }
    }
    if (action === "revoke-machine") {
      if (!confirm("Revoke this machine?")) return;
      await api("/api/admin/machines/" + id + "/revoke", { method: "POST" });
      await refresh();
    }
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-ink">SMS License Admin</h1>
          <p className="mt-2 text-sm text-ink-soft">Manage school licences. Works on your phone after deploy.</p>
        </header>

        {!loggedIn ? (
          <Card title="Sign in">
            <Label>Admin password</Label>
            <Field type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Btn onClick={() => void login()}>Sign in</Btn>
            {loginErr ? <p className="mt-3 text-sm text-brick">{loginErr}</p> : null}
          </Card>
        ) : (
          <>
            <p className="mb-4 font-mono text-xs text-ink-soft">{meta}</p>
            <Btn variant="secondary" className="mb-6" onClick={() => void logout()}>
              Sign out
            </Btn>

            <Card title="New school">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Field value={schName} onChange={(e) => setSchName(e.target.value)} placeholder="School name" />
                </div>
                <div>
                  <Label>Contact</Label>
                  <Field value={schContact} onChange={(e) => setSchContact(e.target.value)} placeholder="WhatsApp" />
                </div>
              </div>
              <Btn onClick={() => void createSchool()}>Create school</Btn>
            </Card>

            <Card title="New license">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>School</Label>
                  <Select value={licSchool} onChange={(e) => setLicSchool(e.target.value)}>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.school_code} — {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Expires</Label>
                  <Field type="date" value={licExp} onChange={(e) => setLicExp(e.target.value)} />
                </div>
                <div>
                  <Label>Max machines</Label>
                  <Field type="number" min={1} value={licMax} onChange={(e) => setLicMax(e.target.value)} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={licType} onChange={(e) => setLicType(e.target.value)}>
                    <option value="subscription">subscription</option>
                    <option value="standard">standard</option>
                    <option value="premium">premium</option>
                  </Select>
                </div>
              </div>
              <Btn onClick={() => void createLicense()}>Create license</Btn>
            </Card>

            <Card title="Issue license file" hint="Paste the activation request from the school laptop.">
              <Label>License</Label>
              <Select value={issueLic} onChange={(e) => setIssueLic(e.target.value)}>
                {licenses.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} ({l.status})
                  </option>
                ))}
              </Select>
              <Label>Activation request</Label>
              <textarea
                value={issueReq}
                onChange={(e) => setIssueReq(e.target.value)}
                placeholder='{"v":1,"machineId":"...","appVersion":"1.0.0"}'
                className="mb-3 min-h-24 w-full rounded-lg border border-rule bg-white px-3 py-2 font-mono text-xs"
              />
              <Btn onClick={() => void issueLicense()}>Issue and download</Btn>
              {issueErr ? <p className="mt-3 text-sm text-brick">{issueErr}</p> : null}
            </Card>

            <div onClick={(e) => void onTableClick(e)}>
              <Card title="Schools">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-rule text-ink-soft">
                        <th className="py-2 pr-2">Code</th>
                        <th className="py-2 pr-2">Name</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {schools.map((s) => (
                        <tr key={s.id} className="border-b border-rule/60">
                          <td className="py-2 pr-2 font-mono text-xs">{s.school_code}</td>
                          <td className="py-2 pr-2">{s.name}</td>
                          <td className="py-2 pr-2">{s.status}</td>
                          <td className="py-2">
                            <Btn variant="secondary" data-action="toggle-school" data-id={s.id}>
                              {s.status === "active" ? "Disable" : "Enable"}
                            </Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Licenses" hint="After payment, set expiry then copy offline renewal code.">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-rule text-ink-soft">
                        <th className="py-2 pr-2">ID</th>
                        <th className="py-2 pr-2">Expires</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map((l) => (
                        <tr key={l.id} className="border-b border-rule/60">
                          <td className="py-2 pr-2 font-mono text-xs">{l.id}</td>
                          <td className="py-2 pr-2">{(l.expires_at || "").slice(0, 10)}</td>
                          <td className="py-2 pr-2">{l.status}</td>
                          <td className="py-2 space-x-2">
                            <Btn variant="secondary" data-action="set-expiry" data-id={l.id}>
                              Set expiry
                            </Btn>
                            <Btn
                              variant="secondary"
                              data-action="toggle-license"
                              data-id={l.id}
                              data-to={l.status === "active" ? "suspended" : "active"}
                            >
                              {l.status === "active" ? "Suspend" : "Activate"}
                            </Btn>
                            <Btn variant="danger" data-action="revoke-license" data-id={l.id}>
                              Revoke
                            </Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Machines" hint="Each offline code works on one laptop only.">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-rule text-ink-soft">
                        <th className="py-2 pr-2">License</th>
                        <th className="py-2 pr-2">Machine</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {machines.map((m) => (
                        <tr key={m.id} className="border-b border-rule/60">
                          <td className="py-2 pr-2 font-mono text-xs">{m.license_id}</td>
                          <td className="py-2 pr-2 font-mono text-xs">{m.machine_id.slice(0, 16)}…</td>
                          <td className="py-2 pr-2">{m.status}</td>
                          <td className="py-2 space-x-2">
                            {m.status === "active" ? (
                              <>
                                <Btn variant="secondary" data-action="renewal" data-id={m.id}>
                                  Copy offline code
                                </Btn>
                                <Btn variant="danger" data-action="revoke-machine" data-id={m.id}>
                                  Revoke
                                </Btn>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
