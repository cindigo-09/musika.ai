import React from 'react'
import { useNavigate } from "react-router-dom";
import {
    Music,
    User,

} from "lucide-react";

function Sidebar() {
    const navigate = useNavigate();
    return (
        <aside
            className="d-none d-md-block border-end border-secondary p-4 bg-dark bg-opacity-10"
            style={{ width: "240px" }}
        >
            <h1 className="h4 text-warning fw-bold mb-5 font-headline">Musika AI</h1>
            <button
                className="btn btn-warning w-100 mb-4 fw-bold shadow-sm"
                onClick={() => navigate('/home')}
            >
                <Music size={18} /> Library
            </button>
            <button
                className="btn btn-warning w-100 mb-4 fw-bold shadow-sm"
                onClick={() => navigate('/profile')}
            >
                <User size={18} /> Profile
            </button>
        </aside>
    );
}

export default Sidebar