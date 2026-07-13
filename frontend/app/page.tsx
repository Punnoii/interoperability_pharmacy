"use client";

import Login from "@/components/login/login";

// root route "/" — the login screen (email/password + google button live in Login)
export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Login />
      </div>
    </div>
  );
}
