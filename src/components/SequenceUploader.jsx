import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Music, Loader2, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { unzipSync } from 'fflate';
import './SequenceUploader.css';

// ─────────────────────────────────────────────
// Detección inteligente de instrumentos
// ─────────────────────────────────────────────
const INSTRUMENT_MAP = [
  { keywords: ['click', 'metronome', 'metro'],         type: 'click',    label: '🥁 Click',      color: '#ef4444' },
  { keywords: ['cue', 'cues'],                          type: 'cue',      label: '🔔 Cues',       color: '#f59e0b' },
  { keywords: ['ac gtr', 'acoustic', 'acustic', 'acgtr'], type: 'ac_gtr', label: '🎸 AC GTR',     color: '#22c55e' },
  { keywords: ['e gtr', 'electric', 'dist', 'egtr', 'lead gtr', 'rhythm gtr'], type: 'e_gtr', label: '🎸 E GTR', color: '#3b82f6' },
  { keywords: ['bass', 'bajo'],                          type: 'bass',     label: '🎸 Bajo',       color: '#8b5cf6' },
  { keywords: ['keys', 'piano', 'pno', 'kb', 'keyboard'], type: 'keys', label: '🎹 Teclado',     color: '#06b6d4' },
  { keywords: ['drums', 'bateria', 'drum'],              type: 'drums',    label: '🥁 Batería',    color: '#f97316' },
  { keywords: ['vox', 'vocal', 'voice', 'voz', 'choir'], type: 'vocal', label: '🎙️ Vocal',       color: '#ec4899' },
  { keywords: ['pad', 'synth', 'ambient'],               type: 'pads',     label: '🎹 Pads/Synth', color: '#a855f7' },
  { keywords: ['strings', 'cuerdas', 'str', 'violin', 'cello'], type: 'strings', label: '🎻 Strings', color: '#14b8a6' },
  { keywords: ['perc', 'percussion', 'shaker', 'tamb'],  type: 'perc',     label: '🥁 Perc',       color: '#d97706' },
  { keywords: ['fx', 'sfx', 'effect', 'riser', 'sweep'], type: 'fx',      label: '✨ FX',          color: '#6366f1' },
];

function detectInstrument(fileName) {
  const name = fileName.toLowerCase().replace(/[_\-\.]/g, ' ');
  for (const entry of INSTRUMENT_MAP) {
    for (const kw of entry.keywords) {
      if (name.includes(kw)) {
        return { type: entry.type, label: entry.label, color: entry.color };
      }
    }
  }
  return { type: 'unknown', label: '🎵 ' + fileName.replace(/\.[^.]+$/, ''), color: '#64748b' };
}

// ─────────────────────────────────────────────
// Codificador WAV → MP3 (usando lamejs)
// ─────────────────────────────────────────────
async function encodeWavToMp3(wavArrayBuffer) {
  const lamejs = (await import('lamejs')).default || await import('lamejs');

  // Decodificar el WAV usando AudioContext
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(wavArrayBuffer.slice(0));
  audioCtx.close();

  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const kbps = 192;

  // Obtener PCM samples
  const left = audioBuffer.getChannelData(0);
  const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

  // Convertir Float32 a Int16
  const toInt16 = (float32) => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  };

  const leftInt16 = toInt16(left);
  const rightInt16 = toInt16(right);

  // Codificar con lamejs
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data = [];
  const blockSize = 1152;

  for (let i = 0; i < leftInt16.length; i += blockSize) {
    const leftChunk = leftInt16.subarray(i, i + blockSize);
    const rightChunk = rightInt16.subarray(i, i + blockSize);
    const mp3buf = channels > 1
      ? encoder.encodeBuffer(leftChunk, rightChunk)
      : encoder.encodeBuffer(leftChunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }

  const end = encoder.flush();
  if (end.length > 0) mp3Data.push(end);

  // Combinar todos los chunks en un solo Blob
  const blob = new Blob(mp3Data, { type: 'audio/mpeg' });
  return { blob, durationSeconds: audioBuffer.duration };
}

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────
export default function SequenceUploader({ song, orgId, session, onClose, onComplete, apiUrl }) {
  const [step, setStep] = useState('select'); // select | review | uploading | done
  const [stems, setStems] = useState([]);
  const [seqKey, setSeqKey] = useState(song?.key || '');
  const [seqBpm, setSeqBpm] = useState(song?.bpm || '');
  const [progress, setProgress] = useState({});
  const [globalStatus, setGlobalStatus] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // ── Paso 1: Seleccionar y descomprimir ZIP ──
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamaño (200MB máximo)
    if (file.size > 200 * 1024 * 1024) {
      setError('El archivo ZIP excede el límite de 200MB');
      return;
    }

    setGlobalStatus('Descomprimiendo ZIP...');
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const unzipped = unzipSync(uint8);

      // Filtrar solo archivos de audio
      const audioExtensions = ['.wav', '.aif', '.aiff', '.mp3', '.ogg', '.flac'];
      const audioFiles = Object.entries(unzipped)
        .filter(([name]) => {
          const ext = name.toLowerCase().substring(name.lastIndexOf('.'));
          const baseName = name.split('/').pop();
          return audioExtensions.includes(ext) && !baseName.startsWith('.') && !baseName.startsWith('__');
        })
        .map(([name, data], index) => {
          const baseName = name.split('/').pop();
          const detected = detectInstrument(baseName);
          return {
            id: index,
            fileName: baseName,
            fullPath: name,
            data: data, // Uint8Array
            instrumentType: detected.type,
            instrumentLabel: detected.label,
            color: detected.color,
            sizeOriginal: data.length,
            status: 'pending' // pending | encoding | uploading | done | error
          };
        })
        .slice(0, 24); // Máximo 24 stems

      if (audioFiles.length === 0) {
        setError('No se encontraron archivos de audio en el ZIP (.wav, .mp3, .aif, .ogg, .flac)');
        setGlobalStatus('');
        return;
      }

      setStems(audioFiles);
      setStep('review');
      setGlobalStatus('');
    } catch (err) {
      console.error('Error al descomprimir:', err);
      setError('Error al descomprimir el archivo. Asegúrate de que sea un ZIP válido.');
      setGlobalStatus('');
    }
  }, []);

  // ── Cambiar instrumento de un stem ──
  const updateStemInstrument = (stemId, field, value) => {
    setStems(prev => prev.map(s => s.id === stemId ? { ...s, [field]: value } : s));
  };

  // ── Remover stem de la lista ──
  const removeStem = (stemId) => {
    setStems(prev => prev.filter(s => s.id !== stemId));
  };

  // ── Paso 2: Procesar y subir ──
  const handleUpload = async () => {
    if (stems.length === 0) return;

    setStep('uploading');
    setError(null);

    try {
      // 1. Comprimir cada stem a MP3
      setGlobalStatus('Comprimiendo audio...');
      const compressedStems = [];

      for (let i = 0; i < stems.length; i++) {
        const stem = stems[i];
        setProgress(prev => ({ ...prev, [stem.id]: { phase: 'encoding', percent: 0 } }));
        setStems(prev => prev.map(s => s.id === stem.id ? { ...s, status: 'encoding' } : s));

        const isWav = stem.fileName.toLowerCase().endsWith('.wav') || stem.fileName.toLowerCase().endsWith('.aif') || stem.fileName.toLowerCase().endsWith('.aiff');
        let blob, durationSeconds;

        if (isWav) {
          // Convertir WAV/AIF a MP3
          const result = await encodeWavToMp3(stem.data.buffer);
          blob = result.blob;
          durationSeconds = result.durationSeconds;
        } else {
          // Ya es MP3/OGG, subir tal cual
          blob = new Blob([stem.data], { type: 'audio/mpeg' });
          durationSeconds = null;
        }

        const mp3FileName = stem.fileName.replace(/\.[^.]+$/, '.mp3');

        compressedStems.push({
          ...stem,
          fileName: mp3FileName,
          blob,
          sizeCompressed: blob.size,
          durationSeconds,
          status: 'ready'
        });

        setProgress(prev => ({ ...prev, [stem.id]: { phase: 'encoded', percent: 100 } }));
      }

      // 2. Solicitar URLs de subida al backend
      setGlobalStatus('Preparando subida...');
      const createResponse = await fetch(`${apiUrl}/api/sequences/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          orgId,
          songId: song.id,
          key: seqKey,
          bpm: seqBpm,
          stems: compressedStems.map(s => ({
            fileName: s.fileName,
            instrumentType: s.instrumentType,
            instrumentLabel: s.instrumentLabel,
            color: s.color
          }))
        })
      });

      if (!createResponse.ok) throw new Error('Error al crear la secuencia en el servidor');
      const { sequenceId, stems: stemsWithUrls } = await createResponse.json();

      // 3. Subir cada stem a R2 usando las signed URLs
      setGlobalStatus('Subiendo stems...');
      const confirmedStems = [];

      for (let i = 0; i < compressedStems.length; i++) {
        const stem = compressedStems[i];
        const { uploadUrl, r2Key, stemId } = stemsWithUrls[i];

        setStems(prev => prev.map(s => s.id === stem.id ? { ...s, status: 'uploading' } : s));
        setProgress(prev => ({ ...prev, [stem.id]: { phase: 'uploading', percent: 0 } }));

        // Subir directamente a R2
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'audio/mpeg' },
          body: stem.blob
        });

        if (!uploadResponse.ok) throw new Error(`Error al subir ${stem.fileName}`);

        setStems(prev => prev.map(s => s.id === stem.id ? { ...s, status: 'done' } : s));
        setProgress(prev => ({ ...prev, [stem.id]: { phase: 'done', percent: 100 } }));

        confirmedStems.push({
          originalName: stem.fileName,
          instrumentType: stem.instrumentType,
          instrumentLabel: stem.instrumentLabel,
          r2Key,
          sizeBytes: stem.sizeCompressed,
          durationSeconds: stem.durationSeconds,
          sortOrder: i,
          color: stem.color
        });
      }

      // 4. Confirmar subida en el backend
      setGlobalStatus('Finalizando...');
      await fetch(`${apiUrl}/api/sequences/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ sequenceId, stems: confirmedStems })
      });

      setStep('done');
      setGlobalStatus('¡Secuencia subida exitosamente!');

    } catch (err) {
      console.error('Error en el proceso de subida:', err);
      setError(err.message || 'Error durante la subida');
      setGlobalStatus('');
    }
  };

  // ── Render ──
  return (
    <div className="su-overlay">
      <div className="su-container">

        {/* Header */}
        <div className="su-header">
          <div className="su-header-left">
            <Music size={20} />
            <div>
              <h2>Subir Secuencia</h2>
              <span className="su-song-name">{song?.title}</span>
            </div>
          </div>
          <button className="su-close" onClick={onClose}><X size={22} /></button>
        </div>

        {/* Steps indicator */}
        <div className="su-steps">
          <div className={`su-step ${step === 'select' ? 'active' : (step !== 'select' ? 'completed' : '')}`}>
            <span className="su-step-num">1</span> Seleccionar
          </div>
          <ChevronRight size={16} className="su-step-arrow" />
          <div className={`su-step ${step === 'review' ? 'active' : (step === 'uploading' || step === 'done' ? 'completed' : '')}`}>
            <span className="su-step-num">2</span> Revisar
          </div>
          <ChevronRight size={16} className="su-step-arrow" />
          <div className={`su-step ${step === 'uploading' ? 'active' : (step === 'done' ? 'completed' : '')}`}>
            <span className="su-step-num">3</span> Subir
          </div>
        </div>

        {/* Content */}
        <div className="su-body">

          {/* Error display */}
          {error && (
            <div className="su-error">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Step 1: Select ZIP */}
          {step === 'select' && (
            <div className="su-select-zone" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              {globalStatus ? (
                <div className="su-loading">
                  <Loader2 size={40} className="spin-slow" />
                  <p>{globalStatus}</p>
                </div>
              ) : (
                <>
                  <Upload size={48} />
                  <h3>Selecciona tu archivo ZIP</h3>
                  <p>Arrastra o haz clic. Máximo 200MB, 24 stems.</p>
                  <p className="su-formats">Formatos: .wav .mp3 .aif .ogg .flac</p>
                </>
              )}
            </div>
          )}

          {/* Step 2: Review stems */}
          {step === 'review' && (
            <div className="su-review">
              {/* Metadata fields */}
              <div className="su-meta-fields">
                <div className="su-field">
                  <label>Tono de la Secuencia</label>
                  <input
                    type="text"
                    placeholder="Ej: A, Bb, C#m"
                    value={seqKey}
                    onChange={e => setSeqKey(e.target.value)}
                    className="su-input"
                  />
                </div>
                <div className="su-field">
                  <label>BPM</label>
                  <input
                    type="number"
                    placeholder="Ej: 120"
                    value={seqBpm}
                    onChange={e => setSeqBpm(e.target.value)}
                    className="su-input"
                  />
                </div>
              </div>

              {/* Stems list */}
              <div className="su-stem-list">
                <div className="su-stem-header">
                  <span>{stems.length} stems detectados</span>
                  <span className="su-size-total">
                    {(stems.reduce((a, s) => a + s.sizeOriginal, 0) / (1024 * 1024)).toFixed(1)}MB original
                  </span>
                </div>
                {stems.map(stem => (
                  <div key={stem.id} className="su-stem-row">
                    <div className="su-stem-color" style={{ background: stem.color }} />
                    <div className="su-stem-info">
                      <span className="su-stem-name">{stem.fileName}</span>
                      <span className="su-stem-size">{(stem.sizeOriginal / (1024 * 1024)).toFixed(1)}MB</span>
                    </div>
                    <select
                      className="su-stem-type-select"
                      value={stem.instrumentType}
                      onChange={(e) => {
                        const found = INSTRUMENT_MAP.find(m => m.type === e.target.value);
                        if (found) {
                          updateStemInstrument(stem.id, 'instrumentType', found.type);
                          updateStemInstrument(stem.id, 'instrumentLabel', found.label);
                          updateStemInstrument(stem.id, 'color', found.color);
                        }
                      }}
                    >
                      {INSTRUMENT_MAP.map(m => (
                        <option key={m.type} value={m.type}>{m.label}</option>
                      ))}
                      <option value="unknown">🎵 Otro</option>
                    </select>
                    <button className="su-stem-remove" onClick={() => removeStem(stem.id)} title="Quitar">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button className="su-btn-upload" onClick={handleUpload}>
                <Upload size={18} /> Comprimir y Subir Secuencia
              </button>
            </div>
          )}

          {/* Step 3: Uploading */}
          {step === 'uploading' && (
            <div className="su-uploading">
              <div className="su-status-bar">
                <Loader2 size={20} className="spin-slow" />
                <span>{globalStatus}</span>
              </div>
              <div className="su-stem-progress-list">
                {stems.map(stem => (
                  <div key={stem.id} className={`su-stem-progress ${stem.status}`}>
                    <div className="su-stem-color-dot" style={{ background: stem.color }} />
                    <span className="su-stem-label">{stem.instrumentLabel || stem.fileName}</span>
                    <span className="su-stem-status-badge">
                      {stem.status === 'pending' && '⏳ Pendiente'}
                      {stem.status === 'encoding' && '🔄 Comprimiendo...'}
                      {stem.status === 'uploading' && '📤 Subiendo...'}
                      {stem.status === 'done' && '✅ Listo'}
                      {stem.status === 'error' && '❌ Error'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="su-done">
              <CheckCircle size={64} className="su-done-icon" />
              <h3>¡Secuencia Lista!</h3>
              <p>Los {stems.length} stems han sido comprimidos y subidos exitosamente.</p>
              <p className="su-done-savings">
                Ahorro de espacio: {((1 - stems.reduce((a, s) => a + (s.sizeCompressed || 0), 0) / stems.reduce((a, s) => a + s.sizeOriginal, 0)) * 100).toFixed(0)}%
              </p>
              <button className="su-btn-upload" onClick={() => { if (onComplete) onComplete(); onClose(); }}>
                Aceptar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
