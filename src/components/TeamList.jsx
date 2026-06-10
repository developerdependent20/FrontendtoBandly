import React, { useState, useMemo } from 'react';
import { Users, Shield, CheckCircle2, Trash2, Crown, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AvatarPicker } from './layout/AvatarPicker';
import OrgSettingsModal from './OrgSettingsModal';
import { Settings } from 'lucide-react';

export default function TeamList({ members, isDirector, refreshData, orgSettings }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const handleAvatarUpdate = async (url) => {
    if (!selectedMember) return;
    try {
      const { error } = await supabase.from('profiles')
        .update({ avatar_url: url })
        .eq('id', selectedMember.id);
      
      if (error) throw error;
      setSelectedMember(null);
      if (refreshData) refreshData();
    } catch (e) {
      alert("Error al actualizar avatar del miembro.");
    }
  };

  const handleDeleteMember = async (member) => {
    if (!isDirector) {
      alert("No tienes permisos de director para esta acción.");
      return;
    }
    if (member.role === 'director' && members.filter(m => m.role === 'director').length === 1) {
      alert("No puedes eliminar al único director de la organización.");
      return;
    }

    const confirm = window.confirm(`¿Estás seguro de que quieres eliminar a ${member.full_name} de la organización?`);
    if (!confirm) return;

    try {
      const { error } = await supabase.from('profiles')
        .update({ 
          org_id: null,
          functions: [],
          role: 'member'
        })
        .eq('id', member.id);
      
      if (error) throw error;
      if (refreshData) refreshData();
    } catch (e) {
      alert("Error al eliminar miembro: " + e.message);
    }
  };

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

  const functionsList = orgSettings?.roles?.length ? orgSettings.roles : [
    { id: 'admin_eventos', label: 'Admin Eventos', icon: '📅' },
    { id: 'admin_musica', label: 'Admin Música', icon: '🎸' },
    { id: 'admin_logistica', label: 'Admin Logística', icon: '📋' },
    { id: 'admin_produccion', label: 'Admin Producción', icon: '💻' }
  ];

  const INSTRUMENTS_CATALOG = orgSettings?.instruments?.length ? orgSettings.instruments : [
    { id: 'instr:bateria', label: 'Batería', icon: '🥁' },
    { id: 'instr:bajo', label: 'Bajo', icon: '🎸' },
    { id: 'instr:piano', label: 'Piano/Keys', icon: '🎹' },
    { id: 'instr:guitarra', label: 'Guitarra', icon: '🎸' },
    { id: 'instr:voz', label: 'Voz', icon: '🎤' },
    { id: 'instr:sonido', label: 'Sonido/Media', icon: '🎚️' }
  ];

  const partialAdminIds = new Set(functionsList.map(r => r.id));

  // Hierarchical Grouping
  const groupedMembers = useMemo(() => {
    if (!members) return { directors: [], admins: [], regulars: [] };
    
    const directors = members.filter(m => m.role === 'director');
    const admins = members.filter(m => m.role !== 'director' && (m.functions || []).some(f => partialAdminIds.has(f)));
    const regulars = members.filter(m => m.role !== 'director' && !(m.functions || []).some(f => partialAdminIds.has(f)));

    return { directors, admins, regulars };
  }, [members, partialAdminIds]);

  const renderMemberCard = (m, level) => {
    const mFunctions = m.functions || [];
    const isUserDirector = m.role === 'director';
    
    // level: 1 = Director, 2 = Admin, 3 = Regular
    let cardStyle = {};
    let avatarStyle = { border: '1px solid rgba(255,255,255,0.1)' };
    let badge = null;

    if (level === 1) {
      cardStyle = { border: '1px solid rgba(234, 179, 8, 0.4)', background: 'linear-gradient(145deg, rgba(234, 179, 8, 0.05) 0%, rgba(0,0,0,0.4) 100%)' };
      avatarStyle = { border: '2px solid rgba(234, 179, 8, 0.8)', boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)' };
      badge = <span className="director-badge" style={{ fontSize: '0.6rem', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}>DIRECTOR GLOBAL</span>;
    } else if (level === 2) {
      cardStyle = { border: '1px solid rgba(168, 85, 247, 0.4)', background: 'linear-gradient(145deg, rgba(168, 85, 247, 0.05) 0%, rgba(0,0,0,0.4) 100%)' };
      avatarStyle = { border: '2px solid rgba(168, 85, 247, 0.6)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)' };
      badge = <span className="director-badge" style={{ fontSize: '0.6rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>LÍDER DE ÁREA</span>;
    }

    return (
      <div key={m.id} className={`member-card`} style={cardStyle}>
        <div className="member-identity">
          <div 
            className="member-avatar"
            onClick={() => isDirector && setSelectedMember(m)}
            style={{ 
              width: '110px', height: '110px', borderRadius: '50%',
              cursor: isDirector ? 'pointer' : 'default', overflow: 'hidden',
              position: 'relative', background: 'rgba(255,255,255,0.03)',
              ...avatarStyle
            }}
          >
            {m.avatar_url ? (
              <img src={m.avatar_url} alt={m.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '2.5rem', fontWeight: '900' }}>{m.full_name?.[0]?.toUpperCase()}</span>
            )}
            {isUserDirector && <div className="director-shield" style={{ zIndex: 10, background: '#eab308' }}><Crown size={12} color="black" /></div>}
            {!isUserDirector && level === 2 && <div className="director-shield" style={{ zIndex: 10, background: '#a855f7' }}><Star size={12} color="white" /></div>}
            {isDirector && (
              <div style={{ 
                position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', 
                fontSize: '0.55rem', padding: '3px 0', textAlign: 'center', fontWeight: 'bold',
                backdropFilter: 'blur(4px)', color: 'white', pointerEvents: 'none'
              }}>
                EDIT
              </div>
            )}
          </div>
          
          <div className="member-info">
            <div className="member-name-row">
              <span className="member-name">{m.full_name}</span>
              {badge}
            </div>
            <div className="member-email">{m.email}</div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
            {isDirector && (
              <button 
                type="button"
                onClick={() => handleToggleDirector(m.id, m.role)}
                className={`director-toggle-btn ${isUserDirector ? 'active' : ''}`}
                title={isUserDirector ? 'Quitar rol de director global' : 'Hacer director global'}
                style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '0.7rem' }}
              >
                {isUserDirector ? 'GLOBAL' : 'HACER GLOBAL'}
              </button>
            )}

            {isDirector && (
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMember(m); }}
                style={{ 
                  background: '#ef4444', border: 'none', color: 'white', width: '45px', height: '45px',
                  borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', transition: 'all 0.2s', position: 'relative', 
                  zIndex: 9999, boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                }}
                className="hover-scale"
                title="Eliminar de la organización"
              >
                <Trash2 size={22} />
              </button>
            )}
          </div>
        </div>

        <div className="role-selector-section">
          <span className="section-mini-label">Áreas de Liderazgo / Administración</span>
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
                {mFunctions.filter(f => partialAdminIds.has(f)).map(f => (
                  <span key={f} className="static-role-chip">
                    {functionsList.find(fl => fl.id === f)?.icon} {functionsList.find(fl => fl.id === f)?.label || f.toUpperCase()}
                  </span>
                ))}
                {mFunctions.filter(f => partialAdminIds.has(f)).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin liderazgo asignado</span>}
              </div>
            )}
          </div>
        </div>

        <div className="role-selector-section" style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="section-mini-label" style={{ color: 'var(--primary)' }}>🎸 Instrumentos / Habilidades Operativas</span>
          <div className="role-selector-grid">
            {INSTRUMENTS_CATALOG.map(inst => {
              const isActive = mFunctions.includes(inst.id);
              if (!isDirector && !isActive) return null; // hide unassigned from non-directors to save space
              return (
                <button
                  key={inst.id}
                  onClick={() => isDirector && handleToggleFunction(m.id, m.functions, inst.id)}
                  className={`role-chip ${isActive ? 'active' : ''}`}
                  style={{ 
                    opacity: isDirector ? 1 : (isActive ? 1 : 0.3), 
                    cursor: isDirector ? 'pointer' : 'default',
                    background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <span className="chip-icon">{inst.icon}</span>
                  {inst.label}
                  {isActive && <CheckCircle2 size={12} className="check-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section>
      <div className="tutorial-banner">
        <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '15px', color: 'white' }}>
          <Users size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h4>Gestión de Equipo Multi-Rol</h4>
          <p>Organiza a tu equipo asignando múltiples funciones según tu propia estructura. Los miembros aparecerán agrupados por jerarquía.</p>
        </div>
        {isDirector && (
          <button 
            onClick={() => setShowSettingsModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--primary)', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            className="hover-scale"
          >
            <Settings size={18} /> Configurar Organización
          </button>
        )}
      </div>

      <section className="glass-panel" style={{ padding: '2rem', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        
        <OrgSettingsModal 
    isOpen={showSettingsModal} 
    onClose={() => setShowSettingsModal(false)} 
    orgId={members?.[0]?.org_id} 
    orgSettings={orgSettings} 
    refreshData={refreshData} 
  />
  <AvatarPicker 
          isOpen={!!selectedMember} 
          onClose={() => setSelectedMember(null)} 
          onSelect={handleAvatarUpdate}
          currentAvatar={selectedMember?.avatar_url}
        />

        <div className="member-list-container">
          {members?.length === 0 ? (
            <p className="empty-msg">Manda el código de acceso a tu organización para empezar a sumar talentos.</p>
          ) : (
            <>
              {groupedMembers.directors.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#eab308', marginBottom: '1.5rem', borderBottom: '1px solid rgba(234, 179, 8, 0.2)', paddingBottom: '0.5rem' }}>
                    <Crown size={22} /> Nivel 1: Dirección Global
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.directors.map(m => renderMemberCard(m, 1))}
                  </div>
                </div>
              )}

              {groupedMembers.admins.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c084fc', marginBottom: '1.5rem', borderBottom: '1px solid rgba(168, 85, 247, 0.2)', paddingBottom: '0.5rem' }}>
                    <Star size={22} /> Nivel 2: Líderes de Área / Administradores
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.admins.map(m => renderMemberCard(m, 2))}
                  </div>
                </div>
              )}

              {groupedMembers.regulars.length > 0 && (
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.5rem' }}>
                    <Users size={22} /> Nivel 3: Equipo / Músicos
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.regulars.map(m => renderMemberCard(m, 3))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <footer className="identity-footer" style={{ marginTop: '2rem' }}>
        <p>Bandly: Juntos sonamos mejor.</p>
      </footer>
    </section>
  );
}
