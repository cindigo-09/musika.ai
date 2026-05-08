import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useMusic } from "../context/MusicContext"; // Import this
import { User } from "lucide-react";

function Header() {
  const navigate = useNavigate();
  const { stopMusic, saveProgress } = useMusic(); // Use the hook
  const [currentUser, setCurrentUser] = useState("Guest");
  const [profile, setProfile] = useState({ avatar_url: "" });

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.user_metadata?.username || user.email);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    let user_id = null;

    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        user_id = user.id;
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);

        // --- START REALTIME SUBSCRIPTION ---
        const profileSubscription = supabase
          .channel("header-profile-sync")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              // Update the header state with the new avatar_url immediately
              setProfile({ avatar_url: payload.new.avatar_url });
            },
          )
          .subscribe();

        return () => {
          supabase.removeChannel(profileSubscription);
        };
      }
    };

    getProfile();
  }, []);

  const handleLogout = async () => {
    // Stop music before logging out
    stopMusic();

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      // Clear any local state if necessary and redirect
      navigate("/login");
    }
  };

  return (
    <header
      className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark bg-opacity-25"
      style={{ height: "70px" }}
    >
      <h4 className="page-title m-0">MUSIKA.AI</h4>
      <div className="d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle overflow-hidden border border-secondary"
            style={{ width: 32, height: 32 }}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-100 h-100 object-fit-cover"
                alt="User"
              />
            ) : (
              <User size={18} className="text-secondary m-1" />
            )}
          </div>
        </div>
        <div className="text-end d-none d-sm-block">
          <div className="small text-white-50 text-uppercase">User</div>
          <div className="fw-bold text-warning">
            {currentUser || "Loading..."}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-outline-danger btn-sm"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

export default Header;
