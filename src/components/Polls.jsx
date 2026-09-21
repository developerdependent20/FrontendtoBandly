import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, X, Trash2, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { alertDialog, confirmDialog } from '../utils/dialogService';
import FirstUseTip from './FirstUseTip';

// Encuestas simples de equipo: pregunta + opciones, un voto por persona,
// resultados en vivo. Pensado para lo que hoy se resuelve a las carreras por
// WhatsApp ("¿nos vemos a las 6 o a las 7?") pero dentro de Bandly.
export default function Polls({ profile, orgId, members }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);

  const isDirector = profile?.role === 'director';

  const fetchPolls = async () => {
    const { data, error } = await supabase
      .from('polls')
      .select('*, poll_options(*, poll_votes(*))')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (!error && data) setPolls(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!orgId) return;
    fetchPolls();

    const channel = supabase.channel(`polls_${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `org_id=eq.${orgId}` }, fetchPolls)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, fetchPolls)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const nameOf = (id) => members?.find(m => m.id === id)?.full_name || 'Alguien';

  const handleAddOptionField = () => setOptions(prev => [...prev, '']);
  const handleRemoveOptionField = (idx) => setOptions(prev => prev.filter((_, i) => i !== idx));
  const handleOptionChange = (idx, value) => setOptions(prev => prev.map((o, i) => i === idx ? value : o));

  const resetCreateForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setShowCreate(false);
  };

  const handleCreatePoll = async () => {
    const cleanOptions = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim()) { alertDialog('Falta la pregunta.'); return; }
    if (cleanOptions.length < 2) { alertDialog('Agrega al menos 2 opciones.'); return; }

    setSaving(true);
    try {
      const { data: poll, error } = await supabase
        .from('polls')
        .insert([{ org_id: orgId, created_by: profile.id, question: question.trim() }])
        .select()
        .single();
      if (error) throw error;

      const { error: optError } = await supabase
        .from('poll_options')
        .insert(cleanOptions.map((label, idx) => ({ poll_id: poll.id, label, order_index: idx })));
      if (optError) throw optError;

      resetCreateForm();
      fetchPolls();
    } catch (e) {
      alertDialog('Error al crear la encuesta: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (pollId, optionId) => {
    try {
      const { error } = await supabase
        .from('poll_votes')
        .upsert({ poll_id: pollId, option_id: optionId, profile_id: profile.id }, { onConflict: 'poll_id,profile_id' });
      if (error) throw error;
      fetchPolls();
    } catch (e) {
      alertDialog('Error al votar: ' + e.message);
    }
  };

  const handleToggleClose = async (poll) => {
    await supabase.from('polls').update({ is_closed: !poll.is_closed }).eq('id', poll.id);
    fetchPolls();
  };

  const handleDeletePoll = async (poll) => {
    if (!(await confirmDialog({ message: `¿Borrar la encuesta "${poll.question}"?`, danger: true }))) return;
    await supabase.from('polls').delete().eq('id', poll.id);
    fetchPolls();
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', width: '100%', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <BarChart3 size={30} color="var(--primary)" /> Encuestas
        </h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Nueva Encuesta
        </button>
      </div>

      <FirstUseTip
        storageKey={`bandly_tip_polls_${profile?.id || 'anon'}`}
        title="Cómo usar las encuestas"
        accentColor="#c2c2c1"
        items={[
          'Cualquiera del equipo puede crear una encuesta — no solo el director.',
          'Cada quien vota una sola vez; si cambia de opción, se reemplaza el voto anterior.',
          'El creador o un director puede cerrarla para que ya no se pueda votar más.'
        ]}
      />

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={resetCreateForm}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '500' }}>Nueva Encuesta</h3>
              <button onClick={resetCreateForm} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <input
              className="input-field"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="¿Qué quieres preguntar?"
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="input-field"
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    placeholder={`Opción ${idx + 1}`}
                    style={{ flex: 1 }}
                  />
                  {options.length > 2 && (
                    <button onClick={() => handleRemoveOptionField(idx)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '12px', color: '#ef4444', cursor: 'pointer', padding: '0 12px' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleAddOptionField} style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.6rem', width: '100%', fontSize: '0.8rem', fontWeight: '500', marginBottom: '1.5rem' }}>
              + Agregar opción
            </button>
            <button onClick={handleCreatePoll} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '0.9rem' }}>
              {saving ? 'Creando...' : 'Crear Encuesta'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      ) : polls.length === 0 ? (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <BarChart3 size={36} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Todavía no hay ninguna encuesta.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {polls.map(poll => {
            const options = (poll.poll_options || []).slice().sort((a, b) => a.order_index - b.order_index);
            const totalVotes = options.reduce((sum, o) => sum + (o.poll_votes?.length || 0), 0);
            const myVote = options.find(o => (o.poll_votes || []).some(v => v.profile_id === profile.id));
            const canManage = isDirector || poll.created_by === profile.id;

            return (
              <div key={poll.id} className="glass-panel" style={{ padding: '1.5rem', opacity: poll.is_closed ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.3rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '500', color: 'white' }}>{poll.question}</h3>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => handleToggleClose(poll)} title={poll.is_closed ? 'Reabrir' : 'Cerrar encuesta'} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}>
                        <Lock size={14} />
                      </button>
                      <button onClick={() => handleDeletePoll(poll)} title="Borrar" style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '12px', color: '#ef4444', cursor: 'pointer', padding: '6px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                  {nameOf(poll.created_by)} · {totalVotes} voto{totalVotes !== 1 ? 's' : ''}{poll.is_closed ? ' · cerrada' : ''}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {options.map(opt => {
                    const count = opt.poll_votes?.length || 0;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    const isMine = myVote?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => !poll.is_closed && handleVote(poll.id, opt.id)}
                        disabled={poll.is_closed}
                        style={{
                          position: 'relative', textAlign: 'left', padding: '0.7rem 1rem', borderRadius: '12px', overflow: 'hidden',
                          border: `1px solid ${isMine ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}`,
                          background: 'rgba(255,255,255,0.03)', cursor: poll.is_closed ? 'default' : 'pointer'
                        }}
                      >
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, background: isMine ? 'rgba(247, 244, 239, 0.12)' : 'rgba(255,255,255,0.06)', transition: 'width 0.3s' }} />
                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: isMine ? '800' : '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isMine && <CheckCircle2 size={13} color="var(--primary)" />} {opt.label}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>{pct}% ({count})</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
