import type {
  CheckpointAssessment,
  ControlGap,
  DeliveryCommandSnapshot,
  DeliveryKpis,
  DeliveryTask,
  WorkloadCollision
} from "./types.ts";

const DAY_MS = 86_400_000;

function parseDateOnly(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isCurrentTask(snapshot: DeliveryCommandSnapshot, task: DeliveryTask) {
  if (task.status === "done" || task.status === "cancelled") return false;
  const parent = snapshot.deliverables.find((deliverable) => deliverable.id === task.deliverableId);
  return !parent || (parent.status !== "done" && parent.status !== "cancelled");
}

export function subtractBusinessDays(value: string, days: number) {
  const date = parseDateOnly(value);
  let remaining = days;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() - 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return dateOnly(date);
}

export function diffDays(from: string, to: string) {
  return Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / DAY_MS);
}

export function assessCheckpoint(
  snapshot: DeliveryCommandSnapshot,
  checkpointId: string,
  today: string
): CheckpointAssessment {
  const checkpoint = snapshot.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) throw new Error(`Unknown checkpoint: ${checkpointId}`);
  if (!checkpoint.plannedDate) {
    return {
      checkpointId,
      readiness: "unavailable",
      completionPercent: 0,
      completedRequired: 0,
      totalRequired: checkpoint.requiredTaskIds.length,
      latestSafeDate: null,
      reasons: ["Checkpoint date is unavailable."]
    };
  }

  const required = checkpoint.requiredTaskIds
    .map((id) => snapshot.tasks.find((task) => task.id === id))
    .filter((task): task is DeliveryTask => Boolean(task));
  const completedRequired = required.filter((task) => task.status === "done").length;
  const totalRequired = checkpoint.requiredTaskIds.length;
  const completionPercent = totalRequired === 0 ? 100 : Math.round((completedRequired / totalRequired) * 100);
  const reviewDays = checkpoint.internalReviewBusinessDays + checkpoint.clientReviewBusinessDays;
  const latestSafeDate = subtractBusinessDays(checkpoint.plannedDate, reviewDays);
  const reasons: string[] = [];

  const blocked = required.filter((task) => task.status === "blocked");
  if (blocked.length) reasons.push(`${blocked.length} required item${blocked.length === 1 ? " is" : "s are"} blocked.`);

  const overdue = required.filter(
    (task) => task.status !== "done" && task.currentDue !== null && task.currentDue < today
  );
  if (overdue.length) reasons.push(`${overdue.length} required item${overdue.length === 1 ? " is" : "s are"} overdue.`);

  const missing = checkpoint.requiredTaskIds.length - required.length;
  if (missing) reasons.push(`${missing} required task reference${missing === 1 ? " is" : "s are"} missing.`);

  const criticalOpen = required.filter(
    (task) => checkpoint.criticalTaskIds.includes(task.id) && task.status !== "done"
  );
  if (criticalOpen.length && latestSafeDate < today) reasons.push("A critical prerequisite is past its latest-safe date.");

  const evidenceMissing = Math.max(0, checkpoint.expectedEvidenceCount - checkpoint.evidenceUrls.length);
  if (evidenceMissing) reasons.push(`${evidenceMissing} completion evidence item${evidenceMissing === 1 ? " is" : "s are"} missing.`);

  let readiness: CheckpointAssessment["readiness"] = "at-risk";
  if (blocked.length || overdue.length || missing || (criticalOpen.length && latestSafeDate < today)) readiness = "behind";
  else if (completedRequired === totalRequired && evidenceMissing === 0) readiness = "ready";
  else reasons.push("Required work or evidence remains open.");

  return { checkpointId, readiness, completionPercent, completedRequired, totalRequired, latestSafeDate, reasons };
}

export function findControlGaps(snapshot: DeliveryCommandSnapshot): ControlGap[] {
  const gaps: ControlGap[] = [];
  for (const task of snapshot.tasks) {
    if (!isCurrentTask(snapshot, task)) continue;
    if (!task.owner && !task.clientOwned) gaps.push({
      id: `owner-${task.id}`, kind: "owner", projectId: task.projectId, workId: task.id,
      message: `${task.name} has no owner.`, mondayUrl: task.mondayUrl
    });
    if (!task.currentDue) gaps.push({
      id: `date-${task.id}`, kind: "date", projectId: task.projectId, workId: task.id,
      message: `${task.name} has no due date.`, mondayUrl: task.mondayUrl
    });
    if (!task.checkpointIds.length) gaps.push({
      id: `checkpoint-${task.id}`, kind: "checkpoint", projectId: task.projectId, workId: task.id,
      message: `${task.name} is not linked to a checkpoint.`, mondayUrl: task.mondayUrl
    });
  }
  for (const deliverable of snapshot.deliverables) {
    if (!snapshot.tasks.some((task) => task.deliverableId === deliverable.id) && deliverable.status !== "done") gaps.push({
      id: `breakdown-${deliverable.id}`, kind: "breakdown", projectId: deliverable.projectId, workId: deliverable.id,
      message: `${deliverable.name} has no task breakdown.`, mondayUrl: deliverable.mondayUrl
    });
  }
  for (const project of snapshot.projects) {
    const openDeliverables = snapshot.deliverables.filter((deliverable) => deliverable.projectId === project.id && deliverable.status !== "done" && deliverable.status !== "cancelled");
    if (openDeliverables.length && !openDeliverables.some((deliverable) => deliverable.dependencyIds.length)) gaps.push({
      id: `dependency-${project.id}`, kind: "dependency", projectId: project.id, workId: project.id,
      message: `${project.name} has no mapped Monday dependencies; sequencing is inferred from dates and checkpoints.`, mondayUrl: project.mondayUrl
    });
  }
  for (const checkpoint of snapshot.checkpoints) {
    if (!checkpoint.startsAt || !checkpoint.outlookEventId) gaps.push({
      id: `meeting-${checkpoint.id}`, kind: "meeting", projectId: checkpoint.projectId, workId: checkpoint.id,
      message: `${checkpoint.name} is not mapped to an Outlook event.`, mondayUrl: null
    });
    if (checkpoint.expectedEvidenceCount > checkpoint.evidenceUrls.length) gaps.push({
      id: `evidence-${checkpoint.id}`, kind: "evidence", projectId: checkpoint.projectId, workId: checkpoint.id,
      message: `${checkpoint.name} is missing required completion evidence.`, mondayUrl: null
    });
  }
  return gaps;
}

export function rankPullForwardTasks(snapshot: DeliveryCommandSnapshot, today: string) {
  const priority = { critical: 0, high: 1, normal: 2, low: 3 };
  return snapshot.tasks
    .filter((task) => isCurrentTask(snapshot, task))
    .filter((task) => task.status === "not-started" || task.status === "working" || task.status === "in-review")
    .filter((task) => !task.clientOwned && task.blockedBy.length === 0)
    .sort((a, b) => {
      const priorityDiff = priority[a.priority] - priority[b.priority];
      if (priorityDiff) return priorityDiff;
      const aDate = a.latestSafeDate ?? a.currentDue ?? "9999-12-31";
      const bDate = b.latestSafeDate ?? b.currentDue ?? "9999-12-31";
      const dateDiff = aDate.localeCompare(bDate);
      if (dateDiff) return dateDiff;
      const overdueA = aDate < today ? 0 : 1;
      const overdueB = bDate < today ? 0 : 1;
      return overdueA - overdueB || a.name.localeCompare(b.name);
    });
}

export function findWorkloadCollisions(snapshot: DeliveryCommandSnapshot): WorkloadCollision[] {
  const groups = new Map<string, DeliveryTask[]>();
  for (const task of snapshot.tasks) {
    if (!isCurrentTask(snapshot, task) || !task.owner || !task.currentDue || task.clientOwned) continue;
    const key = `${task.owner}|${task.currentDue}`;
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return [...groups.entries()]
    .filter(([, tasks]) => tasks.length > 1 && new Set(tasks.map((task) => task.projectId)).size > 1)
    .map(([key, tasks]) => {
      const [owner, dueDate] = key.split("|");
      return { owner, dueDate, taskIds: tasks.map((task) => task.id) };
    });
}

export function tasksForWeek(snapshot: DeliveryCommandSnapshot, weekStart: string) {
  const end = new Date(parseDateOnly(weekStart));
  end.setUTCDate(end.getUTCDate() + 6);
  const weekEnd = dateOnly(end);
  return snapshot.tasks.filter((task) => task.currentDue && task.currentDue >= weekStart && task.currentDue <= weekEnd);
}

export function calculateKpis(snapshot: DeliveryCommandSnapshot, today: string): DeliveryKpis {
  const sevenDays = new Date(parseDateOnly(today));
  sevenDays.setUTCDate(sevenDays.getUTCDate() + 7);
  const nextSeven = dateOnly(sevenDays);
  const open = snapshot.tasks.filter((task) => isCurrentTask(snapshot, task));
  const forecastVarianceDays = snapshot.deliverables.reduce((sum, deliverable) => {
    if (!deliverable.baselineDue || !deliverable.currentDue) return sum;
    return sum + Math.max(0, diffDays(deliverable.baselineDue, deliverable.currentDue));
  }, 0);
  return {
    overdue: open.filter((task) => task.currentDue && task.currentDue < today).length,
    blocked: open.filter((task) => task.status === "blocked").length,
    dueNextSevenDays: open.filter((task) => task.currentDue && task.currentDue >= today && task.currentDue <= nextSeven).length,
    awaitingClient: open.filter((task) => task.clientOwned).length,
    missingControlData: findControlGaps(snapshot).length,
    forecastVarianceDays
  };
}
