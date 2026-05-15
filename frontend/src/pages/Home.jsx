import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Play,
  Pause,
  Music,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Heart,
  Camera,
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

const GENRES = [
  "pop",
  "rock",
  "hip-hop",
  "dance/electronic",
  "jazz",
  "classical",
  "blues",
  "country",
  "reggae",
  "world music",
  "soul",
  "metal",
  "punk",
  "experimental",
];
const MOODS = [
  "sad",
  "happy",
  "alone",
  "disgust",
  "anxious",
  "peace",
  "affectionated",
  "excited",
  "confident",
  "sweet",
  "goofy",
  "nostalgic",
  "joy",
  "high energy",
  "confidence",
  "carefree",
  "celebration",
  "morning calm",
  "Defiant",
  "angry",
  "mischievous",
  "stressed",
  "balance",
  "calm",
];

export default function Home() {
  const {
    songs,
    setSongs,
    playSong,
    currentSong,
    isPlaying,
    updateSongInList,
    stopMusic,
    triggerToast,
    favoriteSongIds,
    toggleFavorite,
  } = useMusic();

  const handlePlayLibrarySong = (song, currentQueue) => {
    // Passes the specific genre list as the active queue
    playSong(song, currentQueue);
  };

  const [currentUserId, setCurrentUserId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    artist: "",
    genres: [],
    moods: [],
  });
  const [file, setFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    song: null,
  });
  const [editingSong, setEditingSong] = useState(null);
  const [editCoverFile, setEditCoverFile] = useState(null);
  const [editCoverPreview, setEditCoverPreview] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const toggleGenre = (g) => {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(g)
        ? prev.genres.filter((x) => x !== g)
        : [...prev.genres, g],
    }));
  };

  const toggleMood = (m) => {
    setForm((prev) => ({
      ...prev,
      moods: prev.moods.includes(m)
        ? prev.moods.filter((x) => x !== m)
        : [...prev.moods, m],
    }));
  };

  useEffect(() => {
    fetchSongs();
  }, []);


  const fetchSongs = async () => {
    // 1. Get the current logged-in user to separate library ownership
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
    }

    // 2. Fetch all songs
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setSongs(data || []);
  };

  const openPlaylistPicker = async (songId) => {
    setSelectedSongId(songId);
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
        triggerToast(`Playlist created!`);
        const { error: joinError } = await supabase
          .from("playlist_songs")
          .insert([{ playlist_id: newPlaylist.id, song_id: selectedSongId }]);

        if (!joinError) {
          triggerToast("Added to new playlist!");
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
      triggerToast("Song already in playlist!", "error");
    } else {
      triggerToast("Added to playlist!");
      setShowPlaylistPicker(false);
    }
  };

  const handleFavorite = async (songId) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
          .insert([
            {
              name: "Favorites",
              user_id: session.user.id,
              description: "Your favorite tracks.",
            },
          ])
          .select()
          .single();
        if (createErr) throw createErr;
        favPlaylist = data;
      }

      if (favoriteSongIds.has(songId)) {
        const { error } = await supabase
          .from("playlist_songs")
          .delete()
          .match({ playlist_id: favPlaylist.id, song_id: songId });

        if (!error) {
          const newSet = new Set(favoriteSongIds);
          newSet.delete(songId);
          setFavoriteSongIds(newSet);
          triggerToast("Removed from Favorites");
        }
      } else {
        const { error } = await supabase
          .from("playlist_songs")
          .insert([{ playlist_id: favPlaylist.id, song_id: songId }]);

        if (!error) {
          const newSet = new Set(favoriteSongIds);
          newSet.add(songId);
          setFavoriteSongIds(newSet);
          triggerToast("Added to Favorites!");
        }
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update favorites", "error");
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

      // Upload Song File
      const fileName = `${Date.now()}-${slugify(form.title)}.${file.name.split(".").pop()}`;
      const filePath = `${username}-tracks/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl: songUrl },
      } = supabase.storage.from("songs").getPublicUrl(filePath);

      // Upload Cover Art if present
      let coverUrl = null;
      if (coverFile) {
        const coverName = `cover-${Date.now()}-${slugify(form.title)}.${coverFile.name.split(".").pop()}`;
        const coverPath = `${username}-tracks/${coverName}`;
        const { error: coverUploadError } = await supabase.storage
          .from("songs")
          .upload(coverPath, coverFile);
        if (!coverUploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("songs").getPublicUrl(coverPath);
          coverUrl = publicUrl;
        }
      }

      const { data: songData, error: dbError } = await supabase
        .from("songs")
        .insert([
          {
            title: form.title,
            artist: form.artist,
            song_url: songUrl,
            cover_url: coverUrl,
            user_id: session.user.id,
            genre: (form.genres || []).join(","),
            mood_tag: (form.moods || []).join(","),
          },
        ])
        .select()
        .single();
      if (dbError) throw dbError;

      await supabase.from("activity_log").insert([
        {
          user_id: session.user.id,
          action: "upload",
          song_id: songData.id,
          song_title: form.title,
        },
      ]);

      triggerToast(`"${form.title}" uploaded!`);
      fetchSongs();
      setShowModal(false);
      setForm({ title: "", artist: "", genres: [], moods: [] });
      setFile(null);
      setCoverFile(null);
      setCoverPreview(null);
    } catch (err) {
      console.error("Upload Error:", err);
      triggerToast("Error uploading track", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSong = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const email = session.user.email || "user";
      const username = slugify(
        session.user.user_metadata?.full_name || email.split("@")[0],
      );

      let finalCoverUrl = editingSong.cover_url;

      if (editCoverFile) {
        // Cleanup old cover art if it exists
        if (editingSong.cover_url) {
          try {
            const oldPath = editingSong.cover_url.split("/songs/")[1].split("?")[0];
            await supabase.storage.from("songs").remove([oldPath]);
          } catch (err) {
            console.log("Old cover art cleanup skipped");
          }
        }

        const coverName = `cover-${Date.now()}-${slugify(editingSong.title)}.${editCoverFile.name.split(".").pop()}`;
        const coverPath = `${username}-tracks/${coverName}`;
        const { error: coverUploadError } = await supabase.storage
          .from("songs")
          .upload(coverPath, editCoverFile);
        
        if (!coverUploadError) {
          const { data: { publicUrl } } = supabase.storage.from("songs").getPublicUrl(coverPath);
          finalCoverUrl = publicUrl;
        }
      }

      const { error } = await supabase
        .from("songs")
        .update({
          title: editingSong.title,
          artist: editingSong.artist,
          cover_url: finalCoverUrl,
          genre: Array.isArray(editingSong.genre)
            ? editingSong.genre.join(",")
            : editingSong.genre,
          mood_tag: (editingSong.moods || []).join(","),
        })
        .eq("id", editingSong.id);

      if (error) throw error;

      triggerToast("Track updated!");
      fetchSongs();
      setShowEditModal(false);
      setEditCoverFile(null);
      setEditCoverPreview(null);
    } catch (err) {
      console.error("Update Error:", err);
      triggerToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const processDelete = async () => {
    const songToDelete = deleteConfirm.song;
    if (!songToDelete) return;

    try {
      if (currentSong && currentSong.id === songToDelete.id) {
        stopMusic();
      }

      if (songToDelete.song_url?.includes("/songs/")) {
        const filePath = songToDelete.song_url.split("/songs/")[1].split("?")[0];
        if (filePath) await supabase.storage.from("songs").remove([filePath]);
      }

      // Also remove cover art from storage
      if (songToDelete.cover_url?.includes("/songs/")) {
        const coverPath = songToDelete.cover_url.split("/songs/")[1].split("?")[0];
        if (coverPath) await supabase.storage.from("songs").remove([coverPath]);
      }

      await supabase.from("songs").delete().eq("id", songToDelete.id);
      setSongs(songs.filter((s) => s.id !== songToDelete.id));

      await supabase.from("activity_log").insert([
        {
          user_id: deleteConfirm.song.user_id,
          action: "delete",
          song_id: songToDelete.id,
          song_title: deleteConfirm.song.title,
        },
      ]);

      triggerToast("Song deleted!");
    } catch (err) {
      console.error(err);
      triggerToast("Error deleting song", "error");
    } finally {
      setDeleteConfirm({ show: false, song: null });
    }
  };

  const handleCoverArtChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Restructured to accept a specific source array of songs for isolation
  const getGroupedSongs = (sourceSongs) => {
    const genreCounts = {};
    sourceSongs.forEach((song) => {
      const gList = song.genre
        ? song.genre
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean)
        : [];
      gList.forEach((g) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });

    const groups = {};
    const uncategorized = [];

    sourceSongs.forEach((song) => {
      const gList = song.genre
        ? song.genre
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean)
        : [];

      if (gList.length === 0) {
        uncategorized.push(song);
        return;
      }

      const sparseGenres = gList.filter((g) => genreCounts[g] === 1);

      if (sparseGenres.length > 0) {
        sparseGenres.forEach((g) => {
          if (!groups[g]) groups[g] = [];
          groups[g].push(song);
        });
      } else {
        gList.forEach((g) => {
          if (!groups[g]) groups[g] = [];
          groups[g].push(song);
        });
      }
    });

    return { groups, uncategorized };
  };

  // Isolate Songs
  const mySongsList = songs.filter((s) => s.user_id === currentUserId);
  const communitySongsList = songs.filter((s) => s.user_id !== currentUserId);

  const myGrouped = getGroupedSongs(mySongsList);
  const communityGrouped = getGroupedSongs(communitySongsList);

  const renderSongTable = (songList, queueList) => (
    <div className="table-responsive">
      <table className="table table-dark table-hover mb-5">
        <thead>
          <tr className="text-secondary small text-uppercase">
            <th className="text-center" style={{ width: "80px" }}>Cover</th>
            <th>Title</th>
            <th>Artist</th>
            <th className="text-end px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {songList.map((s) => (
            <tr
              key={s.id}
              className="align-middle"
              onClick={() => handlePlayLibrarySong(s, queueList)}
              style={{ cursor: "pointer" }}
            >
              <td className="text-center py-3">
                <div className="d-flex justify-content-center">
                  <div 
                    className="rounded bg-dark border border-secondary border-opacity-25 overflow-hidden shadow-sm flex-shrink-0"
                    style={{ width: '45px', height: '45px' }}
                  >
                    {s.cover_url ? (
                      <img src={s.cover_url} className="w-100 h-100 object-fit-cover" alt="" />
                    ) : (
                      <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                        <Music size={20} className="text-secondary opacity-25" />
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className={`fw-bold ${currentSong?.id === s.id ? "text-warning" : "text-white"}`}>
                {s.title}
              </td>
              <td className="text-secondary">{s.artist}</td>
              <td className="text-end px-4">
                <div className="d-flex justify-content-end align-items-center gap-2">
                  <button
                    className="btn btn-link text-warning p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPlaylistPicker(s.id);
                    }}
                    title="Add to Playlist"
                  >
                    <Plus size={18} />
                  </button>

                  {s.user_id === currentUserId && (
                    <>
                      <button
                        className="btn btn-link text-info p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const moodArray = s.mood_tag
                            ? s.mood_tag.split(",").map((m) => m.trim())
                            : [];
                          setEditingSong({ ...s, moods: moodArray });
                          setEditCoverPreview(s.cover_url);
                          setShowEditModal(true);
                        }}
                        title="Edit Track"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn btn-link text-danger p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ show: true, song: s });
                        }}
                        title="Delete Track"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}

                  <button
                    className="btn btn-link p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(s.id);
                    }}
                    title={favoriteSongIds.has(s.id) ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Heart
                      size={18}
                      fill={favoriteSongIds.has(s.id) ? "currentColor" : "none"}
                      className={favoriteSongIds.has(s.id) ? "text-danger" : "text-secondary"}
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderGroupedSection = ({ groups, uncategorized }, emptyMessage) => (
    <>
      {Object.keys(groups).length === 0 && uncategorized.length === 0 && (
        <div className="text-center py-4">
          <p className="text-secondary">{emptyMessage}</p>
        </div>
      )}
      {Object.keys(groups)
        .sort()
        .map((genre) => (
          <div key={genre}>
            <h4
              className="text-warning mt-4 mb-3 fw-bold text-uppercase fs-5"
              style={{ letterSpacing: "2px" }}
            >
              {genre}
            </h4>
            {renderSongTable(groups[genre], groups[genre])}
          </div>
        ))}

      {uncategorized.length > 0 && (
        <div>
          <h4
            className="text-secondary mt-4 mb-3 fw-bold text-uppercase fs-5"
            style={{ letterSpacing: "2px" }}
          >
            Uncategorized
          </h4>
          {renderSongTable(uncategorized, uncategorized)}
        </div>
      )}
    </>
  );

  return (
    <div
      className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden"
      style={{ background: "#050508" }}
    >
      <Header />

      <div
        className="container-fluid p-0 d-flex flex-grow-1"
        style={{ minHeight: 0 }}
      >
        <Sidebar />
        <main
          className="flex-grow-1 overflow-auto p-4 custom-scrollbar"
          style={{ minHeight: 0 }}
        >
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="display-6 m-0 fw-bold">Library</h2>
            <button
              className="btn btn-warning rounded-pill px-4 fw-bold"
              onClick={() => setShowModal(true)}
            >
              <Plus size={20} /> UPLOAD
            </button>
          </div>

          <div className="mb-5">
            <h3 className="fw-bold mb-3 border-bottom border-secondary pb-2 text-white">
              My Tracks
            </h3>
            {renderGroupedSection(
              myGrouped,
              "You haven't uploaded any tracks yet.",
            )}
          </div>

          <div className="mb-5">
            <h3 className="fw-bold mb-3 border-bottom border-secondary pb-2 text-white">
              Community Tracks
            </h3>
            {renderGroupedSection(
              communityGrouped,
              "No community tracks found.",
            )}
          </div>
        </main>
      </div>

      {/* Playlist Picker Modal */}
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
              {/* Cover Art Edit */}
              <div className="mb-4 text-center">
                <div className="position-relative d-inline-block">
                  <div 
                    className="rounded-3 border border-secondary border-opacity-25 bg-dark d-flex align-items-center justify-content-center overflow-hidden"
                    style={{ width: '120px', height: '120px', cursor: 'pointer' }}
                    onClick={() => document.getElementById('editCoverInput').click()}
                  >
                    {editCoverPreview ? (
                      <img src={editCoverPreview} className="w-100 h-100 object-fit-cover" alt="Preview" />
                    ) : (
                      <Music size={40} className="text-secondary opacity-25" />
                    )}
                    <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-black bg-opacity-50 opacity-0 hover-opacity-100 transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  </div>
                  <input 
                    id="editCoverInput"
                    type="file" 
                    hidden 
                    accept="image/*" 
                    onChange={(e) => handleCoverArtChange(e, setEditCoverFile, setEditCoverPreview)}
                  />
                  <div className="x-small text-secondary mt-2">Update Cover Art</div>
                </div>
              </div>

              <input
                type="text"
                placeholder="Title"
                className="form-control musika-input mb-3"
                value={editingSong.title}
                onChange={(e) =>
                  setEditingSong({ ...editingSong, title: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Artist"
                className="form-control musika-input mb-3"
                value={editingSong.artist}
                onChange={(e) =>
                  setEditingSong({ ...editingSong, artist: e.target.value })
                }
              />

              {/* Genre Selection */}
              <div className="mb-3">
                <label className="text-secondary small mb-2">GENRE</label>
                <select
                  className="form-control musika-input"
                  value={editingSong.genre}
                  onChange={(e) =>
                    setEditingSong({ ...editingSong, genre: e.target.value })
                  }
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mood Selection */}
              <div className="mb-4">
                <label className="text-secondary small mb-2">MOODS</label>
                <div className="d-flex flex-wrap gap-2">
                  {MOODS.map((m) => {
                    // Ensure we are working with an array for the UI check
                    const currentMoods = Array.isArray(editingSong.moods)
                      ? editingSong.moods
                      : editingSong.mood_tag
                        ? editingSong.mood_tag.split(",")
                        : [];

                    const isSelected = currentMoods.includes(m);

                    return (
                      <span
                        key={m}
                        className={`badge rounded-pill ${
                          isSelected
                            ? "bg-info text-dark" // "Lights up" when chosen
                            : "bg-dark text-secondary border border-secondary"
                        }`}
                        style={{ cursor: "pointer", transition: "all 0.2s" }}
                        onClick={() => {
                          const newMoods = isSelected
                            ? currentMoods.filter((item) => item !== m) // Remove if exists
                            : [...currentMoods, m]; // Add if new

                          setEditingSong({ ...editingSong, moods: newMoods });
                        }}
                      >
                        {m}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-info w-100 fw-bold">
                  SAVE CHANGES
                </button>
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
              {/* Cover Art Upload */}
              <div className="mb-4 text-center">
                <div className="position-relative d-inline-block">
                  <div 
                    className="rounded-3 border border-secondary border-opacity-25 bg-dark d-flex align-items-center justify-content-center overflow-hidden"
                    style={{ width: '120px', height: '120px', cursor: 'pointer' }}
                    onClick={() => document.getElementById('coverInput').click()}
                  >
                    {coverPreview ? (
                      <img src={coverPreview} className="w-100 h-100 object-fit-cover" alt="Preview" />
                    ) : (
                      <Music size={40} className="text-secondary opacity-25" />
                    )}
                    <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-black bg-opacity-50 opacity-0 hover-opacity-100 transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                  </div>
                  <input 
                    id="coverInput"
                    type="file" 
                    hidden 
                    accept="image/*" 
                    onChange={(e) => handleCoverArtChange(e, setCoverFile, setCoverPreview)}
                  />
                  <div className="x-small text-secondary mt-2">Add Cover Art</div>
                </div>
              </div>

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
                  {GENRES.map((g) => (
                    <span
                      key={g}
                      className={`badge rounded-pill ${form.genres.includes(g) ? "bg-warning text-dark" : "bg-dark text-secondary border border-secondary"}`}
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
                  {MOODS.map((m) => (
                    <span
                      key={m}
                      className={`badge rounded-pill ${form.moods.includes(m) ? "bg-info text-dark" : "bg-dark text-secondary border border-secondary"}`}
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
