import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Music, Play, Pause, LogOut, Trash2, User, Edit2, Check, X
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useMusic } from "../context/MusicContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function Home() {
  const navigate = useNavigate();
  const { songs, setSongs, playSong, currentSong, isPlaying, stopMusic } = useMusic();

  // UI States
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", artist: "" });
  const [file, setFile] = useState(null);

  // Edit States
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", artist: "" });

  // User States
  const [userId, setUserId] = useState(null);
  const [genre, setGenre] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        fetchUserProfile(session.user.id);
      } else {
        navigate("/login");
      }
    };
    initUser();
  }, [navigate]);

  const fetchUserProfile = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('favorite_genre')
        .eq('id', uid)
        .single();
      if (data && data.favorite_genre) {
        setGenre(data.favorite_genre);
      }
    } catch (err) {
      console.error(err);
    }
  };  useEffect(() => {
    if (userId) fetchSongs();
  }, [userId]);

  useEffect(() => {
    if (genre) fetchRecommendations(genre);
  }, [genre]);

  const fetchRecommendations = async (userGenre) => {
    try {
      const res = await fetch(`http://localhost:8080/api/recommendations?genre=${userGenre}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map(track => ({
          song_id: `jamendo-${track.id}`,
          title: track.name,
          artist: track.artist_name,
          song_url: track.audio
        }));
        setRecommendations(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    }
  };

  const fetchSongs = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/songs/${userId}`);
      if (res.ok) setSongs(await res.json());
    } catch (err) {
      console.error("Failed to fetch songs:", err);
    }
  };

  // 2. Handlers
  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("artist", form.artist);
    formData.append("user_id", userId);
    if (file) formData.append("mp3", file);

    const res = await fetch("http://localhost:8080/api/songs", { method: "POST", body: formData });
    if (res.ok) {
      setShowModal(false);
      setForm({ title: "", artist: "" });
      fetchSongs();
    }
  };

  const handleUpdate = async (songId) => {
    const res = await fetch(`http://localhost:8080/api/songs/${songId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) { setEditingId(null); fetchSongs(); }
  };

  const deleteSong = async (songId) => {
    if (!window.confirm("Delete this track?")) return;
    const res = await fetch(`http://localhost:8080/api/songs/${songId}`, { method: "DELETE" });
    if (res.ok) fetchSongs();
  };

  const handleLogout = async () => {
    stopMusic(); // Crucial: Stop global audio before logout
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden" style={{ background: "#050508" }}>
      {/* HEADER */}
      <Header />

      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* SIDEBAR */}
        <Sidebar />
        {/* MAIN LIBRARY */}
        <main className="flex-grow-1 p-3 p-md-5 overflow-auto custom-scrollbar">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="display-6 m-0">Your Library</h2>
            <button className="btn btn-warning rounded-pill px-4 fw-bold shadow" onClick={() => setShowModal(true)}>
              <Plus size={20} className="me-2" /> ADD TRACK
            </button>
          </div>

          <div className="musika-card rounded overflow-hidden shadow-lg border border-secondary border-opacity-25">
            <table className="table table-dark table-hover m-0">
              <thead>
                <tr className="text-secondary small">
                  <th className="ps-4 py-3">TRACK INFO</th>
                  <th className="text-end pe-4 py-3">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((s) => (
                  <tr key={s.song_id} className="align-middle">
                    <td className="ps-4">
                      {editingId === s.song_id ? (
                        <div className="d-flex flex-column gap-1 py-2">
                          <input className="musika-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                          <input className="musika-input small opacity-75" value={editForm.artist} onChange={e => setEditForm({ ...editForm, artist: e.target.value })} />
                        </div>
                      ) : (
                        <>
                          <div className="text-warning fw-bold">{s.title}</div>
                          <div className="small text-white-50">{s.artist}</div>
                        </>
                      )}
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end align-items-center gap-3">
                        <button className="btn btn-link text-warning p-0" onClick={() => playSong(s)}>
                          {currentSong?.song_id === s.song_id && isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                        {editingId === s.song_id ? (
                          <>
                            <button className="btn btn-link text-success p-0" onClick={() => handleUpdate(s.song_id)}><Check size={20} /></button>
                            <button className="btn btn-link text-secondary p-0" onClick={() => setEditingId(null)}><X size={20} /></button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-link text-info p-0 opacity-50" onClick={() => { setEditingId(s.song_id); setEditForm({ title: s.title, artist: s.artist }); }}><Edit2 size={18} /></button>
                            <button className="btn btn-link text-danger p-0 opacity-50" onClick={() => deleteSong(s.song_id)}><Trash2 size={18} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-5 mb-4">
            <h2 className="display-6 m-0">Recommended for You <span className="fs-5 text-muted">({genre || 'Loading...'})</span></h2>
          </div>

          <div className="musika-card rounded overflow-hidden shadow-lg border border-secondary border-opacity-25">
            <table className="table table-dark table-hover m-0">
              <thead>
                <tr className="text-secondary small">
                  <th className="ps-4 py-3">TRACK INFO</th>
                  <th className="text-end pe-4 py-3">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((s) => (
                  <tr key={s.song_id} className="align-middle">
                    <td className="ps-4">
                      <div className="text-warning fw-bold">{s.title}</div>
                      <div className="small text-white-50">{s.artist}</div>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end align-items-center gap-3">
                        <button className="btn btn-link text-warning p-0" onClick={() => playSong(s)}>
                          {currentSong?.song_id === s.song_id && isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {recommendations.length === 0 && (
                  <tr>
                    <td colSpan="2" className="text-center py-4 text-white-50">
                      Loading recommendations or no tracks found...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* UPLOAD MODAL */}
      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1050 }}>
          <div className="musika-card p-4 border-warning shadow-lg" style={{ width: "100%", maxWidth: "450px" }}>
            <h5 className="text-warning mb-4 fw-bold">UPLOAD TRACK</h5>
            <form onSubmit={handleUpload}>
              <input type="text" placeholder="Title" className="form-control musika-input mb-3" required onChange={e => setForm({ ...form, title: e.target.value })} />
              <input type="text" placeholder="Artist" className="form-control musika-input mb-3" required onChange={e => setForm({ ...form, artist: e.target.value })} />
              <input type="file" accept=".mp3" className="form-control musika-input mb-4" required onChange={e => setFile(e.target.files[0])} />
              <div className="d-flex gap-2">
                <button className="btn btn-warning w-100 fw-bold">UPLOAD</button>
                <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setShowModal(false)}>CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}