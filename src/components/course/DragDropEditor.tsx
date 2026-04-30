"use client";

import { useState, useEffect } from "react";
import { Trophy, Gamepad2, Trash2, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export const DragDropEditor = ({ blockId, initialData, isEditMode, isAdmin, courseId, onSave, userSubmission, currentUser }: any) => {
  const [pairs, setPairs] = useState<any[]>(initialData?.pairs || []);
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);

  // Student exact state
  const [droppedItems, setDroppedItems] = useState<{[key: string]: string}>({}); // def_id: term_id
  const [randomizedTerms, setRandomizedTerms] = useState<any[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (pairs.length > 0) {
       // Randomize terms for everyone to allow testing in Edit mode too
       const termsOrder = [...pairs].sort(() => Math.random() - 0.5);
       setRandomizedTerms(termsOrder);
       setDroppedItems({});
       setIsSuccess(false);
    }
  }, [pairs]);

  const savePairs = async (newPairs: any[]) => {
    setPairs(newPairs);
    setIsSaving(true);
    const { error } = await supabase.from("blocks").update({ content: { pairs: newPairs } }).eq("id", blockId);
    if (!error) onSave?.({ pairs: newPairs });
    setIsSaving(false);
  };

  const addPair = () => {
    savePairs([...pairs, { id: Date.now().toString(), term: "Platón", def: "Filósofo griego seguidor de Sócrates." }]);
  };

  const updatePair = (id: string, field: 'term' | 'def', value: string) => {
    savePairs(pairs.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Student Drag events
  const handleDragStart = (e: any, termId: string) => {
     e.dataTransfer.setData("termId", termId);
     e.currentTarget.style.opacity = '0.4';
  };
  const handleDragEnd = (e: any) => { e.currentTarget.style.opacity = '1'; };
  const handleDragOver = (e: any) => { e.preventDefault(); };
  const handleDrop = (e: any, targetDefId: string) => {
     e.preventDefault();
     const termId = e.dataTransfer.getData("termId");
     if (!termId || termId !== targetDefId) return; // Only allow dropping if it's the exact match

     const newDropped = { ...droppedItems, [targetDefId]: termId };
     setDroppedItems(newDropped);
     
     // Check if all are dropped correctly
     if (Object.keys(newDropped).length === pairs.length && pairs.length > 0) {
        setTimeout(() => setIsSuccess(true), 300);
     }
  };

  const availableTerms = randomizedTerms.filter(t => !Object.values(droppedItems).includes(t.id));
  const previewUI = pairs.length > 0 ? (
      <div style={{ background: "rgba(0,0,0,0.2)", padding: "40px", borderRadius: "32px", border: "1px solid #1e3a8a", marginBottom: "40px", position: "relative", overflow: "hidden" }}>
         {isSuccess && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(30, 58, 138, 0.95)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)", animation: "fadeIn 0.5s ease" }}>
               <Trophy size={60} color="#facc15" style={{ marginBottom: 20, animation: "bounce 1s infinite" }} />
               <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "3rem", color: "white", margin: "0 0 10px 0" }}>¡Excelente!</h2>
               <p style={{ opacity: 0.8, fontSize: "1.2rem", color: "white", marginBottom: 30 }}>Has emparejado todo correctamente.</p>
               {(!isEditMode && !isAdmin) ? (
                 <button onClick={async () => {
                    await supabase.from("submissions").upsert({
                        student_id: currentUser.id,
                        block_id: blockId,
                        content: JSON.stringify(droppedItems),
                        status: "pending"
                    }, { onConflict: "student_id, block_id" });
                    window.location.reload();
                 }} className="btn-primary">ENVIAR RESULTADO AL PROFESOR</button>
               ) : (
                 <button onClick={() => {
                   setDroppedItems({});
                   setIsSuccess(false);
                   const termsOrder = [...pairs].sort(() => Math.random() - 0.5);
                   setRandomizedTerms(termsOrder);
                 }} className="btn-primary">REINICIAR VISTA PREVIA</button>
               )}
            </div>
         )}
         
         <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 30 }}>
            <Gamepad2 size={24} color="#60a5fa" />
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", margin: 0, color: "white" }}>Empareja los conceptos</h3>
         </div>
         
         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            {/* Pool de Conceptos */}
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 24, padding: 30, border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 15, minHeight: 400 }}>
               <span style={{ fontSize: "0.85rem", opacity: 0.5, letterSpacing: 2 }}>TÉRMINOS DISPONIBLES</span>
               {availableTerms.map((term) => (
                 <div 
                   key={term.id} 
                   draggable="true"
                   onDragStart={(e) => handleDragStart(e, term.id)}
                   onDragEnd={handleDragEnd}
                   style={{ background: "#1e3a8a", padding: "15px 20px", borderRadius: 12, border: "2px solid #3b82f6", color: "white", fontSize: "1.1rem", fontWeight: 700, cursor: "grab", boxShadow: "0 4px 15px rgba(0,0,0,0.3)", transition: "all 0.2s" }}
                 >
                    {term.term}
                 </div>
               ))}
               {availableTerms.length === 0 && <span style={{ opacity: 0.3, fontStyle: "italic", textAlign: "center", marginTop: 40 }}>¡Vacío!</span>}
            </div>

            {/* Zonas de Soltar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
               <span style={{ fontSize: "0.85rem", opacity: 0.5, letterSpacing: 2 }}>ZONAS DE DEFINICIÓN</span>
               {pairs.map((p) => {
                  const isDropped = droppedItems[p.id] === p.id;
                  return (
                    <div key={p.id} style={{ display: "flex", gap: 15, alignItems: "stretch" }}>
                       <div 
                         onDragOver={handleDragOver}
                         onDrop={(e) => handleDrop(e, p.id)}
                         style={{ flex: "0 0 40%", background: isDropped ? "#059669" : "rgba(255,255,255,0.03)", border: isDropped ? "2px solid #10b981" : "2px dashed rgba(255,255,255,0.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 60, padding: "10px", transition: "all 0.3s" }}
                       >
                          {isDropped ? (
                             <span style={{ fontWeight: 800, color: "white" }}>{p.term}</span>
                          ) : (
                             <span style={{ opacity: 0.3, fontSize: "0.85rem" }}>ARRASTRA AQUÍ</span>
                          )}
                       </div>
                       <div style={{ flex: "1", background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: 12, display: "flex", alignItems: "center", fontSize: "0.95rem", lineHeight: 1.5, border: "1px solid rgba(255,255,255,0.05)" }}>
                          {p.def}
                       </div>
                    </div>
                  );
               })}
            </div>
         </div>
      </div>
  ) : null;

  if (!isEditMode && !isAdmin) {
    if (userSubmission) {
       return (
          <div style={{ padding: 40, background: "rgba(0,0,0,0.2)", borderRadius: 32, border: "1px solid #1e3a8a", marginBottom: 40 }}>
             <h3 style={{ color: "var(--yellow-primary)", display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}><Gamepad2 size={24} /> Drag & Drop Completado</h3>
             <div style={{ display: "flex", gap: 15, marginBottom: 20 }}>
               <span style={{ padding: "5px 12px", background: userSubmission.status === 'graded' ? "#10b981" : "#f59e0b", color: "white", borderRadius: 10, fontSize: "0.8rem", fontWeight: 700 }}>{userSubmission.status === 'graded' ? "CALIFICADO" : "PENDIENTE DE REVISIÓN"}</span>
               {userSubmission.score && <span style={{ padding: "5px 12px", background: "rgba(255,255,255,0.1)", borderRadius: 10, fontSize: "0.8rem", fontWeight: 700 }}>Calificación: {userSubmission.score}</span>}
            </div>
            <p style={{ opacity: 0.5, marginTop: 20 }}>Esta actividad ya ha sido superada y registrada con éxito.</p>
          </div>
       );
    }
    return previewUI;
  }

  return (
    <div style={{ background: "var(--bg-dark)", padding: "40px", borderRadius: "24px", border: "1px solid #1e3a8a", marginBottom: "40px", position: "relative" }}>
      <div style={{ position: "absolute", top: -12, left: 30, background: "#1e3a8a", padding: "4px 15px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 800, letterSpacing: 1, display: "flex", alignItems: "center", gap: 6, color: "white" }}>
        <Gamepad2 size={14} /> MODO EDICIÓN DRAG & DROP {isSaving && <span style={{ opacity: 0.5 }}>(Guardando...)</span>}
      </div>

      {previewUI && (
         <div style={{ borderBottom: "1px dashed rgba(255,255,255,0.2)", paddingBottom: 20, marginBottom: 40 }}>
            <h4 style={{ textAlign: "center", color: "#60a5fa", fontSize: "0.85rem", letterSpacing: 2, marginBottom: 10 }}>VISTA PREVIA INTERACTIVA</h4>
            {previewUI}
         </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        {pairs.length === 0 ? <p style={{ opacity: 0.5, textAlign: "center", padding: 20 }}>Añade parejas de conceptos para el Drag and Drop.</p> : null}
        
        {pairs.map((p, idx) => (
          <div key={p.id} style={{ display: "flex", gap: 15, background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
             <div style={{ flex: "0 0 35%", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: 5 }}>TÉRMINO (ARRASTRABLE)</span>
                <input value={p.term} onChange={(e) => updatePair(p.id, 'term', e.target.value)} style={{ width: "100%", padding: "12px 15px", borderRadius: 10, background: "rgba(30, 58, 138, 0.2)", border: "1px solid #3b82f6", color: "white", outline: "none", fontWeight: 800 }} />
             </div>
             <div style={{ flex: "1", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: 5 }}>DEFINICIÓN (ZONA DESTINO)</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <input value={p.def} onChange={(e) => updatePair(p.id, 'def', e.target.value)} style={{ width: "100%", padding: "12px 15px", borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
                  <button onClick={() => savePairs(pairs.filter(x => x.id !== p.id))} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", borderRadius: 10, width: 45, cursor: "pointer" }}><Trash2 size={18} style={{ margin: "0 auto" }} /></button>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 15, justifyContent: "center", marginTop: 25, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 20 }}>
        <button className="btn-secondary" onClick={addPair} style={{ display: "flex", alignItems: "center", gap: 8, borderColor: "#1e3a8a", color: "#60a5fa" }}><Plus size={16} /> Añadir Pareja</button>
      </div>
    </div>
  );
};
