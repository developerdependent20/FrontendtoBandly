import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Loader2, ChevronRight, ChevronLeft, Plus, X, Star, Monitor, Calendar as CalendarIcon, FileText, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import TermsModal from '../components/TermsModal';
import { alertDialog } from '../utils/dialogService';
import { DEFAULT_INSTRUMENTS, DEFAULT_DEPARTMENTS } from '../utils/defaultRoles';
import { migrateSettings } from '../hooks/useOrgData';

const DEFAULT_ADMIN_ROLES = [
  { id: 'director_musical', label: 'Director Musical', icon: '🎼' },
  { id: 'eventos', label: 'Dir. Eventos', icon: '📅' },
  { id: 'media', label: 'Media/Visuales', icon: '📽️' },
  { id: 'sonido', label: 'Audio/Sonido', icon: '🎛️' },
  { id: 'logistica', label: 'Staff/Logística', icon: '📋' }
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
  const [codeTouched, setCodeTouched] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);

  // Equipo al que se está uniendo alguien por código: se resuelve ANTES de
  // pedirle sus funciones, para poder ofrecerle los roles REALES de ese
  // equipo (bateria, guitarra, sonido...) en vez de una lista genérica aparte
  // que no coincidía con los ids que usa "sugeridos" al agendar.
  const [resolvedOrg, setResolvedOrg] = useState(null); // { org_id, org_name, roleOptions }
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Sugerir el código a partir del nombre del equipo.
  // Antes había que inventárselo de la nada, y si ya estaba ocupado te
  // enterabas DOS MINUTOS después, al terminar el tour. Ahora llega escrito y
  // se comprueba antes de avanzar.
  const suggestCode = (name) => {
    const base = (name || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    if (!base) return '';
    return `${base}${new Date().getFullYear().toString().slice(-2)}`;
  };

  const handleOrgNameChange = (value) => {
    setOrgName(value);
    if (!codeTouched) setInviteCodeInput(suggestCode(value));
  };

  // Comprobar disponibilidad antes de dejar avanzar: fallar aquí cuesta 3
  // segundos, fallar al final cuesta volver a empezar.
  const validateStep1 = async () => {
    if (!orgName.trim()) return alertDialog('Ponle un nombre a tu equipo.');
    if (!inviteCodeInput.trim()) return alertDialog('Necesitas un código para que tu equipo se una.');

    setCheckingCode(true);
    try {
      const { data } = await supabase.rpc('resolve_invite_code', { p_code: inviteCodeInput });
      // ok:true significa que ese código YA pertenece a otra organización.
      if (data?.ok) {
        alertDialog('Ese código ya está en uso por otro equipo. Prueba con otro.');
        return;
      }
      setCurrentStep(2);
    } catch {
      // Si la comprobación falla (sin red, por ejemplo) se deja continuar:
      // el servidor la vuelve a hacer al crear, así que no se pierde nada.
      setCurrentStep(2);
    } finally {
      setCheckingCode(false);
    }
  };

  const toggleFunction = (id) => {
    setSelectedFunctions(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const verifyMemberCode = async () => {
    if (!inviteCodeInput.trim()) { alertDialog('Ingresa el código de tu equipo.'); return; }
    setVerifyingCode(true);
    try {
      const { data: resolved, error } = await supabase.rpc('resolve_invite_code', { p_code: inviteCodeInput });
      if (error) throw new Error(error.message);
      if (!resolved?.ok) throw new Error(resolved?.error || 'Código de acceso inválido.');
      const departments = migrateSettings(resolved.org_settings)?.departments || DEFAULT_DEPARTMENTS;
      const roleOptions = departments.flatMap(d => d.roles || []);
      setResolvedOrg({ org_id: resolved.org_id, org_name: resolved.org_name, roleOptions });
    } catch (e) {
      alertDialog(e.message);
    } finally {
      setVerifyingCode(false);
    }
  };

  // Enlace mágico (?join=CODIGO): el código ya viene fijo y deshabilitado,
  // así que se verifica solo en vez de obligar a tocar un botón de más.
  useEffect(() => {
    if (magicCode) verifyMemberCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // Se guarda directo en "departments" (el formato que ya usa
      // OrgSettingsModal) en vez de los campos sueltos "instruments"/"roles"
      // de antes: esos dos migrateSettings (useOrgData.js) nunca los leía —
      // solo mira settings.leadership/production/logistics/instruments — así
      // que la personalización de roles del paso 3 del onboarding se guardaba
      // pero jamás se aplicaba; el equipo terminaba siempre con los roles de
      // liderazgo/producción/logística por defecto.
      const settingsObj = {
        departments: [
          { id: 'admin', title: 'Roles de Administrador', icon: '⭐', colorClass: 'purple', roles: adminRoles },
          { id: 'instruments', title: 'Instrumentos y Operación (Músicos)', icon: '🎵', colorClass: 'blue', roles: instruments }
        ],
        onboarding_completed: true
      };

      // La ficha va primero: crear la organización del lado del servidor ya
      // registra la membresía, y esa membresía apunta a este perfil.
      const { error: profError } = await supabase.from('profiles').upsert([{
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        email: session.user.email,
        role: 'director',
        functions: ['director'],
        accepted_terms: true
      }]);
      if (profError) throw profError;

      // El servidor valida cuántas organizaciones permite tu plan (1 / 3 / 10 /
      // ilimitadas) antes de crearla, y te deja adentro como director.
      const { data: res, error: orgError } = await supabase.rpc('create_organization', {
        p_name: orgName,
        p_invite_code: code,
        p_settings: settingsObj,
      });
      if (orgError) throw orgError;
      if (!res?.ok) throw new Error(res?.error || 'No se pudo crear la organización.');

      await fetchProfile(session.user.id);
    } catch (e) {
      alertDialog(e.message);
      setLoading(false);
    }
  };

  const joinByCode = async () => {
    if (!resolvedOrg) { alertDialog("Verifica el código de tu equipo primero."); return; }
    if (!termsAccepted) { alertDialog("Debes aceptar los términos de servicio."); return; }
    if (selectedFunctions.length === 0) { alertDialog("Por favor selecciona al menos una función."); return; }

    setLoading(true);
    try {
      // El perfil se crea "en blanco" — sin org_id ni role puestos por el
      // cliente. Quien decide dónde y con qué rol queda es join_organization()
      // del lado del servidor, que valida el código y el cupo del plan antes
      // de escribir nada (la política de INSERT de profiles ahora exige
      // exactamente esto: role='member' y org_id=NULL en el alta).
      const { error: profError } = await supabase.from('profiles').upsert([{
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        email: session.user.email,
        role: 'member',
        org_id: null,
        accepted_terms: true
      }]);
      if (profError) throw profError;

      const { data: result, error: joinError } = await supabase.rpc('join_organization', {
        p_code: inviteCodeInput,
        p_functions: selectedFunctions
      });
      if (joinError) throw new Error(joinError.message);
      if (!result?.ok) throw new Error(result?.error || 'No se pudo unir al equipo.');

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
        <label style={{ textAlign: 'left', fontWeight: '500' }}>Nombre del Equipo/Organización</label>
        <input type="text" placeholder="Ej: The Groove Collective" className="input-field" value={orgName} onChange={(e) => handleOrgNameChange(e.target.value)} />

        <label style={{ textAlign: 'left', fontWeight: '500', marginTop: '1rem' }}>Código de Invitación</label>
        <input
          type="text"
          placeholder="Se llena solo con el nombre"
          className="input-field"
          value={inviteCodeInput}
          onChange={(e) => { setCodeTouched(true); setInviteCodeInput(e.target.value.toUpperCase()); }}
          style={{ textTransform: 'uppercase' }}
        />
        <p style={{ textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
          Este es el código que le vas a pasar a tu equipo para que entre. Puedes cambiarlo.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={() => setCurrentStep(0)} className="btn-secondary-outline" style={{ flex: 1 }}>Volver</button>
          <button
            onClick={validateStep1}
            disabled={checkingCode}
            className="btn-primary"
            style={{ flex: 2 }}
          >
            {checkingCode ? 'Comprobando…' : <>Siguiente <ChevronRight size={18} /></>}
          </button>
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
          <div key={inst.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(247, 244, 239, 0.11)', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid var(--primary)' }}>
            <span style={{ marginRight: '8px' }}>{inst.icon}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{inst.label}</span>
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

      {/* Salida rápida: nadie que acaba de registrarse sabe todavía si necesita
          "Metales" o "Streaming". Obligarlo a decidirlo antes de ver el producto
          era la fricción más grande del registro — y estas dos pantallas ya
          existen dentro de la app, en Equipo → Configurar Departamentos. */}
      <button
        onClick={() => setCurrentStep(4)}
        style={{
          width: '100%', marginTop: '1rem', background: 'transparent', border: 'none',
          color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', padding: '10px'
        }}
      >
        Usar lo que viene por defecto — lo configuro después
      </button>
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
          <div key={role.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(247, 244, 239, 0.11)', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid rgba(247, 244, 239, 0.3)' }}>
            <span style={{ marginRight: '8px' }}>{role.icon}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{role.label}</span>
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

      <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1rem', lineHeight: 1.5 }}>
        Todo esto lo puedes cambiar cuando quieras desde <strong>Equipo → Configurar Departamentos</strong>.
      </p>
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
        icon: <FileText size={40} color="#f7f4ef" />,
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
        {!resolvedOrg ? (
          <>
            <input
              type="text"
              placeholder="Código del Equipo (Ej: CENTRAL24)"
              className="input-field"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyMemberCode()}
              disabled={!!magicCode || verifyingCode}
            />
            <button onClick={verifyMemberCode} disabled={verifyingCode} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              {verifyingCode ? 'Verificando…' : <>Verificar Código <ChevronRight size={18} /></>}
            </button>
            {!magicCode && <button onClick={() => setCurrentStep(0)} className="btn-secondary-outline" style={{ width: '100%', marginTop: '1rem' }}>Volver</button>}
          </>
        ) : (
          <>
            <div style={{ padding: '0.8rem 1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', color: '#22c55e', fontWeight: '500', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              ✓ Te vas a unir a: {resolvedOrg.org_name}
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Selecciona tus funciones dentro de este equipo (puedes elegir varias):
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
              {resolvedOrg.roleOptions.map(func => (
                <div
                  key={func.id}
                  onClick={() => toggleFunction(func.id)}
                  style={{
                    padding: '0.8rem',
                    borderRadius: '12px',
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
            {!magicCode && (
              <button onClick={() => setResolvedOrg(null)} className="btn-secondary-outline" style={{ width: '100%', marginTop: '1rem' }}>
                <ChevronLeft size={18} /> Cambiar código
              </button>
            )}
          </>
        )}
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

  // Cuántos pasos faltan. Sin esto el registro se sentía sin fondo: no había
  // forma de saber si quedaba un paso o siete.
  const renderProgress = () => {
    if (roleMode !== 'director' || currentStep < 1 || currentStep > 4) return null;
    const labels = ['Tu equipo', 'Instrumentos', 'Departamentos', 'Listo'];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.8rem' }}>
        {labels.map((label, i) => {
          const n = i + 1;
          const done = currentStep > n;
          const active = currentStep === n;
          return (
            <React.Fragment key={label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.68rem', fontWeight: 500,
                  background: done || active ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                  color: done || active ? '#fff' : 'rgba(255,255,255,0.4)',
                }}>
                  {done ? '✓' : n}
                </div>
                <span className="hide-mobile" style={{
                  fontSize: '0.72rem', fontWeight: 500,
                  color: active ? '#fff' : 'rgba(255,255,255,0.35)'
                }}>{label}</span>
              </div>
              {n < labels.length && (
                <div style={{ flex: 1, height: '2px', background: done ? 'var(--primary)' : 'rgba(255,255,255,0.08)', borderRadius: '6px' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="center-layout" style={{ minHeight: '100vh', padding: '4rem 2rem' }}>
      <div style={{ width: '100%', maxWidth: '700px' }}>{renderProgress()}</div>
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
