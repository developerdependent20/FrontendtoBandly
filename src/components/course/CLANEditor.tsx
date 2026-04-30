"use client";

import { useState, useRef, useEffect } from "react";
import { Bold, Italic, Underline, Eraser, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Edit3, Code, Sparkles, Bot, Save, Trophy } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export const CLANEditor = ({ 
  blockId, 
  initialHtml, 
  isEditMode = true, 
  isAdmin = false, 
  courseId = null,
  mode = "delivery",
  onSave,
  userSubmission,
  onGrade,
  onOpenTutor
}: { 
  blockId: string, 
  initialHtml: string, 
  isEditMode?: boolean, 
  isAdmin?: boolean, 
  courseId?: string | null,
  mode?: "delivery" | "content" | "grading",
  onSave?: (newHtml: string) => void,
  userSubmission?: any,
  onGrade?: (content: string, score: number, feedback: string) => void,
  onOpenTutor?: (text: string) => void
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (editorRef.current) {
      // Solo inicializamos el contenido si el editor está vacío o cambia el blockId
      editorRef.current.innerHTML = initialHtml || "";
      const text = editorRef.current.innerText || "";
      setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length);
    }
  }, [blockId]); // Solo re-inicializa al cambiar de bloque, evitando borrar mientras escribes

  if (mode === "delivery" && userSubmission && !isEditMode && !isAdmin) {
    return (
       <div style={{ padding: 40, background: "rgba(255, 255, 255, 0.03)", borderRadius: 32, border: "1px solid var(--glass-border)", marginBottom: 40, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, padding: "10px 25px", background: userSubmission.status === 'graded' ? "#10b981" : "var(--yellow-primary)", color: "black", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5, boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}>
             {userSubmission.status === 'graded' ? "✓ PROYECTO CALIFICADO" : "⏳ ENTREGA RECIBIDA"}
          </div>
          
          <h3 style={{ color: "var(--yellow-primary)", marginBottom: 25, fontFamily: "'Playfair Display', serif", fontSize: "1.8rem" }}>Tu Entrega de Proyecto</h3>
          
          {/* CAJA DE CONTENIDO: ESTILO PAPEL PARA MÁXIMO CONTRASTE */}
          <div style={{ background: "#ffffff", padding: "40px", borderRadius: 20, border: "1px solid #e2e8f0", marginBottom: 30, boxShadow: "inset 0 2px 10px rgba(0,0,0,0.05)" }}>
             <p style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 20, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>CONTENIDO ENVIADO:</p>
             <div 
                dangerouslySetInnerHTML={{ __html: userSubmission.content }} 
                style={{ 
                   color: "#1e293b", 
                   lineHeight: 1.8, 
                   fontSize: "1.1rem",
                   fontFamily: "Inter, sans-serif"
                }} 
             />
          </div>

          {userSubmission.status === 'graded' ? (
             <div style={{ padding: 35, background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 24, animation: "fadeIn 0.6s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                   <h4 style={{ color: "#10b981", margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: 12 }}><Trophy size={24} /> Feedback del Mentor</h4>
                   <div style={{ background: "#10b981", color: "white", padding: "8px 20px", borderRadius: 12, fontWeight: 900, fontSize: "1.4rem", boxShadow: "0 5px 15px rgba(16, 185, 129, 0.3)" }}>{userSubmission.score}/100</div>
                </div>
                <p style={{ margin: 0, fontStyle: "italic", color: "white", opacity: 0.9, fontSize: "1.05rem", lineHeight: 1.6 }}>"{userSubmission.feedback || "Tu trabajo ha sido revisado con éxito por tu mentor."}"</p>
             </div>
          ) : (
             <div style={{ display: "flex", alignItems: "center", gap: 15, background: "rgba(255,255,255,0.03)", padding: "15px 25px", borderRadius: 15 }}>
                <div className="pulse-dot" style={{ width: 12, height: 12, background: "var(--yellow-primary)", borderRadius: "50%" }}></div>
                <p style={{ margin: 0, fontSize: "0.95rem", opacity: 0.8 }}>Tu mentor está revisando este trabajo para darte una retroalimentación detallada.</p>
             </div>
          )}
       </div>
    );
  }

  const handleCommand = (e: React.MouseEvent, cmd: string, val: string | undefined = undefined) => {
    e.preventDefault(); // CLAVE: Previene que el botón robe el foco y se pierda la selección del texto
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, val);
    
    // Si estamos en modo calificación, sincronizamos el cambio de una vez
    if (mode === "grading" && editorRef.current) {
      onGrade?.(editorRef.current.innerHTML, 0, "");
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (mode !== "delivery") return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    selection.deleteFromDocument();

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style.backgroundColor = "rgba(255, 255, 0, 0.35)";
    span.textContent = text;

    range.insertNode(span);
    
    // Insert a non-breaking space after to "break" the styling
    const spacer = document.createTextNode("\u00A0");
    range.setStartAfter(span);
    range.insertNode(spacer);
    
    // Move cursor after the spacer
    range.setStartAfter(spacer);
    range.setEndAfter(spacer);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const saveContent = async () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    setIsSaving(true);
    
    if (mode === "grading") {
       onGrade?.(content, 0, ""); // In grading mode, we'll handle the actual submission via the parent
       setIsSaving(false);
       return;
    }

    if (mode === "delivery") {
      if (content.length < 10) { setIsSaving(false); return alert("Escribe algo más sustancioso."); }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsSaving(false); return alert("Inicia sesión para entregar."); }

      const { error } = await supabase.from("submissions").upsert({
        student_id: user.id,
        block_id: blockId,
        content: content,
        status: "pending"
      }, { onConflict: "student_id, block_id" });
      if (error) alert("Error: " + error.message);
      else { alert("¡Trabajo enviado con éxito!"); window.location.reload(); }
    } else {
      // Guardar contenido de bloque Texto/HTML
      const { error } = await supabase.from("blocks").update({ content: { html: content } }).eq("id", blockId);
      if (error) alert("Error al guardar: " + error.message);
      else onSave?.(content); // Notificar al padre para actualizar estado sin recargar
    }
    setIsSaving(false);
  };

  return (
    <div className="wiki-editor-container" style={{ margin: "40px 0", borderRadius: 24, overflow: "hidden", border: "1px solid #e2e8f0", background: "white", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}>
      <div className="wiki-toolbar" style={{ background: "#f8fafc", padding: "15px 20px", display: "flex", flexWrap: "wrap", gap: 15, alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
        
        {/* GRUPO FORMATO */}
        <div style={{ display: "flex", gap: "2px", background: "white", padding: 4, borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <button className="tool-btn-styled" aria-label="Negrita" onMouseDown={(e) => handleCommand(e, 'bold')} title="Negrita"><Bold size={16} color="#334155" /></button>
          <button className="tool-btn-styled" aria-label="Cursiva" onMouseDown={(e) => handleCommand(e, 'italic')} title="Itálica"><Italic size={16} color="#334155" /></button>
          <button className="tool-btn-styled" aria-label="Subrayado" onMouseDown={(e) => handleCommand(e, 'underline')} title="Subrayado"><Underline size={16} color="#334155" /></button>
          <div style={{ width: 1, height: 18, background: "#e2e8f0", alignSelf: "center", margin: "0 4px" }} />
          <button className="tool-btn-styled" aria-label="Borrar Formato" onMouseDown={(e) => handleCommand(e, 'removeFormat')} title="Borrar Formato"><Eraser size={16} color="#ef4444" /></button>
        </div>
        
        {/* GRUPO ESTILO */}
        <div style={{ display: "flex", gap: "8px", background: "white", padding: "4px 12px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <select onChange={(e) => handleCommand(e as any, 'fontSize', e.target.value)} onMouseDown={(e) => e.stopPropagation()} style={{ background: "transparent", border: "none", fontSize: "0.8rem", color: "#475569", fontWeight: 700, outline: "none", cursor: "pointer", padding: "4px 0" }}>
            <option value="3">TAMAÑO</option>
            <option value="1">1 (Mini)</option>
            <option value="2">2 (Bajo)</option>
            <option value="3">3 (Normal)</option>
            <option value="4">4 (Medio)</option>
            <option value="5">5 (Grande)</option>
            <option value="6">6 (Muy Grande)</option>
            <option value="7">7 (Título)</option>
          </select>
          <div style={{ width: 1, height: 18, background: "#e2e8f0", alignSelf: "center" }} />
          <select onChange={(e) => handleCommand(e as any, 'fontName', e.target.value)} onMouseDown={(e) => e.stopPropagation()} style={{ background: "transparent", border: "none", fontSize: "0.8rem", color: "#475569", fontWeight: 700, outline: "none", cursor: "pointer", padding: "4px 0", maxWidth: 100 }}>
            <option value="Inter">FUENTE</option>
            <option value="Inter">Inter (Sans)</option>
            <option value="'Playfair Display'">Playfair (Serif)</option>
            <option value="'Outfit'">Outfit (Modern)</option>
            <option value="Arial">Arial (Sencilla)</option>
          </select>
          <div style={{ width: 1, height: 18, background: "#e2e8f0", alignSelf: "center" }} />
          <input 
            type="color" 
            title="Color de Texto"
            aria-label="Color de Texto"
            onChange={(e) => handleCommand(e as any, 'foreColor', e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: 20, height: 20, border: "none", background: "transparent", cursor: "pointer" }}
          />
        </div>

        {/* GRUPO REVISIÓN (SÓLO MENTOR EN MODO CALIFICACIÓN) */}
        {isAdmin && mode === "grading" && (
          <div style={{ display: "flex", gap: "6px", background: "#f8fafc", padding: "4px 10px", borderRadius: 10, border: "1px solid #cbd5e1", alignItems: "center", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#64748b", letterSpacing: "1px" }}>BISTURÍ MENTOR:</span>
            <button className="tool-btn-styled" onMouseDown={(e) => handleCommand(e, 'hiliteColor', '#ffcccc')} style={{ background: "#fecaca", border: "1px solid #f87171" }} title="Corregir (Rojo)"><Edit3 size={14} color="#b91c1c" /></button>
            <button className="tool-btn-styled" onMouseDown={(e) => handleCommand(e, 'hiliteColor', '#ccffcc')} style={{ background: "#bbf7d0", border: "1px solid #4ade80" }} title="Correcto (Verde)"><Edit3 size={14} color="#15803d" /></button>
            <button className="tool-btn-styled" onMouseDown={(e) => handleCommand(e, 'hiliteColor', '#fde68a')} style={{ background: "#fef08a", border: "1px solid #facc15" }} title="Nota (Amarillo)"><Edit3 size={14} color="#a16207" /></button>
          </div>
        )}
        {/* GRUPO ALINEACIÓN */}
        <div style={{ display: "flex", gap: "4px", background: "white", padding: 4, borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <button className="tool-btn-styled" aria-label="Alinear a la Izquierda" onMouseDown={(e) => handleCommand(e, 'justifyLeft')} title="Izquierda"><AlignLeft size={16} color="#334155" /></button>
          <button className="tool-btn-styled" aria-label="Alinear al Centro" onMouseDown={(e) => handleCommand(e, 'justifyCenter')} title="Centrar"><AlignCenter size={16} color="#334155" /></button>
          <button className="tool-btn-styled" aria-label="Alinear a la Derecha" onMouseDown={(e) => handleCommand(e, 'justifyRight')} title="Derecha"><AlignRight size={16} color="#334155" /></button>
          <button className="tool-btn-styled" aria-label="Justificar texto" onMouseDown={(e) => handleCommand(e, 'justifyFull')} title="Justificar"><AlignJustify size={16} color="#334155" /></button>
          <div style={{ width: 1, height: 18, background: "#e2e8f0", alignSelf: "center", margin: "0 4px" }} />
          <button className="tool-btn-styled" aria-label="Lista con viñetas" onMouseDown={(e) => handleCommand(e, 'insertUnorderedList')}><List size={16} color="#334155" /></button>
          <button className="tool-btn-styled" aria-label="Lista numerada" onMouseDown={(e) => handleCommand(e, 'insertOrderedList')}><ListOrdered size={16} color="#334155" /></button>
        </div>
        
        {/* GRUPO HTML LIBRE */}
        {mode === "content" && isEditMode && (
           <div style={{ display: "flex", gap: "2px", background: "white", padding: 4, borderRadius: 10, border: "1px solid #e2e8f0" }}>
             <button 
               className="tool-btn-styled" 
               aria-label="Insertar Código HTML Libre"
               onMouseDown={(e) => {
                 e.preventDefault();
                 const html = prompt("Pega tu código HTML aquí (iframes, vídeos, formatos especiales, etc):");
                 if (html) {
                   if (editorRef.current) editorRef.current.focus();
                   document.execCommand("insertHTML", false, html);
                 }
               }}
               title="Insertar Código HTML"
             >
               <Code size={16} color="#334155" />
             </button>
           </div>
        )}
        {/* GRUPO TUTOR IA (INTELIGENCIA TUTOR CLAN) */}
        {mode === "delivery" && !isEditMode && (
          <div style={{ display: "flex", gap: "2px", background: wordCount >= 100 ? "rgba(250, 204, 21, 0.05)" : "white", padding: 4, borderRadius: 10, border: wordCount >= 100 ? "1px solid var(--yellow-primary)" : "1px solid #e2e8f0", transition: "0.4s all" }}>
            <button 
              className={wordCount >= 100 ? "btn-tutor-glow" : ""}
              onClick={() => {
                if (wordCount >= 100 && editorRef.current) {
                  onOpenTutor?.(editorRef.current.innerText);
                }
              }}
              title={wordCount >= 100 ? "Activar Tutor CLAN" : "Escribe 100 palabras para activar el Tutor CLAN"}
              style={{ 
                border: "none", 
                background: wordCount >= 100 ? "var(--yellow-primary)" : "transparent",
                color: wordCount >= 100 ? "black" : "#cbd5e1",
                padding: "0 12px",
                height: "32px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.7rem",
                fontWeight: 900,
                cursor: wordCount >= 100 ? "pointer" : "help",
                transition: "0.3s"
              }}
            >
              {wordCount >= 100 ? <Sparkles size={14} /> : <Bot size={14} />}
              {wordCount >= 100 ? "TUTOR ACTIVO" : `TUTOR CLAN (${wordCount}/100)`}
            </button>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 15 }}>
          {/* Word count display ONLY for delivery mode */}
          {mode === "delivery" && (
            <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", letterSpacing: 1 }}>{wordCount} PALABRAS</span>
          )}
        </div>

        {mode === "content" && isEditMode && (
          <button 
            className="tool-btn-styled" 
            onClick={saveContent} 
            style={{ marginLeft: "auto", background: "var(--yellow-primary)", color: "black", width: "auto", padding: "0 15px", fontWeight: 700, pointerEvents: isSaving ? "none" : "auto" }}
          >
            {isSaving ? "GUARDANDO..." : <><Save size={16} style={{ marginRight: 8 }} /> GUARDAR CAMBIOS</>}
          </button>
        )}
      </div>

      <style jsx>{`
        .tool-btn-styled {
          display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
          border-radius: 8px; border: none; background: transparent; cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .tool-btn-styled:hover { background: #f1f5f9; }
        .tool-btn-styled:active { transform: scale(0.95); }
      `}</style>

      <div 
        ref={editorRef}
        contentEditable={mode === "delivery" ? !isEditMode : isEditMode}
        onPaste={handlePaste}
        onInput={() => {
           if (mode === "grading" && editorRef.current) {
              onGrade?.(editorRef.current.innerHTML, 0, "");
           }
        }}
        onKeyUp={() => {
           if (editorRef.current) {
             const text = editorRef.current.innerText || "";
             setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length);
           }
           if (mode === "grading" && editorRef.current) {
              onGrade?.(editorRef.current.innerHTML, 0, "");
           }
        }}
        suppressContentEditableWarning
        style={{ 
          minHeight: mode === "delivery" ? "400px" : "150px", 
          padding: "40px", color: "#1e293b", outline: "none", 
          background: "#ffffff", fontSize: "1.1rem", lineHeight: "1.8", fontFamily: "Inter" 
        }}
      />

      {mode === "delivery" && (
        <div style={{ padding: "25px 40px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b", maxWidth: "60%", lineHeight: "1.5" }}>
            <strong style={{ color: "#475569" }}>Normas de Entrega:</strong> Tu respuesta debe ser original. El sistema detecta contenido pegado. Usa las herramientas de estilo para organizar mejor tu trabajo.
          </div>
          {!isEditMode && (
            <button 
              onClick={saveContent} 
              className="btn-primary" 
              style={{ 
                padding: "15px 45px", 
                fontSize: "1.1rem", 
                fontWeight: 800, 
                letterSpacing: "0.5px",
                boxShadow: "0 10px 20px rgba(212, 175, 55, 0.2)"
              }}
            >
              ENVIAR TRABAJO FINAL
            </button>
          )}
        </div>
      )}
    </div>
  );
};
