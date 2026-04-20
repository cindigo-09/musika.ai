import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import axios from 'axios';

export default function Home() {
    const [songs, setSongs] = useState([]);
    const [username, setUsername] = useState("");

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        navigate("/login");
    };
    useEffect(() => {
        const loadDashboard = async () => {
            // 1. Get the current logged-in user
            const { data: { user } } = await supabase.auth.getUser();

            // 2. Get their profile data (Genre)
            const { data: profile } = await supabase
                .from('profiles')
                .select('username, favorite_genre')
                .eq('id', user.id)
                .single();

            setUsername(profile.username);

            // 3. Call your Express server to get Jamendo music
            const musicResponse = await axios.get(`http://localhost:5000/api/recommendations`, {
                params: { genre: profile.favorite_genre }
            });

            setSongs(musicResponse.data);
        };

        loadDashboard();
    }, []);

    return (
        <div className="p-5 text-white">
            <h1>Welcome, {username}!</h1>
            <h3>Recommendations for your style:</h3>
            <div className="row">
                {songs.map(song => (
                    <div key={song.id} className="col-md-4 mb-3">
                        <div className="card bg-dark border-gold p-2">
                            <img src={song.image} alt={song.name} className="img-fluid" />
                            <p className="mt-2">{song.name}</p>
                            <audio controls className="w-100">
                                <source src={song.audio} type="audio/mpeg" />
                            </audio>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}