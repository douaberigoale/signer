export interface PageSize {
  width: number;
  height: number;
}

export interface SessionResponse {
  session_id: string;
  file_count: number;
  first_pdf_pages: PageSize[];
}

export interface SettingsMeta {
  id: number;
  signature_path: string | null;
  signature_uploaded_at: string | null;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function uploadSignature(file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/settings/signature", { method: "POST", body: form });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? "Upload failed");
  }
}

export function getSignatureUrl(bust?: number): string {
  return `/api/settings/signature${bust !== undefined ? `?v=${bust}` : ""}`;
}

export async function getSettings(): Promise<SettingsMeta> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

// ─── PDF sessions ─────────────────────────────────────────────────────────────

export async function createSession(files: File[]): Promise<SessionResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch("/api/pdf/sessions", { method: "POST", body: form });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? "Session creation failed");
  }
  return res.json();
}

export function getPreviewUrl(sessionId: string): string {
  return `/api/pdf/sessions/${sessionId}/preview`;
}

export async function uploadAsset(sessionId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/pdf/sessions/${sessionId}/assets`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? "Asset upload failed");
  }
  const data = await res.json();
  return data.asset_id as string;
}

export interface ToolPayload {
  type: "text" | "image";
  page: number;
  x_pct: number;
  y_pct: number;
  // text
  text?: string;
  font_size?: number;
  color?: [number, number, number];
  // image
  width_pct?: number;
  height_pct?: number;
  source?: "signature" | "custom";
  custom_image_path?: string | null;
}

export async function processSession(
  sessionId: string,
  tools: ToolPayload[]
): Promise<Blob> {
  const res = await fetch(`/api/pdf/sessions/${sessionId}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tools }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? "Processing failed");
  }
  return res.blob();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`/api/pdf/sessions/${sessionId}`, { method: "DELETE" });
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export interface PresetResponse {
  id: number;
  name: string;
  tools: ToolPayload[];
  created_at: string;
}

export async function listPresets(): Promise<PresetResponse[]> {
  const res = await fetch("/api/presets");
  if (!res.ok) throw new Error("Failed to load presets");
  return res.json();
}

export async function createPreset(name: string, tools: ToolPayload[]): Promise<PresetResponse> {
  const res = await fetch("/api/presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, tools }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? "Failed to save preset");
  }
  return res.json();
}

export async function deletePreset(id: number): Promise<void> {
  await fetch(`/api/presets/${id}`, { method: "DELETE" });
}
