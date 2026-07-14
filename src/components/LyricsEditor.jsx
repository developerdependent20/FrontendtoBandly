import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Loader2, Save, Mic2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { alertDialog } from '../utils/dialogService';

// ─────────────────────────────────────────────
// LYRICS EDITOR — Prepara letras desde la web para
// cargarlas el día del evento en Bandly Presenter.
// Escribe en la misma tabla (presenter_slides) que
// Presenter ya lee, sin tocar ese proyecto.
// ─────────────────────────────────────────────

export default function LyricsEditor({ song, onClose }) {
  const [slides, setSlides] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingRowId, setExistingRowId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [slidesRes, seqRes] = await Promise.all([
        supabase.from('presenter_slides').select('id, slides').eq('song_id', song.id).maybeSingle(),
        supabase.from('sequences').select('markers').eq('song_id', song.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (slidesRes.data) {
        setExistingRowId(slidesRes.data.id);
        setSlides(slidesRes.data.slides || []);
      }
      if (seqRes.data?.markers) {
        setMarkers(seqRes.data.markers);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [song.id]);

  const addSlide = useCallback(() => {
    setSlides(prev => [...prev, { id: crypto.randomUUID(), text: '', marker_sync: '' }]);
  }, []);

  const updateSlide = useCallback((id, field, value) => {
    setSlides(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  }, []);

  const removeSlide = useCallback((id) => {
    setSlides(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (existingRowId) {
        const { error } = await supabase
          .from('presenter_slides')
          .update({ slides, updated_at: new Date() })
          .eq('id', existingRowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('presenter_slides')
          .insert({ song_id: song.id, slides })
          .select()
          .single();
        if (error) throw error;
        setExistingRowId(data.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alertDialog('Error al guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        width: '95%', maxWidth: '720px', maxHeight: '90vh', background: '#0f172a', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mic2 size={20} color="#a855f7" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>LETRAS PARA PRESENTER</h2>
              <p style={{ margin: '2px 0 0', opacity: 0.5, fontSize: '0.75rem' }}>{song?.title}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.5 }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '16px' }}>
                Prepara las letras ahora — el día del evento, abre Bandly Presenter y ya van a estar cargadas ahí, listas para proyectar.
                {markers.length === 0 && ' Sube una secuencia con markers de sección en el DAW para poder sincronizar automáticamente.'}
              </p>

              {slides.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.4, fontSize: '0.85rem' }}>
                  Aún no hay diapositivas. Agrega la primera.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {slides.map((slide, i) => (
                  <div key={slide.id} style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', padding: '14px', display: 'flex', gap: '12px'
                  }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '900', opacity: 0.4 }}>#{i + 1}</span>
                        <select
                          value={slide.marker_sync || ''}
                          onChange={(e) => updateSlide(slide.id, 'marker_sync', e.target.value)}
                          disabled={markers.length === 0}
                          title={markers.length === 0 ? 'No hay markers de sección para esta canción en el DAW' : 'Sincroniza esta diapositiva con un marker del DAW'}
                          style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px', padding: '4px 8px', color: 'white', fontSize: '0.7rem', outline: 'none',
                            cursor: markers.length === 0 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <option value="">Sin auto-sync (avance manual)</option>
                          {markers.map((m) => (
                            <option key={m.id} value={m.label} style={{ background: '#0f172a' }}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={slide.text}
                        onChange={(e) => updateSlide(slide.id, 'text', e.target.value)}
                        placeholder="Escribe la letra de esta sección..."
                        rows={3}
                        style={{
                          background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px', padding: '10px', color: 'white', fontSize: '0.9rem',
                          resize: 'vertical', outline: 'none', fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removeSlide(slide.id)}
                      title="Quitar diapositiva"
                      style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addSlide}
                style={{
                  width: '100%', marginTop: '14px', padding: '12px', background: 'transparent',
                  border: '2px dashed rgba(255,255,255,0.15)', color: '#a855f7', borderRadius: '10px',
                  cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Plus size={16} /> AGREGAR DIAPOSITIVA
              </button>
            </>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
              background: saved ? '#10b981' : '#a855f7', color: '#fff', fontWeight: '800', fontSize: '0.85rem',
              cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar Letras'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
