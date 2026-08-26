"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/schools", label: "Schools" },
  { href: "/admin/licenses", label: "Licenses" },
  { href: "/admin/machines", label: "Machines" },
  { href: "/admin/issue", label: "Issue file" },
];

export function AdminShell({
  meta,
  children,
}: {
  meta: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">SMS Register</p>
            <h1 className="font-serif text-xl font-semibold tracking-tight">License admin</h1>
            {meta ? <p className="mt-1 font-mono text-[11px] text-muted-foreground">{meta}</p> : null}
          </div>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
