import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

const MusicContext = createContext();

export const MusicProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(new Audio());

  // Handle playing the next song
  const playNext = useCallback(() => {
    if (songs.length === 0) return;
    const idx = songs.findIndex((s) => s.id === currentSong?.id);
    const next = idx !== -1 ? songs[(idx + 1) % songs.length] : songs[0];
    playSong(next);
  }, [songs, currentSong]);

  // Handle playing the previous song
  const playPrev = useCallback(() => {
    if (songs.length === 0) return;
    const idx = songs.findIndex((s) => s.id === currentSong?.id);
    const prev = idx > 0 ? songs[idx - 1] : songs[songs.length - 1];
    playSong(prev);
  }, [songs, currentSong]);

  // Listen for audio events
  useEffect(() => {
    const audio = audioRef.current;

    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => playNext(); // Automatically play next

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playNext]); // Re-bind when playNext changes

  const playSong = async (song) => {
    if (!song || !song.song_url) return;

    try {
      if (currentSong?.id === song.id) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } else {
        audioRef.current.src = song.song_url;
        audioRef.current.load();
        await audioRef.current.play();
        setCurrentSong(song);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Playback failed:", err);
      alert("Could not play audio. Ensure the file link is valid.");
    }
  };

  const stopMusic = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  return (
    <MusicContext.Provider
      value={{
        songs,
        setSongs,
        currentSong,
        isPlaying,
        playSong,
        stopMusic,
        playNext,
        playPrev,
        currentTime,
        duration,
        audioRef,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
