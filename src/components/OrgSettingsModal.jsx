import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Loader2, Save, Trash2, Edit2, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { alertDialog, confirmDialog } from '../utils/dialogService';
import { DEFAULT_DEPARTMENTS } from '../utils/defaultRoles';

function DepartmentEditor({ department, onUpdate, onDelete }) {
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('✨');
  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  const [editTitle, setEditTitle] = useState(department.title);
  const [editIcon, setEditIcon] = useState(department.icon);
  const [editColor, setEditColor] = useState(department.colorClass);

  const roles = department.roles || [];

  const handleAddCustom = () => {
    if (!newLabel.trim()) return;
    const customId = newLabel.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
    const newItem = { id: customId, label: newLabel.trim(), icon: newIcon };
    if (!roles.some(i => i.id === customId)) {
      onUpdate({ ...department, roles: [...roles, newItem] });
    }
    setNewLabel('');
    setNewIcon('✨');
  };

  const handleRemoveRole = (item) => {
    onUpdate({ ...department, roles: roles.filter(i => i.id !== item.id) });
  };

  const handleSaveGlobal = () => {
    if (!editTitle.trim()) return;
    onUpdate({ ...department, title: editTitle, icon: editIcon, colorClass: editColor });
    setIsEditingGlobal(false);
  };

  let headerColor = 'var(--primary)';
  let borderColor = 'rgba(59, 130, 246, 0.2)';
  let activeBg = 'rgba(59, 130, 246, 0.15)';
  let activeBorder = 'rgba(59, 130, 246, 0.5)';

  if (department.colorClass === 'purple') {
    headerColor = '#a855f7'; borderColor = 'rgba(168, 85, 247, 0.2)'; activeBg = 'rgba(168, 85, 247, 0.15)'; activeBorder = 'rgba(168, 85, 247, 0.5)';
  } else if (department.colorClass === 'yellow') {
    headerColor = '#eab308'; borderColor = 'rgba(234, 179, 8, 0.2)'; activeBg = 'rgba(234, 179, 8, 0.15)'; activeBorder = 'rgba(234, 179, 8, 0.5)';
  } else if (department.colorClass === 'orange') {
    headerColor = '#f97316'; borderColor = 'rgba(249, 115, 22, 0.2)'; activeBg = 'rgba(249, 115, 22, 0.15)'; activeBorder = 'rgba(249, 115, 22, 0.5)';
  } else if (department.colorClass === 'green') {
    headerColor = '#22c55e'; borderColor = 'rgba(34, 197, 94, 0.2)'; activeBg = 'rgba(34, 197, 94, 0.15)'; activeBorder = 'rgba(34, 197, 94, 0.5)';
  } else if (department.colorClass === 'red') {
    headerColor = '#ef4444'; borderColor = 'rgba(239, 68, 68, 0.2)'; activeBg = 'rgba(239, 68, 68, 0.15)'; activeBorder = 'rgba(239, 68, 68, 0.5)';
  }

  return (
    <div style={{ marginBottom: '2rem', background: 'rgba(0,0,0,0.15)', padding: '1.5rem', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
      
      {isEditingGlobal ? (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text" value={editIcon} onChange={e => setEditIcon(e.target.value)} maxLength={2}
            style={{ width: '45px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '8px' }}
          />
          <input
            type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '8px 12px' }}
          />
          <select 
            value={editColor} onChange={e => setEditColor(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '8px' }}
          >
            <option value="blue">Azul</option>
            <option value="purple">Morado</option>
            <option value="yellow">Amarillo</option>
            <option value="orange">Naranja</option>
            <option value="green">Verde</option>
            <option value="red">Rojo</option>
          </select>
          <button onClick={handleSaveGlobal} style={{ padding: '8px 12px', background: headerColor, border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}><Check size={18} /></button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: `1px solid ${borderColor}`, paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: headerColor }}>{department.icon} {department.title}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsEditingGlobal(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} title="Editar Departamento"><Edit2 size={16} /></button>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Eliminar Departamento"><Trash2 size={16} /></button>
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem' }}>
        {roles.map(item => {
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
                  border: `1px solid ${activeBorder}`, background: activeBg, color: '#fff'
                }}
              >
                <span>{item.icon}</span>
                {item.label}
                <button 
                  onClick={() => handleRemoveRole(item)} 
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginLeft: '4px', padding: 0, display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {roles.length === 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', fontStyle: 'italic' }}>Sin roles configurados</span>}
      </div>

      <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <input
          type="text" value={newIcon} onChange={e => setNewIcon(e.target.value)}
          style={{ width: '45px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
          placeholder="✨" maxLength={2}
        />
        <input
          type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '0 10px' }}
          placeholder="Añadir nuevo rol a este departamento..."
          onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
        />
        <button
          onClick={handleAddCustom}
          style={{ padding: '8px 12px', background: headerColor, border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export default function OrgSettingsModal({ isOpen, onClose, orgId, orgSettings, refreshData }) {
  const [departments, setDepartments] = useState([]);
  const [allowDeclines, setAllowDeclines] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDepartments(orgSettings?.departments || DEFAULT_DEPARTMENTS);
      setAllowDeclines(orgSettings?.allowDeclines !== false);
    }
  }, [isOpen, orgSettings]);

  if (!isOpen) return null;

  const handleUpdateDepartment = (updatedDept) => {
    setDepartments(departments.map(d => d.id === updatedDept.id ? updatedDept : d));
  };

  const handleDeleteDepartment = async (deptId) => {
    const confirmed = await confirmDialog({ message: '¿Eliminar este departamento y todos sus roles?', danger: true });
    if (confirmed) {
      setDepartments(departments.filter(d => d.id !== deptId));
    }
  };

  const handleAddDepartment = () => {
    const newId = 'dept_' + Math.random().toString(36).substr(2, 9);
    setDepartments([
      ...departments,
      { id: newId, title: 'Nuevo Departamento', icon: '📁', colorClass: 'blue', roles: [] }
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from('organizations')
        .update({ settings: { ...orgSettings, departments, allowDeclines } })
        .eq('id', orgId)
        .select();
        
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No se pudo actualizar la base de datos. Verifica tus permisos.");
      
      if (refreshData) refreshData();
      onClose();
    } catch (e) {
      alertDialog("Error al guardar: " + e.message);
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
            Departamentos y Roles
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Configura los departamentos y roles de tu organización. Los miembros serán agrupados automáticamente bajo estos departamentos en la pestaña de Equipo.
        </p>

        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'white' }}>Permitir Declinaciones (default)</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Valor inicial al crear un evento nuevo. Cada evento puede cambiarlo por su cuenta desde su propia configuración.</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '44px', height: '24px', background: allowDeclines ? 'var(--primary)' : 'rgba(255,255,255,0.2)', borderRadius: '12px', transition: '0.3s' }}>
              <div style={{ position: 'absolute', top: '2px', left: allowDeclines ? '22px' : '2px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
            </div>
            <input type="checkbox" checked={allowDeclines} onChange={e => setAllowDeclines(e.target.checked)} style={{ display: 'none' }} />
          </label>
        </div>

        {departments.map(dept => (
          <DepartmentEditor 
            key={dept.id} 
            department={dept} 
            onUpdate={handleUpdateDepartment}
            onDelete={() => handleDeleteDepartment(dept.id)}
          />
        ))}

        <button 
          onClick={handleAddDepartment}
          style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          <Plus size={20} /> Añadir Nuevo Departamento
        </button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '12px' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
