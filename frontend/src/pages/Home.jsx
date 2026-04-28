import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Pause, Trash2, Edit2, Check, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useMusic } from "../context/MusicContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

// Utility to create safe folder names
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

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

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", artist: "" });
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", artist: "" });

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      } else {
        fetchSongs();
      }
    };
    init();
  }, [navigate]);

  const fetchSongs = async () => {
    const { data, error } = await supabase.from("songs").select("*");
    if (error) console.error("Error fetching songs:", error);
    else setSongs(data);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session.user.id;
      const username = session.user.user_metadata?.username || "user";

      // Define path: userId/username-tracks/timestamp_filename
      const folderName = `${slugify(username)}-tracks`;
      const filePath = `${userId}/${folderName}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("songs")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("songs").insert([
        {
          title: form.title,
          artist: form.artist,
          song_url: publicUrlData.publicUrl,
          storage_path: filePath, // CRITICAL: This is the column we added via SQL
          owner_id: userId,
        },
      ]);

      if (dbError) throw dbError;

      alert("Uploaded successfully!");
      setShowModal(false);
      setFile(null);
      setForm({ title: "", artist: "" });
      fetchSongs();
    } catch (err) {
      console.error("Upload Error:", err.message);
      alert("Upload failed: " + err.message);
    }
  };

  const handleUpdate = async (songId) => {
    try {
      const { error } = await supabase
        .from("songs")
        .update({ title: editForm.title, artist: editForm.artist })
        .eq("id", songId);

      if (error) throw error;
      setSongs(songs.map((s) => (s.id === songId ? { ...s, ...editForm } : s)));
      setEditingId(null);
    } catch (err) {
      console.error("Update Error:", err.message);
    }
  };

  const deleteSong = async (songId, storagePath) => {
    if (!window.confirm("Delete this track?")) return;

    try {
      if (currentSong?.id === songId) stopMusic();

      // Delete file from Storage
      const { error: storageError } = await supabase.storage
        .from("songs")
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from DB
      const { error: dbError } = await supabase
        .from("songs")
        .delete()
        .eq("id", songId);
      if (dbError) throw dbError;

      setSongs(songs.filter((s) => s.id !== songId));
    } catch (err) {
      console.error("Delete Error:", err.message);
      alert("Delete failed: " + err.message);
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
                          onClick={() => deleteSong(s.id, s.storage_path)}
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
