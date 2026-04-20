import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play } from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function Playlists() {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);

    // Dummy data for visualization
    const dummyPlaylists = [
        { id: 1, name: "Chill Lo-fi", tracks: 24, cover: "https://picsum.photos/seed/1/300" },
        { id: 2, name: "Gym Pump", tracks: 15, cover: "https://picsum.photos/seed/2/300" },
        { id: 3, name: "Coding Focus", tracks: 42, cover: "https://picsum.photos/seed/3/300" },
        { id: 4, name: "Midnight City", tracks: 10, cover: "https://picsum.photos/seed/4/300" },
        { id: 5, name: "Daily Mix 1", tracks: 50, cover: "https://picsum.photos/seed/5/300" },
    ];

    return (
        <div className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden" style={{ background: "#050508" }}>
            <Header />
            <div className="container-fluid p-0 text-light d-flex flex-grow-1">
                <Sidebar />

                <main className="flex-grow-1 overflow-auto p-4" style={{ backgroundColor: '#050508' }}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="display-6 m-0 fw-bold">My Playlists</h2>
                        <button className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm" onClick={() => setShowModal(true)}>
                            <Plus size={20} className="me-2" /> ADD PLAYLISTS
                        </button>
                    </div>

                    {/* Playlist Grid */}
                    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-4">
                        {dummyPlaylists.map((playlist) => (
                            <div key={playlist.id} className="col">
                                <div
                                    className="card h-100 border-0 p-3 shadow-lg playlist-card"
                                    style={{
                                        backgroundColor: "#121216",
                                        borderRadius: "12px",
                                        transition: "background 0.3s ease",
                                        cursor: "pointer"
                                    }}
                                >
                                    <div className="position-relative overflow-hidden rounded-3 mb-3 aspect-ratio-1x1">
                                        <img
                                            src={playlist.cover}
                                            className="card-img-top shadow"
                                            alt={playlist.name}
                                            style={{ objectFit: "cover", aspectRatio: "1/1" }}
                                        />
                                        {/* Play Button Hover Overlay */}
                                        <div className="play-button-overlay position-absolute bottom-0 end-0 m-2">
                                            <button className="btn btn-warning rounded-circle p-3 shadow shadow-lg">
                                                <Play fill="black" size={24} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="card-body p-0">
                                        <h5 className="card-title text-truncate mb-1" style={{ fontSize: "1rem" }}>{playlist.name}</h5>
                                        <p className="card-text text-secondary small">{playlist.tracks} Tracks</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>

            {/* In-line CSS for the hover effect */}
            <style>{`
                .playlist-card:hover {
                    background-color: #1e1e24 !important;
                }
                .play-button-overlay {
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                }
                .playlist-card:hover .play-button-overlay {
                    opacity: 1;
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
}