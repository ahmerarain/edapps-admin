"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type License, type Machine, type School } from "@/lib/admin-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function OverviewPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [s, l, m] = await Promise.all([
          api<School[]>("/api/admin/schools"),
          api<License[]>("/api/admin/licenses"),
          api<Machine[]>("/api/admin/machines"),
        ]);
        setSchools(s);
        setLicenses(l);
        setMachines(m);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const activeLicenses = licenses.filter((l) => l.status === "active").length;
  const activeMachines = machines.filter((m) => m.status === "active").length;
  const missingPin = licenses.filter((l) => !l.activation_pin).length;

  const stats = [
    { label: "Schools", value: schools.length, href: "/admin/schools" },
    { label: "Active licenses", value: activeLicenses, href: "/admin/licenses" },
    { label: "Active machines", value: activeMachines, href: "/admin/machines" },
    { label: "Missing PIN", value: missingPin, href: "/admin/licenses" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a school → create a license (gets a PIN) → send License ID + PIN for online activate, or issue an offline file.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition hover:border-foreground/20">
              <CardHeader className="pb-2">
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{s.value}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/schools">Add school</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/licenses">Manage licenses & PINs</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/issue">Issue offline ticket</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
