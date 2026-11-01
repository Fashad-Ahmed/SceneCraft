import { z } from "zod";
import {
  operationSchema,
  sceneContext,
  type MoveOperation,
} from "../src/domain/operations";
import type { Scene } from "../src/domain/geometry";
export class PlannerError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
const responseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
    .min(1),
});
export async function planEdit(
  instruction: string,
  scene: Scene,
  signal?: AbortSignal,
): Promise<MoveOperation> {
  const key = process.env.OPENAI_API_KEY;
  if (!key)
    throw new PlannerError(
      "OPENAI_API_KEY is not configured on the server.",
      503,
    );
  const base = (
    process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              'You are a 3D scene editor planner. Return ONLY JSON for exactly one move_object operation: {"operation":"move_object","objectId":"desk","target":{"x":2,"z":-2},"explanation":"short reason"}. Use coordinates in meters. Choose one existing object named in the instruction. The downstream geometry validator will check every coordinate. Never claim an edit happened. If the user mentions several edits, select only the first.',
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction,
              scene: sceneContext(scene),
            }),
          },
        ],
      }),
    });
    if (!response.ok)
      throw new PlannerError(
        response.status === 401
          ? "Invalid model API key."
          : `Model provider returned HTTP ${response.status}.`,
        response.status === 429 ? 429 : 502,
      );
    const raw = responseSchema.safeParse(await response.json());
    if (!raw.success)
      throw new PlannerError("Malformed model provider response.");
    const content = raw.data.choices[0].message.content;
    if (!content) throw new PlannerError("Model returned an empty plan.");
    const parsed = operationSchema.safeParse(
      JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "")),
    );
    if (!parsed.success)
      throw new PlannerError("Model plan failed strict schema validation.");
    // Prevent a valid but unrequested object change.
    if (!scene.some((x) => x.id === parsed.data.objectId))
      throw new PlannerError(
        "Model referenced an object absent from the scene.",
      );
    return parsed.data;
  } catch (err) {
    if (err instanceof PlannerError) throw err;
    if (err instanceof SyntaxError)
      throw new PlannerError("Model returned invalid JSON.");
    if (controller.signal.aborted)
      throw new PlannerError("Model request timed out.", 504);
    throw new PlannerError("Model provider request failed.");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
