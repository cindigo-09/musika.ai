import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Camera, Loader2, User } from "lucide-react";

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

function ProfileSection() {
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({
    username: "",
    bio: "",
    avatar_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [savingMessage, setSavingMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // If cache was cleared and user is null, stop the function
      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("username, bio, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile({
          username: data.username || "New User",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
        });
      }
    };
    fetchProfile();
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !userId) return;

    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const usernamePath = slugify(
        user.user_metadata?.full_name || user.email.split("@")[0],
      );

      if (profile.avatar_url) {
        try {
          const oldPath = profile.avatar_url.split("/songs/")[1].split("?")[0];
          await supabase.storage.from("songs").remove([oldPath]);
        } catch (err) {
          console.log("Old file cleanup skipped");
        }
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `${usernamePath}-tracks/avatar-${userId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("songs").getPublicUrl(filePath);
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({
          username: profile.username,
          bio: profile.bio,
        })
        .eq("id", userId);
      setSavingMessage("Changes saved successfully!");
      setTimeout(() => setSavingMessage(""), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-dark bg-opacity-50 p-4 rounded-4 border border-secondary">
      <div className="d-flex align-items-center gap-4 mb-4">
        <div
          className="position-relative"
          style={{ width: 100, height: 100, flexShrink: 0 }}
        >
          <div className="w-100 h-100 rounded-circle overflow-hidden border border-secondary d-flex align-items-center justify-content-center bg-black shadow-lg">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-100 h-100 object-fit-cover"
                alt="Profile"
              />
            ) : (
              <User size={50} className="text-secondary" />
            )}
          </div>
          <label className="position-absolute bottom-0 end-0 bg-warning p-2 rounded-circle cursor-pointer shadow border border-dark">
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Camera size={16} className="text-dark" />
            )}
            <input
              type="file"
              className="d-none"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
          </label>
        </div>

        <div className="flex-grow-1">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input
              type="text"
              className="fw-bold bg-transparent border-0 text-white h4 p-0 m-0 custom-username-input"
              style={{
                outline: "none",
                borderBottom: "2px solid transparent",
                width: "auto",
                minWidth: "150px",
              }}
              value={profile.username}
              onChange={(e) =>
                setProfile({ ...profile, username: e.target.value })
              }
              placeholder="Your Username"
            />
            <span className="badge bg-warning text-dark small fw-bold">
              PROFILE
            </span>
          </div>
          <p className="text-secondary small mb-0">
            Update your photo and personal details.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="mb-4">
          <label className="small text-warning text-uppercase fw-bold mb-2 d-block">
            Public Bio
          </label>
          <textarea
            className="form-control bg-transparent border-0 border-bottom border-secondary rounded-0 text-light px-0"
            rows="2"
            style={{ resize: "none", boxShadow: "none" }}
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            placeholder="Tell us about yourself..."
          />
        </div>

        {savingMessage && (
          <div className="alert alert-warning py-2 small fw-bold mb-3">
            {savingMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-warning text-dark px-5 py-2 fw-bold text-uppercase shadow-sm"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>

      <style>{`
        .custom-username-input:focus {
          border-bottom: 2px solid #ffc107 !important;
          transition: border-bottom 0.3s ease;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>
    </section>
  );
}

export default ProfileSection;
