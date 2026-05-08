import { Outlet } from "react-router-dom";
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
} from "lucide-react";
import Chatbot from "./Chatbot";

const Layout = () => {
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
    settings, // Added settings to handle the AI toggle
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
      <Outlet />

      {currentSong && (
        <footer
          className="fixed-bottom bg-dark border-top border-secondary p-3 text-white d-flex align-items-center justify-content-between"
          style={{ zIndex: 1050 }}
        >
          {/* 1. SONG INFO */}
          <div
            className="d-flex align-items-center gap-3"
            style={{ width: "25%" }}
          >
            <img
              src={currentSong.cover_url}
              alt=""
              className="rounded shadow"
              width="50"
              height="50"
              style={{ objectFit: "cover" }}
            />
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
                className="form-range flex-grow-1 custom-progress"
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
              className="form-range"
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
      {!settings.chatbotDisabled && <Chatbot />}
    </div>
  );
};

export default Layout;
