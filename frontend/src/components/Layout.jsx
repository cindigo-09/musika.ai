import { Outlet, useLocation } from "react-router-dom";
import { useMusic } from "../context/MusicContext";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Volume2,
  X,
  Music,
  Shield,
} from "lucide-react";
import Chatbot from "./Chatbot";
import Toast from "./Toast";

const Layout = () => {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith('/home') || 
                           location.pathname.startsWith('/profile') || 
                           location.pathname.startsWith('/playlists') ||
                           location.pathname.startsWith('/search') ||
                           location.pathname.startsWith('/user');

  const {
    currentSong,
    isPlaying,
    playSong,
    playNext,
    playPrev,
    repeatMode,
    toggleRepeat,
    currentTime,
    setCurrentTime,
    duration,
    audioRef,
    closePlayer,
    volume,
    setVolume,
    settings,
  } = useMusic();

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  return (
    <div className="layout">
      <Toast />
      <Outlet />

      {currentSong && (
        <footer
          className="fixed-bottom bg-dark border-top border-secondary p-3 text-white d-flex align-items-center justify-content-between"
          style={{ zIndex: 1040 }}
        >
          {/* 1. SONG INFO */}
          <div
            className="d-flex align-items-center gap-3"
            style={{ width: "25%" }}
          >
            <div 
              className="rounded bg-dark border border-secondary border-opacity-25 overflow-hidden shadow-sm flex-shrink-0"
              style={{ width: '50px', height: '50px' }}
            >
              {currentSong.cover_url ? (
                <img
                  src={currentSong.cover_url}
                  alt=""
                  className="w-100 h-100 object-fit-cover"
                />
              ) : (
                <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                  <Music size={24} className="text-secondary opacity-25" />
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <div className="fw-bold text-truncate">{currentSong.title}</div>
              <div className="small text-secondary text-truncate">
                {currentSong.artist}
              </div>
            </div>
          </div>

          {/* 2. PLAYER CONTROLS */}
          <div className="flex-grow-1 d-flex flex-column align-items-center">
            <div className="d-flex align-items-center gap-4 mb-2">
              <SkipBack
                onClick={playPrev}
                className="cursor-pointer text-white-50 hover-white"
                size={22}
              />

              <button
                className={`btn btn-link p-0 shadow-none ${repeatMode !== "none" ? "text-warning" : "text-white-50"}`}
                onClick={toggleRepeat}
              >
                {repeatMode === "one" ? (
                  <Repeat1 size={22} />
                ) : (
                  <Repeat size={22} />
                )}
              </button>

              <button
                onClick={() => playSong(currentSong)}
                className="btn btn-warning rounded-circle d-flex align-items-center justify-content-center shadow"
                style={{ width: "45px", height: "45px" }}
              >
                {isPlaying ? (
                  <Pause fill="black" size={22} />
                ) : (
                  <Play fill="black" size={22} />
                )}
              </button>

              <SkipForward
                onClick={() => playNext(false)}
                className="cursor-pointer text-white-50 hover-white"
                size={22}
              />
            </div>

            <div className="d-flex align-items-center gap-2 w-100 px-5">
              <span
                className="small text-secondary"
                style={{ minWidth: "40px" }}
              >
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                className="form-range flex-grow-1 mana-progress"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
              />
              <span
                className="small text-secondary"
                style={{ minWidth: "40px" }}
              >
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* 3. VOLUME & CLOSE */}
          <div
            className="d-flex align-items-center justify-content-end gap-3"
            style={{ width: "25%" }}
          >
            <Volume2 size={20} className="text-secondary" />
            <input
              type="range"
              className="form-range shield-volume"
              style={{ width: "80px" }}
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
            <button
              className="btn btn-link text-white-50 p-0 ms-2"
              onClick={closePlayer}
            >
              <X size={20} />
            </button>
          </div>
        </footer>
      )}

      {/* CHATBOT CONDITIONAL RENDERING */}
      {/* settings.chatbotDisabled controls the global visibility of the AI Assistant */}
      {isDashboardRoute && !settings.chatbotDisabled && <Chatbot />}
    </div>
  );
};

export default Layout;
