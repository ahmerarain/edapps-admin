"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { credsText } from "@/lib/admin-api";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenseId: string;
  pin: string;
  title?: string;
};

export function PinCredentialsDialog({ open, onOpenChange, licenseId, pin, title }: Props) {
  async function copyAll() {
    await navigator.clipboard.writeText(credsText(licenseId, pin));
    toast.success("Copied License ID + PIN");
  }

  async function copyPin() {
    await navigator.clipboard.writeText(pin);
    toast.success("PIN copied");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || "Activation credentials"}</DialogTitle>
          <DialogDescription>
            Send these to the school for online activate. They enter License ID + PIN in the app — no request file needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">License ID</p>
            <p className="mt-1 break-all font-semibold">{licenseId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">PIN</p>
            <p className="mt-1 text-2xl font-bold tracking-[0.2em]">{pin || "—"}</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => void copyPin()} disabled={!pin}>
            Copy PIN
          </Button>
          <Button onClick={() => void copyAll()} disabled={!pin}>
            Copy ID + PIN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
