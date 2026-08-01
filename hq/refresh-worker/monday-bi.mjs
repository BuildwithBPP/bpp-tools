const CLIENT_PROJECTS_BOARD_ID = "18406004595";
const TEMPLATE_GROUP_ID = "new_group29179";

function normalized(value) {
  return String(value ?? "").trim().toLowerCase();
}

function statusText(item) {
  const values = item?.column_values ?? [];
  return values.find((column) => column.id === "project_status")?.text
    ?? values.find((column) => column.type === "status")?.text
    ?? "";
}

function isDone(item) {
  return /^(done|complete|completed|closed)$/i.test(statusText(item).trim());
}

function isInProgress(item) {
  return /(in progress|working on it|working|active)/i.test(statusText(item));
}

function dueDate(item) {
  const values = item?.column_values ?? [];
  const column = values.find((value) => value.id === "date_mm22kzfc")
    ?? values.find((value) => value.type === "date");
  if (!column) return null;
  try {
    const parsed = JSON.parse(column.value || "null");
    if (parsed?.date) return String(parsed.date).slice(0, 10);
  } catch {
    // Monday also supplies a normalized text value, which is the safe fallback.
  }
  const match = String(column.text ?? "").match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function isOverdue(item, today) {
  const due = dueDate(item);
  return Boolean(due && due < today && !isDone(item));
}

function latestTimestamp(items) {
  return items
    .map((item) => item?.updated_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function isTemplateGroup(group) {
  return group?.id === TEMPLATE_GROUP_ID || /new client template/i.test(group?.title ?? "");
}

export function summarizeMondaySnapshot(snapshot, now = new Date()) {
  if (!snapshot || snapshot.source !== "monday") {
    throw new Error("A valid Monday snapshot is required.");
  }
  if (!Array.isArray(snapshot.records)) {
    throw new Error("Monday snapshot records must be an array.");
  }

  const board = snapshot.records.find((record) => (
    record?.kind === "board" && String(record.id) === CLIENT_PROJECTS_BOARD_ID
  ));
  const today = now.toISOString().slice(0, 10);
  const byClient = new Map();

  for (const deliverable of board?.items ?? []) {
    const group = deliverable.group ?? {};
    if (isTemplateGroup(group)) continue;
    const id = String(group.id ?? "").trim();
    const client = String(group.title ?? "").trim();
    if (!id || !client) continue;

    const record = byClient.get(id) ?? {
      id,
      client,
      deliverables: [],
      tasks: []
    };
    record.deliverables.push(deliverable);
    record.tasks.push(...(deliverable.subitems ?? []));
    byClient.set(id, record);
  }

  const clients = [...byClient.values()].map((client) => {
    const allWork = [...client.deliverables, ...client.tasks];
    const overdueWork = allWork.filter((item) => isOverdue(item, today)).length;
    return {
      id: client.id,
      client: client.client,
      open_deliverables: client.deliverables.filter((item) => !isDone(item)).length,
      open_tasks: client.tasks.filter((item) => !isDone(item)).length,
      overdue_work: overdueWork,
      last_updated: latestTimestamp(allWork),
      health: overdueWork ? "at-risk" : "current"
    };
  }).sort((left, right) => normalized(left.client).localeCompare(normalized(right.client)));

  const allDeliverables = [...byClient.values()].flatMap((client) => client.deliverables);
  const allTasks = [...byClient.values()].flatMap((client) => client.tasks);
  const allWork = [...allDeliverables, ...allTasks];

  return {
    schema_version: 1,
    source: "monday",
    captured_at: snapshot.captured_at,
    record_count: snapshot.records.length,
    metrics: {
      tracked_client_count: clients.length,
      open_deliverable_count: allDeliverables.filter((item) => !isDone(item)).length,
      open_task_count: allTasks.filter((item) => !isDone(item)).length,
      overdue_work_count: allWork.filter((item) => isOverdue(item, today)).length,
      at_risk_client_count: clients.filter((client) => client.health === "at-risk").length,
      in_progress_work_count: allWork.filter(isInProgress).length
    },
    clients
  };
}
