// central light/dark tailwind class map — components read from here so we tweak palette in one spot, not per-component
export function themeClasses(isDark: boolean) {
  return {
    text:     isDark ? "text-slate-100" : "text-gray-900",
    heading:  isDark ? "text-slate-100" : "text-gray-900",
    subtle:   isDark ? "text-slate-300" : "text-gray-700",
    muted:    isDark ? "text-slate-400" : "text-gray-500",
    card:     isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200",
    rowDiv:   isDark ? "border-slate-800" : "border-gray-200",
    inputBg:  isDark ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200",
    input:    isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-gray-300 text-gray-900",
    btnBase:  isDark
      ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
      : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50",
    statBox:  isDark
      ? "rounded border border-slate-800 bg-slate-950 p-2"
      : "rounded border border-gray-200 bg-gray-50 p-2",
    surface:  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200",
    ok:       isDark ? "text-emerald-300 border-emerald-900/50" : "text-emerald-700 border-emerald-200",
    err:      isDark ? "text-red-300 border-red-900/50" : "text-red-600 border-red-200",
  };
}

export type ThemeClasses = ReturnType<typeof themeClasses>;
