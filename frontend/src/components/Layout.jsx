import { Outlet, useLocation } from "react-router-dom";
import { useMusic } from "../context/MusicContext";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";

const Layout = () => {
  const { currentSong, isPlaying, playSong, playNext, playPrev, currentTime, duration, audioRef } = useMusic();
  const location = useLocation();

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="mana-background d-flex flex-column vh-100 vw-100">
      <main className="flex-grow-1 overflow-auto">
        <Outlet />
      </main>

      {!isAuthPage && currentSong && (
        <footer className="fixed-bottom bg-black border-top border-secondary d-flex align-items-center justify-content-between px-4" style={{ height: "100px", zIndex: 1030 }}>
          <div className="d-flex align-items-center gap-3" style={{ width: "25%" }}>
            <div className="text-truncate">
              <div className="small fw-bold text-warning">{currentSong?.title}</div>
              <div className="text-white-50 small">{currentSong?.artist}</div>
            </div>
          </div>

          <div className="d-flex flex-column align-items-center gap-2" style={{ width: "50%" }}>
            <div className="d-flex align-items-center gap-4">
              <button className="btn btn-link text-white-50 p-0" onClick={playPrev}><SkipBack size={22} /></button>
              <button className="btn btn-light rounded-circle p-2" onClick={() => playSong(currentSong)}>
                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button className="btn btn-link text-white-50 p-0" onClick={playNext}><SkipForward size={22} /></button>
            </div>
            <div className="d-flex align-items-center gap-2 w-100">
              <span className="small text-white-50">{formatTime(currentTime)}</span>
              <input type="range" className="form-range custom-progress" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} />
              <span className="small text-white-50">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-end gap-2" style={{ width: "25%" }}>
            <Volume2 size={18} className="text-white-50" />
            <input type="range" className="form-range w-50" min="0" max="100" onChange={e => (audioRef.current.volume = e.target.value / 100)} />
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;