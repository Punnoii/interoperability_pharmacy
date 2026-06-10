"use client";

interface RegisterFormProps {
  onSubmit: (username: string, email: string, password: string) => void | Promise<void>;
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSubmit, onSwitchToLogin }: RegisterFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    await onSubmit(username, email, password);
  };

  return (
    <div className="form-container register-container">
      <form onSubmit={handleSubmit}>
        <h1>Register</h1>
        <input type="text" name="username" placeholder="Name" required />
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button type="submit">Register</button>
        <div className="mobile-toggle">
          <p>Already have an account?</p>
          <button type="button" className="toggle-btn" onClick={onSwitchToLogin}>
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
}
