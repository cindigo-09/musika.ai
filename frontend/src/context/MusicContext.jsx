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
    }
  };

  const playNext = useCallback(() => {
    if (songs.length === 0) return;
    const idx = songs.findIndex((s) => s.id === currentSong?.id);
    const next = idx !== -1 ? songs[(idx + 1) % songs.length] : songs[0];
    playSong(next);
  }, [songs, currentSong]);

  const playPrev = useCallback(() => {
    if (songs.length === 0) return;
    const idx = songs.findIndex((s) => s.id === currentSong?.id);
    const prev = idx > 0 ? songs[idx - 1] : songs[songs.length - 1];
    playSong(prev);
  }, [songs, currentSong]);

  const stopMusic = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
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
    const onEnded = () => playNext();

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playNext]);

  return (
    <MusicContext.Provider
      value={{
        songs,
        setSongs,
        currentSong,
        isPlaying,
        currentTime,
        duration,
        playSong,
        playNext,
        playPrev,
        stopMusic,
        updateSongInList,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
