"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Machine } from "@/lib/admin-api";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [renewalCode, setRenewalCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMachines(await api<Machine[]>("/api/admin/machines"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    try {
      await api(`/api/admin/machines/${id}/revoke`, { method: "POST" });
      toast.success("Machine revoked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function renewal(id: string) {
    try {
      const out = await api<{ code: string }>(`/api/admin/machines/${id}/renewal`, { method: "POST" });
      setRenewalCode(out.code);
      try {
        await navigator.clipboard.writeText(out.code);
        toast.success("Renewal code copied");
      } catch {
        toast.success("Renewal code ready");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Machines</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Activated school PCs. Revoke a machine to free a seat, or issue a renewal code for offline schools.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activations</CardTitle>
          <CardDescription>{machines.length} machines</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License</TableHead>
                <TableHead>Machine ID</TableHead>
                <TableHead>Activated</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.license_id}</TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs">{m.machine_id}</TableCell>
                  <TableCell className="font-mono text-xs">{(m.activated_at || "").slice(0, 10)}</TableCell>
                  <TableCell className="font-mono text-xs">{(m.last_seen_at || "").slice(0, 10)}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => void renewal(m.id)}>
                        Renewal code
                      </Button>
                      {m.status === "active" ? (
                        <Button size="sm" variant="destructive" onClick={() => setRevokeId(m.id)}>
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!machines.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No machines activated yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!revokeId}
        onOpenChange={(o) => !o && setRevokeId(null)}
        title="Revoke this machine?"
        description="The school PC will lose its seat. They can activate again if the license still has capacity."
        confirmLabel="Revoke"
        destructive
        onConfirm={async () => {
          if (revokeId) await revoke(revokeId);
          setRevokeId(null);
        }}
      />

      <Dialog open={!!renewalCode} onOpenChange={(o) => !o && setRenewalCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renewal code</DialogTitle>
            <DialogDescription>WhatsApp this code to the school for offline renewal.</DialogDescription>
          </DialogHeader>
          <p className="break-all rounded-lg border bg-muted/40 p-4 font-mono text-sm">{renewalCode}</p>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (renewalCode) {
                  await navigator.clipboard.writeText(renewalCode);
                  toast.success("Copied");
                }
              }}
            >
              Copy again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
