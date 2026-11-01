import { useCallback, useRef, useState } from "react";
import {
  editScene,
  initialScene,
  type Scene,
  type Result,
} from "../domain/geometry";
import { applyMove } from "../domain/operations";
import { requestPlan } from "../lib/plannerClient";

export type EditorMode = "ai" | "rules";

export function useSceneEditor() {
  const [scene, setScene] = useState<Scene>(() =>
    initialScene.map((x) => ({ ...x })),
  );
  const [result, setResult] = useState<Result | null>(null);
  const [mode, setMode] = useState<EditorMode>("ai");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const abort = useRef<AbortController | null>(null);
  const execute = useCallback(
    async (instruction: string) => {
      if (pending) return;
      setPending(true);
      setError(null);
      const controller = new AbortController();
      abort.current = controller;
      try {
        const outcome =
          mode === "ai"
            ? applyMove(
                scene,
                await requestPlan(instruction, scene, controller.signal),
                instruction,
              )
            : editScene(scene, instruction);
        setResult(outcome);
        if (outcome.ok) setScene(outcome.after);
        setHistory((items) => [outcome, ...items].slice(0, 20));
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unexpected error.");
      } finally {
        setPending(false);
        abort.current = null;
      }
    },
    [scene, mode, pending],
  );
  const reset = useCallback(() => {
    abort.current?.abort();
    setScene(initialScene.map((x) => ({ ...x })));
    setResult(null);
    setHistory([]);
    setError(null);
    setPending(false);
  }, []);
  return {
    scene,
    result,
    mode,
    setMode,
    pending,
    error,
    history,
    execute,
    reset,
  };
}
