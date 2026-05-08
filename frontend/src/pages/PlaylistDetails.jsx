import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  Edit2,
  Check,
  X,
  Music,
  Trash2,
  ArrowLeft,
  Loader2,
  Plus,
  Heart,
  Repeat,
  Repeat1,
  AlertTriangle,
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

export default function PlaylistDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // FIXED: Restored stopMusic, repeatMode, and toggleRepeat to prevent crashes
  const { playSong, currentSong, stopMusic, repeatMode, toggleRepeat } =
    useMusic();

  const [playlist, setPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
  const [playlistEditForm, setPlaylistEditForm] = useState({
    name: "",
    description: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearFavoritesConfirm, setShowClearFavoritesConfirm] =
    useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [favoriteSongIds, setFavoriteSongIds] = useState(new Set());

  const isFavoritesPlaylist = playlist?.name === "Favorites";

  useEffect(() => {
    fetchPlaylistData();
    fetchFavorites();
  }, [id]);

  const fetchFavorites = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        if (favSongs)
          setFavoriteSongIds(new Set(favSongs.map((s) => s.song_id)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPlaylistData = async () => {
    setLoading(true);
    try {
      const { data: meta, error: metaError } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", id)
        .single();
      if (metaError || !meta) return navigate("/playlists");
      setPlaylist(meta);
      setPlaylistEditForm({
        name: meta.name || "",
        description: meta.description || "",
      });

      const { data: songsData } = await supabase
        .from("playlist_songs")
        .select(`song_id, order_index, songs (id, title, artist, song_url)`)
        .eq("playlist_id", id)
        .order("order_index", { ascending: true });

      const validSongs =
        songsData
          ?.filter((item) => item.songs !== null)
          .map((item) => item.songs) || [];
      setPlaylistSongs(validSongs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !playlist) return;
    setIsUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const email = session.user.email || "user";
      const username = slugify(
        session.user.user_metadata?.full_name || email.split("@")[0],
      );

      // NEW: Delete the old photo if it exists to keep storage clean
      if (playlist.image_url) {
        try {
          const oldPath = playlist.image_url.split("/songs/")[1].split("?")[0];
          await supabase.storage.from("songs").remove([oldPath]);
        } catch (removeErr) {
          console.log("Old file not found or already gone");
        }
      }

      const fileExt = file.name.split(".").pop();
      // Using a timestamped name ensures every upload is recognized as "new" by the browser
      const fileName = `playlist-${playlist.id}-${Date.now()}.${fileExt}`;
      const filePath = `${username}-tracks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("songs").getPublicUrl(filePath);

      await supabase
        .from("playlists")
        .update({ image_url: publicUrl })
        .eq("id", id);

      setPlaylist((prev) => ({ ...prev, image_url: publicUrl }));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSavePlaylistEdits = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("playlists")
      .update(playlistEditForm)
      .eq("id", id);
    if (!error) {
      setPlaylist({ ...playlist, ...playlistEditForm });
      setIsEditingPlaylist(false);
    }
  };

  const handleDeletePlaylist = async () => {
    const { error } = await supabase.from("playlists").delete().eq("id", id);
    if (!error) navigate("/playlists");
  };

  const handleClearAllFavorites = async () => {
    const { error } = await supabase
      .from("playlist_songs")
      .delete()
      .eq("playlist_id", id);
    if (!error) {
      setPlaylistSongs([]);
      setShowClearFavoritesConfirm(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) return setSearchResults([]);
    const { data } = await supabase
      .from("songs")
      .select("*")
      .ilike("title", `%${query}%`)
      .limit(10);
    setSearchResults(data || []);
  };

  const addSongToPlaylist = async (songId) => {
    const { error } = await supabase
      .from("playlist_songs")
      .insert([
        { playlist_id: id, song_id: songId, order_index: playlistSongs.length },
      ]);
    if (!error) {
      setShowAddModal(false);
      fetchPlaylistData();
    }
  };

  if (loading)
    return (
      <div className="vh-100 bg-dark d-flex align-items-center justify-content-center">
        <Loader2 className="animate-spin text-warning" size={48} />
      </div>
    );

  return (
    <div
      className="d-flex flex-column vh-100 vw-100 text-white"
      style={{ background: "#050508" }}
    >
      <style>{`
        .playlist-img-container:hover .upload-overlay { opacity: 1 !important; }
        .upload-overlay { transition: opacity 0.3s ease; pointer-events: none; }
        .upload-overlay label { pointer-events: auto; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
      `}</style>
      <Header />
      <div className="d-flex flex-grow-1 overflow-hidden">
        <Sidebar />
        <main className="flex-grow-1 p-5 overflow-auto custom-scrollbar">
          <button
            className="btn btn-link text-secondary p-0 mb-4 d-flex align-items-center gap-2 text-decoration-none"
            onClick={() => navigate("/playlists")}
          >
            <ArrowLeft size={20} /> BACK TO PLAYLISTS
          </button>

          <div className="d-flex flex-column flex-md-row gap-5 align-items-md-end mb-5">
            <div
              className="playlist-img-container bg-dark rounded shadow-lg d-flex align-items-center justify-content-center border border-secondary position-relative overflow-hidden"
              style={{ width: 230, height: 230, flexShrink: 0 }}
            >
              {playlist?.image_url ? (
                <img
                  src={playlist.image_url}
                  alt=""
                  className="w-100 h-100 object-fit-cover"
                />
              ) : isFavoritesPlaylist ? (
                <Heart size={80} className="text-danger" fill="currentColor" />
              ) : (
                <Music size={80} className="text-secondary opacity-50" />
              )}
              <div className="upload-overlay position-absolute top-0 start-0 w-100 h-100 bg-black bg-opacity-60 d-flex flex-column align-items-center justify-content-center opacity-0">
                <label>
                  {isUploading ? (
                    <Loader2 className="animate-spin text-warning" />
                  ) : (
                    <Camera size={32} className="text-white" />
                  )}
                  <span className="small mt-2 fw-bold text-white">
                    CHANGE PHOTO
                  </span>
                  <input
                    type="file"
                    className="d-none"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

            <div className="flex-grow-1">
              <p className="text-warning mb-1 fw-bold small text-uppercase">
                Playlist • {playlistSongs.length} Tracks
              </p>
              <div className="d-flex align-items-center gap-3">
                <h1 className="display-2 fw-bold mb-2">{playlist?.name}</h1>
                {!isFavoritesPlaylist && (
                  <Edit2
                    size={24}
                    className="text-secondary cursor-pointer"
                    onClick={() => setIsEditingPlaylist(true)}
                  />
                )}
              </div>
              <p className="text-secondary mb-4 fs-5">
                {playlist?.description || "No description provided."}
              </p>

              <div className="d-flex gap-3 align-items-center">
                <button
                  className="btn btn-warning rounded-circle p-3 shadow"
                  onClick={() =>
                    playlistSongs[0] &&
                    playSong(playlistSongs[0], playlistSongs)
                  }
                  disabled={playlistSongs.length === 0}
                >
                  <Play fill="black" size={28} />
                </button>

                {/* Repeat Toggle UI */}
                <button
                  className={`btn btn-link p-2 ${repeatMode !== "off" ? "text-warning" : "text-secondary"}`}
                  onClick={toggleRepeat}
                >
                  {repeatMode === "one" ? (
                    <Repeat1 size={24} />
                  ) : (
                    <Repeat size={24} />
                  )}
                </button>

                {!isFavoritesPlaylist && (
                  <button
                    className="btn btn-outline-warning fw-bold px-4 rounded-pill"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus size={18} /> ADD SONG
                  </button>
                )}
                {isFavoritesPlaylist && playlistSongs.length > 0 && (
                  <button
                    className="btn btn-outline-danger fw-bold px-4 rounded-pill"
                    onClick={() => setShowClearFavoritesConfirm(true)}
                  >
                    <Trash2 size={18} /> CLEAR ALL
                  </button>
                )}
                {!isFavoritesPlaylist && (
                  <button
                    className="btn btn-outline-danger fw-bold px-4 rounded-pill"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={18} /> DELETE
                  </button>
                )}
              </div>
            </div>
          </div>

          <table className="table table-dark table-hover border-secondary">
            <thead>
              <tr className="text-secondary small text-uppercase">
                <th style={{ width: "50px" }}>#</th>
                <th>Title</th>
                <th>Artist</th>
                <th className="text-end px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {playlistSongs.map((s, idx) => (
                <tr
                  key={s.id}
                  className="align-middle"
                  onClick={() => playSong(s, playlistSongs)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="text-secondary">{idx + 1}</td>
                  <td
                    className={`fw-bold ${currentSong?.id === s.id ? "text-warning" : "text-white"}`}
                  >
                    {s.title}
                  </td>
                  <td className="text-secondary">{s.artist}</td>
                  <td className="text-end px-4">
                    <Heart
                      size={18}
                      fill={favoriteSongIds.has(s.id) ? "currentColor" : "none"}
                      className={
                        favoriteSongIds.has(s.id)
                          ? "text-danger"
                          : "text-secondary"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>

      {/* Modals for Editing, Deleting, and Adding Songs */}
      {isEditingPlaylist && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1100 }}
        >
          <div
            className="musika-card p-4"
            style={{
              width: "450px",
              background: "#121216",
              border: "1px solid #0dcaf0",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="text-info m-0 fw-bold">EDIT PLAYLIST</h5>
              <button
                className="btn btn-link text-secondary"
                onClick={() => setIsEditingPlaylist(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSavePlaylistEdits}>
              <input
                className="form-control mb-3 bg-dark text-white"
                value={playlistEditForm.name}
                onChange={(e) =>
                  setPlaylistEditForm({
                    ...playlistEditForm,
                    name: e.target.value,
                  })
                }
                required
              />
              <textarea
                className="form-control mb-3 bg-dark text-white"
                value={playlistEditForm.description}
                onChange={(e) =>
                  setPlaylistEditForm({
                    ...playlistEditForm,
                    description: e.target.value,
                  })
                }
                rows={3}
              />
              <button className="btn btn-info w-100 fw-bold" type="submit">
                SAVE
              </button>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
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
              <h5 className="mt-3 fw-bold">DELETE PLAYLIST?</h5>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-danger w-100 fw-bold"
                onClick={handleDeletePlaylist}
              >
                DELETE
              </button>
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => setShowDeleteConfirm(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearFavoritesConfirm && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.9)", zIndex: 2100 }}
        >
          <div
            className="musika-card p-4 border-danger shadow-lg"
            style={{
              width: "420px",
              background: "#121216",
              border: "1px solid #dc3545",
            }}
          >
            <div className="text-center mb-4 text-danger">
              <AlertTriangle size={48} />
              <h5 className="mt-3 fw-bold">CLEAR ALL FAVORITES?</h5>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-danger w-100 fw-bold"
                onClick={handleClearAllFavorites}
              >
                CLEAR ALL
              </button>
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => setShowClearFavoritesConfirm(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.9)", zIndex: 2000 }}
        >
          <div
            className="musika-card p-4"
            style={{
              width: "450px",
              background: "#121216",
              border: "1px solid #ffc107",
            }}
          >
            <div className="d-flex justify-content-between mb-4">
              <h5 className="text-warning m-0 fw-bold">SEARCH & ADD</h5>
              <button
                className="btn btn-link text-secondary"
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <input
              className="form-control mb-4 bg-dark text-white"
              placeholder="Type song title..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            <div
              className="list-group list-group-flush mb-3 overflow-auto"
              style={{ maxHeight: "300px" }}
            >
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  className="list-group-item list-group-item-action bg-dark text-white border-secondary d-flex justify-content-between align-items-center py-3"
                  onClick={() => addSongToPlaylist(s.id)}
                >
                  <div>
                    <div className="fw-bold">{s.title}</div>
                    <div className="small text-secondary">{s.artist}</div>
                  </div>
                  <Plus size={18} className="text-warning" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
