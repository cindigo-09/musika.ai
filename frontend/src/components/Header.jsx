import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useMusic } from "../context/MusicContext"; // Import this

function Header() {
  const navigate = useNavigate();
  const { stopMusic, saveProgress } = useMusic(); // Use the hook
  const [currentUser, setCurrentUser] = useState("Guest");

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

  const handleLogout = async () => {
    saveProgress(); // Save before logging out
    stopMusic(); // Stop before logging out
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header
      className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark bg-opacity-25"
      style={{ height: "70px" }}
    >
      <h4 className="page-title m-0">@MUSIKA.AI 2026</h4>
      <div className="d-flex align-items-center gap-3">
        <div className="text-end d-none d-sm-block">
          <div className="small text-white-50 text-uppercase">Operator</div>
          <div className="fw-bold text-warning">{currentUser}</div>
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
