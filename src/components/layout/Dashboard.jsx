import React from 'react';
import { Calendar as CalendarIcon, Users, LogOut, Plus, Music, Layout, Crown, ShieldCheck, Home, Upload, Cloud, UserCircle, Building2, AlertTriangle, ArrowRight, UserPlus, Headphones, Bell, Download, Radio, BarChart3 } from 'lucide-react';
import { isTauri } from '../../utils/tauri';
import { isSuperAdmin } from '../../utils/permissions';
import { alertDialog } from '../../utils/dialogService';
import { supabase } from '../../supabaseClient';
import { sendNotification } from '../../utils/notifications';
import SubscriptionModal from '../DAW/SubscriptionModal';
import WelcomeModal from './WelcomeModal';
import GlobalSearch from './GlobalSearch';
import OrgSwitcher from './OrgSwitcher';
import '../DAW/DAW.css';

export default function Dashboard({ profile, children, onLogout, activeTab, setActiveTab, handleJoinTeam, handleCopyLink, songs, events, members }) {
  const [showSubscription, setShowSubscription] = React.useState(false);
  const [showTeamAction, setShowTeamAction] = React.useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showWelcome, setShowWelcome] = React.useState(
    !!profile?.id && !localStorage.getItem(`bandly_welcome_${profile?.id}`)
  );
  const [showNotifications, setShowNotifications] = React.useState(false);

  const [notifications, setNotifications] = React.useState([]);

  React.useEffect(() => {
    if (!profile?.id) return;
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && data) {
        setNotifications(data);
      }
    };
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 15000); // Check every 15s
    return () => clearInterval(intervalId);
  }, [profile?.id]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  const userIsSuperAdmin = isSuperAdmin(profile);
  const userFunctions = profile?.functions || [];
  const canAccessLibrary = profile?.role === 'director' || (userFunctions && userFunctions.some(f => ['musico', 'audio', 'media', 'maestro'].includes(f)));

  return (
    <div className="dashboard-layout">
      <nav className="sidebar">
        <div className="hide-mobile" style={{ marginBottom: '3rem', width: '100%', display: 'flex', justifyContent: 'center', padding: '0 0.5rem' }}>
          <img 
            src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Bandly%20nuevo.png" 
            alt="Bandly Logo" 
            style={{ width: '90px', height: 'auto', filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.15))', objectFit: 'contain' }} 
          />
        </div>
        
        <div className="hide-mobile" style={{ width: '100%' }}>
          <OrgSwitcher currentOrgId={profile?.org_id} onCreateNew={handleJoinTeam} />
        </div>

        <div
          className={`nav-item ${activeTab === 'planner' ? 'active' : ''}`}
          onClick={() => setActiveTab('planner')}
          title="Calendario & Planeación"
        >
          <CalendarIcon size={20} />
          <span className="nav-label">Calendario</span>
        </div>

        {canAccessLibrary && (
          <div
            className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
            title="Biblioteca de Repertorio"
          >
            <Music size={20} />
            <span className="nav-label">Repertorio</span>
          </div>
        )}

        <div
          className={`nav-item ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
          title="Modo En Vivo (control remoto del DAW)"
        >
          <Radio size={20} />
          <span className="nav-label">En Vivo</span>
        </div>

        <div
          className={`nav-item ${activeTab === 'play' ? 'active' : ''}`}
          onClick={() => setActiveTab('play')}
          title="Herramientas / Play en Vivo"
        >
          <Headphones size={20} />
          <span className="nav-label">Play</span>
        </div>

        {canAccessLibrary && (
          <div
            className={`nav-item ${activeTab === 'daw' ? 'active' : ''}`}
            onClick={() => {
              if (isTauri()) {
                const plan = (profile?.organizations?.plan || 'free').toLowerCase();
                if (plan === 'free') {
                  alertDialog("La App de Escritorio (DAW) está incluida desde el plan Starter. Haz upgrade en la versión web para desbloquearla.");
                  return;
                }
              }
              setActiveTab('daw');
            }}
            title="DAW / Multitracks"
          >
            <Cloud size={20} />
            <span className="nav-label">DAW</span>
          </div>
        )}

        <div
          className={`nav-item ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
          title="Gestión de Equipo"
        >
          <Users size={20} />
          <span className="nav-label">Equipo</span>
        </div>

        <div
          className={`nav-item ${activeTab === 'polls' ? 'active' : ''}`}
          onClick={() => setActiveTab('polls')}
          title="Encuestas"
        >
          <BarChart3 size={20} />
          <span className="nav-label">Encuestas</span>
        </div>

        {userIsSuperAdmin && (
          <div
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
            title="Panel de Superadmin"
            style={{ color: '#ef4444' }}
          >
            <ShieldCheck size={20} />
            <span className="nav-label">Admin</span>
          </div>
        )}

        {!isTauri() && (
          <div
            className={`nav-item ${activeTab === 'downloads' ? 'active' : ''}`}
            onClick={() => setActiveTab('downloads')}
            title="Descargar Apps"
          >
            <Download size={20} />
            <span className="nav-label">Descargas</span>
          </div>
        )}

        <div
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          title="Mi Perfil / Disponibilidad"
          style={{ marginTop: 'auto', marginBottom: '10px' }}
        >
          <UserCircle size={20} />
          <span className="nav-label">Perfil</span>
        </div>

        <div
          className="nav-item"
          style={{ marginBottom: '0' }}
          onClick={() => setShowLogoutConfirm(true)}
          title="Cerrar Sesion"
        >
          <LogOut size={18} />
          <span className="nav-label">Salir</span>
        </div>
      </nav>

      {/* ── Logout confirm modal ── */}
      {showTeamAction && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowTeamAction(false)}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(23, 23, 26,0.98), rgba(28, 28, 32,0.98))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px', padding: '2.5rem 2rem', width: '380px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
            animation: 'dropdownFadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(247, 244, 239, 0.06)', border: '1px solid rgba(247, 244, 239, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={28} color="var(--primary)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: '500', color: 'white', letterSpacing: '-0.5px' }}>Gestión de Organización</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Elige si deseas unirte a una organización existente o crear una nueva.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button
                onClick={() => { setShowTeamAction(false); if (handleJoinTeam) handleJoinTeam(); }}
                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '0.9rem', marginBottom: '2px' }}>Unirse con código</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Ingresar a otra organización</div>
                </div>
                <ArrowRight size={16} color="rgba(255,255,255,0.2)" />
              </button>
              
              <button
                onClick={() => { 
                  setShowTeamAction(false); 
                  if (profile?.organizations?.plan === 'pro' || profile?.organizations?.plan === 'elite') {
                    alertDialog("Creación multi-equipo en proceso. Pronto habilitaremos el panel para alternar entre tus equipos.");
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid rgba(247, 244, 239, 0.18)', background: 'rgba(247, 244, 239, 0.03)', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(247, 244, 239, 0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(247, 244, 239, 0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(247, 244, 239, 0.11)', color: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Crown size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '0.9rem', marginBottom: '2px', color: '#e8e5df' }}>Crear nueva</div>
                  <div style={{ fontSize: '0.7rem', color: '#f7f4ef' }}>Requiere plan PRO o superior</div>
                </div>
                <ArrowRight size={16} color="rgba(247, 244, 239, 0.4)" />
              </button>
            </div>
            
            <button onClick={() => setShowTeamAction(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.5rem', fontWeight: '500' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>Cancelar</button>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowUpgradeModal(false)}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(23, 23, 26,0.98), rgba(28, 28, 32,0.98))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px', padding: '2.5rem', width: '400px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem',
            animation: 'dropdownFadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={32} color="#fbbf24" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: '500', color: 'white', letterSpacing: '-0.5px' }}>Plan PRO Requerido</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                Para poder crear y administrar múltiples organizaciones necesitas actualizar tu plan a <strong>PRO</strong> o superior.
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', marginTop: '0.5rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <AlertTriangle size={18} color="#fbbf24" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Con el plan actual solo puedes administrar una (1) organización. Actualiza para desbloquear el modo Multi-Organización.</div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '1rem' }}>
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                Volver
              </button>
              <button
                onClick={() => { setShowUpgradeModal(false); setShowSubscription(true); }}
                style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #fd429c, #ff6a4a)', color: 'white', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.35)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.35)'; }}
              >
                Actualizar Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(23, 23, 26,0.98), rgba(28, 28, 32,0.98))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '2rem', width: '320px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
          }} onClick={e => e.stopPropagation()}>
            {/* Icon */}
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={22} color="#ef4444" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: '500', color: 'white' }}>Cerrar sesion</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                Tu sesion quedara guardada.<br />Puedes volver cuando quieras.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '0.5rem' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.82rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={`main-content${activeTab === 'daw' && isTauri() ? ' is-daw' : ''}`}>
        <header style={{ 
          minHeight: '60px', background: 'rgba(23, 23, 26, 0.2)', 
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', 
          padding: '8px 1rem', gap: '8px'
        }}>

          <div style={{ marginRight: 'auto' }} className="hide-on-tiny">
            <GlobalSearch songs={songs} events={events} members={members} setActiveTab={setActiveTab} />
          </div>

          {profile?.role === 'director' && profile?.organizations?.invite_code && (
            <div 
              onClick={handleCopyLink}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                background: 'rgba(247, 244, 239, 0.06)', border: '1px solid rgba(247, 244, 239, 0.18)',
                padding: '6px 10px', borderRadius: '20px', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="hover-scale hide-on-tiny"
              title="Copiar link mágico para invitar"
            >
              <Users size={14} color="#f7f4ef" />
              <span style={{ fontSize: '0.65rem', fontWeight: '500', color: '#f7f4ef', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                CÓDIGO: {profile.organizations.invite_code}
              </span>
            </div>
          )}

          {profile?.role === 'director' && profile?.organizations && (
            <div className="storage-meter" style={{
              display: 'flex', flexDirection: 'column', gap: '4px',
              padding: '6px 10px', borderRadius: '12px',
              background: 'linear-gradient(to right, rgba(23, 23, 26, 0.6), rgba(28, 28, 32, 0.6))', 
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              minWidth: '120px', maxWidth: '180px', flex: '0 1 auto'
            }} title="Almacenamiento Usado">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)', fontWeight: '500', letterSpacing: '0.5px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Cloud size={9} color="var(--primary)" /> STORAGE
                </span>
                <span style={{ color: 'white', fontFamily: 'var(--font-mono)', fontSize: '0.55rem' }}>
                  {(() => {
                    const used = profile.organizations.storage_used_mb || 0;
                    const limit = profile.organizations.storage_limit_mb || 300;
                    const format = (mb) => mb >= 1000 ? `${(mb/1024).toFixed(1)}GB` : `${Math.round(mb)}MB`;
                    return `${format(used)} / ${format(limit)}`;
                  })()}
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, ((profile.organizations.storage_used_mb || 0) / (profile.organizations.storage_limit_mb || 300)) * 100)}%`, 
                  background: ((profile.organizations.storage_used_mb || 0) / (profile.organizations.storage_limit_mb || 300)) > 0.85 
                    ? 'linear-gradient(90deg, #ef4444, #f87171)' 
                    : 'linear-gradient(90deg, var(--primary), var(--accent))',
                  boxShadow: '0 0 10px rgba(0, 0, 0, 0.35)',
                  transition: 'width 0.5s ease-out'
                }} />
              </div>
            </div>
          )}

          <div 
            onClick={() => {
              if (profile?.role === 'director') {
                setShowTeamAction(true);
              } else {
                if (handleJoinTeam) handleJoinTeam();
              }
            }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '5px', 
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '6px 10px', borderRadius: '20px', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
            title={profile?.role === 'director' ? "Opciones de Equipo" : "Unirse a un equipo"}
          >
            <Plus size={14} color="#fff" />
            <span className="hide-on-tiny" style={{ fontSize: '0.65rem', fontWeight: '500', color: '#fff', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              {profile?.role === 'director' ? 'ORG' : 'UNIRSE'}
            </span>
          </div>

          {/* Icono de Notificaciones (Para todos) */}
          <div
            onClick={() => setShowNotifications(true)}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }}
            className="hover-scale"
            title="Notificaciones"
          >
            <Bell size={16} color="white" />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: '500', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-dark)' }}>
                {unreadCount}
              </span>
            )}
          </div>

          <div 
            onClick={() => setShowSubscription(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '5px', 
              background: 'rgba(247, 244, 239, 0.06)', border: '1px solid rgba(247, 244, 239, 0.18)',
              padding: '6px 10px', borderRadius: '20px', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(247, 244, 239, 0.11)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(247, 244, 239, 0.06)'}
          >
            <Crown size={14} color="#f7f4ef" />
            <span style={{ fontSize: '0.65rem', fontWeight: '500', color: '#f7f4ef', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              {(profile?.organizations?.plan || profile?.plan_id || 'STARTER').toUpperCase()}
            </span>
            {(!profile?.organizations?.plan || profile.organizations.plan === 'free' || profile.organizations.plan === 'starter') && (
              <span className="hide-on-tiny" style={{ fontSize: '0.55rem', background: '#fd429c', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontWeight: '500' }}>
                UP
              </span>
            )}
          </div>
        </header>

        {showSubscription && (
          <SubscriptionModal profile={profile} onClose={() => setShowSubscription(false)} />
        )}

        {showNotifications && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '20px' }} onClick={() => setShowNotifications(false)}>
            <div style={{ background: 'linear-gradient(145deg, rgba(23, 23, 26,0.98), rgba(28, 28, 32,0.98))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', width: '100%', maxWidth: '380px', maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'dropdownFadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '500', color: 'white', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} color="var(--primary)" /> Notificaciones
              </h3>
              
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No tienes notificaciones nuevas.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {notifications.map(req => {
                    const memberName = (members || []).find(m => String(m.id) === String(req.actor_id))?.full_name || 'Alguien';
                    const eventData = req.event_id ? (events || []).find(e => String(e.id) === String(req.event_id)) : null;
                    const eventDate = eventData && eventData.date ? eventData.date.split('T')[0] : '';
                    const isUnread = !req.is_read;

                    const markAsRead = async () => {
                      await supabase.from('notifications').update({ is_read: true }).eq('id', req.id);
                      setNotifications(prev => prev.map(n => n.id === req.id ? { ...n, is_read: true } : n));
                    };

                    return (
                      <div key={req.id} style={{ opacity: isUnread ? 1 : 0.6, background: isUnread ? (req.type === 'decline_request' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)') : 'rgba(255,255,255,0.02)', border: `1px solid ${isUnread ? (req.type === 'decline_request' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)') : 'rgba(255,255,255,0.05)'}`, padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                          <strong>{memberName}</strong>
                          {req.type === 'decline_request' ? ' solicitó declinar:' : req.type === 'confirmation' ? ' confirmó asistencia:' : req.type === 'replaced' ? ' te reemplazó:' : req.type === 'removed' ? ' te eliminó de un evento:' : ' te dejó un mensaje:'}
                        </div>
                        {eventData && <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '500' }}>{eventData.name} ({eventDate})</div>}
                        
                        {req.message && (
                          <div style={{ fontSize: '0.8rem', color: req.type === 'decline_request' ? '#fbbf24' : '#6ee7b7', marginTop: '8px', background: req.type === 'decline_request' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(110, 231, 183, 0.1)', padding: '8px', borderRadius: '12px', fontStyle: 'italic' }}>
                            "{req.message}"
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                          {req.type === 'decline_request' ? (
                            <>
                              <button onClick={async () => {
                                await markAsRead();
                                await supabase.from('event_roster').update({ status: 'declined' }).eq('event_id', req.event_id).eq('profile_id', req.actor_id);
                                await sendNotification({ orgId: profile.org_id, targetProfileIds: [req.actor_id], actorId: profile.id, eventId: req.event_id, type: 'decline_resolved', message: 'Tu declinación fue aceptada. Has sido excusado del evento.' });
                              }} style={{ flex: 1, padding: '8px', fontSize: '0.75rem', fontWeight: '500', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Aceptar (Excusionar)</button>
                              
                              <button onClick={async () => {
                                await markAsRead();
                                await supabase.from('event_roster').delete().eq('event_id', req.event_id).eq('profile_id', req.actor_id);
                                await sendNotification({ orgId: profile.org_id, targetProfileIds: [req.actor_id], actorId: profile.id, eventId: req.event_id, type: 'decline_resolved', message: 'Fuiste removido del evento por el director.' });
                              }} style={{ flex: 1, padding: '8px', fontSize: '0.75rem', fontWeight: '500', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Remover del evento</button>
                              
                              <button onClick={async () => {
                                await markAsRead();
                                await supabase.from('event_roster').update({ status: 'confirmed' }).eq('event_id', req.event_id).eq('profile_id', req.actor_id);
                                await sendNotification({ orgId: profile.org_id, targetProfileIds: [req.actor_id], actorId: profile.id, eventId: req.event_id, type: 'decline_resolved', message: 'Tu excusa fue rechazada. Debes asistir al evento.' });
                              }} style={{ flex: '1 1 45%', padding: '8px', fontSize: '0.75rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer' }}>Rechazar excusa y Confirmar</button>
                              
                              <button onClick={async () => {
                                await markAsRead();
                                await supabase.from('event_roster').update({ status: 'pending' }).eq('event_id', req.event_id).eq('profile_id', req.actor_id);
                                await sendNotification({ orgId: profile.org_id, targetProfileIds: [req.actor_id], actorId: profile.id, eventId: req.event_id, type: 'decline_resolved', message: 'Tu solicitud fue dejada en pendiente por el director. Por favor habla con él.' });
                              }} style={{ flex: '1 1 45%', padding: '8px', fontSize: '0.75rem', fontWeight: '500', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer' }}>Rechazar y dejar Pendiente</button>
                            </>
                          ) : isUnread ? (
                            <button onClick={markAsRead} style={{ width: '100%', padding: '8px', fontSize: '0.75rem', fontWeight: '500', background: '#fd429c', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                              Entendido
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {(() => {
          const replacedBanner = notifications.find(n => n.type === 'replaced' && !n.is_read);
          if (!replacedBanner) return null;
          const dismissBanner = async () => {
            await supabase.from('notifications').update({ is_read: true }).eq('id', replacedBanner.id);
            setNotifications(prev => prev.map(n => n.id === replacedBanner.id ? { ...n, is_read: true } : n));
          };
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(251,191,36,0.1))',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px',
              padding: '0.9rem 1.1rem', margin: '1rem 1rem 0'
            }}>
              <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>
                {replacedBanner.message}
              </div>
              <button
                onClick={dismissBanner}
                style={{ flexShrink: 0, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '0.75rem', fontWeight: '500', padding: '6px 12px', borderRadius: '12px', cursor: 'pointer' }}
              >
                Entendido
              </button>
            </div>
          );
        })()}

        {showWelcome && (
          <WelcomeModal
            profile={profile}
            onClose={() => setShowWelcome(false)}
            onOpenSettings={() => {
              setShowWelcome(false);
              setActiveTab('team');
            }}
            onOpenSubscription={() => {
              setShowWelcome(false);
              setShowSubscription(true);
            }}
          />
        )}

        {children}
      </main>
    </div>
  );
}
