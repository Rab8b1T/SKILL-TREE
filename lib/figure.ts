/**
 * Diagrams as data.
 *
 * A hint about an array is a hint about *these* numbers, so the picture has to
 * agree with them exactly. That rules out generated raster art: a model asked
 * for "an array with 3 1 4 1 5 highlighted at index 2" will hand back something
 * plausible and wrong, and a wrong diagram inside a hint is worse than no
 * diagram, because it is trusted. So a figure is a spec — the same numbers the
 * statement uses, laid out by code — and the renderer is the only thing that
 * decides where a box goes.
 *
 * It also happens to be small. A figure is a few hundred bytes of JSON inside
 * the day plan, against a megabyte or so for a 1024px PNG, which is the
 * difference between committing a thousand problems' worth of diagrams to git
 * and needing an object store and an upload step for them.
 *
 * Everything here is pure and deterministic: same spec, same picture, forever.
 */

/** Semantic colour, resolved to a theme token by the renderer. */
export type Tone = "neutral" | "accent" | "good" | "warn" | "bad" | "muted";

export type Cell = string | number | null;

/** A single index, or an inclusive `[from, to]` span. */
export type Span = number | [number, number];

export interface CellMark {
  at: Span;
  tone: Tone;
  /** Sits above the cells, e.g. "sum = 9" or "window". */
  label?: string;
}

export interface Pointer {
  at: number;
  /** Short, because it hangs under one cell: "i", "lo", "hi". */
  label: string;
  tone?: Tone;
}

interface Common {
  /** One line under the figure, explaining what to look at. */
  caption?: string;
}

/** A row of boxes. The workhorse: arrays, strings, prefix sums, windows. */
export interface ArrayFigure extends Common {
  kind: "array";
  cells: Cell[];
  /** Shows a 0-based index above each cell. Off by default — it adds noise. */
  indexed?: boolean;
  /** Index labels start here instead, for a 1-based statement. */
  indexFrom?: number;
  marks?: CellMark[];
  pointers?: Pointer[];
  /** Row label to the left, for stacking two arrays in one hint. */
  label?: string;
}

/** Two dimensions of the same thing. Grids, DP tables, matrices. */
export interface GridFigure extends Common {
  kind: "grid";
  rows: Cell[][];
  marks?: { at: [number, number]; tone: Tone }[];
  /** Column and row headers, e.g. DP axes. */
  columns?: string[];
  rowLabels?: string[];
}

/**
 * A rooted tree from a parent array, which is how Codeforces states them.
 *
 * `parent[i]` is the 0-based parent of node `i`, or `null` for the root.
 */
export interface TreeFigure extends Common {
  kind: "tree";
  parent: (number | null)[];
  /** Node text. Defaults to the 1-based index, matching the statement. */
  labels?: Cell[];
  marks?: { node: number; tone: Tone }[];
  /** Colours the edge from this node up to its parent. */
  edgeMarks?: { node: number; tone: Tone; label?: string }[];
}

/** A number line. Binary search on the answer, thresholds, feasible ranges. */
export interface LineFigure extends Common {
  kind: "line";
  from: number;
  to: number;
  ticks?: number[];
  spans?: { from: number; to: number; tone: Tone; label?: string }[];
  points?: { at: number; label?: string; tone?: Tone }[];
}

/** A vertical chain of steps. The "if this, then that" of a hint. */
export interface FlowFigure extends Common {
  kind: "flow";
  steps: { text: string; tone?: Tone; /** Label on the arrow into this step. */ via?: string }[];
}

export type Figure =
  | ArrayFigure
  | GridFigure
  | TreeFigure
  | LineFigure
  | FlowFigure;

/* ---------------------------------------------------------------- layout --- */

export interface TreeNode {
  id: number;
  depth: number;
  /** Column, in units of one node width. Fractional for internal nodes. */
  x: number;
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: { child: number; parent: number }[];
  width: number;
  depth: number;
}

/**
 * Tidy layout for a parent array: leaves take the next free column, an internal
 * node centres over its children.
 *
 * Written to survive a spec that is not a tree. That is not hypothetical
 * defensiveness — on 2026-08-23 a generator emitted a vertex that was its own
 * parent and the consumer walked it with no visited set, which grew at 230 MB/s
 * until the machine had to be force-restarted. A malformed figure should draw
 * badly, never hang, so every traversal here is bounded by the node count and
 * anything unreachable from the root is simply dropped.
 */
export function layoutTree(parent: (number | null)[]): TreeLayout {
  const n = parent.length;
  if (n === 0) return { nodes: [], edges: [], width: 0, depth: 0 };

  const children: number[][] = Array.from({ length: n }, () => []);
  let root = -1;
  for (let i = 0; i < n; i++) {
    const p = parent[i];
    // A self-parent or an out-of-range parent is treated as a root rather than
    // trusted, so a cycle can never be entered in the first place.
    if (p == null || p === i || p < 0 || p >= n) {
      if (root === -1) root = i;
    } else {
      children[p].push(i);
    }
  }
  if (root === -1) root = 0;

  const depth = new Map<number, number>();
  const order: number[] = [];
  const stack: { id: number; d: number }[] = [{ id: root, d: 0 }];
  // The visited check is the load-bearing line: it bounds this loop at n
  // iterations whatever the parent array claims.
  while (stack.length > 0 && order.length <= n) {
    const { id, d } = stack.pop()!;
    if (depth.has(id)) continue;
    depth.set(id, d);
    order.push(id);
    for (const c of children[id]) stack.push({ id: c, d: d + 1 });
  }

  const x = new Map<number, number>();
  let nextColumn = 0;

  // Post-order without recursion: a long chain would blow the JS stack, and the
  // same code has to serve a 6-node hint and a pathological line graph. Children
  // are pushed in reverse so they pop left to right, which is what keeps the
  // drawing in the statement's order.
  const post: number[] = [];
  const queued = new Set<number>([root]);
  const work: { id: number; expanded: boolean }[] = [{ id: root, expanded: false }];
  while (work.length > 0) {
    const top = work[work.length - 1];
    if (!top.expanded) {
      top.expanded = true;
      const kids = children[top.id];
      for (let i = kids.length - 1; i >= 0; i--) {
        const c = kids[i];
        if (depth.has(c) && !queued.has(c)) {
          queued.add(c);
          work.push({ id: c, expanded: false });
        }
      }
      continue;
    }
    work.pop();
    post.push(top.id);
  }

  // Min and max by loop, not by spreading into Math.max: a node's children are
  // an argument list there, and a 200k-leaf star overflows the call stack.
  for (const id of post) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of children[id]) {
      const cx = x.get(c);
      if (cx == null) continue;
      if (cx < lo) lo = cx;
      if (cx > hi) hi = cx;
    }
    x.set(id, hi === -Infinity ? nextColumn++ : (lo + hi) / 2);
  }

  const nodes: TreeNode[] = order
    .filter((id) => x.has(id))
    .map((id) => ({ id, depth: depth.get(id)!, x: x.get(id)! }))
    .sort((a, b) => a.depth - b.depth || a.x - b.x);

  const edges = nodes
    .filter((node) => {
      const p = parent[node.id];
      return p != null && p !== node.id && x.has(p);
    })
    .map((node) => ({ child: node.id, parent: parent[node.id] as number }));

  return {
    nodes,
    edges,
    width: nextColumn,
    depth: nodes.reduce((d, node) => Math.max(d, node.depth), 0) + 1,
  };
}

/** Expands a mark's span into the indices it covers. */
export function spanIndices(at: Span, length: number): number[] {
  const [from, to] = typeof at === "number" ? [at, at] : at;
  const lo = Math.max(0, Math.min(from, to));
  const hi = Math.min(length - 1, Math.max(from, to));
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}
