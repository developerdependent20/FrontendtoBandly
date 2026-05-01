import React from 'react';
import { Calendar as CalendarIcon, Users, LogOut, Plus, Music, Layout, Crown, ShieldCheck, Home, Upload } from 'lucide-react';
import { isTauri } from '../../utils/tauri';
import SubscriptionModal from '../DAW/SubscriptionModal';
import '../DAW/DAW.css';

export default function Dashboard({ profile, children, onLogout, activeTab, setActiveTab, handleJoinTeam, handleCopyLink }) {
  const [showSubscription, setShowSubscription] = React.useState(false);
  const isSuperAdmin = profile?.email === 'dependent.mix@gmail.com';
  const userFunctions = profile?.functions || [];
  const canAccessLibrary = profile?.role === 'director' || (userFunctions && userFunctions.some(f => ['musico', 'audio', 'media', 'maestro'].includes(f)));
  // Ahora todos pueden ver el Planner, pero se validará lectura/escritura adentro
  const canAccessPlanner = true;
  const canAccessTeam = profile?.role === 'director' || (userFunctions && userFunctions.includes('admin'));

  return (
    <div className="dashboard-layout">
      <nav className="sidebar">
        <div className="hide-mobile" style={{ marginBottom: '3rem', width: '100%', display: 'flex', justifyContent: 'center', padding: '0 0.5rem' }}>
          <img 
            src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Logotipo%20sin%20Fondo.png" 
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

        {canAccessLibrary && (
          <div 
            className={`nav-item ${activeTab === 'daw' ? 'active' : ''}`} 
            onClick={() => setActiveTab('daw')}
            title={isTauri() ? 'Bandly DAW' : 'Subir Secuencias'}
            style={{ color: 'var(--primary)', filter: activeTab === 'daw' ? 'drop-shadow(0 0 8px var(--primary))' : 'none' }}
          >
            {isTauri() ? <Layout size={26} strokeWidth={2.5} /> : <Upload size={22} />}
          </div>
        )}

        <div 
          className={`nav-item ${activeTab === 'team' ? 'active' : ''}`} 
          onClick={() => setActiveTab('team')}
          title="Gestión de Equipo"
        >
          <Users size={22} />
        </div>

        {isSuperAdmin && (
          <div 
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`} 
            onClick={() => setActiveTab('admin')}
            title="Panel de Superadmin"
            style={{ color: '#ef4444' }}
          >
            <ShieldCheck size={22} />
          </div>
        )}

        <div className="nav-item" style={{ marginTop: 'auto', marginBottom: '0' }} onClick={onLogout} title="Cerrar Sesión">
          <LogOut size={20} />
        </div>
      </nav>

      <main className="main-content">
        <header style={{ 
          height: '60px', background: 'rgba(15, 23, 42, 0.2)', 
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', 
          padding: '0 2rem', backdropFilter: 'blur(10px)', gap: '12px'
        }}>

          {profile?.role === 'director' && profile?.organizations?.invite_code && (
            <div 
              onClick={handleCopyLink}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="hover-scale"
              title="Copiar link mágico para invitar"
            >
              <Users size={14} color="#3b82f6" />
              <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#3b82f6', letterSpacing: '1px' }}>
                CÓDIGO: {profile.organizations.invite_code}
              </span>
            </div>
          )}

          <div 
            onClick={() => {
              const option = window.prompt("Escribe '1' para unirte a otra banda con un código, o '2' para registrar una nueva banda (solo planes PRO):");
              if (option === '1') {
                if (handleJoinTeam) handleJoinTeam();
              } else if (option === '2') {
                if (profile?.organizations?.plan === 'pro' || profile?.organizations?.plan === 'premium') {
                  window.alert("Creación multi-banda en proceso. Pronto habilitaremos el panel para alternar entre tus bandas.");
                } else {
                  window.alert("Necesitas un plan PRO o superior para administrar múltiples bandas.");
                  setShowSubscription(true);
                }
              }
            }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
            title="Opciones de Banda"
          >
            <Plus size={14} color="#fff" />
            <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#fff', letterSpacing: '1px' }}>
              BANDA
            </span>
          </div>

          <div 
            onClick={() => setShowSubscription(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)',
              padding: '6px 16px', borderRadius: '20px', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)'}
          >
            <Crown size={14} color="#a855f7" />
            <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#a855f7', letterSpacing: '1px' }}>
              {(profile?.organizations?.plan || profile?.plan_id || 'STARTER').toUpperCase()}
            </span>
            {(!profile?.organizations?.plan || profile.organizations.plan === 'free' || profile.organizations.plan === 'starter') && (
              <span style={{ fontSize: '0.6rem', background: '#a855f7', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginLeft: '6px' }}>
                UPGRADE
              </span>
            )}
          </div>
        </header>

        {showSubscription && (
          <SubscriptionModal profile={profile} onClose={() => setShowSubscription(false)} />
        )}

        {children}
      </main>
    </div>
  );
}
