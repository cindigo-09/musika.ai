import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [view, setView] = useState("login"); // "login" | "forgot"
  const [form, setForm] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) throw error;

      localStorage.setItem("username", data.user.email);
      localStorage.setItem("userId", data.user.id);

      navigate("/home");
    } catch (error) {
      alert(error.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Always show success for security (don't reveal if email exists)
      setForgotSuccess(true);
    } catch (err) {
      // Still show success to prevent email enumeration
      setForgotSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setView("login");
    setForgotEmail("");
    setForgotError("");
    setForgotSuccess(false);
  };

  return (
    <div className="auth-page-wrapper">
      <div className="container-fluid">
        <div className="row g-0">
          <div className="col-md-6 d-flex flex-column justify-content-center align-items-center text-center p-5">
            <h1 className="page-title display-4">MUSIKA AI</h1>
            <p className="text-white opacity-75 font-italic">
              "A music player to bridge the gap between your soul and the
              different human melodies."
            </p>
          </div>
          <div className="col-md-6 d-flex justify-content-center align-items-center">
            <div className="card musika-card p-5" style={{ width: "420px" }}>

              {/* ── LOGIN VIEW ── */}
              {view === "login" && (
                <>
                  <h3
                    className="mb-5 text-center user-select-none"
                    style={{ color: "var(--mana-gold)", letterSpacing: "4px", cursor: "default" }}
                    onClick={() => {
                      const newCount = clickCount + 1;
                      if (newCount >= 5) {
                        navigate("/admin");
                      } else {
                        setClickCount(newCount);
                      }
                    }}
                  >
                    LOGIN
                  </h3>
                  <form onSubmit={handleLogin}>
                    <div className="mb-4">
                      <input
                        type="email"
                        className="form-control musika-input"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="mb-2 position-relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control musika-input"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                      />
                      {form.password.length > 0 && (
                        <span
                          className="password-toggle-eye"
                          style={{ cursor: "pointer", position: "absolute", right: "15px", top: "12px" }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={18} color="white" /> : <Eye size={18} color="white" />}
                        </span>
                      )}
                    </div>

                    {/* Forgot Password link */}
                    <div className="mb-4 text-end">
                      <button
                        type="button"
                        className="btn btn-link p-0 small text-decoration-none"
                        style={{ color: "var(--mana-gold)", fontSize: "0.8rem", opacity: 0.75 }}
                        onClick={() => setView("forgot")}
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn w-100 py-3"
                      style={{ border: "1px solid var(--mana-gold)", color: "var(--mana-gold)" }}
                    >
                      {loading ? "Authenticating..." : "Login"}
                    </button>
                  </form>
                  <Link
                    to="/register"
                    className="mt-4 text-center small text-white-50 text-decoration-none"
                  >
                    New User? Register.
                  </Link>
                </>
              )}

              {/* ── FORGOT PASSWORD VIEW ── */}
              {view === "forgot" && (
                <>
                  <h3
                    className="mb-2 text-center"
                    style={{ color: "var(--mana-gold)", letterSpacing: "3px", fontSize: "1.1rem" }}
                  >
                    FORGOT PASSWORD
                  </h3>
                  <p className="text-center small mb-4" style={{ color: "var(--mana-silver)", opacity: 0.7 }}>
                    Enter your registered email and we'll send you a reset link.
                  </p>

                  {forgotSuccess ? (
                    <div
                      className="text-center p-3 rounded"
                      style={{
                        background: "rgba(29, 185, 84, 0.1)",
                        border: "1px solid rgba(29, 185, 84, 0.3)",
                        color: "#1DB954",
                        fontSize: "0.9rem",
                        lineHeight: "1.6",
                      }}
                    >
                      ✅ If an account with that email exists, a password reset link has been sent. Please check your inbox.
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword}>
                      <div className="mb-3">
                        <input
                          type="email"
                          className="form-control musika-input"
                          placeholder="Email address"
                          value={forgotEmail}
                          onChange={(e) => {
                            setForgotEmail(e.target.value);
                            setForgotError("");
                          }}
                          required
                        />
                        {forgotError && (
                          <div className="mt-2 small" style={{ color: "#ff6b6b" }}>
                            {forgotError}
                          </div>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="btn w-100 py-3 mb-3"
                        style={{ border: "1px solid var(--mana-gold)", color: "var(--mana-gold)" }}
                      >
                        {loading ? "Sending..." : "Send Reset Link"}
                      </button>
                    </form>
                  )}

                  <button
                    type="button"
                    className="btn btn-link w-100 text-center small text-decoration-none mt-2"
                    style={{ color: "var(--mana-silver)", opacity: 0.6 }}
                    onClick={handleBackToLogin}
                  >
                    ← Back to Login
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
