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
  // Library songs for UI rendering (Home, etc.)
  const [librarySongs, setLibrarySongs] = useState([]);

  // Active queue for playback controls (Next/Prev should advance within this)
  const [queueSongs, setQueueSongs] = useState([]);

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState("none");

  const audioRef = useRef(new Audio());
  const location = useLocation();

  /**
   * Play a song.
   * @param {object} song
   * @param {Array|null} songList - if provided, becomes the active queue (used by Next/Prev)
   * @param {boolean} forcePlay
   */
  const playSong = async (song, songList = null, forcePlay = false) => {
    if (!song || !song.song_url) return;

    // Only update the active playback queue when a specific list is provided.
    // Do NOT overwrite librarySongs.
    if (songList && Array.isArray(songList)) {
      setQueueSongs(songList);
    } else if (!queueSongs.length) {
      // If no queue exists yet (e.g., first play from an entry without passing a list),
      // default queue to library.
      setQueueSongs(librarySongs);
    }

    try {
      if (currentSong?.id === song.id && !forcePlay) {
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
    }
  };

  const playNext = useCallback(
    (isAutomatic = false) => {
      if (queueSongs.length === 0 || !currentSong) return;

      const currentIndex = queueSongs.findIndex((s) => s.id === currentSong.id);

      // If the current song isn't found in the active queue, fallback to first.
      if (currentIndex === -1) {
        playSong(queueSongs[0], null, true);
        return;
      }

      const nextIndex = currentIndex + 1;

      // "Repeat One" only affects automatic transitions (track ended)
      if (isAutomatic && repeatMode === "one") {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        return;
      }

      // Manual Next: always wrap last -> first
      if (!isAutomatic && nextIndex >= queueSongs.length) {
        playSong(queueSongs[0], null, true);
        return;
      }

      // Automatic ended: respect repeat mode
      if (nextIndex >= queueSongs.length) {
        if (repeatMode === "all") {
          playSong(queueSongs[0], null, true);
        } else {
          stopMusic();
        }
        return;
      }

      playSong(queueSongs[nextIndex], null, true);
    },
    [queueSongs, currentSong, repeatMode],
  );

  const playPrev = () => {
    if (queueSongs.length === 0 || !currentSong) return;

    // Restart song if more than 3 seconds have passed
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = queueSongs.findIndex((s) => s.id === currentSong.id);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queueSongs.length - 1;
    }
    playSong(queueSongs[prevIndex], null, true);
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
    setQueueSongs([]);
  };

  const updateSongInList = (updatedSong) => {
    // Update library
    setLibrarySongs((prev) =>
      prev.map((s) => (s.id === updatedSong.id ? { ...s, ...updatedSong } : s)),
    );

    // Update active queue
    setQueueSongs((prev) =>
      prev.map((s) => (s.id === updatedSong.id ? { ...s, ...updatedSong } : s)),
    );

    // Sync the current player state if the playing song was edited
    if (currentSong?.id === updatedSong.id) {
      setCurrentSong((prev) => ({
        ...prev,
        ...updatedSong,
        genre: updatedSong.genre,
        moods: updatedSong.moods,
      }));
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
        // Keep existing external API names mostly stable for minimal changes:
        // - Home uses `songs` for rendering; map it to librarySongs
        songs: librarySongs,
        setSongs: setLibrarySongs,
        queueSongs,
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
