import React, { useState, useMemo } from 'react';
import { Users, Shield, CheckCircle2, Trash2, Crown, Star, MonitorPlay, ClipboardCheck, Music, Headphones } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AvatarPicker } from './layout/AvatarPicker';
import OrgSettingsModal from './OrgSettingsModal';
import { Settings } from 'lucide-react';
import { alertDialog, confirmDialog } from '../utils/dialogService';
import FirstUseTip from './FirstUseTip';
import { DEFAULT_DEPARTMENTS } from '../utils/defaultRoles';

export default function TeamList({ members, isDirector, refreshData, orgSettings, orgId }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [filterBlocked, setFilterBlocked] = useState(false);
  
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
    } catch {
      alertDialog("Error al actualizar avatar del miembro.");
    }
  };

  const handleDeleteMember = async (member) => {
    if (!isDirector) {
      alertDialog("No tienes permisos de director para esta acción.");
      return;
    }
    if (member.role === 'director' && members.filter(m => m.role === 'director').length === 1) {
      alertDialog("No puedes eliminar al único director de la organización.");
      return;
    }

    const confirmed = await confirmDialog({ message: `¿Estás seguro de que quieres eliminar a ${member.full_name} de la organización?`, danger: true });
    if (!confirmed) return;

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
      alertDialog("Error al eliminar miembro: " + e.message);
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
      alertDialog("Error al actualizar funciones: " + e.message);
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
    } catch {
      alertDialog("Error al actualizar rol de director.");
    }
  };

  const departments = useMemo(() => orgSettings?.departments || DEFAULT_DEPARTMENTS, [orgSettings]);

  // 2. Agrupación Jerárquica Dinámica
  const groupedMembers = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let activeMembers = (members || []).map(m => ({
      ...m,
      blocked_dates: (m.blocked_dates || []).filter(d => d >= todayStr),
    }));
    
    if (filterBlocked) {
      activeMembers = activeMembers.filter(m => m.blocked_dates && m.blocked_dates.length > 0);
    }
    
    if (!activeMembers || activeMembers.length === 0) return { global: [], dynamic: [], unassigned: [] };
    
    const global = activeMembers.filter(m => m.role === 'director');
    let remaining = activeMembers.filter(m => m.role !== 'director');

    const dynamic = departments.map(dept => {
      const deptIds = new Set(dept.roles.map(r => r.id));
      const inDept = remaining.filter(m => (m.functions || []).some(f => deptIds.has(f)));
      remaining = remaining.filter(m => !(m.functions || []).some(f => deptIds.has(f)));
      return { ...dept, members: inDept };
    });

    const unassigned = remaining;

    return { global, dynamic, unassigned };
  }, [members, filterBlocked, departments]);

  const renderMemberCard = (m, level, categoryName, badgeLabel, colorClass) => {
    const mFunctions = m.functions || [];
    const isUserDirector = m.role === 'director';
    
    let cardStyle = {};
    let avatarStyle = { border: '1px solid rgba(255,255,255,0.1)' };
    let badge = null;

    let accentHex = '#3b82f6';
    let rgbAccent = '59, 130, 246';
    
    if (colorClass === 'purple') { accentHex = '#c084fc'; rgbAccent = '168, 85, 247'; }
    else if (colorClass === 'yellow') { accentHex = '#eab308'; rgbAccent = '234, 179, 8'; }
    else if (colorClass === 'orange') { accentHex = '#fb923c'; rgbAccent = '249, 115, 22'; }
    else if (colorClass === 'green') { accentHex = '#4ade80'; rgbAccent = '34, 197, 94'; }
    else if (colorClass === 'red') { accentHex = '#f87171'; rgbAccent = '239, 68, 68'; }

    if (level === 1) {
      cardStyle = { border: '1px solid rgba(234, 179, 8, 0.4)', background: 'linear-gradient(145deg, rgba(234, 179, 8, 0.05) 0%, rgba(0,0,0,0.4) 100%)' };
      avatarStyle = { border: '2px solid rgba(234, 179, 8, 0.8)', boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)' };
      badge = <span className="director-badge" style={{ fontSize: '0.6rem', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}>DIRECTOR GLOBAL</span>;
    } else {
      cardStyle = { border: `1px solid rgba(${rgbAccent}, 0.4)`, background: `linear-gradient(145deg, rgba(${rgbAccent}, 0.05) 0%, rgba(0,0,0,0.4) 100%)` };
      avatarStyle = { border: `2px solid rgba(${rgbAccent}, 0.6)`, boxShadow: `0 0 20px rgba(${rgbAccent}, 0.2)` };
      badge = <span className="director-badge" style={{ fontSize: '0.6rem', background: `rgba(${rgbAccent}, 0.2)`, color: accentHex }}>{badgeLabel.toUpperCase()}</span>;
    }

    const renderRoleSection = (title, list, colClass) => {
      const hasAnyRole = list.some(r => mFunctions.includes(r.id));
      if (!isDirector && !hasAnyRole) return null;

      let aColor = '#3b82f6';
      let bgActive = 'rgba(59, 130, 246, 0.15)';
      if (colClass === 'yellow') { aColor = '#eab308'; bgActive = 'rgba(234, 179, 8, 0.15)'; }
      else if (colClass === 'purple') { aColor = '#a855f7'; bgActive = 'rgba(168, 85, 247, 0.15)'; }
      else if (colClass === 'orange') { aColor = '#f97316'; bgActive = 'rgba(249, 115, 22, 0.15)'; }
      else if (colClass === 'green') { aColor = '#22c55e'; bgActive = 'rgba(34, 197, 94, 0.15)'; }
      else if (colClass === 'red') { aColor = '#ef4444'; bgActive = 'rgba(239, 68, 68, 0.15)'; }

      return (
        <div key={title} className="role-selector-section" style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="section-mini-label" style={{ color: aColor }}>{title}</span>
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
                      border: isActive ? `1px solid ${aColor}80` : '1px solid rgba(255,255,255,0.05)',
                      opacity: isActive ? 1 : 0.6
                    }}
                  >
                    <span className="chip-icon">{func.icon}</span>
                    {func.label}
                    {isActive && <CheckCircle2 size={12} className="check-icon" style={{ color: aColor }} />}
                  </button>
                )
              })
            ) : (
              <div className="role-display-row">
                {list.filter(f => mFunctions.includes(f.id)).map(f => (
                  <span key={f.id} className="static-role-chip" style={{ border: `1px solid ${aColor}40`, color: '#fff' }}>
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
            {!isUserDirector && level === 2 && <div className="director-shield" style={{ zIndex: 10, background: accentHex }}><Star size={12} color="white" /></div>}
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
            {isDirector && m.blocked_dates && m.blocked_dates.length > 0 && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ opacity: 0.8 }}>🚫 Bloqueos:</span> 
                <span style={{ fontWeight: '600' }}>{m.blocked_dates.map(d => {
                  const parts = d.split('-');
                  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
                }).join(', ')}</span>
              </div>
            )}
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
          {departments.map(dept => renderRoleSection(`${dept.icon} ${dept.title}`, dept.roles, dept.colorClass))}
        </div>
      </div>
    );
  };

  return (
    <section>
      <div className="library-intro" style={{ marginBottom: '3rem', marginTop: '1rem' }}>
        <h2 className="hero-main-title-large" style={{ fontSize: '3rem', textAlign: 'left', marginBottom: '1.5rem' }}>
          Tu Equipo. <span className="serif-accent">Sincronizado.</span>
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <Users size={28} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Roles y Departamentos</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Organiza a tu equipo asignando múltiples funciones. Los miembros aparecerán agrupados automáticamente bajo el <span style={{ color: 'white' }}>departamento</span> correspondiente a su rol más alto.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <Settings size={28} color="var(--accent)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Administración Global</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Solo los <span style={{ color: 'white' }}>directores</span> pueden reconfigurar departamentos, ajustar permisos o filtrar por disponibilidad de fechas de los músicos.
            </p>
            {isDirector && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button 
                  onClick={() => setShowSettingsModal(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, padding: '10px', background: 'var(--primary)', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                  className="hover-scale"
                >
                  <Settings size={16} /> Configurar Departamentos
                </button>
                <button 
                  onClick={() => setFilterBlocked(!filterBlocked)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, padding: '10px', background: filterBlocked ? '#ef4444' : 'rgba(239, 68, 68, 0.1)', color: filterBlocked ? 'white' : '#ef4444', borderRadius: '12px', border: filterBlocked ? 'none' : '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                  className="hover-scale"
                >
                  🚫 {filterBlocked ? 'Mostrando bloqueados' : 'Filtrar bloqueados'}
                </button>
              </div>
            )}
          </div>
        </div>
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

        <FirstUseTip
          storageKey="bandly_tip_team"
          title="Cómo usar el equipo"
          accentColor="#60a5fa"
          items={isDirector ? [
            'Un miembro puede tener varias funciones a la vez (ej. Batería + Sonido) — aparece agrupado bajo la de mayor jerarquía.',
            'Configura tus propios departamentos e instrumentos en "Configurar Departamentos" para que coincidan con tu organización.',
            'Usa "Filtrar bloqueados" antes de armar un evento para ver quién no está disponible esa fecha.'
          ] : [
            'Toca tu avatar para cambiarlo, y desde tu perfil puedes marcar tus propias fechas bloqueadas.',
            'Tus funciones asignadas definen en qué grupo del equipo apareces.',
            'Si tu rol o instrumento no está listado, pídele a tu director que lo agregue en Configurar Departamentos.'
          ]}
        />

        <div className="member-list-container">
          {(!members || members.length === 0) ? (
            <p className="empty-msg">Manda el código de acceso a tu organización para empezar a sumar talentos.</p>
          ) : filterBlocked && Object.values(groupedMembers).every(g => g.length === 0) ? (
            <p className="empty-msg" style={{ opacity: 0.7 }}>Ningún miembro tiene fechas bloqueadas actualmente.</p>
          ) : (
            <>
              {groupedMembers.global.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#eab308', marginBottom: '1.5rem', borderBottom: '1px solid rgba(234, 179, 8, 0.2)', paddingBottom: '0.5rem' }}>
                    <Crown size={22} /> Dirección Global
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.global.map(m => renderMemberCard(m, 1, 'global', 'DIRECTOR GLOBAL', 'yellow'))}
                  </div>
                </div>
              )}

              {groupedMembers.dynamic.map((dept, idx) => {
                if (dept.members.length === 0) return null;
                let hColor = '#3b82f6';
                let borderColor = 'rgba(59, 130, 246, 0.2)';
                if (dept.colorClass === 'yellow') { hColor = '#fcd34d'; borderColor = 'rgba(252, 211, 77, 0.2)'; }
                if (dept.colorClass === 'purple') { hColor = '#c084fc'; borderColor = 'rgba(168, 85, 247, 0.2)'; }
                if (dept.colorClass === 'orange') { hColor = '#fb923c'; borderColor = 'rgba(251, 146, 60, 0.2)'; }
                if (dept.colorClass === 'green') { hColor = '#4ade80'; borderColor = 'rgba(74, 222, 128, 0.2)'; }
                if (dept.colorClass === 'red') { hColor = '#f87171'; borderColor = 'rgba(248, 113, 113, 0.2)'; }

                return (
                  <div key={dept.id} style={{ marginBottom: '3rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: hColor, marginBottom: '1.5rem', borderBottom: `1px solid ${borderColor}`, paddingBottom: '0.5rem' }}>
                      <span>{dept.icon}</span> {dept.title}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {dept.members.map(m => renderMemberCard(m, 2 + idx, dept.id, dept.title, dept.colorClass))}
                    </div>
                  </div>
                );
              })}
              
              {groupedMembers.unassigned.length > 0 && (
                <div style={{ marginBottom: '3rem', opacity: 0.7 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    <Users size={22} /> Sin Asignación Específica
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedMembers.unassigned.map(m => renderMemberCard(m, 99, 'unassigned', 'Sin Rol', 'blue'))}
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
