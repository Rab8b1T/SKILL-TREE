/**
 * The attempt clock's alarm scheduler.
 *
 * It lives in a worker for one reason. Chrome throttles a hidden page's timers
 * to roughly one wake-up a minute, and this app is hidden for most of a real
 * session — the statement is on Codeforces and the code is in the editor. A
 * main-thread timer would therefore announce "five minutes left" at some point
 * in the following minute, which is not a warning. A dedicated worker's timers
 * are exempt from that throttling and fire on time.
 *
 * The page owns every piece of copy and all the phase arithmetic. This holds
 * absolute deadlines and says when one has passed, and nothing else.
 */

/**
 * An alarm later than this was slept through, not missed. Firing it on wake
 * would announce hint time for a problem whose whole budget expired overnight.
 */
const STALE_MS = 120_000;

let alarms = [];
let timer = null;

function stop() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function tick() {
  const now = Date.now();
  const due = alarms.filter((alarm) => alarm.at <= now);
  if (due.length === 0) return;

  alarms = alarms.filter((alarm) => alarm.at > now);
  for (const alarm of due) {
    if (now - alarm.at <= STALE_MS) {
      self.postMessage({ type: "due", id: alarm.id });
    }
  }
  if (alarms.length === 0) stop();
}

self.onmessage = (event) => {
  const message = event.data || {};

  if (message.type === "schedule") {
    alarms = (message.alarms || []).slice().sort((a, b) => a.at - b.at);
    stop();
    if (alarms.length > 0) timer = setInterval(tick, 1000);
    return;
  }

  if (message.type === "clear") {
    alarms = [];
    stop();
  }
};
