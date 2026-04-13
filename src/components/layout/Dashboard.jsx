import React from 'react';
import { Calendar as CalendarIcon, Users, LogOut, Plus, Music } from 'lucide-react';

export default function Dashboard({ profile, children, onLogout, activeTab, setActiveTab, handleJoinTeam, handleCopyLink }) {
  return (
    <div className="dashboard-layout">
      <nav className="sidebar">
        <div style={{ marginBottom: '3rem', width: '100%', display: 'flex', justifyContent: 'center', padding: '0 0.5rem' }}>
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

        <div 
          className={`nav-item ${activeTab === 'library' ? 'active' : ''}`} 
          onClick={() => setActiveTab('library')}
          title="Biblioteca de Repertorio"
        >
          <Music size={22} />
        </div>

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
        <header className="dashboard-header">
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.2rem', display: 'block' }}>
              {profile.role === 'director' ? 'Modo Director' : profile.role === 'staff' ? 'Modo Staff' : 'Panel Músico'}
            </span>
            <h1 className="hero-main-title-large" style={{ margin: 0, textAlign: 'left', background: 'none', color: 'white', WebkitTextFillColor: 'initial', letterSpacing: '-1px' }}>
              {profile.full_name}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              Banda: <strong style={{ color: 'var(--text-main)' }}>{profile.organizations?.name || '---'}</strong>
            </p>
          </div>
          
          <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div 
              className="badge" 
              onClick={handleJoinTeam} 
              style={{ cursor: 'pointer' }}
            >
              <Plus size={14} /> <span>Cambiar Banda</span>
            </div>

            {profile.role === 'director' && (
              <div 
                className="badge" 
                onClick={handleCopyLink} 
                style={{ cursor: 'pointer', border: '1px solid var(--primary)', background: 'rgba(139, 92, 246, 0.1)' }}
              >
                <code style={{ color: 'white', fontWeight: '800' }}>{profile.organizations?.invite_code}</code>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.75rem' }}>COPIAR</span>
              </div>
            )}
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export function DirectorView({ activeTab, plannerProps, libraryProps, teamProps }) {
  const EventPlanner = require('../EventPlanner').default;
  const SongLibrary = require('../SongLibrary').default;
  const TeamList = require('../TeamList').default;

  return (
    <div className="dashboard-grid" style={{ display: 'block' }}>
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <EventPlanner {...plannerProps} />
          <SongLibrary {...libraryProps} />
        </div>
      )}
      {activeTab === 'team' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TeamList {...teamProps} />
        </div>
      )}
    </div>
  );
}
// Note: I'll actually pass components as children or props to avoid the synchronous require issue in ESM.
