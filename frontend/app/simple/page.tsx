"use client";

import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import QueryPanel from "./components/QueryPanel";

export default function SimplePage() {
  const [activeTab, setActiveTab] = useState("query");
  const [isDark, setIsDark] = useState(false);

  return (
    <div
      className="flex flex-col h-screen transition-colors duration-300"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
          : "linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%)",
      }}
    >
      {/* Header — full width at top */}
      <Header isDark={isDark} setIsDark={setIsDark} />

      {/* Body: Sidebar + main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar controls active tab */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} />

        {/* Main content area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "query" && <QueryPanel isDark={isDark} />}

          {activeTab === "explore" && (
            <div className={`flex flex-col items-center justify-center h-full gap-3 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <p className={`text-lg font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>Explore</p>
              <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>Coming soon</p>
            </div>
          )}

          {activeTab === "dashboards" && (
            <div className={`flex flex-col items-center justify-center h-full gap-3 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <p className={`text-lg font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>Dashboards</p>
              <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>Coming soon</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
