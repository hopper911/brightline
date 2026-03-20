export type SchedulingInputs = {
  urgency: "low" | "normal" | "high";
  currentWorkload: { shootsScheduled: number; editsBacklog: number; deliveriesBacklog: number };
  deadlines?: { shootBy?: string; deliverBy?: string } | null;
};

export type SchedulingSuggestion = {
  suggestedDateRanges: { start: string; end: string }[];
  reasoning: string[];
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function suggestShootDates(input: SchedulingInputs): SchedulingSuggestion {
  const now = new Date().toISOString();
  const baseLeadDays = input.urgency === "high" ? 2 : input.urgency === "low" ? 10 : 5;

  const loadPenalty =
    Math.min(14, input.currentWorkload.shootsScheduled) +
    Math.min(14, Math.floor(input.currentWorkload.editsBacklog / 2)) +
    Math.min(14, Math.floor(input.currentWorkload.deliveriesBacklog / 2));

  const start = addDays(now, baseLeadDays + Math.floor(loadPenalty / 4));
  const end = addDays(start, 3);

  const ranges = [{ start, end }];

  const reasoning: string[] = [
    `Urgency set to ${input.urgency}.`,
    `Current workload: ${input.currentWorkload.shootsScheduled} shoots scheduled, ${input.currentWorkload.editsBacklog} edits backlog, ${input.currentWorkload.deliveriesBacklog} deliveries backlog.`,
  ];

  if (input.deadlines?.shootBy) {
    reasoning.push(`Shoot-by deadline: ${input.deadlines.shootBy}.`);
  }
  if (input.deadlines?.deliverBy) {
    reasoning.push(`Deliver-by deadline: ${input.deadlines.deliverBy}.`);
  }

  reasoning.push("Suggestion is a time window only; confirm availability and client preference before booking.");

  return { suggestedDateRanges: ranges, reasoning };
}

export function detectSchedulingConflicts(params: {
  proposed: { start: string; end: string };
  existing: { start: string; end: string; label?: string }[];
}): { conflicts: { with: string; overlapStart: string; overlapEnd: string }[] } {
  const ps = new Date(params.proposed.start).getTime();
  const pe = new Date(params.proposed.end).getTime();
  const conflicts = [];
  for (const e of params.existing) {
    const es = new Date(e.start).getTime();
    const ee = new Date(e.end).getTime();
    const overlapStart = Math.max(ps, es);
    const overlapEnd = Math.min(pe, ee);
    if (overlapStart < overlapEnd) {
      conflicts.push({
        with: e.label ?? "existing booking",
        overlapStart: new Date(overlapStart).toISOString(),
        overlapEnd: new Date(overlapEnd).toISOString(),
      });
    }
  }
  return { conflicts };
}

