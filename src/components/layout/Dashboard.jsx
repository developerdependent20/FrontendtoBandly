import React from 'react';
import { Calendar as CalendarIcon, Users, LogOut, Plus, Music, Layout, Crown, ShieldCheck, Home, Upload, Cloud, UserCircle, Building2, AlertTriangle, ArrowRight, UserPlus, Headphones, Bell, Download } from 'lucide-react';
import { isTauri } from '../../utils/tauri';
import { isSuperAdmin } from '../../utils/permissions';
import { alertDialog } from '../../utils/dialogService';
import SubscriptionModal from '../DAW/SubscriptionModal';
import WelcomeModal from './WelcomeModal';
import GlobalSearch from './GlobalSearch';
import '../DAW/DAW.css';

export default function Dashboard({ profile, children, onLogout, activeTab, setActiveTab, handleJoinTeam, handleCopyLink, songs, events, members }) {
  const [showSubscription, setShowSubscription] = React.useState(false);
  const [showTeamAction, setShowTeamAction] = React.useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showWelcome, setShowWelcome] = React.useState(
    !!profile?.id && !localStorage.getItem(`bandly_welcome_${profile?.id}`)
  );
  
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
        
        <div 
          className={`nav-item ${activeTab === 'planner' ? 'active' : ''}`} 
          onClick={() => setActiveTab('planner')}
          title="Calendario & Planeación"
        >
          <CalendarIcon size={22} />
        </div>

        {canAccessLibrary && (
          <div 
            className={`nav-item ${activeTab === 'library' ? 'active' : ''}`} 
            onClick={() => setActiveTab('library')}
            title="Biblioteca de Repertorio"
          >
            <Music size={22} />
          </div>
        )}

        <div 
          className={`nav-item ${activeTab === 'play' ? 'active' : ''}`} 
          onClick={() => setActiveTab('play')}
          title="Herramientas / Play en Vivo"
        >
          <Headphones size={22} />
        </div>

        {canAccessLibrary && (
          <div 
            className={`nav-item ${activeTab === 'daw' ? 'active' : ''}`} 
            onClick={() => {
              if (isTauri()) {
                const plan = (profile?.organizations?.plan || 'free').toLowerCase();
                if (plan === 'free' || plan === 'starter') {
                  alertDialog("La App de Escritorio (DAW) es una herramienta profesional exclusiva para planes Pro y Elite. Haz upgrade en la versión web para desbloquearla.");
                  return;
                }
              }
              setActiveTab('daw');
            }}
            title="DAW / Multitracks"
          >
            <Cloud size={22} />
          </div>
        )}

        <div 
          className={`nav-item ${activeTab === 'team' ? 'active' : ''}`} 
          onClick={() => setActiveTab('team')}
          title="Gestión de Equipo"
        >
          <Users size={22} />
        </div>

        {userIsSuperAdmin && (
          <div 
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`} 
            onClick={() => setActiveTab('admin')}
            title="Panel de Superadmin"
            style={{ color: '#ef4444' }}
          >
            <ShieldCheck size={22} />
          </div>
        )}

        {!isTauri() && (
          <div 
            className={`nav-item ${activeTab === 'downloads' ? 'active' : ''}`} 
            onClick={() => setActiveTab('downloads')}
            title="Descargar Apps"
          >
            <Download size={22} />
          </div>
        )}

        <div 
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} 
          onClick={() => setActiveTab('profile')}
          title="Mi Perfil / Disponibilidad"
          style={{ marginTop: 'auto', marginBottom: '10px' }}
        >
          <UserCircle size={22} />
        </div>

        <div
          className="nav-item"
          style={{ marginBottom: '0' }}
          onClick={() => setShowLogoutConfirm(true)}
          title="Cerrar Sesion"
        >
          <LogOut size={20} />
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
            background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px', padding: '2.5rem 2rem', width: '380px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
            animation: 'dropdownFadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={28} color="var(--primary)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' }}>Gestión de Organización</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Elige si deseas unirte a una organización existente o crear una nueva.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button
                onClick={() => { setShowTeamAction(false); if (handleJoinTeam) handleJoinTeam(); }}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '2px' }}>Unirse con código</div>
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
                style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid rgba(37, 99, 235,0.3)', background: 'rgba(37, 99, 235,0.05)', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37, 99, 235,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37, 99, 235,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37, 99, 235,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Crown size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '2px', color: '#e2e8f0' }}>Crear nueva</div>
                  <div style={{ fontSize: '0.7rem', color: '#a78bfa' }}>Requiere plan PRO o superior</div>
                </div>
                <ArrowRight size={16} color="rgba(37, 99, 235,0.4)" />
              </button>
            </div>
            
            <button onClick={() => setShowTeamAction(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.5rem', fontWeight: '600' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>Cancelar</button>
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
            background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
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
              <h3 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' }}>Plan PRO Requerido</h3>
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
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                Volver
              </button>
              <button
                onClick={() => { setShowUpgradeModal(false); setShowSubscription(true); }}
                style={{ flex: 1.5, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg, #2563eb, #d946ef)', color: 'white', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 4px 15px rgba(37, 99, 235,0.3)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235,0.3)'; }}
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
            background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
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
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: '800', color: 'white' }}>Cerrar sesion</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                Tu sesion quedara guardada.<br />Puedes volver cuando quieras.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '0.5rem' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        <header style={{ 
          minHeight: '60px', background: 'rgba(15, 23, 42, 0.2)', 
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
                background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '6px 10px', borderRadius: '20px', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="hover-scale hide-on-tiny"
              title="Copiar link mágico para invitar"
            >
              <Users size={14} color="#3b82f6" />
              <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#3b82f6', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                CÓDIGO: {profile.organizations.invite_code}
              </span>
            </div>
          )}

          {profile?.role === 'director' && profile?.organizations && (
            <div className="storage-meter" style={{
              display: 'flex', flexDirection: 'column', gap: '4px',
              padding: '6px 10px', borderRadius: '12px',
              background: 'linear-gradient(to right, rgba(15, 23, 42, 0.6), rgba(30, 41, 59, 0.6))', 
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              minWidth: '120px', maxWidth: '180px', flex: '0 1 auto'
            }} title="Almacenamiento Usado">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)', fontWeight: '800', letterSpacing: '0.5px' }}>
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
              <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, ((profile.organizations.storage_used_mb || 0) / (profile.organizations.storage_limit_mb || 300)) * 100)}%`, 
                  background: ((profile.organizations.storage_used_mb || 0) / (profile.organizations.storage_limit_mb || 300)) > 0.85 
                    ? 'linear-gradient(90deg, #ef4444, #f87171)' 
                    : 'linear-gradient(90deg, var(--primary), var(--accent))',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
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
            <span className="hide-on-tiny" style={{ fontSize: '0.65rem', fontWeight: '900', color: '#fff', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              {profile?.role === 'director' ? 'ORG' : 'UNIRSE'}
            </span>
          </div>

          <div 
            onClick={() => setShowSubscription(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '5px', 
              background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)',
              padding: '6px 10px', borderRadius: '20px', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)'}
          >
            <Crown size={14} color="#a855f7" />
            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#a855f7', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              {(profile?.organizations?.plan || profile?.plan_id || 'STARTER').toUpperCase()}
            </span>
            {(!profile?.organizations?.plan || profile.organizations.plan === 'free' || profile.organizations.plan === 'starter') && (
              <span className="hide-on-tiny" style={{ fontSize: '0.55rem', background: '#a855f7', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '900' }}>
                UP
              </span>
            )}
          </div>
        </header>

        {showSubscription && (
          <SubscriptionModal profile={profile} onClose={() => setShowSubscription(false)} />
        )}

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
