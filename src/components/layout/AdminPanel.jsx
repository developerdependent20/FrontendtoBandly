import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Building2, Calendar, Database, Download, Music, RefreshCw,
  Search, Users, Wifi, UserPlus, HardDrive, ChevronUp, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const REFRESH_MS = 30_000;

// ── utilidades ─────────────────────────────────────────────────────────
const flag = (cc) => {
  if (!cc || cc.length !== 2 || cc === '??') return '🌐';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
};

const COUNTRY_NAMES = (() => {
  try { return new Intl.DisplayNames(['es'], { type: 'region' }); } catch { return null; }
})();
const countryName = (cc) => {
  if (!cc || cc === '??') return 'Desconocido';
  try { return COUNTRY_NAMES?.of(cc) || cc; } catch { return cc; }
};

const ago = (iso) => {
  if (!iso) return 'nunca';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
};

const isOnline = (iso) => iso && Date.now() - new Date(iso).getTime() < 5 * 60 * 1000;

const toCsv = (rows, cols) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(c => esc(c.label)).join(','), ...rows.map(r => cols.map(c => esc(c.get(r))).join(','))].join('\n');
};
const download = (name, csv) => {
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

const PLAN_COLORS = { free: '#6b7280', starter: '#7891b9', pro: '#a78ac2', elite: '#ef4444' };
const PlanBadge = ({ plan }) => (
  <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: 6, background: PLAN_COLORS[plan] || '#6b7280', color: '#fff', fontWeight: 600, letterSpacing: 0.5 }}>
    {(plan || 'free').toUpperCase()}
  </span>
);

// ── componentes pequeños ───────────────────────────────────────────────
const Card = ({ icon, label, value, sub, color = '#f7f4ef' }) => {
  const Icon = icon;
  return (
  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
      <Icon size={12} /> {label}
    </div>
    <div style={{ fontSize: '1.7rem', fontWeight: 600, color, marginTop: 6, lineHeight: 1 }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{sub}</div>}
  </div>
  );
};

const Panel = ({ title, children, right }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 16, minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)' }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

// Barras SVG: sin librerías, escala sola.
const BarChart = ({ data, color = '#f7f4ef' }) => {
  const max = Math.max(1, ...data.map(d => d.n));
  const w = 100 / Math.max(1, data.length);
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: 110, display: 'block' }}>
        {data.map((d, i) => {
          const h = (d.n / max) * 38;
          return (
            <rect key={d.day} x={i * w + w * 0.12} y={40 - h} width={w * 0.76} height={Math.max(h, d.n ? 0.8 : 0.3)} rx="0.6" fill={color} opacity={d.n ? 0.9 : 0.15}>
              <title>{`${d.day}: ${d.n}`}</title>
            </rect>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
        <span>{data[0]?.day?.slice(5)}</span><span>máx {max}</span><span>{data[data.length - 1]?.day?.slice(5)}</span>
      </div>
    </div>
  );
};

const HBars = ({ rows, color = '#7891b9' }) => {
  const max = Math.max(1, ...rows.map(r => r.n));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.length === 0 && <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>Sin datos todavía.</span>}
      {rows.map(r => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 1.2fr) 3fr 30px', gap: 8, alignItems: 'center', fontSize: '0.74rem' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(r.n / max) * 100}%`, height: '100%', background: r.color || color }} />
          </div>
          <span style={{ textAlign: 'right', opacity: 0.6 }}>{r.n}</span>
        </div>
      ))}
    </div>
  );
};

const SortTh = ({ col, sort, setSort, children, style }) => {
  const active = sort.key === col;
  return (
    <span onClick={() => setSort({ key: col, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' })}
      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, userSelect: 'none', color: active ? '#f7f4ef' : undefined, ...style }}>
      {children}{active && (sort.dir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
    </span>
  );
};

const sortRows = (rows, { key, dir }) => {
  const m = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[key], y = b[key];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * m;
  });
};

const SearchBox = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative' }}>
    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
    <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '9px 12px 9px 36px', borderRadius: 12, color: '#fff', width: 'min(300px, 70vw)', fontSize: '0.8rem' }} />
  </div>
);

const BTN = { background: 'rgba(247,244,239,0.08)', color: '#f7f4ef', border: '1px solid rgba(247,244,239,0.18)', padding: '8px 14px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };

// ── panel ──────────────────────────────────────────────────────────────
const AdminPanel = ({ onInspect }) => {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [errors, setErrors] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [auto, setAuto] = useState(true);

  const [uSearch, setUSearch] = useState('');
  const [oSearch, setOSearch] = useState('');
  const [uSort, setUSort] = useState({ key: 'last_seen_at', dir: 'desc' });
  const [oSort, setOSort] = useState({ key: 'last_activity', dir: 'desc' });
  const [uFilter, setUFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const [ov, us, og, er] = await Promise.all([
        supabase.rpc('admin_overview'),
        supabase.rpc('admin_users'),
        supabase.rpc('admin_orgs'),
        supabase.rpc('admin_errors', { p_limit: 100 }),
      ]);
      const failed = [ov, us, og, er].find(r => r.error);
      if (failed) throw new Error(failed.error.message);
      setOverview(ov.data);
      setUsers(us.data || []);
      setOrgs(og.data || []);
      setErrors(er.data || []);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Se refresca solo mientras la pestaña esté visible.
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [auto, load]);

  const filteredUsers = useMemo(() => {
    const q = uSearch.toLowerCase();
    const rows = users.filter(u => {
      if (uFilter === 'online' && !isOnline(u.last_seen_at)) return false;
      if (uFilter === 'week' && !(u.last_seen_at && Date.now() - new Date(u.last_seen_at) < 7 * 864e5)) return false;
      if (uFilter === 'never' && u.last_seen_at) return false;
      if (uFilter === 'new' && !(Date.now() - new Date(u.created_at) < 7 * 864e5)) return false;
      return !q || [u.email, u.full_name, u.org_name, u.country].some(v => v?.toLowerCase().includes(q));
    });
    return sortRows(rows, uSort);
  }, [users, uSearch, uSort, uFilter]);

  const filteredOrgs = useMemo(() => {
    const q = oSearch.toLowerCase();
    return sortRows(orgs.filter(o => !q || [o.name, o.invite_code, o.owner_email].some(v => v?.toLowerCase().includes(q))), oSort);
  }, [orgs, oSearch, oSort]);

  const TAB = (active) => ({
    padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
    background: active ? 'rgba(247,244,239,0.11)' : 'rgba(255,255,255,0.04)',
    color: active ? '#f7f4ef' : 'rgba(255,255,255,0.4)',
    borderBottom: active ? '2px solid rgba(247,244,239,0.3)' : '2px solid transparent',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  });

  const o = overview;
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

  return (
    <div style={{ padding: '1.5rem', color: '#fff', minHeight: '100%' }}>

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 10 }}>
            Panel de control
            {o && <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> {o.online_now} en línea
            </span>}
          </h1>
          <p style={{ opacity: 0.4, fontSize: '0.75rem', margin: '4px 0 0' }}>
            {updatedAt ? `Actualizado ${updatedAt.toLocaleTimeString('es-ES')}` : 'Cargando…'}{auto ? ' · se refresca cada 30 s' : ' · refresco automático apagado'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={BTN} onClick={() => setAuto(a => !a)}>{auto ? 'Auto: ON' : 'Auto: OFF'}</button>
          <button style={BTN} onClick={load}><RefreshCw size={13} /> Actualizar</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem 1.2rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, marginBottom: 16 }}>
          <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>Error: {error}</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '6px 0 0', fontSize: '0.74rem' }}>
            Si dice que la función no existe, falta correr <code>sql/superadmin_dashboard.sql</code> en Supabase.
          </p>
        </div>
      )}

      {/* tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        <button style={TAB(tab === 'overview')} onClick={() => setTab('overview')}><Activity size={13} /> Resumen</button>
        <button style={TAB(tab === 'users')} onClick={() => setTab('users')}><Users size={13} /> Usuarios ({users.length})</button>
        <button style={TAB(tab === 'orgs')} onClick={() => setTab('orgs')}><Building2 size={13} /> Organizaciones ({orgs.length})</button>
        <button style={TAB(tab === 'errors')} onClick={() => setTab('errors')}><AlertTriangle size={13} /> Errores {o?.errors_24h ? `(${o.errors_24h} hoy)` : ''}</button>
      </div>

      {loading && !o && <p style={{ opacity: 0.4 }}>Cargando…</p>}

      {/* ── RESUMEN ── */}
      {tab === 'overview' && o && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <Card icon={Users} label="Usuarios" value={o.users_total} sub={`+${o.users_new_7d} esta semana · +${o.users_new_30d} en 30 d`} />
            <Card icon={Wifi} label="En línea ahora" value={o.online_now} color="#10b981" sub="activos últimos 5 min" />
            <Card icon={Activity} label="Activos hoy" value={o.dau} sub={`${o.wau} semana · ${o.mau} mes`} />
            <Card icon={Building2} label="Organizaciones" value={o.orgs_total} />
            <Card icon={Calendar} label="Eventos" value={o.events_total} />
            <Card icon={Music} label="Canciones" value={o.songs_total} sub={`${o.sequences_total} secuencias`} />
            <Card icon={Database} label="Sesiones totales" value={o.sessions_total} sub="aperturas de la app" />
            <Card icon={HardDrive} label="Almacenamiento" value={`${(o.storage_used_mb / 1024).toFixed(2)} GB`} />
            <Card icon={AlertTriangle} label="Errores 24 h" value={o.errors_24h} color={o.errors_24h ? '#ef4444' : '#10b981'} sub={`${o.errors_7d} en 7 d`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <Panel title="Registros por día (30 d)"><BarChart data={o.signups_by_day} color="#a78ac2" /></Panel>
            <Panel title="Usuarios activos por día (30 d)"><BarChart data={o.active_by_day} color="#10b981" /></Panel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <Panel title="Países">
              <HBars rows={o.countries.map(c => ({ label: `${flag(c.country)} ${countryName(c.country)}`, n: c.n }))} />
              {o.countries.some(c => c.country === '??') && (
                <p style={{ fontSize: '0.64rem', opacity: 0.35, margin: '10px 0 0' }}>
                  "Desconocido" = aún no han abierto la app desde que existe el rastreo de presencia.
                </p>
              )}
            </Panel>
            <Panel title="Organizaciones por plan">
              <HBars rows={o.plans.map(p => ({ label: p.plan.toUpperCase(), n: p.n, color: PLAN_COLORS[p.plan] }))} />
            </Panel>
            <Panel title="Retención">
              <HBars rows={[
                { label: 'Activos 24 h', n: o.dau, color: '#10b981' },
                { label: 'Activos 7 d', n: o.wau, color: '#7891b9' },
                { label: 'Activos 30 d', n: o.mau, color: '#a78ac2' },
                { label: 'Total', n: o.users_total, color: '#6b7280' },
              ]} />
              <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: '10px 0 0' }}>
                Pegajosidad (DAU/MAU): <b>{pct(o.dau, o.mau)}</b>
              </p>
            </Panel>
          </div>

          <Panel title="Errores más frecuentes (7 d)">
            {o.top_errors.length === 0 ? <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>Sin errores. 🎉</span> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {o.top_errors.map((e, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px 90px', gap: 10, fontSize: '0.74rem', alignItems: 'center' }}>
                    <span style={{ opacity: 0.5 }}>{e.app}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.message}>{e.message}</span>
                    <span style={{ color: '#ef4444' }}>{e.n}× · {e.people} pers.</span>
                    <span style={{ opacity: 0.4, textAlign: 'right' }}>{ago(e.last)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ── USUARIOS ── */}
      {tab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <SearchBox value={uSearch} onChange={setUSearch} placeholder="Correo, nombre, equipo o país…" />
              <select value={uFilter} onChange={e => setUFilter(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '9px 12px', borderRadius: 12, fontSize: '0.78rem' }}>
                <option value="all">Todos</option>
                <option value="online">En línea ahora</option>
                <option value="week">Activos esta semana</option>
                <option value="new">Nuevos (7 d)</option>
                <option value="never">Nunca han vuelto</option>
              </select>
              <span style={{ fontSize: '0.72rem', opacity: 0.4 }}>{filteredUsers.length} resultados</span>
            </div>
            <button style={BTN} onClick={() => download('usuarios-bandly.csv', toCsv(filteredUsers, [
              { label: 'Correo', get: u => u.email }, { label: 'Nombre', get: u => u.full_name },
              { label: 'Rol', get: u => u.role }, { label: 'Equipo', get: u => u.org_name },
              { label: 'Plan', get: u => u.plan }, { label: 'País', get: u => u.country },
              { label: 'Sesiones', get: u => u.session_count }, { label: 'Registro', get: u => u.created_at },
              { label: 'Último acceso', get: u => u.last_seen_at || u.last_sign_in_at },
            ]))}><Download size={13} /> CSV</button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflowX: 'auto' }}>
            <div style={{ minWidth: 980 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 0.8fr 0.7fr 0.9fr 0.6fr 0.9fr 1fr', gap: 12, padding: '10px 16px', background: 'rgba(0,0,0,0.2)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                <SortTh col="email" sort={uSort} setSort={setUSort}>Usuario</SortTh>
                <SortTh col="org_name" sort={uSort} setSort={setUSort}>Equipo</SortTh>
                <SortTh col="role" sort={uSort} setSort={setUSort}>Rol</SortTh>
                <SortTh col="plan" sort={uSort} setSort={setUSort}>Plan</SortTh>
                <SortTh col="country" sort={uSort} setSort={setUSort}>País</SortTh>
                <SortTh col="session_count" sort={uSort} setSort={setUSort}>Ses.</SortTh>
                <SortTh col="created_at" sort={uSort} setSort={setUSort}>Registro</SortTh>
                <SortTh col="last_seen_at" sort={uSort} setSort={setUSort}>Último acceso</SortTh>
              </div>
              {filteredUsers.map(u => {
                const last = u.last_seen_at || u.last_sign_in_at;
                return (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 0.8fr 0.7fr 0.9fr 0.6fr 0.9fr 1fr', gap: 12, padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ position: 'relative', width: 30, height: 30, borderRadius: '50%', background: 'rgba(247,244,239,0.11)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>
                        {(u.full_name || u.email || '?')[0].toUpperCase()}
                        {isOnline(u.last_seen_at) && <span style={{ position: 'absolute', right: -1, bottom: -1, width: 9, height: 9, borderRadius: '50%', background: '#10b981', border: '2px solid #101012' }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.full_name || '—'}</div>
                        <div style={{ fontSize: '0.68rem', opacity: 0.45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                      </div>
                    </div>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.7 }} title={u.orgs_count > 1 ? `${u.orgs_count} equipos` : undefined}>
                      {u.org_name || '—'}{u.orgs_count > 1 ? ` +${u.orgs_count - 1}` : ''}
                    </span>
                    <span style={{ fontSize: '0.66rem', fontWeight: 600, textTransform: 'uppercase', color: u.role === 'director' ? '#10b981' : 'rgba(255,255,255,0.4)' }}>{u.role || '—'}</span>
                    <span><PlanBadge plan={u.plan} /></span>
                    <span title={u.timezone || ''}>{u.country ? `${flag(u.country)} ${u.country}` : '—'}</span>
                    <span style={{ opacity: 0.7 }}>{u.session_count || 0}</span>
                    <span style={{ opacity: 0.45 }}>{ago(u.created_at)}</span>
                    <span style={{ color: isOnline(u.last_seen_at) ? '#10b981' : undefined, opacity: isOnline(u.last_seen_at) ? 1 : 0.55 }}>
                      {isOnline(u.last_seen_at) ? '● en línea' : ago(last)}
                    </span>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && <p style={{ padding: 20, opacity: 0.4 }}>Sin resultados.</p>}
            </div>
          </div>
        </>
      )}

      {/* ── ORGANIZACIONES ── */}
      {tab === 'orgs' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <SearchBox value={oSearch} onChange={setOSearch} placeholder="Nombre, código o dueño…" />
            <button style={BTN} onClick={() => download('organizaciones-bandly.csv', toCsv(filteredOrgs, [
              { label: 'Organización', get: r => r.name }, { label: 'Código', get: r => r.invite_code },
              { label: 'Plan', get: r => r.plan }, { label: 'Dueño', get: r => r.owner_email },
              { label: 'Miembros', get: r => r.members }, { label: 'Activos 7d', get: r => r.active_7d },
              { label: 'Canciones', get: r => r.songs }, { label: 'Eventos', get: r => r.events },
              { label: 'MB usados', get: r => r.storage_used_mb }, { label: 'Última actividad', get: r => r.last_activity },
            ]))}><Download size={13} /> CSV</button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflowX: 'auto' }}>
            <div style={{ minWidth: 1020 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.6fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 1.2fr 1fr 0.9fr', gap: 12, padding: '10px 16px', background: 'rgba(0,0,0,0.2)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                <SortTh col="name" sort={oSort} setSort={setOSort}>Organización</SortTh>
                <SortTh col="owner_email" sort={oSort} setSort={setOSort}>Dueño</SortTh>
                <SortTh col="plan" sort={oSort} setSort={setOSort}>Plan</SortTh>
                <SortTh col="members" sort={oSort} setSort={setOSort}>Miemb.</SortTh>
                <SortTh col="active_7d" sort={oSort} setSort={setOSort}>Act. 7d</SortTh>
                <SortTh col="songs" sort={oSort} setSort={setOSort}>Canc.</SortTh>
                <SortTh col="events" sort={oSort} setSort={setOSort}>Event.</SortTh>
                <SortTh col="storage_used_mb" sort={oSort} setSort={setOSort}>Almacén</SortTh>
                <SortTh col="last_activity" sort={oSort} setSort={setOSort}>Actividad</SortTh>
                <span />
              </div>
              {filteredOrgs.map(r => {
                const p = Math.min((r.storage_used_mb / (r.storage_limit_mb || 300)) * 100, 100);
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.6fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 1.2fr 1fr 0.9fr', gap: 12, padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', fontSize: '0.74rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                      <code style={{ fontSize: '0.62rem', opacity: 0.5 }}>#{r.invite_code}</code>
                    </div>
                    <span style={{ opacity: 0.55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.owner_email || '—'}</span>
                    <span><PlanBadge plan={r.plan} /></span>
                    <span>{r.members}</span>
                    <span style={{ color: r.active_7d ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{r.active_7d}</span>
                    <span>{r.songs}</span>
                    <span title={`${r.events_30d} en 30 d`}>{r.events}</span>
                    <div>
                      <div style={{ fontSize: '0.64rem', opacity: 0.5, marginBottom: 3 }}>{Number(r.storage_used_mb).toFixed(0)} / {r.storage_limit_mb} MB</div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${p}%`, height: '100%', background: p > 90 ? '#ef4444' : p > 70 ? '#f59e0b' : '#7891b9' }} />
                      </div>
                    </div>
                    <span style={{ opacity: 0.55 }}>{ago(r.last_activity)}{r.errors_7d ? <span style={{ color: '#ef4444' }}> · {r.errors_7d} err</span> : null}</span>
                    <button onClick={() => onInspect?.({ id: r.id, name: r.name, invite_code: r.invite_code, plan: r.plan })}
                      style={{ ...BTN, padding: '5px 10px', justifyContent: 'center' }}>Inspeccionar</button>
                  </div>
                );
              })}
              {filteredOrgs.length === 0 && <p style={{ padding: 20, opacity: 0.4 }}>Sin resultados.</p>}
            </div>
          </div>
        </>
      )}

      {/* ── ERRORES ── */}
      {tab === 'errors' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflowX: 'auto' }}>
          <div style={{ minWidth: 800 }}>
            {errors.length === 0 && <p style={{ padding: 20, opacity: 0.4 }}>Sin errores registrados. 🎉</p>}
            {errors.map(e => (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '90px 70px 1fr 1.3fr 1fr', gap: 12, padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.72rem', alignItems: 'center' }}>
                <span style={{ opacity: 0.5 }}>{ago(e.created_at)}</span>
                <span style={{ opacity: 0.6 }}>{e.app}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.message}>{e.message}</span>
                <span style={{ opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.user_email || '—'}</span>
                <span style={{ opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.org_name || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
