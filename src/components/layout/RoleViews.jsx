import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import EventPlanner from '../EventPlanner';
import SongLibrary from '../SongLibrary';
import TeamList from '../TeamList';
import ProMixer from '../DAW/ProMixer';
import WebUploadStudio from '../DAW/WebUploadStudio';
import { isTauri } from '../../utils/tauri';
import { Calendar, LayoutList, Home, Music, ChevronRight } from 'lucide-react';

import { AVATARS, AvatarPicker } from './AvatarPicker';

const UnifiedDashboardHeader = ({ profile, orgData, setActiveTab }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(profile?.avatar_url);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const { members, songs } = orgData;

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAvatarSelect = async (url) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', profile.id);
      
      if (error) throw error;
      setCurrentAvatar(url);
      setShowPicker(false);
    } catch (e) {
      alert("Error al actualizar avatar.");
    }
  };

  const today = new Date();
  const dayName = today.toLocaleDateString('es-ES', { weekday: 'short' });
  const dayNum = today.getDate();

  return (
    <div style={{ animation: 'dropdownFadeIn 0.5s ease-out', marginBottom: '2rem' }}>
      <AvatarPicker 
        isOpen={showPicker} 
        onClose={() => setShowPicker(false)} 
        onSelect={handleAvatarSelect}
        currentAvatar={currentAvatar}
      />

      {/* Saludo y Botones de Scroll */}
      <div style={{ 
        padding: '2.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', 
        alignItems: 'center', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(15, 23, 42, 0.4) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div 
            onClick={() => setShowPicker(true)}
            onMouseEnter={() => setIsHoveringAvatar(true)}
            onMouseLeave={() => setIsHoveringAvatar(false)}
            style={{ 
              width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem',
              fontWeight: '900', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative', cursor: 'pointer', overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
            }}
            className="hover-scale"
          >
            {currentAvatar ? (
              <img src={currentAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              profile?.full_name?.[0]
            )}
            <div style={{ 
              position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', 
              fontSize: '0.75rem', padding: '10px 4px', textAlign: 'center', fontWeight: 'bold',
              backdropFilter: 'blur(4px)', color: 'white',
              opacity: isHoveringAvatar ? 1 : 0,
              transition: 'all 0.3s ease',
              transform: isHoveringAvatar ? 'translateY(0)' : 'translateY(100%)'
            }}>
              CAMBIAR
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '3rem', margin: 0, fontWeight: '900', letterSpacing: '-2px' }}>Hola, {profile?.full_name?.split(' ')[0]} 👋</h2>
            <p style={{ margin: '5px 0 0', opacity: 0.6, fontSize: '1.2rem' }}>Bienvenido de nuevo a tu centro de control musical.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={() => scrollTo('visual-calendar')}
            style={{ 
              padding: '12px 24px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', 
              alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer'
            }}
            className="hover-scale"
          >
            <Calendar size={18} color="var(--primary)" />
            Calendario
          </button>
          <button 
            onClick={() => scrollTo('upcoming-events')}
            style={{ 
              padding: '12px 24px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', 
              alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer'
            }}
            className="hover-scale"
          >
            <LayoutList size={18} color="var(--primary)" />
            Próximos Eventos
          </button>
        </div>
      </div>

      {/* Widgets Dashboard */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px'
      }}>
        {/* Widget 1: Team */}
        <div onClick={() => setActiveTab('team')} className="glass-panel hover-scale" style={{ padding: '24px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: '900', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Current Team</span>
          <h3 style={{ fontSize: '1.5rem', margin: '10px 0 5px' }}>{profile?.organizations?.name || 'Tu Banda'}</h3>
          <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: '20px' }}>{members.length} Members</p>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {members.slice(0, 3).map((m, i) => (
              <div key={i} style={{ 
                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', 
                marginLeft: i > 0 ? '-10px' : 0, border: '2px solid #0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold',
                overflow: 'hidden'
              }}>
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  m.full_name?.[0]
                )}
              </div>
            ))}
            {members.length > 3 && (
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', 
                marginLeft: '-10px', border: '2px solid #0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.6
              }}>
                +{members.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: Date */}
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{dayName.charAt(0).toUpperCase() + dayName.slice(1)} {dayNum}</h3>
            <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
              {[dayNum, dayNum+1, dayNum+2, dayNum+3].map(d => (
                <div key={d} style={{ textAlign: 'center', opacity: d === dayNum ? 1 : 0.4 }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
                    {new Date(today.getFullYear(), today.getMonth(), d).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '900', marginTop: '4px' }}>{d}</div>
                  {d === dayNum && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444', margin: '4px auto' }} />}
                </div>
              ))}
            </div>
          </div>
          <Calendar color="var(--primary)" size={24} style={{ opacity: 0.5 }} />
        </div>

        {/* Widget 3: Songs */}
        <div onClick={() => setActiveTab('library')} className="glass-panel hover-scale" style={{ padding: '24px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
            <Music size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Saved Songs</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '900' }}>{songs.length}</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function DirectorView({ profile, session, activeTab, setActiveTab, orgData }) {
  const { members, events, songs, fetchData } = orgData;
  return (
    <div className="dashboard-grid" style={{ display: 'block' }}>
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <UnifiedDashboardHeader profile={profile} orgData={orgData} setActiveTab={setActiveTab} />
          <EventPlanner readOnly={false} events={events} members={members} orgId={profile.org_id} refreshData={fetchData} songs={songs} profile={profile} session={session} />
        </div>
      )}
      {activeTab === 'library' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <SongLibrary songs={songs} orgId={profile.org_id} readOnly={false} refreshData={fetchData} session={session} profile={profile} setActiveTab={setActiveTab} />
        </div>
      )}
      {activeTab === 'team' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TeamList members={members} isDirector={true} refreshData={fetchData} />
        </div>
      )}
      {activeTab === 'daw' && (
        isTauri()
          ? <ProMixer songs={songs} session={session} profile={profile} />
          : <WebUploadStudio songs={songs} orgId={profile.org_id} session={session} profile={profile} refreshData={fetchData} />
      )}

    </div>
  );
}

export function MemberView({ profile, session, activeTab, setActiveTab, orgData }) {
  const { members, events, songs, fetchData } = orgData;
  const userFunctions = profile.functions || [];
  const canAccessLibrary = userFunctions.some(f => ['musico', 'audio', 'media'].includes(f));

  return (
    <div className="dashboard-grid" style={{ display: 'block' }}>
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <UnifiedDashboardHeader profile={profile} orgData={orgData} setActiveTab={setActiveTab} />
          <EventPlanner readOnly={true} events={events} members={members} orgId={profile.org_id} refreshData={fetchData} songs={songs} profile={profile} session={session} />
        </div>
      )}
      {activeTab === 'library' && canAccessLibrary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <SongLibrary songs={songs} orgId={profile.org_id} readOnly={false} refreshData={fetchData} session={session} profile={profile} setActiveTab={setActiveTab} />
        </div>
      )}
      {activeTab === 'team' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TeamList members={members} isDirector={false} refreshData={fetchData} />
        </div>
      )}
      {activeTab === 'daw' && canAccessLibrary && (
        isTauri()
          ? <ProMixer songs={songs} session={session} profile={profile} />
          : <WebUploadStudio songs={songs} orgId={profile.org_id} session={session} profile={profile} refreshData={fetchData} />
      )}

    </div>
  );
}
