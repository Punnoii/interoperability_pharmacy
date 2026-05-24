"use client";

import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

interface GraphControlsProps {
  isDark: boolean;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function GraphControls({
  isDark,
  onResetView,
  onZoomIn,
  onZoomOut,
}: GraphControlsProps) {
  const bg = isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.9)";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const iconColor = isDark ? "#cbd5e1" : "#475569";

  const wrapStyle = {
    background: bg,
    border: `1px solid ${border}`,
    color: iconColor,
    backdropFilter: "blur(10px)",
    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.06)",
  } as const;

  return (
    <div className="flex rounded-xl overflow-hidden" style={wrapStyle}>
      <button
        onClick={onZoomIn}
        aria-label="Zoom in"
        className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-black/5"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onClick={onZoomOut}
        aria-label="Zoom out"
        className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-black/5"
        style={{ borderLeft: `1px solid ${border}` }}
      >
        <ZoomOut size={16} />
      </button>
      <button
        onClick={onResetView}
        aria-label="Reset view"
        title="Reset zoom & unpin nodes"
        className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-black/5"
        style={{ borderLeft: `1px solid ${border}` }}
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}
