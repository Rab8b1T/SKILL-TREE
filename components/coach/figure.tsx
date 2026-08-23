import * as React from "react";
import {
  type ArrayFigure,
  type Cell,
  type Figure,
  type FlowFigure,
  type GridFigure,
  type LineFigure,
  type Tone,
  type TreeFigure,
  layoutTree,
  spanIndices,
} from "@/lib/figure";
import { cn } from "@/lib/utils";

/**
 * Renders a figure spec as SVG.
 *
 * Everything is drawn in a `viewBox` and scaled to the container, so one spec
 * serves the phone and the desktop, and every colour is a theme token, so the
 * diagram follows the light/dark toggle instead of being baked at author time.
 * Both are things a shipped raster image cannot do.
 */

const TONE: Record<Tone, string> = {
  neutral: "var(--line-strong)",
  accent: "var(--accent)",
  good: "var(--positive)",
  warn: "var(--warning)",
  bad: "var(--negative)",
  muted: "var(--muted)",
};

/** Tinted fill, so a marked cell reads as emphasis rather than as a new object. */
function wash(tone: Tone, strength = 14): string {
  return `color-mix(in srgb, ${TONE[tone]} ${strength}%, transparent)`;
}

const CELL = 44;
const GAP = 6;
const STEP = CELL + GAP;

function text(value: Cell): string {
  return value == null ? "" : String(value);
}

/** Shrinks the glyphs rather than the box once a label stops fitting. */
function fontFor(value: string, base = 15): number {
  if (value.length <= 2) return base;
  if (value.length <= 4) return base - 2;
  return Math.max(9, base - 4);
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <figcaption className="mt-2 text-xs leading-relaxed text-muted">
      {children}
    </figcaption>
  );
}

function Frame({
  width,
  height,
  label,
  className,
  children,
}: {
  width: number;
  height: number;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="auto"
      role="img"
      aria-label={label ?? "diagram"}
      className={cn("max-w-full overflow-visible", className)}
      style={{ maxHeight: height * 1.1 }}
    >
      {children}
    </svg>
  );
}

/* ----------------------------------------------------------------- array --- */

function ArrayView({ spec }: { spec: ArrayFigure }) {
  const n = spec.cells.length;
  const marks = spec.marks ?? [];
  const pointers = spec.pointers ?? [];

  const hasBands = marks.some((m) => m.label);
  const bandH = hasBands ? 22 : 0;
  const indexH = spec.indexed ? 18 : 0;
  const pointerH = pointers.length > 0 ? 26 : 0;
  const labelW = spec.label ? 58 : 0;

  const top = bandH + indexH;
  const width = labelW + n * STEP;
  const height = top + CELL + pointerH;

  const toneOf = (i: number): Tone | null => {
    for (const m of marks) {
      if (spanIndices(m.at, n).includes(i)) return m.tone;
    }
    return null;
  };

  return (
    <Frame width={width} height={height} label={spec.caption}>
      {spec.label && (
        <text
          x={0}
          y={top + CELL / 2}
          fontSize={13}
          fill="var(--muted)"
          fontFamily="var(--font-mono)"
          dominantBaseline="central"
        >
          {spec.label}
        </text>
      )}

      {marks
        .filter((m) => m.label)
        .map((m, k) => {
          const idx = spanIndices(m.at, n);
          if (idx.length === 0) return null;
          const x0 = labelW + idx[0] * STEP;
          const x1 = labelW + idx[idx.length - 1] * STEP + CELL;
          return (
            <g key={`band-${k}`}>
              <line
                x1={x0}
                y1={bandH - 6}
                x2={x1}
                y2={bandH - 6}
                stroke={TONE[m.tone]}
                strokeWidth={1.5}
              />
              <text
                x={(x0 + x1) / 2}
                y={bandH - 13}
                fontSize={11}
                fill={TONE[m.tone]}
                textAnchor="middle"
                fontFamily="var(--font-sans)"
              >
                {m.label}
              </text>
            </g>
          );
        })}

      {spec.cells.map((cell, i) => {
        const tone = toneOf(i);
        const value = text(cell);
        const x = labelW + i * STEP;
        return (
          <g key={`cell-${i}`}>
            {spec.indexed && (
              <text
                x={x + CELL / 2}
                y={bandH + 8}
                fontSize={10}
                fill="var(--muted)"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {i + (spec.indexFrom ?? 0)}
              </text>
            )}
            <rect
              x={x}
              y={top}
              width={CELL}
              height={CELL}
              rx={8}
              fill={tone ? wash(tone) : "var(--sunken)"}
              stroke={tone ? TONE[tone] : "var(--line)"}
              strokeWidth={tone ? 1.75 : 1}
            />
            <text
              x={x + CELL / 2}
              y={top + CELL / 2}
              fontSize={fontFor(value)}
              fill={tone ? TONE[tone] : "var(--ink)"}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-mono)"
              fontWeight={tone ? 600 : 400}
            >
              {value}
            </text>
          </g>
        );
      })}

      {pointers.map((p, k) => {
        const x = labelW + p.at * STEP + CELL / 2;
        const tone = p.tone ?? "accent";
        return (
          <g key={`ptr-${k}`}>
            <path
              d={`M ${x} ${top + CELL + 3} l -4 7 l 8 0 z`}
              fill={TONE[tone]}
            />
            <text
              x={x}
              y={top + CELL + 20}
              fontSize={11}
              fill={TONE[tone]}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontWeight={600}
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------ grid --- */

function GridView({ spec }: { spec: GridFigure }) {
  const rows = spec.rows;
  const cols = rows.reduce((w, r) => Math.max(w, r.length), 0);
  const headH = spec.columns ? 20 : 0;
  const headW = spec.rowLabels ? 34 : 0;
  const width = headW + cols * STEP;
  const height = headH + rows.length * STEP;

  const toneOf = (r: number, c: number): Tone | null =>
    spec.marks?.find((m) => m.at[0] === r && m.at[1] === c)?.tone ?? null;

  return (
    <Frame width={width} height={height} label={spec.caption}>
      {spec.columns?.map((label, c) => (
        <text
          key={`col-${c}`}
          x={headW + c * STEP + CELL / 2}
          y={headH - 8}
          fontSize={10}
          fill="var(--muted)"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
        >
          {label}
        </text>
      ))}

      {rows.map((row, r) => (
        <g key={`row-${r}`}>
          {spec.rowLabels?.[r] != null && (
            <text
              x={headW - 10}
              y={headH + r * STEP + CELL / 2}
              fontSize={10}
              fill="var(--muted)"
              textAnchor="end"
              dominantBaseline="central"
              fontFamily="var(--font-mono)"
            >
              {spec.rowLabels[r]}
            </text>
          )}
          {row.map((cell, c) => {
            const tone = toneOf(r, c);
            const value = text(cell);
            return (
              <g key={`cell-${r}-${c}`}>
                <rect
                  x={headW + c * STEP}
                  y={headH + r * STEP}
                  width={CELL}
                  height={CELL}
                  rx={8}
                  fill={tone ? wash(tone) : "var(--sunken)"}
                  stroke={tone ? TONE[tone] : "var(--line)"}
                  strokeWidth={tone ? 1.75 : 1}
                />
                <text
                  x={headW + c * STEP + CELL / 2}
                  y={headH + r * STEP + CELL / 2}
                  fontSize={fontFor(value)}
                  fill={tone ? TONE[tone] : "var(--ink)"}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--font-mono)"
                  fontWeight={tone ? 600 : 400}
                >
                  {value}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------ tree --- */

const NODE_R = 17;
const LEVEL_H = 64;
const COL_W = 52;

function TreeView({ spec }: { spec: TreeFigure }) {
  const layout = React.useMemo(() => layoutTree(spec.parent), [spec.parent]);
  const pad = NODE_R + 8;
  const width = Math.max(1, layout.width) * COL_W + pad * 2;
  const height = (layout.depth - 1) * LEVEL_H + pad * 2;

  const pos = new Map(
    layout.nodes.map((node) => [
      node.id,
      { x: pad + node.x * COL_W, y: pad + node.depth * LEVEL_H },
    ]),
  );

  const nodeTone = (id: number): Tone | null =>
    spec.marks?.find((m) => m.node === id)?.tone ?? null;
  const edgeMark = (id: number) => spec.edgeMarks?.find((m) => m.node === id);

  return (
    <Frame width={width} height={height} label={spec.caption}>
      {layout.edges.map((edge) => {
        const a = pos.get(edge.parent);
        const b = pos.get(edge.child);
        if (!a || !b) return null;
        const mark = edgeMark(edge.child);
        const tone = mark?.tone;
        return (
          <g key={`edge-${edge.child}`}>
            <line
              x1={a.x}
              y1={a.y + NODE_R}
              x2={b.x}
              y2={b.y - NODE_R}
              stroke={tone ? TONE[tone] : "var(--line-strong)"}
              strokeWidth={tone ? 2.5 : 1.5}
            />
            {mark?.label && (
              <text
                x={(a.x + b.x) / 2 + 8}
                y={(a.y + b.y) / 2}
                fontSize={10}
                fill={TONE[tone ?? "muted"]}
                dominantBaseline="central"
                fontFamily="var(--font-mono)"
              >
                {mark.label}
              </text>
            )}
          </g>
        );
      })}

      {layout.nodes.map((node) => {
        const p = pos.get(node.id)!;
        const tone = nodeTone(node.id);
        const value = text(spec.labels?.[node.id] ?? node.id + 1);
        return (
          <g key={`node-${node.id}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={NODE_R}
              fill={tone ? wash(tone, 18) : "var(--sunken)"}
              stroke={tone ? TONE[tone] : "var(--line)"}
              strokeWidth={tone ? 2 : 1}
            />
            <text
              x={p.x}
              y={p.y}
              fontSize={fontFor(value, 13)}
              fill={tone ? TONE[tone] : "var(--ink)"}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-mono)"
              fontWeight={tone ? 600 : 400}
            >
              {value}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------ line --- */

const LINE_W = 520;

function LineView({ spec }: { spec: LineFigure }) {
  const span = spec.to - spec.from || 1;
  const pad = 26;
  const axisY = 52;
  // A labelled point hangs below the tick row, so the box has to grow for it or
  // the label is clipped by the viewBox.
  const height = spec.points?.some((p) => p.label) ? 98 : 78;
  const at = (v: number) => pad + ((v - spec.from) / span) * (LINE_W - pad * 2);

  return (
    <Frame width={LINE_W} height={height} label={spec.caption}>
      <line
        x1={pad}
        y1={axisY}
        x2={LINE_W - pad}
        y2={axisY}
        stroke="var(--line-strong)"
        strokeWidth={1.5}
      />

      {spec.spans?.map((s, k) => (
        <g key={`span-${k}`}>
          <rect
            x={at(s.from)}
            y={axisY - 11}
            width={Math.max(2, at(s.to) - at(s.from))}
            height={22}
            rx={6}
            fill={wash(s.tone, 20)}
            stroke={TONE[s.tone]}
            strokeWidth={1.25}
          />
          {s.label && (
            <text
              x={(at(s.from) + at(s.to)) / 2}
              y={axisY - 20}
              fontSize={11}
              fill={TONE[s.tone]}
              textAnchor="middle"
              fontFamily="var(--font-sans)"
            >
              {s.label}
            </text>
          )}
        </g>
      ))}

      {(spec.ticks ?? [spec.from, spec.to]).map((t, k) => (
        <g key={`tick-${k}`}>
          <line
            x1={at(t)}
            y1={axisY - 5}
            x2={at(t)}
            y2={axisY + 5}
            stroke="var(--line-strong)"
            strokeWidth={1.5}
          />
          <text
            x={at(t)}
            y={axisY + 20}
            fontSize={11}
            fill="var(--muted)"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
          >
            {t}
          </text>
        </g>
      ))}

      {spec.points?.map((p, k) => {
        const tone = p.tone ?? "accent";
        return (
          <g key={`pt-${k}`}>
            <circle cx={at(p.at)} cy={axisY} r={5} fill={TONE[tone]} />
            {p.label && (
              <text
                x={at(p.at)}
                y={axisY + 34}
                fontSize={11}
                fill={TONE[tone]}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontWeight={600}
              >
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------ flow --- */

const BOX_W = 300;
const BOX_H = 46;
const FLOW_GAP = 38;

function FlowView({ spec }: { spec: FlowFigure }) {
  const height = spec.steps.length * BOX_H + (spec.steps.length - 1) * FLOW_GAP;

  return (
    <Frame width={BOX_W} height={height} label={spec.caption}>
      {spec.steps.map((step, i) => {
        const y = i * (BOX_H + FLOW_GAP);
        const tone = step.tone ?? "neutral";
        return (
          <g key={`step-${i}`}>
            {i > 0 && (
              <>
                <line
                  x1={BOX_W / 2}
                  y1={y - FLOW_GAP}
                  x2={BOX_W / 2}
                  y2={y - 8}
                  stroke="var(--line-strong)"
                  strokeWidth={1.5}
                />
                <path
                  d={`M ${BOX_W / 2} ${y} l -5 -8 l 10 0 z`}
                  fill="var(--line-strong)"
                />
                {step.via && (
                  <text
                    x={BOX_W / 2 + 9}
                    y={y - FLOW_GAP / 2 - 2}
                    fontSize={11}
                    fill="var(--muted)"
                    dominantBaseline="central"
                    fontFamily="var(--font-sans)"
                  >
                    {step.via}
                  </text>
                )}
              </>
            )}
            <rect
              x={0}
              y={y}
              width={BOX_W}
              height={BOX_H}
              rx={10}
              fill={step.tone ? wash(tone) : "var(--sunken)"}
              stroke={step.tone ? TONE[tone] : "var(--line)"}
              strokeWidth={step.tone ? 1.75 : 1}
            />
            <text
              x={BOX_W / 2}
              y={y + BOX_H / 2}
              fontSize={12}
              fill={step.tone ? TONE[tone] : "var(--ink)"}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-sans)"
            >
              {step.text}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/* -------------------------------------------------------------- dispatch --- */

export function FigureView({
  spec,
  className,
}: {
  spec: Figure;
  className?: string;
}) {
  return (
    <figure className={cn("my-3", className)}>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface/60 px-3 py-3">
        {spec.kind === "array" && <ArrayView spec={spec} />}
        {spec.kind === "grid" && <GridView spec={spec} />}
        {spec.kind === "tree" && <TreeView spec={spec} />}
        {spec.kind === "line" && <LineView spec={spec} />}
        {spec.kind === "flow" && <FlowView spec={spec} />}
      </div>
      {spec.caption && <Caption>{spec.caption}</Caption>}
    </figure>
  );
}
