"use client";

import Link from "next/link";
import { Clock, Settings, FlaskConical, HelpCircle, GitCompare } from "lucide-react";

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
    key: "substances",
    label: "Substances",
    icon: <FlaskConical size={18} />,
  },
  {
    key: "explore",
    label: "Similarity",
    icon: <GitCompare size={18} />,
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

interface BottomItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
}

const bottomItems: BottomItem[] = [
  { key: "help", label: "Help", icon: <HelpCircle size={18} /> },
  { key: "history", label: "History", icon: <Clock size={18} />, href: "/history" },
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
        {bottomItems.map((item) => {
          const cls = `w-full h-9 flex items-center justify-center rounded-md ${
            isDark
              ? "text-slate-500 hover:bg-slate-800 hover:text-slate-100"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          }`;
          if (item.href) {
            return (
              <Link key={item.key} href={item.href} aria-label={item.label} title={item.label} className={cls}>
                {item.icon}
              </Link>
            );
          }
          return (
            <button key={item.key} aria-label={item.label} title={item.label} className={cls}>
              {item.icon}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
