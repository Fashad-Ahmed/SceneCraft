import { operationSchema, type MoveOperation } from "../domain/operations";
import type { Scene } from "../domain/geometry";
export async function requestPlan(
  instruction: string,
  scene: Scene,
  signal?: AbortSignal,
): Promise<MoveOperation> {
  const response = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction, scene }),
    signal,
  });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (typeof body !== "object" || body === null || !("operation" in body))
    throw new Error("Invalid API response");
  return operationSchema.parse(body.operation);
}
