"use client";

import { useState, useRef } from "react";
import { Edit3, Play, Pause, Volume2 } from "lucide-react";

export const AudioBlockPlayer = ({ url, title, onTitleSave, isEditMode }: { url: string, title?: string, onTitleSave?: (newTitle: string) => void, isEditMode?: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title || "");
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
  };

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="audio-player-premium" style={{
      background: "var(--bg-dark)", 
      padding: "35px 45px", 
      borderRadius: "35px", 
      border: "1px solid var(--glass-border)",
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      gap: "20px",
      margin: "30px auto",
      width: "100%",
      maxWidth: "550px",
      boxShadow: "0 25px 50px rgba(0,0,0,0.35)",
      position: "relative"
    }}>
      {isEditingTitle ? (
        <div style={{ width: "100%", display: "flex", gap: 10, alignItems: "center" }}>
          <input 
            type="text" 
            autoFocus
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            style={{ flexGrow: 1, padding: "8px 15px", borderRadius: 10, border: "1px solid var(--yellow-primary)", background: "rgba(255,255,255,0.05)", color: "white", outline: "none" }}
          />
          <button onClick={() => { onTitleSave?.(tempTitle); setIsEditingTitle(false); }} style={{ background: "var(--yellow-primary)", border: "none", borderRadius: 8, padding: "8px 15px", color: "black", fontWeight: 700, cursor: "pointer" }}>OK</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", justifyContent: "center" }}>
          {title && <h4 style={{ margin: 0, color: "var(--yellow-primary)", fontSize: "1.2rem", textAlign: "center", fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{title}</h4>}
          {isEditMode && <Edit3 size={14} style={{ color: "var(--yellow-primary)", cursor: "pointer", opacity: 0.5 }} onClick={() => setIsEditingTitle(true)} />}
        </div>
      )}

      <audio ref={audioRef} src={url} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={() => setIsPlaying(false)} />

      <div style={{ display: "flex", justifyContent: "center", width: "100%", padding: "5px 0" }}>
        <button onClick={togglePlay} style={{ 
          background: "var(--yellow-primary)", 
          border: "none", 
          borderRadius: "50%", 
          width: 70, 
          height: 70, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          cursor: "pointer",
          color: "black",
          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          transform: isPlaying ? "scale(0.92)" : "scale(1)",
          boxShadow: isPlaying ? "0 0 25px var(--yellow-primary)" : "0 8px 15px rgba(0,0,0,0.2)"
        }}>
          {isPlaying ? <Pause size={30} fill="black" /> : <Play size={30} fill="black" style={{ marginLeft: 5 }} />}
        </button>
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, position: "relative", cursor: "pointer" }} onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          if (audioRef.current) audioRef.current.currentTime = pos * audioRef.current.duration;
        }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "var(--yellow-primary)", borderRadius: 4, transition: "width 0.1s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", opacity: 0.6, color: "white", fontWeight: 500 }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "15px", background: "rgba(255,255,255,0.05)", padding: "10px 20px", borderRadius: "18px" }}>
        <Volume2 size={18} color="white" style={{ opacity: 0.7 }} />
        <input 
          type="range" 
          min="0" max="1" step="0.1" 
          value={volume} 
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} 
          style={{ width: 80, cursor: "pointer", accentColor: "var(--yellow-primary)" }}
        />
      </div>
    </div>
  );
};
