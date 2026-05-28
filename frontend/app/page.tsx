"use client";

import { useState } from "react";
import Login from "@/components/login/login";
import Header from "@/components/layout/Header";

export default function Page() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* <Header isDark={isDark} setIsDark={setIsDark} /> */}
      <div className="flex-1">
        <Login />
      </div>
    </div>
  );
}
