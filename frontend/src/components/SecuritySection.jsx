import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { ArrowBigRight } from "lucide-react";

function SecuritySection() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill out all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      // Supabase requires re-auth for sensitive operations depending on your setup.
      // We'll re-login with the current password, then update password.
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: (await supabase.auth.getUser()).data.user?.email,
          password: currentPassword,
        });

      if (signInError) throw signInError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      alert("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      // Try to show a useful error message
      alert(err?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <section className="p-4 rounded-4" style={{ backgroundColor: "#191c22" }}>
        <h6 className="text-uppercase fw-bold mb-4 d-flex align-items-center gap-2">
          <span className="material-symbols-outlined text-warning">
            encrypted
          </span>{" "}
          Security
        </h6>

        <div className="list-group list-group-flush gap-3">
          <div className="list-group-item bg-transparent border rounded p-3 d-flex justify-content-between align-items-center">
            <span className="small fw-bold text-light">Change Password</span>
            <span className="material-symbols-outlined text-muted small text-light">
              <ArrowBigRight color="white" />
            </span>
          </div>

          <form onSubmit={handleChangePassword} className="p-2">
            <div className="mb-3">
              <label className="small text-warning text-uppercase fw-bold mb-2 d-block">
                Current Password
              </label>
              <input
                type="password"
                className="form-control bg-transparent border-0 border-bottom border-secondary rounded-0 text-light px-0"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="small text-warning text-uppercase fw-bold mb-2 d-block">
                New Password
              </label>
              <input
                type="password"
                className="form-control bg-transparent border-0 border-bottom border-secondary rounded-0 text-light px-0"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="small text-warning text-uppercase fw-bold mb-2 d-block">
                Confirm New Password
              </label>
              <input
                type="password"
                className="form-control bg-transparent border-0 border-bottom border-secondary rounded-0 text-light px-0"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-warning text-dark px-5 py-2 fw-bold text-uppercase w-100"
            >
              {saving ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default SecuritySection;
