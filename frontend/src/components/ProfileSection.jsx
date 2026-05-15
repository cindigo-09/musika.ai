import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Camera, Loader2, User, X, ArrowLeft } from "lucide-react";
import { useMusic } from "../context/MusicContext";
import { useNavigate } from "react-router-dom";

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

function ProfileSection() {
  const { triggerToast } = useMusic();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({
    username: "",
    bio: "",
    avatar_url: "",
    is_public: true,
  });
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

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
        .select("username, bio, avatar_url, is_public")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile({
          username: data.username || "New User",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          is_public: data.is_public ?? true,
        });

        // Fetch Follow Counts
        const { count: followers } = await supabase
          .from("follows")
          .select("*", { count: 'exact', head: true })
          .eq("following_id", user.id);
        
        const { count: following } = await supabase
          .from("follows")
          .select("*", { count: 'exact', head: true })
          .eq("follower_id", user.id);
        
        setFollowerCount(followers || 0);
        setFollowingCount(following || 0);
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
      triggerToast("Avatar updated successfully!");
    } catch (err) {
      triggerToast(err.message, "error");
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
          is_public: profile.is_public,
        })
        .eq("id", userId);
      triggerToast("Profile changes saved!");
    } catch (err) {
      triggerToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async () => {
    if (!userId) return;
    setLoadingFollowers(true);
    try {
      const { data } = await supabase
        .from("follows")
        .select(`
          follower_id,
          profiles:follower_id (id, username, avatar_url, bio, is_public)
        `)
        .eq("following_id", userId);
      if (data) setFollowersList(data.map(item => item.profiles));
    } catch (err) { console.error(err); } finally { setLoadingFollowers(false); }
  };

  const fetchFollowing = async () => {
    if (!userId) return;
    setLoadingFollowing(true);
    try {
      const { data } = await supabase
        .from("follows")
        .select(`
          following_id,
          profiles:following_id (id, username, avatar_url, bio, is_public)
        `)
        .eq("follower_id", userId);
      if (data) setFollowingList(data.map(item => item.profiles));
    } catch (err) { console.error(err); } finally { setLoadingFollowing(false); }
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

          <div className="d-flex gap-4 mt-3">
            <div 
              className="cursor-pointer hover-text-warning"
              onClick={() => {
                setShowFollowersModal(true);
                fetchFollowers();
              }}
            >
              <span className="fw-bold h5 mb-0 text-white">{followerCount}</span>
              <span className="text-secondary small text-uppercase fw-bold ms-2" style={{ fontSize: '10px', letterSpacing: '1px' }}>Followers</span>
            </div>
            <div 
              className="cursor-pointer hover-text-warning"
              onClick={() => {
                setShowFollowingModal(true);
                fetchFollowing();
              }}
            >
              <span className="fw-bold h5 mb-0 text-white">{followingCount}</span>
              <span className="text-secondary small text-uppercase fw-bold ms-2" style={{ fontSize: '10px', letterSpacing: '1px' }}>Following</span>
            </div>
          </div>
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

        <div className="mb-5">
          <label className="small text-warning text-uppercase fw-bold mb-3 d-block">
            Privacy & Social
          </label>
          
          <div className="d-flex justify-content-between align-items-center mb-3 p-3 rounded-3 bg-dark bg-opacity-25 border border-secondary border-opacity-10">
            <div>
              <div className="fw-bold text-white small">Searchable Account</div>
              <p className="text-secondary x-small mb-0">Allow others to find you in search results</p>
            </div>
            <div className="form-check form-switch">
              <input 
                className="form-check-input custom-switch" 
                type="checkbox" 
                checked={profile.is_public}
                onChange={(e) => setProfile({ ...profile, is_public: e.target.checked })}
              />
            </div>
          </div>


        </div>

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
        .hover-text-warning:hover { color: #ffc107 !important; transition: color 0.2s; }
        .hover-bg-dark:hover { background: rgba(255,255,255,0.05); transition: background 0.2s; }
      `}</style>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 2000 }}>
          <div className="musika-card p-4 custom-scrollbar" style={{ width: '450px', maxHeight: '80vh', background: '#121216', border: '1px solid #ffc107', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="text-warning m-0 fw-bold">YOUR FOLLOWERS</h5>
              <button className="btn btn-link text-secondary p-0" onClick={() => setShowFollowersModal(false)}><X size={20} /></button>
            </div>
            {loadingFollowers ? (
              <div className="text-center py-4"><div className="spinner-border text-warning spinner-border-sm"></div></div>
            ) : followersList.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {followersList.map(follower => (
                  <div key={follower.id} className="d-flex align-items-center justify-content-between p-2 rounded hover-bg-dark cursor-pointer" onClick={() => {
                    if (follower.id === userId || follower.is_public) { setShowFollowersModal(false); navigate(`/user/${follower.id}`); }
                    else { triggerToast("This account is private", "info"); }
                  }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle overflow-hidden border border-secondary" style={{ width: 40, height: 40 }}>
                        {follower.avatar_url ? <img src={follower.avatar_url} className="w-100 h-100 object-fit-cover" alt="" /> : <User size={20} className="text-secondary m-2" />}
                      </div>
                      <div>
                        <div className="fw-bold small">{follower.username || "Anonymous"}</div>
                        <div className="text-secondary x-small text-truncate" style={{ maxWidth: '200px' }}>{follower.bio || "No bio"}</div>
                      </div>
                    </div>
                    <ArrowLeft size={16} className="text-secondary opacity-25" style={{ transform: 'rotate(180deg)' }} />
                  </div>
                ))}
              </div>
            ) : <p className="text-secondary text-center py-4">No followers yet.</p>}
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 2000 }}>
          <div className="musika-card p-4 custom-scrollbar" style={{ width: '450px', maxHeight: '80vh', background: '#121216', border: '1px solid #0dcaf0', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="text-info m-0 fw-bold">YOU ARE FOLLOWING</h5>
              <button className="btn btn-link text-secondary p-0" onClick={() => setShowFollowingModal(false)}><X size={20} /></button>
            </div>
            {loadingFollowing ? (
              <div className="text-center py-4"><div className="spinner-border text-info spinner-border-sm"></div></div>
            ) : followingList.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {followingList.map(following => (
                  <div key={following.id} className="d-flex align-items-center justify-content-between p-2 rounded hover-bg-dark cursor-pointer" onClick={() => {
                    if (following.id === userId || following.is_public) { setShowFollowingModal(false); navigate(`/user/${following.id}`); }
                    else { triggerToast("This account is private", "info"); }
                  }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle overflow-hidden border border-secondary" style={{ width: 40, height: 40 }}>
                        {following.avatar_url ? <img src={following.avatar_url} className="w-100 h-100 object-fit-cover" alt="" /> : <User size={20} className="text-secondary m-2" />}
                      </div>
                      <div>
                        <div className="fw-bold small">{following.username || "Anonymous"}</div>
                        <div className="text-secondary x-small text-truncate" style={{ maxWidth: '200px' }}>{following.bio || "No bio"}</div>
                      </div>
                    </div>
                    <ArrowLeft size={16} className="text-secondary opacity-25" style={{ transform: 'rotate(180deg)' }} />
                  </div>
                ))}
              </div>
            ) : <p className="text-secondary text-center py-4">You are not following anyone yet.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

export default ProfileSection;
