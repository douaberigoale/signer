import { useRef } from "react";
import { useToolsStore, ToolState, TextToolState, ImageToolState } from "../state/toolsStore";
import { uploadAsset } from "../api/client";

interface Props {
  sessionId: string | null;
  pageCount: number;
}

export default function ToolPanel({ sessionId, pageCount }: Props) {
  const { tools, addTextTool, addImageTool, updateTool, removeTool, startPlacing, placingToolId } =
    useToolsStore();

  return (
    <div className="col">
      <div className="row">
        <button className="btn btn-primary btn-sm" onClick={addTextTool}>+ Text</button>
        <button className="btn btn-amber btn-sm" onClick={addImageTool}>+ Image</button>
      </div>

      {tools.length === 0 && (
        <p className="text-muted text-sm" style={{ padding: "0.5rem 0" }}>
          Add a tool, then click the PDF to place it.
        </p>
      )}

      {tools.map((tool) => (
        <ToolRow
          key={tool.id}
          tool={tool}
          sessionId={sessionId}
          pageCount={pageCount}
          isPlacing={placingToolId === tool.id}
          onUpdate={(patch) => updateTool(tool.id, patch)}
          onRemove={() => removeTool(tool.id)}
          onStartPlacing={() => startPlacing(tool.id)}
        />
      ))}
    </div>
  );
}

interface RowProps {
  tool: ToolState;
  sessionId: string | null;
  pageCount: number;
  isPlacing: boolean;
  onUpdate: (patch: Partial<ToolState>) => void;
  onRemove: () => void;
  onStartPlacing: () => void;
}

function ToolRow({ tool, sessionId, pageCount, isPlacing, onUpdate, onRemove, onStartPlacing }: RowProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isText = tool.type === "text";
  const placed = tool.x_pct !== null && tool.y_pct !== null;

  async function handleCustomImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    try {
      const assetId = await uploadAsset(sessionId, file);
      onUpdate({ custom_image_path: assetId, preview_url: URL.createObjectURL(file) } as Partial<ImageToolState>);
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    }
  }

  return (
    <div className="tool-card">
      {/* Header */}
      <div className="tool-card-header">
        <span className={`badge ${isText ? "badge-indigo" : "badge-amber"}`}>{tool.type}</span>
        <span className="text-muted text-xs" style={{ flex: 1 }}>
          {placed
            ? `p${tool.page + 1} · ${(tool.x_pct! * 100).toFixed(0)}% ${(tool.y_pct! * 100).toFixed(0)}%`
            : "not placed"}
        </span>
        <button
          className={`btn btn-sm ${isPlacing ? "btn-slate" : placed ? "btn-ghost" : isText ? "btn-primary" : "btn-amber"}`}
          onClick={onStartPlacing}
        >
          {isPlacing ? "placing…" : placed ? "re-place" : "place"}
        </button>
        <button className="btn btn-icon btn-ghost btn-sm" onClick={onRemove} title="Remove" style={{ color: "var(--c-red)" }}>✕</button>
      </div>

      {/* Body */}
      <div className="tool-card-body">
        {pageCount > 1 && (
          <div className="tool-field">
            <span className="label">Page</span>
            <select className="select input-sm" value={tool.page} onChange={(e) => onUpdate({ page: Number(e.target.value) })}>
              {Array.from({ length: pageCount }, (_, i) => (
                <option key={i} value={i}>{i + 1}</option>
              ))}
            </select>
          </div>
        )}

        {isText && (
          <>
            <div className="tool-field">
              <span className="label">Text</span>
              <input
                className="input input-sm"
                style={{ flex: 1 }}
                value={(tool as TextToolState).text}
                onChange={(e) => onUpdate({ text: e.target.value } as Partial<TextToolState>)}
                placeholder="{dd.MM.YYYY} or fixed text"
              />
            </div>
            <div className="tool-field">
              <span className="label">Size</span>
              <input
                className="input input-sm"
                type="number" min={6} max={96}
                style={{ width: 64 }}
                value={(tool as TextToolState).font_size}
                onChange={(e) => onUpdate({ font_size: Number(e.target.value) } as Partial<TextToolState>)}
              />
              <span className="text-faint text-xs">pt</span>
            </div>
          </>
        )}

        {!isText && (
          <>
            <div className="tool-field">
              <span className="label">Source</span>
              <select
                className="select input-sm"
                style={{ flex: 1 }}
                value={(tool as ImageToolState).source}
                onChange={(e) => onUpdate({ source: e.target.value as "signature" | "custom" } as Partial<ImageToolState>)}
              >
                <option value="signature">Signature</option>
                <option value="custom">Custom image</option>
              </select>
            </div>

            {(tool as ImageToolState).source === "custom" && (
              <div className="tool-field">
                <span className="label">File</span>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={handleCustomImageUpload} />
                <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={!sessionId}>
                  {(tool as ImageToolState).custom_image_path ? "Change" : "Upload"}
                </button>
                {(tool as ImageToolState).custom_image_path && (
                  <span className="badge badge-green">✓</span>
                )}
              </div>
            )}

            <div className="tool-field">
              <span className="label">W × H</span>
              <input
                className="input input-sm" type="number" min={1} max={100} style={{ width: 56 }}
                value={Math.round((tool as ImageToolState).width_pct * 100)}
                onChange={(e) => onUpdate({ width_pct: Number(e.target.value) / 100 } as Partial<ImageToolState>)}
              />
              <span className="text-faint text-xs">×</span>
              <input
                className="input input-sm" type="number" min={1} max={100} style={{ width: 56 }}
                value={Math.round((tool as ImageToolState).height_pct * 100)}
                onChange={(e) => onUpdate({ height_pct: Number(e.target.value) / 100 } as Partial<ImageToolState>)}
              />
              <span className="text-faint text-xs">%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
