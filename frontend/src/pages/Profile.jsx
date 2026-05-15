import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ProfileSection from "../components/ProfileSection";
import SecuritySection from "../components/SecuritySection";
import SettingsSection from "../components/SettingsSection";
import Header from "../components/Header";
import { supabase } from "../supabaseClient";
import { History, Settings, X } from "lucide-react";
import { useMusic } from "../context/MusicContext";
import "bootstrap/dist/css/bootstrap.min.css";

/**
 * User Profile Dashboard
 * Displays listening history, manages account security, and provides access to global preferences.
 */
function Profile() {
  const [history, setHistory] = useState([]);
  const { settings, setSettings } = useMusic();
  const [showSettings, setShowSettings] = useState(false);
  
  /** Draft state for settings to support safe apply/cancel logic */
  const [tempSettings, setTempSettings] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("listening_history")
        .select(`id, played_at, genre_context, songs ( title, artist )`)
        .eq("user_id", user.id)
        .order("played_at", { ascending: false })
        .limit(5);

      if (!error) setHistory(data || []);
    };
    fetchHistory();
  }, []);

  return (
    <div
      className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden"
      style={{ background: "#050508" }}
    >
      <Header />
      <div className="container-fluid p-0 text-light d-flex flex-grow-1 overflow-hidden">
        <Sidebar />
        <main className="flex-grow-1 overflow-auto custom-scrollbar p-4 p-md-5">
          <header className="mb-5 d-flex justify-content-between align-items-end">
            <div>
              <h2 className="display-4 fw-bold mb-2">Profile Settings</h2>
              <p className="text-secondary">
                Manage your identity and track your listening activity.
              </p>
            </div>
            
            {/** Settings Modal Trigger */}
            <button
              onClick={() => {
                setTempSettings({...settings});
                setShowSettings(true);
              }}
              className="btn btn-outline-secondary rounded-circle p-3 d-flex align-items-center justify-content-center border-opacity-25"
              style={{ width: "50px", height: "50px" }}
            >
              <Settings size={24} className="text-warning" />
            </button>
          </header>

          <div className="row g-5">
            <div className="col-lg-7">
              <ProfileSection />
              {/** 
                * Listening History Widget 
                * Renders a chronologically ordered list of recently played tracks with their context.
                */}
              <div
                className="mt-5 p-4 rounded-4"
                style={{ background: "#121216", border: "1px solid #333" }}
              >
                <h5 className="text-info mb-4 d-flex align-items-center gap-2 text-uppercase fw-bold small">
                  <History size={18} /> Listening History
                </h5>
                <div className="table-responsive">
                  <table className="table table-dark table-hover mb-0">
                    <thead>
                      <tr className="text-secondary x-small border-secondary">
                        <th>TRACK</th>
                        <th>CONTEXT</th>
                        <th className="text-end">PLAYED AT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.id} className="align-middle small">
                          <td>
                            <div className="fw-bold">{item.songs?.title}</div>
                            <div
                              className="text-secondary"
                              style={{ fontSize: "0.75rem" }}
                            >
                              {item.songs?.artist}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-dark border border-secondary text-info">
                              {item.genre_context}
                            </span>
                          </td>
                          <td className="text-end text-secondary">
                            {new Date(item.played_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <SecuritySection />
            </div>
          </div>
        </main>
      </div>

      {/** 
        * Preferences Modal Overlay
        * Uses 'tempSettings' to allow users to configure audio/UI preferences before committing them.
        */}
      {showSettings && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1050,
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-secondary rounded-4 shadow-lg">
              {/** Modal Header & Dismiss Control */}
              <div className="modal-header border-bottom border-secondary p-4 d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-warning text-uppercase mb-0">
                  Settings
                </h5>
                <button
                  type="button"
                  className="btn text-secondary p-0 shadow-none border-0"
                  onClick={() => setShowSettings(false)}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="modal-body p-0">
                {tempSettings && (
                  <SettingsSection 
                    currentSettings={tempSettings} 
                    onUpdate={setTempSettings} 
                  />
                )}
              </div>

              <div className="modal-footer border-0 p-4 pt-0">
                <button
                  className="btn btn-warning w-100 fw-bold py-2 text-uppercase"
                  onClick={() => {
                    setSettings(tempSettings);
                    setShowSettings(false);
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
