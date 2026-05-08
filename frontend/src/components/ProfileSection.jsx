import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function ProfileSection() {
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState({ username: "", bio: "" });
  const [loading, setLoading] = useState(false);
  const [savingMessage, setSavingMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("username, bio")
        .eq("id", user.id)
        .single();

      if (data) {
        setForm({
          username: data.username || "",
          bio: data.bio || "",
        });
      } else if (user.user_metadata && user.user_metadata.username) {
        setForm({
          username: user.user_metadata.username,
          bio: "",
        });
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setSavingMessage("");

    try {
      const nextUsername = form.username.trim();
      const nextBio = form.bio ?? "";

      // 1) Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: nextUsername,
          bio: nextBio,
        })
        .eq("id", userId);

      // 2) Also sync Auth metadata so UI/other pages that use metadata stay consistent
      const { error: authError } = await supabase.auth.updateUser({
        data: { username: nextUsername },
      });

      if (profileError || authError) {
        throw new Error(profileError?.message || authError?.message);
      }

      setSavingMessage("Profile updated!");
      // Soft-refresh form from DB to ensure it’s consistent with RLS defaults
      const { data: fresh } = await supabase
        .from("profiles")
        .select("username, bio")
        .eq("id", userId)
        .single();

      if (fresh)
        setForm({ username: fresh.username || "", bio: fresh.bio || "" });
    } catch (err) {
      alert("Error updating profile: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <section
        className="p-4 rounded-4 shadow-sm"
        style={{
          backgroundColor: "rgba(39, 42, 49, 0.6)",
          border: "1px solid #32353c",
        }}
      >
        <div className="d-flex align-items-center gap-4 mb-4">
          <div className="position-relative">
            <img
              src="https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/no-profile-picture-icon.png"
              className="rounded-circle border border-warning p-1"
              style={{ width: "100px", height: "100px" }}
              alt="Avatar"
            />
            {/* Your profiles schema currently has no photo/avatar column, so upload/remove is not implemented */}
            <button
              className="btn btn-warning btn-sm position-absolute bottom-0 end-0 rounded-circle p-2"
              type="button"
              onClick={() =>
                alert(
                  "Photo upload is not available: profiles table has no photo/avatar column.",
                )
              }
              title="Photo upload not available"
            >
              <span
                className="material-symbols-outlined text-dark"
                style={{ fontSize: "16px" }}
              >
                edit
              </span>
            </button>
          </div>

          <div>
            <h5 className="mb-1 font-headline">
              {form.username || "Your Username"}
            </h5>
            <div className="d-flex gap-2 mt-3">
              <button
                className="btn btn-sm btn-outline-secondary text-uppercase px-3"
                type="button"
                onClick={() =>
                  alert(
                    "Photo upload is not available: profiles table has no photo/avatar column.",
                  )
                }
              >
                Upload New
              </button>
              <button
                className="btn btn-sm text-danger text-uppercase px-3"
                type="button"
                onClick={() =>
                  alert(
                    "Photo upload is not available: profiles table has no photo/avatar column.",
                  )
                }
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <form className="mt-4" onSubmit={handleSave}>
          <div className="mb-4">
            <label className="small text-warning text-uppercase fw-bold mb-2">
              Username
            </label>
            <input
              type="text"
              className="form-control bg-transparent border-0 border-bottom border-secondary rounded-0 text-light px-0"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div className="mb-4">
            <label className="small text-warning text-uppercase fw-bold mb-2">
              Bio
            </label>
            <textarea
              className="form-control bg-transparent border-0 border-bottom border-secondary rounded-0 text-light px-0"
              rows="2"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          {savingMessage ? (
            <div className="text-warning fw-bold small mb-3">
              {savingMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-warning text-dark px-5 py-2 fw-bold text-uppercase"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default ProfileSection;
