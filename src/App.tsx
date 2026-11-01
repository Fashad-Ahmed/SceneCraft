import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Github,
  Play,
} from "lucide-react";
import { World } from "./components/World";
import { examples } from "./domain/geometry";
import { useSceneEditor } from "./hooks/useSceneEditor";
export function App() {
  const editor = useSceneEditor();
  const [instruction, setInstruction] = useState(
    "Move the bookshelf near the door",
  );
  const [showGhost, setShowGhost] = useState(true);
  return (
    <main>
      <header>
        <div className="brand">
          <div className="logo">
            S<span>✦</span>
          </div>
          <div>
            <strong>SceneCraft</strong>
            <small>GEOMETRY-AWARE 3D EDITING</small>
          </div>
        </div>
        <div className="header-right">
          <span className="version">RESEARCH PROTOTYPE · V2</span>
          <a
            href="https://github.com/Fashad-Ahmed"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={17} /> Profile
          </a>
        </div>
      </header>
      <section className="hero">
        <div className="eyebrow">
          <Sparkles size={14} /> AGENTIC GRAPHICS EXPERIMENT
        </div>
        <h1>
          Language into space.
          <br />
          <em>Geometry keeps it honest.</em>
        </h1>
        <p>
          LLM-driven scene planning with deterministic geometric verification.
          Test what happens when proposed edits violate room constraints.
        </p>
      </section>
      <div className="workbench">
        <div className="viewer">
          <div className="view-top">
            <span className="live">
              <span className="dot" /> INTERACTIVE SCENE
            </span>
            <span>Orbit: drag · Zoom: scroll</span>
          </div>
          <World
            scene={editor.scene}
            result={editor.result}
            showGhost={showGhost}
          />
          <div className="legend">
            <span>
              <i style={{ background: "#e7ad56" }} /> Edited object
            </span>
            <span>
              <i style={{ background: "#d85855" }} /> Proposed placement
            </span>
            <span>
              <i style={{ background: "#f3c9ad" }} /> Entrance clearance
            </span>
          </div>
        </div>
        <aside className="controls">
          <div className="panel-title">
            <div className="panel-icon">
              <Sparkles size={19} />
            </div>
            <div>
              <h2>Scene editing agent</h2>
              <p>Model proposes · Geometry verifies · UI renders</p>
            </div>
          </div>
          <label htmlFor="planner-mode">PLANNING MODE</label>
          <select
            id="planner-mode"
            aria-label="Planning mode"
            value={editor.mode}
            onChange={(e) => editor.setMode(e.target.value as "ai" | "rules")}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 17,
              borderRadius: 9,
            }}
          >
            <option value="ai">LLM planner (server-side)</option>
            <option value="rules">Deterministic V1 baseline</option>
          </select>
          <label htmlFor="cmd">YOUR INSTRUCTION</label>
          <textarea
            id="cmd"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            maxLength={400}
            placeholder="Move the desk near the window"
          />
          <button
            className="run"
            disabled={editor.pending || instruction.trim().length < 3}
            onClick={() => void editor.execute(instruction)}
          >
            <Play size={17} fill="currentColor" />
            {editor.pending ? "Planning…" : "Execute edit"}{" "}
            <ArrowRight size={17} />
          </button>
          <div className="between">
            <span>EXAMPLE INSTRUCTIONS</span>
            <button className="plain" onClick={editor.reset}>
              <RotateCcw size={14} /> Reset room
            </button>
          </div>
          <div className="example-list">
            {examples.map((x) => (
              <button key={x} onClick={() => setInstruction(x)}>
                {x}
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
          <div className="switch">
            <label>
              <input
                type="checkbox"
                checked={showGhost}
                onChange={(e) => setShowGhost(e.target.checked)}
              />{" "}
              Show proposed placement overlay
            </label>
          </div>
          {editor.error && (
            <div className="result bad" role="alert">
              <div className="result-head">
                <AlertTriangle size={18} />
                <strong>Planning failed</strong>
              </div>
              <p>{editor.error}</p>
              <p>Switch to the V1 baseline to test without an API key.</p>
            </div>
          )}
          {editor.result && (
            <div
              className={"result " + (editor.result.ok ? "good" : "bad")}
              aria-live="polite"
            >
              <div className="result-head">
                {editor.result.ok ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertTriangle size={18} />
                )}
                <strong>
                  {!editor.result.ok
                    ? "Cannot apply edit"
                    : editor.result.corrected
                      ? "Geometric correction applied"
                      : "Placement accepted"}
                </strong>
              </div>
              {editor.result.trace.map((t, i) => (
                <p key={i}>{t}</p>
              ))}
              {editor.result.violations.length > 0 && (
                <small>
                  Detected:{" "}
                  {editor.result.violations.map((v) => v.type).join(", ")}
                </small>
              )}
            </div>
          )}
        </aside>
      </div>
      <section className="footer">
        <div>
          <ShieldCheck size={20} />
          <strong>Research hypothesis</strong>
          <p>
            Does geometric verification improve the validity of language-guided
            3D editing, without unwanted changes to other scene objects?
          </p>
        </div>
        <div>
          <strong>{editor.history.length}</strong>
          <span>Edits attempted</span>
        </div>
        <div>
          <strong>{editor.history.filter((r) => r.corrected).length}</strong>
          <span>Corrected proposals</span>
        </div>
      </section>
      <footer>
        <span>
          SceneCraft V2 · Research MVP · Not a trained 3D foundation model
        </span>
        <span>
          Structured model planning · Deterministic geometry · Corrective search
        </span>
      </footer>
    </main>
  );
}
