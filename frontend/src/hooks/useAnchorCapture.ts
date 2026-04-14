import { useCallback } from "react";
import { useToolsStore } from "../state/toolsStore";

/**
 * Returns an onClick handler for the PDF page overlay.
 * When a tool is being placed, converts the click's offset coordinates
 * to percentages of the rendered page and commits them.
 */
export function useAnchorCapture(currentPage: number) {
  const { placingToolId, placeAnchor } = useToolsStore();

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placingToolId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x_pct = (e.clientX - rect.left) / rect.width;
      const y_pct = (e.clientY - rect.top) / rect.height;
      placeAnchor(x_pct, y_pct, currentPage);
    },
    [placingToolId, placeAnchor, currentPage]
  );

  return { isPlacing: !!placingToolId, handleOverlayClick };
}
