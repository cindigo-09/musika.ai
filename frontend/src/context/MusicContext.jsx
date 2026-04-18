import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const MusicContext = createContext();

export const MusicProvider = ({ children }) => {
    const [songs, setSongs] = useState([]);
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const audioRef = useRef(new Audio());

    useEffect(() => {
        const audio = audioRef.current;
        const setAudioData = () => setDuration(audio.duration);
        const setAudioTime = () => setCurrentTime(audio.currentTime);

        audio.addEventListener("loadedmetadata", setAudioData);
        audio.addEventListener("timeupdate", setAudioTime);
        audio.addEventListener("ended", playNext);

        return () => {
            audio.removeEventListener("loadedmetadata", setAudioData);
            audio.removeEventListener("timeupdate", setAudioTime);
            audio.removeEventListener("ended", playNext);
        };
    }, [songs, currentSong]);

    const playSong = (song) => {
        if (currentSong?.song_id === song.song_id) {
            isPlaying ? audioRef.current.pause() : audioRef.current.play();
            setIsPlaying(!isPlaying);
        } else {
            audioRef.current.pause();
            audioRef.current.src = `http://localhost:8080${song.song_url}`;
            audioRef.current.load();
            audioRef.current.play();
            setCurrentSong(song);
            setIsPlaying(true);
        }
    };

    const playNext = () => {
        const idx = songs.findIndex(s => s.song_id === currentSong?.song_id);
        if (idx !== -1) {
            const next = songs[(idx + 1) % songs.length];
            playSong(next);
        }
    };

    const playPrev = () => {
        const idx = songs.findIndex(s => s.song_id === currentSong?.song_id);
        if (idx !== -1) {
            const prev = idx <= 0 ? songs[songs.length - 1] : songs[idx - 1];
            playSong(prev);
        }
    };

    const stopMusic = () => {
        audioRef.current.pause();
        audioRef.current.src = "";
        setCurrentSong(null);
        setIsPlaying(false);
    };

    return (
        <MusicContext.Provider value={{ 
            songs, setSongs, currentSong, isPlaying, playSong, 
            playNext, playPrev, currentTime, duration, audioRef, stopMusic 
        }}>
            {children}
        </MusicContext.Provider>
    );
};

export const useMusic = () => useContext(MusicContext);