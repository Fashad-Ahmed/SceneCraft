/** Geometric reasoning is deterministic, auditable, and independent of the UI. Units: meters. */
export type Id =
  | "sofa"
  | "desk"
  | "table"
  | "chair"
  | "bookshelf"
  | "tv"
  | "bed"
  | "plant";
export type Vec2 = { x: number; z: number };
export type Furniture = {
  id: Id;
  label: string;
  kind: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  fixed?: boolean;
};
export type Scene = Furniture[];
export type Violation = {
  type: "boundary" | "collision" | "door-clearance";
  message: string;
};
export type Target = { x: number; z: number; description: string };
export type Result = {
  ok: boolean;
  before: Scene;
  after: Scene;
  object?: Id;
  desired?: Vec2;
  accepted?: Vec2;
  violations: Violation[];
  trace: string[];
  instruction: string;
  reason?: string;
  corrected: boolean;
};
export const ROOM = { width: 10, depth: 8, wall: 0.16 };
// Door on south wall; keep a 1.7m-long strip into the room clear.
export const DOOR = { x: 0, z: 3.5, width: 1.45, depth: 1.05 };
export const initialScene: Scene = [
  {
    id: "sofa",
    label: "Sofa",
    kind: "sofa",
    x: -2.75,
    z: -1.15,
    w: 2.35,
    d: 0.95,
    h: 0.75,
    color: "#c98364",
  },
  {
    id: "desk",
    label: "Desk",
    kind: "desk",
    x: 2.9,
    z: -1.95,
    w: 1.65,
    d: 0.8,
    h: 0.82,
    color: "#bc956b",
  },
  {
    id: "table",
    label: "Coffee table",
    kind: "table",
    x: -2.7,
    z: 0.55,
    w: 1.3,
    d: 0.8,
    h: 0.43,
    color: "#b59672",
  },
  {
    id: "chair",
    label: "Chair",
    kind: "chair",
    x: 2.85,
    z: -0.55,
    w: 0.65,
    d: 0.65,
    h: 0.85,
    color: "#859d9b",
  },
  {
    id: "bookshelf",
    label: "Bookshelf",
    kind: "bookshelf",
    x: 4.25,
    z: 1.7,
    w: 0.58,
    d: 1.45,
    h: 1.95,
    color: "#bb8b64",
  },
  {
    id: "tv",
    label: "Television",
    kind: "tv",
    x: -2.7,
    z: -3.38,
    w: 1.45,
    d: 0.35,
    h: 1.25,
    color: "#4d6370",
  },
  {
    id: "bed",
    label: "Daybed",
    kind: "bed",
    x: 1.1,
    z: 2.1,
    w: 1.85,
    d: 1.55,
    h: 0.48,
    color: "#9a9bca",
  },
  {
    id: "plant",
    label: "Plant",
    kind: "plant",
    x: -4.1,
    z: 2.1,
    w: 0.58,
    d: 0.58,
    h: 1.1,
    color: "#5d9776",
  },
];
const EPS = 1e-8;
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
export function overlaps(
  a: Pick<Furniture, "x" | "z" | "w" | "d">,
  b: Pick<Furniture, "x" | "z" | "w" | "d">,
  margin = 0,
): boolean {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 + margin - EPS &&
    Math.abs(a.z - b.z) < (a.d + b.d) / 2 + margin - EPS
  );
}
export function validate(
  scene: Scene,
  movingId: Id,
  margin = 0.12,
): Violation[] {
  const m = scene.find((x) => x.id === movingId);
  if (!m) return [{ type: "boundary", message: `Unknown object ${movingId}` }];
  const errors: Violation[] = [];
  if (
    Math.abs(m.x) + m.w / 2 > ROOM.width / 2 - 0.22 ||
    Math.abs(m.z) + m.d / 2 > ROOM.depth / 2 - 0.22
  )
    errors.push({
      type: "boundary",
      message: "Object extends outside the room.",
    });
  for (const o of scene)
    if (o.id !== m.id && overlaps(m, o, margin))
      errors.push({
        type: "collision",
        message: `Overlaps ${o.label.toLowerCase()} (including ${margin}m clearance).`,
      });
  if (overlaps(m, { x: DOOR.x, z: DOOR.z, w: DOOR.width, d: DOOR.depth }, 0.04))
    errors.push({
      type: "door-clearance",
      message: "Blocks the protected entrance corridor.",
    });
  return errors;
}
export function targetFor(
  scene: Scene,
  id: Id,
  instruction: string,
): Target | null {
  const l = instruction.toLowerCase();
  const item = scene.find((o) => o.id === id)!;
  if (/window/.test(l))
    return { x: 2.8, z: -3.15, description: "beside the north window" };
  if (/door|entrance/.test(l))
    return { x: 0, z: 2.75, description: "near the entrance" };
  if (/cent(?:er|re)|middle/.test(l))
    return { x: 0, z: 0, description: "room center" };
  const anchor = scene.find(
    (o) =>
      o.id !== id && (l.includes(o.id) || l.includes(o.label.toLowerCase())),
  );
  if (anchor) {
    if (/left of/.test(l))
      return {
        x: anchor.x - (anchor.w + item.w) / 2 - 0.24,
        z: anchor.z,
        description: `left of ${anchor.label}`,
      };
    if (/right of/.test(l))
      return {
        x: anchor.x + (anchor.w + item.w) / 2 + 0.24,
        z: anchor.z,
        description: `right of ${anchor.label}`,
      };
    if (/in front of|facing/.test(l))
      return {
        x: anchor.x,
        z: anchor.z + ((anchor.d + item.d) / 2 + 0.35),
        description: `in front of ${anchor.label}`,
      };
    if (/behind/.test(l))
      return {
        x: anchor.x,
        z: anchor.z - ((anchor.d + item.d) / 2 + 0.35),
        description: `behind ${anchor.label}`,
      };
    return {
      x: anchor.x + (anchor.w + item.w) / 2 + 0.24,
      z: anchor.z,
      description: `beside ${anchor.label}`,
    };
  }
  if (/left/.test(l))
    return { x: -3.7, z: item.z, description: "left side of room" };
  if (/right/.test(l))
    return { x: 3.7, z: item.z, description: "right side of room" };
  if (/back|north/.test(l))
    return { x: item.x, z: -3.25, description: "back of room" };
  if (/front|south/.test(l))
    return { x: item.x, z: 3.0, description: "front of room" };
  return null;
}
export function parseInstruction(
  scene: Scene,
  instruction: string,
): { id: Id; target: Target } | { error: string } {
  const l = instruction.trim().toLowerCase();
  const mentioned = scene
    .map((o) => ({
      item: o,
      index: Math.min(
        ...[o.id, o.label.toLowerCase()].map((name) => {
          const match = new RegExp(`\\b${name}\\b`).exec(l);
          return match ? match.index : Infinity;
        }),
      ),
    }))
    .filter((m) => Number.isFinite(m.index))
    .sort((a, b) => a.index - b.index);
  const found = mentioned[0]?.item;
  if (!found)
    return {
      error:
        "Name an object: desk, sofa, coffee table, chair, bookshelf, television, daybed or plant.",
    };
  const t = targetFor(scene, found.id, l);
  if (!t)
    return {
      error:
        "Specify a target, e.g. “near the window”, “beside the sofa”, “to the center”, or “near the door”.",
    };
  return { id: found.id, target: t };
}
function round(n: number) {
  return Math.round(n * 100) / 100;
}
export function editScene(scene: Scene, instruction: string): Result {
  const before = scene.map((o) => ({ ...o }));
  const p = parseInstruction(scene, instruction);
  if ("error" in p)
    return {
      ok: false,
      before,
      after: before,
      violations: [],
      trace: [p.error],
      instruction,
      reason: p.error,
      corrected: false,
    };
  const { id, target } = p;
  const test = (v: Vec2) => {
    const candidate = scene.map((o) =>
      o.id === id ? { ...o, x: v.x, z: v.z } : { ...o },
    );
    return validate(candidate, id);
  };
  const desired = { x: round(target.x), z: round(target.z) };
  const issues = test(desired);
  const trace = [
    `1. Parsed target: ${id} → ${target.description} (${desired.x}, ${desired.z}).`,
    `2. Initial geometry check: ${issues.length ? issues.map((v) => v.message).join(" ") : "valid"}.`,
  ];
  if (!issues.length) {
    const after = scene.map((o) =>
      o.id === id ? { ...o, ...desired } : { ...o },
    );
    trace.push("3. Accepted initial placement (no correction required).");
    return {
      ok: true,
      before,
      after,
      object: id,
      desired,
      accepted: desired,
      violations: issues,
      trace,
      instruction,
      corrected: false,
    };
  }
  // Minimize deviation from desired position subject to AABB / room / door constraints.
  // Deterministic radial grid, not a learned optimizer. Uses original position as fallback.
  const candidates: Vec2[] = [];
  for (let radius = 0.15; radius <= 4.5; radius += 0.15) {
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 12) {
      candidates.push({
        x: round(desired.x + radius * Math.cos(angle)),
        z: round(desired.z + radius * Math.sin(angle)),
      });
    }
  }
  const valid = candidates
    .filter((v) => !test(v).length)
    .sort((a, b) => distance(a, desired) - distance(b, desired));
  const accepted = valid[0];
  if (!accepted) {
    trace.push("3. No feasible placement found within 4.5m; scene unchanged.");
    return {
      ok: false,
      before,
      after: before,
      object: id,
      desired,
      violations: issues,
      trace,
      instruction,
      reason: "No feasible position found.",
      corrected: false,
    };
  }
  trace.push(
    `3. Searched nearby positions; found valid placement (${accepted.x}, ${accepted.z}).`,
  );
  trace.push(
    `4. Correction moved ${distance(desired, accepted).toFixed(2)}m from proposed target while preserving constraints.`,
  );
  const after = scene.map((o) =>
    o.id === id ? { ...o, ...accepted } : { ...o },
  );
  return {
    ok: true,
    before,
    after,
    object: id,
    desired,
    accepted,
    violations: issues,
    trace,
    instruction,
    corrected: true,
  };
}
export const examples = [
  "Move the desk near the window",
  "Move the sofa to the center",
  "Place the chair beside the desk",
  "Move the bookshelf near the door",
  "Move the coffee table in front of the sofa",
  "Move the plant to the right side",
];
