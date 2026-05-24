"use client";

import { Clock, Settings } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDark: boolean;
}

const navItems = [
  {
    key: "query",
    label: "Query",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    key: "explore",
    label: "Explore",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    key: "dashboards",
    label: "Dashboards",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
];

const bottomItems = [
  {
    key: "bookmark",
    label: "Bookmarks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  { key: "history", label: "History", icon: <Clock size={18} /> },
  { key: "settings", label: "Settings", icon: <Settings size={18} /> },
];

export default function Sidebar({ activeTab, setActiveTab, isDark }: SidebarProps) {
  return (
    <aside
      className={`flex flex-col w-44 shrink-0 py-4 px-3 gap-4 border-r ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
      }`}
    >
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          const active = isDark
            ? "bg-blue-900/40 text-blue-300"
            : "bg-blue-50 text-blue-700";
          const inactive = isDark
            ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900";
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-left ${
                isActive ? active : inactive
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div
        className={`mt-auto flex flex-col gap-1 pt-3 border-t ${
          isDark ? "border-slate-800" : "border-gray-200"
        }`}
      >
        {bottomItems.map((item) => (
          <button
            key={item.key}
            aria-label={item.label}
            className={`w-full h-9 flex items-center justify-center rounded-md ${
              isDark
                ? "text-slate-500 hover:bg-slate-800 hover:text-slate-100"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </aside>
  );
}
