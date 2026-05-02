import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useMusic } from "../context/MusicContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

const GENRES = ["pop", "rock", "hip-hop", "dance/electronic", "jazz", "classical", "blues", "country", "reggae", "world music", "soul", "metal", "punk", "experimental"];
const MOODS = ["joy", "high energy", "confidence", "carefree", "celebration", "morning calm", "nostalgia", "defiant", "angry", "mischievous", "stressed", "balance", "calm"];

export default function Home() {
  const {
    songs,
    setSongs,
    playSong,
    currentSong,
    isPlaying,
    updateSongInList,
    stopMusic,
  } = useMusic();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", artist: "", genres: [], moods: [] });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    song: null,
  });
  const [editingSong, setEditingSong] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [favoriteSongIds, setFavoriteSongIds] = useState(new Set());

  const toggleGenre = (g) => {
    setForm(prev => ({
      ...prev,
      genres: prev.genres.includes(g) ? prev.genres.filter(x => x !== g) : [...prev.genres, g]
    }));
  };

  const toggleMood = (m) => {
    setForm(prev => ({
      ...prev,
      moods: prev.moods.includes(m) ? prev.moods.filter(x => x !== m) : [...prev.moods, m]
    }));
  };

  useEffect(() => {
    fetchSongs();
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: favPlaylist } = await supabase
        .from("playlists")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("name", "Favorites")
        .single();

      if (favPlaylist) {
        const { data: favSongs } = await supabase
          .from("playlist_songs")
          .select("song_id")
          .eq("playlist_id", favPlaylist.id);

        if (favSongs) {
          setFavoriteSongIds(new Set(favSongs.map(s => s.song_id)));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSongs = async () => {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setSongs(data || []);
  };

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const openPlaylistPicker = async (songId) => {
    setSelectedSongId(songId); // Ensure the song ID is saved
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name", { ascending: true });
      if (!error) setUserPlaylists(data || []);
      setShowPlaylistPicker(true);
    } catch (err) {
      console.error(err);
    }
  };

  const createAndAddPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data: newPlaylist, error } = await supabase
        .from("playlists")
        .insert([{ name: newPlaylistName, user_id: session.user.id }])
        .select()
        .single();
      if (!error) {
        triggerSuccess(`Playlist created!`);
        // Add the song to the newly created playlist automatically
        const { error: joinError } = await supabase
          .from("playlist_songs")
          .insert([{ playlist_id: newPlaylist.id, song_id: selectedSongId }]);

        if (!joinError) {
          triggerSuccess("Added to new playlist!");
          setShowPlaylistPicker(false);
          setNewPlaylistName("");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToPlaylist = async (playlistId) => {
    const { error } = await supabase
      .from("playlist_songs")
      .insert([{ playlist_id: playlistId, song_id: selectedSongId }]);
    if (error) {
      triggerSuccess("Song already in playlist!");
    } else {
      triggerSuccess("Added to playlist!");
      setShowPlaylistPicker(false);
    }
  };

  const handleFavorite = async (songId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let { data: favPlaylist } = await supabase
        .from("playlists")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("name", "Favorites")
        .single();

      if (!favPlaylist) {
        const { data, error: createErr } = await supabase
          .from("playlists")
          .insert([{ name: "Favorites", user_id: session.user.id, description: "Your favorite tracks." }])
          .select()
          .single();
        if (createErr) throw createErr;
        favPlaylist = data;
      }

      if (favoriteSongIds.has(songId)) {
        // Remove from favorites
        const { error } = await supabase
          .from("playlist_songs")
          .delete()
          .match({ playlist_id: favPlaylist.id, song_id: songId });

        if (!error) {
          const newSet = new Set(favoriteSongIds);
          newSet.delete(songId);
          setFavoriteSongIds(newSet);
          triggerSuccess("Removed from Favorites");
        }
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("playlist_songs")
          .insert([{ playlist_id: favPlaylist.id, song_id: songId }]);

        if (!error) {
          const newSet = new Set(favoriteSongIds);
          newSet.add(songId);
          setFavoriteSongIds(newSet);
          triggerSuccess("Added to Favorites!");
        }
      }
    } catch (err) {
      console.error(err);
      triggerSuccess("Failed to update favorites");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const email = session.user.email || "user@example.com";
      const rawName =
        session.user.user_metadata?.full_name || email.split("@")[0];
      const username = slugify(rawName);

      const fileName = `${Date.now()}-${slugify(form.title)}.${file.name.split(".").pop()}`;
      const filePath = `${username}-tracks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("songs").getPublicUrl(filePath);

      const { data: songData, error: dbError } = await supabase.from("songs").insert([
        {
          title: form.title,
          artist: form.artist,
          song_url: publicUrl,
          user_id: session.user.id,
          genre: (form.genres || []).join(","),
          mood_tag: (form.moods || []).join(","),
        },
      ]).select().single();
      if (dbError) throw dbError;

      // Log the upload activity
      await supabase.from("activity_log").insert([
        {
          user_id: session.user.id,
          action: "upload",
          song_id: songData.id,
          song_title: form.title
        }
      ]);

      triggerSuccess(`"${form.title}" uploaded!`);
      fetchSongs();
      setShowModal(false);
      setForm({ title: "", artist: "", genres: [], moods: [] });
      setFile(null);
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Error uploading: " + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSong = async (e) => {
    e.preventDefault();
    if (!editingSong) return;
    const { error } = await supabase
      .from("songs")
      .update({ title: editingSong.title, artist: editingSong.artist })
      .eq("id", editingSong.id);

    if (!error) {
      updateSongInList(editingSong);
      triggerSuccess("Track updated!");
      setShowEditModal(false);
      setEditingSong(null);
    }
  };

  const processDelete = async () => {
    const songToDelete = deleteConfirm.song;
    if (!songToDelete) return;

    try {
      if (currentSong && currentSong.id === songToDelete.id) {
        stopMusic();
      }

      if (songToDelete.song_url?.includes("/public/songs/")) {
        const filePath = songToDelete.song_url.split("/public/songs/")[1];
        if (filePath) await supabase.storage.from("songs").remove([filePath]);
      }

      await supabase.from("songs").delete().eq("id", songToDelete.id);
      setSongs(songs.filter((s) => s.id !== songToDelete.id));
      // Log the delete activity
      await supabase.from("activity_log").insert([
        {
          user_id: deleteConfirm.song.user_id,
          action: "delete",
          song_id: songToDelete.id,
          song_title: deleteConfirm.song.title
        }
      ]);

      triggerSuccess("Song deleted!");
    } catch (err) {
      console.error(err);
      triggerSuccess("Error deleting song");
    } finally {
      setDeleteConfirm({ show: false, song: null });
    }
  };

  const getGroupedSongs = () => {
    const genreCounts = {};
    songs.forEach(song => {
      const gList = song.genre ? song.genre.split(",").map(g => g.trim()).filter(Boolean) : [];
      gList.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });

    const groups = {}; 
    const uncategorized = [];

    songs.forEach(song => {
      const gList = song.genre ? song.genre.split(",").map(g => g.trim()).filter(Boolean) : [];
      
      if (gList.length === 0) {
        uncategorized.push(song);
        return;
      }

      const sparseGenres = gList.filter(g => genreCounts[g] === 1);

      if (sparseGenres.length > 0) {
        sparseGenres.forEach(g => {
          if (!groups[g]) groups[g] = [];
          groups[g].push(song);
        });
      } else {
        gList.forEach(g => {
          if (!groups[g]) groups[g] = [];
          groups[g].push(song);
        });
      }
    });

    return { groups, uncategorized };
  };

  const { groups, uncategorized } = getGroupedSongs();

  const renderSongTable = (songList) => (
    <table className="table table-dark table-hover mb-5">
      <thead>
        <tr className="text-secondary small">
          <th>#</th>
          <th>Title</th>
          <th>Artist</th>
          <th className="text-end px-4">Actions</th>
        </tr>
      </thead>
      <tbody>
        {songList.map((s, idx) => (
          <tr key={s.id} className="align-middle" onClick={() => playSong(s)} style={{ cursor: "pointer" }}>
            <td className="text-secondary">{idx + 1}</td>
            <td className={currentSong?.id === s.id ? "text-warning fw-bold" : ""}>
              {s.title}
            </td>
            <td className="text-secondary">{s.artist}</td>
            <td className="text-end px-4">
              <button className="btn btn-link text-warning p-0 me-3" onClick={(e) => { e.stopPropagation(); openPlaylistPicker(s.id); }}>
                <Plus size={18} />
              </button>
              <button className="btn btn-link text-info p-0 me-3" onClick={(e) => { e.stopPropagation(); setEditingSong(s); setShowEditModal(true); }}>
                <Edit2 size={16} />
              </button>
              <button className="btn btn-link text-danger p-0 me-3" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, song: s }); }}>
                <Trash2 size={18} />
              </button>
              <button className="btn btn-link p-0" onClick={(e) => { e.stopPropagation(); handleFavorite(s.id); }}>
                <Heart size={18} fill={favoriteSongIds.has(s.id) ? "currentColor" : "none"} className={favoriteSongIds.has(s.id) ? "text-danger" : "text-secondary"} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div
      className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden"
      style={{ background: "#050508" }}
    >
      <Header />
      {successMsg && (
        <div
          className="position-fixed top-0 start-50 translate-middle-x mt-4"
          style={{ zIndex: 3000 }}
        >
          <div className="bg-success text-white px-4 py-2 rounded-pill shadow-lg d-flex align-items-center gap-2 border border-white border-opacity-25">
            <Check size={18} />
            <span className="fw-bold small">{successMsg}</span>
          </div>
        </div>
      )}

      <div className="container-fluid p-0 d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="display-6 m-0 fw-bold">Library</h2>
            <button
              className="btn btn-warning rounded-pill px-4 fw-bold"
              onClick={() => setShowModal(true)}
            >
              <Plus size={20} /> UPLOAD
            </button>
          </div>

          {Object.keys(groups).sort().map(genre => (
            <div key={genre}>
              <h4 className="text-warning mt-4 mb-3 fw-bold text-uppercase" style={{ letterSpacing: "2px" }}>{genre}</h4>
              {renderSongTable(groups[genre])}
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div>
              <h4 className="text-secondary mt-4 mb-3 fw-bold text-uppercase" style={{ letterSpacing: "2px" }}>Uncategorized</h4>
              {renderSongTable(uncategorized)}
            </div>
          )}

          {songs.length === 0 && (
            <div className="text-center py-5">
              <p className="text-secondary">No songs in your library yet. Upload some music!</p>
            </div>
          )}
        </main>
      </div>

      {/* Playlist Picker Modal (FIXED) */}
      {showPlaylistPicker && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1200 }}
        >
          <div
            className="musika-card p-4"
            style={{
              width: "400px",
              background: "#121216",
              border: "1px solid #ffc107",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="text-warning m-0 fw-bold">ADD TO PLAYLIST</h5>
              <button
                className="btn btn-link text-secondary p-0"
                onClick={() => setShowPlaylistPicker(false)}
              >
                <X size={20} />
              </button>
            </div>

            {userPlaylists.length > 0 ? (
              <div
                className="list-group list-group-flush overflow-auto mb-4 custom-scrollbar"
                style={{ maxHeight: "250px" }}
              >
                {userPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    className="list-group-item list-group-item-action bg-dark text-white border-secondary d-flex align-items-center justify-content-between py-3"
                    onClick={() => addToPlaylist(pl.id)}
                  >
                    <span>{pl.name}</span>
                    <Plus size={14} className="text-warning" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 mb-3">
                <p className="text-secondary small">No playlists yet.</p>
              </div>
            )}

            <div className="d-flex gap-2">
              <input
                className="form-control musika-input form-control-sm"
                placeholder="New Playlist..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
              <button
                className="btn btn-warning btn-sm fw-bold"
                onClick={createAndAddPlaylist}
                disabled={!newPlaylistName.trim()}
              >
                CREATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.9)", zIndex: 2000 }}
        >
          <div
            className="musika-card p-4 border-danger shadow-lg"
            style={{
              width: "400px",
              background: "#121216",
              border: "1px solid #dc3545",
            }}
          >
            <div className="text-center mb-4 text-danger">
              <AlertTriangle size={48} />
              <h5 className="mt-3 fw-bold">ARE YOU SURE?</h5>
              <p className="text-secondary small">
                Delete "{deleteConfirm.song?.title}"?
              </p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-danger w-100 fw-bold"
                onClick={processDelete}
              >
                DELETE
              </button>
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => setDeleteConfirm({ show: false, song: null })}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1100 }}
        >
          <div
            className="musika-card p-4"
            style={{
              width: "400px",
              background: "#121216",
              border: "1px solid #0dcaf0",
            }}
          >
            <h5 className="text-info mb-4 fw-bold">EDIT TRACK</h5>
            <form onSubmit={handleUpdateSong}>
              <input
                className="form-control musika-input mb-3"
                value={editingSong.title}
                onChange={(e) =>
                  setEditingSong({ ...editingSong, title: e.target.value })
                }
              />
              <input
                className="form-control musika-input mb-4"
                value={editingSong.artist}
                onChange={(e) =>
                  setEditingSong({ ...editingSong, artist: e.target.value })
                }
              />
              <div className="d-flex gap-2">
                <button className="btn btn-info w-100 fw-bold">SAVE</button>
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  onClick={() => setShowEditModal(false)}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1050 }}
        >
          <div
            className="musika-card p-4"
            style={{
              width: "450px",
              background: "#121216",
              border: "1px solid #ffc107",
            }}
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
              
              <div className="mb-3">
                <label className="text-secondary small mb-2">Genres</label>
                <div className="d-flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <span 
                      key={g} 
                      className={`badge rounded-pill ${form.genres.includes(g) ? 'bg-warning text-dark' : 'bg-dark text-secondary border border-secondary'}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleGenre(g)}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="text-secondary small mb-2">Moods</label>
                <div className="d-flex flex-wrap gap-2">
                  {MOODS.map(m => (
                    <span 
                      key={m} 
                      className={`badge rounded-pill ${form.moods.includes(m) ? 'bg-info text-dark' : 'bg-dark text-secondary border border-secondary'}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleMood(m)}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <input
                type="file"
                accept=".mp3"
                className="form-control musika-input mb-4"
                required
                onChange={(e) => setFile(e.target.files[0])}
              />
              <div className="d-flex gap-2">
                <button className="btn btn-warning w-100 fw-bold">
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    "UPLOAD"
                  )}
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
