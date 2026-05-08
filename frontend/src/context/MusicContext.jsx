import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

const MusicContext = createContext();

export const MusicProvider = ({ children }) => {
  // 1. PRIMITIVE STATES FIRST
  // These are required by almost every other function and effect
  const [librarySongs, setLibrarySongs] = useState([]);
  const [queueSongs, setQueueSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState("none");

  // 2. SETTINGS & VOLUME INITIALIZATION
  // Must be defined before the Effects that watch them
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem("musika-settings");
    return savedSettings
      ? JSON.parse(savedSettings)
      : {
          chatbotDisabled: false,
          volumeNormalization: false,
          eqPreset: "Flat",
        };
  });

  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem("musika-volume");
    return savedVolume !== null ? parseFloat(savedVolume) : 0.7;
  });

  // 3. REFS
  // Define these before any function (like playSong) tries to access .current
  const audioRef = useRef(new Audio());
  const location = useLocation();

  // 4. SIDE EFFECTS (LIFECYCLE)
  // Syncing settings and volume to LocalStorage/Audio Element
  useEffect(() => {
    localStorage.setItem("musika-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (audioRef.current) {
      // Apply volume normalization logic if enabled
      const finalVolume = settings.volumeNormalization ? volume * 0.8 : volume;
      audioRef.current.volume = finalVolume;
    }
    localStorage.setItem("musika-volume", volume);
  }, [volume, settings.volumeNormalization]);

  // 5. MEMOIZED LOGIC (useCallback)
  // These functions depend on the states defined above
  const playSong = async (song, songList = null, forcePlay = false) => {
    if (!song || !song.song_url) return;

    if (songList && (currentSong?.id !== song.id || forcePlay)) {
      setQueueSongs(songList);
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

        // Record to listening_history in Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          supabase.from("listening_history").insert({
            user_id: user.id,
            song_id: song.id,
            played_at: new Date().toISOString(),
            genre_context: song.genre || song.mood_tag || null,
          }).then(({ error }) => {
            if (error) console.error("History insert error:", error.message);
          });
        }
      }
    } catch (err) {
      console.error("Playback failed:", err);
    }
  };

  const playNext = useCallback(
    (isAutomatic = false) => {
      if (queueSongs.length === 0 || !currentSong) return;

      const currentIndex = queueSongs.findIndex((s) => s.id === currentSong.id);

      if (isAutomatic && repeatMode === "one") {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        return;
      }

      const nextIndex = currentIndex + 1;

      if (nextIndex >= queueSongs.length) {
        if (repeatMode === "all" || !isAutomatic) {
          playSong(queueSongs[0], null, true);
        } else {
          setIsPlaying(false);
          audioRef.current.pause();
        }
      } else {
        playSong(queueSongs[nextIndex], null, true);
      }
    },
    [queueSongs, currentSong, repeatMode],
  );

  const playPrev = useCallback(() => {
    if (queueSongs.length === 0 || !currentSong) return;
    const currentIndex = queueSongs.findIndex((s) => s.id === currentSong.id);
    const prevIndex =
      currentIndex <= 0 ? queueSongs.length - 1 : currentIndex - 1;
    playSong(queueSongs[prevIndex], null, true);
  }, [queueSongs, currentSong]);

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === "none") return "all";
      if (prev === "all") return "one";
      return "none";
    });
  };

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setCurrentSong(null);
    setIsPlaying(false);
  };

  // 6. AUDIO EVENT LISTENERS
  useEffect(() => {
    const audio = audioRef.current;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onMetadata = () => setDuration(audio.duration);
    const onEnded = () => playNext(true);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playNext]);

  // 7. CONTEXT PROVIDER RENDER
  return (
    <MusicContext.Provider
      value={{
        songs: librarySongs,
        setSongs: setLibrarySongs,
        currentSong,
        isPlaying,
        currentTime,
        setCurrentTime,
        duration,
        repeatMode,
        volume,
        setVolume,
        playSong,
        playNext,
        playPrev,
        toggleRepeat,
        closePlayer,
        audioRef,
        settings,
        setSettings,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
