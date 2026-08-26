"use client";

import { useCallback, useEffect, useState } from "react";
import { api, credsText, schoolLabel, type License, type School } from "@/lib/admin-api";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PinCredentialsDialog } from "@/components/admin/pin-credentials-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export function LicensesPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [expires, setExpires] = useState("");
  const [maxMachines, setMaxMachines] = useState("1");
  const [licenseType, setLicenseType] = useState("subscription");
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<{ id: string; pin: string; title?: string } | null>(null);
  const [confirm, setConfirm] = useState<{ type: "revoke" | "resetPin" | "suspend" | "activate"; id: string } | null>(
    null
  );
  const [expiryId, setExpiryId] = useState<string | null>(null);
  const [expiryDraft, setExpiryDraft] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        api<School[]>("/api/admin/schools"),
        api<License[]>("/api/admin/licenses"),
      ]);
      setSchools(s);
      setLicenses(l);
      setSchoolId((prev) => {
        if (prev) return prev;
        return s.find((x) => x.status === "active")?.id || "";
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createLicense() {
    if (!schoolId) {
      toast.error("Pick a school");
      return;
    }
    if (!expires) {
      toast.error("Set an expiry date");
      return;
    }
    setBusy(true);
    try {
      const created = await api<{ id: string; activation_pin?: string }>("/api/admin/licenses", {
        method: "POST",
        body: JSON.stringify({
          schoolId,
          expiresAt: new Date(expires + "T23:59:59.000Z").toISOString(),
          maxMachines: Number(maxMachines || 1),
          licenseType,
        }),
      });
      setCreateOpen(false);
      setExpires("");
      setMaxMachines("1");
      await load();
      setCreds({
        id: created.id,
        pin: created.activation_pin || "",
        title: "License created — send these credentials",
      });
      toast.success("License created with activation PIN");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function patchLicense(id: string, body: Record<string, unknown>) {
    return api<License>(`/api/admin/licenses/${id}`, { method: "POST", body: JSON.stringify(body) });
  }

  async function runConfirm() {
    if (!confirm) return;
    try {
      if (confirm.type === "revoke") {
        await patchLicense(confirm.id, { status: "revoked" });
        toast.success("License revoked");
      } else if (confirm.type === "suspend") {
        await patchLicense(confirm.id, { status: "suspended" });
        toast.success("License suspended");
      } else if (confirm.type === "activate") {
        await patchLicense(confirm.id, { status: "active" });
        toast.success("License activated");
      } else if (confirm.type === "resetPin") {
        const updated = await patchLicense(confirm.id, { resetPin: true });
        toast.success("New PIN generated");
        setCreds({ id: updated.id, pin: updated.activation_pin || "", title: "New activation PIN" });
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setConfirm(null);
    }
  }

  async function saveExpiry() {
    if (!expiryId || !expiryDraft) {
      toast.error("Pick a date");
      return;
    }
    try {
      await patchLicense(expiryId, {
        expiresAt: new Date(expiryDraft + "T23:59:59.000Z").toISOString(),
      });
      toast.success("Expiry updated");
      setExpiryId(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function copyCreds(l: License) {
    if (!l.activation_pin) {
      toast.error("No PIN yet — generate one first");
      return;
    }
    await navigator.clipboard.writeText(credsText(l.id, l.activation_pin));
    toast.success("Copied License ID + PIN");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Licenses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Creating a license auto-generates a 6-digit PIN. Reset anytime and WhatsApp the new PIN to the school.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create license</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All licenses</CardTitle>
          <CardDescription>{licenses.length} total · PIN is required for online activate</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License ID</TableHead>
                <TableHead>School</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Machines</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs font-semibold">{l.id}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm">{schoolLabel(schools, l.school_id)}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm tracking-wider">{l.activation_pin || "—"}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{(l.expires_at || "").slice(0, 10)}</TableCell>
                  <TableCell className="tabular-nums">{l.max_machines}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => void copyCreds(l)}>
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setCreds({ id: l.id, pin: l.activation_pin || "", title: "Activation credentials" })
                        }
                      >
                        Show PIN
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "resetPin", id: l.id })}>
                        Reset PIN
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExpiryDraft((l.expires_at || "").slice(0, 10));
                          setExpiryId(l.id);
                        }}
                      >
                        Expiry
                      </Button>
                      {l.status === "active" ? (
                        <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "suspend", id: l.id })}>
                          Suspend
                        </Button>
                      ) : l.status !== "revoked" ? (
                        <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "activate", id: l.id })}>
                          Activate
                        </Button>
                      ) : null}
                      {l.status !== "revoked" ? (
                        <Button size="sm" variant="destructive" onClick={() => setConfirm({ type: "revoke", id: l.id })}>
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!licenses.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No licenses yet. Create one after adding a school.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create license</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>School</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {schools
                    .filter((s) => s.status === "active")
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.school_code} — {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lic-exp">Expires</Label>
              <Input id="lic-exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lic-max">Max machines</Label>
                <Input
                  id="lic-max"
                  type="number"
                  min={1}
                  value={maxMachines}
                  onChange={(e) => setMaxMachines(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={licenseType} onValueChange={setLicenseType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="perpetual">Perpetual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">A new 6-digit activation PIN is created automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void createLicense()}>
              {busy ? "Creating…" : "Create + show PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!expiryId} onOpenChange={(o) => !o && setExpiryId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update expiry</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-exp">New expiry date</Label>
            <Input id="new-exp" type="date" value={expiryDraft} onChange={(e) => setExpiryDraft(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryId(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveExpiry()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.type === "resetPin"
            ? "Reset activation PIN?"
            : confirm?.type === "revoke"
              ? "Revoke license?"
              : confirm?.type === "suspend"
                ? "Suspend license?"
                : "Activate license?"
        }
        description={
          confirm?.type === "resetPin"
            ? "The old PIN stops working immediately. You’ll get a new PIN to send to the school."
            : confirm?.type === "revoke"
              ? "This license cannot be used again until you re-issue a new one."
              : confirm?.type === "suspend"
                ? "Activations and renewals will be blocked while suspended."
                : "Mark this license active again."
        }
        confirmLabel={confirm?.type === "resetPin" ? "Generate new PIN" : "Confirm"}
        destructive={confirm?.type === "revoke" || confirm?.type === "resetPin"}
        onConfirm={() => void runConfirm()}
      />

      <PinCredentialsDialog
        open={!!creds}
        onOpenChange={(o) => !o && setCreds(null)}
        licenseId={creds?.id || ""}
        pin={creds?.pin || ""}
        title={creds?.title}
      />
    </div>
  );
}
