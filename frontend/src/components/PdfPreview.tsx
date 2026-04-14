import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAnchorCapture } from "../hooks/useAnchorCapture";
import { useToolsStore } from "../state/toolsStore";
import ToolOverlay from "./ToolOverlay";

// Worker must match the pdfjs version that react-pdf ships internally.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const RENDER_WIDTH = 600; // fixed render width in px

interface Props {
  url: string;
}

export default function PdfPreview({ url }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [loadError, setLoadError] = useState<string | null>(null);

  const tools = useToolsStore((s) => s.tools);
  const updateTool = useToolsStore((s) => s.updateTool);
  const removeTool = useToolsStore((s) => s.removeTool);
  const { isPlacing, handleOverlayClick } = useAnchorCapture(currentPage);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setLoadError(null);
    setNumPages(numPages);
    setCurrentPage(0);
  }

  const placedOnPage = tools.filter(
    (t) => t.x_pct !== null && t.y_pct !== null && t.page === currentPage
  );

  return (
    <div>
      {/* Page navigation */}
      {numPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
          <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>←</button>
          <span style={{ fontSize: 13 }}>Page {currentPage + 1} / {numPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(numPages - 1, p + 1))} disabled={currentPage >= numPages - 1}>→</button>
        </div>
      )}

      {/* PDF + overlay wrapper */}
      <div style={{ position: "relative", display: "inline-block", border: "1px solid #ccc" }}>
        {loadError && (
          <p style={{ color: "#dc2626", padding: "0.5rem", fontSize: 13, margin: 0 }}>
            PDF error: {loadError}
          </p>
        )}

        <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(err) => setLoadError(err.message)}
          >
            <Page
              pageIndex={currentPage}
              width={RENDER_WIDTH}
              renderTextLayer
              renderAnnotationLayer
            />
          </Document>

        {/*
          Overlay layer — always at z-index 5 so ToolOverlay children (which have
          pointer-events:auto) stay above the react-pdf canvas/text/annotation layers.
          The overlay div itself captures clicks only during placing mode.
        */}
        <div
          onClick={handleOverlayClick}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            cursor: isPlacing ? "crosshair" : "default",
            pointerEvents: isPlacing ? "auto" : "none",
          }}
        >
          {placedOnPage.map((tool) => (
            <ToolOverlay
              key={tool.id}
              tool={tool}
              onUpdate={(patch) => updateTool(tool.id, patch)}
              onRemove={() => removeTool(tool.id)}
            />
          ))}
        </div>

        {/* "Click to place" banner */}
        {isPlacing && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 11,
              background: "rgba(99,102,241,0.9)",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 4,
              fontSize: 13,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            Click anywhere on the PDF to place
          </div>
        )}
      </div>
    </div>
  );
}
