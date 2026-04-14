import { useEffect, useRef, useState } from "react";
import { listPresets, createPreset, deletePreset, PresetResponse, ToolPayload } from "../api/client";
import { useToolsStore } from "../state/toolsStore";

export default function PresetsPanel() {
  const [presets, setPresets] = useState<PresetResponse[]>([]);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const tools = useToolsStore((s) => s.tools);
  const loadPreset = useToolsStore((s) => s.loadPreset);

  useEffect(() => { listPresets().then(setPresets).catch(() => {}); }, []);

  async function handleSave() {
    const name = newName.trim();
    if (!name) { nameRef.current?.focus(); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: ToolPayload[] = tools.map((t) =>
        t.type === "text"
          ? { type: "text", page: t.page, x_pct: t.x_pct ?? 0, y_pct: t.y_pct ?? 0, text: t.text, font_size: t.font_size, color: t.color }
          : { type: "image", page: t.page, x_pct: t.x_pct ?? 0, y_pct: t.y_pct ?? 0, width_pct: t.width_pct, height_pct: t.height_pct, source: t.source, custom_image_path: t.custom_image_path ?? null }
      );
      const saved = await createPreset(name, payload);
      setPresets((p) => [saved, ...p]);
      setNewName("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (presets.length === 0 && tools.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Presets</span>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>

        {presets.length === 0 && (
          <p className="text-muted text-sm">No presets saved yet.</p>
        )}

        {presets.map((p) => (
          <div key={p.id} className="preset-row">
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 500 }} title={p.name}>
              {p.name}
            </span>
            <span className="badge badge-slate">{p.tools.length}</span>
            <button
              className="btn btn-primary btn-xs"
              onClick={() => loadPreset(p.tools as unknown as Record<string, unknown>[])}
            >
              Load
            </button>
            <button
              className="btn btn-ghost btn-xs"
              style={{ color: "var(--c-red)" }}
              onClick={() => { deletePreset(p.id).catch(() => {}); setPresets((prev) => prev.filter((x) => x.id !== p.id)); }}
            >
              ✕
            </button>
          </div>
        ))}

        {tools.length > 0 && (
          <>
            <hr className="divider" />
            <div className="row">
              <input
                ref={nameRef}
                className="input input-sm"
                style={{ flex: 1 }}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="Save current tools as preset…"
              />
              <button className="btn btn-green btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? "…" : "Save"}
              </button>
            </div>
          </>
        )}

        {error && <p className="text-error">{error}</p>}
      </div>
    </div>
  );
}
