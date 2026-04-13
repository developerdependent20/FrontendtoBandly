import React from 'react';
import { Volume2, VolumeX, Headphones, Music, ChevronUp, ChevronDown } from 'lucide-react';
import './MixerStrip.css';

/**
 * MixerStrip - Canal vertical de la consola Pro.
 */
const MixerStrip = ({ stem, state, onUpdate }) => {
  if (!state) return null;

  const handleVolChange = (e) => {
    onUpdate(stem.id, { volume: parseFloat(e.target.value) });
  };

  const toggleMute = () => onUpdate(stem.id, { muted: !state.muted });
  const toggleSolo = () => onUpdate(stem.id, { soloed: !state.soloed });
  const toggleStereo = () => onUpdate(stem.id, { isStereo: !state.isStereo });
  
  const changeRouting = (delta) => {
    const newIndex = Math.max(0, Math.min(31, state.routingIndex + delta));
    onUpdate(stem.id, { routingIndex: newIndex });
  };

  return (
    <div className={`mixer-strip ${state.isClickOrCue ? 'is-priority' : ''} ${state.muted ? 'is-muted' : ''}`}>
      {/* Header Info */}
      <div className="strip-header">
        <span className="strip-name">{stem.name}</span>
        <div className="strip-icon">
          {state.isClickOrCue ? <Headphones size={14} /> : <Music size={14} />}
        </div>
      </div>

      {/* Routing Controls */}
      <div className="strip-routing">
        <div className="routing-display" title="Salida Física">
          <span className="routing-label">OUT</span>
          <span className="routing-value">{state.routingIndex + 1}{state.isStereo ? `-${state.routingIndex + 2}` : ''}</span>
          <div className="routing-arrows">
            <button onClick={() => changeRouting(-1)}><ChevronUp size={10} /></button>
            <button onClick={() => changeRouting(1)}><ChevronDown size={10} /></button>
          </div>
        </div>
        <button 
          className={`stereo-toggle ${state.isStereo ? 'active' : ''}`}
          onClick={toggleStereo}
        >
          {state.isStereo ? 'ST' : 'M'}
        </button>
      </div>

      {/* Main Fader Area */}
      <div className="fader-container">
        <div className="vu-meter">
          <div className="vu-inner" style={{ height: state.muted ? '0%' : '40%' }}></div>
        </div>
        <input 
          type="range"
          min="-60"
          max="6"
          step="0.1"
          value={state.volume}
          onChange={handleVolChange}
          className="vertical-fader"
        />
      </div>

      {/* Bottom Actions */}
      <div className="strip-actions">
        <button 
          className={`action-btn solo-btn ${state.soloed ? 'active' : ''}`}
          onClick={toggleSolo}
        >
          S
        </button>
        <button 
          className={`action-btn mute-btn ${state.muted ? 'active' : ''}`}
          onClick={toggleMute}
        >
          {state.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>
    </div>
  );
};

export default MixerStrip;
