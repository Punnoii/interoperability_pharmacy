"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import QueryPanel from "@/components/query/QueryPanel";
import SubstancePanel from "@/components/substance/SubstancePanel";
import SubstanceSimilarity from "@/components/similarity/SubstanceSimilarity";
import UploadPanel from "@/components/upload/UploadPanel";
import { useDarkMode } from "@/lib/useDarkMode";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("query");
  const [isDark, setIsDark] = useDarkMode();

  return (
    <div
      className="flex flex-col h-screen transition-colors duration-300"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
          : "linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%)",
      }}
    >
      <Header isDark={isDark} setIsDark={setIsDark} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isDark={isDark} />

        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "query" && <QueryPanel isDark={isDark} />}
          {activeTab === "substances" && <SubstancePanel isDark={isDark} />}
          {activeTab === "explore" && <SubstanceSimilarity isDark={isDark} />}
          {activeTab === "upload" && <UploadPanel isDark={isDark} />}
        </main>
      </div>
    </div>
  );
}

function ComingSoon({ isDark, label }: { isDark: boolean; label: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full gap-3 ${
        isDark ? "text-slate-500" : "text-gray-400"
      }`}
    >
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <p className={`text-lg font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>{label}</p>
      <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>Coming soon</p>
    </div>
  );
}
