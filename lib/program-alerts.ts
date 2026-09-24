/** Stable server notice IDs are shared by the live view and reopened sessions. */
export type ProgramNotice = {
  id: string;
  kind: "phase-expired" | "problem-expired" | "accepted";
  block: string;
  key?: string;
  at: number;
};

export function recordProgramNotice(seen: string[], notice: ProgramNotice, now: number, options: {newlyObserved?: boolean} = {}) {
  if (seen.includes(notice.id) || notice.at > now) return {seen, shouldAlert: false};
  return {
    seen: [...seen, notice.id].slice(-500),
    // Existing acceptance history is already shown on problem cards. An expired
    // timer still needs a visible decision when the learner returns much later.
    shouldAlert: notice.kind !== "accepted" || options.newlyObserved === true || now - notice.at <= 90_000,
  };
}

export function programNoticeMessage(notice: ProgramNotice, names: Record<string, string>, now: number) {
  const label = notice.key ? names[`${notice.block}:${notice.key}`] ?? "Problem" : names[notice.block] ?? "Phase";
  return {
    title: notice.kind === "accepted" ? `${label}: accepted` : `${label}: time finished`,
    body: notice.kind === "accepted"
      ? "The judge’s acceptance is verified and saved. Check the current problem queue to continue."
      : `${now - notice.at > 90_000 ? "This timer expired while you were away. " : ""}Your practice clock is paused. Choose how to continue on the session page.`,
  };
}
