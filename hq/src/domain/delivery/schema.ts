import { z } from "zod";

const date = z.string().date();
const nullableDate = date.nullable();
const status = z.enum(["not-started", "working", "in-review", "blocked", "done", "cancelled"]);
const priority = z.enum(["critical", "high", "normal", "low"]);

const projectSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), groupId: z.string().min(1),
  mondayUrl: z.string().url(), owner: z.string().min(1), color: z.enum(["navy", "gold"])
});

const deliverableSchema = z.object({
  id: z.string().min(1), mondayItemId: z.string().min(1), mondayUrl: z.string().url(),
  projectId: z.string().min(1), name: z.string().min(1), owner: z.string().nullable(), status, priority,
  phase: z.enum(["initiation", "planning", "execution", "monitoring", "closure"]),
  baselineStart: nullableDate, baselineDue: nullableDate, currentStart: nullableDate, currentDue: nullableDate,
  dependencyIds: z.array(z.string()), definitionOfDone: z.string().nullable(), sourceUpdatedAt: z.string().datetime()
});

const taskSchema = z.object({
  id: z.string().min(1), mondayItemId: z.string().min(1), mondayUrl: z.string().url(),
  projectId: z.string().min(1), deliverableId: z.string().min(1), checkpointIds: z.array(z.string()),
  name: z.string().min(1), owner: z.string().nullable(), status, priority,
  baselineDue: nullableDate, currentDue: nullableDate, latestSafeDate: nullableDate,
  blockedBy: z.array(z.string()), clientOwned: z.boolean(), evidenceUrl: z.string().url().nullable(),
  sourceUpdatedAt: z.string().datetime()
});

const checkpointSchema = z.object({
  id: z.string().min(1), projectId: z.string().min(1), name: z.string().min(1), plannedDate: nullableDate,
  startsAt: z.string().datetime({ offset: true }).nullable(), outlookEventId: z.string().nullable(),
  outlookUrl: z.string().url().nullable(), requiredTaskIds: z.array(z.string()), criticalTaskIds: z.array(z.string()),
  internalReviewBusinessDays: z.number().int().nonnegative(), clientReviewBusinessDays: z.number().int().nonnegative(),
  acceptanceCriteria: z.array(z.string()), expectedEvidenceCount: z.number().int().nonnegative(),
  evidenceUrls: z.array(z.string().url())
});

const raidSchema = z.object({
  id: z.string().min(1), type: z.enum(["risk", "assumption", "issue", "dependency"]),
  projectId: z.string().min(1), title: z.string().min(1), description: z.string().min(1), owner: z.string().nullable(),
  probability: z.enum(["low", "medium", "high"]).nullable(), impact: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "monitoring", "blocked", "closed"]), reviewDate: nullableDate,
  linkedWorkIds: z.array(z.string()), checkpointIds: z.array(z.string()), response: z.string().min(1), sourceUrl: z.string().url()
});

export const deliveryCommandSchema = z.object({
  schemaVersion: z.literal(1), generatedAt: z.string().datetime(),
  source: z.object({ boardId: z.literal("18406004595"), boardName: z.string().min(1), sourceUpdatedAt: z.string().datetime() }),
  activeProfile: z.object({ id: z.literal("eli"), displayName: z.literal("Eli Fisher") }),
  projects: z.array(projectSchema).min(1), deliverables: z.array(deliverableSchema), tasks: z.array(taskSchema),
  checkpoints: z.array(checkpointSchema), raid: z.array(raidSchema)
}).superRefine((snapshot, context) => {
  const projectIds = new Set(snapshot.projects.map((item) => item.id));
  const deliverableIds = new Set(snapshot.deliverables.map((item) => item.id));
  const taskIds = new Set(snapshot.tasks.map((item) => item.id));
  const checkpointIds = new Set(snapshot.checkpoints.map((item) => item.id));
  const allIds = [...snapshot.projects, ...snapshot.deliverables, ...snapshot.tasks, ...snapshot.checkpoints, ...snapshot.raid].map((item) => item.id);
  if (new Set(allIds).size !== allIds.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "All delivery IDs must be unique." });
  for (const deliverable of snapshot.deliverables) if (!projectIds.has(deliverable.projectId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown project ${deliverable.projectId}` });
  for (const task of snapshot.tasks) {
    if (!projectIds.has(task.projectId) || !deliverableIds.has(task.deliverableId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `Broken task reference ${task.id}` });
    for (const checkpointId of task.checkpointIds) if (!checkpointIds.has(checkpointId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown checkpoint ${checkpointId}` });
  }
  for (const checkpoint of snapshot.checkpoints) for (const taskId of [...checkpoint.requiredTaskIds, ...checkpoint.criticalTaskIds]) if (!taskIds.has(taskId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown task ${taskId}` });
});

export type DeliveryCommand = z.infer<typeof deliveryCommandSchema>;
