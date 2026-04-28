import React from 'react';
import { Calendar as CalendarIcon, Users, LogOut, Plus, Music, Layout } from 'lucide-react';
import { isTauri } from '../../utils/tauri';

export default function Dashboard({ profile, children, onLogout, activeTab, setActiveTab, handleJoinTeam, handleCopyLink }) {
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
            title="Bandly Mini DAW (Manual Hardware)"
            style={{ color: 'var(--primary)', filter: activeTab === 'daw' ? 'drop-shadow(0 0 8px var(--primary))' : 'none' }}
          >
            <Layout size={26} strokeWidth={2.5} />
          </div>
        )}

        <div 
          className={`nav-item ${activeTab === 'team' ? 'active' : ''}`} 
          onClick={() => setActiveTab('team')}
          title="Gestión de Equipo"
        >
          <Users size={22} />
        </div>

        <div className="nav-item" style={{ marginTop: 'auto', marginBottom: '0' }} onClick={onLogout} title="Cerrar Sesión">
          <LogOut size={20} />
        </div>
      </nav>

      <main className="main-content">

        {children}
      </main>
    </div>
  );
}
