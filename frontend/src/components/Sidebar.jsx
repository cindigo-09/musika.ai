import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom";
import {
    Music,
    Search as SearchIcon,
    User,
    FolderKanban,
    Play,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useMusic } from "../context/MusicContext";

function Sidebar() {
    const navigate = useNavigate();
    const { playSong } = useMusic();
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState({ users: [], songs: [] });
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Search Suggestions Logic
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchQuery.trim().length < 2) {
                setSuggestions({ users: [], songs: [] });
                return;
            }

            try {
                const { data: users } = await supabase
                    .from("profiles")
                    .select("id, username, avatar_url")
                    .eq("is_public", true)
                    .ilike("username", `%${searchQuery}%`)
                    .limit(3);

                const { data: songs } = await supabase
                    .from("songs")
                    .select("*")
                    .or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`)
                    .limit(3);

                setSuggestions({ users: users || [], songs: songs || [] });
            } catch (err) {
                console.error(err);
            }
        };

        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (type, item) => {
        if (type === "user") {
            navigate(`/user/${item.id}`);
        } else {
            playSong(item, [item]);
        }
        setShowSuggestions(false);
        setSearchQuery("");
    };

    return (
        <aside
            className="d-none d-md-block border-end border-secondary p-4 bg-dark bg-opacity-10 position-relative"
            style={{ width: "260px" }}
        >
            {/* Search Bar in Sidebar */}
            <div className="mb-4 position-relative">
                <form onSubmit={handleSearch} className="position-relative">
                    <SearchIcon size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary" />
                    <input 
                        type="text" 
                        className="form-control bg-dark border-secondary rounded-3 ps-5 text-white" 
                        placeholder="Search..."
                        style={{ fontSize: '0.85rem', paddingRight: '10px' }}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                    />
                </form>

                {/* Suggestions Dropdown */}
                {showSuggestions && (searchQuery.trim().length >= 2) && (
                    <>
                        <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 998 }} onClick={() => setShowSuggestions(false)}></div>
                        <div 
                            className="position-absolute mt-2 rounded-3 shadow-lg border border-secondary overflow-hidden"
                            style={{ width: '280px', left: '-10px', background: '#121216', zIndex: 999 }}
                        >
                            {suggestions.users.length === 0 && suggestions.songs.length === 0 ? (
                                <div className="p-3 text-center text-secondary small">No results</div>
                            ) : (
                                <>
                                    {suggestions.users.length > 0 && (
                                        <div className="p-2">
                                            <div className="px-2 py-1 x-small text-warning text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>Artists</div>
                                            {suggestions.users.map(user => (
                                                <div 
                                                    key={user.id} 
                                                    className="d-flex align-items-center gap-2 p-2 rounded-2 suggestion-item"
                                                    onClick={() => handleSuggestionClick("user", user)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div className="rounded-circle overflow-hidden border border-secondary" style={{ width: 24, height: 24, flexShrink: 0 }}>
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} className="w-100 h-100 object-fit-cover" alt="" />
                                                        ) : (
                                                            <User size={12} className="text-secondary m-1" />
                                                        )}
                                                    </div>
                                                    <div className="small fw-bold text-truncate">{user.username || "Anonymous"}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {suggestions.songs.length > 0 && (
                                        <div className="p-2 border-top border-secondary border-opacity-25">
                                            <div className="px-2 py-1 x-small text-info text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>Tracks</div>
                                            {suggestions.songs.map(song => (
                                                <div 
                                                    key={song.id} 
                                                    className="d-flex align-items-center gap-2 p-2 rounded-2 suggestion-item"
                                                    onClick={() => handleSuggestionClick("song", song)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div className="flex-grow-1 overflow-hidden">
                                                        <div className="small fw-bold text-truncate" style={{ fontSize: '0.8rem' }}>{song.title}</div>
                                                        <div className="text-secondary text-truncate" style={{ fontSize: '0.7rem' }}>{song.artist}</div>
                                                    </div>
                                                    <Play size={12} className="text-warning opacity-0 transition-opacity" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div 
                                        className="p-2 text-center border-top border-secondary border-opacity-25 bg-dark bg-opacity-25"
                                        onClick={handleSearch}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <span className="small text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>View all results</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            <button
                className="btn btn-warning w-100 mb-4 fw-bold shadow-sm"
                onClick={() => navigate('/home')}
            >
                <Music size={18} /> Library
            </button>
            <button
                className="btn btn-warning w-100 mb-4 fw-bold shadow-sm"
                onClick={() => navigate('/playlists')}
            >
                <FolderKanban size={18} /> Playlists
            </button>
            <button
                className="btn btn-warning w-100 mb-4 fw-bold shadow-sm"
                onClick={() => navigate('/profile')}
            >
                <User size={18} /> Profile
            </button>
            
            <style>{`
                .suggestion-item:hover { background: rgba(255, 255, 255, 0.05); }
                .suggestion-item:hover .transition-opacity { opacity: 1 !important; }
                .x-small { font-size: 0.75rem; }
            `}</style>

        </aside>
    );
}

export default Sidebar