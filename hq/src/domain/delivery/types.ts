export type DeliveryStatus = "not-started" | "working" | "in-review" | "blocked" | "done" | "cancelled";
export type DeliveryPriority = "critical" | "high" | "normal" | "low";
export type Readiness = "ready" | "at-risk" | "behind" | "unavailable";
export type SyncState = "snapshot" | "pending" | "confirmed" | "conflict" | "failed" | "unavailable";

export interface DeliveryProject {
  id: string;
  name: string;
  groupId: string;
  mondayUrl: string;
  owner: string;
  color: "navy" | "gold";
}

export interface Deliverable {
  id: string;
  mondayItemId: string;
  mondayUrl: string;
  projectId: string;
  name: string;
  owner: string | null;
  status: DeliveryStatus;
  priority: DeliveryPriority;
  phase: "initiation" | "planning" | "execution" | "monitoring" | "closure";
  baselineStart: string | null;
  baselineDue: string | null;
  currentStart: string | null;
  currentDue: string | null;
  dependencyIds: string[];
  definitionOfDone: string | null;
  sourceUpdatedAt: string;
}

export interface DeliveryTask {
  id: string;
  mondayItemId: string;
  mondayUrl: string;
  projectId: string;
  deliverableId: string;
  checkpointIds: string[];
  name: string;
  owner: string | null;
  status: DeliveryStatus;
  priority: DeliveryPriority;
  baselineDue: string | null;
  currentDue: string | null;
  latestSafeDate: string | null;
  blockedBy: string[];
  clientOwned: boolean;
  evidenceUrl: string | null;
  sourceUpdatedAt: string;
}

export interface Checkpoint {
  id: string;
  projectId: string;
  name: string;
  plannedDate: string | null;
  startsAt: string | null;
  outlookEventId: string | null;
  outlookUrl: string | null;
  requiredTaskIds: string[];
  criticalTaskIds: string[];
  internalReviewBusinessDays: number;
  clientReviewBusinessDays: number;
  acceptanceCriteria: string[];
  expectedEvidenceCount: number;
  evidenceUrls: string[];
}

export interface RaidRecord {
  id: string;
  type: "risk" | "assumption" | "issue" | "dependency";
  projectId: string;
  title: string;
  description: string;
  owner: string | null;
  probability: "low" | "medium" | "high" | null;
  impact: "low" | "medium" | "high";
  status: "open" | "monitoring" | "blocked" | "closed";
  reviewDate: string | null;
  linkedWorkIds: string[];
  checkpointIds: string[];
  response: string;
  sourceUrl: string;
}

export interface DeliveryCommandSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  source: { boardId: string; boardName: string; sourceUpdatedAt: string };
  activeProfile: { id: "eli"; displayName: "Eli Fisher" };
  projects: DeliveryProject[];
  deliverables: Deliverable[];
  tasks: DeliveryTask[];
  checkpoints: Checkpoint[];
  raid: RaidRecord[];
}

export interface CheckpointAssessment {
  checkpointId: string;
  readiness: Readiness;
  completionPercent: number;
  completedRequired: number;
  totalRequired: number;
  latestSafeDate: string | null;
  reasons: string[];
}

export interface ControlGap {
  id: string;
  kind: "owner" | "date" | "breakdown" | "checkpoint" | "meeting" | "evidence" | "dependency";
  projectId: string;
  workId: string;
  message: string;
  mondayUrl: string | null;
}

export interface WorkloadCollision {
  owner: string;
  dueDate: string;
  taskIds: string[];
}

export interface DeliveryKpis {
  overdue: number;
  blocked: number;
  dueNextSevenDays: number;
  awaitingClient: number;
  missingControlData: number;
  forecastVarianceDays: number;
}

export interface DeliveryMutationResult {
  syncState: SyncState;
  message: string;
  mondayUrl: string;
  record?: DeliveryTask;
  attempted?: Record<string, unknown>;
  current?: Record<string, unknown>;
}
