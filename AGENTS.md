<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## GitHub synchronization

The user has authorized committing and pushing task-related changes whenever preparing/starting
a training day or making requested changes. Complete appropriate checks, commit the relevant
files, push to the configured GitHub remote and verify the remote commit without asking again.
Preserve unrelated work and exclude secrets; do not force push. For coaching changes, keep the
canonical plan in the sibling CODEFORCES repository and this app's generated mirror synchronized,
and push both repositories when both change. Verify the hosted program/day/version before
reporting a day as live; a local update or Git push alone does not establish deployment success.
