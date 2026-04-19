import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ProfileSection() {
    const [userId, setUserId] = useState(null);
    const [form, setForm] = useState({ username: '', bio: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Fetch existing profile data
                const { data } = await supabase
                    .from('profiles')
                    .select('username, bio')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setForm({ username: data.username || '', bio: data.bio || '' });
                } else if (user.user_metadata && user.user_metadata.username) {
                    setForm({ username: user.user_metadata.username, bio: '' });
                }
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!userId) return;

        setLoading(true);
        try {
            // 1. Send update to our local backend (which uses ADMIN keys to safely bypass the Supabase RLS policies!)
            const response = await fetch(`http://localhost:8080/api/user/${userId}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: form.username, bio: form.bio })
            });

            const dbError = response.ok ? null : await response.json();

            // 2. Also update the Auth system's metadata so that Home.jsx reflects the new name!
            const { error: authError } = await supabase.auth.updateUser({
                data: { username: form.username }
            });

            setLoading(false);
            if (dbError || authError) {
                alert('Error updating profile: ' + (dbError?.error || authError?.message));
            } else {
                alert('Profile updated securely via your Backend tunnel!');
            }
        } catch (error) {
            setLoading(false);
            alert("Database connection failed! Please make sure your Node.js backend server is running.");
        }
    };

    return (
        <div className="d-flex flex-column gap-4">
            <section className="p-4 rounded-4 shadow-sm" style={{ backgroundColor: 'rgba(39, 42, 49, 0.6)', border: '1px solid #32353c' }}>
                <div className="d-flex align-items-center gap-4 mb-4">
                    <div className="position-relative">
                        <img src="https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/no-profile-picture-icon.png"
                            className="rounded-circle border border-warning p-1" style={{ width: '100px', height: '100px' }} alt="Avatar" />
                        <button className="btn btn-warning btn-sm position-absolute bottom-0 end-0 rounded-circle p-2">
                            <span className="material-symbols-outlined text-dark" style={{ fontSize: '16px' }}>edit</span>
                        </button>
                    </div>
                    <div>
                        <h5 className="mb-1 font-headline">{form.username}</h5>
                        <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-sm btn-outline-secondary text-uppercase px-3">Upload New</button>
                            <button className="btn btn-sm text-danger text-uppercase px-3">Remove</button>
                        </div>
                    </div>
                </div>

                <form className="mt-4" onSubmit={handleSave}>
                    <div className="mb-4">
                        <label className="small text-warning text-uppercase fw-bold mb-2">Username</label>
                        <input
                            type="text"
                            className="form-control bg-transparent border-0 border-bottom border-secondary rounded-0 text-light px-0"
                            value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="small text-warning text-uppercase fw-bold mb-2">Bio</label>
                        <textarea
                            className="form-control bg-transparent border-0 border-bottom border-secondary rounded-0 text-light px-0"
                            rows="2"
                            value={form.bio}
                            onChange={e => setForm({ ...form, bio: e.target.value })}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-warning text-dark px-5 py-2 fw-bold text-uppercase">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </section>
        </div>
    );
}

export default ProfileSection;