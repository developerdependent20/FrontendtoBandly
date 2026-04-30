import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

// Pages
import LandingPage from './pages/LandingPage';
import AuthScreen from './pages/AuthScreen';
import OnboardingScreen from './pages/OnboardingScreen';
import ResetPassword from './pages/ResetPassword';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';

// Components & Layout
import LoadingScreen from './components/LoadingScreen';
import TermsModal from './components/TermsModal';
import Dashboard from './components/layout/Dashboard';
import AdminPanel from './components/layout/AdminPanel';
import { DirectorView, MemberView } from './components/layout/RoleViews';

// Hooks
import { useOrgData } from './hooks/useOrgData';

/**
 * App - Versión de Estabilidad Garantizada
 * Hemos restaurado la estructura base para asegurar la visibilidad total.
 */
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('bandly_active_tab') || 'planner');
  const [view, setView] = useState(() => localStorage.getItem('bandly_view') || 'landing');
  const [showLegalBlocking, setShowLegalBlocking] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  // Org Data Hook
  const { members, events, songs, fetchData } = useOrgData(profile);
  const orgData = React.useMemo(() => ({ members, events, songs, fetchData }), [members, events, songs, fetchData]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Si el hash de la URL contiene type=recovery, estamos en flujo de recuperación
      if (window.location.hash.includes('type=recovery')) {
        setIsRecovering(true);
        setLoading(false);
      } else if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
        setLoading(false);
      } else if (session) {
        fetchProfile(session.user.id);
      } else {
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

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/terminos') setView('legal_terms');
    if (path === '/privacidad') setView('legal_privacy');
    
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p === '/terminos') setView('legal_terms');
      else if (p === '/privacidad') setView('legal_privacy');
      else if (p === '/') setView('landing');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
  
  if (view === 'legal_terms') return <TermsPage onBack={() => { window.history.pushState({}, '', '/'); setView('landing'); }} />;
  if (view === 'legal_privacy') return <PrivacyPage onBack={() => { window.history.pushState({}, '', '/'); setView('landing'); }} />;

  // Prioridad: Si estamos recuperando contraseña, mostrar esa pantalla
  if (isRecovering) {
    return <ResetPassword onFinish={() => {
      setIsRecovering(false);
      if (session) fetchProfile(session.user.id);
      else setView('landing');
    }} />;
  }

  if (!session) {
    if (view === 'landing' || typeof view === 'string' && view.startsWith('landing')) {
      return (
        <LandingPage 
          onGetStarted={(mode) => setView(mode === 'login' ? 'auth_login' : 'auth_signup')} 
          onNavigate={(v) => setView(v)}
        />
      );
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
        {activeTab === 'admin' ? (
          <AdminPanel />
        ) : profile.role === 'director' ? (
          <DirectorView profile={profile} session={session} activeTab={activeTab} setActiveTab={setActiveTab} orgData={orgData} />
        ) : (
          <MemberView profile={profile} session={session} activeTab={activeTab} setActiveTab={setActiveTab} orgData={orgData} />
        )}
      </Dashboard>
    </>
  );
}
