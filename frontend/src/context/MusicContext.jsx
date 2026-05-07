import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useLocation } from "react-router-dom";

const MusicContext = createContext();

export const MusicProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState("none");

  const audioRef = useRef(new Audio());
  const location = useLocation();

  const playSong = async (song, songList = null, forcePlay = false) => {
    if (!song || !song.song_url) return;

    if (songList && Array.isArray(songList)) {
      setSongs(songList);
    }

    try {
      // If forcePlay is true, we skip the toggle check to ensure the song actually plays
      if (currentSong?.id === song.id && !forcePlay) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } else {
        // Load and play fresh
        audioRef.current.src = song.song_url;
        audioRef.current.load();
        await audioRef.current.play();
        setCurrentSong(song);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Playback failed:", err);
    }
  };

  const playNext = useCallback(
    (isAutomatic = false) => {
      if (songs.length === 0 || !currentSong) return;

      const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
      const nextIndex = currentIndex + 1;

      // Handle "Repeat One" for automatic transitions
      if (isAutomatic && repeatMode === "one") {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        return;
      }

      if (nextIndex >= songs.length) {
        // If clicking 'Next' OR Repeat All is ON, go back to song[0]
        if (!isAutomatic || repeatMode === "all") {
          // PASSING TRUE HERE IS CRITICAL to avoid the pause bug
          playSong(songs[0], null, true);
        } else {
          stopMusic();
        }
      } else {
        // Normal progression - also uses forcePlay to ensure reliability
        playSong(songs[nextIndex], null, true);
      }
    },
    [songs, currentSong, repeatMode],
  );

  const playPrev = () => {
    if (songs.length === 0 || !currentSong) return;

    // Restart song if more than 3 seconds have passed
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = songs.length - 1;
    }
    playSong(songs[prevIndex], null, true);
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === "none") return "all";
      if (prev === "all") return "one";
      return "none";
    });
  };

  const stopMusic = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const closePlayer = () => {
    stopMusic();
    setCurrentTime(0);
    setDuration(0);
    setCurrentSong(null);
  };

  const updateSongInList = (updatedSong) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === updatedSong.id ? { ...s, ...updatedSong } : s)),
    );
    if (currentSong?.id === updatedSong.id) {
      setCurrentSong((prev) => ({ ...prev, ...updatedSong }));
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => playNext(true);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playNext]);

  useEffect(() => {
    const isAuthRoute = ["/login", "/register"].includes(location.pathname);
    if (
      (isAuthRoute || location.pathname.startsWith("/admin")) &&
      currentSong
    ) {
      stopMusic();
    }
  }, [location.pathname, currentSong]);

  return (
    <MusicContext.Provider
      value={{
        songs,
        setSongs,
        currentSong,
        isPlaying,
        currentTime,
        duration,
        repeatMode,
        audioRef,
        playSong,
        playNext,
        playPrev,
        toggleRepeat,
        stopMusic,
        closePlayer,
        updateSongInList,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
