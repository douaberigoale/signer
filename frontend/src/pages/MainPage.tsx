import { useRef, useState, useEffect, DragEvent } from "react";
import {
  createSession,
  getPreviewUrl,
  processSession,
  deleteSession,
  ToolPayload,
} from "../api/client";
import PdfPreview from "../components/PdfPreview";
import ToolPanel from "../components/ToolPanel";
import PresetsPanel from "../components/PresetsPanel";
import { useToolsStore } from "../state/toolsStore";

export default function MainPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const { tools, clearAll } = useToolsStore();

  // Delete the session tmp dir whenever sessionId changes or the page unmounts.
  useEffect(() => {
    return () => {
      if (sessionId) deleteSession(sessionId).catch(() => {});
    };
  }, [sessionId]);

  async function handleFilesSelected(files: File[]) {
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    if (sessionId) deleteSession(sessionId).catch(() => {});
    clearAll();
    try {
      const resp = await createSession(files);
      setSessionId(resp.session_id);
      setFileCount(resp.file_count);
      setPageCount(resp.first_pdf_pages.length || 1);
      setPreviewUrl(getPreviewUrl(resp.session_id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    if (files.length) handleFilesSelected(files);
  }

  async function handleProcess() {
    if (!sessionId) return;
    setError(null);
    setProcessing(true);
    const payload: ToolPayload[] = tools
      .filter((t) => t.x_pct !== null && t.y_pct !== null)
      .map((t) =>
        t.type === "text"
          ? { type: "text", page: t.page, x_pct: t.x_pct!, y_pct: t.y_pct!, text: t.text, font_size: t.font_size, color: t.color }
          : { type: "image", page: t.page, x_pct: t.x_pct!, y_pct: t.y_pct!, width_pct: t.width_pct, height_pct: t.height_pct, source: t.source, custom_image_path: t.custom_image_path ?? null }
      );
    try {
      const blob = await processSession(sessionId, payload);
      const suggestedName = `annotated_${new Date().toISOString().slice(0, 10)}.zip`;

      if ("showSaveFilePicker" in window) {
        const handle = await (window as Window & typeof globalThis & {
          showSaveFilePicker: (opts: object) => Promise<FileSystemFileHandle>;
        }).showSaveFilePicker({
          suggestedName,
          types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback for Firefox / Safari
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName;
        a.click();
        URL.revokeObjectURL(url);
      }
      setSessionId(null);
      setPreviewUrl(null);
      setFileCount(0);
      clearAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  const unplacedCount = tools.filter((t) => t.x_pct === null).length;
  const canProcess = sessionId !== null && tools.length > 0 && unplacedCount === 0;

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Upload zone ── */}
      {!previewUrl ? (
        <div
          className={`drop-zone${dragging ? " dragging" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="drop-zone-icon">📄</div>
          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
            {uploading ? "Uploading…" : "Drop PDF files here"}
          </div>
          <div className="text-faint text-sm">or click to select files</div>
          <input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{ display: "none" }}
            onChange={(e) => e.target.files && handleFilesSelected(Array.from(e.target.files))} />
        </div>
      ) : (
        /* ── Active session header ── */
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            <span className="badge badge-indigo">{fileCount} PDF{fileCount !== 1 ? "s" : ""}</span>
            <span className="text-muted text-sm">loaded — place tools on the preview</span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Change files
          </button>
          <input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{ display: "none" }}
            onChange={(e) => e.target.files && handleFilesSelected(Array.from(e.target.files))} />
        </div>
      )}

      {error && <p className="text-error">{error}</p>}

      {/* ── Workspace ── */}
      {previewUrl && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", alignItems: "start" }}>

          {/* PDF preview card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Preview</span>
            </div>
            <div style={{ padding: "1rem" }}>
              <PdfPreview url={previewUrl} />
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Tools card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Tools</span>
                {unplacedCount > 0 && (
                  <span className="badge badge-amber" style={{ marginLeft: "auto" }}>
                    {unplacedCount} unplaced
                  </span>
                )}
              </div>
              <div className="card-body">
                <ToolPanel sessionId={sessionId} pageCount={pageCount} />
              </div>
            </div>

            {/* Process button */}
            <button
              className="btn btn-primary btn-full"
              style={{ padding: "0.7rem", fontSize: 15 }}
              onClick={handleProcess}
              disabled={!canProcess || processing}
            >
              {processing ? "Processing…" : `Export ${fileCount} PDF${fileCount !== 1 ? "s" : ""}`}
            </button>

            {/* Presets card */}
            <PresetsPanel />
          </div>
        </div>
      )}
    </div>
  );
}
