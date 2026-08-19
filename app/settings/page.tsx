"use client";

import { useState } from "react";
import { Check, KeyRound, Loader2, LogOut, UserSearch } from "lucide-react";
import { toast } from "sonner";
import {
  useCfProfile,
  useChangePassword,
  useLogout,
  useSession,
  useSetHandle,
} from "@/lib/queries";
import { handleUrl, rankFor } from "@/lib/cf";
import { PageHeader, PageShell } from "@/components/layout/page";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { data: profile } = useCfProfile(user?.cfHandle);

  const setHandle = useSetHandle();
  const changePassword = useChangePassword();
  const logout = useLogout();

  // Null means "untouched", so the field tracks the server value until edited.
  const [handleDraft, setHandleDraft] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handle = handleDraft ?? user?.cfHandle ?? "";
  const rank = profile?.user.rating ? rankFor(profile.user.rating) : null;
  const dirty = handle.trim() !== (user?.cfHandle ?? "");

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Settings"
        description={`Signed in as ${user?.username ?? ""}`}
      />

      <div className="space-y-4">
        {/* Handle */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Codeforces handle</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted">
                Everything is keyed off this — ratings, gaps, and the exclusion
                list the picker uses.
              </p>
            </div>
            {rank && (
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold"
                style={{
                  color: rank.color,
                  backgroundColor: `color-mix(in srgb, ${rank.color} 14%, transparent)`,
                }}
              >
                {rank.short}
              </span>
            )}
          </CardHeader>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setHandle.mutate(handle.trim() || null, {
                onSuccess: () => {
                  setHandleDraft(null);
                  toast.success("Handle saved");
                },
                onError: (err) => toast.error(err.message),
              });
            }}
          >
            <Input
              value={handle}
              onChange={(e) => setHandleDraft(e.target.value)}
              placeholder="your handle"
              autoCapitalize="none"
            />
            <Button type="submit" disabled={!dirty || setHandle.isPending}>
              {setHandle.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check />
              )}
              Save
            </Button>
          </form>

          {profile && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
              <a
                href={handleUrl(profile.handle)}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent hover:underline"
              >
                View on Codeforces
              </a>
              <span>
                {profile.stats.solved.length} solved &middot;{" "}
                {profile.ratingHistory.length} rated rounds
              </span>
            </div>
          )}

          {!user?.cfHandle && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-sunken px-3 py-2 text-[11px] leading-snug text-muted">
              <UserSearch className="mt-0.5 size-3.5 shrink-0 text-faint" />
              Without a handle the dashboard, practice and contest pages have
              nothing to read.
            </p>
          )}
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Password</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted">
                Minimum eight characters.
              </p>
            </div>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-elevated">
              <KeyRound className="size-4 text-faint" />
            </span>
          </CardHeader>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              changePassword.mutate(
                { currentPassword, newPassword },
                {
                  onSuccess: () => {
                    toast.success("Password changed");
                    setCurrentPassword("");
                    setNewPassword("");
                  },
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <Field label="Current password" htmlFor="cur">
              <Input
                id="cur"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="New password" htmlFor="new">
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
            <Button
              type="submit"
              disabled={
                changePassword.isPending ||
                !currentPassword ||
                newPassword.length < 8
              }
            >
              {changePassword.isPending && <Loader2 className="animate-spin" />}
              Change password
            </Button>
          </form>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Appearance</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted">
                Follows your system theme until you pick one.
              </p>
            </div>
          </CardHeader>
          <div className="max-w-[220px]">
            <ThemeToggle />
          </div>
        </Card>

        {/* Session */}
        <Card>
          <SectionLabel>Session</SectionLabel>
          <Button
            variant="danger"
            className="mt-3"
            onClick={() => logout.mutate()}
          >
            <LogOut />
            Log out
          </Button>
        </Card>
      </div>
    </PageShell>
  );
}
