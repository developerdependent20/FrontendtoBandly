"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Compass, CheckCircle2, ChevronRight, BrainCircuit, Library, Search, PenTool, MessageSquare, Users, PenBox, PlusCircle, Sparkles, Check, Target, Lightbulb, Rocket, Milestone, Map, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { playUISound } from "@/utils/audio";
import { LoadingScreen } from "@/components/LoadingScreen";

// --- EXPANDED BLOOM VERBS (6 CATEGORIES) ---
const BLOOM_VERBS = {
  "1. Recordar": {
    desc: "Recuperar información base, reglas o terminología técnica.",
    verbs: ["Identificar", "Listar", "Nombrar", "Relatar", "Localizar", "Reconocer"]
  },
  "2. Comprender": {
    desc: "Interpretar significados, ritmos, tácticas o conceptos.",
    verbs: ["Interpretar", "Explicar", "Clasificar", "Describir", "Comparar", "Ilustrar"]
  },
  "3. Aplicar": {
    desc: "Ejecutar movimientos o técnicas en situaciones reales.",
    verbs: ["Ejecutar", "Demostrar", "Aplicar", "Resolver", "Operar", "Implementar"]
  },
  "4. Analizar": {
    desc: "Desglosar jugadas, coreografías o composiciones.",
    verbs: ["Desglosar", "Diferenciar", "Organizar", "Contrastar", "Examinar", "Investigar"]
  },
  "5. Evaluar": {
    desc: "Emitir juicios sobre rendimiento, estética o eficiencia.",
    verbs: ["Valorar", "Criticar", "Justificar", "Defender", "Auditar", "Validar"]
  },
  "6. Crear": {
    desc: "Proponer nuevas obras, rutinas o visiones originales.",
    verbs: ["Componer", "Diseñar", "Innovar", "Idear", "Proponer", "Desarrollar"]
  }
};

type ABCType = "Adquisición" | "Investigación" | "Práctica" | "Discusión" | "Colaboración" | "Producción";

const ABC_CARDS: { type: ABCType; icon: any; color: string; desc: string }[] = [
  { type: "Adquisición", icon: Library, color: "#3b82f6", desc: "Leer, ver o escuchar contenido teórico." },
  { type: "Investigación", icon: Search, color: "#8b5cf6", desc: "Buscar, comparar y analizar información." },
  { type: "Práctica", icon: PenTool, color: "#10b981", desc: "Hacer simulaciones, ejercicios o rutinas." },
  { type: "Discusión", icon: MessageSquare, color: "#f59e0b", desc: "Debatir y cuestionar con pares." },
  { type: "Colaboración", icon: Users, color: "#ec4899", desc: "Trabajar juntos para construir algo grupal." },
  { type: "Producción", icon: PenBox, color: "#eab308", desc: "Crear un artefacto final e individual." }
];

// --- PBL PILARS (7 ESSENTIAL ELEMENTS) ---
type PBLPilar = "Reto" | "Inquiry" | "Autenticidad" | "Voz" | "Reflexión" | "Crítica" | "Producto";

const PBL_PILARS: { type: PBLPilar; label: string; icon: any; color: string; desc: string }[] = [
  { type: "Reto", label: "El Reto Central", icon: Target, color: "#f87171", desc: "Diseño basado en un problema o reto real." },
  { type: "Inquiry", label: "Investigación", icon: Search, color: "#a78bfa", desc: "Búsqueda activa y profunda de soluciones." },
  { type: "Autenticidad", label: "Mundo Real", icon: Map, color: "#34d399", desc: "Relevancia directa con el entorno profesional." },
  { type: "Voz", label: "Elección Libre", icon: MessageSquare, color: "#60a5fa", desc: "El alumno decide caminos y herramientas." },
  { type: "Reflexión", label: "Pausa Crítica", icon: Lightbulb, color: "#fbbf24", desc: "Pensar sobre lo aprendido y los errores." },
  { type: "Crítica", label: "Revisión/Mejora", icon: PenTool, color: "#f472b6", desc: "Ciclos de feedback para elevar la calidad." },
  { type: "Producto", label: "Producto Final", icon: Rocket, color: "#fb923c", desc: "Exposición pública del resultado tangible." }
];

export default function PlannerAssistant() {
  const router = useRouter();
  const supabase = createClient();
  const mainRef = useRef<HTMLDivElement>(null);

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // WIZARD STATES
  const [step, setStep] = useState<"select_course" | "module_count" | "project_foundation" | "planning" | "roadmap">("select_course");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [moduleCount, setModuleCount] = useState<number>(3);
  
  // PBL PROJECT STATE
  const [projectDefinition, setProjectDefinition] = useState({
    title: "",
    drivingQuestion: "",
    finalProduct: ""
  });
  
  // PLANNING STATES
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [modulesPlan, setModulesPlan] = useState<{ topic: string; objectiveVerbs: string[]; objectiveText: string; abcActivities: ABCType[]; pblComponent?: PBLPilar }[]>([]);
  
  // FORM FIELDS PER MODULE
  const [moduleTopic, setModuleTopic] = useState("");
  const [activeVerbs, setActiveVerbs] = useState<Record<string, string>>({});
  const [customVerb, setCustomVerb] = useState("");
  const [activeText, setActiveText] = useState("");
  const [activeActivities, setActiveActivities] = useState<ABCType[]>([]);
  const [activePBL, setActivePBL] = useState<PBLPilar | null>(null);
  const [selectedBloomLevel, setSelectedBloomLevel] = useState<keyof typeof BLOOM_VERBS | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const { data } = await supabase.from("courses").select("id, title, category");
    if (data) setCourses(data);
    setLoading(false);
  };

  const startPlanning = () => {
    const initialPlans = Array.from({ length: moduleCount }).map(() => ({
      topic: "",
      objectiveVerbs: [],
      objectiveText: "",
      abcActivities: []
    }));
    setModulesPlan(initialPlans);
    setCurrentModuleIndex(0);
    resetFormFields();
    setStep("project_foundation");
    playUISound("click");
  };

  const nextStep = () => {
    playUISound("click");
    if (step === "project_foundation") {
      setStep("planning");
    }
  };

  const resetFormFields = () => {
    setModuleTopic("");
    setActiveVerbs({});
    setCustomVerb("");
    setActiveText("");
    setActiveActivities([]);
    setActivePBL(null);
    setSelectedBloomLevel(null);
  };

  const handleVerbToggle = (category: string, verb: string) => {
    setActiveVerbs(prev => {
      const next = { ...prev };
      if (next[category] === verb) delete next[category];
      else next[category] = verb;
      return next;
    });
  };

  const handleNextModule = () => {
    const verbList = Object.values(activeVerbs);
    if (customVerb.trim()) verbList.push(customVerb.trim());
    
    if (!moduleTopic.trim() || verbList.length === 0 || !activeText.trim() || activeActivities.length === 0) {
      alert("Por favor completa el TEMA, selecciona al menos un VERBO y elige un VEHÍCULO ABC para continuar.");
      return;
    }

    const updatedPlans = [...modulesPlan];
    updatedPlans[currentModuleIndex] = {
      topic: moduleTopic,
      objectiveVerbs: verbList,
      objectiveText: activeText,
      abcActivities: [...activeActivities],
      pblComponent: activePBL as PBLPilar
    };
    setModulesPlan(updatedPlans);

    if (currentModuleIndex < moduleCount - 1) {
      // Transition animation effect
      if (mainRef.current) {
         mainRef.current.style.opacity = "0";
         mainRef.current.style.transform = "translateX(-20px)";
      }
      
      setTimeout(() => {
        setCurrentModuleIndex(currentModuleIndex + 1);
        resetFormFields();
        if (mainRef.current) {
          mainRef.current.style.opacity = "1";
          mainRef.current.style.transform = "translateX(0)";
        }
      }, 300);

    } else {
      setStep("roadmap");
    }
  };

  const toggleABCActivity = (type: ABCType) => {
    if (activeActivities.includes(type)) {
      setActiveActivities(prev => prev.filter(a => a !== type));
    } else {
      if (activeActivities.length < 2) setActiveActivities(prev => [...prev, type]);
    }
  };

  const saveRoadmapToCourse = async () => {
    if (!selectedCourse) return;
    const { error } = await supabase
      .from("courses")
      .update({ 
        syllabus_roadmap: {
          project: projectDefinition,
          phases: modulesPlan
        }, 
        total_modules: modulesPlan.length 
      })
      .eq("id", selectedCourse.id);
      
    if (!error) {
       playUISound("success");
       alert("Syllabus publicado. Mentores y alumnos ahora verán esta ruta táctica.");
       router.push("/admin");
    } else alert(error.message);
  };

  const getCombinedObjective = () => {
    const list = Object.values(activeVerbs);
    if (customVerb.trim()) list.push(customVerb.trim());
    
    const pilar = PBL_PILARS.find(p => p.type === activePBL);
    const pilarLabel = pilar ? pilar.label : "...";
    
    let verbStr = "[Verbo]";
    if (list.length === 1) verbStr = list[0];
    else if (list.length > 1) {
      verbStr = list.slice(0, -1).join(", ") + " y " + list[list.length - 1];
    }
    
    return `Impacto PBL: Mediante el pilar de ${pilarLabel}, el estudiante será capaz de ${verbStr} ${activeText || "..."} para construir su ${projectDefinition.finalProduct || "proyecto final"}.`;
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ minHeight: "100vh", padding: "40px 20px", background: "var(--bg-darker)", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>
      
      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "60px", maxWidth: "1200px", margin: "0 auto 60px auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link href="/admin" style={{ padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "var(--text-primary)" }}>
            <ArrowLeft style={{ width: "20px", height: "20px" }} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
              CLAN <Compass style={{ color: "var(--yellow-primary)", width: "24px", height: "24px" }} /> <span style={{ fontStyle: "italic", fontWeight: 400 }}>Diseño Instruccional</span>
            </h1>
            <p style={{ fontSize: "0.75rem", opacity: 0.6, letterSpacing: "2px", textTransform: "uppercase", margin: 0, marginTop: "4px" }}>Asistente Pedagógico (Bloom + ABC Arena)</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }} className="hide-mobile">
           {['select_course', 'module_count', 'project_foundation', 'planning', 'roadmap'].map((s) => (
             <div key={s} style={{ height: "6px", width: "40px", borderRadius: "10px", background: (step === s || (step === 'planning' && s === 'project_foundation')) ? "var(--yellow-primary)" : "rgba(255,255,255,0.1)" }} />
           ))}
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {step === "select_course" && (
          <div style={{ maxWidth: "700px", margin: "80px auto 0 auto", textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
            <BrainCircuit style={{ width: "60px", height: "60px", margin: "0 auto 20px auto", color: "var(--yellow-primary)", opacity: 0.8 }} />
            <h2 style={{ fontSize: "2.5rem", fontFamily: "'Playfair Display', serif", marginBottom: "15px" }}>Buscando el <span style={{ color: "var(--yellow-primary)", fontStyle: "italic" }}>Programa Base</span></h2>
            <p style={{ opacity: 0.6, marginBottom: "40px" }}>Selecciona el curso para el cual diseñarás el mapa táctico de aprendizaje.</p>
            <div style={{ display: "grid", gap: "15px", textAlign: "left" }}>
              {courses.map(c => (
                <button key={c.id} onClick={() => setSelectedCourse(c)} style={{ padding: "20px", borderRadius: "16px", border: "1px solid", transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", cursor: "pointer", background: selectedCourse?.id === c.id ? "rgba(254, 220, 61, 0.1)" : "rgba(255,255,255,0.05)", borderColor: selectedCourse?.id === c.id ? "var(--yellow-primary)" : "rgba(255,255,255,0.1)", color: "var(--text-primary)" }}>
                  <div><h3 style={{ fontWeight: 800, fontSize: "1.2rem", margin: "0 0 5px 0" }}>{c.title}</h3><p style={{ fontSize: "0.85rem", color: "var(--yellow-primary)", margin: 0 }}>{c.category}</p></div>
                  {selectedCourse?.id === c.id && <CheckCircle2 style={{ color: "var(--yellow-primary)" }} />}
                </button>
              ))}
            </div>
            <button disabled={!selectedCourse} onClick={() => { setStep("module_count"); playUISound("click"); }} className="btn-primary" style={{ marginTop: "40px", opacity: selectedCourse ? 1 : 0.5 }}>Configurar Módulos <ChevronRight style={{ width: "20px" }} /></button>
          </div>
        )}

        {step === "module_count" && (
          <div style={{ maxWidth: "600px", margin: "80px auto 0 auto", textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
             <h2 style={{ fontSize: "2.5rem", fontFamily: "'Playfair Display', serif", marginBottom: "15px" }}>Extensión del <span style={{ color: "var(--yellow-primary)", fontStyle: "italic" }}>Camino</span></h2>
             <p style={{ opacity: 0.6, marginBottom: "40px" }}>¿Cuántos temas o retos conformarán esta experiencia pedagógica? (Entre 3 y 10)</p>
             <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "30px", marginBottom: "50px" }}>
                <button onClick={() => setModuleCount(Math.max(1, moduleCount - 1))} style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "1.5rem", cursor: "pointer" }}>-</button>
                <div style={{ fontSize: "4rem", fontWeight: 800, color: "var(--yellow-primary)", width: "100px" }}>{moduleCount}</div>
                <button onClick={() => setModuleCount(Math.min(10, moduleCount + 1))} style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "1.5rem", cursor: "pointer" }}>+</button>
             </div>
             <button onClick={startPlanning} className="btn-primary">Iniciar Fase de Diseño <Sparkles style={{ width: "20px" }} /></button>
          </div>
        )}

        {step === "project_foundation" && (
          <div style={{ maxWidth: "1100px", margin: "60px auto 0 auto", animation: "fadeIn 0.5s ease-out" }}>
            <div style={{ textAlign: "center", marginBottom: "50px" }}>
              <Rocket style={{ width: "60px", height: "60px", margin: "0 auto 20px auto", color: "var(--yellow-primary)" }} />
              <h2 style={{ fontSize: "2.5rem", fontFamily: "'Playfair Display', serif" }}>Estructura del <span style={{ color: "var(--yellow-primary)", fontStyle: "italic" }}>Proyecto Real</span></h2>
              <p style={{ opacity: 0.6 }}>Antes de planificar las fases, define el propósito último de este programa.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "25px", background: "rgba(255,255,255,0.03)", padding: "40px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.5, marginBottom: "10px", display: "block" }}>1. Título del Proyecto Final:</label>
                  <input 
                    value={projectDefinition.title} 
                    onChange={e => setProjectDefinition({...projectDefinition, title: e.target.value})}
                    placeholder="Ej: Lanzamiento de una Colección Cápsula o Grabación de un Single..." 
                    style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.5, marginBottom: "10px", display: "block" }}>2. Pregunta Impulsora (Driving Question):</label>
                  <input 
                    value={projectDefinition.drivingQuestion} 
                    onChange={e => setProjectDefinition({...projectDefinition, drivingQuestion: e.target.value})}
                    placeholder="¿Cómo podríamos crear un producto que revolucione...?" 
                    style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.5, marginBottom: "10px", display: "block" }}>3. Producto Público Esperado:</label>
                  <input 
                    value={projectDefinition.finalProduct} 
                    onChange={e => setProjectDefinition({...projectDefinition, finalProduct: e.target.value})}
                    placeholder="Brief creativo, Plano técnico, Obra terminada, etc." 
                    style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button disabled={!projectDefinition.title || !projectDefinition.drivingQuestion} onClick={() => { setStep("planning"); playUISound("click"); }} className="btn-primary" style={{ width: "100%" }}>Continuar a Planificación de Fases <ChevronRight style={{ width: "20px" }} /></button>
                </div>
              </div>

              {/* PBL GUIDE PANEL */}
              <div style={{ background: "rgba(254, 220, 61, 0.02)", border: "1px solid rgba(254, 220, 61, 0.1)", padding: "35px", borderRadius: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <Lightbulb color="var(--yellow-primary)" size={24} />
                  <h3 style={{ fontSize: "1.2rem", color: "white", margin: 0, fontFamily: "'Playfair Display', serif" }}>Guía Rápida: PBL</h3>
                </div>
                <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 25 }}>
                   El <strong>Aprendizaje Basado en Proyectos</strong> consiste en aprender "haciendo". No enseñamos teoría aislada, sino herramientas para completar un <strong>Reto Real</strong>.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 16 }}>
                    <p style={{ color: "var(--yellow-primary)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Ejemplo: Arte / Diseño</p>
                    <p style={{ color: "white", fontSize: "0.85rem", margin: "0 0 5px 0" }}><strong>Reto:</strong> Identidad Visual Urbana</p>
                    <p style={{ color: "white", fontSize: "0.85rem", margin: "0 0 5px 0", opacity: 0.7 }}><strong>Pregunta:</strong> ¿Cómo representar la cultura de la calle en una marca?</p>
                    <p style={{ color: "white", fontSize: "0.85rem", margin: 0, opacity: 0.7 }}><strong>Producto:</strong> Logo y 3 Mockups de prendas.</p>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 16 }}>
                    <p style={{ color: "var(--yellow-primary)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Ejemplo: Deporte / Táctica</p>
                    <p style={{ color: "white", fontSize: "0.85rem", margin: "0 0 5px 0" }}><strong>Reto:</strong> Torneo de Inclusión CLAN</p>
                    <p style={{ color: "white", fontSize: "0.85rem", margin: "0 0 5px 0", opacity: 0.7 }}><strong>Pregunta:</strong> ¿Cómo diseñar reglas de fútbol que unan a la comunidad?</p>
                    <p style={{ color: "white", fontSize: "0.85rem", margin: 0, opacity: 0.7 }}><strong>Producto:</strong> Reglamento y Plan de Torneo.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "planning" && (
          <div style={{ animation: "fadeIn 0.5s ease-out" }}>
             
             {/* CHECKLIST DE PROGRESO (MAPA DE MODULOS) */}
             <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "40px", background: "rgba(255,255,255,0.02)", padding: "15px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>
               {Array.from({ length: moduleCount }).map((_, i) => {
                 const isCompleted = i < currentModuleIndex;
                 const isCurrent = i === currentModuleIndex;
                 const savedData = modulesPlan[i];
                 return (
                    <div 
                      key={i} 
                      style={{ 
                        flex: 1, minWidth: "120px", padding: "10px", borderRadius: "12px", border: "1px solid", 
                        background: isCurrent ? "rgba(254, 220, 61, 0.1)" : isCompleted ? "rgba(34, 197, 94, 0.05)" : "rgba(255,255,255,0.02)",
                        borderColor: isCurrent ? "var(--yellow-primary)" : isCompleted ? "#22c55e" : "rgba(255,255,255,0.1)",
                        transition: "0.3s", opacity: isCurrent || isCompleted ? 1 : 0.4
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                         {isCompleted ? <Check size={14} color="#22c55e" strokeWidth={3} /> : <div style={{ width: 6, height: 6, borderRadius: "50%", background: isCurrent ? "var(--yellow-primary)" : "white" }} />}
                         <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: isCurrent ? "var(--yellow-primary)" : isCompleted ? "#22c55e" : "white" }}>
                           Fase {i + 1}
                         </span>
                      </div>
                      <p style={{ fontSize: "0.75rem", margin: 0, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isCompleted ? (savedData?.topic || "Completado") : isCurrent ? "Diseñando ahora..." : "Pendiente"}
                      </p>
                    </div>
                 );
               })}
             </div>

             <div ref={mainRef} style={{ transition: "0.3s ease-in-out" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "20px" }}>
                    <div>
                      <h2 style={{ fontSize: "1.8rem", fontFamily: "'Playfair Display', serif", marginTop: "10px" }}>Redacción del <span style={{ fontStyle: "italic", color: "var(--yellow-primary)" }}>Objetivo Táctico</span></h2>
                    </div>
                    <p style={{ fontSize: "0.85rem", opacity: 0.4 }}>Curso: {selectedCourse?.title}</p>
                </div>
                
                <div className="planner-grid">
                  <div className="planner-panel" style={{ flex: 1.2 }}>
                    <div className="glow-effect" style={{ background: "rgba(59, 130, 246, 0.1)", right: 0, top: 0 }}></div>
                    
                    {/* NOMBRE DEL TEMA */}
                    <div style={{ marginBottom: "35px" }}>
                        <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.5, marginBottom: "10px", display: "block", fontWeight: "bold" }}>1. Nombre del Tema del Reto {currentModuleIndex + 1}:</label>
                        <input 
                          style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid var(--yellow-primary)", borderRadius: "12px", padding: "15px", color: "white", fontSize: "1.1rem", outline: "none" }}
                          placeholder="Ej: Fundamentos de EQ o Anatomía del Beat..."
                          value={moduleTopic}
                          onChange={e => setModuleTopic(e.target.value)}
                        />
                    </div>

                    {/* BLOOM 6 NIVELES */}
                    <div style={{ marginBottom: "35px" }}>
                      <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.5, marginBottom: "5px", display: "block", fontWeight: "bold" }}>2. Taxonomía de Bloom (Define la profundidad):</label>
                      <div style={{ background: "rgba(34, 197, 94, 0.05)", padding: "10px 15px", borderRadius: "10px", borderLeft: "3px solid #22c55e", marginBottom: "15px" }}>
                        <p style={{ fontSize: "0.8rem", color: "#22c55e", margin: 0, lineHeight: 1.4 }}>
                          <strong>¿Qué es la Taxonomía de Bloom?</strong> Es una escalera del aprendizaje. Empieza en la base: primero debes <strong style={{color:"white"}}>Recordar</strong> y <strong style={{color:"white"}}>Comprender</strong> un concepto básico, para luego poder <strong style={{color:"white"}}>Aplicarlo</strong>. Posteriormente serás capaz de <strong style={{color:"white"}}>Analizarlo</strong> o <strong style={{color:"white"}}>Evaluarlo</strong>, y finalmente en la cumbre llegarás a <strong style={{color:"white"}}>Crear</strong> algo nuevo. Selecciona desde qué nivel quieres enseñar este tema.
                        </p>
                      </div>
                      <div className="custom-scrollbar" style={{ maxHeight: "350px", overflowY: "auto", paddingRight: "10px" }}>
                          {/* Botones de Categorias de Bloom */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                            {(Object.keys(BLOOM_VERBS) as Array<keyof typeof BLOOM_VERBS>).map((key) => (
                              <button 
                                key={key} 
                                onClick={() => setSelectedBloomLevel(selectedBloomLevel === key ? null : key)}
                                style={{ padding: "10px 15px", fontSize: "0.8rem", borderRadius: "12px", border: "1px solid", cursor: "pointer", transition: "0.2s", background: selectedBloomLevel === key ? "rgba(254, 220, 61, 0.2)" : "rgba(255,255,255,0.05)", borderColor: selectedBloomLevel === key ? "var(--yellow-primary)" : "rgba(255,255,255,0.1)", color: selectedBloomLevel === key ? "var(--yellow-primary)" : "#fff", fontWeight: selectedBloomLevel === key ? 800 : 400 }}
                              >
                                {key} {activeVerbs[key] && <CheckCircle2 size={12} style={{display:"inline", marginLeft:"5px"}}/>}
                              </button>
                            ))}
                          </div>

                          {/* Verbos de la Categoria Seleccionada */}
                          {selectedBloomLevel && (
                             <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "20px", animation: "fadeIn 0.3s ease" }}>
                                <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "0 0 15px 0", lineHeight: 1.4 }}>{BLOOM_VERBS[selectedBloomLevel].desc}</p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                  {BLOOM_VERBS[selectedBloomLevel].verbs.map(v => (
                                    <button key={v} onClick={() => handleVerbToggle(selectedBloomLevel, v)} style={{ padding: "8px 16px", fontSize: "0.85rem", borderRadius: "20px", border: "1px solid", cursor: "pointer", transition: "0.2s", background: activeVerbs[selectedBloomLevel] === v ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)", borderColor: activeVerbs[selectedBloomLevel] === v ? "#3b82f6" : "transparent", color: "#fff" }}>{v}</button>
                                  ))}
                                </div>
                             </div>
                          )}


                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "15px", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                            <p style={{ fontSize: "0.7rem", color: "#fff", fontWeight: 800, marginBottom: "10px" }}>¿Otro Verbo?</p>
                            <input style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.2)", outline: "none", width: "100%", color: "#fff", fontSize: "0.8rem" }} placeholder="Escribe un verbo propio..." value={customVerb} onChange={e => setCustomVerb(e.target.value)} />
                          </div>
                      </div>
                    </div>

                    {/* ENUNCIADO DINAMICO */}
                    <div>
                        <label style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.5, marginBottom: "10px", display: "block", fontWeight: "bold" }}>3. Promesa Educativa Final:</label>
                        <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "20px" }}>
                          <p style={{ color: "#60a5fa", fontWeight: 800, marginBottom: "10px", lineHeight: 1.4, fontSize: "1rem" }}>{getCombinedObjective()}</p>
                          <input style={{ background: "transparent", border: "none", outline: "none", width: "100%", color: "#fff", fontSize: "0.9rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px" }} placeholder="Complete con el objeto..." value={activeText} onChange={e => setActiveText(e.target.value)} />
                        </div>
                    </div>
                  </div>

                   {/* ABC VEHICULO & PBL COMPONENT */}
                   <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "30px" }}>
                      <div className="planner-panel">
                        <div className="glow-effect" style={{ background: "rgba(254, 220, 61, 0.1)", left: 0, top: 0 }}></div>
                        <h3 style={{ fontSize: "1.5rem", fontFamily: "'Playfair Display', serif", marginBottom: "10px" }}>Vehículo ABC</h3>
                        <div style={{ background: "rgba(254, 220, 61, 0.05)", padding: "10px 15px", borderRadius: "10px", borderLeft: "3px solid var(--yellow-primary)", marginBottom: "15px" }}>
                          <p style={{ fontSize: "0.8rem", color: "var(--yellow-primary)", margin: 0, lineHeight: 1.4 }}>
                            <strong>¿Qué es el Modelo ABC (Arena)?</strong> Define por "dónde" o "con qué vehículo" el estudiante va a transitar este conocimiento. ¿Lo aprenderá consumiendo teoría en solitario (Adquisición)? ¿O debatiendo con la comunidad (Discusión)?
                          </p>
                        </div>
                        <p style={{ fontSize: "0.85rem", opacity: 0.5, marginBottom: "25px" }}>Selecciona las <strong>2 dinámicas principales</strong>:</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          {ABC_CARDS.map(card => {
                            const isSelected = activeActivities.includes(card.type);
                            return (
                                <button key={card.type} onClick={() => toggleABCActivity(card.type)} style={{ textAlign: "left", padding: "12px", borderRadius: "12px", border: "1px solid", transition: "0.2s", cursor: "pointer", background: isSelected ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.5)", borderColor: isSelected ? card.color : "rgba(255,255,255,0.05)", color: "inherit" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}><card.icon size={14} color={card.color} /><span style={{ fontWeight: 800, fontSize: "0.8rem", color: isSelected ? card.color : "inherit" }}>{card.type}</span></div>
                                  <p style={{ fontSize: "0.65rem", opacity: 0.4, margin: 0, lineHeight: 1.2 }}>{card.desc}</p>
                                </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="planner-panel">
                        <div className="glow-effect" style={{ background: "rgba(52, 211, 153, 0.1)", right: 0, bottom: 0 }}></div>
                        <h3 style={{ fontSize: "1.5rem", fontFamily: "'Playfair Display', serif", marginBottom: "5px" }}>Hito PBL (Propósito del Proyecto)</h3>
                        <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: "10px 15px", borderRadius: "10px", borderLeft: "3px solid #3b82f6", marginBottom: "15px" }}>
                          <p style={{ fontSize: "0.8rem", color: "#60a5fa", margin: 0, lineHeight: 1.4 }}>
                            <strong>Recordatorio PBL:</strong> El aprendizaje aquí siempre debe apuntar a la creación del Proyecto Final. Selecciona a qué área esencial de la construcción de ese proyecto aporta este módulo en específico.
                          </p>
                        </div>
                        <p style={{ fontSize: "0.85rem", opacity: 0.5, marginBottom: "20px" }}>¿Cómo aporta esta fase al proyecto <strong style={{ color: "var(--yellow-primary)" }}>{projectDefinition.title || "Final"}</strong>?</p>
                        <div style={{ display: "grid", gap: "10px" }}>
                          {PBL_PILARS.map(pilar => {
                            const isSelected = activePBL === pilar.type;
                            return (
                                <button key={pilar.type} onClick={() => setActivePBL(pilar.type)} style={{ textAlign: "left", padding: "12px", borderRadius: "12px", border: "1px solid", transition: "0.2s", cursor: "pointer", background: isSelected ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.5)", borderColor: isSelected ? pilar.color : "rgba(255,255,255,0.05)", color: "inherit", display: "flex", alignItems: "center", gap: "15px" }}>
                                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: isSelected ? pilar.color : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <pilar.icon size={16} color={isSelected ? "black" : pilar.color} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 800, fontSize: "0.8rem", color: isSelected ? pilar.color : "inherit" }}>{pilar.label}</span>
                                    <p style={{ fontSize: "0.65rem", opacity: 0.4, margin: 0 }}>{pilar.desc}</p>
                                  </div>
                                  {isSelected && <CheckCircle2 size={16} color={pilar.color} />}
                                </button>
                            );
                          })}
                        </div>
                      </div>

                      <button onClick={handleNextModule} className="btn-primary" style={{ width: "100%", padding: "18px" }}>{currentModuleIndex < moduleCount - 1 ? "Confirmar y Siguiente" : "Finalizar Roadmap"} <ChevronRight style={{ width: "20px" }} /></button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {step === "roadmap" && (
           <div style={{ animation: "fadeIn 0.5s ease" }}>
                <div style={{ textAlign: "center", marginBottom: "50px" }}>
                   <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", marginBottom: "15px" }}><CheckCircle2 size={30} /></div>
                   <h2 style={{ fontSize: "2.5rem", fontFamily: "'Playfair Display', serif" }}>Action Roadmap <span style={{ color: "var(--yellow-primary)" }}>Concluido</span></h2>
                   <p style={{ opacity: 0.5 }}>Plano táctico diseñado para el proyecto: <span style={{ color: "white", fontWeight: 700 }}>{projectDefinition.title}</span></p>
                </div>
                <div className="custom-scrollbar" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "24px", padding: "30px", marginBottom: "40px", overflowX: "auto", display: "flex", gap: "20px" }}>
                  {modulesPlan.map((m, i) => {
                    const pilar = PBL_PILARS.find(p => p.type === m.pblComponent);
                    return (
                      <div key={i} style={{ minWidth: "320px", background: "var(--bg-darker)", border: "1px solid rgba(255,255,255,0.1)", padding: "25px", borderRadius: "24px", position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--yellow-primary)", textTransform: "uppercase", letterSpacing: "1px" }}>Fase {i+1}</div>
                          {pilar && <pilar.icon size={16} color={pilar.color} style={{ opacity: 0.5 }} />}
                        </div>
                        <h4 style={{ color: "white", fontSize: "1.1rem", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>{m.topic}</h4>
                        {pilar && <div style={{ fontSize: "0.7rem", color: pilar.color, fontWeight: 800, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}><Milestone size={10} /> IMPACTO: {pilar.label.toUpperCase()}</div>}
                        <p style={{ fontSize: "0.85rem", opacity: 0.7, lineHeight: 1.6, marginBottom: "20px" }}>
                           {m.objectiveVerbs.join(", ")} {m.objectiveText}
                        </p>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {m.abcActivities.map(act => <span key={act} style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 8px", borderRadius: "5px", background: "rgba(255,255,255,0.05)", color: ABC_CARDS.find(c => c.type === act)?.color }}>{act}</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
             <div style={{ textAlign: "center" }}><button onClick={saveRoadmapToCourse} className="btn-primary" style={{ padding: "18px 45px" }}>Publicar como Syllabus del Curso</button></div>
           </div>
        )}
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(254, 220, 61, 0.2); border-radius: 10px; }
        .planner-grid { display: flex; gap: 30px; }
        .planner-panel { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 35px; border-radius: 24px; position: relative; overflow: hidden; }
        .glow-effect { position: absolute; width: 120px; height: 120px; filter: blur(50px); border-radius: 50%; z-index: 0; }
        @media (max-width: 950px) { .planner-grid { flex-direction: column; } .hide-mobile { display: none; } }
      `}} />
    </div>
  );
}
