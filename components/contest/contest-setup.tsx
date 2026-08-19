"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { DIVISIONS, pointsForIndex } from "@/lib/contest";
import { ratingColor } from "@/lib/cf";
import { cn } from "@/lib/utils";
import type { ContestDivision, ContestProblemRef, VirtualContest } from "@/lib/types";
import { Card, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

type Division = Exclude<ContestDivision, "custom">;
const ORDER: Division[] = ["div4", "div3", "div2", "div1"];

export function ContestSetup({
  handle,
  onStart,
  starting,
}: {
  handle: string;
  onStart: (contest: VirtualContest) => void;
  starting?: boolean;
}) {
  const [division, setDivision] = useState<Division>("div3");
  const [slots, setSlots] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [building, setBuilding] = useState(false);

  const config = DIVISIONS[division];
  const slotCount = slots ?? config.slots.length;
  const duration = minutes ?? config.minutes;

  async function build() {
    setBuilding(true);
    try {
      const res = await fetch("/api/cf/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division, handle, slots: slotCount }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not assemble a contest");

      const problems = body.problems as ContestProblemRef[];
      onStart({
        id: `${division}-${Date.now().toString(36)}`,
        name: body.name,
        division,
        durationSeconds: duration * 60,
        problems,
        createdAt: Date.now(),
        startedAt: Date.now(),
        pausedMs: 0,
        pausedAt: null,
        finishedAt: null,
        states: Object.fromEntries(
          problems.map((p) => [
            `${p.contestId}-${p.index}`,
            { key: `${p.contestId}-${p.index}`, state: "unsolved" as const, wrongAttempts: 0 },
          ]),
        ),
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Choose a division</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted">
              Each slot is filled with an unsolved problem inside that
              letter&apos;s usual rating window.
            </p>
          </div>
        </CardHeader>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {ORDER.map((d) => {
            const c = DIVISIONS[d];
            const active = d === division;
            const lo = c.slots[0].rating[0];
            const hi = c.slots.at(-1)!.rating[1];
            return (
              <button
                key={d}
                onClick={() => {
                  setDivision(d);
                  setSlots(null);
                  setMinutes(null);
                }}
                className={cn(
                  "cursor-pointer rounded-xl border p-4 text-left transition-all",
                  active
                    ? "border-accent/40 bg-accent-soft shadow-[var(--shadow-xs)]"
                    : "border-line bg-elevated hover:border-line-strong",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      active ? "text-accent" : "text-ink",
                    )}
                  >
                    {c.name}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-muted">
                    {c.minutes}m
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] tabular-nums text-faint">
                  {lo}&ndash;{hi} &middot; {c.slots.length} problems
                </p>
                <div className="mt-2.5 flex gap-1">
                  {c.slots.map((s) => (
                    <span
                      key={s.index}
                      className="grid h-5 flex-1 place-items-center rounded text-[10px] font-bold"
                      style={{
                        color: ratingColor(s.rating[0]),
                        backgroundColor: `color-mix(in srgb, ${ratingColor(s.rating[0])} 15%, transparent)`,
                      }}
                    >
                      {s.index}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="lg:sticky lg:top-6">
        <CardHeader>
          <div>
            <CardTitle>{config.name}</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted">
              Adjust before the clock starts.
            </p>
          </div>
        </CardHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Problems" htmlFor="slots">
              <Input
                id="slots"
                type="number"
                min={2}
                max={config.slots.length}
                value={slotCount}
                onChange={(e) => setSlots(Number(e.target.value))}
                className="font-mono tabular-nums"
              />
            </Field>
            <Field label="Minutes" htmlFor="minutes">
              <Input
                id="minutes"
                type="number"
                min={15}
                max={300}
                step={15}
                value={duration}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="font-mono tabular-nums"
              />
            </Field>
          </div>

          <div>
            <SectionLabel className="mb-2">Slots</SectionLabel>
            <ul className="space-y-1">
              {config.slots.slice(0, slotCount).map((s) => (
                <li
                  key={s.index}
                  className="flex items-center justify-between rounded-lg bg-elevated px-2.5 py-1.5"
                >
                  <span className="text-[13px] font-semibold text-ink">{s.index}</span>
                  <span className="font-mono text-[11px] tabular-nums text-muted">
                    {s.rating[0]}&ndash;{s.rating[1]}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-faint">
                    {pointsForIndex(s.index)} pts
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-lg bg-sunken px-3 py-2 text-[11px] leading-relaxed text-muted">
            Verdicts come from your real Codeforces submissions during the
            window. Submit on Codeforces as normal and the scoreboard follows.
          </p>

          <Button
            variant="accent"
            className="w-full"
            onClick={build}
            disabled={building || starting}
          >
            {building || starting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Play />
            )}
            Start {config.name}
          </Button>
        </div>
      </Card>
    </div>
  );
}
