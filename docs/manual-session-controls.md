# Manual training sessions

Phases advance only through **Next**. The next phase is ready until the learner starts it.
Start/Pause/Resume controls belong to the current phase; selecting a tab only changes the view.
At problem or phase expiry, the active-work timer stops at the exact deadline and waits for a choice.

Problem caps use the tighter of the authored cap and a difficulty target, scaled down if the queue
would exceed its available practice budget. Codeforces targets are 10/15/20/30/40/50/60 minutes
for ratings up to 800/1000/1200/1400/1600/1800/above respectively; LeetCode targets are
15/30/40 minutes for Easy/Medium/Hard. Core allocation reserves the authored lesson time.
These are coaching defaults, not promises about how long a particular problem should take.

Skipping closes the attempt as incomplete and starts the next eligible queued problem. Guided
work has a separate elapsed timer while the active-work budget is paused. Finishing it advances
the queue. Guidance permanently records assistance; later reporting “solved” cannot erase it.
Contest help ends the contest before entering guided review. A judge accept and a completion
report are separate facts. Previously accepted contest problems are optional review re-solves.

Server timestamps, active intervals and idempotent event IDs preserve clocks across reloads,
closed tabs, network gaps and duplicate requests. A running clock keeps counting until its
deadline; a paused clock stays paused. Unacknowledged actions remain recoverable, and stale
actions cannot silently advance a different phase after a concurrent change. Old sessions migrate
at their last evidenced phase, preserving snapshots, judge results and untouched later budgets.

Sound requires a browser gesture. The page provides enable/test/mute controls and optional desktop
notifications. Judge checks run while the page is open and connected. Missed deadlines appear on
return; no sound is promised while the browser is closed. Browser behavior references:
[audio autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) and
[desktop notifications](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API).

## Verification

Run `npm test` and `npx tsc --noEmit`. Manual-state and server tests cover expiry, phase transitions,
pause/resume, guidance, immutable assistance, judge attribution, migration, ownership and retries.

For a browser rehearsal, first build the app CSS, then run:

```sh
node --import tsx scripts/verify-program-ui.mjs
```

Open `http://127.0.0.1:8877`. This renders the real coaching component with fictional in-memory
data and the real timing rules, without credentials, MongoDB or external judge requests. The QA
toolbar can advance time, simulate an accept or an outage, drop one action response, and load a
completed legacy review. It binds only to localhost and is separate from the deployed application.
Verify Start → Pause → reload → Resume, deadline → incomplete/next or help → Pause → complete,
manual Next for all four phases, sound/test/mute, reconnect and lost-response retry.
