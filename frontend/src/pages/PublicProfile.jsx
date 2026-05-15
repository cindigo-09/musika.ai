import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { User, Play, UserPlus, UserMinus, Music, FolderKanban, ArrowLeft } from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useMusic } from "../context/MusicContext";

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    playSong,
    favoriteSongIds,
    toggleFavorite,
  } = useMusic();

  const [profile, setProfile] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const viewerId = session?.user?.id || null;
      if (viewerId) {
        setCurrentUserId(viewerId);
        checkFollowStatus(viewerId, id);
      }
      fetchProfileData(viewerId);
    };
    init();
  }, [id]);

  const checkFollowStatus = async (followerId, followingId) => {
    const { data } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .single();
    setIsFollowing(!!data);
  };

  const fetchProfileData = async (viewerId) => {
    setLoading(true);
    try {
      // Fetch Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      
      if (!profileData) {
        setLoading(false);
        return;
      }
      setProfile(profileData);

      // Fetch Tracks
      const { data: trackData } = await supabase
        .from("songs")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      setTracks(trackData || []);

      // Fetch Playlists (All for owner, only public for others)
      let playlistQuery = supabase
        .from("playlists")
        .select("*")
        .eq("user_id", id)
        .order("name", { ascending: true });
      
      if (id !== viewerId) {
        playlistQuery = playlistQuery.eq("is_public", true);
      }

      const { data: playlistData } = await playlistQuery;
      setPlaylists(playlistData || []);

      // Fetch Follow Counts
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: 'exact', head: true })
        .eq("following_id", id);
      
      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: 'exact', head: true })
        .eq("follower_id", id);
      
      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async () => {
    setLoadingFollowers(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          follower_id,
          profiles:follower_id (id, username, avatar_url, bio, is_public)
        `)
        .eq("following_id", id);
      
      if (data) {
        setFollowersList(data.map(item => item.profiles));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const fetchFollowing = async () => {
    setLoadingFollowing(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          following_id,
          profiles:following_id (id, username, avatar_url, bio, is_public)
        `)
        .eq("follower_id", id);
      
      if (data) {
        setFollowingList(data.map(item => item.profiles));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) return;

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .match({ follower_id: currentUserId, following_id: id });
      if (!error) setIsFollowing(false);
    } else {
      const { error } = await supabase
        .from("follows")
        .insert([{ follower_id: currentUserId, following_id: id }]);
      if (!error) {
        setIsFollowing(true);
        // Create notification
        await supabase.from('notifications').insert([{
          user_id: id,
          actor_id: currentUserId,
          type: 'new_follower',
          content: 'You have a new follower!'
        }]);
      }
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden" style={{ background: "#050508" }}>
        <Header />
        <div className="d-flex justify-content-center align-items-center flex-grow-1">
          <div className="spinner-border text-warning" role="status"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden" style={{ background: "#050508" }}>
        <Header />
        <div className="text-center py-5">
          <h3>User not found</h3>
          <button className="btn btn-warning mt-3" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden" style={{ background: "#050508" }}>
      <Header />
      <div className="container-fluid p-0 d-flex flex-grow-1" style={{ minHeight: 0 }}>
        <Sidebar />
        <main className="flex-grow-1 overflow-auto p-4 p-md-5 custom-scrollbar">
          <button className="btn btn-link text-secondary p-0 mb-4 text-decoration-none d-flex align-items-center gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>

          <div className="row g-5 mb-5">
            <div className="col-lg-4">
              <div className="text-center p-4 rounded-4" style={{ background: '#121216', border: '1px solid #333' }}>
                <div className="rounded-circle overflow-hidden border border-secondary mx-auto mb-4" style={{ width: 150, height: 150 }}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-100 h-100 object-fit-cover" alt={profile.username} />
                  ) : (
                    <User size={80} className="text-secondary m-4" />
                  )}
                </div>
                <h2 className="fw-bold mb-1">{profile.username || "Anonymous"}</h2>
                <p className="text-secondary mb-3">{profile.bio || "No bio provided"}</p>
                
                <div className="d-flex justify-content-center gap-4 mb-4 pb-2">
                  <div 
                    className={`text-center ${id === currentUserId ? 'cursor-pointer hover-text-warning' : ''}`}
                    onClick={() => {
                      if (id === currentUserId) {
                        setShowFollowersModal(true);
                        fetchFollowers();
                      }
                    }}
                  >
                    <div className="fw-bold h4 mb-0">{followerCount}</div>
                    <div className="text-secondary small text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>Followers</div>
                  </div>
                  <div 
                    className={`text-center ${id === currentUserId ? 'cursor-pointer hover-text-warning' : ''}`}
                    onClick={() => {
                      if (id === currentUserId) {
                        setShowFollowingModal(true);
                        fetchFollowing();
                      }
                    }}
                  >
                    <div className="fw-bold h4 mb-0">{followingCount}</div>
                    <div className="text-secondary small text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>Following</div>
                  </div>
                </div>

                {id !== currentUserId && (
                  <button 
                    className={`btn w-100 py-2 fw-bold text-uppercase ${isFollowing ? 'btn-outline-secondary' : 'btn-warning text-dark'}`}
                    onClick={handleFollow}
                  >
                    {isFollowing ? <><UserMinus size={18} className="me-2" /> Unfollow</> : <><UserPlus size={18} className="me-2" /> Follow</>}
                  </button>
                )}
              </div>
            </div>

            <div className="col-lg-8">
              {!profile.is_public && id !== currentUserId ? (
                <div className="text-center py-5 rounded-4 border border-secondary bg-dark bg-opacity-25 mt-4">
                  <User size={64} className="text-secondary opacity-25 mb-3" />
                  <h4 className="fw-bold">This account is private</h4>
                  <p className="text-secondary">Follow this user to see their tracks and playlists.</p>
                </div>
              ) : (
                <>
                  {/* Tracks Section */}
                  <section className="mb-5">
                    <h4 className="text-warning mb-4 fw-bold text-uppercase d-flex align-items-center gap-2">
                      <Music size={20} /> Tracks
                    </h4>
                    {tracks.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-dark table-hover mb-0">
                          <thead>
                            <tr className="text-secondary small text-uppercase border-secondary">
                              <th className="text-center" style={{ width: "80px" }}>Cover</th>
                              <th>Title</th>
                              <th>Artist</th>
                              <th className="text-end px-4">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tracks.map((track) => (
                              <tr 
                                key={track.id} 
                                className="align-middle"
                                style={{ cursor: 'pointer' }}
                                onClick={() => playSong(track, tracks)}
                              >
                                <td className="text-center py-3">
                                  <div className="d-flex justify-content-center">
                                    <div 
                                      className="rounded bg-dark border border-secondary border-opacity-25 overflow-hidden shadow-sm flex-shrink-0"
                                      style={{ width: '45px', height: '45px' }}
                                    >
                                      {track.cover_url ? (
                                        <img src={track.cover_url} className="w-100 h-100 object-fit-cover" alt="" />
                                      ) : (
                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                                          <Music size={20} className="text-secondary opacity-25" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className={`fw-bold ${currentSong?.id === track.id ? "text-warning" : "text-white"}`}>
                                  {track.title}
                                </td>
                                <td className="text-secondary">{track.artist}</td>
                                <td className="text-end px-4">
                                  <div className="d-flex justify-content-end align-items-center gap-2">
                                    <button 
                                      className="btn btn-link p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        playSong(track, tracks);
                                      }}
                                      title="Play"
                                    >
                                      <Play size={18} className="text-warning" />
                                    </button>
                                    <button 
                                      className="btn btn-link p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(track.id);
                                      }}
                                      title={favoriteSongIds.has(track.id) ? "Remove from Favorites" : "Add to Favorites"}
                                    >
                                      <Heart 
                                        size={18} 
                                        fill={favoriteSongIds.has(track.id) ? "currentColor" : "none"}
                                        className={favoriteSongIds.has(track.id) ? "text-danger" : "text-secondary"}
                                      />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-secondary py-3">No tracks uploaded yet.</p>
                    )}
                  </section>

                  {/* Playlists Section */}
                  <section>
                    <h4 className="text-info mb-4 fw-bold text-uppercase d-flex align-items-center gap-2">
                      <FolderKanban size={20} /> Playlists
                    </h4>
                    {playlists.length > 0 ? (
                      <div className="row g-3">
                        {playlists.map(pl => (
                          <div key={pl.id} className="col-md-6">
                            <div 
                              className="p-3 rounded-3 d-flex align-items-center gap-3" 
                              style={{ background: '#121216', border: '1px solid #333', cursor: 'pointer' }}
                              onClick={() => navigate(`/playlists/${pl.id}`)}
                            >
                              <div className="bg-dark p-2 rounded-2">
                                <FolderKanban size={24} className="text-info" />
                              </div>
                              <div>
                                <div className="fw-bold">{pl.name}</div>
                                <div className="text-secondary x-small">{pl.description || "Public playlist"}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-secondary py-3">No public playlists found.</p>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center" 
          style={{ background: 'rgba(0,0,0,0.85)', zIndex: 2000 }}
        >
          <div 
            className="musika-card p-4 custom-scrollbar" 
            style={{ width: '450px', maxHeight: '80vh', background: '#121216', border: '1px solid #ffc107', overflowY: 'auto' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="text-warning m-0 fw-bold">YOUR FOLLOWERS</h5>
              <button className="btn btn-link text-secondary p-0" onClick={() => setShowFollowersModal(false)}>
                <X size={20} />
              </button>
            </div>

            {loadingFollowers ? (
              <div className="text-center py-4">
                <div className="spinner-border text-warning spinner-border-sm" role="status"></div>
              </div>
            ) : followersList.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {followersList.map(follower => (
                  <div 
                    key={follower.id} 
                    className="d-flex align-items-center justify-content-between p-2 rounded hover-bg-dark cursor-pointer"
                    onClick={() => {
                      if (follower.id === currentUserId || follower.is_public) {
                        setShowFollowersModal(false);
                        navigate(`/user/${follower.id}`);
                      } else {
                        triggerToast("This account is private", "info");
                      }
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle overflow-hidden border border-secondary" style={{ width: 40, height: 40 }}>
                        {follower.avatar_url ? (
                          <img src={follower.avatar_url} className="w-100 h-100 object-fit-cover" alt="" />
                        ) : (
                          <User size={20} className="text-secondary m-2" />
                        )}
                      </div>
                      <div>
                        <div className="fw-bold small">{follower.username || "Anonymous"}</div>
                        <div className="text-secondary x-small text-truncate" style={{ maxWidth: '200px' }}>
                          {follower.bio || "No bio"}
                        </div>
                      </div>
                    </div>
                    <ArrowLeft size={16} className="text-secondary opacity-25" style={{ transform: 'rotate(180deg)' }} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary text-center py-4">No followers yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center" 
          style={{ background: 'rgba(0,0,0,0.85)', zIndex: 2000 }}
        >
          <div 
            className="musika-card p-4 custom-scrollbar" 
            style={{ width: '450px', maxHeight: '80vh', background: '#121216', border: '1px solid #0dcaf0', overflowY: 'auto' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="text-info m-0 fw-bold">YOU ARE FOLLOWING</h5>
              <button className="btn btn-link text-secondary p-0" onClick={() => setShowFollowingModal(false)}>
                <X size={20} />
              </button>
            </div>

            {loadingFollowing ? (
              <div className="text-center py-4">
                <div className="spinner-border text-info spinner-border-sm" role="status"></div>
              </div>
            ) : followingList.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {followingList.map(following => (
                  <div 
                    key={following.id} 
                    className="d-flex align-items-center justify-content-between p-2 rounded hover-bg-dark cursor-pointer"
                    onClick={() => {
                      if (following.id === currentUserId || following.is_public) {
                        setShowFollowingModal(false);
                        navigate(`/user/${following.id}`);
                      } else {
                        triggerToast("This account is private", "info");
                      }
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle overflow-hidden border border-secondary" style={{ width: 40, height: 40 }}>
                        {following.avatar_url ? (
                          <img src={following.avatar_url} className="w-100 h-100 object-fit-cover" alt="" />
                        ) : (
                          <User size={20} className="text-secondary m-2" />
                        )}
                      </div>
                      <div>
                        <div className="fw-bold small">{following.username || "Anonymous"}</div>
                        <div className="text-secondary x-small text-truncate" style={{ maxWidth: '200px' }}>
                          {following.bio || "No bio"}
                        </div>
                      </div>
                    </div>
                    <ArrowLeft size={16} className="text-secondary opacity-25" style={{ transform: 'rotate(180deg)' }} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary text-center py-4">You are not following anyone yet.</p>
            )}
          </div>
        </div>
      )}

      <style>{`
        .hover-text-warning:hover { color: #ffc107 !important; transition: color 0.2s; }
        .hover-bg-dark:hover { background: rgba(255,255,255,0.05); transition: background 0.2s; }
      `}</style>
    </div>
  );
}
