"use client";

import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

interface GraphControlsProps {
  isDark: boolean;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

// little zoom in/out + reset button cluster overlaid on the graph; all it does is call back
// into GraphCanvas's imperative handle
export default function GraphControls({
  isDark,
  onResetView,
  onZoomIn,
  onZoomOut,
}: GraphControlsProps) {
  const wrap = isDark
    ? "bg-slate-800 border-slate-700 text-slate-300"
    : "bg-white border-gray-200 text-gray-700";
  const btnHover = isDark ? "hover:bg-slate-700" : "hover:bg-gray-100";
  const divider = isDark ? "border-slate-700" : "border-gray-200";

  return (
    <div className={`flex rounded overflow-hidden border ${wrap}`}>
      <button
        onClick={onZoomIn}
        aria-label="Zoom in"
        className={`w-8 h-8 flex items-center justify-center ${btnHover}`}
      >
        <ZoomIn size={14} />
      </button>
      <button
        onClick={onZoomOut}
        aria-label="Zoom out"
        className={`w-8 h-8 flex items-center justify-center border-l ${divider} ${btnHover}`}
      >
        <ZoomOut size={14} />
      </button>
      <button
        onClick={onResetView}
        aria-label="Reset view"
        title="Reset zoom & unpin nodes"
        className={`w-8 h-8 flex items-center justify-center border-l ${divider} ${btnHover}`}
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
