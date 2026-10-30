import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Download } from 'lucide-react';
import { alertDialog, confirmDialog } from '../utils/dialogService';

// Audios sueltos de una canción (2das voces, guías...) para que cada quien
// ensaye su parte. Van a R2 vía bandly-backend (URL firmada) y cuentan para
// la cuota de almacenamiento del plan.
const ACCEPT = 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac';
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
const MAX_MB = 50;
const KINDS = [
  { id: 'voz2', label: '2da voz' },
  { id: 'voz3', label: '3ra voz' },
  { id: 'guia', label: 'Guía' },
  { id: 'otro', label: 'Otro' },
];
const kindLabel = (id) => KINDS.find(k => k.id === id)?.label || 'Otro';

const formatSize = (bytes) => {
  if (!bytes) return '';
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export default function SongAudios({ song, orgId, session, apiUrl, canEdit, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState('voz2');
  const inputRef = useRef(null);

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` };

  const loadFiles = () => fetch(`${apiUrl}/api/song-files/${song.id}`, { headers: authHeaders })
    .then(r => (r.ok ? r.json() : { files: [] }))
    .then(d => d.files || [])
    .catch(() => []);

  const fetchFiles = async () => { setFiles(await loadFiles()); setLoading(false); };

  useEffect(() => {
    let alive = true;
    loadFiles().then(list => { if (alive) { setFiles(list); setLoading(false); } });
    return () => { alive = false; };
  }, [song.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    if (!list.length) return;

    const bad = list.find(f => !(f.type.startsWith('audio/') || AUDIO_EXT.test(f.name)));
    if (bad) { await alertDialog({ title: 'Archivo no permitido', message: `"${bad.name}" no es audio. Por ahora solo se pueden subir archivos de audio.` }); return; }
    const big = list.find(f => f.size > MAX_MB * 1048576);
    if (big) { await alertDialog({ title: 'Archivo muy grande', message: `"${big.name}" pesa más de ${MAX_MB} MB.` }); return; }

    setUploading(true);
    const failed = [];
    let quotaMsg = null;
    for (const file of list) {
      try {
        const urlRes = await fetch(`${apiUrl}/api/song-files/upload-url`, {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ orgId, songId: song.id, kind, fileName: file.name, fileType: file.type || 'audio/mpeg', fileSize: file.size })
        });
        if (!urlRes.ok) {
          const body = await urlRes.json().catch(() => ({}));
          if (urlRes.status === 403) quotaMsg = body.details || body.error;
          throw new Error(body.error || 'upload-url');
        }
        const { uploadUrl, key } = await urlRes.json();

        const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'audio/mpeg' }, body: file });
        if (!putRes.ok) throw new Error('put');

        const confirmRes = await fetch(`${apiUrl}/api/song-files/confirm`, {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ orgId, songId: song.id, kind, fileName: file.name, fileType: file.type || null, key })
        });
        if (!confirmRes.ok) throw new Error('confirm');
      } catch {
        failed.push(file.name);
      }
    }
    setUploading(false);
    await fetchFiles();
    if (failed.length) {
      await alertDialog({ title: 'No se pudo subir', message: quotaMsg || `Falló: ${failed.join(', ')}. Revisa tu conexión e inténtalo de nuevo.` });
    }
  };

  const handleDelete = async (f) => {
    if (!(await confirmDialog({ title: 'Eliminar audio', message: `¿Eliminar "${f.name}"?`, danger: true }))) return;
    const res = await fetch(`${apiUrl}/api/song-files/${f.id}`, { method: 'DELETE', headers: authHeaders });
    if (!res.ok) { await alertDialog({ title: 'No se pudo eliminar', message: 'Inténtalo de nuevo.' }); return; }
    await fetchFiles();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '95%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '1.8rem', background: '#1c1c20', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 500 }}>Audios de la canción</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{song.title}</div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.2rem' }}>
            <select className="input-field" value={kind} onChange={e => setKind(e.target.value)} style={{ width: 'auto' }}>
              {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
            <button type="button" className="btn-primary" disabled={uploading} onClick={() => inputRef.current?.click()}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={16} /> {uploading ? 'Subiendo...' : 'Subir audio'}
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Máx. {MAX_MB} MB por archivo</span>
            <input ref={inputRef} type="file" accept={ACCEPT} multiple onChange={handleUpload} style={{ display: 'none' }} />
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Cargando...</div>
        ) : files.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '1.5rem 0', textAlign: 'center' }}>
            {canEdit ? 'Aún no hay audios. Sube la 2da voz o una guía para el equipo.' : 'Esta canción aún no tiene audios.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {files.map(f => (
              <div key={f.id} style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="meta-tag" style={{ flexShrink: 0 }}>{kindLabel(f.kind)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', overflowWrap: 'anywhere' }}>{f.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatSize(f.size_bytes)}</div>
                  </div>
                  <a className="btn-secondary" href={f.url} download={f.name} target="_blank" rel="noreferrer" title="Descargar" style={{ display: 'flex', alignItems: 'center' }}>
                    <Download size={15} />
                  </a>
                  {canEdit && (
                    <button type="button" className="btn-secondary" onClick={() => handleDelete(f)} title="Eliminar"><Trash2 size={15} /></button>
                  )}
                </div>
                <audio controls preload="none" src={f.url} style={{ width: '100%', height: '36px' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
