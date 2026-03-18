"use client";

import { Clock, Settings } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  {
    key: "query",
    label: "Query",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    key: "explore",
    label: "Explore",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    key: "dashboards",
    label: "Dashboards",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: "history",
    label: "History",
    icon: <Clock size={20} />,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings size={20} />,
  },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside
      className="flex flex-col w-[180px] shrink-0 py-4 px-3 gap-4 border-r border-black/[0.08]"
      style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)" }}
    >
      {/* Nav items */}
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-[10px] border-none text-sm font-medium text-left cursor-pointer transition-all duration-200
                ${isActive ? "text-[#2196f3] font-semibold" : "text-[#666] hover:text-[#2196f3]"}`}
              style={
                isActive
                  ? { background: "linear-gradient(135deg, rgba(33,150,243,0.15) 0%, rgba(25,118,210,0.15) 100%)" }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(33,150,243,0.08)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom icons */}
      <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-black/[0.08]">
        {bottomItems.map((item) => (
          <button
            key={item.key}
            aria-label={item.label}
            className="w-full h-10 flex items-center justify-center rounded-lg border-none bg-transparent text-[#666] cursor-pointer transition-all duration-200 hover:bg-black/5 hover:text-[#1a1a1a]"
          >
            {item.icon}
          </button>
        ))}
      </div>
    </aside>
  );
}
