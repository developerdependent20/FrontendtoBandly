import React, { useState, useEffect } from 'react';
import { 
  Play, Plus, Users, Calendar as CalendarIcon, Settings, LogOut, Upload, 
  Activity, ShieldCheck, Trash2, Loader2, Music, Crown, FileAudio, LayoutDashboard, Mic, Headphones, Speaker, X,
  ChevronLeft, ChevronRight, Cloud, Zap, Smartphone, Waves, Sparkles, FileText
} from 'lucide-react';
import { supabase } from './supabaseClient';
import axios from 'axios';
import ChartStudio from './components/ChartStudio';
import SequenceUploader from './components/SequenceUploader';
import SequenceMixer from './components/SequenceMixer';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('bandly_active_tab') || 'planner');
  const [view, setView] = useState(() => localStorage.getItem('bandly_view') || 'landing'); // 'landing' or 'auth'

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

  // Persistence: Save states to localStorage
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
    } catch (e) {
      console.error(e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => supabase.auth.signOut();

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
      <Dashboard profile={profile} session={session} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} fetchProfile={fetchProfile}>
        {profile.role === 'director' && <DirectorView profile={profile} session={session} activeTab={activeTab} />}
        {profile.role === 'staff' && <StaffView profile={profile} session={session} activeTab={activeTab} />}
        {profile.role === 'musico' && <MusicianView profile={profile} session={session} activeTab={activeTab} />}
      </Dashboard>
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="center-layout">
      <Loader2 className="spin-slow" size={48} color="var(--primary)" />
    </div>
  );
}

function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Tripleten-style Subtle Aesthetic Elements */}
      <div className="hero-decorations">
        <Sparkles className="floating-icon-subtle top-right" size={48} style={{ top: '120px', right: '10%' }} />
        <Waves className="floating-icon-subtle mid-left" size={60} style={{ top: '300px', left: '5%' }} />
        <Zap className="floating-icon-subtle bot-right" size={32} style={{ bottom: '80px', right: '15%' }} />
      </div>
      
      {/* Navbar */}
      <nav className="landing-nav">
        <div style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          <img src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Logotipo%20sin%20Fondo.png" alt="Bandly Logotipo" className="landing-logo" />
        </div>
        <div className="landing-nav-links">
          <button onClick={() => onGetStarted('login')} className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.5rem', border: 'none' }}>Ingresar</button>
          <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem' }}>Comenzar Gratis</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero-centered">
        <div className="hero-content-full">
          <div className="badge-promo">⚡️ LA PLATAFORMA DEFINITIVA PARA LA ESCENA MUSICAL</div>
          <h1 className="hero-main-title-large">
            Tu Show, Bajo Control. <br/>
            <span>Donde Sea, Como Sea.</span>
          </h1>
          <p className="hero-description-large">
            Planifica tus ensayos con el mayor control, gestiona tus multitracks con nuestro <strong>reproductor nativo</strong> y ensaya con la mejor <strong>sala de previsualización de secuencias</strong>.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ padding: '1.2rem 3rem', fontSize: '1.2rem', width: 'auto' }}>Comenzar Gratis</button>
            <button onClick={() => document.getElementById('pricing').scrollIntoView({behavior:'smooth'})} className="btn-secondary" style={{ padding: '1.2rem 2rem', fontSize: '1.2rem', border: '1px solid rgba(255,255,255,0.1)', width: 'auto' }}>Ver Planes</button>
          </div>
          
          <div className="compatibility-badges-centered">
            <div className="comp-item"><span></span> macOS</div>
            <div className="comp-item"><span>⊞</span> Windows</div>
            <div className="comp-item"><span>▶</span> Android / Play Store</div>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section id="pricing" className="landing-pricing-section">
        <div className="section-header-centered">
          <h2 className="section-title-large">Los mejores planes calidad-precio</h2>
          <p className="section-subtitle">Potencia real para tu música, sin complicaciones.</p>
        </div>

        <div className="pricing-grid">
          {/* Plan Gratis */}
          <div className="pricing-card">
            <div className="pricing-badge">BÁSICO</div>
            <h3>Gratis</h3>
            <div className="price">0<span>/año</span></div>
            <ul className="pricing-features">
              <li><ShieldCheck size={16} /> 1 Banda / Organización</li>
              <li><ShieldCheck size={16} /> 20 Usuarios por Equipo</li>
              <li><ShieldCheck size={16} /> 400MB Almacenamiento</li>
              <li><ShieldCheck size={16} /> Calendario de Eventos</li>
            </ul>
            <button onClick={onGetStarted} className="btn-secondary-outline">Empezar Gratis</button>
          </div>

          {/* Plan Starter */}
          <div className="pricing-card featured">
            <div className="pricing-badge-popular">POPULAR</div>
            <h3>Starter</h3>
            <div className="price">$20<span>/año</span></div>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--primary)" /> Hasta 3 Bandas</li>
              <li><Crown size={16} color="var(--primary)" /> 50 Usuarios por Equipo</li>
              <li><Crown size={16} color="var(--primary)" /> 10GB Almacenamiento</li>
              <li><Crown size={16} color="var(--primary)" /> PDF Charts Ilimitados</li>
            </ul>
            <button onClick={onGetStarted} className="btn-primary">Elegir Starter</button>
          </div>

          {/* Plan Pro */}
          <div className="pricing-card">
            <div className="pricing-badge">PRO</div>
            <h3>Pro</h3>
            <div className="price">$50<span>/año</span></div>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--accent)" /> 10 Bandas Incluidas</li>
              <li><Crown size={16} color="var(--accent)" /> Usuarios Ilimitados</li>
              <li><Crown size={16} color="var(--accent)" /> 50GB Almacenamiento</li>
              <li><Crown size={16} color="var(--accent)" /> Reproductor Multitrack Pro</li>
            </ul>
            <button onClick={onGetStarted} className="btn-secondary-outline">Elegir Pro</button>
          </div>

          {/* Plan Elite */}
          <div className="pricing-card">
            <div className="pricing-badge">ELITE</div>
            <h3>Elite</h3>
            <div className="price">$100<span>/año</span></div>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--accent)" /> Bandas Ilimitadas</li>
              <li><Crown size={16} color="var(--accent)" /> 200GB Almacenamiento</li>
              <li><Crown size={16} color="var(--accent)" /> Funciones de Charts VIP</li>
              <li><Crown size={16} color="var(--accent)" /> Acceso Anticipado a Apps</li>
            </ul>
            <button onClick={onGetStarted} className="btn-secondary-outline">Elegir Elite</button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="landing-features">
        <div className="feature-card">
          <div className="feature-icon"><Play size={32} /></div>
          <h3>Reproductor Nativo</h3>
          <p>Lanza tus secuencias con baja latencia y control total de mezcla. Disponible para Mac y Windows.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><Activity size={32} /></div>
          <h3>Sala de Previsualización</h3>
          <p>Ensaya tus secuencias desde la web antes de ir al escenario. Escucha y aprueba cada track.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><Cloud size={32} /></div>
          <h3>Central de Multitracks</h3>
          <p>Sube tus pistas, organiza tus stems y tenlas listas para el show. Sincronización total.</p>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="landing-cta-box">
        <h2>¿Listo para profesionalizar tu banda?</h2>
        <p>No pagues de más por herramientas complejas. Bandly es la opción más potente y accesible del mundo.</p>
        <button onClick={onGetStarted} className="btn-primary" style={{ padding: '1rem 3rem', marginTop: '1rem' }}>Únete a Bandly</button>
      </section>
    </div>
  );
}

function AuthScreen({ onBack, initialMode }) {
  const [isSignUp, setIsSignUp] = useState(() => {
    if (initialMode === 'signup') return true;
    if (initialMode === 'login') return false;
    return window.location.search.includes('join=');
  });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, password, options: { data: { full_name: fullName } } 
        });
        if (error) throw error;
        alert('¡Casi listo! Hemos enviado un enlace de confirmación a tu correo. Por favor, revísalo (mira también en spam) y haz clic en el botón para activar tu cuenta de Bandly.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-layout">
      <img src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/LOGO%20BANDLY%20SIN%20FONDO.png" alt="Bandly Isotipo" style={{ width: '240px', height: 'auto', marginBottom: '-2rem', filter: 'drop-shadow(0 0 40px rgba(59, 130, 246, 0.7))' }} />
      <h1 className="hero-title">Bandly</h1>
      <p className="hero-subtitle">Plan songs. Send sequences. Lead better.</p>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <h3 style={{ marginBottom: '2rem', textAlign: 'center' }}>
          {isSignUp ? 'Crear Cuenta' : 'Acceso a tu Banda'}
        </h3>
        <form onSubmit={handleSubmit} className="input-group">
          {isSignUp && (
            <input type="text" placeholder="Nombre completo" className="input-field" value={fullName} onChange={e => setFullName(e.target.value)} required />
          )}
          <input type="email" placeholder="Correo electrónico" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
          
          {errorMsg && <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{errorMsg}</p>}
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="spin" size={20}/> : (isSignUp ? 'Registrar' : 'Iniciar Sesión')}
          </button>
        </form>
        
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {isSignUp ? '¿Ya tienes acceso?' : '¿No estás registrado?'} 
          <span style={{ color: 'var(--primary)', cursor: 'pointer', marginLeft: '0.5rem', fontWeight: '500' }} onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Inicia sesión' : 'Crea una cuenta'}
          </span>
        </p>
      </div>
    </div>
  );
}

function OnboardingScreen({ session, fetchProfile }) {
  const urlParams = new URLSearchParams(window.location.search);
  const magicCode = urlParams.get('join');

  const [roleMode, setRoleMode] = useState(magicCode ? 'member' : null); 
  const [orgName, setOrgName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState(magicCode || '');
  const [loading, setLoading] = useState(false);

  const createOrganization = async () => {
    if(!orgName || !inviteCodeInput) { alert("Por favor ingresa nombre y un código para la banda."); return; }
    setLoading(true);
    try {
      const code = inviteCodeInput.toUpperCase().replace(/\s+/g, '');
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: orgName, invite_code: code }])
        .select().single();
      
      if (orgError) {
        if (orgError.code === '23505') throw new Error('Ese código de banda ya está en uso en otra parte del mundo. ¡Elige otro!');
        throw orgError;
      }

      const { error: profError } = await supabase.from('profiles').insert([{ 
        id: session.user.id, 
        full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0], 
        email: session.user.email, 
        role: 'director',
        org_id: org.id
      }]);
      if (profError) throw profError;
      
      await fetchProfile(session.user.id);
    } catch (e) {
      alert(e.message);
      setLoading(false);
    }
  };

  const joinByCode = async (role) => {
    if (!inviteCodeInput) { alert("Ingresa un código"); return; }
    setLoading(true);
    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id').eq('invite_code', inviteCodeInput.toUpperCase()).single();
      
      if (orgError || !org) throw new Error('Código de acceso inválido.');

      const { error: profError } = await supabase.from('profiles').insert([{ 
        id: session.user.id, 
        full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0], 
        email: session.user.email, 
        role: role,
        org_id: org.id
      }]);
      if (profError) throw profError;

      await fetchProfile(session.user.id);
    } catch (e) {
      alert(e.message);
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="center-layout">
      <h2 className="hero-title" style={{ fontSize: '3rem' }}>¡Hola, {session.user.user_metadata?.full_name?.split(' ')[0] || 'Músico'}!</h2>
      <p className="hero-subtitle" style={{ marginBottom: '3rem' }}>Para comenzar tu experiencia en Bandly, selecciona tu rol:</p>

      <div className="role-grid">
        {!roleMode ? (
          <>
            <div className="glass-panel role-card" onClick={() => setRoleMode('director')}>
              <div className="role-icon"><ShieldCheck size={32} /></div>
              <h3>Director</h3>
              <p style={{ color: 'var(--text-muted)' }}>Crea y administra la banda.</p>
            </div>
            <div className="glass-panel role-card" onClick={() => setRoleMode('member')}>
              <div className="role-icon"><Users size={32} /></div>
              <h3>Staff / Músico</h3>
              <p style={{ color: 'var(--text-muted)' }}>Conéctate a una banda existente con código.</p>
            </div>
          </>
        ) : roleMode === 'director' ? (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', maxWidth: '500px', margin: '0 auto' }}>
            <h3 className="section-title">Datos de tu Banda</h3>
            <div className="input-group">
              <input type="text" placeholder="Nombre (Ej: Adoradores Central)" className="input-field" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              <input type="text" placeholder="Crea tu Código Secreto (Ej: CENTRAL24)" className="input-field" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} />
              <button onClick={createOrganization} className="btn-primary">Registrar Banda</button>
              <button onClick={() => setRoleMode(null)} className="btn-secondary">Volver</button>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', maxWidth: '500px', margin: '0 auto' }}>
            <h3 className="section-title">Código de Invitación</h3>
            <div className="input-group">
              <input type="text" placeholder="Ej: CENTRAL24" className="input-field" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} disabled={!!magicCode}/>
              {magicCode && <p style={{fontSize:'0.8rem', color:'var(--primary)', textAlign:'center'}}>Código autocompletado por tu invitación.</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button onClick={() => joinByCode('staff')} className="btn-primary">Soy Staff</button>
                <button onClick={() => joinByCode('musico')} className="btn-primary">Soy Músico</button>
              </div>
              {!magicCode && <button onClick={() => setRoleMode(null)} className="btn-secondary">Volver</button>}
            </div>
          </div>
        )}
      </div>
      
      <button onClick={() => supabase.auth.signOut()} className="btn-secondary" style={{ marginTop: '3rem', border: 'none', background: 'transparent' }}>
        Cerrar Sesión
      </button>
    </div>
  );
}

function Dashboard({ profile, children, onLogout, activeTab, setActiveTab, fetchProfile }) {
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

        {(profile.role === 'director' || profile.role === 'staff') && (
          <div 
            className={`nav-item ${activeTab === 'audio' ? 'active' : ''}`} 
            onClick={() => setActiveTab('audio')}
            title="Pistas & Multitracks"
          >
            <Upload size={22} />
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

function DirectorView({ profile, session, activeTab }) {
  const { sequences, members, events, songs, uploading, handleFileUpload, handleDelete, fetchData } = useOrgData(profile, session);
  return (
    <div className="dashboard-grid" style={{ display: 'block' }}>
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <EventPlanner readOnly={false} events={events} members={members} orgId={profile.org_id} refreshData={fetchData} songs={songs} profile={profile} session={session} />
          <SongLibrary songs={songs} orgId={profile.org_id} readOnly={false} refreshData={fetchData} session={session} />
        </div>
      )}
      {activeTab === 'team' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TeamList members={members} isDirector={true} refreshData={fetchData} />
        </div>
      )}
      {activeTab === 'audio' && (
        <div style={{ gridColumn: '1 / -1' }}>
          <DataCenter sequences={sequences} uploading={uploading} onUpload={handleFileUpload} onDelete={handleDelete} allowUpload={true} />
        </div>
      )}
    </div>
  );
}

function StaffView({ profile, session, activeTab }) {
  const { sequences, members, events, songs, uploading, handleFileUpload, handleDelete, fetchData } = useOrgData(profile, session);
  return (
    <div className="dashboard-grid" style={{ display: 'block' }}>
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <EventPlanner readOnly={true} events={events} members={members} orgId={profile.org_id} refreshData={fetchData} songs={songs} profile={profile} session={session} />
          <SongLibrary songs={songs} orgId={profile.org_id} readOnly={false} refreshData={fetchData} session={session} />
        </div>
      )}
      {activeTab === 'team' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TeamList members={members} isDirector={false} refreshData={fetchData} />
        </div>
      )}
      {activeTab === 'audio' && (
        <div style={{ gridColumn: '1 / -1' }}>
          <DataCenter sequences={sequences} uploading={uploading} onUpload={handleFileUpload} onDelete={handleDelete} allowUpload={true} />
        </div>
      )}
    </div>
  );
}

function MusicianView({ profile, session, activeTab }) {
  const { sequences, events, members, songs } = useOrgData(profile, session);
  return (
    <div className="dashboard-grid" style={{ display: 'block' }}>
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <EventPlanner readOnly={true} events={events} members={members} songs={songs} profile={profile} session={session} />
          <SongLibrary songs={songs} orgId={profile.org_id} readOnly={true} session={session} />
        </div>
      )}
      {activeTab === 'team' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TeamList members={members} isDirector={false} />
        </div>
      )}
      {activeTab === 'audio' && (
        <div style={{ gridColumn: '1 / -1' }}>
          <DataCenter sequences={sequences} allowUpload={false} />
        </div>
      )}
    </div>
  );
}

function useOrgData(profile, session) {
  const [sequences, setSequences] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [songs, setSongs] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile?.org_id]);

  const fetchData = async () => {
    const resSeq = await supabase.from('sequence_files').select('*').order('created_at', { ascending: false });
    if (!resSeq.error) setSequences(resSeq.data);

    const resMem = await supabase.from('profiles').select('*').eq('org_id', profile.org_id);
    if (!resMem.error) setMembers(resMem.data);

    const resSongs = await supabase.from('songs').select('*').eq('org_id', profile.org_id).order('title', { ascending: true });
    if (!resSongs.error) setSongs(resSongs.data);

    try {
      const resEv = await supabase.from('events').select('*, event_roster(*), event_songs(*, songs(*))').eq('org_id', profile.org_id).order('date', { ascending: true });
      if (!resEv.error) setEvents(resEv.data);
    } catch(e) { console.log('Events table might not exist yet'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { uploadUrl, key } } = await axios.post(`${API_URL}/api/storage/upload-url`, {
        fileName: file.name, fileType: file.type, fileSize: file.size, orgId: profile.org_id
      }, { headers: { Authorization: `Bearer ${session.access_token}` } });
      await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });
      await axios.post(`${API_URL}/api/storage/confirm-upload`, {
        fileMetadata: { orgId: profile.org_id, fileName: file.name, fileType: file.type, fileSize: file.size, key }
      }, { headers: { Authorization: `Bearer ${session.access_token}` } });
      await fetchData();
    } catch (e) { alert('Error al subir.'); } finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Esta acción removerá el archivo. ¿Continuar?')) return;
    try {
      await axios.delete(`${API_URL}/api/storage/delete/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      await fetchData();
    } catch (e) { alert('Error al borrar'); }
  };

  return { sequences, members, events, songs, uploading, handleFileUpload, handleDelete, fetchData };
}

function DataCenter({ sequences, uploading, onUpload, onDelete, allowUpload }) {
  return (
    <section className="glass-panel" style={{ padding: '2rem' }}>
      <h3 className="section-title"><Upload size={20} color="var(--primary)" /> Pistas & Multitracks</h3>
      {allowUpload && (
        <label className="upload-zone" style={{ display: 'block', marginBottom: '2rem' }}>
          <input type="file" onChange={onUpload} style={{ display: 'none' }} disabled={uploading} />
          {uploading ? <Loader2 className="spin-slow" size={32} style={{ margin: '0 auto' }} color="var(--primary)" /> : <FileAudio size={40} style={{ margin: '0 auto 1rem auto', color: 'var(--primary)' }} />}
          <div style={{ fontWeight: '500', marginTop: '1rem' }}>{uploading ? 'Transfiriendo...' : 'Seleccionar Stems (.wav, .zip)'}</div>
        </label>
      )}
      <div>
        {sequences?.length === 0 ? ( <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem' }}>Repositorio vacío.</p> ) : (
          sequences?.map(s => (
            <div key={s.id} className="list-item">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Play size={16} style={{ color: 'var(--primary)', cursor: 'pointer' }} />
                <span style={{ fontSize: '0.95rem' }}>{s.original_name}</span>
              </div>
              {allowUpload && <Trash2 size={16} style={{ color: '#ef4444', cursor: 'pointer', opacity: 0.7 }} onClick={() => onDelete(s.id)} />}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function VisualCalendar({ events, onEventClick, onDayClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= days; i++) calendarDays.push(i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 'bold' }}>{monthNames[month]} {year}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={prevMonth} className="btn-secondary" style={{ padding: '0.4rem', width: 'auto' }}><ChevronLeft size={18}/></button>
          <button onClick={nextMonth} className="btn-secondary" style={{ padding: '0.4rem', width: 'auto' }}><ChevronRight size={18}/></button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
        {weekDays.map(d => <div key={d} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>{d}</div>)}
        
        {calendarDays.map((day, idx) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
          const dayEvents = dateStr ? events?.filter(e => e.date && e.date.startsWith(dateStr)) : [];
          const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <div 
              key={idx} 
              onClick={() => day && onDayClick(dateStr)}
              style={{ minHeight: '80px', background: day ? 'rgba(255,255,255,0.02)' : 'transparent', border: '1px solid rgba(255,255,255,0.03)', position: 'relative', cursor: day ? 'pointer' : 'default', transition: '0.2s', display: 'flex', flexDirection: 'column', padding: '8px' }}
              className={day ? "calendar-cell-hover" : ""}
            >
              {day && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <span style={{ fontSize: '0.8rem', color: isToday ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: isToday ? 'bold' : 'normal' }}>{day}</span>
                    {isToday && <div style={{ width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '50%' }}></div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'flex-start', marginTop: '6px', width: '100%' }}>
                    {dayEvents.map(ev => (
                      <div 
                        key={ev.id} 
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        style={{ 
                          width: '100%', 
                          padding: '3px 6px', 
                          background: 'var(--accent)', 
                          color: '#0f172a', 
                          borderRadius: '4px', 
                          fontSize: '0.65rem', 
                          fontWeight: '800', 
                          cursor: 'pointer', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          textAlign: 'left',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                        title={ev.name}
                      >
                        {ev.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SongLibrary({ songs, orgId, readOnly, refreshData, session }) {
  const [showModal, setShowModal] = useState(false);
  const [chartSong, setChartSong] = useState(null);
  const [seqUploadSong, setSeqUploadSong] = useState(null);
  const [seqMixerData, setSeqMixerData] = useState(null);
  const [loadingSeq, setLoadingSeq] = useState(null);
  const [title, setTitle] = useState('');
  const [songKey, setSongKey] = useState('');
  const [keyMale, setKeyMale] = useState('');
  const [keyFemale, setKeyFemale] = useState('');
  const [bpm, setBpm] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');

  // Abrir Mixer: cargar secuencia desde el backend
  const openMixer = async (song) => {
    setLoadingSeq(song.id);
    try {
      const resp = await fetch(`${API_URL}/api/sequences/${song.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await resp.json();
      if (data.sequence && data.sequence.stems?.length > 0) {
        setSeqMixerData(data.sequence);
      } else {
        // No hay secuencia subida, abrir uploader
        if (!readOnly) {
          setSeqUploadSong(song);
        } else {
          alert('Esta canción no tiene secuencia subida aún.');
        }
      }
    } catch (e) {
      console.error('Error loading sequence:', e);
      alert('Error al cargar secuencia');
    } finally {
      setLoadingSeq(null);
    }
  };

  const handleSave = async () => {
    if(!title) return alert("El título es obligatorio");
    try {
      const { error } = await supabase.from('songs').insert([{ org_id: orgId, title, key: songKey, key_male: keyMale, key_female: keyFemale, bpm, youtube_link: youtubeLink }]);
      if (error) {
        alert("Error de la base de datos: " + error.message);
        return;
      }
      setShowModal(false);
      setTitle(''); setSongKey(''); setKeyMale(''); setKeyFemale(''); setBpm(''); setYoutubeLink('');
      if (refreshData) refreshData();
    } catch(e) { 
      alert("Error de base de datos o conexión al guardar."); 
    }
  };
  
  const handleDelete = async (id) => {
    if(!confirm("¿Estás seguro de eliminar esta canción del repertorio?")) return;
    await supabase.from('songs').delete().eq('id', id);
    if (refreshData) refreshData();
  };

  return (
    <section className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ margin: 0 }}><Music size={20} color="var(--primary)" /> Repertorio</h3>
        {!readOnly && (
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '0.4rem 1rem', width: 'auto', fontSize: '0.85rem' }}>
            <Plus size={16} /> Añadir Canción
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {songs?.length === 0 ? <p style={{color:'var(--text-muted)'}}>No hay canciones en el registro.</p> : 
          songs?.map(s => (
            <div key={s.id} className="list-item" style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: '0.5rem'}}>
              <div>
                <strong style={{color:'white', fontSize:'1rem', display:'block'}}>{s.title}</strong>
                <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>
                   Orig: <span style={{color:'var(--primary)', fontWeight:'bold'}}>{s.key || '-'}</span> | 
                   Hombre: <span style={{color:'var(--primary)', fontWeight:'bold'}}>{s.key_male || '-'}</span> | 
                   Mujer: <span style={{color:'var(--primary)', fontWeight:'bold'}}>{s.key_female || '-'}</span> | 
                   BPM: {s.bpm || '-'}
                </span>
              </div>
              <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                {s.youtube_link && (() => {
                   const match = s.youtube_link.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
                   const yId = match ? match[1] : null;
                   return yId ? (
                     <a href={s.youtube_link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100px', height: '56px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0, transition: '0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }} className="yt-thumb">
                       <img src={`https://img.youtube.com/vi/${yId}/mqdefault.jpg`} alt="YouTube" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     </a>
                   ) : (
                     <a href={s.youtube_link} target="_blank" rel="noopener noreferrer" style={{color:'#ef4444', fontWeight:'bold', fontSize:'0.85rem', textDecoration:'none'}}>📺 Ver Link</a>
                   );
                })()}
                {!readOnly && <Trash2 size={16} color="#ef4444" style={{cursor:'pointer', opacity:0.7, paddingLeft: '0.5rem'}} onClick={() => handleDelete(s.id)}/>}
                <button 
                  onClick={() => setChartSong(s)} 
                  style={{ 
                    background: s.chart_data ? 'rgba(167, 139, 250, 0.15)' : 'rgba(139, 92, 246, 0.08)', 
                    border: `1px solid ${s.chart_data ? '#a78bfa' : 'rgba(139, 92, 246, 0.3)'}`, 
                    color: s.chart_data ? '#a78bfa' : '#c4b5fd', 
                    padding: '6px 14px', 
                    borderRadius: '10px', 
                    fontSize: '0.75rem', 
                    fontWeight: '800', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'inherit',
                    boxShadow: s.chart_data ? '0 4px 12px rgba(167, 139, 250, 0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = s.chart_data ? 'rgba(167, 139, 250, 0.15)' : 'rgba(139, 92, 246, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <FileText size={14} color={s.chart_data ? '#a78bfa' : '#c4b5fd'} /> {s.chart_data ? 'Cifrado' : '+ Chart'}
                </button>
                <button 
                  onClick={() => openMixer(s)}
                  disabled={loadingSeq === s.id}
                  style={{ 
                    background: 'rgba(14, 165, 233, 0.08)', 
                    border: '1px solid rgba(14, 165, 233, 0.3)', 
                    color: '#38bdf8', 
                    padding: '6px 14px', 
                    borderRadius: '10px', 
                    fontSize: '0.75rem', 
                    fontWeight: '800', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'inherit',
                    opacity: loadingSeq === s.id ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(14, 165, 233, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(14, 165, 233, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {loadingSeq === s.id ? <Loader2 size={14} className="spin-slow" /> : <Headphones size={14} />} Secuencia
                </button>
              </div>
            </div>
          ))
        }
      </div>
      
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 'clamp(1rem, 3vw, 3rem) 1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: 'clamp(1.5rem, 5vw, 2.5rem)', background: 'var(--bg-panel)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 1)', position: 'relative' }}>
            
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.7, padding: '5px' }}>
              <X size={24} />
            </button>

            <h3 style={{marginBottom:'1.5rem', textAlign:'center', fontWeight:'800'}}>Datos de la Canción</h3>
            <div className="input-group">
              <input type="text" className="input-field" placeholder="Título de la canción *" value={title} onChange={e=>setTitle(e.target.value)} style={{ fontSize: '1rem', width: '100%' }}/>
              <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap:'1rem', width: '100%'}}>
                <input type="text" className="input-field" placeholder="Tono Original (ej. A)" value={songKey} onChange={e=>setSongKey(e.target.value)} style={{ fontSize: '1rem' }}/>
                <input type="number" className="input-field" placeholder="BPM (ej. 120)" value={bpm} onChange={e=>setBpm(e.target.value)} style={{ fontSize: '1rem' }}/>
                <input type="text" className="input-field" placeholder="Tono Hombre (ej. G)" value={keyMale} onChange={e=>setKeyMale(e.target.value)} style={{ fontSize: '1rem' }}/>
                <input type="text" className="input-field" placeholder="Tono Mujer (ej. D)" value={keyFemale} onChange={e=>setKeyFemale(e.target.value)} style={{ fontSize: '1rem' }}/>
              </div>
              <input type="url" className="input-field" placeholder="Enlace de YouTube" value={youtubeLink} onChange={e=>setYoutubeLink(e.target.value)} style={{ fontSize: '1rem', width: '100%' }}/>
            </div>
            
            {youtubeLink && (() => {
               const match = youtubeLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
               const yId = match ? match[1] : null;
               if (!yId) return null;
               return (
                 <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                   <iframe style={{width: '200px', height: '113px', borderRadius: '8px', border: 'none', background: 'black', flexShrink: 0}} src={`https://www.youtube.com/embed/${yId}`} allowFullScreen title="Preview" />
                   <div style={{color:'var(--primary)', fontSize:'0.85rem', fontWeight:'bold'}}>Miniatura del video Lista 🎬</div>
                 </div>
               );
            })()}

            <div style={{display:'flex', gap:'1rem', marginTop:'2rem'}}>
              <button className="btn-secondary" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>Guardar Canción</button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Studio Modal */}
      {chartSong && (
        <ChartStudio 
          song={chartSong}
          onClose={() => setChartSong(null)}
          onSave={async (chartData) => {
            const { error } = await supabase
              .from('songs')
              .update({ 
                chart_data: chartData.chart_data, 
                chart_annotations: chartData.chart_annotations 
              })
              .eq('id', chartSong.id);
            if (error) throw error;
            // Update local state
            setChartSong(prev => ({ ...prev, ...chartData }));
            if (refreshData) refreshData();
          }}
        />
      )}

      {/* Sequence Uploader Modal */}
      {seqUploadSong && (
        <SequenceUploader
          song={seqUploadSong}
          orgId={orgId}
          session={session}
          apiUrl={API_URL}
          onClose={() => setSeqUploadSong(null)}
          onComplete={() => { if (refreshData) refreshData(); }}
        />
      )}

      {/* Sequence Mixer Modal */}
      {seqMixerData && (
        <SequenceMixer
          sequence={seqMixerData}
          onClose={() => setSeqMixerData(null)}
        />
      )}
    </section>
  );
}

function EventPlanner({ readOnly, events, members, orgId, refreshData, songs, profile, session }) {
  const [showModal, setShowModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('full');
  const [roster, setRoster] = useState([]);
  const [setlist, setSetlist] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  const fullBandTpl = ['Drums', 'Perc', 'Bass', 'Keys', 'E Gtr', 'A Gtr', 'Voice 1', 'Voice 2', 'Voice 3', 'Voice 4', 'Choir'];
  const acousticTpl = ['Perc', 'Keys / Piano', 'A Gtr', 'Voice 1', 'Voice 2', 'Voice 3'];
  const serviceTpl = ['Speaker', 'Announcements', 'Welcome', 'Audio', 'Media', 'Staff'];

  const generateTemplate = (fmt) => {
    const musicLabels = fmt === 'full' ? fullBandTpl : acousticTpl;
    const base = musicLabels.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'music' }));
    const service = serviceTpl.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'service' }));
    return [...base, ...service];
  };

  const applyFormat = (fmt) => {
    setFormat(fmt);
    setRoster(generateTemplate(fmt));
  };

  const addExtraSlot = () => setRoster([...roster, { id: Math.random().toString(), instrument: '', profile_id: '', category: 'extra' }]);
  const updateSlot = (id, field, value) => {
    setRoster(roster.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleEditEvent = (ev) => {
    setEditingEventId(ev.id);
    setEventName(ev.name);
    setEventDate(ev.date || '');
    setDescription(ev.description || '');
    const existingRoster = ev.event_roster || [];
    const isFullBand = existingRoster.some(r => ['Drums', 'Bass', 'E Gtr', 'Choir'].includes(r.instrument));
    const detectedFormat = isFullBand ? 'full' : 'acoustic';
    setFormat(detectedFormat);
    let mergedRoster = generateTemplate(detectedFormat);
    existingRoster.forEach(er => {
       const existingSlotInTemplate = mergedRoster.find(m => m.instrument === er.instrument);
       if (existingSlotInTemplate) existingSlotInTemplate.profile_id = er.profile_id;
       else mergedRoster.push({ id: Math.random().toString(), instrument: er.instrument, profile_id: er.profile_id, category: 'extra' });
    });
    setRoster(mergedRoster);
    const existingSetlist = ev.event_songs ? ev.event_songs.sort((a,b)=>a.order_index - b.order_index).map(es => ({ song_id: es.song_id, lead_id: es.lead_id || '', selected_key: es.selected_key || '' })) : [];
    setSetlist(existingSetlist);
    setShowModal(true);
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('¿Borrar permanentemente?')) return;
    try {
      await supabase.from('event_roster').delete().eq('event_id', id);
      await supabase.from('events').delete().eq('id', id);
      refreshData();
    } catch(e) { alert("Error al eliminar."); }
  };

  const handleSave = async () => {
    if (!eventName || !eventDate) return alert('Nombre y Fecha requeridos');
    setSaving(true);
    try {
      let evtId = editingEventId;
      if (editingEventId) {
        await supabase.from('events').update({ name: eventName, date: eventDate, description }).eq('id', editingEventId);
        await supabase.from('event_roster').delete().eq('event_id', evtId);
        await supabase.from('event_songs').delete().eq('event_id', evtId);
      } else {
        const { data: evt } = await supabase.from('events').insert([{ org_id: orgId, name: eventName, date: eventDate, description }]).select().single();
        evtId = evt.id;
      }
      const validRoster = roster.filter(r => r.instrument && r.profile_id).map(r => ({ 
        event_id: evtId, 
        instrument: r.instrument, 
        category: r.category, 
        profile_id: r.profile_id,
        status: 'pending' 
      }));
      if (validRoster.length > 0) await supabase.from('event_roster').insert(validRoster);
      const validSongs = setlist.filter(i => i.song_id).map((i, idx) => ({ event_id: evtId, song_id: i.song_id, lead_id: i.lead_id || null, selected_key: i.selected_key || null, order_index: idx }));
      if (validSongs.length > 0) await supabase.from('event_songs').insert(validSongs);
      closeModal(); refreshData();
    } catch (e) { alert('Error al guardar.'); } finally { setSaving(false); }
  };

  const updateRosterStatus = async (eventId, roleId, status) => {
    try {
      const { error } = await supabase
        .from('event_roster')
        .update({ status })
        .eq('event_id', eventId)
        .eq('profile_id', roleId);
      if (error) throw error;
      if (refreshData) refreshData();
    } catch (e) { alert("Error al confirmar posición."); }
  };

  const closeModal = () => {
    setShowModal(false); setEventName(''); setEventDate(''); setDescription(''); 
    setFormat('full'); setRoster(generateTemplate('full')); setSetlist([]); setEditingEventId(null); setSaving(false);
  };

  return (
    <section className="glass-panel" style={{ padding: '2rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
        <h3 className="section-title" style={{ margin: 0 }}><CalendarIcon size={20} color="var(--accent)" /> Calendario & Planeación</h3>
        {!readOnly && (
          <div style={{ padding: '0.6rem 1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>💡 Selecciona una fecha en el calendario para crear un evento</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <div>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Próximos Eventos</h4>
          {!events || events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <p>No existen eventos activos.</p>
            </div>
          ) : (
            events.map(ev => (
              <div key={ev.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', margin: '1rem 0', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.3rem', color: 'white', fontWeight: '800' }}>{ev.name}</h4>
                    <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600' }}>
                      {ev.date ? (
                        (() => {
                          const dateObj = new Date(ev.date.split('T')[0] + 'T00:00:00');
                          return isNaN(dateObj) ? '---' : dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                        })()
                      ) : '---'}
                    </span>
                  </div>
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span onClick={() => handleEditEvent(ev)} style={{ cursor: 'pointer', padding: '0.3rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>✏️</span>
                      <span onClick={() => handleDeleteEvent(ev.id)} style={{ cursor: 'pointer', padding: '0.3rem', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>🗑️</span>
                    </div>
                  )}
                </div>

                {(() => {
                  const currentUserId = session?.user?.id || profile?.id;
                  const userSlots = ev.event_roster?.filter(r => String(r.profile_id) === String(currentUserId)) || [];
                  const isScheduled = userSlots.length > 0;
                  const userRole = (profile?.role || '').toLowerCase();
                  const canViewDetails = userRole === 'director' || userRole === 'staff' || isScheduled;

                  if (!canViewDetails) {
                    return (
                      <div style={{ width: '100%', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px dashed rgba(239, 68, 68, 0.2)', textAlign: 'center', marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          🚫 <strong style={{ color: '#ef4444' }}>Usted no ha sido agendado para este evento</strong>
                        </p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Banner de RSVP para el usuario logueado */}
                      {isScheduled && userSlots.map((slot, idx) => (
                        <div key={idx} style={{ width: '100%', padding: '1.25rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Tu Posición</span>
                               <h5 style={{ fontSize: '1.1rem', margin: 0, color: 'white' }}>🎸 {slot.instrument}</h5>
                            </div>
                            <div style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', background: slot.status === 'confirmed' ? 'rgba(16, 185, 129, 0.1)' : slot.status === 'declined' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: slot.status === 'confirmed' ? '#10b981' : slot.status === 'declined' ? '#f43f5e' : '#f59e0b', border: `1px solid ${slot.status === 'confirmed' ? 'rgba(16,185,129,0.2)' : slot.status === 'declined' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                               {slot.status === 'confirmed' ? 'Confirmado' : slot.status === 'declined' ? 'Declinado' : 'Pendiente'}
                            </div>
                          </div>
                          
                          {slot.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'confirmed')} className="btn-primary" style={{ padding: '0.6rem', fontSize: '0.85rem' }}>Aceptar</button>
                              <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'declined')} className="btn-secondary" style={{ padding: '0.6rem', fontSize: '0.85rem' }}>Declinar</button>
                            </div>
                          )}
                          {slot.status !== 'pending' && (
                            <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'pending')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', width: 'fit-content' }}>Cambiar Respuesta</button>
                          )}
                        </div>
                      ))}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', width: '100%', marginBottom: '1.5rem' }}>
                        {ev.event_roster?.map((slot, i) => slot.profile_id && (
                          <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(255,255,255,0.03)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{slot.instrument}</span>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: slot.status === 'confirmed' ? '#10b981' : slot.status === 'declined' ? '#f43f5e' : '#f59e0b', boxShadow: `0 0 10px ${slot.status === 'confirmed' ? 'rgba(16,185,129,0.5)' : slot.status === 'declined' ? 'rgba(244,63,94,0.5)' : 'rgba(245,158,11,0.5)'}` }}></div>
                            </div>
                            <strong style={{ color: slot.status === 'declined' ? 'var(--text-muted)' : 'white' }}>
                               {members?.find(m => m.id === slot.profile_id)?.full_name.split(' ')[0]}
                               {slot.status === 'declined' && <span style={{fontSize:'0.6rem', marginLeft:'4px'}}>(X)</span>}
                            </strong>
                          </div>
                        ))}
                      </div>

                      {ev.event_songs && ev.event_songs.length > 0 && (
                        <div style={{ width: '100%', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <h5 style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>🎵 Repertorio Seleccionado</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {ev.event_songs.sort((a,b) => a.order_index - b.order_index).map((song, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                  <span style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.9rem' }}>{song.songs?.title}</span>
                                  {song.lead_id && (
                                    <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                      🎙️ {members?.find(m => m.id === song.lead_id)?.full_name.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                                {song.selected_key && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {song.selected_key}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ))
          )}
        </div>

        <div>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vista Mensual & Agenda</h4>
          <VisualCalendar events={events} onEventClick={handleEditEvent} onDayClick={(dateStr) => {
            if(readOnly) return;
            const existing = events?.find(e => e.date && e.date.startsWith(dateStr));
            if (existing) handleEditEvent(existing);
            else { setEditingEventId(null); setEventName(''); setEventDate(dateStr); setShowModal(true); }
          }} />
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <button 
              onClick={closeModal} 
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
            >
              <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
            </button>
            <h3 style={{ marginBottom: '2rem', textAlign: 'center', fontSize: '1.5rem' }}>{editingEventId ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                placeholder="Nombre del Evento (ej: Servicio Dominical)" 
                className="input-field" 
                value={eventName} 
                onChange={e => setEventName(e.target.value)} 
                style={{ width: '100%', fontSize: '1.25rem', padding: '1.1rem', fontWeight: '700' }} 
              />
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
               {eventDate && (
                 <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                   <CalendarIcon size={14}/> {(() => {
                     const dateObj = new Date(eventDate.split('T')[0] + 'T00:00:00');
                     return isNaN(dateObj) ? 'Sin fecha' : dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                   })()}
                 </div>
               )}
            </div>

            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <textarea 
                placeholder="Instrucciones de vestuario, logística, notas del director..." 
                className="input-field" 
                rows="3" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                style={{ width: '100%', padding: '1rem' }}
              ></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
               <button className={format === 'full' ? 'btn-primary' : 'btn-secondary'} onClick={() => applyFormat('full')} style={{flex: 1}}>🎸 Full Band</button>
               <button className={format === 'acoustic' ? 'btn-primary' : 'btn-secondary'} onClick={() => applyFormat('acoustic')} style={{flex: 1}}>🪕 Acústico</button>
            </div>
            {/* Músicos Section */}
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🎸</span> Músicos / Banda
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
              {roster.filter(r => r.category === 'music').map((slot) => (
                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', padding: '0.65rem 1rem', background: '#2d3748', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ width: '40%', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{slot.instrument}</span>
                  <select className="input-field" value={slot.profile_id} onChange={(e) => updateSlot(slot.id, 'profile_id', e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.9rem', color: 'white' }}>
                    <option value="">-- Vacío --</option>
                    {members?.map(m => (<option key={m.id} value={m.id}>{m.full_name.split(' ')[0]}</option>))}
                  </select>
                </div>
              ))}
            </div>

            {/* Staff Section */}
            <h4 style={{ fontSize: '0.9rem', color: '#f59e0b', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(245, 158, 11, 0.4)' }}>
              <span style={{ fontSize: '1.4rem' }}>⚡</span> Producción / Staff
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
              {roster.filter(r => r.category === 'service').map((slot) => (
                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', padding: '0.65rem 1rem', background: '#2d3748', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ width: '45%', fontSize: '0.75rem', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase' }}>{slot.instrument}</span>
                  <select className="input-field" value={slot.profile_id} onChange={(e) => updateSlot(slot.id, 'profile_id', e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.9rem', color: 'white' }}>
                    <option value="">-- Vacío --</option>
                    {members?.map(m => (<option key={m.id} value={m.id}>{m.full_name.split(' ')[0]}</option>))}
                  </select>
                </div>
              ))}
            </div>

            {/* Extras Section */}
            {roster.some(r => r.category === 'extra') && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'white', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Otros / Invitados</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {roster.filter(r => r.category === 'extra').map((slot) => (
                    <div key={slot.id} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <input type="text" value={slot.instrument} onChange={(e) => updateSlot(slot.id, 'instrument', e.target.value)} placeholder="Ej: Coro" style={{ width: '40%', background: 'transparent', border: 'none', color: 'white', fontSize: '0.75rem' }} />
                      <select className="input-field" value={slot.profile_id} onChange={(e) => updateSlot(slot.id, 'profile_id', e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.85rem' }}>
                        <option value="">-- Vacío --</option>
                        {members?.map(m => (<option key={m.id} value={m.id}>{m.full_name.split(' ')[0]}</option>))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={addExtraSlot} className="btn-secondary" style={{ fontSize: '0.7rem', width: 'auto', marginBottom: '1.5rem' }}>+ Añadir Personalizado</button>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Repertorio del Evento</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '30vh', overflowY: 'auto', marginBottom: '2.5rem', paddingRight: '0.5rem' }}>
              {setlist.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 40px', gap: '0.5rem', alignItems: 'center', background: '#2d3748', padding: '0.6rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Canción */}
                  <select className="input-field" style={{ border: 'none', background: 'transparent', fontSize: '0.85rem' }} value={item.song_id} onChange={e => {
                    const n = [...setlist]; n[idx].song_id = e.target.value; setSetlist(n);
                  }}>
                    <option value="">-- Canción --</option>
                    {songs?.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>

                  {/* Líder / Dirige */}
                  <select className="input-field" style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', color: 'var(--text-secondary)' }} value={item.lead_id} onChange={e => {
                    const n = [...setlist]; n[idx].lead_id = e.target.value; setSetlist(n);
                  }}>
                    <option value="">-- Dirige --</option>
                    {members?.map(m => (<option key={m.id} value={m.id}>{m.full_name.split(' ')[0]}</option>))}
                  </select>

                  {/* Tono Dinámico */}
                  <select 
                    className="input-field" 
                    style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 'bold' }} 
                    value={item.selected_key} 
                    onChange={e => {
                      const n = [...setlist]; n[idx].selected_key = e.target.value; setSetlist(n);
                    }}
                  >
                    <option value="">-- Tono --</option>
                    {(() => {
                      const s = songs?.find(x => x.id === item.song_id);
                      if (!s) return null;
                      return (
                        <>
                          {s.key && <option value={s.key}>Original: {s.key}</option>}
                          {s.key_male && <option value={s.key_male}>Hombre: {s.key_male}</option>}
                          {s.key_female && <option value={s.key_female}>Mujer: {s.key_female}</option>}
                        </>
                      );
                    })()}
                  </select>

                  <button onClick={() => setSetlist(setlist.filter((_,i)=>i!==idx))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#ef4444', display: 'flex', justifyContent: 'center' }}>
                    <Plus size={18} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setSetlist([...setlist, {song_id: '', lead_id: '', selected_key: ''}])} 
                className="btn-secondary" 
                style={{ fontSize: '0.8rem', marginTop: '0.5rem', borderStyle: 'dashed', background: 'transparent' }}
              >
                + Añadir Canción
              </button>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={closeModal} className="btn-secondary" style={{ flex: 1 }}>Volver</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? '...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TeamList({ members, isDirector, refreshData }) {
  const handleChangeRole = async (userId, newRole) => {
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (refreshData) refreshData();
    } catch (e) { alert("Error de base de datos o permisos (RLS)."); }
  };

  return (
    <section className="glass-panel" style={{ padding: '2rem' }}>
      <h3 className="section-title"><Users size={20} color="var(--primary)" /> Equipo</h3>
      <div style={{ marginTop: '1rem' }}>
        {members?.length === 0 ? ( <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Manda la llave de acceso a tu banda.</p> ) : (
          members?.map(m => (
            <div key={m.id} className="list-item" style={{ background: 'transparent' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                 <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: m.role==='director'? 'var(--primary)': 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800', color: m.role==='director'?'white':'#fff', flexShrink: 0 }}>
                   {m.full_name?.[0]?.toUpperCase()}
                 </div>
                 <div style={{ flex: 1, overflow: 'hidden' }}>
                   <div style={{ fontSize: '0.95rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{m.full_name}</div>
                 </div>
                 {isDirector ? (
                   <select 
                     value={m.role}
                     onChange={(e) => handleChangeRole(m.id, e.target.value)}
                     style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', textTransform: 'uppercase', outline: 'none', cursor: 'pointer' }}
                   >
                     <option value="director">Director</option>
                     <option value="staff">Staff</option>
                     <option value="musico">Músico</option>
                   </select>
                 ) : (
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.role}</div>
                 )}
               </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

