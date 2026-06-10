"use client";

import Login from "@/components/login/login";

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Login />
      </div>
    </div>
  );
}
