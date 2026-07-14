import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Music, Calendar, User, X } from 'lucide-react';

// Búsqueda global: un solo campo que busca en canciones, eventos y miembros
// a la vez, y te lleva directo a la pestaña correcta al hacer clic — para no
// tener que adivinar en qué sección está lo que buscas.
export default function GlobalSearch({ songs, events, members, setActiveTab }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { songs: [], events: [], members: [] };
    return {
      songs: (songs || []).filter(s => s.title?.toLowerCase().includes(q)).slice(0, 5),
      events: (events || []).filter(e => e.name?.toLowerCase().includes(q)).slice(0, 5),
      members: (members || []).filter(m => m.full_name?.toLowerCase().includes(q)).slice(0, 5)
    };
  }, [query, songs, events, members]);

  const hasResults = results.songs.length > 0 || results.events.length > 0 || results.members.length > 0;

  const goTo = (tab) => {
    setActiveTab(tab);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px', maxWidth: '320px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '6px 12px' }}>
        <Search size={14} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar canción, evento o persona..."
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '0.75rem', flex: 1, minWidth: 0 }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setIsOpen(false); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0, display: 'flex' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#1a2133', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', zIndex: 1000, maxHeight: '360px', overflowY: 'auto', padding: '8px' }} className="custom-scrollbar">
          {!hasResults && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Sin resultados</div>
          )}

          {results.songs.length > 0 && (
            <>
              <div style={{ fontSize: '0.6rem', fontWeight: '900', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', padding: '6px 10px' }}>CANCIONES</div>
              {results.songs.map(s => (
                <button key={s.id} onClick={() => goTo('library')} className="dropdown-item-custom" style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: '10px', color: 'white', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                  <Music size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                </button>
              ))}
            </>
          )}

          {results.events.length > 0 && (
            <>
              <div style={{ fontSize: '0.6rem', fontWeight: '900', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', padding: '6px 10px' }}>EVENTOS</div>
              {results.events.map(e => (
                <button key={e.id} onClick={() => goTo('planner')} className="dropdown-item-custom" style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: '10px', color: 'white', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                  <Calendar size={14} color="#eab308" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                </button>
              ))}
            </>
          )}

          {results.members.length > 0 && (
            <>
              <div style={{ fontSize: '0.6rem', fontWeight: '900', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', padding: '6px 10px' }}>PERSONAS</div>
              {results.members.map(m => (
                <button key={m.id} onClick={() => goTo('team')} className="dropdown-item-custom" style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: '10px', color: 'white', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                  <User size={14} color="#a855f7" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
