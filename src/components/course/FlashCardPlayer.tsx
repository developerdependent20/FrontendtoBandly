"use client";

import { useState } from "react";
import { ArrowLeft, Layers, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export const FlashCardPlayer = ({ blockId, initialData, isEditMode, isAdmin, courseId, onSave }: any) => {
  const [cards, setCards] = useState<any[]>(initialData?.cards || []);
  const supabase = createClient();
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const saveCards = async (newCards: any[]) => {
    setCards(newCards);
    setIsSaving(true);
    const { error } = await supabase.from("blocks").update({ content: { cards: newCards } }).eq("id", blockId);
    if (!error) onSave?.({ cards: newCards });
    setIsSaving(false);
  };

  const addCard = () => {
    saveCards([...cards, { id: Date.now().toString(), front: "Nuevo Concepto", back: "Definición..." }]);
  };

  const updateCard = (id: string, field: 'front' | 'back', value: string) => {
    saveCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCard = (id: string) => {
    if (confirm("¿Borrar tarjeta?")) saveCards(cards.filter(c => c.id !== id));
  };

  const moveCard = (idx: number, dir: number) => {
    if (idx + dir < 0 || idx + dir >= cards.length) return;
    const newCards = [...cards];
    [newCards[idx], newCards[idx + dir]] = [newCards[idx + dir], newCards[idx]];
    saveCards(newCards);
  };

  const nextCard = (e?: any) => {
     if (e) e.stopPropagation();
     setIsFlipped(false); 
     setTimeout(() => setCurrentCard(p => p < cards.length - 1 ? p + 1 : p), 150);
  };

  const prevCard = (e?: any) => {
     if (e) e.stopPropagation();
     setIsFlipped(false);
     setTimeout(() => setCurrentCard(p => p > 0 ? p - 1 : p), 150);
  };

  const previewUI = cards.length > 0 ? (
      <div style={{ background: "transparent", padding: "20px 0", marginBottom: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <style dangerouslySetInnerHTML={{__html: `
          .fc-container { perspective: 1000px; width: 100%; max-width: 600px; height: 350px; margin: 0 auto; }
          .fc-card { width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); transform-style: preserve-3d; cursor: pointer; position: relative; }
          .fc-card.flipped { transform: rotateY(180deg); }
          .fc-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; text-align: center; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .fc-front { background: var(--bg-dark); border: 2px solid var(--glass-border); color: white; }
          .fc-back { background: #064e3b; border: 2px solid #059669; color: white; transform: rotateY(180deg); overflow-y: auto; }
        `}} />
        <div 
           className="fc-container" 
           role="button" 
           tabIndex={0} 
           aria-label={`Tarjeta flash, cara actual: ${isFlipped ? cards[currentCard]?.back : cards[currentCard]?.front}. Presiona enter o espacio para voltear.`}
           onClick={() => setIsFlipped(!isFlipped)} 
           onKeyDown={(e) => {
               if (e.key === "Enter" || e.key === " ") {
                   e.preventDefault();
                   setIsFlipped(!isFlipped);
               }
           }}
        >
          <div aria-live="polite" className="sr-only" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", borderWidth: 0 }}>
             {isFlipped ? `Respuesta: ${cards[currentCard]?.back}` : `Pregunta: ${cards[currentCard]?.front}`}
          </div>
          <div className={`fc-card ${isFlipped ? 'flipped' : ''}`} aria-hidden="true">
             <div className="fc-face fc-front">
                <div style={{ width: "100%" }}>
                   <span style={{ display: "block", opacity: 0.5, fontSize: "0.85rem", letterSpacing: 2, marginBottom: 20 }}>CONCEPTO / PREGUNTA</span>
                   <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.3rem", margin: 0 }}>{cards[currentCard]?.front}</h2>
                   <span style={{ position: "absolute", bottom: 20, width: "100%", left: 0, opacity: 0.3, fontSize: "0.8rem", color: "var(--yellow-primary)" }}>Haz clic para voltear</span>
                </div>
             </div>
             <div className="fc-face fc-back">
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                   <span style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", letterSpacing: 2, marginBottom: 20 }}>DEFINICIÓN / RESPUESTA</span>
                   <p style={{ fontSize: "1.2rem", lineHeight: 1.6, margin: 0, padding: "0 20px" }}>{cards[currentCard]?.back}</p>
                </div>
             </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 40 }}>
          <button aria-label="Tarjeta Anterior" onClick={prevCard} disabled={currentCard === 0} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 50, height: 50, color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentCard === 0 ? "default" : "pointer", opacity: currentCard === 0 ? 0.3 : 1 }}><ArrowLeft size={20} /></button>
          <span style={{ fontSize: "0.95rem", color: "white", opacity: 0.5, fontWeight: 700, letterSpacing: 3 }} aria-live="polite">{currentCard + 1} / {cards.length}</span>
          <button aria-label="Tarjeta Siguiente" onClick={nextCard} disabled={currentCard === cards.length - 1} style={{ background: "var(--yellow-primary)", border: "none", borderRadius: "50%", width: 50, height: 50, color: "black", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentCard === cards.length - 1 ? "default" : "pointer", opacity: currentCard === cards.length - 1 ? 0.3 : 1 }}><ArrowLeft size={20} style={{ transform: "rotate(180deg)" }} /></button>
        </div>
      </div>
  ) : null;

  if (!isEditMode && !isAdmin) {
    return previewUI;
  }

  return (
    <div style={{ background: "var(--bg-dark)", padding: "40px", borderRadius: "24px", border: "1px solid #064e3b", marginBottom: "40px", position: "relative" }}>
      <div style={{ position: "absolute", top: -12, left: 30, background: "#064e3b", padding: "4px 15px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 800, letterSpacing: 1, display: "flex", alignItems: "center", gap: 6, color: "white" }}><Layers size={14} /> MODO EDICIÓN FLASH CARDS {isSaving && <span style={{ opacity: 0.5 }}>(Guardando...)</span>}</div>
      
      {previewUI && (
         <div style={{ borderBottom: "1px dashed rgba(255,255,255,0.2)", paddingBottom: 20, marginBottom: 40 }}>
            <h4 style={{ textAlign: "center", color: "var(--yellow-primary)", fontSize: "0.85rem", letterSpacing: 2, marginBottom: 10 }}>VISTA PREVIA EN VIVO</h4>
            {previewUI}
         </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {cards.length === 0 ? <p style={{ opacity: 0.5, textAlign: "center", padding: 20 }}>Añade tu primera tarjeta.</p> : cards.map((c, idx) => (
          <div key={c.id} style={{ background: "rgba(255,255,255,0.03)", padding: "30px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
            <div style={{ position: "absolute", right: 15, top: 15, display: "flex", gap: 5 }}>
              <button onClick={() => moveCard(idx, -1)} disabled={idx === 0} style={{ color: "white", opacity: idx === 0 ? 0.2 : 0.6, background: "none", border: "none" }}>↑</button>
              <button onClick={() => moveCard(idx, 1)} disabled={idx === cards.length - 1} style={{ color: "white", opacity: idx === cards.length - 1 ? 0.2 : 0.6, background: "none", border: "none" }}>↓</button>
              <button onClick={() => removeCard(c.id)} style={{ color: "#ef4444", background: "none", border: "none" }}><Trash2 size={16} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 25 }}>
               <div><input value={c.front} onChange={(e) => updateCard(c.id, 'front', e.target.value)} style={{ width: "100%", background: "transparent", border: "none", color: "white", fontSize: "1.2rem", fontWeight: 700, outline: "none", fontFamily: "'Playfair Display', serif" }} placeholder="Pregunta" /></div>
               <div><textarea value={c.back} onChange={(e) => updateCard(c.id, 'back', e.target.value)} style={{ width: "100%", background: "transparent", border: "none", color: "white", fontSize: "1.05rem", outline: "none", resize: "vertical" }} placeholder="Respuesta" /></div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-secondary" onClick={addCard} style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px auto 0" }}><Plus size={16} /> Añadir Tarjeta</button>
    </div>
  );
};
