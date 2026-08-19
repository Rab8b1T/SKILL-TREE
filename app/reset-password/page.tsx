"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Binary, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("The two passwords don't match");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not reset the password");
      setDone(true);
      setTimeout(() => router.push("/"), 2200);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-ink">
            <Binary className="size-6 text-canvas" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
            Set a new password
          </h1>
        </div>

        {!token ? (
          <Card className="text-center">
            <p className="text-sm font-medium text-ink">Missing reset token</p>
            <p className="mt-1 text-[13px] text-muted">
              Open the link from your email, or request a new one.
            </p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/">Back to sign in</Link>
            </Button>
          </Card>
        ) : done ? (
          <Card className="text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-positive/10">
              <CheckCircle2 className="size-5 text-positive" />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">Password changed</p>
            <p className="mt-1 text-[13px] text-muted">Taking you to sign in…</p>
          </Card>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="New password" htmlFor="pw" hint="8 characters minimum">
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
            <Field label="Confirm password" htmlFor="pw2">
              <Input
                id="pw2"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>
            <Button
              type="submit"
              variant="accent"
              className="w-full"
              disabled={pending || password.length < 8}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Set password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
