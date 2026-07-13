"use client";

interface Props {
  isDark: boolean;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}

// clickable stat tile (e.g. bookmarks / history counts); the active one drives which section shows below
export default function StatBox({ isDark, label, value, active, onClick }: Props) {
  const card = active
    ? isDark ? "bg-blue-900/20 border-blue-700" : "bg-blue-50 border-blue-400"
    : isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";

  const labelColor = active
    ? isDark ? "text-blue-300" : "text-blue-700"
    : isDark ? "text-slate-200" : "text-gray-700";

  const valueColor = isDark ? "text-slate-100" : "text-gray-900";
  const hover = active ? "" : isDark ? "hover:bg-slate-800" : "hover:bg-gray-50";

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-5 py-4 transition-colors flex items-center justify-between gap-3 w-full text-left cursor-pointer ${card} ${hover}`}
    >
      <span className={`text-sm font-medium ${labelColor}`}>{label}</span>
      <span className={`text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</span>
    </button>
  );
}
