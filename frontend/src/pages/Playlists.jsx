import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Music, Loader2, Play, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function Playlists() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  // Inside fetchPlaylists in Playlists.jsx
  const fetchPlaylists = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setLoading(false);

      const { data, error: fetchError } = await supabase
        .from("playlists")
        .select(
          `
        *,
        playlist_songs (playlist_id) 
      `,
        ) // We use playlist_id because 'id' doesn't exist in your junction table
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setPlaylists(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("playlists")
      .insert([{ name, user_id: session.user.id }])
      .select()
      .single();

    if (!error) {
      setPlaylists([{ ...data, playlist_songs: [] }, ...playlists]);
      setShowModal(false);
      setName("");
      navigate(`/playlists/${data.id}`);
    }
  };

  return (
    <div
      className="d-flex flex-column vh-100 vw-100 text-white"
      style={{ background: "#050508" }}
    >
      <Header />
      <div className="d-flex flex-grow-1 overflow-hidden">
        <Sidebar />
        <main className="flex-grow-1 p-5 overflow-auto custom-scrollbar">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <h1 className="display-4 fw-bold">Your Playlists</h1>
            <button
              className="btn btn-warning rounded-pill px-4 fw-bold shadow"
              onClick={() => setShowModal(true)}
            >
              <Plus size={20} /> CREATE NEW
            </button>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2">
              <AlertCircle size={20} /> Error: {error}
            </div>
          )}

          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <Loader2 className="animate-spin text-warning" size={48} />
            </div>
          ) : (
            <>
              {playlists.length === 0 ? (
                <div className="text-center py-5">
                  <Music size={48} className="text-secondary mb-3 opacity-25" />
                  <p className="text-secondary">
                    No playlists found. Create your first one!
                  </p>
                </div>
              ) : (
                <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-4">
                  {playlists.map((pl) => (
                    <div key={pl.id} className="col">
                      <div
                        className="playlist-card p-3 h-100 rounded-4 cursor-pointer position-relative overflow-hidden"
                        onClick={() => navigate(`/playlists/${pl.id}`)}
                        style={{
                          background: "#121216",
                          transition: "all 0.3s ease",
                          border: "1px solid #2a2a2a",
                        }}
                      >
                        <div className="aspect-ratio-square bg-dark rounded-3 mb-3 d-flex align-items-center justify-content-center position-relative">
                          <Music
                            size={60}
                            className="text-secondary opacity-25"
                          />
                          <div className="play-overlay position-absolute bottom-0 end-0 m-3 opacity-0 translate-y-2">
                            <div className="btn btn-warning rounded-circle p-3 shadow-lg">
                              <Play fill="black" size={24} />
                            </div>
                          </div>
                        </div>
                        <h5 className="fw-bold mb-1 text-truncate">
                          {pl.name}
                        </h5>
                        <p className="small text-secondary mb-0">
                          {pl.playlist_songs?.length || 0} Tracks
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <style>{`
        .playlist-card:hover { background: #1a1a22 !important; transform: translateY(-5px); border-color: #ffc107 !important; }
        .playlist-card:hover .play-overlay { opacity: 1 !important; transform: translateY(0) !important; transition: all 0.3s ease; }
        .aspect-ratio-square { aspect-ratio: 1/1; width: 100%; }
      `}</style>
      {/* Create Modal */}
      {showModal && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 2000 }}
        >
          <div
            className="musika-card p-4"
            style={{
              width: "400px",
              background: "#121216",
              border: "1px solid #ffc107",
            }}
          >
            <h5 className="text-warning mb-4 fw-bold">NEW PLAYLIST</h5>
            <form onSubmit={handleCreate}>
              <input
                className="form-control musika-input mb-4"
                placeholder="Enter playlist name..."
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <div className="d-flex gap-2">
                <button className="btn btn-warning w-100 fw-bold">
                  CREATE
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  onClick={() => setShowModal(false)}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
