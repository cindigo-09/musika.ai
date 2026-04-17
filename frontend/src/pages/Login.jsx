import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
// 1. Import the supabase client
import { supabase } from "../supabaseClient";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // New: Loading state
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 2. Use Supabase SDK instead of fetch
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) throw error;

      // 3. Success! Supabase saves the session in local storage automatically.
      // We can still manually save the email/username for UI display if needed.
      localStorage.setItem("username", data.user.email);
      localStorage.setItem("userId", data.user.id);

      navigate("/home");
    } catch (error) {
      alert(error.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
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
              <h3
                className="mb-5 text-center"
                style={{ color: "var(--mana-gold)", letterSpacing: "4px" }}
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
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-4 position-relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control musika-input"
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    required
                  />
                  <span
                    className="password-toggle-eye"
                    style={{ cursor: "pointer", position: "absolute", right: "15px", top: "12px" }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn w-100 py-3"
                  style={{
                    border: "1px solid var(--mana-gold)",
                    color: "var(--mana-gold)",
                  }}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}