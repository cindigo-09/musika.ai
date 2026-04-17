import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Music,
  Play,
  Pause,
  LogOut,
  Volume2,
  Trash2,
  User,
} from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Home() {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    artist: "",
    mood_tag: "Chill",
  });
  const [file, setFile] = useState(null);

  const audioRef = useRef(new Audio());
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState("Guest");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      // 1. Get the authenticated user directly from Supabase Auth
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        navigate("/login");
        return;
      }

      setUserId(user.id);

      // 2. We can get the username directly from the Auth metadata!
      // This bypasses the need for the profiles table lookup completely
      if (user.user_metadata && user.user_metadata.username) {
        setCurrentUser(user.user_metadata.username);
      } else {
        setCurrentUser(user.email);
      }
    };

    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (userId) fetchSongs();
  }, [userId]);

  const fetchSongs = async () => {
    const res = await fetch(`http://localhost:8080/api/songs/${userId}`);
    if (res.ok) setSongs(await res.json());
  };

  const playSong = (song) => {
    if (currentSong?.song_id === song.song_id) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      // Use port 8080 correctly
      audioRef.current.src = `http://localhost:8080${song.song_url}`;
      audioRef.current.play();
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("artist", form.artist);
    formData.append("mood_tag", form.mood_tag);
    formData.append("user_id", userId);
    if (file) formData.append("mp3", file);

    try {
      const res = await fetch("http://localhost:8080/api/songs", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setShowModal(false);
        setFile(null);
        fetchSongs();
        alert("Track successfully uploaded!");
      } else {
        const errorData = await res.json();
        alert("Failed to upload track: " + errorData.error);
      }
    } catch (e) {
      alert("Network Error: Ensure your 8080 backend server is running.");
    }
  };

  const deleteSong = async (songId) => {
    if (!window.confirm("Are you sure you want to delete this track?")) return;
    
    try {
      const res = await fetch(`http://localhost:8080/api/songs/${songId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (currentSong?.song_id === songId) {
            audioRef.current.pause();
            setIsPlaying(false);
            setCurrentSong(null);
        }
        fetchSongs();
      } else {
        alert("Failed to delete song.");
      }
    } catch (e) {
      alert("Network error deleting sequence.");
    }
  };

  return (
    <div
      className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden"
      style={{ background: "#050508" }}
    >
      {/* HEADER: FIXED HEIGHT */}
      <header
        className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark bg-opacity-25"
        style={{ height: "70px" }}
      >
        <h4 className="page-title m-0">MUSIKA.AI</h4>
        <div className="d-flex align-items-center gap-3">
          <div className="text-end d-none d-sm-block">
            <div className="small text-white-50 text-uppercase">Operator</div>
            <div className="fw-bold text-warning">{currentUser}</div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.clear();
              navigate("/login");
            }}
            className="btn btn-outline-danger btn-sm"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA: DYNAMIC FILL */}
      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* SIDEBAR: HIDDEN ON MOBILE OR NARROW */}
        <aside
          className="d-none d-md-block border-end border-secondary p-4 bg-dark bg-opacity-10"
          style={{ width: "240px" }}
        >
          <button
            className="btn btn-warning w-100 mb-4 fw-bold shadow-sm"
            onClick={() => navigate('/home')}
          >
            <Music size={18} /> Library
          </button>
          <button
            className="btn btn-warning w-100 mb-4 fw-bold shadow-sm"
            onClick={() => navigate('/profile')}
          >
            <User size={18} /> Profile
          </button>
        </aside>

        {/* LIBRARY TABLE: INTERNAL SCROLL ONLY */}
        <main className="flex-grow-1 p-3 p-md-5 overflow-auto custom-scrollbar">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="display-6 m-0">Your Library</h2>
            <button
              className="btn btn-warning d-md-none rounded-circle"
              onClick={() => setShowModal(true)}
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="musika-card rounded overflow-hidden shadow-lg border border-secondary border-opacity-25">
            <div className="table-responsive">
              <table className="table table-dark table-hover m-0">
                <thead className="sticky-top bg-dark">
                  <tr className="text-secondary small">
                    <th className="ps-4 py-3">TRACK INFO</th>
                    <th className="d-none d-sm-table-cell">MOOD</th>
                    <th className="text-end pe-4">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((s) => (
                    <tr key={s.song_id} className="align-middle">
                      <td className="ps-4">
                        <div
                          className="text-warning fw-bold text-truncate"
                          style={{ maxWidth: "200px" }}
                        >
                          {s.title}
                        </div>
                        <div className="small text-white-50">{s.artist}</div>
                      </td>
                      <td className="d-none d-sm-table-cell">
                        <span className="badge border border-secondary fw-light">
                          {s.mood_tag}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-link text-warning p-0 me-3"
                          onClick={() => playSong(s)}
                        >
                          {currentSong?.song_id === s.song_id && isPlaying ? (
                            <Pause size={24} />
                          ) : (
                            <Play size={24} />
                          )}
                        </button>
                        <button
                          className="btn btn-link text-danger p-0"
                          onClick={() => deleteSong(s.song_id)}
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
              <button
                className="btn btn-warning w-100 mb-4 fw-bold shadow-sm"
                onClick={() => setShowModal(true)}
              >
                <Plus size={18} /> ADD TRACK
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER PLAYER: FIXED HEIGHT */}
      <footer
        className="bg-black border-top border-secondary p-2 p-md-3 d-flex align-items-center justify-content-between"
        style={{ height: "90px" }}
      >
        <div
          className="d-flex align-items-center gap-3"
          style={{ width: "30%", minWidth: "150px" }}
        >
          {currentSong ? (
            <>
              <div className="bg-warning text-black p-2 rounded d-none d-sm-block">
                <Music size={20} />
              </div>
              <div className="text-truncate">
                <div className="small fw-bold text-warning text-truncate">
                  {currentSong.title}
                </div>
                <div className="text-white-50" style={{ fontSize: "11px" }}>
                  {currentSong.artist}
                </div>
              </div>
            </>
          ) : (
            <span className="text-white-50 small"></span>
          )}
        </div>

        <div
          className="d-flex flex-column align-items-center"
          style={{ width: "30%" }}
        >
          <button
            className="btn btn-light rounded-circle p-2 shadow-sm"
            onClick={() => currentSong && playSong(currentSong)}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
        </div>

        <div
          className="d-flex align-items-center justify-content-end gap-2"
          style={{ width: "30%" }}
        >
          <Volume2 size={18} className="text-white-50 d-none d-sm-block" />
          <input
            type="range"
            className="form-range w-50 d-none d-md-block"
            onChange={(e) => (audioRef.current.volume = e.target.value / 100)}
          />
        </div>
      </footer>

      {/* MODAL (Unchanged UI logic, just improved visibility) */}
      {showModal && (
        <div className="modal-overlay d-flex align-items-center justify-content-center p-3">
          <div
            className="musika-card p-4 border-warning shadow-lg"
            style={{ width: "100%", maxWidth: "450px" }}
          >
            <h5 className="text-warning mb-4">UPLOAD TRACK</h5>
            <form onSubmit={handleUpload}>
              <input
                type="text"
                placeholder="Title"
                className="form-control musika-input mb-3"
                required
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input
                type="text"
                placeholder="Artist"
                className="form-control musika-input mb-3"
                required
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
              />
              <input
                type="file"
                accept=".mp3"
                className="form-control musika-input mb-4"
                required
                onChange={(e) => setFile(e.target.files[0])}
              />
              <div className="d-flex gap-2">
                <button className="btn btn-warning w-100 fw-bold">
                  UPLOAD
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
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