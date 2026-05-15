import React, { useState, useEffect } from "react";
import { LogOut, User } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useMusic } from "../context/MusicContext";
import NotificationDropdown from "./NotificationDropdown";

import logo from "../assets/logo-musikaAI.svg";

function Header() {
  const navigate = useNavigate();
  const { closePlayer } = useMusic();
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
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);

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
    try {
      if (closePlayer) closePlayer();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
        alert("Logout failed. Please try again.");
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error("Logout exception:", err);
      alert("An error occurred during logout.");
    }
  };

  return (
    <header
      className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark bg-opacity-25"
      style={{ height: "90px", zIndex: 1000 }}
    >
      <div 
        className="d-flex align-items-center gap-3 cursor-pointer" 
        onClick={() => navigate('/home')}
      >
        <img 
          src={logo} 
          alt="Musika AI" 
          height="60" 
          className="logo-coin-spin"
        />
        <h4 className="page-title m-0 fw-bold text-warning" style={{ letterSpacing: '2px', fontSize: '1.8rem' }}>MUSIKA.AI</h4>
      </div>

      <div className="d-flex align-items-center gap-3">
        <NotificationDropdown />

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
          <div className="small text-white-50 text-uppercase" style={{ fontSize: '0.65rem' }}>User</div>
          <div className="fw-bold text-warning small">
            {currentUser || "Loading..."}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-outline-danger btn-sm rounded-pill"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

export default Header;
