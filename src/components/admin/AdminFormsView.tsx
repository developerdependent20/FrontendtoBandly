"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Copy, Eye, Trash2, Edit2, ChevronLeft, Save, GripVertical, FileText, Download } from "lucide-react";

type FormField = {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'select' | 'file';
  label: string;
  required: boolean;
  options?: string[]; // Para el tipo 'select'
};

export function AdminFormsView() {
  const supabase = createClient();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View states: 'list', 'builder', 'submissions'
  const [currentView, setCurrentView] = useState<'list' | 'builder' | 'submissions'>('list');
  
  // Builder State
  const [formId, setFormId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requireLogin, setRequireLogin] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Submissions State
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  useEffect(() => {
    if (currentView === 'list') {
      fetchForms();
    }
  }, [currentView]);

  const fetchForms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forms')
      .select('*, form_submissions(count)')
      .order('created_at', { ascending: false });
      
    if (data) {
       // Map to get count
       const formattedData = data.map(f => ({
          ...f,
          submissions_count: f.form_submissions?.[0]?.count || 0
       }));
       setForms(formattedData);
    }
    setLoading(false);
  };

  const openBuilder = (form?: any) => {
    if (form) {
      setFormId(form.id);
      setTitle(form.title);
      setDescription(form.description || "");
      setRequireLogin(form.require_login);
      setFields(form.fields || []);
    } else {
      setFormId(null);
      setTitle("");
      setDescription("");
      setRequireLogin(false);
      setFields([{ id: Date.now().toString(), type: 'text', label: 'Nueva Pregunta', required: true }]);
    }
    setCurrentView('builder');
  };

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: 'Nueva Pregunta',
      required: false,
      ...(type === 'select' ? { options: ['Opción 1', 'Opción 2'] } : {})
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSaveForm = async () => {
    if (!title.trim()) return alert("El título es obligatorio");
    setIsSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      title,
      description,
      fields,
      require_login: requireLogin,
      created_by: user.id
    };

    if (formId) {
      await supabase.from('forms').update(payload).eq('id', formId);
    } else {
      await supabase.from('forms').insert(payload);
    }
    
    setIsSaving(false);
    setCurrentView('list');
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/f/${id}`;
    navigator.clipboard.writeText(url);
    alert("¡Enlace público copiado al portapapeles!");
  };

  const viewSubmissions = async (form: any) => {
    setSelectedForm(form);
    setCurrentView('submissions');
    setLoadingSubs(true);
    
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*, profiles:submitted_by(full_name, email)')
      .eq('form_id', form.id)
      .order('created_at', { ascending: false });
      
    if (data) setSubmissions(data);
    setLoadingSubs(false);
  };

  const deleteForm = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres borrar este formulario? Se borrarán todas sus respuestas.")) return;
    await supabase.from('forms').delete().eq('id', id);
    fetchForms();
  };

  if (loading && currentView === 'list') {
    return <div style={{ padding: 40, textAlign: "center" }}>Cargando formularios...</div>;
  }

  return (
    <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
      
      {currentView === 'list' && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" }}>
            <div>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "5px" }}>CLAN <span style={{ color: "var(--brand-secondary)" }}>Forms.</span></h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Crea encuestas, solicitudes y recauda archivos fácilmente.</p>
            </div>
            <button onClick={() => openBuilder()} className="btn-primary" style={{ padding: "12px 24px", borderRadius: "12px", height: "auto" }}>
              <Plus size={18} style={{ marginRight: 8 }} /> Nuevo Formulario
            </button>
          </div>

          {forms.length === 0 ? (
            <div className="stat-card" style={{ textAlign: "center", padding: "60px", opacity: 0.6, border: "1px dashed var(--glass-border)" }}>
              <FileText size={48} style={{ margin: "0 auto 20px", color: "var(--text-muted)" }} />
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>No hay formularios</h3>
              <p>Haz clic en "Nuevo Formulario" para crear el primero.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" }}>
              {forms.map(form => (
                <div key={form.id} className="stat-card" style={{ padding: "25px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                    <div style={{ padding: "6px 12px", background: form.is_active ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)", color: form.is_active ? "#22c55e" : "#ef4444", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 800 }}>
                      {form.is_active ? "Activo" : "Cerrado"}
                    </div>
                    {form.require_login && (
                       <div style={{ padding: "6px 12px", background: "var(--brand-glow)", color: "var(--brand-secondary)", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 800 }}>
                         Solo Alumnos
                       </div>
                    )}
                  </div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: 5 }}>{form.title}</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {form.description || "Sin descripción"}
                  </p>
                  
                  <div style={{ padding: "15px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--glass-border)", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                     <div>
                       <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>Respuestas</p>
                       <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "var(--brand-secondary)" }}>{form.submissions_count}</p>
                     </div>
                     <button onClick={() => viewSubmissions(form)} className="btn-secondary" style={{ padding: "8px 16px", height: "auto", fontSize: "0.85rem" }}>
                       Ver Todo
                     </button>
                  </div>

                  <div style={{ display: "flex", gap: "10px", borderTop: "1px solid var(--glass-border)", paddingTop: "20px" }}>
                    <button onClick={() => copyLink(form.id)} className="btn-secondary" style={{ flex: 1, padding: "10px", justifyContent: "center", background: "var(--brand-primary)", color: "white", border: "none" }} title="Copiar Enlace">
                      <Copy size={16} /> Enlace
                    </button>
                    <button onClick={() => openBuilder(form)} className="btn-secondary" style={{ padding: "10px", justifyContent: "center", width: "45px" }} title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteForm(form.id)} className="btn-secondary" style={{ padding: "10px", justifyContent: "center", width: "45px", color: "#ef4444" }} title="Borrar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {currentView === 'builder' && (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
            <button onClick={() => setCurrentView('list')} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--text-main)", width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
              {formId ? "Editar Formulario" : "Crear Formulario"}
            </h2>
          </div>

          <div className="stat-card" style={{ padding: "40px", marginBottom: "30px" }}>
             <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)" }}>TÍTULO DEL FORMULARIO</label>
                <input className="input-focus-ring" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Solicitud de Certificado" style={{ width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "var(--text-main)", fontSize: "1.2rem", fontWeight: 800 }} />
             </div>
             <div style={{ marginBottom: "25px" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)" }}>DESCRIPCIÓN (Opcional)</label>
                <textarea className="input-focus-ring" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Por favor llena este formulario para tramitar tu certificado." style={{ width: "100%", padding: "15px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "var(--text-main)", minHeight: "80px", resize: "vertical" }} />
             </div>
             
             <div style={{ display: "flex", alignItems: "center", gap: "15px", padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "12px" }}>
               <input type="checkbox" id="requireLogin" checked={requireLogin} onChange={e => setRequireLogin(e.target.checked)} style={{ width: "20px", height: "20px", accentColor: "var(--brand-secondary)" }} />
               <div>
                 <label htmlFor="requireLogin" style={{ fontWeight: 800, color: "var(--text-main)", display: "block", cursor: "pointer" }}>Solo para Usuarios de CLAN (Privado)</label>
                 <p style={{ margin: "5px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>Si lo activas, solo los estudiantes logueados podrán responder. Si lo desactivas, será un formulario 100% público ideal para padres de familia o externos.</p>
               </div>
             </div>
          </div>

          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "20px", color: "var(--text-main)", paddingLeft: "10px", borderLeft: "4px solid var(--brand-secondary)" }}>Preguntas del Formulario</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "30px" }}>
             {fields.map((field, index) => (
                <div key={field.id} className="stat-card" style={{ padding: "25px", borderLeft: "4px solid var(--brand-primary)" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                       <GripVertical size={16} style={{ color: "var(--text-muted)", cursor: "grab" }} />
                       <span style={{ fontWeight: 900, color: "var(--brand-secondary)" }}>Pregunta {index + 1}</span>
                     </div>
                     <button onClick={() => removeField(field.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "5px" }}>
                        <Trash2 size={18} />
                     </button>
                   </div>
                   
                   <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "15px" }}>
                      <div style={{ flex: "2 1 300px" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "8px", color: "var(--text-muted)" }}>PREGUNTA</label>
                        <input className="input-focus-ring" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} placeholder="¿Cuál es tu nombre completo?" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "var(--text-main)", fontWeight: 600 }} />
                      </div>
                      <div style={{ flex: "1 1 150px" }}>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "8px", color: "var(--text-muted)" }}>TIPO DE RESPUESTA</label>
                        <select className="input-focus-ring" value={field.type} onChange={e => updateField(field.id, { type: e.target.value as FormField['type'] })} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "var(--text-main)", fontWeight: 600 }}>
                           <option value="text" style={{ background: "var(--bg-dark)", color: "var(--text-main)" }}>Texto Corto</option>
                           <option value="textarea" style={{ background: "var(--bg-dark)", color: "var(--text-main)" }}>Párrafo (Texto Largo)</option>
                           <option value="email" style={{ background: "var(--bg-dark)", color: "var(--text-main)" }}>Correo Electrónico</option>
                           <option value="number" style={{ background: "var(--bg-dark)", color: "var(--text-main)" }}>Número</option>
                           <option value="select" style={{ background: "var(--bg-dark)", color: "var(--text-main)" }}>Selección Múltiple (Lista)</option>
                           <option value="file" style={{ background: "var(--bg-dark)", color: "var(--text-main)" }}>Subir Archivo (PDF/Imagen)</option>
                        </select>
                      </div>
                   </div>

                   {field.type === 'select' && (
                     <div style={{ padding: "15px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid var(--glass-border)", marginBottom: "15px" }}>
                       <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "10px", color: "var(--text-muted)" }}>OPCIONES DEL DESPLEGABLE (Separadas por comas)</label>
                       <input className="input-focus-ring" value={field.options?.join(', ') || ''} onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })} placeholder="Ej: Opción 1, Opción A, Opción B" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.3)", color: "var(--text-main)", fontSize: "0.9rem" }} />
                     </div>
                   )}

                   <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="checkbox" id={`req-${field.id}`} checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} style={{ accentColor: "var(--brand-secondary)" }} />
                      <label htmlFor={`req-${field.id}`} style={{ fontSize: "0.85rem", color: "var(--text-main)", cursor: "pointer" }}>Hacer obligatoria esta pregunta</label>
                   </div>
                </div>
             ))}
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "40px" }}>
             <button onClick={() => addField('text')} className="btn-secondary" style={{ flex: 1, padding: "14px", justifyContent: "center", borderStyle: "dashed" }}>
                <Plus size={18} style={{ marginRight: 5 }} /> Añadir Pregunta
             </button>
             <button onClick={handleSaveForm} disabled={isSaving} className="btn-primary" style={{ flex: 1, padding: "14px", justifyContent: "center" }}>
                <Save size={18} style={{ marginRight: 5 }} /> {isSaving ? "Guardando..." : "Guardar Formulario"}
             </button>
          </div>

        </div>
      )}

      {currentView === 'submissions' && selectedForm && (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
            <button onClick={() => setCurrentView('list')} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--text-main)", width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-main)", margin: "0 0 5px" }}>
                Respuestas: {selectedForm.title}
              </h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>Total recibidas: {submissions.length}</p>
            </div>
          </div>

          <div className="stat-card" style={{ padding: 0, overflow: "hidden" }}>
             {loadingSubs ? (
               <div style={{ padding: 50, textAlign: "center" }}>Cargando respuestas...</div>
             ) : submissions.length === 0 ? (
               <div style={{ padding: 50, textAlign: "center", color: "var(--text-muted)" }}>Aún no hay respuestas para este formulario.</div>
             ) : (
               <div style={{ overflowX: "auto" }}>
                 <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                   <thead>
                     <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                        <th style={{ padding: "15px 20px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1 }}>FECHA</th>
                        {selectedForm.require_login && <th style={{ padding: "15px 20px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1 }}>ALUMNO (CLAN)</th>}
                        {selectedForm.fields.map((f: FormField) => (
                           <th key={f.id} style={{ padding: "15px 20px", fontWeight: 900, fontSize: "0.75rem", color: "var(--brand-secondary)", letterSpacing: 1, whiteSpace: "nowrap" }}>{f.label.toUpperCase()}</th>
                        ))}
                     </tr>
                   </thead>
                   <tbody>
                     {submissions.map(sub => (
                       <tr key={sub.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                         <td style={{ padding: "15px 20px", color: "var(--text-main)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                            {new Date(sub.created_at).toLocaleString()}
                         </td>
                         {selectedForm.require_login && (
                           <td style={{ padding: "15px 20px", fontWeight: 800, color: "var(--text-main)", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                             {sub.profiles ? sub.profiles.full_name : "Anónimo"}
                           </td>
                         )}
                         {selectedForm.fields.map((f: FormField) => {
                            const val = sub.answers[f.id];
                            return (
                              <td key={f.id} style={{ padding: "15px 20px", color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {f.type === 'file' && val ? (
                                   <a href={val} target="_blank" rel="noreferrer" style={{ color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: 5, textDecoration: "none", fontWeight: 800 }}>
                                      <Download size={14} /> Ver Archivo
                                   </a>
                                ) : (
                                   val || "-"
                                )}
                              </td>
                            );
                         })}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>
      )}

    </div>
  );
}
