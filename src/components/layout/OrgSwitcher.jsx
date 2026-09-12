import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Check, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { alertDialog } from '../../utils/dialogService';

// Selector de organización.
//
// Un usuario puede pertenecer a varias (el músico que toca en dos iglesias, el
// director de una red con varios campus). `profiles.org_id` guarda en cuál está
// parado ahora mismo; cambiarlo pasa por el servidor, que verifica la membresía
// y trae el rol y las funciones que tiene en ESA organización.
export default function OrgSwitcher({ currentOrgId, onCreateNew }) {
  const [orgs, setOrgs] = useState([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_organizations');
    if (!error && Array.isArray(data)) setOrgs(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Con una sola organización el selector sobra: ocuparía espacio sin ofrecer
  // ninguna decisión.
  if (orgs.length <= 1) return null;

  const current = orgs.find(o => o.org_id === currentOrgId);

  const handleSwitch = async (orgId) => {
    if (orgId === currentOrgId) { setOpen(false); return; }
    setSwitching(orgId);
    try {
      const { data: res, error } = await supabase.rpc('switch_organization', { p_org_id: orgId });
      if (error) throw error;
      if (!res?.ok) throw new Error(res?.error || 'No se pudo cambiar de organización.');
      // Recarga completa: el repertorio, los eventos y el equipo son otros.
      window.location.reload();
    } catch (e) {
      alertDialog(e.message);
      setSwitching(null);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '1rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Cambiar de organización"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 6px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)',
          color: 'var(--text-main)'
        }}
      >
        <Building2 size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
        <span style={{
          fontSize: '0.62rem', fontWeight: 700, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', flex: 1
        }}>
          {current?.name || 'Organización'}
        </span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2000 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '220px', zIndex: 2001,
            background: 'rgba(15,23,42,0.98)', border: '1px solid var(--border-light)',
            borderRadius: '12px', padding: '6px', boxShadow: 'var(--shadow-premium)',
            backdropFilter: 'blur(20px)'
          }}>
            {orgs.map(o => (
              <button
                key={o.org_id}
                onClick={() => handleSwitch(o.org_id)}
                disabled={switching !== null}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                  background: o.org_id === currentOrgId ? 'rgba(37,99,235,0.15)' : 'transparent',
                  color: 'var(--text-main)', textAlign: 'left'
                }}
              >
                {switching === o.org_id
                  ? <Loader2 size={13} className="animate-spin" />
                  : o.org_id === currentOrgId
                    ? <Check size={13} color="var(--primary)" />
                    : <span style={{ width: '13px' }} />}
                <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600 }}>{o.name}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                  {o.role === 'director' ? 'Director' : 'Miembro'}
                </span>
              </button>
            ))}

            {onCreateNew && (
              <button
                onClick={() => { setOpen(false); onCreateNew(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                  background: 'transparent', border: 'none', borderTop: '1px solid var(--border-light)',
                  marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600
                }}
              >
                <Plus size={13} /> Nueva organización
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
