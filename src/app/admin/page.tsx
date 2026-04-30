"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Logo } from "@/components/Logo";
import { 
  BarChart2, 
  Users, 
  GraduationCap, 
  Settings, 
  Compass, 
  LogOut, 
  Eye, 
  CheckCircle,
  Plus,
  UserPlus,
  Key,
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Pencil,
  Trash2
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState("dashboard");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({ students: 0, courses: 0, validations: 23 });
  const [loading, setLoading] = useState(true);
  const [adminSuccessMsg, setAdminSuccessMsg] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal States for Enrollments
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeEnrollments, setActiveEnrollments] = useState<string[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Form states
  const [newCourse, setNewCourse] = useState({ title: "", category: "Deporte" });
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", password: "", role: "estudiante" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState<{text: string, ok: boolean} | null>(null);

  // Inline action states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setDebugError(null);
    try {
      // Fetch students
      const { count: studentCount, data: studentsData, error: studentError } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("role", "estudiante");

      if (studentError) {
        console.error("Student fetch error:", studentError);
        setDebugError("Error perfiles: " + studentError.message);
      }

      // Fetch courses - Simplified query to avoid join issues
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (coursesError) {
        console.error("Course fetch error:", coursesError);
        setDebugError("Error cursos: " + coursesError.message);
      }

      if (coursesData) {
        // Since we removed the join, we'll handle module count separately if needed or just set 0 for now
        const mappedCourses = coursesData.map(c => ({
          ...c,
          actual_total_modules: c.total_modules || 0
        }));
        setCourses(mappedCourses);
        setStats((prev) => ({
          ...prev,
          courses: mappedCourses.length,
        }));
      }

      if (studentsData) {
        setStudents(studentsData);
        setStats((prev) => ({
          ...prev,
          students: studentCount || 0,
        }));
      }
    } catch (err: any) {
      console.error("Fatal dashboard error:", err);
      setDebugError("Error Fatal: " + (err.message || JSON.stringify(err)));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Error de depuración extrema
  const [debugError, setDebugError] = useState<string | null>(null);

  const handleRenameCourse = async (courseId: string) => {
     if (editTitle.trim() === "") return;
     const { error } = await supabase.from("courses").update({ title: editTitle }).eq("id", courseId);
     if (!error) {
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, title: editTitle } : c));
        setAdminSuccessMsg("Curso actualizado.");
        setTimeout(() => setAdminSuccessMsg(""), 3000);
        setEditingId(null);
     } else {
         setDebugError("Error al actualizar: " + error.message);
      }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (!error) {
        setCourses(prev => prev.filter(c => c.id !== courseId));
        setAdminSuccessMsg("Eliminado.");
        setTimeout(() => setAdminSuccessMsg(""), 3000);
        setConfirmDeleteId(null);
        fetchDashboardData();
      } else {
        setDebugError("Error: " + error.message);
      }
    } catch (err: any) {
      setDebugError("Error fatal: " + err.message);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebugError(null);
    try {
      if (!newCourse.title || newCourse.title.trim() === "") {
        setDebugError("Por favor ingresa un título para el curso.");
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .insert([
          {
            title: newCourse.title,
            category: newCourse.category,
            is_active: true,
          },
        ])
        .select();

      if (error) {
        setDebugError(JSON.stringify(error, null, 2));
      } else {
        setAdminSuccessMsg("¡Estructura Creada Exitosamente en el Servidor Cloud!");
        setTimeout(() => setAdminSuccessMsg(""), 4000);
        setNewCourse({ title: "", category: "Deporte" });
        setActiveView("courses");
        fetchDashboardData();
      }
    } catch (err: any) {
      setDebugError(err.message || JSON.stringify(err));
    }
  };

  const openEnrollModal = async (student: any) => {
    setSelectedStudent(student);
    setEnrollModalOpen(true);
    // Fetch their current enrollments
    const { data } = await supabase.from("enrollments").select("course_id").eq("user_id", student.id);
    if (data) {
       setActiveEnrollments(data.map(e => e.course_id));
    } else {
       setActiveEnrollments([]);
    }
  };

  const toggleEnrollment = async (courseId: string, isEnrolled: boolean) => {
     if (!selectedStudent) return;
     setIsEnrolling(true);
     if (isEnrolled) {
        // Unenroll
        await supabase.from("enrollments").delete().match({ user_id: selectedStudent.id, course_id: courseId });
        setActiveEnrollments(prev => prev.filter(id => id !== courseId));
     } else {
        // Enroll
        await supabase.from("enrollments").insert({ user_id: selectedStudent.id, course_id: courseId });
        setActiveEnrollments(prev => [...prev, courseId]);
     }
     setIsEnrolling(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="dashboard-container">
      {/* Background Ornaments */}
      <div className="bg-ornaments">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Mobile Top-Level Controls */}
      <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        {isMobileMenuOpen ? <X size={24} /> : <BarChart2 size={24} />}
      </button>
      <div className={`mobile-overlay ${isMobileMenuOpen ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}></div>

      {/* Sidebar Wrapper */}
      <div className={`sidebar-wrapper ${isMobileMenuOpen ? "mobile-open" : ""} ${isCollapsed ? "collapsed" : ""}`}
           style={{ 
             position: "relative",
             zIndex: 200,
             height: "100vh"
           }}>
        
        {/* Floating Toggle Button - OUTSIDE the scroll area */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            position: "absolute",
            right: "-14px",
            top: "105px",
            width: "28px",
            height: "28px",
            background: "var(--brand-primary)",
            borderRadius: "50%",
            border: "none",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 300,
            boxShadow: "0 4px 15px rgba(0, 82, 255, 0.4)",
            transition: "all 0.3s ease"
          }}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`} 
               style={{ 
                 width: isCollapsed ? "110px" : "320px",
                 padding: isCollapsed ? "50px 15px" : "50px 24px",
                 transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                 overflowY: "auto",
                 overflowX: "hidden",
                 height: "100vh"
               }}>
        

        <div className="sidebar-logo" style={{ textAlign: isCollapsed ? "center" : "left", padding: isCollapsed ? "0" : "0 15px", marginBottom: "60px" }}>
          <div className="logo">
            <Logo variant="stacked" sizeMultiplier={isCollapsed ? 0.45 : 0.8} />
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <a href="#" className={`nav-item ${activeView === "dashboard" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveView("dashboard"); setIsMobileMenuOpen(false); }} 
             style={{ 
               color: activeView === "dashboard" ? "#fff" : "var(--text-main)", 
               background: activeView === "dashboard" ? "var(--brand-primary)" : "transparent",
               borderRadius: "14px",
               fontWeight: 700, 
               marginBottom: "12px",
               padding: "14px 20px",
               display: "flex",
               alignItems: "center",
               justifyContent: isCollapsed ? "center" : "flex-start",
               gap: isCollapsed ? "0" : "12px"
             }}>
            <BarChart2 size={20} /> {!isCollapsed && <span>Métricas</span>}
          </a>
          <a href="#" className={`nav-item ${activeView === "students" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveView("students"); setIsMobileMenuOpen(false); }} 
             style={{ 
               color: activeView === "students" ? "#fff" : "var(--text-main)", 
               background: activeView === "students" ? "var(--brand-primary)" : "transparent",
               borderRadius: "14px",
               fontWeight: 700, 
               marginBottom: "12px",
               padding: "14px 20px",
               display: "flex",
               alignItems: "center",
               justifyContent: isCollapsed ? "center" : "flex-start",
               gap: isCollapsed ? "0" : "12px"
             }}>
            <Users size={20} /> {!isCollapsed && <span>Alumnos</span>}
          </a>
          <a href="#" className={`nav-item ${activeView === "courses" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveView("courses"); setIsMobileMenuOpen(false); }} 
             style={{ 
               color: activeView === "courses" ? "#fff" : "var(--text-main)", 
               background: activeView === "courses" ? "var(--brand-primary)" : "transparent",
               borderRadius: "14px",
               fontWeight: 700, 
               marginBottom: "12px",
               padding: "14px 20px",
               display: "flex",
               alignItems: "center",
               justifyContent: isCollapsed ? "center" : "flex-start",
               gap: isCollapsed ? "0" : "12px"
             }}>
            <GraduationCap size={20} /> {!isCollapsed && <span>Cursos</span>}
          </a>
          <a href="#" className={`nav-item ${activeView === "settings" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveView("settings"); setIsMobileMenuOpen(false); }} 
             style={{ 
               color: activeView === "settings" ? "#fff" : "var(--text-main)", 
               background: activeView === "settings" ? "var(--brand-primary)" : "transparent",
               borderRadius: "14px",
               fontWeight: 700, 
               marginBottom: "12px",
               padding: "14px 20px",
               display: "flex",
               alignItems: "center",
               justifyContent: isCollapsed ? "center" : "flex-start",
               gap: isCollapsed ? "0" : "12px"
             }}>
            <Settings size={20} /> {!isCollapsed && <span>Sistema</span>}
          </a>
          
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px dashed var(--glass-border)" }}>
             <Link href="/admin/planner" className="nav-item" 
                   style={{ 
                     color: "var(--brand-primary)", 
                     display: "flex", 
                     alignItems: "center", 
                     justifyContent: isCollapsed ? "center" : "flex-start", 
                     gap: isCollapsed ? "0" : "12px", 
                     padding: "14px 20px",
                     fontWeight: 800
                   }}>
                <Compass size={20} /> {!isCollapsed && <span>Planner</span>}
             </Link>
          </div>
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "20px" }}>
          <button 
            className="nav-item" 
            aria-label="Cambiar tema"
            style={{ width: "100%", background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px", padding: "14px 20px", fontWeight: 700, marginBottom: "8px" }}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />} {!isCollapsed && <span style={{ color: "var(--text-main)" }}>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>}
          </button>

          <button 
            className="nav-item" 
            style={{ width: "100%", background: "none", border: "none", color: "#ef4444", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px", padding: "14px 20px", fontWeight: 700 }}
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            <LogOut size={20} /> {!isCollapsed && <span style={{ color: "var(--text-main)" }}>Salir</span>}
          </button>
        </div>
      </aside>
    </div>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          <div>
            <h1 className="art-text" style={{ fontSize: "2.4rem", marginBottom: "5px", color: "var(--text-main)" }}>
               {activeView === "dashboard" ? "Métricas Globales" : 
                activeView === "courses" ? "Gestión de Cursos" : 
                activeView === "students" ? "Gestión de Alumnos" :
                activeView === "settings" ? "Configuración" : 
                "Administración"}
            </h1>
            <p style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>
               {activeView === "dashboard" ? "Vista general del ecosistema educativo." : 
                activeView === "courses" ? "Administración de programas interactivos." : 
                activeView === "students" ? "Control de matriculaciones y acceso." :
                activeView === "settings" ? "Configuraciones globales y apariencia." : 
                "Panel de control centralizado."}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button 
              onClick={() => window.location.href = "/dashboard"} 
              style={{ padding: "10px 24px", background: "rgba(0, 82, 255, 0.1)", border: "1px solid var(--brand-primary)", borderRadius: "20px", color: "var(--brand-primary)", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "0.2s", fontWeight: 800, fontSize: "0.85rem" }}
            >
              <Eye size={18} /> <span>Vista Estudiante</span>
            </button>
            <div style={{ textAlign: "right", color: "var(--text-main)" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 900, margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>Administrador</p>
              <p style={{ fontSize: "0.75rem", opacity: 0.5, margin: 0, color: "var(--text-muted)" }}>Control Total</p>
            </div>
            <div style={{ width: "45px", height: "45px", background: "var(--brand-primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", boxShadow: "0 10px 20px rgba(0, 82, 255, 0.3)" }}>
              AD
            </div>
          </div>
        </header>

        {/* VIEW: DASHBOARD */}
        {activeView === "dashboard" && (
          <div className="admin-view active">
            <div className="grid-admin" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px", marginBottom: "40px" }}>
              <div className="stat-card" style={{ background: "linear-gradient(135deg, var(--bg-card), var(--bg-main))", border: "1px solid var(--glass-border)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, background: "var(--brand-primary)", opacity: 0.05, borderRadius: "50%" }}></div>
                <div style={{ width: "60px", height: "60px", borderRadius: "18px", background: "rgba(0, 82, 255, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-primary)", marginBottom: "25px", boxShadow: "0 8px 20px rgba(0, 82, 255, 0.1)" }}>
                  <Users size={30} />
                </div>
                <p style={{ fontSize: "0.85rem", opacity: 0.9, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 900, color: "var(--text-muted)" }}>Alumnos Activos</p>
                <h3 className="art-text" style={{ fontSize: "3.5rem", color: "var(--text-main)", marginTop: "10px", letterSpacing: "-2px" }}>{stats.students}</h3>
                <div style={{ height: "4px", width: "40px", background: "var(--brand-primary)", borderRadius: "2px", marginTop: "20px" }}></div>
              </div>

              <div className="stat-card" style={{ background: "linear-gradient(135deg, var(--bg-card), var(--bg-main))", border: "1px solid var(--glass-border)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, background: "var(--brand-secondary)", opacity: 0.05, borderRadius: "50%" }}></div>
                <div style={{ width: "60px", height: "60px", borderRadius: "18px", background: "rgba(14, 165, 233, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-secondary)", marginBottom: "25px", boxShadow: "0 8px 20px rgba(14, 165, 233, 0.1)" }}>
                  <BookOpen size={30} />
                </div>
                <p style={{ fontSize: "0.85rem", opacity: 0.9, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 900, color: "var(--text-muted)" }}>Programas Maestros</p>
                <h3 className="art-text" style={{ fontSize: "3.5rem", color: "var(--text-main)", marginTop: "10px", letterSpacing: "-2px" }}>{stats.courses}</h3>
                <div style={{ height: "4px", width: "40px", background: "var(--brand-secondary)", borderRadius: "2px", marginTop: "20px" }}></div>
              </div>
            </div>
            
            <div className="stat-card" style={{ padding: "40px", opacity: 0.8, textAlign: "center" }}>
                <BarChart2 size={48} style={{ color: "var(--brand-primary)", margin: "0 auto 20px", opacity: 0.5 }} />
                <h3 className="art-text" style={{ fontSize: "1.8rem", marginBottom: "10px" }}>Análisis de Cohorte</h3>
                <p style={{ color: "var(--text-muted)", maxWidth: "450px", margin: "0 auto" }}>La visualización avanzada de retención y crecimiento está siendo calibrada para el próximo ciclo.</p>
            </div>
          </div>
        )}

        {/* VIEW: COURSES */}
        {activeView === "courses" && (
          <div className="admin-view active">
            <h2 className="art-text" style={{ fontSize: "2.6rem", marginBottom: "40px", color: "var(--text-main)" }}>Catálogo de <span style={{ color: "var(--brand-primary)" }}>Rutas.</span></h2>
            {adminSuccessMsg && <div style={{background:"rgba(34,197,94,0.1)", border:"1px solid #22c55e", color:"#22c55e", padding:"15px 25px", borderRadius:"14px", marginBottom:"30px", display:"flex", alignItems:"center", gap:"10px", fontWeight: 700}}><CheckCircle size={18} /> {adminSuccessMsg}</div>}
            {debugError && <div style={{background:"rgba(239,68,68,0.1)", border:"1px solid #ef4444", color:"#ef4444", padding:"15px 25px", borderRadius:"14px", marginBottom:"30px", display:"flex", alignItems:"center", gap:"10px", fontWeight: 700}}><X size={18} /> {debugError}</div>}
            
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", gap: "20px" }}>
              <input type="text" placeholder="Filtrar por nombre..." style={{ padding: "14px 24px", borderRadius: "14px", border: "1px solid var(--glass-border)", background: "var(--bg-card)", color: "var(--text-main)", width: "350px", fontWeight: 500 }} />
              <button className="btn-primary" onClick={() => setActiveView("settings")} style={{ padding: "12px 30px" }}><Plus size={18} /> Crear Ruta</button>
            </div>

            <div className="stat-card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(0, 82, 255, 0.03)", borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                    <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 900, color: "var(--text-muted)" }}>Título del Programa</th>
                    <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 900, color: "var(--text-muted)" }}>Rama</th>
                    <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 900, color: "var(--text-muted)" }}>Estructura</th>
                    <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 900, color: "var(--text-muted)", textAlign: "right" }}>Operaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", opacity: 0.5, padding: "60px", color: "var(--text-muted)" }}>No hay programas estructurados aún. Inaugura el primero.</td>
                    </tr>
                  ) : (
                    courses.map(course => (
                      <tr key={course.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "var(--transition)" }} className="hover:bg-white/5">
                        <td style={{ padding: "22px 30px" }}>
                          {editingId === course.id ? (
                            <div style={{ display: "flex", gap: "10px" }}>
                              <input 
                                value={editTitle} 
                                onChange={(e) => setEditTitle(e.target.value)}
                                style={{ background: "var(--bg-main)", color: "var(--text-main)", border: "1px solid var(--brand-primary)", padding: "5px 10px", borderRadius: "8px", fontSize: "0.9rem", width: "100%" }}
                              />
                              <button onClick={() => handleRenameCourse(course.id)} style={{ color: "#22c55e", background: "none", border: "none", cursor: "pointer" }}><CheckCircle size={18} /></button>
                              <button onClick={() => setEditingId(null)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ color: "var(--text-main)", fontWeight: 800, fontSize: "1rem" }}>{course.title}</span>
                              <button 
                                onClick={() => { setEditingId(course.id); setEditTitle(course.title); }} 
                                style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", opacity: 0.6, display: "flex", alignItems: "center" }}
                                title="Renombrar curso"
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "22px 30px" }}>
                          <span style={{ padding: "5px 12px", background: "rgba(0, 82, 255, 0.1)", color: "var(--brand-primary)", borderRadius: "8px", fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase" }}>{course.category}</span>
                        </td>
                        <td style={{ padding: "22px 30px", color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600 }}>{course.actual_total_modules} Módulos</td>
                        <td style={{ padding: "22px 30px", textAlign: "right" }}>
                           {confirmDeleteId === course.id ? (
                             <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center" }}>
                               <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#ef4444" }}>¿SEGURO?</span>
                               <button onClick={() => handleDeleteCourse(course.id)} style={{ background: "#ef4444", color: "white", border: "none", padding: "5px 12px", borderRadius: "8px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}>SÍ, BORRAR</button>
                               <button onClick={() => setConfirmDeleteId(null)} style={{ background: "var(--glass-border)", color: "var(--text-main)", border: "none", padding: "5px 12px", borderRadius: "8px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}>NO</button>
                             </div>
                           ) : (
                             <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmDeleteId(course.id);
                                  }} 
                                  style={{ border: "1px solid rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.05)", color: "#ef4444", padding: "8px 15px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                                >
                                  <Trash2 size={14} /> Borrar
                                </button>
                                <Link 
                                  href={`/course?id=${course.id}`} 
                                  className="btn-primary"
                                  style={{ background: "#0052FF", color: "#FFFFFF", padding: "10px 20px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 800, textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(0, 82, 255, 0.2)" }}
                                >
                                  <Eye size={16} /> Entrar / Editar
                                </Link>
                             </div>
                           )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: STUDENTS */}
        {activeView === "students" && (
           <div className="admin-view active">
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "40px" }}>
                 <h2 className="art-text" style={{ fontSize: "2.6rem", color: "var(--text-main)" }}>Directorio de <span style={{ color: "var(--brand-primary)" }}>Alumnos.</span></h2>
                 <p style={{ opacity: 0.6, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-muted)" }}>Total Registrados: {students.length}</p>
             </div>

             {/* Create User Form */}
             <div className="stat-card" style={{ marginBottom: "40px" }}>
               <h3 className="art-text" style={{ fontSize: "1.6rem", color: "var(--brand-primary)", marginBottom: "30px", display: "flex", alignItems: "center", gap: "12px" }}>
                 <UserPlus size={24} />
                 Expandir Ecosistema
               </h3>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 setCreatingUser(true);
                 setCreateUserMsg(null);
                 const fullName = `${newUser.firstName.trim()} ${newUser.lastName.trim()}`;
                 
                 const { data, error } = await supabase.auth.signUp({
                   email: newUser.email.trim(),
                   password: newUser.password,
                   options: { data: { full_name: fullName } }
                 });

                 if (error) {
                   setCreateUserMsg({ text: `Error: ${error.message}`, ok: false });
                 } else if (data.user) {
                   if (newUser.role !== "estudiante") {
                     await supabase.from("profiles").update({ role: newUser.role }).eq("id", data.user.id);
                   }
                   setCreateUserMsg({ text: `¡Usuario ${fullName} creado con éxito!`, ok: true });
                   setNewUser({ firstName: "", lastName: "", email: "", password: "", role: "estudiante" });
                   fetchDashboardData();
                 }
                 setCreatingUser(false);
               }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "25px" }}>
                 <div>
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>NOMBRE</label>
                   <input className="input-focus-ring" value={newUser.firstName} onChange={e => setNewUser(p => ({...p, firstName: e.target.value}))} required placeholder="Juan" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div>
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>APELLIDO</label>
                   <input className="input-focus-ring" value={newUser.lastName} onChange={e => setNewUser(p => ({...p, lastName: e.target.value}))} required placeholder="Pérez" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div>
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>EMAIL ADMISIÓN</label>
                   <input className="input-focus-ring" type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} required placeholder="correo@clan.com" style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div>
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>CONTRASEÑA</label>
                   <input className="input-focus-ring" type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} required placeholder="Min. 6 car." minLength={6} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                   <button type="submit" disabled={creatingUser} className="btn-primary" style={{ padding: "14px", width: "100%" }}>
                     {creatingUser ? "Desplegando..." : "Confirmar Acceso"}
                   </button>
                 </div>
                 {createUserMsg && (
                  <div role="alert" style={{ gridColumn: "1 / -1", padding: "15px", borderRadius: "14px", background: createUserMsg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${createUserMsg.ok ? "#22c55e" : "#ef4444"}`, color: createUserMsg.ok ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                     {createUserMsg.text}
                  </div>
                 )}
               </form>
             </div>

             <div className="stat-card" style={{ padding: 0, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(0, 82, 255, 0.03)", borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                        <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 900, color: "var(--text-main)" }}>Identidad</th>
                        <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 900, color: "var(--text-main)" }}>Ingreso Digital</th>
                        <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 900, color: "var(--text-muted)", textAlign: "right" }}>Operaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                         <tr key={student.id} style={{ borderBottom: "1px solid var(--glass-border)" }} className="hover:bg-white/5">
                            <td style={{ padding: "22px 30px" }}>
                               <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--brand-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.85rem" }}>
                                     {student.full_name ? student.full_name.substring(0,2).toUpperCase() : "ES"}
                                  </div>
                                  <div>
                                     <p style={{ fontWeight: 800, margin: 0, color: "var(--text-main)" }}>{student.full_name || "Estudiante"}</p>
                                     <p style={{ fontSize: "0.75rem", opacity: 0.5, margin: 0 }}>ID: {student.id.split("-")[0].toUpperCase()}</p>
                                  </div>
                               </div>
                            </td>
                            <td style={{ padding: "22px 30px", color: "var(--text-main)", fontWeight: 600 }}>{new Date(student.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: "22px 30px", textAlign: "right" }}>
                               <button onClick={() => openEnrollModal(student)} style={{ padding: "8px 18px", background: "rgba(0, 82, 255, 0.1)", border: "1px solid var(--brand-primary)", borderRadius: "10px", color: "var(--brand-primary)", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>
                                  <Key size={14} style={{ marginRight: "8px" }} /> Accesos
                               </button>
                            </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
             </div>
           </div>
        )}

        {/* VIEW: SETTINGS */}
        {activeView === "settings" && (
          <div className="admin-view active">
            <h2 className="art-text" style={{ fontSize: "2.6rem", marginBottom: "40px", color: "var(--text-main)" }}>Arquitectura del <span style={{ color: "var(--brand-primary)" }}>Sistema.</span></h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "30px" }}>
              <div className="stat-card">
                <h3 className="art-text" style={{ fontSize: "1.6rem", color: "var(--brand-primary)", marginBottom: "30px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <BookOpen size={24} />
                  Desplegar Nueva Ruta
                </h3>
                <form onSubmit={handleCreateCourse}>
                  <div style={{ marginBottom: "25px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>TÍTULO DEL PROGRAMA</label>
                    <input className="input-focus-ring" type="text" required placeholder="Ej: Maestría Audiovisual" value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-main)", color: "var(--text-main)" }} />
                  </div>
                  <div style={{ marginBottom: "25px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>RAMA OPERATIVA</label>
                    <select className="input-focus-ring" value={newCourse.category} onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-main)", color: "var(--text-main)", fontWeight: 600 }}>
                      <option value="Deporte">Deporte (Azul CLAN)</option>
                      <option value="Arte">Arte & Sonido (Violeta CLAN)</option>
                      <option value="Cultura">Diseño & Cultura (Gris CLAN)</option>
                      <option value="Diseño">Creatividad & Marca</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: "100%", padding: "14px", fontWeight: 800 }}>Inicializar Shell</button>
                </form>
              </div>

              <div className="stat-card" style={{ opacity: 0.6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <Settings size={48} style={{ color: "var(--brand-primary)", marginBottom: "20px", opacity: 0.5 }} />
                  <p className="art-text" style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Ajustes del Ecosistema</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Módulos de seguridad y personalización global en fase de calibración.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Student Enrollment Modal */}
      {enrollModalOpen && selectedStudent && (
         <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div className="stat-card" style={{ width: "600px", maxWidth: "100%", padding: "50px" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                  <h3 className="art-text" style={{ fontSize: "1.8rem", color: "var(--brand-primary)" }}>Accesos. <span style={{ color: "var(--text-main)" }}>{selectedStudent.full_name || "Estudiante"}</span></h3>
                  <button onClick={() => setEnrollModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-main)", cursor: "pointer", opacity: 0.5 }}><X size={24} /></button>
               </div>
               <p style={{ fontSize: "1rem", opacity: 0.7, marginBottom: "40px", color: "var(--text-muted)", lineHeight: 1.6 }}>Define los derechos de acceso del alumno a las diferentes ramas del ecosistema educativo.</p>
               
               <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxHeight: "400px", overflowY: "auto", marginBottom: "40px", paddingRight: "10px" }}>
                  {courses.length === 0 ? (
                     <p style={{ opacity: 0.5, textAlign: "center", padding: "40px" }}>No hay programas disponibles para asignar.</p>
                  ) : courses.map(course => {
                     const isEnrolled = activeEnrollments.includes(course.id);
                     return (
                        <div key={course.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", background: "rgba(0, 82, 255, 0.05)", borderRadius: "16px", border: "1px solid var(--glass-border)" }}>
                           <div>
                              <p style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text-main)", marginBottom: "4px" }}>{course.title}</p>
                              <span style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "var(--brand-primary)" }}>{course.category}</span>
                           </div>
                           <label className="switch" style={{ pointerEvents: isEnrolling ? "none" : "auto", opacity: isEnrolling ? 0.5 : 1 }}>
                              <input type="checkbox" checked={isEnrolled} onChange={() => toggleEnrollment(course.id, isEnrolled)} />
                              <span className="slider"></span>
                           </label>
                        </div>
                     )
                  })}
               </div>
               <button onClick={() => setEnrollModalOpen(false)} className="btn-primary" style={{ width: "100%", padding: "16px", fontWeight: 800 }}>Guardar y Sincronizar Cambios</button>
            </div>
         </div>
      )}

    </div>
  );
}
