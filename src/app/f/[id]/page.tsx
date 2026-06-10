"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CheckCircle2, AlertTriangle, UploadCloud, ChevronRight, Loader2 } from "lucide-react";

type FormField = {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'select' | 'file';
  label: string;
  required: boolean;
  options?: string[];
};

type ClanForm = {
  id: string;
  title: string;
  description: string;
  require_login: boolean;
  is_active: boolean;
  fields: FormField[];
};

export default function PublicFormView() {
  const { id } = useParams();
  const supabase = createClient();
  
  const [form, setForm] = useState<ClanForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form State
  const [answers, setAnswers] = useState<{[key: string]: any}>({});
  const [files, setFiles] = useState<{[key: string]: File}>({});
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const checkAuthAndFetchForm = async () => {
      // 1. Check Auth
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setCheckingAuth(false);

      // 2. Fetch Form
      if (id) {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', id)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          setErrorMsg("Este formulario no existe o ha sido desactivado.");
        } else {
          setForm(data);
        }
      }
      setLoading(false);
    };

    checkAuthAndFetchForm();
  }, [id]);

  const handleAnswerChange = (fieldId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    if (file) {
       setFiles(prev => ({ ...prev, [fieldId]: file }));
    } else {
       const newFiles = { ...files };
       delete newFiles[fieldId];
       setFiles(newFiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate required fields
    for (const field of form.fields) {
       if (field.required) {
          const hasAnswer = answers[field.id]?.trim();
          const hasFile = files[field.id];
          if (!hasAnswer && !hasFile && field.type !== 'file') {
             return alert(`La pregunta "${field.label}" es obligatoria.`);
          }
          if (!hasFile && field.type === 'file') {
             return alert(`Debes subir un archivo para "${field.label}".`);
          }
       }
    }

    setSubmitting(true);
    let finalAnswers = { ...answers };

    // Upload files if any
    if (Object.keys(files).length > 0) {
       setUploadingFiles(true);
       for (const [fieldId, file] of Object.entries(files)) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${form.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('form_uploads')
            .upload(fileName, file);

          if (uploadError) {
             console.error("Upload error:", uploadError);
             alert(`Hubo un error subiendo el archivo: ${file.name}`);
             setSubmitting(false);
             setUploadingFiles(false);
             return;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('form_uploads')
            .getPublicUrl(fileName);

          finalAnswers[fieldId] = publicUrl;
       }
       setUploadingFiles(false);
    }

    // Submit form
    const { error } = await supabase.from('form_submissions').insert({
       form_id: form.id,
       submitted_by: user ? user.id : null,
       answers: finalAnswers
    });

    if (error) {
       console.error(error);
       alert("Error al enviar el formulario. Intenta nuevamente.");
    } else {
       setSubmitted(true);
    }
    
    setSubmitting(false);
  };

  if (loading || checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)" }}>
        <Loader2 className="spin" size={40} style={{ color: "var(--brand-secondary)" }} />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)", padding: 20 }}>
        <Logo sizeMultiplier={1.5} />
        <div style={{ marginTop: 40, background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", padding: "30px", borderRadius: "20px", textAlign: "center", maxWidth: 500 }}>
           <AlertTriangle size={40} style={{ color: "#ef4444", margin: "0 auto 15px" }} />
           <h2 style={{ color: "white", margin: "0 0 10px", fontSize: "1.5rem", fontWeight: 800 }}>Enlace Inválido</h2>
           <p style={{ color: "var(--text-muted)", margin: 0 }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (form?.require_login && !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)", padding: 20 }}>
        <Logo sizeMultiplier={1.5} />
        <div style={{ marginTop: 40, background: "var(--bg-card)", border: "1px solid var(--glass-border)", padding: "40px", borderRadius: "24px", textAlign: "center", maxWidth: 500, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
           <h2 style={{ color: "white", margin: "0 0 10px", fontSize: "1.8rem", fontWeight: 800 }}>Acceso Restringido</h2>
           <p style={{ color: "var(--text-muted)", margin: "0 0 30px", lineHeight: 1.6 }}>Este formulario es exclusivo para estudiantes de la academia. Por favor, inicia sesión para poder llenarlo.</p>
           <Link href="/login" className="btn-primary" style={{ padding: "14px 24px", justifyContent: "center", width: "100%" }}>
             Iniciar Sesión <ChevronRight size={18} />
           </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-dark)", padding: 20 }}>
        <Logo sizeMultiplier={1.5} />
        <div style={{ marginTop: 40, background: "var(--bg-card)", border: "1px solid var(--glass-border)", padding: "50px", borderRadius: "24px", textAlign: "center", maxWidth: 500, animation: "scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" }}>
           <CheckCircle2 size={60} style={{ color: "#22c55e", margin: "0 auto 20px" }} />
           <h2 style={{ color: "white", margin: "0 0 10px", fontSize: "2rem", fontWeight: 900 }}>¡Recibido!</h2>
           <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "1.05rem" }}>Tus respuestas se han registrado correctamente en nuestro sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-dark)", display: "flex", flexDirection: "column" }}>
       
       <header style={{ padding: "30px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
          <Logo sizeMultiplier={0.7} />
       </header>

       <main style={{ flex: 1, padding: "50px 20px", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ marginBottom: "50px" }}>
             <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--text-main)", marginBottom: "15px", letterSpacing: "-0.5px" }}>
               {form?.title}
             </h1>
             {form?.description && (
               <p style={{ fontSize: "1.1rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                 {form.description}
               </p>
             )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
             {form?.fields.map((field, index) => (
                <div key={field.id} style={{ background: "var(--bg-card)", padding: "35px", borderRadius: "24px", border: "1px solid var(--glass-border)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", transition: "0.3s" }} className="form-field-card">
                   <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "20px" }}>
                      <span style={{ color: "var(--brand-secondary)", fontSize: "1rem", marginTop: 2 }}>{index + 1}.</span>
                      <span>
                         {field.label}
                         {field.required && <span style={{ color: "#ef4444", marginLeft: "5px" }}>*</span>}
                      </span>
                   </label>

                   {field.type === 'text' && (
                     <input 
                       className="form-input-elegance"
                       type="text"
                       required={field.required}
                       placeholder="Escribe tu respuesta aquí..."
                       onChange={e => handleAnswerChange(field.id, e.target.value)}
                       style={{ width: "100%", padding: "15px 0", background: "transparent", border: "none", borderBottom: "2px solid rgba(255,255,255,0.1)", color: "var(--brand-secondary)", fontSize: "1.2rem", fontWeight: 600, outline: "none", transition: "0.3s" }}
                     />
                   )}

                   {field.type === 'textarea' && (
                     <textarea 
                       className="form-input-elegance"
                       required={field.required}
                       placeholder="Escribe tu respuesta detallada aquí..."
                       onChange={e => handleAnswerChange(field.id, e.target.value)}
                       style={{ width: "100%", padding: "20px", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", color: "var(--brand-secondary)", fontSize: "1.1rem", fontWeight: 500, outline: "none", transition: "0.3s", minHeight: "120px", resize: "vertical" }}
                     />
                   )}

                   {field.type === 'email' && (
                     <input 
                       className="form-input-elegance"
                       type="email"
                       required={field.required}
                       placeholder="ejemplo@correo.com"
                       onChange={e => handleAnswerChange(field.id, e.target.value)}
                       style={{ width: "100%", padding: "15px 0", background: "transparent", border: "none", borderBottom: "2px solid rgba(255,255,255,0.1)", color: "var(--brand-secondary)", fontSize: "1.2rem", fontWeight: 600, outline: "none", transition: "0.3s" }}
                     />
                   )}

                   {field.type === 'number' && (
                     <input 
                       className="form-input-elegance"
                       type="number"
                       required={field.required}
                       placeholder="Ej: 123"
                       onChange={e => handleAnswerChange(field.id, e.target.value)}
                       style={{ width: "100%", padding: "15px 0", background: "transparent", border: "none", borderBottom: "2px solid rgba(255,255,255,0.1)", color: "var(--brand-secondary)", fontSize: "1.2rem", fontWeight: 600, outline: "none", transition: "0.3s" }}
                     />
                   )}

                   {field.type === 'select' && (
                     <div style={{ position: "relative" }}>
                       <select 
                         required={field.required}
                         onChange={e => handleAnswerChange(field.id, e.target.value)}
                         defaultValue=""
                         style={{ width: "100%", padding: "20px", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", color: "var(--brand-secondary)", fontSize: "1.1rem", fontWeight: 600, outline: "none", appearance: "none", cursor: "pointer" }}
                       >
                         <option value="" disabled>Selecciona una opción...</option>
                         {field.options?.map((opt, i) => (
                           <option key={i} value={opt} style={{ background: "var(--bg-dark)", color: "var(--text-main)" }}>{opt}</option>
                         ))}
                       </select>
                     </div>
                   )}

                   {field.type === 'file' && (
                     <div style={{ position: "relative" }}>
                       <input 
                         type="file" 
                         id={`file-${field.id}`}
                         required={field.required && !files[field.id]}
                         onChange={e => handleFileChange(field.id, e.target.files?.[0] || null)}
                         style={{ display: "none" }}
                       />
                       <label htmlFor={`file-${field.id}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: files[field.id] ? "rgba(0,82,255,0.05)" : "rgba(255,255,255,0.02)", border: `2px dashed ${files[field.id] ? "var(--brand-secondary)" : "rgba(255,255,255,0.1)"}`, borderRadius: "16px", cursor: "pointer", transition: "0.3s" }}>
                          <UploadCloud size={32} style={{ color: files[field.id] ? "var(--brand-secondary)" : "var(--text-muted)", marginBottom: "15px" }} />
                          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: files[field.id] ? "var(--brand-secondary)" : "var(--text-main)" }}>
                            {files[field.id] ? files[field.id].name : "Haz clic para subir un archivo"}
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "8px" }}>PDF, JPG, PNG. (Max. 5MB recomendados)</span>
                       </label>
                     </div>
                   )}
                </div>
             ))}

             <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: "18px 40px", fontSize: "1.2rem", borderRadius: "16px", background: "var(--brand-primary)", boxShadow: "0 10px 25px rgba(0,82,255,0.4)", display: "flex", alignItems: "center", gap: "10px", width: "100%", justifyContent: "center" }}>
                   {uploadingFiles ? (
                     <><Loader2 className="spin" size={24} /> Subiendo archivos...</>
                   ) : submitting ? (
                     <><Loader2 className="spin" size={24} /> Enviando...</>
                   ) : (
                     <>Enviar Formulario <ChevronRight size={20} /></>
                   )}
                </button>
             </div>
          </form>
       </main>
       
       <style dangerouslySetInnerHTML={{__html: `
         .form-input-elegance:focus {
            border-color: var(--brand-secondary) !important;
         }
         .form-field-card:focus-within {
            border-color: rgba(0,82,255,0.3) !important;
            box-shadow: 0 10px 40px rgba(0,82,255,0.1) !important;
         }
       `}} />
    </div>
  );
}
