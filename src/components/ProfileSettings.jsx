import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Calendar, Save, Trash2, Camera, Loader2, Plus, LogOut, Bell, Mail, Building2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { alertDialog } from '../utils/dialogService';

export default function ProfileSettings({ profile, session, onLogout }) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [blockedDates, setBlockedDates] = useState(profile?.blocked_dates || []);
  const [loading, setLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [notifPermission, setNotifPermission] = useState(() => typeof window !== 'undefined' && window.Notification ? Notification.permission : 'default');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  const userEmail = session?.user?.email || profile?.email || '';
  const orgName = profile?.organizations?.name || '';

  const checkNotifStatus = () => {
    if (typeof window !== 'undefined' && window.Notification) {
      setNotifPermission(Notification.permission);
    }
  };

  // Sincronizar estado local si el profile cambia, y limpiar fechas que ya
  // pasaron (no tiene sentido seguir bloqueando un día que ya ocurrió).
  useEffect(() => {
    setFullName(profile?.full_name || '');
    const allDates = profile?.blocked_dates || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const futureDates = allDates.filter(d => d >= todayStr);
    setBlockedDates(futureDates);

    // Si había fechas vencidas, limpiarlas también en la base de datos
    // silenciosamente, para que no se acumulen para siempre.
    if (futureDates.length !== allDates.length && profile?.id) {
      supabase.from('profiles').update({ blocked_dates: futureDates }).eq('id', profile.id);
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          blocked_dates: blockedDates
        })
        .eq('id', profile.id);

      if (error) throw error;
      setSuccessMsg('Perfil actualizado correctamente.');
      
      // Auto ocultar mensaje
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      alertDialog("Error al guardar perfil: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const addBlockedDate = () => {
    if (!newDate) return;
    if (blockedDates.includes(newDate)) return; // No duplicados
    setBlockedDates([...blockedDates, newDate].sort());
    setNewDate('');
  };

  // Borrado inmediato: no depende de que el usuario recuerde darle a "Guardar
  // Cambios" después — al quitar una fecha, se persiste de una vez.
  const removeBlockedDate = async (date) => {
    const next = blockedDates.filter(d => d !== date);
    setBlockedDates(next);
    try {
      await supabase.from('profiles').update({ blocked_dates: next }).eq('id', profile.id);
    } catch (e) {
      alertDialog('Error al borrar la fecha: ' + e.message);
      setBlockedDates(blockedDates); // revertir si falló
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg('');
    if (!newPassword || newPassword.length < 6) {
      alertDialog('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alertDialog('Las contraseñas no coinciden.');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg('Contraseña actualizada correctamente.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch (e) {
      alertDialog('Error al cambiar la contraseña: ' + e.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={32} color="var(--primary)" /> Mi Perfil
        </h2>
        {onLogout && (
          <button onClick={onLogout} className="btn-secondary-outline" style={{ border: '1px solid #ef4444', color: '#ef4444' }}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} color="var(--primary)" /> Información Básica
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '500px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre Completo</label>
            <input
              type="text"
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              <Mail size={14} /> Correo Registrado
            </label>
            <input
              type="text"
              className="input-field"
              value={userEmail}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              <Building2 size={14} /> Organización
            </label>
            <input
              type="text"
              className="input-field"
              value={orgName || 'Sin organización'}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1' }}>
          <KeyRound size={20} color="#6366f1" /> Cambiar Contraseña
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '500px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nueva Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Confirmar Contraseña</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {passwordMsg && <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{passwordMsg}</span>}
            <button onClick={handleChangePassword} className="btn-secondary" disabled={passwordLoading} style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              {passwordLoading ? <Loader2 size={18} className="animate-spin" /> : <><KeyRound size={16} /> Actualizar Contraseña</>}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
          <Bell size={20} color="#10b981" /> Notificaciones Push
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Activa las notificaciones en este dispositivo para recibir alertas instantáneas cuando el director te asigne a un evento nuevo o envíe el Call-Sheet.
        </p>
        
        {notifPermission === 'granted' && (
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} />
            <span>¡Notificaciones Push <strong>Activadas</strong> en este navegador!</span>
          </div>
        )}

        {notifPermission === 'denied' && (
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={20} />
              <span>Notificaciones bloqueadas o no soportadas.</span>
            </div>
            <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.8 }}>
              {typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream 
                ? "🍎 En iPhone/iPad: Primero debes tocar el ícono de 'Compartir' (cuadro con flecha arriba) en la barra de abajo y seleccionar 'Agregar a la Pantalla de Inicio'. Luego abre Bandly desde tu pantalla de inicio."
                : "Haz clic en el ícono del candado 🔒 en la barra de direcciones de arriba, busca 'Notificaciones', cámbialo a 'Permitir' y recarga la página."
              }
            </p>
          </div>
        )}

        {notifPermission === 'default' && (
          <button 
            type="button"
            className="btn-primary"
            style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.5rem', width: 'auto' }}
            onClick={() => {
              if ('Notification' in window) {
                 Notification.requestPermission().then((permission) => {
                   checkNotifStatus();
                   if (permission === 'granted' && window.OneSignal) {
                     window.OneSignal.Notifications.requestPermission().catch(()=>{});
                   }
                 });
              } else {
                 const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                 if (isIOS) {
                   alertDialog("🍎 Para recibir notificaciones en iPhone/iPad, primero debes instalar la app:\n\n1. Toca el botón de 'Compartir' (el cuadrado con la flecha hacia arriba) en la barra de tu navegador.\n2. Selecciona 'Agregar a la Pantalla de Inicio'.\n3. Abre Bandly desde tu pantalla de inicio y vuelve a intentar.");
                 } else {
                   alertDialog("Tu navegador actual no soporta Notificaciones Push. Intenta usar Chrome, Firefox o Edge.");
                 }
              }
            }}
          >
            <Bell size={18} /> Solicitar Permiso de Notificaciones
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
          <Calendar size={20} color="#f59e0b" /> Bloqueo de Fechas (Disponibilidad)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Selecciona las fechas en las que <strong>no estarás disponible</strong>. Los directores verán esta información en el calendario y no podrán asignarte en esos días.
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', maxWidth: '400px' }}>
          <input 
            type="date" 
            className="input-field" 
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={addBlockedDate} className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1rem' }}>
            <Plus size={18} /> Bloquear
          </button>
        </div>

        {blockedDates.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {blockedDates.map(date => (
              <div key={date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fecaca', fontWeight: '500' }}>
                  <Calendar size={16} color="#ef4444" /> {formatDate(date)}
                </span>
                <button onClick={() => removeBlockedDate(date)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Calendar size={32} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-muted)' }}>No tienes fechas bloqueadas.</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'flex-end' }}>
        {successMsg && <span style={{ color: '#22c55e', fontWeight: 'bold', animation: 'modalFadeIn 0.3s ease-out' }}>{successMsg}</span>}
        <button onClick={handleSave} className="btn-primary" disabled={loading} style={{ width: 'auto', minWidth: '150px' }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Guardar Cambios</>}
        </button>
      </div>
    </div>
  );
}
