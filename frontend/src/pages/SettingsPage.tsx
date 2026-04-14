import { useRef, useState, DragEvent } from "react";
import { uploadSignature } from "../api/client";
import SignaturePreview from "../components/SignaturePreview";

export default function SettingsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bust, setBust] = useState(0);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setSuccess(false);
    if (file.type !== "image/png") { setError("Only PNG files are accepted."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("File must be smaller than 5 MB."); return; }
    setLoading(true);
    try {
      await uploadSignature(file);
      setSuccess(true);
      setBust(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>
        Settings
      </h1>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Signature</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p className="text-muted text-sm">
            Upload a PNG that will be stamped onto your PDFs as a signature.
            White areas in the image will appear transparent in the preview.
          </p>

          <div
            className={`drop-zone${dragging ? " dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{ padding: "1.75rem" }}
          >
            <div className="drop-zone-icon">🖋</div>
            <div style={{ fontWeight: 600 }}>
              {loading ? "Uploading…" : "Drop a PNG here"}
            </div>
            <div className="text-faint text-sm" style={{ marginTop: "0.25rem" }}>or click to select</div>
            <input ref={inputRef} type="file" accept="image/png" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {error   && <p className="text-error">{error}</p>}
          {success && <p className="text-success">Signature uploaded successfully.</p>}

          <SignaturePreview bust={bust} />
        </div>
      </div>
    </div>
  );
}
