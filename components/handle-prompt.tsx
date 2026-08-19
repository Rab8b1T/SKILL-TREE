"use client";

import { useState } from "react";
import { Loader2, UserSearch } from "lucide-react";
import { toast } from "sonner";
import { useSetHandle } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

/** Shown wherever a page needs a Codeforces handle and the account has none. */
export function HandlePrompt() {
  const [handle, setHandle] = useState("");
  const setCfHandle = useSetHandle();

  return (
    <Card className="mx-auto max-w-md text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-elevated">
        <UserSearch className="size-5 text-faint" />
      </span>
      <h2 className="mt-3 text-[15px] font-semibold text-ink">
        Connect your Codeforces handle
      </h2>
      <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">
        Every page keys off it — ratings, solved problems, gaps and the picker&apos;s
        exclusion list all come from your submission history.
      </p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = handle.trim();
          if (!value) return;
          setCfHandle.mutate(value, {
            onSuccess: () => toast.success(`Connected ${value}`),
            onError: (err) => toast.error(err.message),
          });
        }}
      >
        <Input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="your handle"
          autoCapitalize="none"
          className="text-center"
        />
        <Button
          type="submit"
          variant="accent"
          disabled={setCfHandle.isPending || !handle.trim()}
        >
          {setCfHandle.isPending && <Loader2 className="size-4 animate-spin" />}
          Connect
        </Button>
      </form>
    </Card>
  );
}
