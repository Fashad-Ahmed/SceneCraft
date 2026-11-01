import { z } from "zod";
import {
  ROOM,
  DOOR,
  overlaps,
  validate,
  type Id,
  type Vec2,
  type Scene,
  type Result,
} from "./geometry";
export const objectIds = [
  "sofa",
  "desk",
  "table",
  "chair",
  "bookshelf",
  "tv",
  "bed",
  "plant",
] as const;
export const operationSchema = z
  .object({
    operation: z.literal("move_object"),
    objectId: z.enum(objectIds),
    target: z
      .object({
        x: z.number().finite().min(-10).max(10),
        z: z.number().finite().min(-10).max(10),
      })
      .strict(),
    explanation: z.string().max(500),
  })
  .strict();
export type MoveOperation = z.infer<typeof operationSchema>;
const copy = (s: Scene): Scene => s.map((o) => ({ ...o }));
const round = (v: number) => Math.round(v * 100) / 100;
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
/** Pure domain operation. Never trusts the planner's coordinates. */
export function applyMove(
  scene: Scene,
  op: MoveOperation,
  instruction: string,
): Result {
  const before = copy(scene);
  const original = scene.find((o) => o.id === op.objectId);
  if (!original)
    return {
      ok: false,
      before,
      after: before,
      violations: [],
      trace: ["Unknown object."],
      instruction,
      reason: "Unknown object",
      corrected: false,
    };
  const desired = { x: round(op.target.x), z: round(op.target.z) };
  const at = (point: Vec2) =>
    scene.map((o) => (o.id === op.objectId ? { ...o, ...point } : { ...o }));
  const violations = validate(at(desired), op.objectId);
  const trace = [
    `Planner: ${op.explanation}`,
    `Proposed ${op.objectId}: (${desired.x}, ${desired.z})`,
    `Geometry: ${violations.length ? violations.map((i) => i.message).join(" ") : "valid"}`,
  ];
  if (violations.length === 0)
    return {
      ok: true,
      before,
      after: at(desired),
      object: op.objectId,
      desired,
      accepted: desired,
      violations,
      trace: [...trace, "Proposal accepted."],
      instruction,
      corrected: false,
    };
  // Bounded deterministic nearest-valid search. The original pose is a fallback only if valid.
  // AABB constraints, not a proof of reachability or globally optimal placement.
  const options: Vec2[] = [];
  for (let radius = 0.1; radius <= 5.01; radius += 0.1) {
    for (let i = 0; i < 48; i++) {
      const angle = (i * 2 * Math.PI) / 48;
      options.push({
        x: round(desired.x + radius * Math.cos(angle)),
        z: round(desired.z + radius * Math.sin(angle)),
      });
    }
  }
  options.push({ x: original.x, z: original.z });
  let best: Vec2 | null = null;
  let score = Infinity;
  for (const p of options) {
    if (validate(at(p), op.objectId).length) continue;
    const d = dist(p, desired);
    if (d < score) {
      score = d;
      best = p;
    }
  }
  if (!best)
    return {
      ok: false,
      before,
      after: before,
      object: op.objectId,
      desired,
      violations,
      trace: [...trace, "No feasible placement found."],
      instruction,
      reason: "No valid placement found",
      corrected: false,
    };
  return {
    ok: true,
    before,
    after: at(best),
    object: op.objectId,
    desired,
    accepted: best,
    violations,
    trace: [
      ...trace,
      `Corrected to (${best.x}, ${best.z}) — ${score.toFixed(2)}m from proposal.`,
    ],
    instruction,
    corrected: true,
  };
}
export function sceneContext(scene: Scene) {
  return {
    room: {
      width: ROOM.width,
      depth: ROOM.depth,
      coordinates: "x = left/right; z = back/front",
      bounds: {
        minX: -ROOM.width / 2 + 0.22,
        maxX: ROOM.width / 2 - 0.22,
        minZ: -ROOM.depth / 2 + 0.22,
        maxZ: ROOM.depth / 2 - 0.22,
      },
    },
    entrance: { ...DOOR },
    objects: scene.map(({ id, label, x, z, w, d, fixed }) => ({
      id,
      label,
      x,
      z,
      width: w,
      depth: d,
      fixed: !!fixed,
    })),
  };
}
