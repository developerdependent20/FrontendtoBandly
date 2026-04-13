import React from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function TeamList({ members, isDirector, refreshData }) {
  const handleChangeRole = async (userId, newRole) => {
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (refreshData) refreshData();
    } catch (e) { alert("Error de base de datos o permisos (RLS)."); }
  };

  return (
    <section>
      <div className="tutorial-banner">
        <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '15px', color: 'white' }}>
          <Users size={24} />
        </div>
        <div>
          <h4>Gestión de Equipo</h4>
          <p>Mira quiénes forman parte de tu banda y gestiona sus roles (Director, Staff o Músico) para controlar el acceso.</p>
        </div>
      </div>

      <section className="glass-panel" style={{ padding: '2rem' }}>
        <h3 className="section-title"><Users size={20} color="var(--primary)" /> Miembros de la Banda</h3>
      <div style={{ marginTop: '1rem' }}>
        {members?.length === 0 ? ( <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Manda la llave de acceso a tu banda.</p> ) : (
          members?.map(m => (
            <div key={m.id} className="list-item" style={{ background: 'transparent' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                 <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: m.role==='director'? 'var(--primary)': 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800', color: m.role==='director'?'white':'#fff', flexShrink: 0 }}>
                   {m.full_name?.[0]?.toUpperCase()}
                 </div>
                 <div style={{ flex: 1, overflow: 'hidden' }}>
                   <div style={{ fontSize: '0.95rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{m.full_name}</div>
                 </div>
                 {isDirector ? (
                   <select 
                     value={m.role}
                     onChange={(e) => handleChangeRole(m.id, e.target.value)}
                     style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', textTransform: 'uppercase', outline: 'none', cursor: 'pointer' }}
                   >
                     <option value="director">Director</option>
                     <option value="staff">Staff</option>
                     <option value="musico">Músico</option>
                   </select>
                 ) : (
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.role}</div>
                 )}
               </div>
            </div>
          ))
        )}
      </div>

      <footer className="identity-footer">
        <p>Bandly: Juntos sonamos mejor.</p>
      </footer>
    </section>
  </section>
  );
}
