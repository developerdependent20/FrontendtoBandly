import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Loader2, Save } from 'lucide-react';
import { supabase } from '../supabaseClient';

const DEFAULT_LEADERSHIP_ROLES = [
  { id: 'director_musical', label: 'Director Musical', icon: '🎼' },
  { id: 'eventos', label: 'Dir. Eventos', icon: '📅' },
  { id: 'lider_produccion', label: 'Líder Producción', icon: '🎬' },
  { id: 'lider_logistica', label: 'Líder Logística', icon: '📋' }
];

const DEFAULT_PRODUCTION_ROLES = [
  { id: 'media', label: 'Media/Visuales', icon: '📽️' },
  { id: 'sonido', label: 'Audio/Sonido', icon: '🎛️' },
  { id: 'transmision', label: 'Transmisión', icon: '📡' },
  { id: 'iluminacion', label: 'Iluminación', icon: '💡' }
];

const DEFAULT_LOGISTICS_ROLES = [
  { id: 'logistica', label: 'Staff/Logística', icon: '🛠️' },
  { id: 'decoracion', label: 'Decoración', icon: '🎨' },
  { id: 'bienvenida', label: 'Bienvenida', icon: '👋' },
  { id: 'finanzas', label: 'Finanzas', icon: '💰' }
];

const DEFAULT_INSTRUMENTS = [
  { id: 'bateria', label: 'Batería', icon: '🥁' },
  { id: 'bajo', label: 'Bajo', icon: '🎸' },
  { id: 'guitarra', label: 'Guitarra', icon: '🎸' },
  { id: 'piano', label: 'Teclado', icon: '🎹' },
  { id: 'voz', label: 'Voz/Cantante', icon: '🎤' },
  { id: 'percusion', label: 'Percusión', icon: '🪘' },
  { id: 'acustica', label: 'Acústica', icon: '🎸' },
  { id: 'cuerdas', label: 'Cuerdas', icon: '🎻' },
  { id: 'brass', label: 'Metales (Brass)', icon: '🎺' },
  { id: 'saxo', label: 'Saxofón', icon: '🎷' },
  { id: 'sintetizador', label: 'Sintetizador', icon: '🎛️' },
];

function SectionBuilder({ title, defaultList, currentList, setList, showCustomizer, colorClass }) {
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('✨');

  const handleToggleItem = (item) => {
    if (currentList.some(i => i.id === item.id)) {
      setList(currentList.filter(i => i.id !== item.id));
    } else {
      setList([...currentList, item]);
    }
  };

  const handleAddCustom = () => {
    if (!newLabel.trim()) return;
    const customId = newLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newItem = { id: customId, label: newLabel.trim(), icon: newIcon };
    if (!currentList.some(i => i.id === customId)) {
      setList([...currentList, newItem]);
    }
    setNewLabel('');
    setNewIcon('✨');
  };

  let headerColor = 'var(--primary)';
  let borderColor = 'rgba(59, 130, 246, 0.2)';
  let activeBg = 'rgba(59, 130, 246, 0.15)';
  let activeBorder = 'rgba(59, 130, 246, 0.5)';

  if (colorClass === 'purple') {
    headerColor = '#a855f7';
    borderColor = 'rgba(168, 85, 247, 0.2)';
    activeBg = 'rgba(168, 85, 247, 0.15)';
    activeBorder = 'rgba(168, 85, 247, 0.5)';
  } else if (colorClass === 'yellow') {
    headerColor = '#eab308';
    borderColor = 'rgba(234, 179, 8, 0.2)';
    activeBg = 'rgba(234, 179, 8, 0.15)';
    activeBorder = 'rgba(234, 179, 8, 0.5)';
  } else if (colorClass === 'orange') {
    headerColor = '#f97316';
    borderColor = 'rgba(249, 115, 22, 0.2)';
    activeBg = 'rgba(249, 115, 22, 0.15)';
    activeBorder = 'rgba(249, 115, 22, 0.5)';
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: headerColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: '0.5rem' }}>{title}</h3>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem' }}>
        {[...defaultList, ...currentList.filter(ci => !defaultList.some(di => di.id === ci.id))].map(item => {
          const isSelected = currentList.some(i => i.id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleToggleItem(item)}
              style={{
                padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
                border: isSelected ? `1px solid ${activeBorder}` : '1px solid rgba(255,255,255,0.1)',
                background: isSelected ? activeBg : 'rgba(255,255,255,0.02)',
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)'
              }}
            >
              <span>{item.icon}</span>
              {item.label}
              {isSelected && <span style={{ marginLeft: '4px', color: headerColor }}>✓</span>}
            </button>
          );
        })}
      </div>

      {showCustomizer && (
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <input
            type="text"
            value={newIcon}
            onChange={e => setNewIcon(e.target.value)}
            style={{ width: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
            placeholder="✨"
            maxLength={2}
          />
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '0 10px' }}
            placeholder="Añadir otro rol a este departamento..."
            onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
          />
          <button
            onClick={handleAddCustom}
            style={{ padding: '8px 12px', background: headerColor, border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Plus size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrgSettingsModal({ isOpen, onClose, orgId, orgSettings, refreshData }) {
  const oldRoles = orgSettings?.roles || [];
  const knownIds = [...DEFAULT_LEADERSHIP_ROLES, ...DEFAULT_PRODUCTION_ROLES, ...DEFAULT_LOGISTICS_ROLES].map(r => r.id);
  
  const getOld = (list) => oldRoles.filter(r => list.some(d => d.id === r.id));
  const oldLeadership = getOld(DEFAULT_LEADERSHIP_ROLES);
  const leftovers = oldRoles.filter(r => !knownIds.includes(r.id));

  const [leadership, setLeadership] = useState(orgSettings?.leadership || [...oldLeadership, ...leftovers]);
  const [production, setProduction] = useState(orgSettings?.production || getOld(DEFAULT_PRODUCTION_ROLES));
  const [logistics, setLogistics] = useState(orgSettings?.logistics || getOld(DEFAULT_LOGISTICS_ROLES));
  const [instruments, setInstruments] = useState(orgSettings?.instruments || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLeadership(orgSettings?.leadership || [...oldLeadership, ...leftovers]);
      setProduction(orgSettings?.production || getOld(DEFAULT_PRODUCTION_ROLES));
      setLogistics(orgSettings?.logistics || getOld(DEFAULT_LOGISTICS_ROLES));
      setInstruments(orgSettings?.instruments || []);
    }
  }, [isOpen, orgSettings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Guardamos la nueva estructura de departamentos
      const { data, error } = await supabase.from('organizations')
        .update({ settings: { leadership, production, logistics, instruments } })
        .eq('id', orgId)
        .select();
        
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No se pudo actualizar la base de datos. Verifica tus permisos.");
      
      if (refreshData) refreshData();
      onClose();
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', width: '90%', maxWidth: '650px',
        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', padding: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: '12px' }}>🏢</span>
            Departamentos de la Organización
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Configura los roles y equipos disponibles en tu organización. Los miembros serán agrupados automáticamente bajo estos departamentos en la pestaña de Equipo.
        </p>

        <SectionBuilder 
          title="👑 Roles de Liderazgo (Prioridad #2)" 
          defaultList={DEFAULT_LEADERSHIP_ROLES} 
          currentList={leadership} 
          setList={setLeadership} 
          showCustomizer={true} 
          colorClass="yellow" 
        />
        
        <SectionBuilder 
          title="📽️ Equipo de Producción y Media" 
          defaultList={DEFAULT_PRODUCTION_ROLES} 
          currentList={production} 
          setList={setProduction} 
          showCustomizer={true} 
          colorClass="purple" 
        />
        
        <SectionBuilder 
          title="📋 Equipo de Logística y Staff" 
          defaultList={DEFAULT_LOGISTICS_ROLES} 
          currentList={logistics} 
          setList={setLogistics} 
          showCustomizer={true} 
          colorClass="orange" 
        />

        <SectionBuilder 
          title="🎵 Instrumentos y Operación (Músicos)" 
          defaultList={DEFAULT_INSTRUMENTS} 
          currentList={instruments} 
          setList={setInstruments} 
          showCustomizer={true} 
          colorClass="blue" 
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '12px' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Guardar Departamentos
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
