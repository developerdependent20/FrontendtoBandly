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
  const [zipFile, setZipFile] = useState(null); // Guardar el archivo original
  const [seqKey, setSeqKey] = useState(song?.key || '');
  const [seqBpm, setSeqBpm] = useState(song?.bpm || '');
  const [progress, setProgress] = useState(0); // Ahora es progreso del ZIP único
  const [globalStatus, setGlobalStatus] = useState('');
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // ── Handlers de Drag & Drop ──
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);



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
      setZipFile(file); // Guardamos para subirlo después
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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect({ target: { files: [e.dataTransfer.files[0]] } });
    }
  }, [handleFileSelect]);

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
    if (stems.length === 0 || !zipFile) return;

    setStep('uploading');
    setError(null);

    try {
      // 1. Solicitar URL de subida para el ZIP al backend
      setGlobalStatus('Preparando subida del ZIP...');
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
          stems: stems.map(s => ({
            fileName: s.fileName,
            instrumentType: s.instrumentType,
            instrumentLabel: s.instrumentLabel,
            color: s.color
          }))
        })
      });

      if (!createResponse.ok) throw new Error('Error al preparar la secuencia en el servidor');
      const { sequenceId, uploadUrl, stems: backendStems } = await createResponse.json();

      // 2. Subir el ZIP a R2
      setGlobalStatus('Subiendo archivo ZIP...');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/zip' },
        body: zipFile
      });

      if (!uploadResponse.ok) throw new Error(`Error al subir el archivo ZIP`);

      // 3. Confirmar subida en el backend con los IDs que nos dio
      setGlobalStatus('Finalizando...');
      const confirmedStems = backendStems.map((s, idx) => ({
        originalName: s.fileName,
        instrumentType: s.instrumentType,
        instrumentLabel: s.instrumentLabel,
        sizeBytes: stems[idx].sizeOriginal,
        sortOrder: s.sortOrder,
        color: s.color
      }));

      await fetch(`${apiUrl}/api/sequences/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ sequenceId, stems: confirmedStems })
      });

      setStep('done');
      setGlobalStatus('¡ZIP subido exitosamente!');

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
            <div 
              className={`su-select-zone ${isDragging ? 'dragging' : ''}`} 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragging ? '2px dashed var(--primary)' : '2px dashed rgba(255,255,255,0.2)',
                background: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
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
                <Upload size={18} /> Subir Archivo ZIP
              </button>
            </div>
          )}

          {/* Step 3: Uploading */}
          {step === 'uploading' && (
            <div className="su-uploading" style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div className="su-status-bar">
                <Loader2 size={40} className="spin-slow" color="var(--daw-cyan)" />
                <p style={{ marginTop: '1.5rem', fontWeight: '800' }}>{globalStatus}</p>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginTop: '2rem', overflow: 'hidden' }}>
                 <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #d946ef)', borderRadius: '10px' }} className="su-upload-progress-bar" />
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="su-done">
              <CheckCircle size={64} className="su-done-icon" />
              <h3>¡Multitrack ZIP Guardado!</h3>
              <p>El archivo original ha sido almacenado en R2.</p>
              <p className="su-done-savings">
                Este archivo será descargado y extraído automáticamente por la app de escritorio.
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
