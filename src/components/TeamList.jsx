import React, { useState, useMemo } from 'react';
import { Users, Shield, CheckCircle2, Trash2, Crown, Star, MonitorPlay, ClipboardCheck, Music, Headphones } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AvatarPicker } from './layout/AvatarPicker';
import OrgSettingsModal from './OrgSettingsModal';
import { Settings } from 'lucide-react';

export default function TeamList({ members, isDirector, refreshData, orgSettings, orgId }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  React.useEffect(() => {
    if (localStorage.getItem('open_org_settings') === 'true') {
      setShowSettingsModal(true);
      localStorage.removeItem('open_org_settings');
    }
  }, []);
  
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

  // 1. Cargamos las categorías desde la DB (o usamos los defaults si no hay nada guardado aún)
  const leadershipRoles = orgSettings?.leadership ?? [
    { id: 'director_musical', label: 'Director Musical', icon: '🎼' },
    { id: 'eventos', label: 'Dir. Eventos', icon: '📅' },
    { id: 'lider_produccion', label: 'Líder Producción', icon: '🎬' },
    { id: 'lider_logistica', label: 'Líder Logística', icon: '📋' }
  ];

  const productionRoles = orgSettings?.production ?? [
    { id: 'media', label: 'Media/Visuales', icon: '📽️' },
    { id: 'sonido', label: 'Audio/Sonido', icon: '🎛️' },
    { id: 'transmision', label: 'Transmisión', icon: '📡' },
    { id: 'iluminacion', label: 'Iluminación', icon: '💡' }
  ];

  const logisticsRoles = orgSettings?.logistics ?? [
    { id: 'logistica', label: 'Staff/Logística', icon: '🛠️' },
    { id: 'decoracion', label: 'Decoración', icon: '🎨' },
    { id: 'bienvenida', label: 'Bienvenida', icon: '👋' },
    { id: 'finanzas', label: 'Finanzas', icon: '💰' }
  ];

  const instrumentsCatalog = orgSettings?.instruments ?? [
    { id: 'bateria', label: 'Batería', icon: '🥁' },
    { id: 'bajo', label: 'Bajo', icon: '🎸' },
    { id: 'guitarra', label: 'Guitarra', icon: '🎸' },
    { id: 'piano', label: 'Teclado', icon: '🎹' },
    { id: 'voz', label: 'Voz/Cantante', icon: '🎤' },
    { id: 'percusion', label: 'Percusión', icon: '🪘' }
  ];

  const leadershipIds = new Set(leadershipRoles.map(r => r.id));
  const productionIds = new Set(productionRoles.map(r => r.id));
  const logisticsIds = new Set(logisticsRoles.map(r => r.id));
  const instrumentIds = new Set(instrumentsCatalog.map(r => r.id));

  // 2. Agrupación Jerárquica Exclusiva
  const groupedMembers = useMemo(() => {
    if (!members) return { global: [], leadership: [], production: [], logistics: [], music: [], unassigned: [] };
    
    const global = members.filter(m => m.role === 'director');
    const remainingAfterGlobal = members.filter(m => m.role !== 'director');

    // Nivel 2: Líderes de área (Prioridad alta)
    const leadership = remainingAfterGlobal.filter(m => (m.functions || []).some(f => leadershipIds.has(f)));
    const remainingAfterLeadership = remainingAfterGlobal.filter(m => !(m.functions || []).some(f => leadershipIds.has(f)));

    // Nivel 3: Equipos operativos (Música, Producción, Logística)
    const production = remainingAfterLeadership.filter(m => (m.functions || []).some(f => productionIds.has(f)));
    const remainingAfterProd = remainingAfterLeadership.filter(m => !(m.functions || []).some(f => productionIds.has(f)));

    const logistics = remainingAfterProd.filter(m => (m.functions || []).some(f => logisticsIds.has(f)));
    const remainingAfterLogistics = remainingAfterProd.filter(m => !(m.functions || []).some(f => logisticsIds.has(f)));

    const music = remainingAfterLogistics.filter(m => (m.functions || []).some(f => instrumentIds.has(f)));
    const unassigned = remainingAfterLogistics.filter(m => !(m.functions || []).some(f => instrumentIds.has(f)));

    return { global, leadership, production, logistics, music, unassigned };
  }, [members, leadershipIds, productionIds, logisticsIds, instrumentIds]);

  const renderMemberCard = (m, level, categoryName) => {
    const mFunctions = m.functions || [];
    const isUserDirector = m.role === 'director';
    
    // level: 1 = Global, 2 = Leadership, 3 = Staff (Music, Prod, Logistics)
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
    } else {
      // Level 3 badges
      let bColor = 'rgba(59, 130, 246, 0.2)';
      let tColor = '#3b82f6';
      if (categoryName === 'production') {
        bColor = 'rgba(168, 85, 247, 0.1)';
        tColor = '#c084fc';
      } else if (categoryName === 'logistics') {
        bColor = 'rgba(249, 115, 22, 0.1)';
        tColor = '#fb923c';
      }
      badge = <span className="director-badge" style={{ fontSize: '0.6rem', background: bColor, color: tColor }}>EQUIPO OPERATIVO</span>;
    }

    const renderRoleSection = (title, list, colorClass) => {
      // Si no es director y no tiene roles de esta sección, la ocultamos para limpiar la UI
      const hasAnyRole = list.some(r => mFunctions.includes(r.id));
      if (!isDirector && !hasAnyRole) return null;

      let accentColor = '#3b82f6';
      let bgActive = 'rgba(59, 130, 246, 0.15)';
      if (colorClass === 'yellow') { accentColor = '#eab308'; bgActive = 'rgba(234, 179, 8, 0.15)'; }
      else if (colorClass === 'purple') { accentColor = '#a855f7'; bgActive = 'rgba(168, 85, 247, 0.15)'; }
      else if (colorClass === 'orange') { accentColor = '#f97316'; bgActive = 'rgba(249, 115, 22, 0.15)'; }

      return (
        <div className="role-selector-section" style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="section-mini-label" style={{ color: accentColor }}>{title}</span>
          <div className="role-selector-grid">
            {isDirector ? (
              list.map(func => {
                const isActive = mFunctions.includes(func.id);
                return (
                  <button
                    key={func.id}
                    onClick={() => handleToggleFunction(m.id, m.functions, func.id)}
                    className={`role-chip ${isActive ? 'active' : ''}`}
                    style={{ 
                      background: isActive ? bgActive : 'rgba(255,255,255,0.02)',
                      border: isActive ? `1px solid ${accentColor}80` : '1px solid rgba(255,255,255,0.05)',
                      opacity: isActive ? 1 : 0.6
                    }}
                  >
                    <span className="chip-icon">{func.icon}</span>
                    {func.label}
                    {isActive && <CheckCircle2 size={12} className="check-icon" style={{ color: accentColor }} />}
                  </button>
                )
              })
            ) : (
              <div className="role-display-row">
                {list.filter(f => mFunctions.includes(f.id)).map(f => (
                  <span key={f.id} className="static-role-chip" style={{ border: `1px solid ${accentColor}40`, color: '#fff' }}>
                    {f.icon} {f.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

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

        {/* Sections for Roles */}
        <div style={{ padding: '0 10px 10px 10px' }}>
          {renderRoleSection("👑 Roles de Liderazgo", leadershipRoles, 'yellow')}
          {renderRoleSection("📽️ Equipo de Producción", productionRoles, 'purple')}
          {renderRoleSection("📋 Equipo de Logística", logisticsRoles, 'orange')}
          {renderRoleSection("🎵 Instrumentos", instrumentsCatalog, 'blue')}
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
          <h4>Jerarquía de Departamentos</h4>
          <p>Organiza a tu equipo asignando múltiples funciones. Los miembros aparecerán agrupados automáticamente bajo el departamento correspondiente a su rol más alto.</p>
        </div>
        {isDirector && (
          <button 
            onClick={() => setShowSettingsModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--primary)', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            className="hover-scale"
          >
            <Settings size={18} /> Configurar Departamentos
          </button>
        )}
      </div>

      <section className="glass-panel" style={{ padding: '2rem', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        
        <OrgSettingsModal 
          isOpen={showSettingsModal} 
          onClose={() => setShowSettingsModal(false)} 
          orgId={orgId || members?.[0]?.org_id} 
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
              {groupedMembers.global.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#eab308', marginBottom: '1.5rem', borderBottom: '1px solid rgba(234, 179, 8, 0.2)', paddingBottom: '0.5rem' }}>
                    <Crown size={22} /> Dirección Global
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.global.map(m => renderMemberCard(m, 1, 'global'))}
                  </div>
                </div>
              )}

              {groupedMembers.leadership.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fcd34d', marginBottom: '1.5rem', borderBottom: '1px solid rgba(252, 211, 77, 0.2)', paddingBottom: '0.5rem' }}>
                    <Star size={22} /> Roles de Liderazgo (Directores de Área)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.leadership.map(m => renderMemberCard(m, 2, 'leadership'))}
                  </div>
                </div>
              )}

              {groupedMembers.production.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c084fc', marginBottom: '1.5rem', borderBottom: '1px solid rgba(168, 85, 247, 0.2)', paddingBottom: '0.5rem' }}>
                    <MonitorPlay size={22} /> Equipo de Producción y Media
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.production.map(m => renderMemberCard(m, 3, 'production'))}
                  </div>
                </div>
              )}

              {groupedMembers.logistics.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fb923c', marginBottom: '1.5rem', borderBottom: '1px solid rgba(251, 146, 60, 0.2)', paddingBottom: '0.5rem' }}>
                    <ClipboardCheck size={22} /> Equipo de Logística y Staff
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.logistics.map(m => renderMemberCard(m, 3, 'logistics'))}
                  </div>
                </div>
              )}

              {groupedMembers.music.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', marginBottom: '1.5rem', borderBottom: '1px solid rgba(96, 165, 250, 0.2)', paddingBottom: '0.5rem' }}>
                    <Music size={22} /> Instrumentos y Operación (Músicos)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.music.map(m => renderMemberCard(m, 3, 'music'))}
                  </div>
                </div>
              )}
              
              {groupedMembers.unassigned.length > 0 && (
                <div style={{ marginBottom: '3rem', opacity: 0.7 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    <Users size={22} /> Sin Asignación Específica
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.unassigned.map(m => renderMemberCard(m, 3, 'unassigned'))}
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
