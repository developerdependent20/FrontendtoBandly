import React, { useState } from 'react';
import { ShieldCheck, Users, Loader2, ChevronRight, ChevronLeft, Plus, X, Star, Monitor, Calendar as CalendarIcon, FileText, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import TermsModal from '../components/TermsModal';
import { alertDialog } from '../utils/dialogService';

const DEFAULT_INSTRUMENTS = [
  { id: 'bateria', label: 'Batería', icon: '🥁' },
  { id: 'bajo', label: 'Bajo', icon: '🎸' },
  { id: 'guitarra', label: 'Guitarra', icon: '🎸' },
  { id: 'piano', label: 'Teclado', icon: '🎹' },
  { id: 'voz', label: 'Voz/Cantante', icon: '🎤' },
  { id: 'percusion', label: 'Percusión', icon: '🪘' }
];

const DEFAULT_ADMIN_ROLES = [
  { id: 'director_musical', label: 'Director Musical', icon: '🎼' },
  { id: 'eventos', label: 'Dir. Eventos', icon: '📅' },
  { id: 'media', label: 'Media/Visuales', icon: '📽️' },
  { id: 'sonido', label: 'Audio/Sonido', icon: '🎛️' },
  { id: 'logistica', label: 'Staff/Logística', icon: '📋' }
];

const DEFAULT_FUNCTIONS = [
  { id: 'musico', label: 'Músico', icon: '🎸' },
  { id: 'audio', label: 'Audio', icon: '🎚️' },
  { id: 'media', label: 'Media/Visuales', icon: '📽️' },
  { id: 'staff', label: 'Staff/Logística', icon: '📋' },
  { id: 'bienvenida', label: 'Bienvenida', icon: '🤝' },
  { id: 'maestro', label: 'Maestro', icon: '🎓' },
  { id: 'voluntario', label: 'Voluntario', icon: '🌟' }
];

export default function OnboardingScreen({ session, fetchProfile }) {
  const urlParams = new URLSearchParams(window.location.search);
  const magicCode = urlParams.get('join');

  const [roleMode, setRoleMode] = useState(magicCode ? 'member' : null); 
  const [currentStep, setCurrentStep] = useState(magicCode ? 1 : 0);
  
  const [orgName, setOrgName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState(magicCode || '');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [instruments, setInstruments] = useState(DEFAULT_INSTRUMENTS);
  const [newInstrumentLabel, setNewInstrumentLabel] = useState('');
  
  const [adminRoles, setAdminRoles] = useState(DEFAULT_ADMIN_ROLES);
  const [newRoleLabel, setNewRoleLabel] = useState('');

  const [selectedFunctions, setSelectedFunctions] = useState([]);
  const [tourSlide, setTourSlide] = useState(0);

  const toggleFunction = (id) => {
    setSelectedFunctions(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const addInstrument = () => {
    if(!newInstrumentLabel.trim()) return;
    const newId = newInstrumentLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setInstruments([...instruments, { id: newId, label: newInstrumentLabel, icon: '🎵' }]);
    setNewInstrumentLabel('');
  };
  
  const removeInstrument = (id) => {
    setInstruments(instruments.filter(i => i.id !== id));
  };

  const addRole = () => {
    if(!newRoleLabel.trim()) return;
    const newId = newRoleLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setAdminRoles([...adminRoles, { id: newId, label: newRoleLabel, icon: '⭐' }]);
    setNewRoleLabel('');
  };

  const removeRole = (id) => {
    setAdminRoles(adminRoles.filter(r => r.id !== id));
  };

  const createOrganization = async () => {
    if(!termsAccepted) { alertDialog("Debes aceptar los términos de servicio para continuar."); return; }
    setLoading(true);
    try {
      const code = inviteCodeInput.toUpperCase().replace(/\s+/g, '');
      
      const settingsObj = {
        instruments: instruments,
        roles: adminRoles,
        onboarding_completed: true
      };

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ 
           name: orgName, 
           invite_code: code,
           settings: settingsObj
        }])
        .select().single();
      
      if (orgError) {
        if (orgError.code === '23505') throw new Error('Ese código de equipo ya está en uso. ¡Elige otro!');
        throw orgError;
      }

      const { error: profError } = await supabase.from('profiles').insert([{ 
        id: session.user.id, 
        full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0], 
        email: session.user.email, 
        role: 'director',
        functions: ['director'],
        org_id: org.id,
        accepted_terms: true
      }]);
      if (profError) throw profError;
      
      await fetchProfile(session.user.id);
    } catch (e) {
      alertDialog(e.message);
      setLoading(false);
    }
  };

  const joinByCode = async () => {
    if (!inviteCodeInput) { alertDialog("Ingresa un código"); return; }
    if (!termsAccepted) { alertDialog("Debes aceptar los términos de servicio."); return; }
    if (selectedFunctions.length === 0) { alertDialog("Por favor selecciona al menos una función."); return; }
    
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
        role: 'member',
        functions: selectedFunctions,
        org_id: org.id,
        accepted_terms: true
      }]);
      if (profError) throw profError;

      await fetchProfile(session.user.id);
    } catch (e) {
      alertDialog(e.message);
      setLoading(false);
    }
  };

  const renderRoleSelection = () => (
    <>
      <h2 className="hero-title" style={{ fontSize: '3rem' }}>¡Hola, {session.user.user_metadata?.full_name?.split(' ')[0] || 'Músico'}!</h2>
      <p className="hero-subtitle" style={{ marginBottom: '3rem' }}>Para comenzar tu experiencia en Bandly, selecciona tu rol principal:</p>
      <div className="role-grid">
        <div className="glass-panel role-card" onClick={() => { setRoleMode('director'); setCurrentStep(1); }}>
          <div className="role-icon"><ShieldCheck size={32} /></div>
          <h3>Director de la Organización</h3>
          <p style={{ color: 'var(--text-muted)' }}>Crea un nuevo equipo, personaliza instrumentos y administra roles.</p>
        </div>
        <div className="glass-panel role-card" onClick={() => { setRoleMode('member'); setCurrentStep(1); }}>
          <div className="role-icon"><Users size={32} /></div>
          <h3>Staff / Músico</h3>
          <p style={{ color: 'var(--text-muted)' }}>Conéctate a un equipo existente con un código de invitación.</p>
        </div>
      </div>
    </>
  );

  const renderDirectorStep1 = () => (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <h3 className="section-title">Datos Base de tu Equipo</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Define el nombre de tu organización y un código secreto único que usarán tus miembros para unirse.</p>
      
      <div className="input-group">
        <label style={{ textAlign: 'left', fontWeight: 'bold' }}>Nombre del Equipo/Organización</label>
        <input type="text" placeholder="Ej: The Groove Collective" className="input-field" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
        
        <label style={{ textAlign: 'left', fontWeight: 'bold', marginTop: '1rem' }}>Código Secreto de Invitación</label>
        <input type="text" placeholder="Ej: CENTRAL24" className="input-field" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} style={{ textTransform: 'uppercase' }} />
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={() => setCurrentStep(0)} className="btn-secondary-outline" style={{ flex: 1 }}>Volver</button>
          <button 
            onClick={() => {
              if(!orgName || !inviteCodeInput) return alertDialog("Completa ambos campos.");
              setCurrentStep(2);
            }} 
            className="btn-primary" 
            style={{ flex: 2 }}
          >Siguiente <ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );

  const renderDirectorStep2 = () => (
    <div className="glass-panel" style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
      <h3 className="section-title">Personaliza tus Instrumentos</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
        Las bandas varían mucho. ¿Tienes metales (Brass), sección de cuerdas, o tal vez varios tecladistas? 
        Añade o elimina los instrumentos específicos que conforman tu ensamble.
      </p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '2rem' }}>
        {instruments.map(inst => (
          <div key={inst.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(37, 99, 235, 0.2)', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid var(--primary)' }}>
            <span style={{ marginRight: '8px' }}>{inst.icon}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{inst.label}</span>
            <button onClick={() => removeInstrument(inst.id)} style={{ background: 'transparent', border: 'none', color: 'white', marginLeft: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Añadir instrumento (Ej: Trompeta, Violín, Synth...)" 
          className="input-field" 
          style={{ flex: 1 }}
          value={newInstrumentLabel} 
          onChange={(e) => setNewInstrumentLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addInstrument()}
        />
        <button onClick={addInstrument} className="btn-secondary" style={{ width: 'auto' }}><Plus size={18} /> Añadir</button>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={() => setCurrentStep(1)} className="btn-secondary-outline" style={{ flex: 1 }}><ChevronLeft size={18} /> Atrás</button>
        <button onClick={() => setCurrentStep(3)} className="btn-primary" style={{ flex: 2 }}>Continuar <ChevronRight size={18} /></button>
      </div>
    </div>
  );

  const renderDirectorStep3 = () => (
    <div className="glass-panel" style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
      <h3 className="section-title">Tipos de Administradores / Roles</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
        Define las diferentes áreas que existen en tu equipo. Además de lo musical, puedes agregar administradores para Eventos, Decoración, Logística, Streaming, etc.
      </p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '2rem' }}>
        {adminRoles.map(role => (
          <div key={role.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(168, 85, 247, 0.2)', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid rgba(168, 85, 247, 0.5)' }}>
            <span style={{ marginRight: '8px' }}>{role.icon}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{role.label}</span>
            <button onClick={() => removeRole(role.id)} style={{ background: 'transparent', border: 'none', color: 'white', marginLeft: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Añadir rol (Ej: Decoración, Streaming...)" 
          className="input-field" 
          style={{ flex: 1 }}
          value={newRoleLabel} 
          onChange={(e) => setNewRoleLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRole()}
        />
        <button onClick={addRole} className="btn-secondary" style={{ width: 'auto' }}><Plus size={18} /> Añadir</button>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={() => setCurrentStep(2)} className="btn-secondary-outline" style={{ flex: 1 }}><ChevronLeft size={18} /> Atrás</button>
        <button onClick={() => setCurrentStep(4)} className="btn-primary" style={{ flex: 2 }}>Continuar al Tour <ChevronRight size={18} /></button>
      </div>
    </div>
  );

  const renderDirectorStep4 = () => {
    const slides = [
      {
        icon: <Star size={40} color="var(--primary)" />,
        title: "Todo en un solo lugar",
        desc: "Dependiendo de tu plan (Básico, Starter, Pro o Elite), Bandly se adaptará para darte las herramientas exactas. Maneja desde un grupo pequeño hasta producciones masivas."
      },
      {
        icon: <FileText size={40} color="#a855f7" />,
        title: "Chart Builder y Visor",
        desc: "Crea y edita acordes (charts) fácilmente. Tu equipo podrá verlos en tiempo real desde cualquier dispositivo, transponerlos al vuelo y ensayar sin distracciones."
      },
      {
        icon: <CalendarIcon size={40} color="#22c55e" />,
        title: "Planificador de Eventos",
        desc: "Arma tus servicios o shows arrastrando canciones. Asigna músicos a cada fecha según la instrumentación que acabas de configurar y notifícalos al instante."
      },
      {
        icon: <Download size={40} color="#eab308" />,
        title: "Instala la App y Sube Stems",
        desc: "Recuerda a tu equipo usar la opción 'Agregar a Inicio' para instalar Bandly como app (PWA). Sube tus multitracks y reprodúcelos en vivo con nuestro motor de latencia cero."
      }
    ];

    const slide = slides[tourSlide];

    return (
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }}>
            {slide.icon}
          </div>
        </div>
        <h3 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{slide.title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '3rem', minHeight: '80px' }}>
          {slide.desc}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '3rem' }}>
          {slides.map((_, idx) => (
            <div key={idx} style={{ width: '10px', height: '10px', borderRadius: '50%', background: idx === tourSlide ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }} />
          ))}
        </div>

        {tourSlide < slides.length - 1 ? (
           <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setTourSlide(prev => prev + 1)} className="btn-primary" style={{ flex: 1 }}>Siguiente <ChevronRight size={18} /></button>
           </div>
        ) : (
           <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', textAlign: 'left' }}>
                 <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                   Acepto los <span onClick={() => setShowTerms(true)} style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>Términos de Servicio</span> para crear mi organización.
                 </span>
             </div>
             <button onClick={createOrganization} className="btn-primary" style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem' }}>¡Crear Organización Ahora!</button>
           </div>
        )}
      </div>
    );
  };

  const renderMemberStep = () => (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <h3 className="section-title">Ingreso al Equipo</h3>
      <div className="input-group">
        <input type="text" placeholder="Código del Equipo (Ej: CENTRAL24)" className="input-field" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} disabled={!!magicCode}/>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', marginTop: '1rem' }}>
          Selecciona tus funciones principales (puedes elegir varias):
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
          {DEFAULT_FUNCTIONS.map(func => (
            <div 
              key={func.id}
              onClick={() => toggleFunction(func.id)}
              style={{
                padding: '0.8rem',
                borderRadius: '10px',
                background: selectedFunctions.includes(func.id) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                border: '1px solid',
                borderColor: selectedFunctions.includes(func.id) ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s'
              }}
            >
              <span>{func.icon}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: selectedFunctions.includes(func.id) ? 'bold' : 'normal' }}>{func.label}</span>
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', textAlign: 'left' }}>
           <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
           <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
             Acepto los <span onClick={() => setShowTerms(true)} style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>Términos de Servicio</span>.
           </span>
        </div>

        <button onClick={joinByCode} className="btn-primary" style={{ width: '100%' }}>Unirme con mis funciones</button>
        {!magicCode && <button onClick={() => setCurrentStep(0)} className="btn-secondary-outline" style={{ width: '100%', marginTop: '1rem' }}>Volver</button>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="center-layout">
        <Loader2 className="spin-slow" size={48} color="var(--primary)" />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Configurando tu espacio...</p>
      </div>
    );
  }

  return (
    <div className="center-layout" style={{ minHeight: '100vh', padding: '4rem 2rem' }}>
      {currentStep === 0 && renderRoleSelection()}
      {roleMode === 'director' && currentStep === 1 && renderDirectorStep1()}
      {roleMode === 'director' && currentStep === 2 && renderDirectorStep2()}
      {roleMode === 'director' && currentStep === 3 && renderDirectorStep3()}
      {roleMode === 'director' && currentStep === 4 && renderDirectorStep4()}
      
      {roleMode === 'member' && currentStep === 1 && renderMemberStep()}
      
      {currentStep === 0 && (
        <button onClick={() => supabase.auth.signOut()} className="btn-secondary" style={{ marginTop: '3rem', border: 'none', background: 'transparent', width: 'auto' }}>
          Cerrar Sesión
        </button>
      )}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
