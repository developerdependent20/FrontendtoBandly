import React, { useEffect, useState } from 'react';
import { Building2, Database, HardDrive, Search, Users, Mail, ShieldCheck, Calendar } from 'lucide-react';
import { alertDialog, confirmDialog } from '../../utils/dialogService';

const getToken = () => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('auth-token')) {
      try { const t = JSON.parse(localStorage.getItem(key))?.access_token; if (t) return t; } catch {}
    }
  }
  return null;
};

const AdminPanel = ({ onInspect }) => {
  const [activeTab, setActiveTab] = useState('bands');

  // ── BANDS state ──
  const [orgs, setOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState(null);
  const [orgsSearch, setOrgsSearch] = useState('');

  // ── USERS state ──
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersFetched, setUsersFetched] = useState(false);

  useEffect(() => { fetchOrgs(); }, []);

  useEffect(() => {
    if (activeTab === 'users' && !usersFetched) fetchUsers();
  }, [activeTab, usersFetched]);

  const fetchOrgs = async () => {
    setOrgsLoading(true);
    try {
      const res = await fetch('https://bandly-backend.onrender.com/api/admin/organizations', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) { const e = await res.json(); setOrgsError(e.details || e.error || 'Error'); return; }
      const data = await res.json();
      setOrgs(Array.isArray(data) ? data : []);
    } catch (err) { setOrgsError(err.message); }
    finally { setOrgsLoading(false); }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('https://bandly-backend.onrender.com/api/admin/users', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) { const e = await res.json(); setUsersError(e.details || e.error || 'Error al cargar usuarios'); return; }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      setUsersFetched(true);
    } catch (err) { setUsersError(err.message); }
    finally { setUsersLoading(false); }
  };

  const handleSync = async () => {
    if (!(await confirmDialog('Sincronizar almacenamiento de todas las bandas?'))) return;
    setOrgsLoading(true);
    try {
      await fetch('https://bandly-backend.onrender.com/api/admin/sync-storage', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      await fetchOrgs();
    } catch { alertDialog('Error en sincronizacion'); }
    finally { setOrgsLoading(false); }
  };

  const filteredOrgs = orgs.filter(o =>
    o.name?.toLowerCase().includes(orgsSearch.toLowerCase()) ||
    o.invite_code?.toLowerCase().includes(orgsSearch.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(usersSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(usersSearch.toLowerCase()) ||
    u.org_name?.toLowerCase().includes(usersSearch.toLowerCase())
  );

  const TAB_STYLE = (active) => ({
    padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
    fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.5px', transition: 'all 0.15s',
    background: active ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
    color: active ? '#a855f7' : 'rgba(255,255,255,0.4)',
    borderBottom: active ? '2px solid #a855f7' : '2px solid transparent',
  });

  const planBadge = (plan) => {
    const colors = { pro: '#a855f7', elite: '#ef4444', starter: '#3b82f6' };
    const c = colors[plan?.toLowerCase()] || 'rgba(255,255,255,0.15)';
    return (
      <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '4px', background: c, color: '#fff', fontWeight: '800', letterSpacing: '0.5px' }}>
        {(plan || 'FREE').toUpperCase()}
      </span>
    );
  };

  const roleColor = (role) => role === 'director' ? '#10b981' : 'rgba(255,255,255,0.35)';

  return (
    <div style={{ padding: '2rem', color: '#fff', minHeight: '100%' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>PANEL DE CONTROL</h1>
          <p style={{ opacity: 0.4, fontSize: '0.8rem', margin: '4px 0 0' }}>Gestion global de Bandly</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#a855f7' }}>{orgs.length}</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>Bandas</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#10b981' }}>{users.length || '—'}</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>Usuarios</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0' }}>
        <button style={TAB_STYLE(activeTab === 'bands')} onClick={() => setActiveTab('bands')}>
          <Building2 size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
          Bandas ({orgs.length})
        </button>
        <button style={TAB_STYLE(activeTab === 'users')} onClick={() => setActiveTab('users')}>
          <Users size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
          Usuarios {usersFetched ? `(${users.length})` : ''}
        </button>
      </div>

      {/* ── BANDS TAB ── */}
      {activeTab === 'bands' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
              <input type="text" placeholder="Buscar organización o código..." value={orgsSearch} onChange={e => setOrgsSearch(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '9px 12px 9px 36px', borderRadius: '10px', color: '#fff', width: '260px', fontSize: '0.8rem' }} />
            </div>
            <button onClick={handleSync} style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>
              SINCRONIZAR TODO
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {orgsLoading ? <p style={{ opacity: 0.4 }}>Cargando...</p>
             : orgsError ? <p style={{ color: '#ef4444' }}>Error: {orgsError}</p>
             : filteredOrgs.length === 0 ? <p style={{ opacity: 0.4 }}>No se encontraron bandas.</p>
             : filteredOrgs.map(org => {
               const used = org.storage_used_mb || 0;
               const limit = org.storage_limit_mb || 300;
               const pct = Math.min((used / limit) * 100, 100);
               return (
                 <div key={org.id} className="glass-panel" style={{ padding: '18px', position: 'relative' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                     <div>
                       <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>{org.name}</h3>
                       <code style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 'bold' }}>#{org.invite_code}</code>
                     </div>
                     {planBadge(org.plan)}
                   </div>
                   <div style={{ marginBottom: '1.2rem' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '5px', opacity: 0.5 }}>
                       <span>Almacenamiento</span>
                       <span>{used.toFixed(1)} / {limit} MB</span>
                     </div>
                     <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                       <div style={{ width: `${pct}%`, height: '100%', background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#a855f7', transition: 'width 0.5s' }} />
                     </div>
                   </div>
                   <button onClick={() => onInspect?.(org)}
                     style={{ width: '100%', padding: '7px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.08)', color: '#a855f7', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '800' }}>
                     Inspeccionar Equipo
                   </button>
                 </div>
               );
             })}
          </div>
        </>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
              <input type="text" placeholder="Buscar por nombre, email o equipo..." value={usersSearch} onChange={e => setUsersSearch(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '9px 12px 9px 36px', borderRadius: '10px', color: '#fff', width: '300px', fontSize: '0.8rem' }} />
            </div>
            <button onClick={fetchUsers} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>
              ACTUALIZAR
            </button>
          </div>

          {usersLoading ? (
            <p style={{ opacity: 0.4 }}>Cargando usuarios...</p>
          ) : usersError ? (
            <div style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px' }}>
              <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>Error: {usersError}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', margin: '6px 0 0', fontSize: '0.75rem' }}>El endpoint /api/admin/users puede no estar implementado aun en el backend.</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p style={{ opacity: 0.4 }}>No se encontraron usuarios.</p>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1.5fr 1fr', gap: '12px', padding: '10px 16px', background: 'rgba(0,0,0,0.2)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <span>Usuario</span>
                <span>Email</span>
                <span>Rol</span>
                <span>Plan</span>
                <span>Equipo</span>
                <span>Registro</span>
              </div>
              {filteredUsers.map((u, i) => (
                <div key={u.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1.5fr 1fr', gap: '12px', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {/* Name + avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', color: '#a855f7', flexShrink: 0 }}>
                      {(u.full_name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.full_name || '—'}</span>
                  </div>
                  {/* Email */}
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                  {/* Role */}
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: roleColor(u.role), textTransform: 'uppercase' }}>{u.role || '—'}</span>
                  {/* Plan */}
                  <div>{planBadge(u.plan)}</div>
                  {/* Band */}
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.org_name || '—'}</span>
                  {/* Joined */}
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPanel;
