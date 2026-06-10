"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Compass, CheckCircle2, ChevronRight, BrainCircuit, Library, Search, PenTool, MessageSquare, Users, PenBox, Sparkles, Check, Target, Lightbulb, Rocket, Milestone, Map, Loader2, Settings, X, Calendar } from "lucide-react";
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
  { type: "Adquisición", icon: Library, color: "#3b82f6", desc: "Consumir teoría (Lectura/Video)." },
  { type: "Investigación", icon: Search, color: "#8b5cf6", desc: "Buscar, comparar y analizar." },
  { type: "Práctica", icon: PenTool, color: "#10b981", desc: "Hacer simulaciones o ejercicios." },
  { type: "Discusión", icon: MessageSquare, color: "#f59e0b", desc: "Debatir con los pares." },
  { type: "Colaboración", icon: Users, color: "#ec4899", desc: "Construir algo en grupo." },
  { type: "Producción", icon: PenBox, color: "#eab308", desc: "Crear un artefacto individual." }
];

type PBLPilar = "Reto" | "Inquiry" | "Autenticidad" | "Voz" | "Reflexión" | "Crítica" | "Producto";

const PBL_PILARS: { type: PBLPilar; label: string; icon: any; color: string; desc: string }[] = [
  { type: "Reto", label: "El Reto Central", icon: Target, color: "#f87171", desc: "Diseño basado en un problema." },
  { type: "Inquiry", label: "Investigación", icon: Search, color: "#a78bfa", desc: "Búsqueda activa." },
  { type: "Autenticidad", label: "Mundo Real", icon: Map, color: "#34d399", desc: "Relevancia profesional." },
  { type: "Voz", label: "Elección Libre", icon: MessageSquare, color: "#60a5fa", desc: "El alumno decide." },
  { type: "Reflexión", label: "Pausa Crítica", icon: Lightbulb, color: "#fbbf24", desc: "Pensar sobre errores." },
  { type: "Crítica", label: "Revisión/Mejora", icon: PenTool, color: "#f472b6", desc: "Ciclos de feedback." },
  { type: "Producto", label: "Producto Final", icon: Rocket, color: "#fb923c", desc: "Resultado tangible." }
];

type ModulePlan = { topic: string; objectiveVerbs: string[]; objectiveText: string; abcActivities: ABCType[]; pblComponent?: PBLPilar };

export default function PlannerAssistant() {
  const router = useRouter();
  const supabase = createClient();

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // WIZARD STATES
  const [step, setStep] = useState<"intro" | "select_course" | "project_foundation" | "planning" | "roadmap">("intro");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  
  const [moduleCount, setModuleCount] = useState<number>(16); // Default to 2 cortes x 8 semanas
  
  // PBL PROJECT STATE
  const [projectDefinition, setProjectDefinition] = useState({
    title: "",
    drivingQuestion: "",
    finalProduct: ""
  });
  
  // PLANNING STATES
  const [modulesPlan, setModulesPlan] = useState<ModulePlan[]>([]);
  const [activeWeekIndex, setActiveWeekIndex] = useState<number | null>(null);
  
  // FORM FIELDS PER MODULE (For Sidebar)
  const [moduleTopic, setModuleTopic] = useState("");
  const [activeVerbs, setActiveVerbs] = useState<Record<string, string>>({});
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

  const startProjectFoundation = () => {
    setStep("project_foundation");
    playUISound("click");
  };

  const startPlanning = () => {
    if (modulesPlan.length !== moduleCount) {
      const initialPlans = Array.from({ length: moduleCount }).map(() => ({
        topic: "",
        objectiveVerbs: [],
        objectiveText: "",
        abcActivities: []
      }));
      setModulesPlan(initialPlans);
    }
    setStep("planning");
    playUISound("click");
  };

  const changeModuleCount = () => {
    const newVal = prompt("¿Cuántas semanas/módulos tendrá tu programa?", moduleCount.toString());
    if (newVal && !isNaN(parseInt(newVal))) {
      const num = parseInt(newVal);
      if (num > 0 && num <= 50) {
        setModuleCount(num);
        // Resize array
        setModulesPlan(prev => {
          const arr = [...prev];
          while(arr.length < num) arr.push({ topic: "", objectiveVerbs: [], objectiveText: "", abcActivities: [] });
          return arr.slice(0, num);
        });
      }
    }
  };

  const openPanelForWeek = (index: number) => {
    const data = modulesPlan[index];
    setModuleTopic(data.topic || "");
    setActiveText(data.objectiveText || "");
    setActiveActivities(data.abcActivities || []);
    setActivePBL(data.pblComponent || null);
    
    // Reconstruct verbs (simplified for fast UI)
    const newActiveVerbs: Record<string, string> = {};
    if (data.objectiveVerbs && data.objectiveVerbs.length > 0) {
      for (const cat of Object.keys(BLOOM_VERBS) as Array<keyof typeof BLOOM_VERBS>) {
        if (BLOOM_VERBS[cat].verbs.includes(data.objectiveVerbs[0])) {
          newActiveVerbs[cat] = data.objectiveVerbs[0];
          setSelectedBloomLevel(cat);
          break;
        }
      }
    } else {
      setSelectedBloomLevel(null);
    }
    setActiveVerbs(newActiveVerbs);
    setActiveWeekIndex(index);
  };

  const closePanel = () => {
    setActiveWeekIndex(null);
  };

  const saveWeek = () => {
    if (activeWeekIndex === null) return;
    
    const verbList = Object.values(activeVerbs);
    if (!moduleTopic.trim() || verbList.length === 0 || activeActivities.length === 0) {
      alert("Por favor completa el TEMA, selecciona un VERBO y elige un VEHÍCULO ABC para continuar.");
      return;
    }

    const updatedPlans = [...modulesPlan];
    updatedPlans[activeWeekIndex] = {
      topic: moduleTopic,
      objectiveVerbs: verbList,
      objectiveText: activeText,
      abcActivities: [...activeActivities],
      pblComponent: activePBL as PBLPilar
    };
    setModulesPlan(updatedPlans);
    playUISound("success");
    closePanel();
  };

  const handleVerbToggle = (category: string, verb: string) => {
    setActiveVerbs({ [category]: verb }); // Solo un verbo por semana para simplificar
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
       alert("Syllabus publicado. Mentores y alumnos ahora verán este curso.");
       router.push("/admin");
    } else alert(error.message);
  };

  const getCombinedObjective = () => {
    const list = Object.values(activeVerbs);
    const pilar = PBL_PILARS.find(p => p.type === activePBL);
    const pilarLabel = pilar ? pilar.label : "[Hito]";
    
    let verbStr = "[Verbo]";
    if (list.length > 0) verbStr = list[0];
    
    return `Mediante el pilar de ${pilarLabel}, el estudiante será capaz de ${verbStr} ${activeText || "[objeto]"}.`;
  };

  const isRoadmapComplete = modulesPlan.length > 0 && modulesPlan.every(m => m.topic !== "" && m.objectiveVerbs.length > 0);

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ minHeight: "100vh", padding: "40px 20px", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif", overflowX: "hidden" }}>
      
      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "60px", maxWidth: "1200px", margin: "0 auto 60px auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link href="/admin" style={{ padding: "12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "var(--text-primary)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <ArrowLeft style={{ width: "20px", height: "20px" }} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
              CLAN <Compass style={{ color: "var(--yellow-primary)", width: "24px", height: "24px" }} /> <span style={{ fontStyle: "italic", fontWeight: 400 }}>Planner Assistant</span>
            </h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", letterSpacing: "2px", textTransform: "uppercase", margin: 0, marginTop: "4px" }}>Diseño Rápido de Syllabus</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }} className="hide-mobile">
           {['intro', 'select_course', 'project_foundation', 'planning', 'roadmap'].map((s) => (
             <div key={s} style={{ height: "6px", width: "40px", borderRadius: "10px", background: step === s ? "var(--yellow-primary)" : "var(--border-color)", transition: "0.3s" }} />
           ))}
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
        
        {/* PANTALLA DE BIENVENIDA Y PROPUESTA DE VALOR */}
        {step === "intro" && (
          <div style={{ maxWidth: "900px", margin: "60px auto 0 auto", animation: "fadeIn 0.5s ease-out" }}>
            <div style={{ textAlign: "center", marginBottom: "50px" }}>
              <Sparkles style={{ width: "60px", height: "60px", margin: "0 auto 20px auto", color: "var(--yellow-primary)" }} />
              <h2 style={{ fontSize: "3rem", fontFamily: "'Playfair Display', serif", margin: "0 0 15px 0" }}>Bienvenido al <span style={{ color: "var(--yellow-primary)", fontStyle: "italic" }}>Planner CLAN</span></h2>
              <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "700px", margin: "0 auto" }}>
                Estás a punto de diseñar un curso de aprendizaje de clase mundial. Para lograrlo y garantizar la máxima excelencia académica, nuestro asistente estructura tu conocimiento utilizando la <strong>tríada pedagógica más poderosa del mundo:</strong>
              </p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "50px" }}>
              <div style={{ background: "var(--bg-card)", padding: "30px", borderRadius: "20px", border: "1px solid var(--border-color)", display: "flex", gap: "25px", alignItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
                 <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "18px", borderRadius: "50%", color: "#3b82f6" }}><BrainCircuit size={32} /></div>
                 <div>
                   <h3 style={{ fontSize: "1.3rem", margin: "0 0 8px 0", color: "var(--text-primary)" }}>1. Taxonomía de Bloom <span style={{fontSize:"0.8rem", color:"var(--text-secondary)", fontWeight:"normal"}}>(Profundidad)</span></h3>
                   <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>Garantiza que el aprendizaje sea profundo y real. No solo le pedimos al talento que "memorice" conceptos, sino que los guiamos paso a paso hasta que sean capaces de <strong>Analizar, Evaluar y Crear</strong> sus propias soluciones.</p>
                 </div>
              </div>

              <div style={{ background: "var(--bg-card)", padding: "30px", borderRadius: "20px", border: "1px solid var(--border-color)", display: "flex", gap: "25px", alignItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
                 <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "18px", borderRadius: "50%", color: "#10b981" }}><Library size={32} /></div>
                 <div>
                   <h3 style={{ fontSize: "1.3rem", margin: "0 0 8px 0", color: "var(--text-primary)" }}>2. Modelo ABC / Arena <span style={{fontSize:"0.8rem", color:"var(--text-secondary)", fontWeight:"normal"}}>(Vehículo)</span></h3>
                   <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>Define el "vehículo" exacto por el que transita el talento cada semana. ¿Aprenderá mediante investigación? ¿Discutiendo con sus pares? ¿O haciendo práctica pura? Esto rompe por completo la monotonía de las clases tradicionales.</p>
                 </div>
              </div>

              <div style={{ background: "var(--bg-card)", padding: "30px", borderRadius: "20px", border: "1px solid var(--border-color)", display: "flex", gap: "25px", alignItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
                 <div style={{ background: "rgba(244, 63, 94, 0.1)", padding: "18px", borderRadius: "50%", color: "#f43f5e" }}><Rocket size={32} /></div>
                 <div>
                   <h3 style={{ fontSize: "1.3rem", margin: "0 0 8px 0", color: "var(--text-primary)" }}>3. Metodología PBL <span style={{fontSize:"0.8rem", color:"var(--text-secondary)", fontWeight:"normal"}}>(Impacto Real)</span></h3>
                   <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>Asegura que ninguna semana sea "de relleno". El Aprendizaje Basado en Proyectos garantiza que cada módulo aporte una pieza clave y aplicable para resolver un <strong>Reto del Mundo Real</strong>.</p>
                 </div>
              </div>
            </div>
            
            <div style={{ textAlign: "center" }}>
              <button onClick={() => { setStep("select_course"); playUISound("click"); }} className="btn-primary" style={{ padding: "18px 50px", fontSize: "1.1rem", fontWeight: 800 }}>Empezar a Planificar <ChevronRight size={20} style={{ marginLeft: 8 }} /></button>
            </div>
          </div>
        )}

        {step === "select_course" && (
          <div style={{ maxWidth: "700px", margin: "80px auto 0 auto", textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
            <Compass style={{ width: "60px", height: "60px", margin: "0 auto 20px auto", color: "var(--yellow-primary)", opacity: 0.8 }} />
            <h2 style={{ fontSize: "2.5rem", fontFamily: "'Playfair Display', serif", marginBottom: "15px" }}>Buscando el <span style={{ color: "var(--yellow-primary)", fontStyle: "italic" }}>Programa Base</span></h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "40px" }}>Selecciona el curso para el cual diseñarás el mapa táctico de aprendizaje.</p>
            <div style={{ display: "grid", gap: "15px", textAlign: "left" }}>
              {courses.map(c => (
                <button key={c.id} onClick={() => setSelectedCourse(c)} style={{ padding: "20px", borderRadius: "16px", border: "1px solid", transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", cursor: "pointer", background: selectedCourse?.id === c.id ? "rgba(254, 220, 61, 0.1)" : "var(--bg-card)", borderColor: selectedCourse?.id === c.id ? "var(--yellow-primary)" : "var(--border-color)", color: "var(--text-primary)", boxShadow: selectedCourse?.id === c.id ? "0 4px 15px rgba(254, 220, 61, 0.15)" : "none" }}>
                  <div><h3 style={{ fontWeight: 800, fontSize: "1.2rem", margin: "0 0 5px 0" }}>{c.title}</h3><p style={{ fontSize: "0.85rem", color: "var(--yellow-primary)", margin: 0 }}>{c.category}</p></div>
                  {selectedCourse?.id === c.id && <CheckCircle2 style={{ color: "var(--yellow-primary)" }} />}
                </button>
              ))}
            </div>
            <button disabled={!selectedCourse} onClick={startProjectFoundation} className="btn-primary" style={{ marginTop: "40px", opacity: selectedCourse ? 1 : 0.5 }}>Definir Proyecto PBL <ChevronRight style={{ width: "20px" }} /></button>
          </div>
        )}

        {step === "project_foundation" && (
          <div style={{ maxWidth: "1100px", margin: "60px auto 0 auto", animation: "fadeIn 0.5s ease-out" }}>
            <div style={{ textAlign: "center", marginBottom: "50px" }}>
              <Rocket style={{ width: "60px", height: "60px", margin: "0 auto 20px auto", color: "var(--yellow-primary)" }} />
              <h2 style={{ fontSize: "2.5rem", fontFamily: "'Playfair Display', serif" }}>Estructura del <span style={{ color: "var(--yellow-primary)", fontStyle: "italic" }}>Proyecto Final</span></h2>
              <p style={{ color: "var(--text-secondary)" }}>El Aprendizaje Basado en Proyectos (PBL) exige que los estudiantes construyan algo real y valioso.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "25px", background: "var(--bg-card)", padding: "40px", borderRadius: "24px", border: "1px solid var(--border-color)", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", color: "var(--yellow-primary)", marginBottom: "10px", display: "block" }}>1. Título del Proyecto Final:</label>
                  <input 
                    value={projectDefinition.title} 
                    onChange={e => setProjectDefinition({...projectDefinition, title: e.target.value})}
                    placeholder="Ej: Lanzamiento de una Colección Cápsula..." 
                    style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box", fontSize: "1.05rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", color: "var(--yellow-primary)", marginBottom: "10px", display: "block" }}>2. Pregunta Impulsora (Driving Question):</label>
                  <input 
                    value={projectDefinition.drivingQuestion} 
                    onChange={e => setProjectDefinition({...projectDefinition, drivingQuestion: e.target.value})}
                    placeholder="¿Cómo podríamos crear un producto que...?" 
                    style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box", fontSize: "1.05rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", color: "var(--yellow-primary)", marginBottom: "10px", display: "block" }}>3. Producto Público Esperado:</label>
                  <input 
                    value={projectDefinition.finalProduct} 
                    onChange={e => setProjectDefinition({...projectDefinition, finalProduct: e.target.value})}
                    placeholder="Ej: Brief creativo, Plan de Torneo..." 
                    style={{ width: "100%", padding: "18px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box", fontSize: "1.05rem" }}
                  />
                </div>
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button disabled={!projectDefinition.title || !projectDefinition.drivingQuestion} onClick={startPlanning} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>Continuar al Mapa de Semanas <ChevronRight style={{ width: "20px" }} /></button>
                </div>
              </div>

              {/* PBL GUIDE PANEL */}
              <div style={{ background: "rgba(254, 220, 61, 0.05)", border: "1px solid var(--yellow-primary)", padding: "35px", borderRadius: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <Lightbulb color="var(--yellow-primary)" size={24} />
                  <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", margin: 0, fontFamily: "'Playfair Display', serif" }}>Guía Rápida</h3>
                </div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 25 }}>
                   No enseñamos teoría aislada, sino herramientas para completar un <strong>Reto Real</strong>.
                </p>
                <div style={{ background: "var(--bg-card)", padding: 20, borderRadius: 16, border: "1px solid var(--border-color)" }}>
                  <p style={{ color: "var(--yellow-primary)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Ejemplo Práctico</p>
                  <p style={{ color: "var(--text-primary)", fontSize: "0.85rem", margin: "0 0 5px 0" }}><strong>Reto:</strong> Identidad Visual Urbana</p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 5px 0" }}><strong>Pregunta:</strong> ¿Cómo representar la cultura de la calle en una marca?</p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}><strong>Producto:</strong> Logo y 3 Mockups de prendas.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "planning" && (
          <div style={{ animation: "fadeIn 0.5s ease-out" }}>
             
             {/* TOP BAR: Title + Settings */}
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", background: "var(--bg-card)", padding: "20px 30px", borderRadius: "20px", border: "1px solid var(--border-color)", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
                 <div>
                   <h2 style={{ fontSize: "1.5rem", fontFamily: "'Playfair Display', serif", margin: 0 }}>Mapa Visual de <span style={{ color: "var(--yellow-primary)" }}>{moduleCount} Semanas</span></h2>
                   <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>{selectedCourse?.title} • Estructura Oficial</p>
                 </div>
                 <button onClick={changeModuleCount} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid var(--border-color)", padding: "10px 15px", borderRadius: "10px", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    <Settings size={16} /> Modificar Extensión
                 </button>
             </div>

             {/* GUIDANCE BANNER */}
             <div style={{ background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "16px", padding: "20px", marginBottom: "30px", display: "flex", gap: "20px", alignItems: "center" }}>
                <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "12px", borderRadius: "50%", color: "#3b82f6" }}><Compass size={24} /></div>
                <div>
                  <h3 style={{ margin: "0 0 5px 0", color: "#3b82f6", fontSize: "1.1rem" }}>Construye tu Curso con Seguridad</h3>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                    Haz clic en cada semana para definir su propósito. Usa la Taxonomía de Bloom sin estrés: <strong>¡Es completamente normal y recomendable repetir niveles de Bloom (como "Comprender" o "Aplicar") en varias semanas!</strong> Los estudiantes necesitan repetir niveles mientras dominan un tema complejo antes de subir al siguiente nivel.
                  </p>
                </div>
             </div>

             {/* GRID MAP */}
             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px", marginBottom: "40px" }}>
               {modulesPlan.map((m, i) => {
                 const isCompleted = m.topic !== "" && m.objectiveVerbs.length > 0;
                 const isCorte2 = i >= 8 && moduleCount === 16;
                 const displayWeekNum = (moduleCount === 16 && isCorte2) ? (i - 7) : (i + 1);
                 
                 return (
                    <div 
                      key={i} 
                      onClick={() => openPanelForWeek(i)}
                      style={{ 
                        padding: "20px", borderRadius: "16px", cursor: "pointer",
                        background: isCompleted ? "var(--bg-card)" : "var(--bg-primary)",
                        border: isCompleted ? "1px solid #22c55e" : "1px dashed var(--border-color)",
                        boxShadow: isCompleted ? "0 4px 15px rgba(34, 197, 94, 0.1)" : "none",
                        transition: "0.2s", position: "relative", overflow: "hidden"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                      {/* Corte badge */}
                      {moduleCount === 16 && (
                        <div style={{ position: "absolute", top: 0, right: 0, padding: "4px 10px", background: isCorte2 ? "rgba(139, 92, 246, 0.1)" : "rgba(59, 130, 246, 0.1)", color: isCorte2 ? "#8b5cf6" : "#3b82f6", fontSize: "0.6rem", fontWeight: 800, borderBottomLeftRadius: "10px" }}>
                          CORTE {isCorte2 ? "2" : "1"}
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                         <div style={{ width: 24, height: 24, borderRadius: "50%", background: isCompleted ? "#22c55e" : "var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.7rem", fontWeight: "bold" }}>
                            {isCompleted ? <Check size={14} /> : displayWeekNum}
                         </div>
                         <span style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: isCompleted ? "#22c55e" : "var(--text-secondary)" }}>
                           Semana {displayWeekNum}
                         </span>
                      </div>
                      <p style={{ fontSize: "1rem", margin: 0, fontWeight: 600, color: isCompleted ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.3 }}>
                        {isCompleted ? m.topic : "Sin planificar"}
                      </p>
                      {isCompleted && m.pblComponent && (
                         <div style={{ marginTop: 10, fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Target size={12} /> {m.pblComponent}
                         </div>
                      )}
                    </div>
                 );
               })}
             </div>

             {isRoadmapComplete && (
               <div style={{ textAlign: "center", marginTop: 40, animation: "fadeIn 1s ease" }}>
                 <button onClick={() => setStep("roadmap")} className="btn-primary" style={{ padding: "18px 50px", fontSize: "1.2rem", boxShadow: "0 10px 30px rgba(254, 220, 61, 0.3)" }}>
                   Ver Roadmap Completo <Sparkles size={20} style={{ marginLeft: 8 }} />
                 </button>
               </div>
             )}

             {/* SLIDE-OVER PANEL */}
             <div style={{ 
               position: "fixed", top: 0, right: activeWeekIndex !== null ? 0 : "-600px", width: "100%", maxWidth: "550px", height: "100vh", 
               background: "var(--bg-card)", borderLeft: "1px solid var(--border-color)", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
               transition: "0.4s cubic-bezier(0.16, 1, 0.3, 1)", zIndex: 100, display: "flex", flexDirection: "column"
             }}>
                {activeWeekIndex !== null && (
                  <>
                    <div style={{ padding: "30px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-primary)" }}>
                       <div>
                         <span style={{ fontSize: "0.75rem", color: "var(--yellow-primary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Configurando</span>
                         <h3 style={{ fontSize: "1.5rem", margin: 0, fontFamily: "'Playfair Display', serif" }}>
                           {moduleCount === 16 && activeWeekIndex >= 8 ? `Corte 2 • Semana ${activeWeekIndex - 7}` : `Semana ${activeWeekIndex + 1}`}
                         </h3>
                       </div>
                       <button onClick={closePanel} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 5 }}><X size={24} /></button>
                    </div>

                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "30px" }}>
                       
                       {/* 1. TOPIC */}
                       <div style={{ marginBottom: "30px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700, marginBottom: "8px", display: "block" }}>1. Nombre del Tema:</label>
                          <input 
                            style={{ width: "100%", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "15px", color: "var(--text-primary)", fontSize: "1rem", outline: "none" }}
                            placeholder="Ej: Fundamentos de EQ..."
                            value={moduleTopic}
                            onChange={e => setModuleTopic(e.target.value)}
                          />
                       </div>

                       {/* 2. BLOOM */}
                       <div style={{ marginBottom: "30px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700, marginBottom: "8px", display: "block" }}>2. Profundidad (Taxonomía de Bloom):</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {(Object.keys(BLOOM_VERBS) as Array<keyof typeof BLOOM_VERBS>).map((key) => (
                              <div key={key} style={{ background: selectedBloomLevel === key ? "var(--bg-primary)" : "transparent", borderRadius: "12px", border: selectedBloomLevel === key ? "1px solid var(--yellow-primary)" : "1px solid var(--border-color)", overflow: "hidden", transition: "0.2s" }}>
                                <button 
                                  onClick={() => setSelectedBloomLevel(selectedBloomLevel === key ? null : key)}
                                  style={{ width: "100%", padding: "12px 15px", textAlign: "left", background: "transparent", border: "none", color: selectedBloomLevel === key ? "var(--yellow-primary)" : "var(--text-primary)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                                >
                                  {key}
                                  {selectedBloomLevel === key && <Check size={16} />}
                                </button>
                                {selectedBloomLevel === key && (
                                  <div style={{ padding: "0 15px 15px 15px", animation: "fadeIn 0.3s" }}>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 10 }}>{BLOOM_VERBS[key].desc}</p>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                      {BLOOM_VERBS[key].verbs.map(v => (
                                        <button key={v} onClick={() => handleVerbToggle(key, v)} style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: "20px", border: "1px solid", cursor: "pointer", transition: "0.2s", background: activeVerbs[key] === v ? "var(--yellow-primary)" : "var(--bg-card)", borderColor: activeVerbs[key] === v ? "var(--yellow-primary)" : "var(--border-color)", color: activeVerbs[key] === v ? "black" : "var(--text-secondary)", fontWeight: activeVerbs[key] === v ? 700 : 400 }}>{v}</button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                       </div>

                       {/* 3. ABC */}
                       <div style={{ marginBottom: "30px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700, marginBottom: "8px", display: "block" }}>3. ¿Cómo van a aprender? (Modalidad ABC):</label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {ABC_CARDS.map(card => {
                              const isSelected = activeActivities.includes(card.type);
                              return (
                                  <button key={card.type} onClick={() => toggleABCActivity(card.type)} style={{ textAlign: "left", padding: "12px", borderRadius: "12px", border: "1px solid", transition: "0.2s", cursor: "pointer", background: isSelected ? "var(--bg-primary)" : "var(--bg-card)", borderColor: isSelected ? card.color : "var(--border-color)", color: "var(--text-primary)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}><card.icon size={14} color={card.color} /><span style={{ fontWeight: 700, fontSize: "0.8rem" }}>{card.type}</span></div>
                                  </button>
                              );
                            })}
                          </div>
                       </div>

                       {/* 4. PBL */}
                       <div style={{ marginBottom: "30px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700, marginBottom: "8px", display: "block" }}>4. ¿Qué pieza del Proyecto armarán aquí?:</label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {PBL_PILARS.map(pilar => {
                              const isSelected = activePBL === pilar.type;
                              return (
                                  <button key={pilar.type} onClick={() => setActivePBL(pilar.type)} style={{ textAlign: "left", padding: "10px", borderRadius: "12px", border: "1px solid", transition: "0.2s", cursor: "pointer", background: isSelected ? "var(--bg-primary)" : "var(--bg-card)", borderColor: isSelected ? pilar.color : "var(--border-color)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
                                    <pilar.icon size={14} color={isSelected ? pilar.color : "var(--text-secondary)"} />
                                    <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>{pilar.label}</span>
                                  </button>
                              );
                            })}
                          </div>
                       </div>

                       {/* 5. ENUNCIADO DINAMICO */}
                       <div style={{ marginBottom: "10px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 700, marginBottom: "8px", display: "block" }}>5. Promesa Educativa:</label>
                          <div style={{ background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "12px", padding: "15px" }}>
                            <p style={{ color: "#3b82f6", fontWeight: 700, marginBottom: "10px", lineHeight: 1.4, fontSize: "0.9rem" }}>{getCombinedObjective()}</p>
                            <input style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px", width: "100%", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none" }} placeholder="Complete con el objeto específico de la clase..." value={activeText} onChange={e => setActiveText(e.target.value)} />
                          </div>
                       </div>

                    </div>

                    <div style={{ padding: "20px 30px", borderTop: "1px solid var(--border-color)", background: "var(--bg-primary)" }}>
                       <button onClick={saveWeek} className="btn-primary" style={{ width: "100%", padding: "15px" }}>Guardar Cambios de Semana</button>
                    </div>
                  </>
                )}
             </div>

             {/* BACKDROP FOR SLIDE-OVER */}
             {activeWeekIndex !== null && (
               <div onClick={closePanel} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100vh", background: "rgba(0,0,0,0.4)", zIndex: 90, backdropFilter: "blur(2px)", animation: "fadeIn 0.3s" }}></div>
             )}

          </div>
        )}

        {step === "roadmap" && (
           <div style={{ animation: "fadeIn 0.5s ease" }}>
                <div style={{ textAlign: "center", marginBottom: "50px" }}>
                   <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", marginBottom: "15px" }}><CheckCircle2 size={30} /></div>
                   <h2 style={{ fontSize: "2.5rem", fontFamily: "'Playfair Display', serif" }}>Roadmap <span style={{ color: "var(--yellow-primary)" }}>Concluido</span></h2>
                   <p style={{ color: "var(--text-secondary)" }}>Plano táctico diseñado para el proyecto: <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{projectDefinition.title}</span></p>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "40px" }}>
                   {/* Columna Corte 1 */}
                   <div>
                     <h3 style={{ fontSize: "1.2rem", color: "var(--text-secondary)", marginBottom: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>CORTE 1</h3>
                     <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {modulesPlan.slice(0, Math.ceil(moduleCount/2)).map((m, i) => (
                          <RoadmapCard key={i} m={m} displayNum={i+1} pbl={PBL_PILARS.find(p => p.type === m.pblComponent)} abc={ABC_CARDS} />
                        ))}
                     </div>
                   </div>
                   
                   {/* Columna Corte 2 */}
                   {moduleCount > 1 && (
                     <div>
                       <h3 style={{ fontSize: "1.2rem", color: "var(--text-secondary)", marginBottom: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>CORTE 2</h3>
                       <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                          {modulesPlan.slice(Math.ceil(moduleCount/2)).map((m, i) => (
                            <RoadmapCard key={i + Math.ceil(moduleCount/2)} m={m} displayNum={(moduleCount === 16) ? (i + 1) : (i + 1 + Math.ceil(moduleCount/2))} pbl={PBL_PILARS.find(p => p.type === m.pblComponent)} abc={ABC_CARDS} />
                          ))}
                       </div>
                     </div>
                   )}
                </div>

             <div style={{ textAlign: "center" }}><button onClick={saveRoadmapToCourse} className="btn-primary" style={{ padding: "18px 45px" }}>Publicar como Syllabus Oficial</button></div>
           </div>
        )}
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(254, 220, 61, 0.4); border-radius: 10px; }
        @media (max-width: 950px) { .hide-mobile { display: none; } }
      `}} />
    </div>
  );
}

// Subcomponente para renderizar la tarjeta en el Roadmap Final
const RoadmapCard = ({ m, displayNum, pbl, abc }: { m: ModulePlan, displayNum: number, pbl: any, abc: any[] }) => (
  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--yellow-primary)", textTransform: "uppercase", letterSpacing: "1px" }}>Semana {displayNum}</div>
      {pbl && <pbl.icon size={14} color={pbl.color} style={{ opacity: 0.7 }} title={pbl.label} />}
    </div>
    <h4 style={{ color: "var(--text-primary)", fontSize: "1rem", margin: "0 0 8px 0" }}>{m.topic}</h4>
    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 15px 0" }}>
       {m.objectiveVerbs.join(", ")} {m.objectiveText}
    </p>
    <div style={{ display: "flex", gap: "6px" }}>
      {m.abcActivities.map((act: string) => <span key={act} style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 8px", borderRadius: "5px", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: abc.find(c => c.type === act)?.color }}>{act}</span>)}
    </div>
  </div>
);
