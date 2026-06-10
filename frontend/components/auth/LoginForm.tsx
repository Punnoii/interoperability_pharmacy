"use client";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void | Promise<void>;
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onSubmit, onSwitchToRegister }: LoginFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    await onSubmit(email, password);
  };

  return (
    <div className="form-container login-container">
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <div className="content">
          <div className="checkbox">
            <input type="checkbox" />
            <label>Remember me</label>
          </div>
          <div className="pass-link">
            <a href="#">Forgot password</a>
          </div>
        </div>
        <button type="submit">Login</button>
        <div className="mobile-toggle">
          <p>Don&apos;t have an account?</p>
          <button type="button" className="toggle-btn" onClick={onSwitchToRegister}>
            Create Account
          </button>
        </div>
      </form>
    </div>
  );
}
