import React from 'react';
import { Users, Shield, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function TeamList({ members, isDirector, refreshData }) {
  const functionsList = [
    { id: 'musico', label: 'Músico', icon: '🎸' },
    { id: 'audio', label: 'Audio', icon: '🎚️' },
    { id: 'media', label: 'Media', icon: '📽️' },
    { id: 'staff', label: 'Staff', icon: '📋' },
    { id: 'bienvenida', label: 'Bienvenida', icon: '🤝' },
    { id: 'maestro', label: 'Maestro', icon: '🎓' },
    { id: 'voluntario', label: 'Voluntario', icon: '🌟' }
  ];

  const handleToggleFunction = async (userId, functions, functionId) => {
    if (!isDirector) return;
    try {
      let newFunctions = [...(functions || [])];
      if (newFunctions.includes(functionId)) {
        newFunctions = newFunctions.filter(f => f !== functionId);
      } else {
        newFunctions.push(functionId);
      }
      
      const { error } = await supabase.from('profiles')
        .update({ functions: newFunctions })
        .eq('id', userId);
        
      if (error) throw error;
      if (refreshData) refreshData();
    } catch (e) {
      alert("Error al actualizar funciones: " + e.message);
    }
  };

  const handleToggleDirector = async (userId, currentRole) => {
    if (!isDirector) return;
    const newRole = currentRole === 'director' ? 'member' : 'director';
    try {
      const { error } = await supabase.from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      if (refreshData) refreshData();
    } catch (e) {
      alert("Error al actualizar rol de director.");
    }
  };

  return (
    <section>
      <div className="tutorial-banner">
        <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '15px', color: 'white' }}>
          <Users size={24} />
        </div>
        <div>
          <h4>Gestión de Equipo Multi-Rol</h4>
          <p>Organiza a tu equipo asignando múltiples funciones. Solo tú como Director puedes hacer estos cambios.</p>
        </div>
      </div>

      <section className="glass-panel" style={{ padding: '2rem' }}>
        <h3 className="section-title"><Users size={20} color="var(--primary)" /> Miembros de la Banda</h3>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {members?.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Manda el código de acceso a tu banda.</p>
          ) : (
            members?.map(m => {
              const mFunctions = m.functions || [];
              const isUserDirector = m.role === 'director';
              
              return (
                <div key={m.id} className="list-item" style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '1.2rem',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {/* Fila Superior: Info Básica */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '12px', 
                      background: isUserDirector ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '1rem', fontWeight: '800', color: 'white' 
                    }}>
                      {m.full_name?.[0]?.toUpperCase()}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '600' }}>{m.full_name}</span>
                        {isUserDirector && <Shield size={14} color="var(--primary)" />}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.email}</div>
                    </div>

                    {isDirector && (
                      <button 
                        onClick={() => handleToggleDirector(m.id, m.role)}
                        className={`badge ${isUserDirector ? 'active' : ''}`}
                        style={{ border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                      >
                        {isUserDirector ? 'ES DIRECTOR' : 'HACER DIRECTOR'}
                      </button>
                    )}
                  </div>

                  {/* Fila Inferior: Funciones */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {isDirector ? (
                      functionsList.map(func => (
                        <button
                          key={func.id}
                          onClick={() => handleToggleFunction(m.id, m.functions, func.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.7rem',
                            border: '1px solid',
                            borderColor: mFunctions.includes(func.id) ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                            background: mFunctions.includes(func.id) ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                            color: mFunctions.includes(func.id) ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {mFunctions.includes(func.id) && <CheckCircle2 size={10} />}
                          {func.label}
                        </button>
                      ))
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {mFunctions.map(f => (
                          <span key={f} className="badge" style={{ fontSize: '0.65rem' }}>{f.toUpperCase()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <footer className="identity-footer" style={{ marginTop: '2rem' }}>
        <p>Bandly: Juntos sonamos mejor.</p>
      </footer>
    </section>
  );
}
