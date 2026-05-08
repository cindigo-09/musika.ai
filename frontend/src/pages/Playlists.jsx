import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Music, Loader2, Play, AlertCircle, Heart } from "lucide-react";
import { supabase } from "../supabaseClient";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useMusic } from "../context/MusicContext";

export default function Playlists() {
  const navigate = useNavigate();
  const { stopMusic } = useMusic();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlaylists();
    const handlePlaylistCreated = () => fetchPlaylists();
    window.addEventListener("playlistCreated", handlePlaylistCreated);
    return () => {
      window.removeEventListener("playlistCreated", handlePlaylistCreated);
    };
  }, []);

  const fetchPlaylists = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setLoading(false);

      const { data, error: fetchError } = await supabase
        .from("playlists")
        .select(`*, playlist_songs (playlist_id)`)
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
      .insert([
        { name, user_id: session.user.id, owner_email: session.user.email },
      ])
      .select()
      .single();

    if (!error) {
      setPlaylists([{ ...data, playlist_songs: [] }, ...playlists]);
      setShowModal(false);
      setName("");
      stopMusic();
      navigate(`/playlists/${data.id}`);
    }
  };

  return (
    <div className="d-flex flex-column vh-100 vw-100 text-white bg-black">
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
            <div className="row g-4">
              {playlists.length === 0 ? (
                <div className="text-center py-5 w-100">
                  <Music size={48} className="text-secondary mb-3 opacity-25" />
                  <p className="text-secondary">
                    No playlists found. Create your first one!
                  </p>
                </div>
              ) : (
                playlists.map((pl) => (
                  <div key={pl.id} className="col-6 col-md-4 col-lg-3 col-xl-2">
                    {/* CUSTOM SPOTIFY CARD */}
                    <div
                      className="playlist-card-spotify"
                      onClick={() => navigate(`/playlists/${pl.id}`)}
                    >
                      <div className="card-image-container aspect-ratio-square">
                        {pl.image_url ? (
                          <img
                            src={pl.image_url}
                            alt={pl.name}
                            className="w-100 h-100 object-fit-cover"
                          />
                        ) : pl.name === "Favorites" ? (
                          <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-dark">
                            <Heart
                              size={60}
                              className="text-danger"
                              fill="currentColor"
                            />
                          </div>
                        ) : (
                          <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-dark">
                            <Music
                              size={60}
                              className="text-secondary opacity-25"
                            />
                          </div>
                        )}

                        {/* Floating Play Button */}
                        <div className="play-button-floating">
                          <div className="btn btn-warning rounded-circle p-3 shadow-lg">
                            <Play fill="black" size={20} />
                          </div>
                        </div>
                      </div>

                      <div className="playlist-info">
                        <div className="playlist-title">{pl.name}</div>
                        <div className="playlist-description">
                          {pl.playlist_songs?.length || 0} Tracks
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* CREATE MODAL */}
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
