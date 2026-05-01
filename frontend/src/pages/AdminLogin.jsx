import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldAlert } from "lucide-react";
import Header from "../components/Header";

export default function AdminLogin() {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (credentials.username === "admin" && credentials.password === "admin") {
      // Very simple hardcoded admin auth
      sessionStorage.setItem("isAdminAuth", "true");
      navigate("/admin/dashboard");
    } else {
      setError("Invalid admin credentials");
    }
  };

  return (
    <div className="vh-100 vw-100 d-flex flex-column text-white" style={{ background: "#050508" }}>

      <div className="flex-grow-1 d-flex align-items-center justify-content-center">
        <div className="musika-card p-5" style={{ width: "400px", background: "#121216", border: "1px solid #7C3AED" }}>
          <div className="text-center mb-4">
            <Lock size={48} className="text-warning mb-3" style={{ color: "#F59E0B" }} />
            <h2 className="fw-bold mb-1">Admin Access</h2>
            <p className="text-secondary small">Restricted Area</p>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 p-2 small mb-4">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="d-flex flex-column gap-3">
            <input
              type="text"
              className="form-control musika-input"
              placeholder="Username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              required
            />
            <input
              type="password"
              className="form-control musika-input"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
            />
            <button type="submit" className="btn fw-bold mt-2" style={{ backgroundColor: "#7C3AED", color: "white" }}>
              LOGIN
            </button>
            <button type="button" className="btn btn-link text-secondary" onClick={() => navigate("/")}>
              Return to Home
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
