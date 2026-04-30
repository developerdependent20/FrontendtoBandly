"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Square, Plus, Trash2, GripVertical, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { playUISound } from "@/utils/audio";

export const ChecklistBlockEditor = ({ blockId, initialData, isEditMode, isAdmin, courseId, onSave, userSubmission, currentUser }: any) => {
  const [items, setItems] = useState<any[]>(initialData?.items || []);
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  
  // Parse student progress from userSubmission if it exists
  const initialChecked = () => {
    try {
      if (userSubmission?.content) {
         const parsed = JSON.parse(userSubmission.content);
         if (parsed.checkedItems) return parsed.checkedItems;
      }
    } catch(e) {}
    return [];
  };
  
  const [checkedItems, setCheckedItems] = useState<string[]>(initialChecked());

  const progressPercentage = items.length === 0 ? 0 : Math.round((checkedItems.length / items.length) * 100);

  const saveChecklistData = async (newItems: any[]) => {
    setItems(newItems);
    setIsSaving(true);
    const { error } = await supabase.from("blocks").update({ content: { items: newItems } }).eq("id", blockId);
    if (error) alert("Error al guardar checklist: " + error.message);
    else onSave?.({ items: newItems });
    setIsSaving(false);
  };

  const handleStudentCheck = async (itemId: string) => {
    const isCurrentlyChecked = checkedItems.includes(itemId);
    const newChecked = isCurrentlyChecked 
      ? checkedItems.filter(id => id !== itemId)
      : [...checkedItems, itemId];
    
    setCheckedItems(newChecked);
    
    if (!isCurrentlyChecked) {
      playUISound("click"); // Gentle click
      // If reached 100%, play success
      if (newChecked.length === items.length && items.length > 0) {
         setTimeout(() => playUISound("success"), 300);
      }
    }

    // Auto-save student progress
    const payload = JSON.stringify({ checkedItems: newChecked });
    
    // We mark status as 'graded' if 100%, otherwise 'pending' (or just save progress)
    // Actually, for checklists, we can just save it as graded if it's 100%
    const status = newChecked.length === items.length ? "graded" : "pending";

    await supabase.from("submissions").upsert({
      student_id: currentUser.id,
      block_id: blockId,
      content: payload,
      status: status,
      score: newChecked.length === items.length ? 100 : Math.round((newChecked.length / items.length) * 100)
    }, { onConflict: "student_id, block_id" });
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      text: "Nueva tarea..."
    };
    saveChecklistData([...items, newItem]);
  };

  const updateItemText = (itemId: string, text: string) => {
    const updated = items.map(item => item.id === itemId ? { ...item, text } : item);
    saveChecklistData(updated);
  };

  const removeItem = (itemId: string) => {
    if (confirm("¿Borrar elemento de la lista?")) {
      saveChecklistData(items.filter(item => item.id !== itemId));
    }
  };

  const moveItem = (index: number, direction: number) => {
    if (index + direction < 0 || index + direction >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    saveChecklistData(newItems);
  };

  if (!isEditMode && !isAdmin) {
    return (
      <div style={{ background: "var(--bg-dark)", padding: "40px", borderRadius: "24px", border: "1px solid var(--glass-border)", marginBottom: "40px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
        
        {/* Header & Progress Bar */}
        <div style={{ marginBottom: "30px" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 15 }}>
             <h3 style={{ color: "var(--yellow-primary)", fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
               <CheckSquare size={28} /> Lista de Verificación
             </h3>
             <span style={{ fontSize: "1.2rem", fontWeight: 800, color: progressPercentage === 100 ? "#10b981" : "white" }}>
               {progressPercentage}%
             </span>
           </div>
           
           <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden", position: "relative" }}>
             <div style={{ 
               height: "100%", 
               background: progressPercentage === 100 ? "#10b981" : "var(--yellow-primary)", 
               width: `${progressPercentage}%`,
               transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s",
               boxShadow: progressPercentage === 100 ? "0 0 15px rgba(16, 185, 129, 0.5)" : "0 0 10px rgba(250, 204, 21, 0.3)"
             }}></div>
           </div>
        </div>

        {/* Checklist Items */}
        {items.length === 0 ? <p style={{ opacity: 0.5 }}>Esta lista aún no tiene elementos.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            {items.map((item) => {
              const checked = checkedItems.includes(item.id);
              return (
                <div 
                  key={item.id}
                  onClick={() => handleStudentCheck(item.id)}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 15, 
                    padding: "20px 25px", 
                    background: checked ? "rgba(16, 185, 129, 0.05)" : "rgba(255,255,255,0.02)", 
                    borderRadius: "16px", 
                    border: "1px solid",
                    borderColor: checked ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    transform: checked ? "scale(0.99)" : "scale(1)"
                  }}
                  className="hover-scale"
                >
                  <div style={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: "8px", 
                    border: checked ? "none" : "2px solid rgba(255,255,255,0.3)",
                    background: checked ? "#10b981" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "0.2s"
                  }}>
                    {checked && <CheckSquare size={18} color="black" strokeWidth={3} />}
                  </div>
                  <span style={{ 
                    fontSize: "1.1rem", 
                    fontWeight: checked ? 600 : 500,
                    color: checked ? "rgba(255,255,255,0.5)" : "white",
                    textDecoration: checked ? "line-through" : "none",
                    transition: "0.3s ease"
                  }}>
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        {progressPercentage === 100 && (
          <div style={{ marginTop: 30, padding: 20, background: "rgba(16, 185, 129, 0.1)", borderRadius: 16, border: "1px dashed rgba(16, 185, 129, 0.3)", display: "flex", alignItems: "center", gap: 15, animation: "fadeIn 0.5s ease" }}>
            <CheckCircle2 size={32} color="#10b981" />
            <div>
              <h4 style={{ margin: 0, color: "#10b981", fontSize: "1.2rem", fontWeight: 800 }}>¡Lista Completada!</h4>
              <p style={{ margin: "5px 0 0", fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>Has verificado todos los puntos requeridos.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Edit Mode (Admin/Mentor)
  return (
    <div style={{ background: "var(--bg-dark)", padding: "40px", borderRadius: "24px", border: "1px solid #14b8a6", marginBottom: "40px", position: "relative" }}>
      <div style={{ position: "absolute", top: -12, left: 30, background: "#14b8a6", padding: "4px 15px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 800, letterSpacing: 1, color: "black", display: "flex", alignItems: "center", gap: 6 }}>
        <CheckSquare size={14} /> MODO EDICIÓN CHECKLIST {isSaving && <span style={{ opacity: 0.6 }}>(Guardando...)</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 15, marginTop: 10 }}>
        <h3 style={{ margin: "0 0 10px 0", fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "white" }}>Elementos de la Lista</h3>
        
        {items.length === 0 ? <p style={{ opacity: 0.5, textAlign: "center", padding: 20, border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 16 }}>Añade el primer ítem al checklist.</p> : null}
        
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 15, background: "rgba(255,255,255,0.03)", padding: "15px 20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", color: "white", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.2 : 0.6 }}>↑</button>
              <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} style={{ background: "none", border: "none", color: "white", cursor: idx === items.length - 1 ? "default" : "pointer", opacity: idx === items.length - 1 ? 0.2 : 0.6 }}>↓</button>
            </div>
            
            <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.2)", borderRadius: 6 }}></div>
            
            <input 
              value={item.text}
              onChange={(e) => updateItemText(item.id, e.target.value)}
              placeholder="Descripción del requerimiento..."
              style={{ flexGrow: 1, background: "transparent", border: "none", color: "white", fontSize: "1.05rem", outline: "none", padding: "5px 0" }}
            />
            
            <button onClick={() => removeItem(item.id)} style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#ef4444", width: 36, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover-scale">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 25, display: "flex", justifyContent: "flex-start" }}>
        <button 
          className="btn-secondary" 
          onClick={addItem} 
          style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(20, 184, 166, 0.1)", borderColor: "#14b8a6", color: "#14b8a6" }}
        >
          <Plus size={16} /> Añadir Ítem
        </button>
      </div>
    </div>
  );
};
