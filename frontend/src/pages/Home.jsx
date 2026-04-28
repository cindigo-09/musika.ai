import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Pause, Trash2, Edit2, Check, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useMusic } from "../context/MusicContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function Home() {
  const navigate = useNavigate();
  const {
    songs,
    setSongs,
    playSong,
    currentSong,
    setCurrentSong,
    isPlaying,
    stopMusic,
    saveProgress,
  } = useMusic();

  // UI States
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", artist: "" });
  const [file, setFile] = useState(null);

  // Edit States
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", artist: "" });

  // Recommendations State
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      } else {
        fetchSongs();
        fetchRecommendations();
      }
    };
    init();
  }, [navigate]);

  // 1. FETCH ALL SONGS
  const fetchSongs = async () => {
    const { data, error } = await supabase.from("songs").select("*");
    if (error) console.error("Error fetching songs:", error);
    else setSongs(data);
  };

  // 2. FETCH RECOMMENDATIONS (Replacing the localhost fetch)
  // For now, this fetches other songs from your own table as "recommendations"
  const fetchRecommendations = async () => {
    const { data, error } = await supabase.from("songs").select("*").limit(5); // Adjust logic as needed

    if (data) setRecommendations(data);
  };

  // 3. UPLOAD (Supabase Storage + DB)
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    try {
      // Get current user ID from session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("songs")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("songs").insert([
        {
          title: form.title,
          artist: form.artist,
          song_url: publicUrlData.publicUrl,
          owner_id: session.user.id, // Ensure this matches your column name
        },
      ]);

      if (dbError) throw dbError;

      alert("Uploaded successfully!");
      setShowModal(false);
      fetchSongs();
    } catch (err) {
      console.error("Upload Error:", err.message);
    }
  };

  // 4. UPDATE (Supabase Database)
  const handleUpdate = async (songId) => {
    try {
      const { error } = await supabase
        .from("songs")
        .update({
          title: editForm.title,
          artist: editForm.artist,
        })
        .eq("id", songId);

      if (error) throw error;

      // Update the song in the local list
      setSongs(
        songs.map((s) =>
          s.id === songId
            ? { ...s, title: editForm.title, artist: editForm.artist }
            : s,
        ),
      );

      // ADD THIS BLOCK:
      // If the song being edited is the one currently playing, update it in context
      if (currentSong?.id === songId) {
        setCurrentSong((prev) => ({
          ...prev,
          title: editForm.title,
          artist: editForm.artist,
        }));
      }

      setEditingId(null);
      alert("Updated successfully!");
    } catch (err) {
      console.error("Update Error:", err.message);
    }
  };

  // 5. DELETE (Supabase Database + Storage)
  const deleteSong = async (songId, songUrl) => {
    if (!window.confirm("Delete this track?")) return;

    try {
      // 1. STOP if playing
      if (currentSong?.id === songId) {
        stopMusic();
      }

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from("songs")
        .delete()
        .eq("id", songId);
      if (dbError) throw dbError;

      // 3. Delete from Storage
      const fileName = songUrl.split("/").pop();
      await supabase.storage.from("songs").remove([fileName]);

      // 4. Update UI
      setSongs(songs.filter((s) => s.id !== songId));
      alert("Song deleted!");
    } catch (err) {
      console.error("Delete Error:", err.message);
    }
  };

  const handleLogout = async () => {
    saveProgress(); // Save progress to LocalStorage
    stopMusic(); // Stop playback
    await supabase.auth.signOut();
    navigate("/login");
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
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="display-6 m-0">Your Library</h2>
            <button
              className="btn btn-warning rounded-pill px-4"
              onClick={() => setShowModal(true)}
            >
              + ADD TRACK
            </button>
          </div>

          <table className="table table-dark table-hover">
            <tbody>
              {songs.map((s) => (
                <tr key={s.id} className="align-middle">
                  <td>
                    {editingId === s.id ? (
                      <div className="d-flex flex-column gap-1">
                        <input
                          value={editForm.title}
                          className="musika-input"
                          onChange={(e) =>
                            setEditForm({ ...editForm, title: e.target.value })
                          }
                        />
                        <input
                          value={editForm.artist}
                          className="musika-input small"
                          onChange={(e) =>
                            setEditForm({ ...editForm, artist: e.target.value })
                          }
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-warning fw-bold">{s.title}</div>
                        <div className="small text-white-50">{s.artist}</div>
                      </>
                    )}
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-link text-warning"
                      onClick={() => playSong(s)}
                    >
                      {currentSong?.id === s.id && isPlaying ? (
                        <Pause size={20} />
                      ) : (
                        <Play size={20} />
                      )}
                    </button>
                    {editingId === s.id ? (
                      <>
                        <button
                          className="btn btn-link text-success"
                          onClick={() => handleUpdate(s.id)}
                        >
                          <Check size={20} />
                        </button>
                        <button
                          className="btn btn-link text-secondary"
                          onClick={() => setEditingId(null)}
                        >
                          <X size={20} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-link text-info"
                          onClick={() => {
                            setEditingId(s.id);
                            setEditForm({ title: s.title, artist: s.artist });
                          }}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="btn btn-link text-danger"
                          onClick={() => deleteSong(s.id, s.song_url)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>

      {showModal && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1050 }}
        >
          <div
            className="musika-card p-4 border-warning"
            style={{ width: "450px" }}
          >
            <h5 className="text-warning mb-4 fw-bold">UPLOAD TRACK</h5>
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
                <button className="btn btn-warning w-100">UPLOAD</button>
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
