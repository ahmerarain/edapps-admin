"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type School } from "@/lib/admin-api";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setSchools(await api<School[]>("/api/admin/schools"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSchool() {
    if (!name.trim()) {
      toast.error("School name is required");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/schools", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), contact: contact.trim() }),
      });
      setName("");
      setContact("");
      setCreateOpen(false);
      toast.success("School created");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string) {
    try {
      await api(`/api/admin/schools/${id}`, {
        method: "POST",
        body: JSON.stringify({ status: "disabled" }),
      });
      toast.success("School deactivated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Schools</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a school before issuing a license.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add school</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All schools</CardTitle>
          <CardDescription>{schools.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.school_code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.contact || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === "active" ? (
                      <Button variant="outline" size="sm" onClick={() => setConfirm({ id: s.id, name: s.name })}>
                        Deactivate
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {!schools.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No schools yet. Add one to get started.
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
            <DialogTitle>Add school</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="school-name">Name</Label>
              <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Green Valley School" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-contact">Contact (optional)</Label>
              <Input id="school-contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="WhatsApp / email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void createSchool()}>
              {busy ? "Creating…" : "Create school"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Deactivate school?"
        description={`“${confirm?.name}” will be marked inactive. Existing licenses stay, but new ones should use an active school.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={async () => {
          if (confirm) await deactivate(confirm.id);
          setConfirm(null);
        }}
      />
    </div>
  );
}
