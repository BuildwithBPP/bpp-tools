import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const PARENT_BOARD_ID = "18406004595";
const SUBITEM_BOARD_ID = "18406004597";
const MONDAY_URL = "https://api.monday.com/v2";
const MAX_BODY_BYTES = 16_384;
const allowedStatuses = new Set(["Not Started", "Working on it"]);
const projectGroups = new Map([["legacy-b-studio", "group_mm5vja6y"], ["halo-pathways", "group_mm6gebt9"]]);

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function send(response, status, payload, origin) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...(origin ? { "access-control-allow-origin": origin, vary: "Origin" } : {})
  });
  response.end(JSON.stringify(payload));
}

function isAllowedOrigin(origin, allowedOrigin) {
  if (!origin) return true;
  return origin === allowedOrigin;
}

async function readBody(request) {
  const statedLength = Number(request.headers["content-length"] ?? 0);
  if (statedLength > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large.");
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function requireBoard(body) {
  if (String(body.boardId) !== PARENT_BOARD_ID) throw new HttpError(400, `boardId must be ${PARENT_BOARD_ID}.`);
}

function requireDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`))) {
    throw new HttpError(400, "dueDate must be a valid ISO date.");
  }
}

async function monday(fetcher, token, query, variables = {}) {
  const response = await fetcher(MONDAY_URL, {
    method: "POST",
    headers: { authorization: token, "content-type": "application/json", "api-version": "2026-01" },
    body: JSON.stringify({ query, variables })
  });
  const raw = await response.text();
  if (!response.ok) throw new HttpError(502, `Monday upstream ${response.status}: ${raw.slice(0, 500)}`);
  let payload;
  try { payload = JSON.parse(raw); } catch { throw new HttpError(502, `Monday upstream returned invalid JSON: ${raw.slice(0, 500)}`); }
  if (payload.errors?.length) throw new HttpError(502, `Monday GraphQL error: ${JSON.stringify(payload.errors).slice(0, 500)}`);
  return payload.data;
}

async function getItem(context, itemId, operationName = "DeliveryItem") {
  const data = await monday(context.fetcher, context.token, `query ${operationName}($ids: [ID!]!) {
    items(ids: $ids) { id name updated_at board { id } group { id } column_values { id text value } }
  }`, { ids: [String(itemId)] });
  return data.items?.[0] ?? null;
}

async function getMetadata(context) {
  const data = await monday(context.fetcher, context.token, `query DeliveryMetadata($boardIds: [ID!]!) {
    boards(ids: $boardIds) { id columns { id title type } }
    users(kind: non_guests) { id name }
  }`, { boardIds: [SUBITEM_BOARD_ID] });
  const board = data.boards?.find((item) => String(item.id) === SUBITEM_BOARD_ID);
  if (!board) throw new HttpError(502, "Monday subitem board metadata is unavailable.");
  const findColumn = (title, type) => {
    const matches = board.columns.filter((column) => column.title === title && (!type || column.type === type));
    if (matches.length !== 1) throw new HttpError(502, `Expected one live ${title} column; found ${matches.length}.`);
    return matches[0].id;
  };
  return {
    dateColumnId: findColumn("Due Date", "date"),
    ownerColumnId: findColumn("Owner", "people"),
    statusColumnId: findColumn("Status", "status"),
    users: data.users ?? []
  };
}

function readDate(item, columnId) {
  const column = item?.column_values?.find((value) => value.id === columnId);
  if (!column) return null;
  try { return JSON.parse(column.value ?? "null")?.date ?? column.text ?? null; } catch { return column.text || null; }
}

function taskRecord(item, dueDate) {
  return { mondayItemId: String(item.id), name: item.name, currentDue: dueDate, sourceUpdatedAt: item.updated_at };
}

async function updateDueDate(context, itemId, body) {
  requireBoard(body);
  requireDate(body.dueDate);
  if (!body.expectedUpdatedAt) throw new HttpError(400, "expectedUpdatedAt is required.");
  const before = await getItem(context, itemId);
  if (!before || String(before.board?.id) !== SUBITEM_BOARD_ID) throw new HttpError(404, "Task is not a Client Delivery subitem.");
  if (before.updated_at !== body.expectedUpdatedAt) throw new HttpError(409, "Monday changed since this snapshot.", { current: taskRecord(before, null) });
  const metadata = await getMetadata(context);
  await monday(context.fetcher, context.token, `mutation ChangeDeliveryDueDate($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
    change_simple_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
  }`, { boardId: SUBITEM_BOARD_ID, itemId: String(itemId), columnId: metadata.dateColumnId, value: body.dueDate });
  const after = await getItem(context, itemId);
  const actualDate = readDate(after, metadata.dateColumnId);
  if (!after || actualDate !== body.dueDate) throw new HttpError(409, "Monday read-back did not match the requested due date.", { syncState: "conflict", attempted: { dueDate: body.dueDate }, current: { dueDate: actualDate } });
  return { syncState: "confirmed", message: "Due date confirmed in Monday.", mondayUrl: `https://businessplansplus.monday.com/boards/${SUBITEM_BOARD_ID}/pulses/${itemId}`, record: taskRecord(after, actualDate) };
}

async function createTask(context, parentItemId, body) {
  requireBoard(body);
  requireDate(body.dueDate);
  if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 160) throw new HttpError(400, "name must be 2 to 160 characters.");
  if (!allowedStatuses.has(body.status)) throw new HttpError(400, "Unsupported status.");
  const expectedGroupId = projectGroups.get(body.projectId);
  if (!expectedGroupId) throw new HttpError(400, "Unsupported projectId.");
  const parent = await getItem(context, parentItemId, "ParentItem");
  if (!parent || String(parent.board?.id) !== PARENT_BOARD_ID || parent.group?.id !== expectedGroupId) throw new HttpError(404, "Parent is not in the requested Client Delivery project.");
  const metadata = await getMetadata(context);
  const owners = metadata.users.filter((user) => user.name === body.ownerName);
  if (owners.length !== 1) throw new HttpError(409, `Expected one exact Monday owner named ${body.ownerName}; found ${owners.length}.`);
  const columns = JSON.stringify({
    [metadata.dateColumnId]: { date: body.dueDate },
    [metadata.ownerColumnId]: { personsAndTeams: [{ id: Number(owners[0].id), kind: "person" }] },
    [metadata.statusColumnId]: { label: body.status }
  });
  const result = await monday(context.fetcher, context.token, `mutation CreateDeliveryTask($parentId: ID!, $name: String!, $columns: JSON!) {
    create_subitem(parent_item_id: $parentId, item_name: $name, column_values: $columns) { id }
  }`, { parentId: String(parentItemId), name: body.name.trim(), columns });
  const itemId = result.create_subitem?.id;
  const after = itemId ? await getItem(context, itemId) : null;
  const actualDate = readDate(after, metadata.dateColumnId);
  if (!after || after.name !== body.name.trim() || actualDate !== body.dueDate) throw new HttpError(409, "Monday read-back did not match the requested task.", { syncState: "conflict" });
  const mondayUrl = `https://businessplansplus.monday.com/boards/${SUBITEM_BOARD_ID}/pulses/${itemId}`;
  return { syncState: "confirmed", message: "Task confirmed in Monday.", mondayUrl, record: taskRecord(after, actualDate) };
}

async function archiveTask(context, itemId, body) {
  requireBoard(body);
  if (!body.expectedUpdatedAt) throw new HttpError(400, "expectedUpdatedAt is required.");
  const before = await getItem(context, itemId);
  if (!before || String(before.board?.id) !== SUBITEM_BOARD_ID) throw new HttpError(404, "Task is not a Client Delivery subitem.");
  if (before.updated_at !== body.expectedUpdatedAt) throw new HttpError(409, "Monday changed since this snapshot.");
  await monday(context.fetcher, context.token, `mutation ArchiveDeliveryTask($itemId: ID!) { archive_item(item_id: $itemId) { id } }`, { itemId: String(itemId) });
  const after = await getItem(context, itemId);
  if (after) throw new HttpError(409, "Archived task still appears in Monday read-back.", { syncState: "conflict" });
  return { syncState: "confirmed", message: "Archive confirmed in Monday.", mondayUrl: `https://businessplansplus.monday.com/boards/${SUBITEM_BOARD_ID}/pulses/${itemId}` };
}

async function route(request, response, context) {
  const origin = request.headers.origin;
  if (!isAllowedOrigin(origin, context.allowedOrigin)) return send(response, 403, { syncState: "failed", message: "Only the configured local HQ origin is allowed." });
  if (request.method === "OPTIONS") {
    response.writeHead(204, { "access-control-allow-origin": origin ?? "http://127.0.0.1", "access-control-allow-methods": "GET, PATCH, POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin" });
    return response.end();
  }
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  try {
    if (request.method === "GET" && url.pathname === "/health") return send(response, 200, { status: "ok", binding: "loopback", boardId: PARENT_BOARD_ID }, origin);
    if (request.method === "GET" && url.pathname === "/owners") {
      const metadata = await getMetadata(context);
      return send(response, 200, { owners: metadata.users.map(({ id, name }) => ({ id, name })) }, origin);
    }
    let match = url.pathname.match(/^\/tasks\/(\d+)\/due-date$/);
    if (request.method === "PATCH" && match) return send(response, 200, await updateDueDate(context, match[1], await readBody(request)), origin);
    match = url.pathname.match(/^\/deliverables\/(\d+)\/tasks$/);
    if (request.method === "POST" && match) return send(response, 201, await createTask(context, match[1], await readBody(request)), origin);
    match = url.pathname.match(/^\/tasks\/(\d+)\/archive$/);
    if (request.method === "POST" && match) return send(response, 200, await archiveTask(context, match[1], await readBody(request)), origin);
    throw new HttpError(404, "Route not found.");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const payload = { syncState: error?.details?.syncState ?? "failed", message: error instanceof Error ? error.message : "Unexpected error.", ...error?.details };
    send(response, status, payload, origin);
  }
}

export function startDeliveryDevApi({ token, port = 8788, fetcher = fetch, allowedOrigin = "http://127.0.0.1:4321" } = {}) {
  if (!token) throw new Error("MONDAY_API_TOKEN is required");
  const server = createServer((request, response) => route(request, response, { token, fetcher, allowedOrigin }));
  return server.listen(port, "127.0.0.1");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = startDeliveryDevApi({ token: process.env.MONDAY_API_TOKEN, allowedOrigin: process.env.DELIVERY_HQ_ORIGIN });
  server.once("listening", () => {
    const address = server.address();
    process.stdout.write(`Delivery dev API listening on http://127.0.0.1:${address.port}\n`);
  });
}
