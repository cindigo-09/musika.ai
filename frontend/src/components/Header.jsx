import React from 'react'
import { LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

function Header() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null);
    const [currentUser, setCurrentUser] = useState("Guest");

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) { navigate("/login"); return; }
            setUserId(user.id);
            setCurrentUser(user.user_metadata?.username || user.email);
        };
        checkUser();
    }, [navigate]);

    const handleLogout = async () => {
        stopMusic(); // Crucial: Stop global audio before logout
        await supabase.auth.signOut();
        localStorage.clear();
        navigate("/login");
    };

    return (
        <header className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary bg-dark bg-opacity-25" style={{ height: "70px" }}>
            <h4 className="page-title m-0">MUSIKA.AI</h4>
            <div className="d-flex align-items-center gap-3">
                <div className="text-end d-none d-sm-block">
                    <div className="small text-white-50 text-uppercase">Operator</div>
                    <div className="fw-bold text-warning">{currentUser}</div>
                </div>
                <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
                    <LogOut size={16} />
                </button>
            </div>
        </header>
    )
}

export default Header