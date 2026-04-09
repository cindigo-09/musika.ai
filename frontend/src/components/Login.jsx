import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    // Your login logic here
    navigate("/home");
  };

  return (
    <div className="auth-page-wrapper">
      <div className="container-fluid">
        <div className="row g-0">
          <div className="col-md-6 d-flex flex-column justify-content-center align-items-center text-center p-5">
            <h1 className="mana-title display-4">MUSIKA AI</h1>
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
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="mb-4 position-relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control musika-input"
                    placeholder="Password"
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  <span
                    className="password-toggle-eye"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
                <div className="text-end mb-4">
                  <Link
                    to="/forgot"
                    className="small"
                    style={{
                      color: "var(--mana-gold)",
                      textDecoration: "none",
                    }}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <button
                  className="btn w-100 py-3"
                  style={{
                    border: "1px solid var(--mana-gold)",
                    color: "var(--mana-gold)",
                  }}
                >
                  RELEASE MAGIC
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
