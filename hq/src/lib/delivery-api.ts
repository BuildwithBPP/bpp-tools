import type { DeliveryMutationResult } from "../domain/delivery/types";

interface ClientOptions { apiUrl: string; fetcher?: typeof fetch; }

async function request(options: ClientOptions, path: string, init: RequestInit): Promise<DeliveryMutationResult> {
  if (!options.apiUrl) return { syncState: "unavailable", message: "Local Monday adapter is unavailable.", mondayUrl: "https://businessplansplus.monday.com/boards/18406004595" };
  try {
    const response = await (options.fetcher ?? fetch)(`${options.apiUrl}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init.headers }
    });
    const body = await response.json() as DeliveryMutationResult;
    return body;
  } catch (error) {
    return { syncState: "failed", message: error instanceof Error ? error.message : "Monday adapter request failed.", mondayUrl: "https://businessplansplus.monday.com/boards/18406004595" };
  }
}

export function moveDeliveryTask(options: ClientOptions, input: { mondayItemId: string; dueDate: string; expectedUpdatedAt: string }) {
  return request(options, `/tasks/${input.mondayItemId}/due-date`, { method: "PATCH", body: JSON.stringify({ boardId: "18406004595", dueDate: input.dueDate, expectedUpdatedAt: input.expectedUpdatedAt }) });
}

export function createDeliveryTask(options: ClientOptions, input: { parentItemId: string; projectId: string; name: string; dueDate: string; ownerName: string; status: string }) {
  return request(options, `/deliverables/${input.parentItemId}/tasks`, { method: "POST", body: JSON.stringify({ boardId: "18406004595", ...input }) });
}
