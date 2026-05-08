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
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useMusic } from "../context/MusicContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function PlaylistDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong, stopMusic, repeatMode, toggleRepeat } =
    useMusic();

  const [playlist, setPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Playlist edit
  const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
  const [playlistEditForm, setPlaylistEditForm] = useState({
    name: "",
    description: "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Favorites clear
  const [showClearFavoritesConfirm, setShowClearFavoritesConfirm] =
    useState(false);

  // Add song modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Edit song (track metadata) (title/artist)
  const [editingSong, setEditingSong] = useState(null);
  const [showEditSongModal, setShowEditSongModal] = useState(false);

  const [favoriteSongIds, setFavoriteSongIds] = useState(new Set());

  useEffect(() => {
    fetchPlaylistData();
    fetchFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        else setFavoriteSongIds(new Set());
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

      const { data: songsData, error: songsError } = await supabase
        .from("playlist_songs")
        .select(`song_id, order_index, songs (id, title, artist, song_url)`)
        .eq("playlist_id", id)
        .order("order_index", { ascending: true });

      if (songsError) throw songsError;

      const validSongs = songsData
        ? songsData
            .filter((item) => item.songs !== null)
            .map((item) => item.songs)
        : [];

      setPlaylistSongs(validSongs);
    } catch (err) {
      console.error("Error fetching playlist details:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const isFavoritesPlaylist = playlist?.name === "Favorites";

  const handlePlayContext = (song) => {
    // Isolated Queue: only play tracks within this playlist
    playSong(song, playlistSongs);
  };

  const addSongToPlaylist = async (songId) => {
    const { error } = await supabase.from("playlist_songs").insert([
      {
        playlist_id: id,
        song_id: songId,
        order_index: playlistSongs.length,
      },
    ]);
    if (error) {
      alert("Error adding song: " + error.message);
      return;
    }
    fetchPlaylistData();
    setShowAddModal(false);
    setSearchQuery("");
  };

  const handleUpdateSong = async (e) => {
    e.preventDefault();
    if (!editingSong) return;

    const { error } = await supabase
      .from("songs")
      .update({ title: editingSong.title, artist: editingSong.artist })
      .eq("id", editingSong.id);

    if (!error) {
      fetchPlaylistData();
      setShowEditSongModal(false);
      setEditingSong(null);
    }
  };

  const handleFavorite = async (songId) => {
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

      if (!favPlaylist) return;

      if (favoriteSongIds.has(songId)) {
        await supabase
          .from("playlist_songs")
          .delete()
          .match({ playlist_id: favPlaylist.id, song_id: songId });

        const newSet = new Set(favoriteSongIds);
        newSet.delete(songId);
        setFavoriteSongIds(newSet);
      } else {
        await supabase
          .from("playlist_songs")
          .insert([{ playlist_id: favPlaylist.id, song_id: songId }]);

        const newSet = new Set(favoriteSongIds);
        newSet.add(songId);
        setFavoriteSongIds(newSet);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllFavorites = async () => {
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

      if (!favPlaylist) return;

      // delete all rows in playlist_songs for Favorites
      const { error } = await supabase
        .from("playlist_songs")
        .delete()
        .eq("playlist_id", favPlaylist.id);

      if (error) throw error;

      setFavoriteSongIds(new Set());
      fetchFavorites();
      fetchPlaylistData();
      setShowClearFavoritesConfirm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlaylist = async () => {
    try {
      // Stop playing if deleting current playlist song
      if (currentSong && playlistSongs.some((s) => s.id === currentSong.id)) {
        stopMusic();
      }

      const { error } = await supabase.from("playlists").delete().eq("id", id);

      if (error) throw error;

      setShowDeleteConfirm(false);
      navigate("/playlists");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePlaylistEdits = async (e) => {
    e.preventDefault();

    if (!playlistEditForm.name.trim()) return;

    const { error } = await supabase
      .from("playlists")
      .update({
        name: playlistEditForm.name.trim(),
        description: playlistEditForm.description,
      })
      .eq("id", id);

    if (!error) {
      setIsEditingPlaylist(false);
      fetchPlaylistData();
    }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    let query = supabase.from("songs").select("*").limit(50);
    if (q) query = query.ilike("title", `%${q}%`);
    const { data } = await query;
    setSearchResults(data || []);
  };

  const handleEditPlaylistClick = () => {
    setPlaylistEditForm({
      name: playlist?.name || "",
      description: playlist?.description || "",
    });
    setIsEditingPlaylist(true);
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
      <Header />
      <div className="d-flex flex-grow-1 overflow-hidden">
        <Sidebar />
        <main className="flex-grow-1 p-5 overflow-auto custom-scrollbar">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <button
              className="btn btn-link text-secondary p-0 d-flex align-items-center gap-2 text-decoration-none"
              onClick={() => navigate("/playlists")}
            >
              <ArrowLeft size={20} /> BACK TO PLAYLISTS
            </button>
          </div>

          <div className="d-flex flex-column flex-md-row gap-5 align-items-md-end mb-5">
            <div
              className="bg-dark rounded shadow-lg d-flex align-items-center justify-content-center border border-secondary"
              style={{ width: 230, height: 230, flexShrink: 0 }}
            >
              <Music size={80} className="text-secondary opacity-50" />
            </div>

            <div className="flex-grow-1">
              <p className="text-warning mb-1 fw-bold small text-uppercase">
                Playlist • {playlistSongs.length} Tracks
              </p>

              <div className="d-flex align-items-start justify-content-between gap-3">
                <div>
                  <h1 className="display-2 fw-bold mb-2">{playlist?.name}</h1>
                  <p className="text-secondary mb-4 fs-5">
                    {playlist?.description || "No description provided."}
                  </p>
                </div>

                <div className="d-flex flex-column align-items-end gap-2">
                  <div className="d-flex gap-2">
                    {!isFavoritesPlaylist && (
                      <>
                        <button
                          className="btn btn-outline-info fw-bold rounded-pill px-4"
                          onClick={handleEditPlaylistClick}
                          title="Edit playlist name and description"
                        >
                          <Edit2 size={18} /> EDIT
                        </button>

                        <button
                          className="btn btn-outline-danger fw-bold rounded-pill px-4"
                          onClick={() => setShowDeleteConfirm(true)}
                          title="Delete playlist"
                        >
                          <Trash2 size={18} /> DELETE
                        </button>
                      </>
                    )}
                  </div>

                  {isFavoritesPlaylist && (
                    <button
                      className="btn btn-danger fw-bold rounded-pill px-4"
                      onClick={() => setShowClearFavoritesConfirm(true)}
                      title="Clear all favorite songs"
                    >
                      <AlertTriangle size={18} /> CLEAR ALL FAVORITES
                    </button>
                  )}
                </div>
              </div>

              <div className="d-flex gap-3 align-items-center mt-2">
                <button
                  className="btn btn-warning rounded-circle p-3 shadow"
                  onClick={() =>
                    playlistSongs[0] && handlePlayContext(playlistSongs[0])
                  }
                  disabled={playlistSongs.length === 0}
                  style={{ opacity: playlistSongs.length === 0 ? 0.6 : 1 }}
                >
                  <Play fill="black" size={28} />
                </button>

                {/* REPEAT BUTTON */}
                <button
                  className={`btn rounded-circle p-3 ${
                    repeatMode !== "none" ? "btn-info" : "btn-outline-light"
                  }`}
                  onClick={toggleRepeat}
                  title={`Repeat Mode: ${repeatMode}`}
                >
                  {repeatMode === "one" ? (
                    <Repeat1 size={22} />
                  ) : (
                    <Repeat size={22} />
                  )}
                </button>

                <button
                  className="btn btn-outline-warning fw-bold px-4 rounded-pill ms-2"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={18} /> ADD SONG
                </button>
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
                  onClick={() => handlePlayContext(s)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="text-secondary">{idx + 1}</td>
                  <td
                    className={`fw-bold ${
                      currentSong?.id === s.id ? "text-warning" : "text-white"
                    }`}
                  >
                    {s.title}
                  </td>
                  <td className="text-secondary">{s.artist}</td>
                  <td className="text-end px-4">
                    <button
                      className="btn btn-link text-danger p-0 me-3"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await supabase
                          .from("playlist_songs")
                          .delete()
                          .match({ playlist_id: id, song_id: s.id });
                        fetchPlaylistData();
                      }}
                    >
                      <Trash2 size={18} />
                    </button>

                    <button
                      className="btn btn-link p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavorite(s.id);
                      }}
                    >
                      <Heart
                        size={18}
                        fill={
                          favoriteSongIds.has(s.id) ? "currentColor" : "none"
                        }
                        className={
                          favoriteSongIds.has(s.id)
                            ? "text-danger"
                            : "text-secondary"
                        }
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>

      {/* Edit playlist modal (Favorites cannot be edited) */}
      {isEditingPlaylist && !isFavoritesPlaylist && (
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
              <label className="text-secondary small mb-2 d-block">NAME</label>
              <input
                className="form-control musika-input mb-3"
                value={playlistEditForm.name}
                onChange={(e) =>
                  setPlaylistEditForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                required
              />

              <label className="text-secondary small mb-2 d-block">
                DESCRIPTION
              </label>
              <textarea
                className="form-control musika-input mb-3"
                value={playlistEditForm.description}
                onChange={(e) =>
                  setPlaylistEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />

              <div className="d-flex gap-2">
                <button className="btn btn-info w-100 fw-bold" type="submit">
                  SAVE
                </button>
                <button
                  className="btn btn-outline-secondary w-100"
                  type="button"
                  onClick={() => setIsEditingPlaylist(false)}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete playlist confirmation */}
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
              <p className="text-secondary small">
                This will remove the playlist.
              </p>
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

      {/* Clear all favorites confirmation */}
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
              <p className="text-secondary small">
                This will remove all songs from your Favorites playlist.
              </p>
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

      {/* Add Song Modal */}
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
              className="form-control musika-input mb-4"
              placeholder="Type song title..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />

            <div
              className="list-group list-group-flush mb-3 overflow-auto custom-scrollbar"
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
