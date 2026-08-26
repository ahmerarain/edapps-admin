"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { api } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [meta, setMeta] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const sess = await api<{ publicUrl: string; publicKey: string }>("/api/admin/session");
      setMeta(`API: ${sess.publicUrl}`);
      setLoggedIn(true);
    } catch {
      setLoggedIn(false);
      setMeta("");
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function login() {
    setBusy(true);
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
      setPassword("");
      await refreshSession();
      toast.success("Signed in");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Toaster />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">License admin</CardTitle>
            <CardDescription>Sign in to manage schools, licenses, and machine activations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void login();
                }}
              />
            </div>
            <Button className="w-full" disabled={busy || !password} onClick={() => void login()}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <AdminShell meta={meta}>{children}</AdminShell>
    </>
  );
}
