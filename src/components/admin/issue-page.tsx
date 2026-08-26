"use client";

import { useCallback, useEffect, useState } from "react";
import { api, schoolLabel, type License, type School } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function IssuePage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licenseId, setLicenseId] = useState("");
  const [requestJson, setRequestJson] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        api<School[]>("/api/admin/schools"),
        api<License[]>("/api/admin/licenses"),
      ]);
      setSchools(s);
      const active = l.filter((x) => x.status === "active");
      setLicenses(active);
      setLicenseId((prev) => prev || active[0]?.id || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function issue() {
    if (!licenseId) {
      toast.error("Pick a license");
      return;
    }
    if (!requestJson.trim()) {
      toast.error("Paste the activation request from the school");
      return;
    }
    setBusy(true);
    try {
      const ticket = await api<{ payload?: { licenseId?: string } }>(`/api/admin/licenses/${licenseId}/issue`, {
        method: "POST",
        body: JSON.stringify({ request: requestJson }),
      });
      const blob = new Blob([JSON.stringify(ticket, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${ticket.payload?.licenseId || licenseId}.smslic`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Ticket file downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Issue offline file</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          For schools without internet on the PC: they export a request file, you paste it here, download the signed
          ticket, and send it back. Online schools should use License ID + PIN instead.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Sign activation request</CardTitle>
          <CardDescription>Paste the JSON the school exported from SMS Register.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>License</Label>
            <Select value={licenseId} onValueChange={setLicenseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select license" />
              </SelectTrigger>
              <SelectContent>
                {licenses.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.id} · {schoolLabel(schools, l.school_id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-req">Activation request JSON</Label>
            <Textarea
              id="issue-req"
              className="min-h-40 font-mono text-xs"
              value={requestJson}
              onChange={(e) => setRequestJson(e.target.value)}
              placeholder='{"v":1,"machineId":"...","appVersion":"..."}'
            />
          </div>
          <Button disabled={busy} onClick={() => void issue()}>
            {busy ? "Signing…" : "Issue .smslic file"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
