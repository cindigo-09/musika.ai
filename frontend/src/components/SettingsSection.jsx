import React from "react";
import { useMusic } from "../context/MusicContext";
import { Sliders, Volume2, MessageSquare, Zap } from "lucide-react";

export default function SettingsSection() {
  const { settings, setSettings } = useMusic();

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelect = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="p-4 bg-transparent border-0">
      <h6 className="text-warning mb-4 d-flex align-items-center gap-2 text-uppercase fw-bold letter-spacing-1">
        <Sliders size={18} /> Audio & UI Preferences
      </h6>

      {/* AI Assistant Toggle */}
      <div className="d-flex justify-content-between align-items-center mb-4 p-2 rounded-3 hover-bg-dark">
        <div>
          <div className="fw-bold small d-flex align-items-center gap-2 text-white">
            <MessageSquare size={14} className="text-warning" /> AI Chat
            Assistant
          </div>
          <p className="text-secondary x-small mb-0">
            Show or hide the help bot
          </p>
        </div>
        <div className="form-check form-switch">
          <input
            className="form-check-input custom-switch"
            type="checkbox"
            role="switch"
            checked={!settings.chatbotDisabled}
            onChange={() => handleToggle("chatbotDisabled")}
          />
        </div>
      </div>

      {/* Volume Normalization */}
      <div className="d-flex justify-content-between align-items-center mb-4 p-2 rounded-3 hover-bg-dark">
        <div>
          <div className="fw-bold small d-flex align-items-center gap-2 text-info">
            <Volume2 size={14} /> Volume Normalization
          </div>
          <p className="text-secondary x-small mb-0">
            Balance loudness across tracks
          </p>
        </div>
        <div className="form-check form-switch">
          <input
            className="form-check-input custom-switch"
            type="checkbox"
            role="switch"
            checked={settings.volumeNormalization}
            onChange={() => handleToggle("volumeNormalization")}
          />
        </div>
      </div>

      {/* Equalizer Preset */}
      <div className="mb-2 p-2">
        <label className="x-small text-secondary text-uppercase fw-bold mb-2 d-block">
          <Zap size={12} className="me-1" /> Equalizer Preset
        </label>
        <select
          className="form-select form-select-sm bg-dark text-light border-secondary shadow-none py-2"
          value={settings.eqPreset}
          onChange={(e) => handleSelect("eqPreset", e.target.value)}
          style={{ cursor: "pointer" }}
        >
          <option value="Flat">Flat (Balanced)</option>
          <option value="Bass">Bass Boost</option>
          <option value="Pop">Clear Vocals</option>
          <option value="Rock">High Energy</option>
        </select>
      </div>
    </div>
  );
}
