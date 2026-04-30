import React, { useEffect, useState } from 'react';
import { Building2, Database, HardDrive, Search } from 'lucide-react';

const AdminPanel = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      // Intentar encontrar el token de Supabase en cualquier lugar del localStorage
      let token = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('auth-token')) {
          const raw = localStorage.getItem(key);
          try {
            token = JSON.parse(raw)?.access_token;
            if (token) break;
          } catch(e) {}
        }
      }

      console.log('[ADMIN] Token encontrado:', token ? 'SÍ' : 'NO');

      const response = await fetch('https://bandly-backend.onrender.com/api/admin/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[ADMIN] Status respuesta:', response.status);
      
      if (!response.ok) {
        const errData = await response.json();
        console.error('[ADMIN] Error del servidor:', errData);
        setError(errData.details || errData.error || 'Error desconocido');
        return;
      }

      const data = await response.json();
      setOrgs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[ADMIN] Error crítico:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgs = orgs.filter(org => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    org.invite_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSync = async () => {
    if (!confirm('¿Sincronizar almacenamiento de todas las bandas?')) return;
    setLoading(true);
    try {
      let token = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('auth-token')) {
          const raw = localStorage.getItem(key);
          token = JSON.parse(raw)?.access_token;
          if (token) break;
        }
      }

      await fetch('https://bandly-backend.onrender.com/api/admin/sync-storage', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchOrgs();
      alert('Sincronización completada');
    } catch (err) {
      alert('Error en sincronización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>PANEL DE CONTROL</h1>
            <button 
              onClick={handleSync}
              style={{ 
                background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', border: '1px solid #a855f7',
                padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              SINCRONIZAR TODO
            </button>
          </div>
          <p style={{ opacity: 0.5 }}>Gestión global de bandas y almacenamiento</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
          <input 
            type="text" 
            placeholder="Buscar banda o código..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '10px 10px 10px 40px', borderRadius: '12px', color: '#fff', width: '300px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {loading ? (
          <p>Cargando organizaciones...</p>
        ) : error ? (
          <p style={{ color: '#ef4444' }}>Error: {error}</p>
        ) : filteredOrgs.length === 0 ? (
          <p>No se encontraron bandas.</p>
        ) : filteredOrgs.map(org => {
          const used = org.storage_used_mb || 0;
          const limit = org.storage_limit_mb || 300;
          const percent = Math.min((used / limit) * 100, 100);
          
          return (
            <div key={org.id} className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{org.name}</h3>
                  <code style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>#{org.invite_code}</code>
                </div>
                <span style={{ 
                  fontSize: '0.6rem', padding: '4px 8px', borderRadius: '4px', 
                  background: org.plan === 'pro' ? '#a855f7' : (org.plan === 'elite' ? '#ef4444' : 'rgba(255,255,255,0.1)'),
                  fontWeight: 'bold'
                }}>
                  {(org.plan || 'FREE').toUpperCase()}
                </span>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px', opacity: 0.7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HardDrive size={12} />
                    <span>Almacenamiento</span>
                  </div>
                  <span>{used.toFixed(1)} / {limit} MB</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${percent}%`, height: '100%', 
                    background: percent > 90 ? '#ef4444' : (percent > 70 ? '#f59e0b' : 'var(--primary)'),
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              <button style={{ 
                width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#fff', fontSize: '0.75rem', cursor: 'pointer'
              }}>
                Inspeccionar Banda
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPanel;
