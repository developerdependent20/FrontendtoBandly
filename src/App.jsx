import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

// Pages
import LandingPage from './pages/LandingPage';
import AuthScreen from './pages/AuthScreen';
import OnboardingScreen from './pages/OnboardingScreen';

// Components & Layout
import LoadingScreen from './components/LoadingScreen';
import TermsModal from './components/TermsModal';
import Dashboard from './components/layout/Dashboard';
import { DirectorView, StaffView, MusicianView } from './components/layout/RoleViews';

// Hooks
import { useOrgData } from './hooks/useOrgData';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('bandly_active_tab') || 'planner');
  const [view, setView] = useState(() => localStorage.getItem('bandly_view') || 'landing');
  const [showLegalBlocking, setShowLegalBlocking] = useState(false);

  // Org Data Hook
  const orgData = useOrgData(profile);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('bandly_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('bandly_view', view);
  }, [view]);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations(*)')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; 
      setProfile(data || null);
      if (data && !data.accepted_terms) {
        setShowLegalBlocking(true);
      }
    } catch (e) {
      console.error(e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?join=${profile.organizations?.invite_code}`;
    navigator.clipboard.writeText(link);
    alert('¡Link mágico copiado! Envíaselo a los de tu banda.');
  };

  const handleJoinTeam = async () => {
    const code = prompt("Pega el CÓDIGO o LINK MÁGICO de la banda a la que te quieres unir (Ej. BANDA24):");
    if (!code) return;
    try {
      const cleanCode = code.includes('?join=') ? code.split('?join=')[1] : code;
      const { data: org, error: orgError } = await supabase.from('organizations').select('id').eq('invite_code', cleanCode.toUpperCase()).single();
      if (orgError || !org) throw new Error('Código no encontrado. Asegúrate de escribirlo bien.');
      
      const { error: updateErr } = await supabase.from('profiles').update({ org_id: org.id }).eq('id', profile.id);
      if (updateErr) throw updateErr;
      
      alert("¡Te has unido al equipo exitosamente!");
      window.location.reload();
    } catch(e) {
      alert(e.message);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      const { error } = await supabase.from('profiles').update({ accepted_terms: true }).eq('id', profile.id);
      if (error) throw error;
      setProfile({ ...profile, accepted_terms: true });
      setShowLegalBlocking(false);
    } catch (e) {
      alert("Error al guardar aceptación legal.");
    }
  };

  if (loading) return <LoadingScreen />;

  if (!session) {
    if (view === 'landing' || typeof view === 'string' && view.startsWith('landing')) {
      return <LandingPage onGetStarted={(mode) => setView(mode === 'login' ? 'auth_login' : 'auth_signup')} />;
    }
    return <AuthScreen initialMode={view === 'auth_signup' ? 'signup' : 'login'} onBack={() => setView('landing')} />;
  }

  if (!profile) return <OnboardingScreen session={session} fetchProfile={fetchProfile} />;

  return (
    <>
      {showLegalBlocking && (
        <TermsModal 
          isOpen={true} 
          onClose={handleAcceptTerms} 
          onDecline={handleLogout} 
        />
      )}
      <Dashboard 
        profile={profile} 
        session={session} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        handleCopyLink={handleCopyLink}
        handleJoinTeam={handleJoinTeam}
      >
        {profile.role === 'director' && <DirectorView profile={profile} session={session} activeTab={activeTab} orgData={orgData} />}
        {profile.role === 'staff' && <StaffView profile={profile} session={session} activeTab={activeTab} orgData={orgData} />}
        {profile.role === 'musico' && <MusicianView profile={profile} session={session} activeTab={activeTab} orgData={orgData} />}
      </Dashboard>
    </>
  );
}
