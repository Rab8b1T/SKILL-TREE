"use client";

import { useState } from "react";
import { Binary, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLogin, useSignup } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cfHandle, setCfHandle] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  const login = useLogin();
  const signup = useSignup();
  const pending = login.isPending || signup.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    const onError = (err: Error) => toast.error(err.message);
    if (mode === "login") {
      login.mutate({ username, password }, { onError });
    } else {
      signup.mutate(
        { username, password, cfHandle: cfHandle.trim() || undefined },
        { onError },
      );
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle variant="icon" />
      </div>

      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-ink">
            <Binary className="size-6 text-canvas" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
            Skill Tree
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Codeforces training, tracked properly.
          </p>
        </div>

        <div className="mb-5 inline-flex w-full rounded-xl bg-sunken p-1">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 cursor-pointer rounded-lg py-2 text-[13px] font-medium transition-all",
                mode === m
                  ? "bg-surface text-ink shadow-[var(--shadow-xs)]"
                  : "text-muted hover:text-ink",
              )}
            >
              {m === "login" ? "Log in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Username" htmlFor="username">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            hint={mode === "signup" ? "8 characters minimum" : undefined}
          >
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </Field>

          {mode === "signup" && (
            <Field
              label="Codeforces handle"
              htmlFor="cfHandle"
              hint="optional, changeable later"
            >
              <Input
                id="cfHandle"
                value={cfHandle}
                onChange={(e) => setCfHandle(e.target.value)}
                autoCapitalize="none"
                placeholder="tourist"
              />
            </Field>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>

        {mode === "login" && (
          <button
            onClick={() => setForgotOpen(true)}
            className="mx-auto mt-4 block cursor-pointer text-[12px] font-medium text-muted hover:text-ink"
          >
            Forgot your password?
          </button>
        )}
      </div>

      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        defaultUsername={username}
      />
    </div>
  );
}

function ForgotPasswordDialog({
  open,
  onOpenChange,
  defaultUsername,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultUsername: string;
}) {
  const [username, setUsername] = useState(defaultUsername);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not start the reset");
      toast.success(body.message);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            If the account has an email on file, we&apos;ll send a link that works
            for one hour.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <DialogBody>
            <Field label="Username" htmlFor="reset-username">
              <Input
                id="reset-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                required
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={pending || !username}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Send link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
