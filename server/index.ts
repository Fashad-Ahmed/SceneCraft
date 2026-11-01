import { config } from "dotenv";
import express from "express";

config({ path: ".env.local" });
config();
import { z } from "zod";
import { operationSchema, objectIds } from "../src/domain/operations";
import { planEdit, PlannerError } from "./planner";
const furniture = z
  .object({
    id: z.enum(objectIds),
    label: z.string().max(80),
    kind: z.string().max(40),
    x: z.number().finite(),
    z: z.number().finite(),
    w: z.number().positive(),
    d: z.number().positive(),
    h: z.number().positive(),
    color: z.string(),
    fixed: z.boolean().optional(),
  })
  .strict();
const requestSchema = z
  .object({
    instruction: z.string().trim().min(3).max(400),
    scene: z.array(furniture).min(1).max(30),
  })
  .strict();
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", plannerConfigured: !!process.env.OPENAI_API_KEY }),
);
app.post("/api/plan", async (req, res) => {
  const input = requestSchema.safeParse(req.body);
  if (!input.success) {
    res
      .status(400)
      .json({ error: "Invalid request. Check instruction and scene schema." });
    return;
  }
  try {
    const operation = operationSchema.parse(
      await planEdit(input.data.instruction, input.data.scene),
    );
    res.json({ operation });
  } catch (error) {
    const status = error instanceof PlannerError ? error.status : 500;
    res
      .status(status)
      .json({
        error:
          error instanceof PlannerError
            ? error.message
            : "Unexpected planning failure.",
      });
  }
});
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : "Bad request" });
  },
);
const port = Number(process.env.PORT || 8787);
app.listen(port, () =>
  console.info(`SceneCraft API listening on http://localhost:${port}`),
);
