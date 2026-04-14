import { useCallback } from "react";
import { ToolState, TextToolState, ImageToolState } from "../state/toolsStore";

interface Props {
  tool: ToolState;
  onUpdate: (patch: Partial<ToolState>) => void;
  onRemove: () => void;
}

/**
 * Positioned using CSS percentages so placement is always pixel-perfect
 * regardless of when page dimensions are measured.  Drag/resize handlers
 * read the parent container's live bounding rect for delta conversion.
 */
export default function ToolOverlay({ tool, onUpdate, onRemove }: Props) {
  const accent = tool.type === "text" ? "#6366f1" : "#f59e0b";

  const isImage = tool.type === "image";
  const imgTool = isImage ? (tool as ImageToolState) : null;
  const txtTool = !isImage ? (tool as TextToolState) : null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Return the overlay container's live pixel dimensions for delta math. */
  function containerSize(el: HTMLElement): { w: number; h: number } {
    const parent = el.offsetParent as HTMLElement | null;
    if (!parent) return { w: 600, h: 848 };
    const r = parent.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  // ── Drag to move ──────────────────────────────────────────────────────────
  const startDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).dataset.handle) return;
      e.preventDefault();
      e.stopPropagation();

      const { w, h } = containerSize(e.currentTarget);
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = tool.x_pct ?? 0;
      const origY = tool.y_pct ?? 0;

      const onMove = (ev: MouseEvent) => {
        onUpdate({
          x_pct: Math.max(0, Math.min(1, origX + (ev.clientX - startX) / w)),
          y_pct: Math.max(0, Math.min(1, origY + (ev.clientY - startY) / h)),
        });
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool.x_pct, tool.y_pct, onUpdate]
  );

  // ── Resize ────────────────────────────────────────────────────────────────
  const startResize = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const { w, h } = containerSize(
        (e.currentTarget.offsetParent as HTMLElement) ?? e.currentTarget
      );
      const startX = e.clientX;
      const startY = e.clientY;

      if (imgTool) {
        const origW = imgTool.width_pct;
        const origH = imgTool.height_pct;
        const onMove = (ev: MouseEvent) => {
          onUpdate({
            width_pct: Math.max(0.02, origW + (ev.clientX - startX) / w),
            height_pct: Math.max(0.02, origH + (ev.clientY - startY) / h),
          } as Partial<ImageToolState>);
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      } else if (txtTool) {
        const origFs = txtTool.font_size;
        const onMove = (ev: MouseEvent) => {
          // Vertical drag → font size (scale: 1px drag ≈ 0.4pt change)
          const delta = ev.clientY - startY;
          onUpdate({ font_size: Math.max(6, Math.round(origFs + delta * 0.4)) } as Partial<TextToolState>);
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imgTool?.width_pct, imgTool?.height_pct, txtTool?.font_size, onUpdate]
  );

  // ── Style ─────────────────────────────────────────────────────────────────

  const posStyle: React.CSSProperties = {
    position: "absolute",
    left: `${(tool.x_pct ?? 0) * 100}%`,
    top: `${(tool.y_pct ?? 0) * 100}%`,
    boxSizing: "border-box",
    cursor: "move",
    userSelect: "none",
    pointerEvents: "auto",
    border: `1.5px solid ${accent}`,
  };

  // Image tool: size is also percentage of container
  if (imgTool) {
    posStyle.width = `${imgTool.width_pct * 100}%`;
    posStyle.height = `${imgTool.height_pct * 100}%`;
  }

  // ── Image source URL ──────────────────────────────────────────────────────
  let imgSrc: string | null = null;
  if (imgTool) {
    if (imgTool.source === "signature") {
      imgSrc = "/api/settings/signature";
    } else if (imgTool.preview_url) {
      imgSrc = imgTool.preview_url;
    }
  }

  // Text color from [0–1] floats
  const textColor = txtTool
    ? `rgb(${Math.round(txtTool.color[0] * 255)},${Math.round(txtTool.color[1] * 255)},${Math.round(txtTool.color[2] * 255)})`
    : "#000";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div onMouseDown={startDrag} style={posStyle}>
      {/* Content */}
      {imgTool ? (
        imgSrc ? (
          <img
            src={imgSrc}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none", mixBlendMode: "multiply" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: accent, fontWeight: 700, pointerEvents: "none" }}>
            {imgTool.source === "custom" ? "upload image →" : "SIG"}
          </div>
        )
      ) : (
        <span style={{ display: "block", fontSize: txtTool!.font_size, lineHeight: 1, color: textColor, whiteSpace: "nowrap", padding: "1px 2px", pointerEvents: "none" }}>
          {txtTool!.text || "…"}
        </span>
      )}

      {/* Delete */}
      <button
        data-handle="del"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove"
        style={{ position: "absolute", top: -9, right: -9, width: 17, height: 17, borderRadius: "50%", background: "#e11d48", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
      >×</button>

      {/* Resize handle */}
      <div
        data-handle="resize"
        onMouseDown={startResize}
        title={imgTool ? "Drag to resize" : "Drag to change font size"}
        style={{ position: "absolute", bottom: -5, right: -5, width: 10, height: 10, background: accent, border: "1.5px solid #fff", cursor: "se-resize", pointerEvents: "auto" }}
      />
    </div>
  );
}
