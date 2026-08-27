import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BOARD_ID = "18406004595";
const SUBITEM_BOARD_ID = "18406004597";
const scriptRoot = dirname(fileURLToPath(import.meta.url));
const hqRoot = resolve(scriptRoot, "..");
const outputPath = resolve(hqRoot, "src/data/delivery-command.json");

function column(item, id) {
  return item.column_values?.find((value) => value.id === id) ?? null;
}

function text(item, id) {
  const value = column(item, id)?.text?.trim();
  return value || null;
}

function value(item, id) {
  const raw = column(item, id)?.value;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function normalizeStatus(label) {
  const normalized = (label ?? "").toLowerCase();
  if (normalized.includes("done") || normalized.includes("complete")) return "done";
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("block") || normalized.includes("stuck")) return "blocked";
  if (normalized.includes("review")) return "in-review";
  if (normalized.includes("working") || normalized.includes("progress")) return "working";
  return "not-started";
}

function normalizePriority(label, fallback = "normal") {
  const normalized = (label ?? fallback).toLowerCase();
  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("low")) return "low";
  return "normal";
}

function normalizePhase(label, fallback = "execution") {
  const normalized = (label ?? fallback).toLowerCase();
  if (normalized.includes("init")) return "initiation";
  if (normalized.includes("plan")) return "planning";
  if (normalized.includes("monitor") || normalized.includes("review")) return "monitoring";
  if (normalized.includes("clos")) return "closure";
  return "execution";
}

function linkedIds(item) {
  const dependency = value(item, "project_dependency");
  const ids = dependency?.linkedPulseIds ?? dependency?.linkedItemIds ?? [];
  return ids.map((id) => `deliverable-${id}`);
}

function evidenceUrl(item) {
  const link = value(item, "link_mm2t3g1c");
  return link?.url ?? null;
}

function maxUpdatedAt(items, generatedAt) {
  const timestamps = items.flatMap((item) => [item.updated_at, ...(item.subitems ?? []).map((subitem) => subitem.updated_at)]).filter(Boolean).sort();
  return timestamps.at(-1) ?? generatedAt;
}

export function buildDeliverySnapshot(raw, controlConfig, generatedAt) {
  const board = raw?.data?.boards?.find((item) => String(item.id) === BOARD_ID);
  if (!board) throw new Error(`Monday response is missing board ${BOARD_ID}.`);
  const groups = new Map((board.groups ?? []).map((group) => [group.id, group]));
  const projects = controlConfig.projects;
  const projectOrder = new Map(projects.map((project, index) => [project.id, index]));
  const deliverables = [];
  const tasks = [];
  const includedParents = [];

  for (const project of projects) {
    const group = groups.get(project.groupId);
    for (const item of group?.items_page?.items ?? []) {
      includedParents.push(item);
      const baseline = controlConfig.baselines.deliverables[String(item.id)] ?? {};
      const timeline = value(item, "project_timeline");
      const currentStart = timeline?.from ?? baseline.currentStart ?? baseline.baselineStart ?? null;
      const currentDue = timeline?.to ?? text(item, "date_mm22kzfc") ?? baseline.currentDue ?? baseline.baselineDue ?? null;
      const deliverableId = `deliverable-${item.id}`;
      deliverables.push({
        id: deliverableId,
        mondayItemId: String(item.id),
        mondayUrl: `https://businessplansplus.monday.com/boards/${BOARD_ID}/pulses/${item.id}`,
        projectId: project.id,
        name: item.name,
        owner: text(item, "project_owner"),
        status: normalizeStatus(text(item, "project_status")),
        priority: normalizePriority(text(item, "status_1"), baseline.priority),
        phase: normalizePhase(text(item, "dropdown_mm1wfknj"), baseline.phase),
        baselineStart: baseline.baselineStart ?? currentStart,
        baselineDue: baseline.baselineDue ?? currentDue,
        currentStart,
        currentDue,
        dependencyIds: linkedIds(item),
        definitionOfDone: text(item, "long_text_mm22ztr3"),
        sourceUpdatedAt: item.updated_at
      });

      for (const subitem of item.subitems ?? []) {
        const taskBaseline = controlConfig.baselines.tasks[String(subitem.id)] ?? {};
        const taskDue = text(subitem, "date0");
        tasks.push({
          id: `task-${subitem.id}`,
          mondayItemId: String(subitem.id),
          mondayUrl: `https://businessplansplus.monday.com/boards/${SUBITEM_BOARD_ID}/pulses/${subitem.id}`,
          projectId: project.id,
          deliverableId,
          checkpointIds: taskBaseline.checkpointIds ?? [],
          name: subitem.name,
          owner: text(subitem, "person"),
          status: normalizeStatus(text(subitem, "status")),
          priority: normalizePriority(taskBaseline.priority, deliverables.at(-1).priority),
          baselineDue: taskBaseline.baselineDue ?? taskDue,
          currentDue: taskDue,
          latestSafeDate: taskBaseline.latestSafeDate ?? taskDue,
          blockedBy: taskBaseline.blockedBy ?? [],
          clientOwned: /^CLIENT:/i.test(subitem.name),
          evidenceUrl: evidenceUrl(subitem),
          sourceUpdatedAt: subitem.updated_at
        });
      }
    }
  }

  const byProjectThenDate = (a, b) => (projectOrder.get(a.projectId) - projectOrder.get(b.projectId))
    || (a.currentDue ?? "9999-12-31").localeCompare(b.currentDue ?? "9999-12-31")
    || a.mondayItemId.localeCompare(b.mondayItemId, "en", { numeric: true });
  deliverables.sort(byProjectThenDate);
  tasks.sort(byProjectThenDate);

  return {
    schemaVersion: 1,
    generatedAt,
    source: { boardId: BOARD_ID, boardName: board.name ?? "Client Delivery", sourceUpdatedAt: maxUpdatedAt(includedParents, generatedAt) },
    activeProfile: controlConfig.activeProfile,
    projects,
    deliverables,
    tasks,
    checkpoints: controlConfig.checkpoints,
    raid: controlConfig.raid
  };
}

function extractControlConfig(snapshot) {
  return {
    activeProfile: snapshot.activeProfile,
    projects: snapshot.projects,
    baselines: {
      deliverables: Object.fromEntries(snapshot.deliverables.map((item) => [item.mondayItemId, { baselineStart: item.baselineStart, baselineDue: item.baselineDue, currentStart: item.currentStart, currentDue: item.currentDue, phase: item.phase, priority: item.priority }])),
      tasks: Object.fromEntries(snapshot.tasks.map((item) => [item.mondayItemId, { baselineDue: item.baselineDue, latestSafeDate: item.latestSafeDate, priority: item.priority, checkpointIds: item.checkpointIds, blockedBy: item.blockedBy }]))
    },
    checkpoints: snapshot.checkpoints,
    raid: snapshot.raid
  };
}

async function fetchMonday(token) {
  const query = `query DeliverySnapshot($boardIds: [ID!]!) {
    boards(ids: $boardIds) {
      id name
      groups { id title items_page(limit: 500) { items { id name updated_at column_values { id text value } subitems { id name updated_at column_values { id text value } } } } }
    }
  }`;
  const response = await fetch("https://api.monday.com/v2", { method: "POST", headers: { authorization: token, "content-type": "application/json", "api-version": "2026-01" }, body: JSON.stringify({ query, variables: { boardIds: [BOARD_ID] } }) });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Monday upstream ${response.status}: ${raw.slice(0, 500)}`);
  const payload = JSON.parse(raw);
  if (payload.errors?.length) throw new Error(`Monday GraphQL error: ${JSON.stringify(payload.errors).slice(0, 500)}`);
  return payload;
}

async function validateSnapshot(snapshot) {
  const { deliveryCommandSchema } = await import("../src/domain/delivery/schema.ts");
  return deliveryCommandSchema.parse(snapshot);
}

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  const check = args.includes("--check");
  const current = JSON.parse(await readFile(outputPath, "utf8"));
  if (check && inputIndex === -1 && !process.env.MONDAY_API_TOKEN) {
    await validateSnapshot(current);
    process.stdout.write(`Delivery snapshot valid: ${current.projects.length} projects, ${current.deliverables.length} deliverables, ${current.tasks.length} tasks.\n`);
    return;
  }
  if (inputIndex === -1 && !process.env.MONDAY_API_TOKEN) throw new Error("MONDAY_API_TOKEN is required when --input is not provided.");
  const raw = inputIndex >= 0
    ? JSON.parse(await readFile(resolve(process.cwd(), args[inputIndex + 1]), "utf8"))
    : await fetchMonday(process.env.MONDAY_API_TOKEN ?? "");
  const snapshot = await validateSnapshot(buildDeliverySnapshot(raw, extractControlConfig(current), new Date().toISOString()));
  if (!check) await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  const missingOwners = snapshot.tasks.filter((item) => !item.owner && !item.clientOwned && item.status !== "done").length;
  const missingDates = snapshot.tasks.filter((item) => !item.currentDue && item.status !== "done").length;
  process.stdout.write(`Delivery snapshot ${check ? "checked" : "written"}: ${snapshot.projects.length} projects, ${snapshot.deliverables.length} deliverables, ${snapshot.tasks.length} tasks, ${missingOwners} missing owners, ${missingDates} missing dates.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : error}\n`); process.exitCode = 1; });
}
