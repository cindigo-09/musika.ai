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
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useMusic } from "../context/MusicContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function PlaylistDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong } = useMusic();

  const [playlist, setPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  // Search/Add States
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchPlaylistData();
  }, [id]);

  const fetchPlaylistData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Playlist Metadata
      const { data: meta, error: metaError } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", id)
        .single();

      if (metaError || !meta) return navigate("/playlists");
      setPlaylist(meta);
      setEditForm({ name: meta.name, description: meta.description || "" });

      // 2. Fetch Songs in this Playlist
      // Note: We select the 'songs' object which contains the details
      const { data: songsData, error: songsError } = await supabase
        .from("playlist_songs")
        .select(
          `
        order_index,
        songs (
          id,
          title,
          artist,
          song_url
        )
      `,
        )
        .eq("playlist_id", id)
        .order("order_index", { ascending: true });

      if (songsError) throw songsError;

      // 3. Filter out any null entries (incase a song was deleted from the main library)
      const validSongs = songsData
        ? songsData.filter((item) => item.songs !== null)
        : [];

      console.log("Valid songs found:", validSongs); // Check your console for this!
      setPlaylistSongs(validSongs);
    } catch (err) {
      console.error("Error fetching playlist details:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (window.confirm("Are you sure? This will delete the entire playlist.")) {
      await supabase.from("playlists").delete().eq("id", id);
      navigate("/playlists");
    }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) return setSearchResults([]);
    const { data } = await supabase
      .from("songs")
      .select("*")
      .ilike("title", `%${q}%`)
      .limit(5);
    setSearchResults(data || []);
  };

  const addSongToPlaylist = async (songId) => {
    await supabase.from("playlist_songs").insert([
      {
        playlist_id: id,
        song_id: songId,
        order_index: playlistSongs.length,
      },
    ]);
    fetchPlaylistData(); // Refresh list
    setShowAddModal(false);
    setSearchQuery("");
  };

  const moveSong = async (idx, dir) => {
    const newSongs = [...playlistSongs];
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= newSongs.length) return;

    [newSongs[idx], newSongs[target]] = [newSongs[target], newSongs[idx]];
    setPlaylistSongs(newSongs);

    const updates = newSongs.map((s, i) => ({
      id: s.id,
      playlist_id: id,
      song_id: s.songs.id,
      order_index: i,
    }));
    await supabase.from("playlist_songs").upsert(updates);
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
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={handleDeletePlaylist}
              >
                <Trash2 size={16} /> DELETE PLAYLIST
              </button>
            </div>
          </div>

          <div className="d-flex flex-column flex-md-row gap-5 align-items-md-end mb-5">
            <div
              className="bg-dark rounded shadow-lg d-flex align-items-center justify-content-center border border-secondary"
              style={{ width: 230, height: 230, flexShrink: 0 }}
            >
              <Music size={80} className="text-secondary opacity-50" />
            </div>
            <div className="flex-grow-1">
              {isEditing ? (
                <div className="d-flex flex-column gap-2">
                  <input
                    className="form-control musika-input fs-2 fw-bold"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                  <textarea
                    className="form-control musika-input"
                    rows="3"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                  />
                  <div className="d-flex gap-2 mt-2">
                    <button
                      className="btn btn-warning fw-bold px-4"
                      onClick={handleUpdateMeta}
                    >
                      SAVE CHANGES
                    </button>
                    <button
                      className="btn btn-outline-secondary px-4"
                      onClick={() => setIsEditing(false)}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-warning mb-1 fw-bold small text-uppercase">
                    Playlist • {playlistSongs.length} Tracks
                  </p>
                  <h1 className="display-2 fw-bold mb-2">{playlist.name}</h1>
                  <p className="text-secondary mb-4 fs-5">
                    {playlist.description || "No description provided."}
                  </p>
                  <div className="d-flex gap-3 align-items-center">
                    <button
                      className="btn btn-warning rounded-circle p-3 shadow"
                      onClick={() =>
                        playlistSongs[0] && playSong(playlistSongs[0].songs)
                      }
                    >
                      <Play fill="black" size={28} />
                    </button>
                    <button
                      className="btn btn-outline-light rounded-circle p-3"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 size={22} />
                    </button>
                    <button
                      className="btn btn-outline-warning fw-bold px-4 rounded-pill ms-2"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Plus size={18} /> ADD SONG
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <table className="table table-dark table-hover border-secondary">
            <thead>
              <tr className="text-secondary small text-uppercase">
                <th style={{ width: "50px" }}>#</th>
                <th>Title</th>
                <th>Artist</th>
                <th className="text-center">Order</th>
                <th className="text-end px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {playlistSongs.length > 0 ? (
                playlistSongs.map((item, idx) => (
                  <tr key={item.id} className="align-middle">
                    <td className="text-secondary">{idx + 1}</td>
                    <td
                      className={`fw-bold ${currentSong?.id === item.songs.id ? "text-warning" : "text-white"}`}
                    >
                      {item.songs.title}
                    </td>
                    <td className="text-secondary">{item.songs.artist}</td>
                    <td className="text-center">
                      <button
                        className="btn btn-link text-secondary p-0 me-2"
                        onClick={() => moveSong(idx, "up")}
                        disabled={idx === 0}
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        className="btn btn-link text-secondary p-0"
                        onClick={() => moveSong(idx, "down")}
                        disabled={idx === playlistSongs.length - 1}
                      >
                        <ChevronDown size={18} />
                      </button>
                    </td>
                    <td className="text-end px-4">
                      <button
                        className="btn btn-link text-danger p-0"
                        onClick={async () => {
                          await supabase
                            .from("playlist_songs")
                            .delete()
                            .eq("id", item.id);
                          setPlaylistSongs(
                            playlistSongs.filter((s) => s.id !== item.id),
                          );
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-secondary">
                    No songs in this playlist yet. Use the "Add Song" button to
                    start building it!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>

      {/* Add Song Modal */}
      {showAddModal && (
        <div
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.9)", zIndex: 2000 }}
        >
          <div
            className="musika-card p-4 shadow-lg"
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
            <div className="position-relative mb-4">
              <Search
                className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"
                size={18}
              />
              <input
                className="form-control musika-input ps-5"
                placeholder="Type song title..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div
              className="list-group list-group-flush mb-3 overflow-auto custom-scrollbar"
              style={{ maxHeight: "300px" }}
            >
              {searchResults.length > 0 ? (
                searchResults.map((s) => (
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
                ))
              ) : (
                <p className="text-center text-secondary small py-3">
                  Type to search your library...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
