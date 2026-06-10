import React, { useState } from 'react';
import { Plus, X, Loader2, Save } from 'lucide-react';
import { supabase } from '../supabaseClient';

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

const DEFAULT_ADMIN_ROLES = [
  { id: 'director_musical', label: 'Director Musical', icon: '🎼' },
  { id: 'eventos', label: 'Dir. Eventos', icon: '📅' },
  { id: 'media', label: 'Media/Visuales', icon: '📽️' },
  { id: 'sonido', label: 'Audio/Sonido', icon: '🎛️' },
  { id: 'logistica', label: 'Staff/Logística', icon: '📋' },
  { id: 'decoracion', label: 'Decoración', icon: '🎨' },
  { id: 'bienvenida', label: 'Bienvenida', icon: '👋' },
  { id: 'finanzas', label: 'Finanzas', icon: '💰' },
  { id: 'transmision', label: 'Transmisión/Streaming', icon: '📡' }
];

export default function OrgSettingsModal({ isOpen, onClose, orgId, orgSettings, refreshData }) {
  const [instruments, setInstruments] = useState(orgSettings?.instruments || []);
  const [roles, setRoles] = useState(orgSettings?.roles || []);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('✨');

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('organizations')
        .update({ settings: { instruments, roles } })
        .eq('id', orgId);
      if (error) throw error;
      if (refreshData) refreshData();
      onClose();
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleItem = (item, list, setList) => {
    if (list.some(i => i.id === item.id)) {
      setList(list.filter(i => i.id !== item.id));
    } else {
      setList([...list, item]);
    }
  };

  const handleAddCustom = (list, setList) => {
    if (!newLabel.trim()) return;
    const customId = newLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newItem = { id: customId, label: newLabel.trim(), icon: newIcon };
    if (!list.some(i => i.id === customId)) {
      setList([...list, newItem]);
    }
    setNewLabel('');
    setNewIcon('✨');
  };

  const renderSection = (title, defaultList, currentList, setList, showCustomizer) => (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.5rem' }}>{title}</h3>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem' }}>
        {[...defaultList, ...currentList.filter(ci => !defaultList.some(di => di.id === ci.id))].map(item => {
          const isSelected = currentList.some(i => i.id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleToggleItem(item, currentList, setList)}
              style={{
                padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
                border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)'
              }}
            >
              <span>{item.icon}</span>
              {item.label}
              {isSelected && <span style={{ marginLeft: '4px', color: '#3b82f6' }}>✓</span>}
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
            placeholder="🎸"
            maxLength={2}
          />
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '0 10px' }}
            placeholder="Añadir otro (Ej. Flauta)"
          />
          <button
            onClick={() => handleAddCustom(currentList, setList)}
            style={{ padding: '8px 12px', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Plus size={18} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', width: '90%', maxWidth: '600px',
        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', padding: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: '12px' }}>⚙️</span>
            Configurar Organización
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Selecciona o añade los instrumentos y roles administrativos que existen en tu equipo. Esto definirá las opciones disponibles al editar miembros.
        </p>

        {renderSection('Roles Administrativos y Áreas', DEFAULT_ADMIN_ROLES, roles, setRoles, true)}
        {renderSection('Instrumentos y Operación', DEFAULT_INSTRUMENTS, instruments, setInstruments, true)}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '12px' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
