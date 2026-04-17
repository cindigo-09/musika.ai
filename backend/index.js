import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Setup Local File Storage for Audio
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadDir));

// JSON Database Setup
const SONGS_FILE = path.join(process.cwd(), 'songs.json');
if (!fs.existsSync(SONGS_FILE)) {
    fs.writeFileSync(SONGS_FILE, '[]');
}
const getSongs = () => JSON.parse(fs.readFileSync(SONGS_FILE, 'utf-8'));
const saveSongs = (songs) => fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));

// Admin client for restricted operations like deleting users
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.ROLE_KEY
);

app.delete('/api/user/:id', async (req, res) => {
    // Requires Service Role key to self-delete from auth users
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    
    // Also cleanup profiles table
    await supabaseAdmin.from('profiles').delete().eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

app.put('/api/user/:id/profile', async (req, res) => {
    // Uses Service Role key to bypass Row-Level Security on the profiles table
    const { username, bio } = req.body;
    const { error } = await supabaseAdmin.from('profiles').upsert({ 
        id: req.params.id, 
        username, 
        bio 
    });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

app.get('/api/data', async (req, res) => {
    const { data, error } = await supabase.from('your_table').select('*');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// Song Storage Endpoints
app.post('/api/songs', upload.single('mp3'), (req, res) => {
    try {
        const { title, artist, mood_tag, user_id } = req.body;
        
        // Handle physical file storage mapping
        let song_url = '';
        if (req.file) {
            song_url = `/uploads/${req.file.filename}`;
        }
        
        // Construct Database entity
        const newSong = {
            song_id: crypto.randomUUID(),
            title,
            artist,
            mood_tag,
            user_id,
            song_url,
            created_at: new Date().toISOString()
        };
        
        // Save permanently to local JSON store
        const songs = getSongs();
        songs.push(newSong);
        saveSongs(songs);
        
        res.json(newSong);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/songs/:userId', (req, res) => {
    try {
        const userSongs = getSongs().filter(s => s.user_id === req.params.userId);
        res.json(userSongs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/songs/:songId', (req, res) => {
    try {
        const songs = getSongs();
        const songIndex = songs.findIndex(s => s.song_id === req.params.songId);
        
        if (songIndex === -1) {
            return res.status(404).json({ error: "Song not found" });
        }
        
        const song = songs[songIndex];
        
        // Remove physical file safely
        if (song.song_url) {
            const filePath = path.join(process.cwd(), song.song_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        // Remove from database
        songs.splice(songIndex, 1);
        saveSongs(songs);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(8080, () => console.log('Server running on port 8080'));
