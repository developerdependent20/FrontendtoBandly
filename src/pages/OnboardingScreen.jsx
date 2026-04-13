import React, { useState } from 'react';
import { ShieldCheck, Users, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import TermsModal from '../components/TermsModal';

export default function OnboardingScreen({ session, fetchProfile }) {
  const urlParams = new URLSearchParams(window.location.search);
  const magicCode = urlParams.get('join');

  const [roleMode, setRoleMode] = useState(magicCode ? 'member' : null); 
  const [orgName, setOrgName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState(magicCode || '');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const createOrganization = async () => {
    if(!orgName || !inviteCodeInput) { alert("Por favor ingresa nombre y un código para la banda."); return; }
    if(!termsAccepted) { alert("Debes aceptar los términos de servicio."); return; }
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
        org_id: org.id,
        accepted_terms: true
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
    if (!termsAccepted) { alert("Debes aceptar los términos de servicio."); return; }
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
        org_id: org.id,
        accepted_terms: true
      }]);
      if (profError) throw profError;

      await fetchProfile(session.user.id);
    } catch (e) {
      alert(e.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="center-layout">
        <Loader2 className="spin-slow" size={48} color="var(--primary)" />
      </div>
    );
  }

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
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                   Acepto los <span onClick={() => setShowTerms(true)} style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>Términos de Servicio</span>.
                 </span>
              </div>

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
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                   Acepto los <span onClick={() => setShowTerms(true)} style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>Términos de Servicio</span>.
                 </span>
              </div>

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
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
