import React from 'react'
import { useNavigate } from "react-router-dom";
import {
    Music,
    User,
    FolderKanban,
    ShieldAlert,
} from "lucide-react";

function Sidebar() {
    const navigate = useNavigate();
    return (
        <aside
            className="d-none d-md-block border-end border-secondary p-4 bg-dark bg-opacity-10"
            style={{ width: "240px" }}
        >
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
            {/* <div className="mt-auto pt-5">
                <button
                    className="btn btn-outline-info w-100 fw-bold shadow-sm"
                    onClick={() => navigate('/admin')}
                >
                    <ShieldAlert size={18} /> Admin Panel
                </button>
            </div> */}

        </aside>
    );
}

export default Sidebar