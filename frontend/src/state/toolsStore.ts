import { create } from "zustand";

export interface TextToolState {
  id: string;
  type: "text";
  page: number;
  x_pct: number | null;
  y_pct: number | null;
  text: string;
  font_size: number;
  color: [number, number, number];
}

export interface ImageToolState {
  id: string;
  type: "image";
  page: number;
  x_pct: number | null;
  y_pct: number | null;
  width_pct: number;
  height_pct: number;
  source: "signature" | "custom";
  custom_image_path: string | null;
  /** Object URL created from the uploaded file – only for in-browser preview. */
  preview_url: string | null;
}

export type ToolState = TextToolState | ImageToolState;

interface ToolsStore {
  tools: ToolState[];
  /** ID of the tool that is waiting for a click-to-place anchor. */
  placingToolId: string | null;

  addTextTool: () => void;
  addImageTool: () => void;
  updateTool: (id: string, patch: Partial<ToolState>) => void;
  removeTool: (id: string) => void;
  startPlacing: (id: string) => void;
  cancelPlacing: () => void;
  placeAnchor: (x_pct: number, y_pct: number, page: number) => void;
  clearAll: () => void;
  loadPreset: (rawTools: Record<string, unknown>[]) => void;
}

let _seq = 0;
function uid() {
  return `tool-${++_seq}-${Date.now()}`;
}

export const useToolsStore = create<ToolsStore>((set, get) => ({
  tools: [],
  placingToolId: null,

  addTextTool: () =>
    set((s) => ({
      tools: [
        ...s.tools,
        {
          id: uid(),
          type: "text",
          page: 0,
          x_pct: null,
          y_pct: null,
          text: "",
          font_size: 12,
          color: [0, 0, 0],
        } satisfies TextToolState,
      ],
    })),

  addImageTool: () =>
    set((s) => ({
      tools: [
        ...s.tools,
        {
          id: uid(),
          type: "image",
          page: 0,
          x_pct: null,
          y_pct: null,
          width_pct: 0.2,
          height_pct: 0.1,
          source: "signature",
          custom_image_path: null,
          preview_url: null,
        } satisfies ImageToolState,
      ],
    })),

  updateTool: (id, patch) =>
    set((s) => ({
      tools: s.tools.map((t) =>
        t.id === id ? ({ ...t, ...patch } as ToolState) : t
      ),
    })),

  removeTool: (id) =>
    set((s) => ({
      tools: s.tools.filter((t) => t.id !== id),
      placingToolId: s.placingToolId === id ? null : s.placingToolId,
    })),

  startPlacing: (id) => set({ placingToolId: id }),
  cancelPlacing: () => set({ placingToolId: null }),

  placeAnchor: (x_pct, y_pct, page) => {
    const { placingToolId } = get();
    if (!placingToolId) return;
    set((s) => ({
      tools: s.tools.map((t) =>
        t.id === placingToolId ? { ...t, x_pct, y_pct, page } : t
      ),
      placingToolId: null,
    }));
  },

  clearAll: () => set({ tools: [], placingToolId: null }),

  loadPreset: (rawTools: Record<string, unknown>[]) => {
    const tools: ToolState[] = rawTools.map((t) => {
      const base = {
        id: uid(),
        page: (t.page as number) ?? 0,
        x_pct: t.x_pct != null ? (t.x_pct as number) : null,
        y_pct: t.y_pct != null ? (t.y_pct as number) : null,
      };
      if (t.type === "image") {
        return {
          ...base,
          type: "image" as const,
          width_pct: (t.width_pct as number) ?? 0.2,
          height_pct: (t.height_pct as number) ?? 0.1,
          source: (t.source as "signature" | "custom") ?? "signature",
          custom_image_path: (t.custom_image_path as string | null) ?? null,
          preview_url: null, // object URLs can't be persisted
        } satisfies ImageToolState;
      }
      return {
        ...base,
        type: "text" as const,
        text: (t.text as string) ?? "",
        font_size: (t.font_size as number) ?? 12,
        color: (t.color as [number, number, number]) ?? [0, 0, 0],
      } satisfies TextToolState;
    });
    set({ tools, placingToolId: null });
  },
}));
