import React, { useState } from "react";
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useMusic } from "../context/MusicContext";
export default function SecuritySection() {
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: "", type: "" });

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (passwords.new !== passwords.confirm) {
      setStatus({ message: "New passwords do not match.", type: "danger" });
      return;
    }

    if (passwords.new.length < 6) {
      setStatus({
        message: "Password must be at least 6 characters.",
        type: "danger",
      });
      return;
    }

    setLoading(true);
    setStatus({ message: "", type: "" });

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

      setStatus({ message: "Password updated successfully!", type: "success" });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      setStatus({ message: error.message, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="musika-card p-4 border border-secondary rounded-4 bg-dark bg-opacity-25 shadow-sm">
      <h6 className="text-warning mb-4 d-flex align-items-center gap-2 text-uppercase fw-bold">
        <KeyRound size={18} /> Update Password
      </h6>

      <form onSubmit={handleUpdatePassword}>
        <div className="mb-3">
          <label className="x-small text-secondary text-uppercase mb-1 d-block">
            Current Password
          </label>
          <input
            type="password"
            className="form-control bg-transparent border-secondary text-white shadow-none"
            placeholder="••••••••"
            value={passwords.current}
            onChange={(e) =>
              setPasswords({ ...passwords, current: e.target.value })
            }
            required
          />
        </div>

        <div className="mb-3">
          <label className="x-small text-secondary text-uppercase mb-1 d-block">
            New Password
          </label>
          <input
            type="password"
            className="form-control bg-transparent border-secondary text-white shadow-none"
            placeholder="••••••••"
            value={passwords.new}
            onChange={(e) =>
              setPasswords({ ...passwords, new: e.target.value })
            }
            required
          />
        </div>

        <div className="mb-4">
          <label className="x-small text-secondary text-uppercase mb-1 d-block">
            Confirm Password
          </label>
          <input
            type="password"
            className="form-control bg-transparent border-secondary text-white shadow-none"
            placeholder="••••••••"
            value={passwords.confirm}
            onChange={(e) =>
              setPasswords({ ...passwords, confirm: e.target.value })
            }
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-warning btn-sm w-100 fw-bold py-2 shadow-sm d-flex align-items-center justify-content-center gap-2"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "CHANGE PASSWORD"
          )}
        </button>
      </form>

      {status.message && (
        <div
          className={`alert alert-${status.type} py-2 x-small mt-3 mb-0 d-flex align-items-center gap-2 justify-content-center fw-bold`}
        >
          {status.type === "success" ? (
            <CheckCircle2 size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          {status.message}
        </div>
      )}
    </div>
  );
}
