import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { User, Play, UserPlus, UserMinus, Music } from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useMusic } from "../context/MusicContext";

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const navigate = useNavigate();
  const { playSong } = useMusic();

  const [users, setUsers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        fetchFollowing(session.user.id);
      }
      if (query) {
        performSearch();
      } else {
        setLoading(false);
      }
    };
    init();
  }, [query]);

  const fetchFollowing = async (userId) => {
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    if (data) {
      setFollowingIds(new Set(data.map((f) => f.following_id)));
    }
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      // Search Users
      const { data: userData } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_public", true)
        .ilike("username", `%${query}%`)
        .limit(10);
      
      // Search Songs
      const { data: songData } = await supabase
        .from("songs")
        .select("*")
        .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
        .limit(20);

      setUsers(userData || []);
      setSongs(songData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetId) => {
    if (!currentUserId) return;
    const isFollowing = followingIds.has(targetId);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .match({ follower_id: currentUserId, following_id: targetId });
      if (!error) {
        const newSet = new Set(followingIds);
        newSet.delete(targetId);
        setFollowingIds(newSet);
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert([{ follower_id: currentUserId, following_id: targetId }]);
      if (!error) {
        const newSet = new Set(followingIds);
        newSet.add(targetId);
        setFollowingIds(newSet);
        
        // Optional: Create notification for the user being followed
        await supabase.from('notifications').insert([{
          user_id: targetId,
          actor_id: currentUserId,
          type: 'new_follower',
          content: 'You have a new follower!'
        }]);
      }
    }
  };

  return (
    <div className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden" style={{ background: "#050508" }}>
      <Header />
      <div className="container-fluid p-0 d-flex flex-grow-1" style={{ minHeight: 0 }}>
        <Sidebar />
        <main className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
          <h2 className="mb-4 fw-bold">Search results for "{query}"</h2>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning" role="status"></div>
            </div>
          ) : (
            <>
              {/* Users Section */}
              <section className="mb-5">
                <h4 className="text-warning mb-3 fw-bold text-uppercase small" style={{ letterSpacing: '2px' }}>People</h4>
                {users.length > 0 ? (
                  <div className="row g-3">
                    {users.map(user => (
                      <div key={user.id} className="col-md-6 col-lg-4">
                        <div className="musika-card p-3 d-flex align-items-center justify-content-between" style={{ background: '#121216', border: '1px solid #333' }}>
                          <div className="d-flex align-items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${user.id}`)}>
                            <div className="rounded-circle overflow-hidden border border-secondary" style={{ width: 48, height: 48 }}>
                              {user.avatar_url ? (
                                <img src={user.avatar_url} className="w-100 h-100 object-fit-cover" alt={user.username} />
                              ) : (
                                <User size={24} className="text-secondary m-2" />
                              )}
                            </div>
                            <div>
                              <div className="fw-bold">{user.username || "Anonymous"}</div>
                              <div className="text-secondary small">{user.bio?.substring(0, 30) || "No bio"}</div>
                            </div>
                          </div>
                          {user.id !== currentUserId && (
                            <button 
                              className={`btn btn-sm ${followingIds.has(user.id) ? 'btn-outline-secondary' : 'btn-warning fw-bold'}`}
                              onClick={() => handleFollow(user.id)}
                            >
                              {followingIds.has(user.id) ? <UserMinus size={16} /> : <UserPlus size={16} />}
                              <span className="ms-1">{followingIds.has(user.id) ? 'Following' : 'Follow'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-secondary">No users found.</p>
                )}
              </section>

              {/* Songs Section */}
              <section>
                <h4 className="text-warning mb-3 fw-bold text-uppercase small" style={{ letterSpacing: '2px' }}>Tracks</h4>
                {songs.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-dark table-hover mb-0">
                      <thead>
                        <tr className="text-secondary small">
                          <th>TITLE</th>
                          <th>ARTIST</th>
                          <th className="text-center">COVER</th>
                          <th className="text-end">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {songs.map(song => (
                          <tr key={song.id} className="align-middle">
                            <td>{song.title}</td>
                            <td className="text-secondary">{song.artist}</td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center">
                                <div 
                                  className="rounded bg-dark border border-secondary border-opacity-25 overflow-hidden shadow-sm"
                                  style={{ width: '40px', height: '40px' }}
                                >
                                  {song.cover_url ? (
                                    <img src={song.cover_url} className="w-100 h-100 object-fit-cover" alt="" />
                                  ) : (
                                    <Music size={20} className="m-2 text-secondary opacity-25" />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="text-end">
                              <button className="btn btn-link text-warning p-0" onClick={() => playSong(song, songs)}>
                                <Play size={20} fill="currentColor" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-secondary">No tracks found.</p>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
