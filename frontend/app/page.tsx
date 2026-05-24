"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import AuthOverlay from "@/components/auth/AuthOverlay";
import "@/components/auth/auth.css";

export default function AuthLanding() {
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    if (!email || !password) {
      alert("Please fill in email and password");
      return;
    }

    console.info("[demo-auth] login submitted, routing to /homepage");
    router.push("/homepage");
  };

  const handleRegister = async (username: string, email: string, _password: string) => {
    if (!username || !email) {
      alert("Please fill in name and email");
      return;
    }
    console.info("[demo-auth] register submitted for", email);
    alert("Demo register success! Please log in.");
    setIsRegistering(false);
  };

  return (
    <main className="auth-main">
      <link rel="stylesheet" href="https://cdn.lineicons.com/4.0/lineicons.css" />

      <div className={`container ${isRegistering ? "right-panel-active" : ""}`} id="container">
        <RegisterForm
          onSubmit={handleRegister}
          onSwitchToLogin={() => setIsRegistering(false)}
        />
        <LoginForm
          onSubmit={handleLogin}
          onSwitchToRegister={() => setIsRegistering(true)}
        />
        <AuthOverlay
          onSwitchToLogin={() => setIsRegistering(false)}
          onSwitchToRegister={() => setIsRegistering(true)}
        />
      </div>
    </main>
  );
}
