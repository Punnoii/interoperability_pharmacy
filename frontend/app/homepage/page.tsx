"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import QueryPanel from "@/components/query/QueryPanel";
import SubstanceSimilarity from "@/components/similarity/SubstanceSimilarity";
import UploadPanel from "@/components/upload/UploadPanel";
import { useDarkMode } from "@/lib/useDarkMode";

// main workspace, sidebar switches between the three panels, all kept mounted-on-demand
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

        <main className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col">
          {activeTab === "query" && <QueryPanel isDark={isDark} />}
          {activeTab === "explore" && <SubstanceSimilarity isDark={isDark} />}
          {activeTab === "upload" && <UploadPanel isDark={isDark} />}
        </main>
      </div>
    </div>
  );
}
