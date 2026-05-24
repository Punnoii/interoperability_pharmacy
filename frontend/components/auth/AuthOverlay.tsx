"use client";

interface AuthOverlayProps {
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
}

export default function AuthOverlay({ onSwitchToLogin, onSwitchToRegister }: AuthOverlayProps) {
  return (
    <div className="overlay-container">
      <div className="overlay">
        <div className="overlay-panel overlay-left">
          <h1 className="title">
            Hello <br /> friends
          </h1>
          <p>if you have an account, login here and search the data</p>
          <button className="ghost" onClick={onSwitchToLogin}>
            Login <i className="lni lni-arrow-left login"></i>
          </button>
        </div>
        <div className="overlay-panel overlay-right">
          <h1 className="title">
            Start your <br /> journey now
          </h1>
          <p>if you don&apos;t have an account yet, join us and start your journey</p>
          <button className="ghost" onClick={onSwitchToRegister}>
            Register <i className="lni lni-arrow-right register"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
