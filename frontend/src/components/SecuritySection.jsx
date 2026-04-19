import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
    ArrowBigRight
} from "lucide-react";

function SecuritySection() {
    const navigate = useNavigate();
    const [deleting, setDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you extremely sure? All your data will be permanently deleted and cannot be reversed.")) return;
        setDeleting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No active user found.");

            // Ping the backend using our new /api/user endpoint (since clients can't self-delete in Supabase)
            const response = await fetch(`http://localhost:8080/api/user/${user.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete account");
            }

            // Cleanup local state and kick to login screen
            await supabase.auth.signOut();
            localStorage.clear();
            navigate('/login');
        } catch (error) {
            alert(error.message);
            setDeleting(false);
        }
    };
    return (
        <div className="d-flex flex-column gap-4">
            <section className="p-4 rounded-4" style={{ backgroundColor: '#191c22' }}>
                <h6 className="text-uppercase fw-bold mb-4 d-flex align-items-center gap-2">
                    <span className="material-symbols-outlined text-warning">encrypted</span> Security
                </h6>
                <div className="list-group list-group-flush gap-3">
                    <div className="list-group-item bg-transparent border rounded p-3 d-flex justify-content-between align-items-center hover-border-warning cursor-pointer">
                        <span className="small fw-bold text-light">Change Password</span>
                        <span className="material-symbols-outlined text-muted small text-light"><ArrowBigRight color='white' /></span>
                    </div>
                    <div className="list-group-item bg-transparent border rounded p-3 d-flex justify-content-between align-items-center">
                        <span className="small fw-bold text-light">Two-Factor Auth</span>
                        <span className="badge bg-warning text-dark rounded-pill">ENABLED</span>
                    </div>
                </div>
            </section>


        </div >
    );
}

export default SecuritySection