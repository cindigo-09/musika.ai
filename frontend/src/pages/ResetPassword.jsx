import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  // Supabase redirects with a session embedded in the URL hash.
  // We listen for the auth state change to confirm the session is active.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="container-fluid">
        <div className="row g-0">
          {/* Brand column */}
          <div className="col-md-6 d-flex flex-column justify-content-center align-items-center text-center p-5">
            <h1 className="page-title display-4">MUSIKA AI</h1>
            <p className="text-white opacity-75 font-italic">
              "A music player to bridge the gap between your soul and the different human melodies."
            </p>
          </div>

          {/* Form column */}
          <div className="col-md-6 d-flex justify-content-center align-items-center">
            <div className="card musika-card p-5" style={{ width: "420px" }}>
              <h3
                className="mb-2 text-center"
                style={{ color: "var(--mana-gold)", letterSpacing: "3px", fontSize: "1.1rem" }}
              >
                RESET PASSWORD
              </h3>
              <p className="text-center small mb-4" style={{ color: "var(--mana-silver)", opacity: 0.7 }}>
                Enter your new password below.
              </p>

              {success ? (
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
                  ✅ Your password has been reset successfully. You can now log in.
                  <div className="mt-2 small" style={{ color: "var(--mana-silver)", opacity: 0.6 }}>
                    Redirecting to login…
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  {/* New Password */}
                  <div className="mb-4 position-relative">
                    <input
                      type={showNew ? "text" : "password"}
                      className="form-control musika-input"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                      required
                    />
                    {newPassword.length > 0 && (
                      <span
                        style={{ cursor: "pointer", position: "absolute", right: "15px", top: "12px", color: "var(--mana-gold)", opacity: 0.7 }}
                        onClick={() => setShowNew(!showNew)}
                      >
                        {showNew ? <EyeOff size={18} color="white" /> : <Eye size={18} color="white" />}
                      </span>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-4 position-relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="form-control musika-input"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      required
                    />
                    {confirmPassword.length > 0 && (
                      <span
                        style={{ cursor: "pointer", position: "absolute", right: "15px", top: "12px", color: "var(--mana-gold)", opacity: 0.7 }}
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        {showConfirm ? <EyeOff size={18} color="white" /> : <Eye size={18} color="white" />}
                      </span>
                    )}
                  </div>

                  {/* Inline error */}
                  {error && (
                    <div
                      className="mb-3 p-2 rounded small"
                      style={{
                        background: "rgba(255, 107, 107, 0.1)",
                        border: "1px solid rgba(255, 107, 107, 0.3)",
                        color: "#ff6b6b",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn w-100 py-3"
                    style={{ border: "1px solid var(--mana-gold)", color: "var(--mana-gold)" }}
                  >
                    {loading ? "Updating..." : "Reset Password"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
