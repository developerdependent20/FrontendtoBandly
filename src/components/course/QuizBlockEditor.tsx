"use client";

import { useState } from "react";
import { Trophy, Plus, Trash2, Minus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export const QuizBlockEditor = ({ blockId, initialData, isEditMode, isAdmin, courseId, onSave, userSubmission, currentUser }: any) => {
  const [questions, setQuestions] = useState<any[]>(initialData?.questions || []);
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [chosenAnswers, setChosenAnswers] = useState<{[key: string]: any}>({});

  const handleStudentSubmit = async () => {
     if (Object.keys(chosenAnswers).length < questions.filter(q => q.type === 'multiple').length) return alert("Por favor responde las opciones múltiples.");
     setIsSaving(true);
     const { error } = await supabase.from("submissions").upsert({
        student_id: currentUser.id,
        block_id: blockId,
        content: JSON.stringify(chosenAnswers),
        status: "pending"
     }, { onConflict: "student_id, block_id" });
     setIsSaving(false);
     if (!error) window.location.reload();
     else alert(error.message);
  };

  const saveQuiz = async (newQuestions: any[]) => {
    setQuestions(newQuestions);
    setIsSaving(true);
    const { error } = await supabase.from("blocks").update({ content: { questions: newQuestions } }).eq("id", blockId);
    if (error) alert("Error al guardar quiz: " + error.message);
    else onSave?.({ questions: newQuestions });
    setIsSaving(false);
  };

  const addQuestion = (type: 'multiple' | 'open') => {
    const newQ = {
      id: Date.now().toString(),
      type,
      text: "Nueva pregunta...",
      options: type === 'multiple' ? ["Opción 1", "Opción 2"] : [],
      correctOptionIndex: type === 'multiple' ? 0 : null
    };
    saveQuiz([...questions, newQ]);
  };

  const updateQuestionText = (qId: string, text: string) => {
    const updated = questions.map(q => q.id === qId ? { ...q, text } : q);
    saveQuiz(updated);
  };

  const addOption = (qId: string) => {
    const updated = questions.map(q => {
      if (q.id === qId) return { ...q, options: [...q.options, `Opción ${q.options.length + 1}`] };
      return q;
    });
    saveQuiz(updated);
  };

  const updateOption = (qId: string, optIndex: number, text: string) => {
    const updated = questions.map(q => {
      if (q.id === qId) {
        const newOpts = [...q.options];
        newOpts[optIndex] = text;
        return { ...q, options: newOpts };
      }
      return q;
    });
    saveQuiz(updated);
  };

  const removeOption = (qId: string, optIndex: number) => {
    const updated = questions.map(q => {
      if (q.id === qId) {
        const newOpts = [...q.options];
        newOpts.splice(optIndex, 1);
        return { ...q, options: newOpts };
      }
      return q;
    });
    saveQuiz(updated);
  };

  const setCorrectOption = (qId: string, optIndex: number) => {
    const updated = questions.map(q => q.id === qId ? { ...q, correctOptionIndex: optIndex } : q);
    saveQuiz(updated);
  };
  
  const moveQuestion = (qIndex: number, direction: number) => {
     if (qIndex + direction < 0 || qIndex + direction >= questions.length) return;
     const newQuestions = [...questions];
     const temp = newQuestions[qIndex];
     newQuestions[qIndex] = newQuestions[qIndex + direction];
     newQuestions[qIndex + direction] = temp;
     saveQuiz(newQuestions);
  };

  const removeQuestion = (qId: string) => {
    if (confirm("¿Borrar pregunta?")) {
      saveQuiz(questions.filter(q => q.id !== qId));
    }
  };

  if (!isEditMode && !isAdmin) {
    if (userSubmission) {
       return (
          <div style={{ padding: 40, background: "rgba(0,0,0,0.2)", borderRadius: 24, border: "1px solid #4c1d95", marginBottom: 40 }}>
             <h3 style={{ color: "var(--yellow-primary)", display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}><Trophy size={24} /> Quiz Completado</h3>
             <div style={{ display: "flex", gap: 15, marginBottom: 20 }}>
               <span style={{ padding: "5px 12px", background: userSubmission.status === 'graded' ? "#10b981" : "#f59e0b", color: "white", borderRadius: 10, fontSize: "0.8rem", fontWeight: 700 }}>{userSubmission.status === 'graded' ? "CALIFICADO" : "PENDIENTE DE REVISIÓN"}</span>
               {userSubmission.score && <span style={{ padding: "5px 12px", background: "rgba(255,255,255,0.1)", borderRadius: 10, fontSize: "0.8rem", fontWeight: 700 }}>Calificación: {userSubmission.score}</span>}
            </div>
            {userSubmission.feedback && (
               <div style={{ marginTop: 20, padding: 20, background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", borderRadius: 12 }}>
                  <h4 style={{ color: "#10b981", margin: "0 0 10px 0" }}>Feedback de {userSubmission.score === 100 ? "Excelente" : "Revisión"}:</h4>
                  <p style={{ margin: 0, opacity: 0.9 }}>{userSubmission.feedback}</p>
               </div>
            )}
            <p style={{ opacity: 0.5, marginTop: 20 }}>Tus respuestas están registradas en el sistema.</p>
          </div>
       );
    }

    return (
      <div style={{ background: "var(--bg-dark)", padding: "40px", borderRadius: "24px", border: "1px solid var(--glass-border)", marginBottom: "40px" }}>
        <h3 style={{ color: "var(--yellow-primary)", fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", margin: "0 0 30px 0", display: "flex", alignItems: "center", gap: 10 }}>
           <Trophy size={24} /> Quiz Módulo
        </h3>
        {questions.length === 0 ? <p style={{ opacity: 0.5 }}>Aún no hay preguntas en este quiz.</p> : null}
        
        {questions.map((q, idx) => (
          <div key={q.id} style={{ marginBottom: "30px", background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "15px", color: "white" }}>{idx + 1}. {q.text}</p>
            {q.type === 'multiple' ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {q.options.map((opt: string, i: number) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 15px", background: "rgba(0,0,0,0.2)", borderRadius: 10, cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <input type="radio" name={`q_${q.id}`} value={i} checked={chosenAnswers[q.id] === i} onChange={() => setChosenAnswers({...chosenAnswers, [q.id]: i})} style={{ accentColor: "var(--yellow-primary)" }} />
                    <span style={{ fontSize: "0.95rem" }}>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea placeholder="Tu respuesta analítica..." value={chosenAnswers[q.id] || ""} onChange={(e) => setChosenAnswers({...chosenAnswers, [q.id]: e.target.value})} style={{ width: "100%", padding: 15, borderRadius: 10, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", resize: "vertical", minHeight: 80 }} />
            )}
          </div>
        ))}
        
        {questions.length > 0 && (
           <div style={{ marginTop: 30, display: "flex", justifyContent: "flex-end" }}>
               <button className="btn-primary" onClick={handleStudentSubmit} disabled={isSaving}>{isSaving ? "Enviando..." : "ENVIAR RESULTADOS"}</button>
           </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-dark)", padding: "40px", borderRadius: "24px", border: "1px solid #4c1d95", marginBottom: "40px", position: "relative" }}>
      <div style={{ position: "absolute", top: -12, left: 30, background: "#4c1d95", padding: "4px 15px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 800, letterSpacing: 1, display: "flex", alignItems: "center", gap: 6 }}>
        <Trophy size={14} /> MODO EDICIÓN QUIZ {isSaving && <span style={{ opacity: 0.5 }}>(Guardando...)</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {questions.length === 0 ? <p style={{ opacity: 0.5, textAlign: "center", padding: 20 }}>Añade la primera pregunta al quiz.</p> : null}
        
        {questions.map((q, idx) => (
          <div key={q.id} style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
            <div style={{ position: "absolute", right: 15, top: 15, display: "flex", gap: 5 }}>
              <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", color: "white", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.2 : 0.6 }}>↑</button>
              <button onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1} style={{ background: "none", border: "none", color: "white", cursor: idx === questions.length - 1 ? "default" : "pointer", opacity: idx === questions.length - 1 ? 0.2 : 0.6 }}>↓</button>
              <button onClick={() => removeQuestion(q.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: 10 }}><Trash2 size={16} /></button>
            </div>
            
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 15, paddingRight: 80 }}>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--yellow-primary)" }}>{idx + 1}.</span>
              <input 
                 value={q.text} 
                 onChange={(e) => updateQuestionText(q.id, e.target.value)} 
                 placeholder="Pregunta..."
                 style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "1.1rem", fontWeight: 600, paddingBottom: 5, outline: "none" }}
              />
            </div>

            {q.type === 'multiple' ? (
              <div style={{ paddingLeft: 30 }}>
                {q.options.map((opt: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <input 
                      type="radio" 
                      name={`correct_${q.id}`} 
                      checked={q.correctOptionIndex === i}
                      onChange={() => setCorrectOption(q.id, i)}
                      title="Marcar como correcta"
                      style={{ accentColor: "var(--yellow-primary)", width: 18, height: 18, cursor: "pointer" }}
                    />
                    <input 
                      value={opt}
                      onChange={(e) => updateOption(q.id, i, e.target.value)}
                      style={{ background: q.correctOptionIndex === i ? "rgba(250, 204, 21, 0.1)" : "rgba(0,0,0,0.2)", border: "1px solid", borderColor: q.correctOptionIndex === i ? "var(--yellow-primary)" : "rgba(255,255,255,0.1)", color: "white", padding: "8px 15px", borderRadius: 8, flexGrow: 1, outline: "none", fontSize: "0.9rem" }}
                    />
                    <button onClick={() => removeOption(q.id, i)} disabled={q.options.length <= 2} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", opacity: q.options.length <= 2 ? 0.3 : 1 }}><Minus size={16} /></button>
                  </div>
                ))}
                <button onClick={() => addOption(q.id)} style={{ background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", color: "white", padding: "6px 15px", borderRadius: 8, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, marginTop: 10 }}><Plus size={14} /> Añadir Opción</button>
              </div>
            ) : (
              <div style={{ paddingLeft: 30 }}>
                <div style={{ padding: 15, background: "rgba(0,0,0,0.2)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", opacity: 0.5, fontStyle: "italic", fontSize: "0.9rem" }}>
                  (Área de desarrollo libre para el alumno)
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 15, justifyContent: "center", marginTop: 30, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 20 }}>
        <button className="btn-secondary" onClick={() => addQuestion('multiple')} style={{ display: "flex", alignItems: "center", gap: 8 }}><Plus size={16} /> Pregunta Selección Múltiple</button>
        <button className="btn-secondary" onClick={() => addQuestion('open')} style={{ display: "flex", alignItems: "center", gap: 8 }}><Plus size={16} /> Pregunta Abierta</button>
      </div>
    </div>
  );
};
