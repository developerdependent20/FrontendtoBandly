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
        <div className="member-list-container">
          {members?.length === 0 ? (
            <p className="empty-msg">Manda el código de acceso a tu banda para empezar a sumar talentos.</p>
          ) : (
            members?.map(m => {
              const mFunctions = m.functions || [];
              const isUserDirector = m.role === 'director';
              
              return (
                <div key={m.id} className={`member-card ${isUserDirector ? 'is-director' : ''}`}>
                  <div className="member-identity">
                    <div className="member-avatar">
                      {m.full_name?.[0]?.toUpperCase()}
                      {isUserDirector && <div className="director-shield"><Shield size={10} /></div>}
                    </div>
                    
                    <div className="member-info">
                      <div className="member-name-row">
                        <span className="member-name">{m.full_name}</span>
                        {isUserDirector && <span className="director-badge">DIRECTOR</span>}
                      </div>
                      <div className="member-email">{m.email}</div>
                    </div>

                    {isDirector && (
                      <button 
                        onClick={() => handleToggleDirector(m.id, m.role)}
                        className={`director-toggle-btn ${isUserDirector ? 'active' : ''}`}
                        title={isUserDirector ? 'Quitar rol de director' : 'Hacer director'}
                      >
                        {isUserDirector ? 'ADMIN' : 'PROMOVER'}
                      </button>
                    )}
                  </div>

                  <div className="role-selector-section">
                    <span className="section-mini-label">Funciones y Capacidades</span>
                    <div className="role-selector-grid">
                      {isDirector ? (
                        functionsList.map(func => (
                          <button
                            key={func.id}
                            onClick={() => handleToggleFunction(m.id, m.functions, func.id)}
                            className={`role-chip ${mFunctions.includes(func.id) ? 'active' : ''}`}
                          >
                            <span className="chip-icon">{func.icon}</span>
                            {func.label}
                            {mFunctions.includes(func.id) && <CheckCircle2 size={12} className="check-icon" />}
                          </button>
                        ))
                      ) : (
                        <div className="role-display-row">
                          {mFunctions.map(f => (
                            <span key={f} className="static-role-chip">
                              {functionsList.find(fl => fl.id === f)?.icon} {f.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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
