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
  Trash2,
  Menu,
  AlertTriangle,
  Activity,
  FileText,
  Calendar,
  Bot,
  ChevronDown
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

import { AdminNovedadesView } from "@/components/admin/AdminNovedadesView";
import { AdminGradesView } from "@/components/admin/AdminGradesView";
import { AdminCalvertView } from "@/components/admin/AdminCalvertView";
import { AdminFormsView } from "@/components/admin/AdminFormsView";
import { AdminMassUpload } from "@/components/admin/AdminMassUpload";
import { MentorshipView } from "@/components/dashboard/MentorshipView";
import { FloatingAI } from "@/components/dashboard/FloatingAI";
import { AdminCaptainView } from "@/components/admin/AdminCaptainView";

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

  // Profile Modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);

  // Modal States for Enrollments
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeEnrollments, setActiveEnrollments] = useState<string[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Form states
  const [newCourse, setNewCourse] = useState({ title: "", category: "Deporte" });
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", password: "", role: "estudiante", rama: "Deporte", disciplina: "", grade: "", ally: "", captain: "", student_code: "" });
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
      // Fetch admin profile
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", sessionData.session.user.id).single();
        if (profile) {
            setAdminProfile(profile);
            console.log("Admin Profile Fetched: ", profile);
        }
      }

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

      // Fetch all modules to count per course
      const { data: allModulesData } = await supabase
        .from("modules")
        .select("course_id");

      if (coursesData) {
        const mappedCourses = coursesData.map(c => {
          const modCount = allModulesData 
            ? allModulesData.filter((m: any) => m.course_id === c.id).length 
            : (c.total_modules || 0);
          return {
            ...c,
            actual_total_modules: modCount
          };
        });
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
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({ herramientas: false, operaciones: false, sistema: false });
  const toggleGroup = (group: string) => setExpandedGroups(p => ({...p, [group]: !p[group]}));
  const [adminProfile, setAdminProfile] = useState<any>(null);

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

  const handleOpenProfile = async (student: any) => {
    setSelectedProfileStudent(student);
    setProfileModalOpen(true);
    setProfileData(null); // start loading

    // Fetch external grades
    const { data: externalGrades } = await supabase.from("external_grades").select("*").eq("user_id", student.id).order("created_at", { ascending: false });

    // Fetch enrollments
    const { data: userEnrollments } = await supabase.from("enrollments").select("course_id").eq("user_id", student.id);
    if (!userEnrollments || userEnrollments.length === 0) {
      setProfileData({ rows: [], totalAvg: "0.0", maxModules: 0, externalGrades: externalGrades || [] });
      return;
    }

    const courseIds = userEnrollments.map((e: any) => e.course_id);
    
    // Fetch courses
    const { data: coursesData } = await supabase.from("courses").select("id, title").in("id", courseIds);
    if (!coursesData) return;

    // Fetch modules
    const { data: modulesData } = await supabase.from("modules").select("id, course_id, title").in("course_id", courseIds).order("created_at", { ascending: true });
    
    // Fetch module results
    const { data: resultsData } = await supabase.from("module_results").select("module_id, score").eq("user_id", student.id);

    // Build matrix
    let maxModules = 0;
    const rows = coursesData.map((course: any) => {
      const courseModules = (modulesData || []).filter((m: any) => m.course_id === course.id);
      if (courseModules.length > maxModules) maxModules = courseModules.length;

      const weeks: any = {};
      let totalScore = 0;
      let scoreCount = 0;

      courseModules.forEach((m: any, index: number) => {
        const result = (resultsData || []).find((r: any) => r.module_id === m.id);
        if (result) {
          weeks[index] = result.score;
          totalScore += result.score;
          scoreCount++;
        } else {
          weeks[index] = "Pend";
        }
      });

      const def = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : "0.0";

      return {
        courseId: course.id,
        courseTitle: course.title,
        weeks,
        def
      };
    });

    let globalScore = 0;
    let globalCount = 0;
    rows.forEach(r => {
      if (r.def !== "0.0") {
         globalScore += parseFloat(r.def);
         globalCount++;
      }
    });
    const totalAvg = globalCount > 0 ? (globalScore / globalCount).toFixed(1) : "0.0";

    setProfileData({ rows, totalAvg, maxModules, externalGrades: externalGrades || [] });
  };

  const closeEnrollModal = () => {
    setEnrollModalOpen(false);
    setSelectedStudent(null);
    setActiveEnrollments([]);
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

  // AI Modal States
  const [showAiModal, setShowAiModal] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [feedConfig, setFeedConfig] = useState({ week: "", term: "", expectedCalvert: "", expectedTrikele: "", expectedTyT: "" });
  const [excludedStudents, setExcludedStudents] = useState<Record<string, boolean>>({});
  const [specialNotes, setSpecialNotes] = useState<Record<string, string>>({});

  const generateAndQueueFeeds = async () => {
    setBroadcasting(true);
    try {
      const response = await fetch("/api/ai/clantech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast_feeds",
          week: feedConfig.week,
          term: feedConfig.term,
          expectedCalvert: feedConfig.expectedCalvert,
          expectedTrikele: feedConfig.expectedTrikele,
          expectedTyT: feedConfig.expectedTyT,
          excludedStudents,
          specialNotes,
          message: "Generar y enviar notificaciones de actividad semanal a los estudiantes de la DB."
        })
      });
      if (!response.ok) throw new Error("Fallo en la generación de feeds");
      alert("Feeds generados y enviados correctamente por WhatsApp.");
      setShowAiModal(false);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setBroadcasting(false);
    }
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
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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

          {/* Métricas - standalone top */}
          <a href="#" className={`nav-item ${activeView === "dashboard" ? "active" : ""}`} 
             style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
             onClick={(e) => { e.preventDefault(); setActiveView("dashboard"); setIsMobileMenuOpen(false); }}>
            <BarChart2 size={20} /> {!isCollapsed && <span>Métricas</span>}
          </a>

          {/* HERRAMIENTAS CLAN */}
          {!isCollapsed && <div onClick={() => toggleGroup('herramientas')} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, color: "var(--text-muted)", padding: "20px 15px 10px", opacity: 0.7, transition: "color 0.2s" }} onMouseOver={(e)=>e.currentTarget.style.color="var(--text-main)"} onMouseOut={(e)=>e.currentTarget.style.color="var(--text-muted)"}>Herramientas CLAN {expandedGroups['herramientas'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
          {(!isCollapsed ? expandedGroups['herramientas'] : true) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <a href="#" className={`nav-item ${activeView === "forms" ? "active" : ""}`} 
                 style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
                 onClick={(e) => { e.preventDefault(); setActiveView("forms"); setIsMobileMenuOpen(false); }}>
                <FileText size={20} /> {!isCollapsed && <span>Formularios</span>}
              </a>
              <a href="#" className={`nav-item ${activeView === "agenda" ? "active" : ""}`} 
                 style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
                 onClick={(e) => { e.preventDefault(); setActiveView("agenda"); setIsMobileMenuOpen(false); }}>
                <Calendar size={20} /> {!isCollapsed && <span>Agenda</span>}
              </a>
              <Link href="/admin/planner" className="nav-item" 
                    style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}>
                 <Compass size={20} /> {!isCollapsed && <span>Planner</span>}
              </Link>
              <a href="#" className={`nav-item ${activeView === "capitania" ? "active" : ""}`} 
                 style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
                 onClick={(e) => { e.preventDefault(); setActiveView("capitania"); setIsMobileMenuOpen(false); }}>
                <BookOpen size={20} /> {!isCollapsed && <span>Capitanía</span>}
              </a>
            </div>
          )}

          {/* OPERACIONES */}
          {!isCollapsed && <div onClick={() => toggleGroup('operaciones')} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, color: "var(--text-muted)", padding: "20px 15px 10px", opacity: 0.7, transition: "color 0.2s" }} onMouseOver={(e)=>e.currentTarget.style.color="var(--text-main)"} onMouseOut={(e)=>e.currentTarget.style.color="var(--text-muted)"}>Operaciones {expandedGroups['operaciones'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
          {(!isCollapsed ? expandedGroups['operaciones'] : true) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <a href="#" className={`nav-item ${activeView === "grades" ? "active" : ""}`} 
                 style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
                 onClick={(e) => { e.preventDefault(); setActiveView("grades"); setIsMobileMenuOpen(false); }}>
                <FileText size={20} /> {!isCollapsed && <span>Calificaciones Aliado Col</span>}
              </a>
              <a href="#" className={`nav-item ${activeView === "calvert" ? "active" : ""}`} 
                 style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
                 onClick={(e) => { e.preventDefault(); setActiveView("calvert"); setIsMobileMenuOpen(false); }}>
                <FileText size={20} /> {!isCollapsed && <span>Calificaciones (Calvert)</span>}
              </a>
              <a href="#" className={`nav-item ${activeView === "novedades" ? "active" : ""}`} 
                 style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
                 onClick={(e) => { e.preventDefault(); setActiveView("novedades"); setIsMobileMenuOpen(false); }}>
                <AlertTriangle size={20} /> {!isCollapsed && <span>Eventualidades</span>}
              </a>
            </div>
          )}

          {/* SISTEMA - desplegable al final */}
          {!isCollapsed && <div onClick={() => toggleGroup('sistema')} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, color: "var(--text-muted)", padding: "20px 15px 10px", opacity: 0.7, transition: "color 0.2s" }} onMouseOver={(e)=>e.currentTarget.style.color="var(--text-main)"} onMouseOut={(e)=>e.currentTarget.style.color="var(--text-muted)"}>Sistema {expandedGroups['sistema'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>}
          {(!isCollapsed ? expandedGroups['sistema'] : true) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <a href="#" className={`nav-item ${activeView === "students" ? "active" : ""}`} 
                 style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
                 onClick={(e) => { e.preventDefault(); setActiveView("students"); setIsMobileMenuOpen(false); }}>
                <Users size={20} /> {!isCollapsed && <span>Alumnos</span>}
              </a>
              <a href="#" className={`nav-item ${activeView === "courses" ? "active" : ""}`} 
                 style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
                 onClick={(e) => { e.preventDefault(); setActiveView("courses"); setIsMobileMenuOpen(false); }}>
                <GraduationCap size={20} /> {!isCollapsed && <span>Cursos</span>}
              </a>
              <a href="#" className={`nav-item ${activeView === "settings" ? "active" : ""}`} 
                 style={{ justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px" }}
                 onClick={(e) => { e.preventDefault(); setActiveView("settings"); setIsMobileMenuOpen(false); }}>
                <Settings size={20} /> {!isCollapsed && <span>Configuración</span>}
              </a>
            </div>
          )}

        </nav>


        <div className="sidebar-footer">
          <button 
            className="nav-item theme-toggle-btn" 
            aria-label="Cambiar tema"
            style={{ 
              justifyContent: isCollapsed ? "center" : "flex-start", 
              gap: isCollapsed ? "0" : "12px"
            }}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />} {!isCollapsed && <span>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>}
          </button>

          <button 
            className="nav-item logout-btn" 
            aria-label="Cerrar sesión"
            style={{ 
              justifyContent: isCollapsed ? "center" : "flex-start", 
              gap: isCollapsed ? "0" : "12px"
            }}
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            <LogOut size={20} /> {!isCollapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>
    </div>



      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header-premium" style={{ marginBottom: "40px", borderRadius: "0 0 24px 24px", borderTop: "none", display: "flex", flexWrap: "wrap", gap: "25px", justifyContent: "space-between", alignItems: "center" }}>
          <div className="header-text-group" style={{ flex: "1 1 min-content", minWidth: "300px" }}>
            <h1 className="welcome-title" style={{ fontSize: "2rem", wordBreak: "break-word", margin: 0 }}>
               {activeView === "dashboard" ? "Métricas Globales" : 
                activeView === "courses" ? "Gestión de Cursos" : 
                activeView === "students" ? "Gestión de Alumnos" :
                activeView === "grades" ? "Libro de Calificaciones" :
                activeView === "settings" ? "Configuración" : 
                "Administración"}
            </h1>
            <p className="welcome-subtitle" style={{ fontSize: "0.95rem", margin: "5px 0 0 0" }}>
               {activeView === "dashboard" ? "Vista general del ecosistema educativo." : 
                activeView === "courses" ? "Administración de programas interactivos." : 
                activeView === "students" ? "Control de matriculaciones y acceso." :
                activeView === "grades" ? "Módulo avanzado de calificaciones externas." :
                activeView === "settings" ? "Configuraciones globales y apariencia." : 
                "Panel de control centralizado."}
            </p>
          </div>
          <div className="header-actions-group" style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
            <button 
              onClick={() => window.location.href = "/dashboard"} 
              className="btn-secondary header-btn"
              style={{ padding: "8px 16px", borderRadius: "12px", border: "1px solid var(--brand-secondary)", color: "var(--brand-secondary)", background: "var(--brand-glow)", fontSize: "0.85rem", height: "auto" }}
            >
              <Eye size={16} /> <span style={{ fontWeight: 800 }}>Modo Estudiante</span>
            </button>
            
            <div className="header-divider" style={{ width: "1px", height: "30px", background: "var(--glass-border)", margin: "0 5px" }}></div>

            <div className="admin-badge-text" style={{ textAlign: "right" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-main)" }}>Admin</p>
              <p style={{ fontSize: "0.7rem", opacity: 0.6, margin: 0, color: "var(--text-muted)" }}>Control Total</p>
            </div>
            <div className="admin-avatar" style={{ width: "42px", height: "42px", background: "var(--brand-primary)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", boxShadow: "0 8px 15px rgba(0, 82, 255, 0.25)" }}>
              AD
            </div>
          </div>
        </header>

        {/* VIEW: DASHBOARD */}
        {activeView === "dashboard" && (
          <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
            <div className="grid-admin" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "25px", marginBottom: "40px" }}>

              <div className="stat-card" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.05) 0%, rgba(212,175,55,0) 100%)", border: "1px solid rgba(212,175,55,0.2)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "220px" }}>
                <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.1, color: "var(--brand-secondary)" }}><Bot size={120} /></div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: "rgba(212,175,55, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-secondary)", boxShadow: "0 4px 15px rgba(212,175,55, 0.1)" }}>
                    <Bot size={24} />
                  </div>
                  <div className="pill-badge" style={{ margin: 0, background: "var(--brand-glow)", color: "var(--brand-secondary)" }}>AI Activa</div>
                </div>

                <div style={{ marginTop: "auto", paddingTop: "20px" }}>
                  <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 800, color: "var(--text-main)", marginBottom: "10px" }}>Notificaciones Inteligentes</p>
                  <button 
                     onClick={() => setShowAiModal(true)}
                     style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px", background: "var(--brand-secondary)", color: "white", borderRadius: "12px", fontWeight: 800, border: "none", cursor: "pointer", transition: "0.2s", boxShadow: "0 4px 15px rgba(0, 82, 255, 0.2)" }} 
                     className="hover-glow"
                  >
                     Enviar Feeds (IA)
                  </button>
                </div>
              </div>
              
              <div className="stat-card" style={{ padding: "35px 30px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "220px" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 150, height: 150, background: "var(--brand-primary)", opacity: 0.04, borderRadius: "50%" }}></div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: "var(--brand-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-secondary)", boxShadow: "0 4px 15px rgba(0, 82, 255, 0.1)" }}>
                    <Users size={24} />
                  </div>
                  <div className="pill-badge" style={{ margin: 0, background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>Online</div>
                </div>

                <div style={{ marginTop: "auto", paddingTop: "20px" }}>
                  <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 800, color: "var(--text-muted)", marginBottom: "5px" }}>Alumnos Activos</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <h3 style={{ fontSize: "3rem", color: "var(--text-main)", letterSpacing: "-1px", fontWeight: 800, margin: 0, lineHeight: 1 }}>{stats.students}</h3>
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{ padding: "35px 30px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "220px" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 150, height: 150, background: "var(--brand-secondary, #0EA5E9)", opacity: 0.04, borderRadius: "50%" }}></div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: "rgba(14, 165, 233, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0EA5E9", boxShadow: "0 4px 15px rgba(14, 165, 233, 0.1)" }}>
                    <BookOpen size={24} />
                  </div>
                  <div className="pill-badge" style={{ margin: 0, background: "var(--brand-glow)", color: "var(--brand-secondary)" }}>Publicados</div>
                </div>

                <div style={{ marginTop: "auto", paddingTop: "20px" }}>
                  <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 800, color: "var(--text-muted)", marginBottom: "5px" }}>Programas Maestros</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <h3 style={{ fontSize: "3rem", color: "var(--text-main)", letterSpacing: "-1px", fontWeight: 800, margin: 0, lineHeight: 1 }}>{stats.courses}</h3>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="stat-card" style={{ padding: "50px 40px", opacity: 0.9, textAlign: "center", borderStyle: "dashed" }}>
                <BarChart2 size={40} style={{ color: "var(--brand-secondary)", margin: "0 auto 15px", opacity: 0.5 }} />
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "10px", color: "var(--text-main)" }}>Análisis de Cohorte</h3>
                <p style={{ color: "var(--text-muted)", maxWidth: "450px", margin: "0 auto", fontSize: "0.95rem" }}>La visualización avanzada de retención y crecimiento está siendo calibrada para el próximo ciclo.</p>
            </div>
          </div>
        )}

        {/* VIEW: GRADES EXCEL */}
        {activeView === "grades" && (
          <AdminGradesView />
        )}

        {/* VIEW: FORMS */}
        {activeView === "forms" && (
           <AdminFormsView />
        )}

        {/* VIEW: CAPITANIA */}
        {activeView === "capitania" && (
           <AdminCaptainView currentAdminProfile={adminProfile} onOpenProfile={(profile) => { }} />
        )}

        {/* VIEW: COURSES */}
        {activeView === "courses" && (
          <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" }}>
              <div>
                <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "5px" }}>Catálogo de <span style={{ color: "var(--brand-secondary)" }}>Cursos</span></h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Organiza y estructura el contenido principal.</p>
              </div>
              <button className="btn-primary" onClick={() => setActiveView("settings")} style={{ padding: "12px 24px" }}><Plus size={18} /> Crear Curso</button>
            </div>

            {adminSuccessMsg && <div style={{background:"rgba(34,197,94,0.1)", border:"1px solid #22c55e", color:"#22c55e", padding:"15px 25px", borderRadius:"14px", marginBottom:"30px", display:"flex", alignItems:"center", gap:"10px", fontWeight: 700}}><CheckCircle size={18} /> {adminSuccessMsg}</div>}
            {debugError && <div style={{background:"rgba(239,68,68,0.1)", border:"1px solid #ef4444", color:"#ef4444", padding:"15px 25px", borderRadius:"14px", marginBottom:"30px", display:"flex", alignItems:"center", gap:"10px", fontWeight: 700}}><X size={18} /> {debugError}</div>}
            
            <div style={{ marginBottom: "25px" }}>
              <input type="text" placeholder="Buscar por nombre..." className="input-focus-ring" style={{ padding: "14px 24px", borderRadius: "14px", border: "1px solid var(--glass-border)", background: "var(--bg-card)", color: "var(--text-main)", width: "100%", maxWidth: "400px", fontWeight: 500 }} />
            </div>

            <div className="stat-card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--glass-border)", borderRadius: "20px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                  <thead>
                    <tr style={{ background: "rgba(0, 82, 255, 0.02)", borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Título del Programa</th>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Rama</th>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Estructura</th>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)", textAlign: "right" }}>Operaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", opacity: 0.6, padding: "80px 20px", color: "var(--text-muted)" }}>
                          <BookOpen size={40} style={{ margin: "0 auto 15px", opacity: 0.3 }} />
                          <p>No hay programas estructurados aún.</p>
                        </td>
                      </tr>
                    ) : (
                      courses.map(course => (
                        <tr key={course.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                          <td style={{ padding: "20px 30px" }}>
                            {editingId === course.id ? (
                              <div style={{ display: "flex", gap: "10px" }}>
                                <input 
                                  value={editTitle} 
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="input-focus-ring"
                                  style={{ background: "var(--bg-page)", color: "var(--text-main)", border: "1px solid var(--brand-secondary)", padding: "8px 12px", borderRadius: "8px", fontSize: "0.95rem", width: "100%" }}
                                />
                                <button onClick={() => handleRenameCourse(course.id)} style={{ color: "#22c55e", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px", padding: "8px", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><CheckCircle size={18} /></button>
                                <button onClick={() => setEditingId(null)} style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", padding: "8px", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={18} /></button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--brand-primary)" }}></div>
                                <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "1.05rem" }}>{course.title}</span>
                                <button 
                                  onClick={() => { setEditingId(course.id); setEditTitle(course.title); }} 
                                  style={{ background: "rgba(0,0,0,0.05)", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center" }}
                                  title="Renombrar curso"
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "20px 30px" }}>
                            <span className="pill-badge" style={{ margin: 0 }}>{course.category}</span>
                          </td>
                          <td style={{ padding: "20px 30px", color: "var(--text-main)", fontSize: "0.95rem", fontWeight: 600 }}>{course.actual_total_modules} Módulos</td>
                          <td style={{ padding: "20px 30px", textAlign: "right" }}>
                             {confirmDeleteId === course.id ? (
                               <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center" }}>
                                 <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#ef4444" }}>¿SEGURO?</span>
                                 <button onClick={() => handleDeleteCourse(course.id)} style={{ background: "#ef4444", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer" }}>SÍ, BORRAR</button>
                                 <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "0.8rem", height: "auto" }}>NO</button>
                               </div>
                             ) : (
                               <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setConfirmDeleteId(course.id);
                                    }} 
                                    style={{ border: "none", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "10px 15px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                                  >
                                    <Trash2 size={16} /> 
                                  </button>
                                  <Link 
                                    href={`/course?id=${course.id}`} 
                                    className="btn-primary"
                                    style={{ padding: "10px 20px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 800, textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", height: "auto" }}
                                  >
                                    <Pencil size={16} /> Entrar a Editar
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
          </div>
        )}

        {/* VIEW: STUDENTS */}
        {activeView === "students" && (
           <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" }}>
                 <div>
                   <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "5px" }}>Directorio de <span style={{ color: "var(--brand-secondary)" }}>Alumnos</span></h2>
                   <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Total Registrados: {students.length}</p>
                 </div>
             </div>

             <AdminMassUpload onSuccess={fetchDashboardData} />

             {/* Create User Form */}
             <div className="stat-card" style={{ marginBottom: "40px", padding: "40px", borderRadius: "24px" }}>
               <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
                 <div style={{ width: "45px", height: "45px", borderRadius: "12px", background: "var(--brand-glow)", color: "var(--brand-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <UserPlus size={22} />
                 </div>
                 <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)" }}>Añadir Nuevo Alumno</h3>
               </div>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 setCreatingUser(true);
                 setCreateUserMsg(null);
                 const fullName = newUser.firstName.trim();
                 
                 const { data, error } = await supabase.auth.signUp({
                   email: newUser.email.trim(),
                   password: newUser.password,
                   options: { data: { full_name: fullName } }
                 });

                 if (error) {
                   setCreateUserMsg({ text: `Error: ${error.message}`, ok: false });
                 } else if (data.user) {
                   const profileUpdates: any = { 
                      role: newUser.role,
                      grade: newUser.grade,
                      sport: `${newUser.rama} - ${newUser.disciplina}`,
                      ally: newUser.ally,
                      is_captain: newUser.captain,
                      student_code: newUser.student_code || null
                   };
                   await supabase.from("profiles").update(profileUpdates).eq("id", data.user.id);
                   
                   setCreateUserMsg({ text: `¡Usuario ${fullName} creado con éxito!`, ok: true });
                   setNewUser({ firstName: "", lastName: "", email: "", password: "", role: "estudiante", rama: "Deporte", disciplina: "", grade: "", ally: "", captain: "", student_code: "" });
                   fetchDashboardData();
                 }
                 setCreatingUser(false);
               }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "25px" }}>
                 <div>
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>NOMBRE</label>
                   <input className="input-focus-ring" value={newUser.firstName} onChange={e => setNewUser(p => ({...p, firstName: e.target.value}))} required placeholder="Juan" style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div>
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>APELLIDO</label>
                   <input className="input-focus-ring" value={newUser.lastName} onChange={e => setNewUser(p => ({...p, lastName: e.target.value}))} required placeholder="Pérez" style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div>
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>EMAIL DE ACCESO</label>
                   <input className="input-focus-ring" type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} required placeholder="correo@ejemplo.com" style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div>
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>CONTRASEÑA TEMPORAL</label>
                   <input className="input-focus-ring" type="text" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} required placeholder="Min. 6 car." style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div>
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>ROL</label>
                   <select className="input-focus-ring" value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value}))} style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem", appearance: "none" }}>
                     <option value="estudiante">Estudiante</option>
                     <option value="mentor">Mentor</option>
                     <option value="admin">Administrador</option>
                   </select>
                 </div>
                 <div style={{ display: "flex", gap: "10px" }}>
                   <div style={{ flex: 1 }}>
                     <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>RAMA</label>
                     <select className="input-focus-ring" value={newUser.rama} onChange={e => setNewUser(p => ({...p, rama: e.target.value}))} style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem", appearance: "none" }}>
                       <option value="Deporte">Deporte</option>
                       <option value="Arte">Arte</option>
                     </select>
                   </div>
                   <div style={{ flex: 1 }}>
                     <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>DISCIPLINA</label>
                     <input className="input-focus-ring" value={newUser.disciplina} onChange={e => setNewUser(p => ({...p, disciplina: e.target.value}))} placeholder="Ej: Fútbol" style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                   </div>
                 </div>
                 <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>ALIADO</label>
                    <input className="input-focus-ring" value={newUser.ally} onChange={e => setNewUser(p => ({...p, ally: e.target.value}))} placeholder="Ej: Academia X" style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>GRADO</label>
                    <input className="input-focus-ring" value={newUser.grade} onChange={e => setNewUser(p => ({...p, grade: e.target.value}))} placeholder="Ej: 11B" style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                 </div>
                 <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--glass-border)", paddingTop: "20px", marginTop: "10px" }}>
                   <p style={{ fontSize: "0.85rem", color: "var(--brand-secondary)", fontWeight: 700, marginBottom: "15px" }}>Identificadores Clave (Obligatorio)</p>
                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "25px" }}>
                     <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--brand-secondary)", letterSpacing: "1px" }}>CÓDIGO CLAN ⚡ (Clave maestra)</label>
                        <input className="input-focus-ring" value={newUser.student_code} onChange={e => setNewUser(p => ({...p, student_code: e.target.value.toUpperCase()}))} placeholder="CLAN-072" style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--brand-secondary)", background: "var(--bg-page)", color: "var(--brand-secondary)", fontSize: "0.95rem", fontWeight: 800, letterSpacing: 1 }} />
                     </div>
                     <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>CAPITÁN / LÍDER ACADÉMICO</label>
                        <input className="input-focus-ring" value={newUser.captain} onChange={e => setNewUser(p => ({...p, captain: e.target.value}))} placeholder="Nombre del capitán" style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                     </div>
                   </div>
                 </div>
                 <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                   <button type="submit" disabled={creatingUser} className="btn-primary" style={{ padding: "14px 30px", borderRadius: "14px", opacity: creatingUser ? 0.7 : 1 }}>
                     {creatingUser ? "Creando..." : "Registrar Alumno"}
                   </button>
                 </div>
               </form>
             </div>

             <div className="stat-card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--glass-border)", borderRadius: "20px" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                      <thead>
                        <tr style={{ background: "rgba(0, 82, 255, 0.02)", borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                          <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--brand-secondary)" }}>Código CLAN ⚡</th>
                          <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Identidad</th>
                          <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Ingreso Digital</th>
                          <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)", textAlign: "right" }}>Operaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                           <tr key={student.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                              <td style={{ padding: "20px 30px" }}>
                                {student.student_code ? (
                                  <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "1rem", color: "var(--brand-secondary)", background: "var(--brand-glow)", padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(212,175,55,0.3)", letterSpacing: 1 }}>{student.student_code}</span>
                                ) : (
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", opacity: 0.5 }}>Sin asignar</span>
                                )}
                              </td>
                              <td style={{ padding: "20px 30px" }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "var(--brand-glow)", color: "var(--brand-secondary)", border: "1px solid rgba(0, 82, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem" }}>
                                       {student.full_name ? student.full_name.substring(0,2).toUpperCase() : "ES"}
                                    </div>
                                    <div>
                                       <p style={{ fontWeight: 800, margin: "0 0 2px 0", color: "var(--text-main)", fontSize: "1.05rem" }}>{student.full_name || "Estudiante"}</p>
                                       <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, fontWeight: 600 }}>{student.ally ? `Aliado: ${student.ally}` : `ID: ${student.id.split("-")[0].toUpperCase()}`}</p>
                                    </div>
                                 </div>
                              </td>
                              <td style={{ padding: "20px 30px", color: "var(--text-main)", fontWeight: 600, fontSize: "0.95rem" }}>{new Date(student.created_at).toLocaleDateString()}</td>
                              <td style={{ padding: "20px 30px", textAlign: "right", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                 <button onClick={() => handleOpenProfile(student)} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", height: "auto" }}>
                                    <Eye size={14} style={{ marginRight: "4px" }} /> Perfil
                                 </button>
                                 <button onClick={() => openEnrollModal(student)} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", height: "auto" }}>
                                    <Key size={14} style={{ marginRight: "4px" }} /> Accesos
                                 </button>
                              </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
             </div>
           </div>
        )}

        {/* VIEW: NOVEDADES */}
        {activeView === "novedades" && (
           <AdminNovedadesView />
        )}

        {/* VIEW: CALVERT */}
        {activeView === "calvert" && (
           <AdminCalvertView />
        )}

                {/* VIEW: AGENDA */}
        {activeView === "agenda" && (
          <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
            {adminProfile ? <MentorshipView profile={adminProfile} /> : <div style={{padding: 40, textAlign: "center"}}>Cargando perfil...</div>}
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {activeView === "settings" && (
          <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" }}>
                <div>
                  <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "5px" }}>Configuración del <span style={{ color: "var(--brand-secondary)" }}>Sistema</span></h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Panel de control de módulos y cursos.</p>
                </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "30px" }}>
              <div className="stat-card" style={{ padding: "40px", borderRadius: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
                  <div style={{ width: "45px", height: "45px", borderRadius: "12px", background: "var(--brand-glow)", color: "var(--brand-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BookOpen size={22} />
                  </div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)" }}>Crear Nuevo Curso</h3>
                </div>
                
                <form onSubmit={handleCreateCourse}>
                  <div style={{ marginBottom: "25px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>NOMBRE DEL CURSO</label>
                    <input className="input-focus-ring" type="text" required placeholder="Ej: Finanzas Personales" value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })} style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                  </div>
                  <div style={{ marginBottom: "25px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>CATEGORÍA</label>
                    <select className="input-focus-ring" value={newCourse.category} onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })} style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontWeight: 600, fontSize: "0.95rem" }}>
                      <option value="Deporte">Deporte (Azul CLAN)</option>
                      <option value="Arte">Arte & Sonido (Violeta CLAN)</option>
                      <option value="Cultura">Diseño & Cultura (Gris CLAN)</option>
                      <option value="Diseño">Creatividad & Marca</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: "100%", padding: "14px", fontWeight: 800, justifyContent: "center" }}>Crear Curso</button>
                </form>
              </div>

              <div className="stat-card" style={{ opacity: 0.8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", borderStyle: "dashed" }}>
                  <Settings size={48} style={{ color: "var(--brand-secondary)", marginBottom: "20px", opacity: 0.5 }} />
                  <p style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "10px", color: "var(--text-main)" }}>Ajustes de Plataforma</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "250px" }}>Módulos de configuración global en fase de desarrollo.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Student Enrollment Modal */}
      {enrollModalOpen && selectedStudent && (
         <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div className="stat-card" style={{ width: "600px", maxWidth: "100%", padding: "40px", borderRadius: "24px", background: "var(--bg-card)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid var(--glass-border)" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Accesos: <span style={{ color: "var(--brand-secondary)" }}>{selectedStudent.full_name || "Estudiante"}</span></h3>
                  <button onClick={() => setEnrollModalOpen(false)} style={{ background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)", cursor: "pointer", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover-glow"><X size={18} /></button>
               </div>
               <p style={{ fontSize: "0.95rem", marginBottom: "30px", color: "var(--text-muted)", lineHeight: 1.6 }}>Define los derechos de acceso del alumno a las diferentes ramas del ecosistema educativo.</p>
               
               <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto", marginBottom: "30px", paddingRight: "5px" }}>
                  {courses.length === 0 ? (
                     <p style={{ opacity: 0.5, textAlign: "center", padding: "40px" }}>No hay programas disponibles para asignar.</p>
                  ) : courses.map(course => {
                     const isEnrolled = activeEnrollments.includes(course.id);
                     return (
                        <div key={course.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "var(--bg-page)", borderRadius: "16px", border: "1px solid var(--glass-border)" }}>
                           <div>
                              <p style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-main)", margin: "0 0 4px 0" }}>{course.title}</p>
                              <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "var(--brand-secondary)", background: "var(--brand-glow)", padding: "4px 8px", borderRadius: "6px" }}>{course.category}</span>
                           </div>
                           <label className="switch" style={{ pointerEvents: isEnrolling ? "none" : "auto", opacity: isEnrolling ? 0.5 : 1 }}>
                              <input type="checkbox" checked={isEnrolled} onChange={() => toggleEnrollment(course.id, isEnrolled)} />
                              <span className="slider" style={{ borderRadius: "34px" }}></span>
                           </label>
                        </div>
                     )
                  })}
               </div>
               <button onClick={() => setEnrollModalOpen(false)} className="btn-primary" style={{ width: "100%", padding: "16px", fontWeight: 800, justifyContent: "center" }}>Guardar y Sincronizar Cambios</button>
            </div>
         </div>
      )}

      {/* Profile Matrix Modal */}
      {profileModalOpen && selectedProfileStudent && (
         <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: "800px", borderRadius: "24px", border: "1px solid var(--glass-border)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", maxHeight: "90vh" }}>
               {/* Header Profile */}
               <div style={{ padding: "30px 40px", borderBottom: "1px solid var(--glass-border)", background: "linear-gradient(to right, rgba(0,82,255,0.05), transparent)", position: "relative" }}>
                  <button onClick={() => setProfileModalOpen(false)} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={24} /></button>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: "var(--brand-glow)", color: "var(--brand-secondary)", border: "1px solid rgba(0, 82, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.5rem" }}>
                           {selectedProfileStudent.full_name ? selectedProfileStudent.full_name.substring(0,2).toUpperCase() : "ES"}
                        </div>
                        <div>
                           <h2 style={{ margin: "0 0 5px", fontSize: "1.5rem", fontWeight: 900, color: "var(--text-main)" }}>{selectedProfileStudent.full_name}</h2>
                           <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>Perfil Matricial del Estudiante</p>
                        </div>
                     </div>
                     <button onClick={() => alert("Generando y enviando Feed IA a " + selectedProfileStudent.full_name + " vía WhatsApp...")} className="hover-glow" style={{ padding: "10px 20px", borderRadius: "12px", background: "var(--brand-secondary)", color: "white", fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 15px rgba(0, 82, 255, 0.2)" }}>
                        <Bot size={18} /> Enviar Feed IA
                     </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "15px" }}>
                       {selectedProfileStudent.grade && <span style={{ padding: "4px 10px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-main)", border: "1px solid rgba(255,255,255,0.1)" }}>Grado: {selectedProfileStudent.grade}</span>}
                       {selectedProfileStudent.sport && <span style={{ padding: "4px 10px", background: "var(--brand-glow)", color: "var(--brand-secondary)", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800, border: "1px solid rgba(0,82,255,0.2)" }}>{selectedProfileStudent.sport}</span>}
                       {selectedProfileStudent.ally && <span style={{ padding: "4px 10px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-main)", border: "1px solid rgba(255,255,255,0.1)" }}>Aliado: {selectedProfileStudent.ally}</span>}
                       {selectedProfileStudent.captain && <span style={{ padding: "4px 10px", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800, border: "1px solid rgba(245, 158, 11, 0.2)" }}>★ Capitán: {selectedProfileStudent.captain}</span>}
                  </div>
               </div>

               {/* Matrix Content */}
               <div style={{ padding: "30px 40px", overflowY: "auto" }}>
                  {!profileData ? (
                     <div style={{ padding: "50px", textAlign: "center", opacity: 0.5 }}>Cargando información cruzada...</div>
                  ) : profileData && profileData.rows && profileData.rows.length > 0 ? (
                     <>
                        <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
                           <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                              <p style={{ margin: "0 0 5px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.5, letterSpacing: 1 }}>PROMEDIO GLOBAL</p>
                              <p style={{ margin: 0, fontSize: "2.5rem", fontWeight: 900, color: "var(--brand-secondary)" }}>{profileData.totalAvg}</p>
                           </div>
                           <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                              <p style={{ margin: "0 0 5px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.5, letterSpacing: 1 }}>MATERIAS INSCRITAS</p>
                              <p style={{ margin: 0, fontSize: "2.5rem", fontWeight: 900, color: "var(--text-main)" }}>{profileData.rows.length}</p>
                           </div>
                        </div>

                        <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 16 }}>
                           <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", minWidth: 700 }}>
                              <thead>
                                 <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                                    <th style={{ padding: "15px 20px", textAlign: "left", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>CURSOS</th>
                                    {Array.from({ length: profileData.maxModules }).map((_, i) => (
                                       <th key={i} style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>W{i + 1}</th>
                                    ))}
                                    <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-main)", letterSpacing: 1 }}>DEF.</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {profileData.rows.map((row: any) => (
                                    <tr key={row.courseId} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                       <td style={{ padding: "15px 20px", textAlign: "left", fontWeight: 800, fontSize: "0.9rem", borderRight: "1px solid var(--glass-border)", color: "var(--text-main)" }}>{row.courseTitle}</td>
                                       {Array.from({ length: profileData.maxModules }).map((_, i) => {
                                          const val = row.weeks[i] !== undefined ? row.weeks[i] : "—";
                                          let color = "var(--text-muted)";
                                          if (typeof val === "number") {
                                             if (val === 0) color = "#ef4444";
                                             else if (val >= 80) color = "#10b981";
                                             else color = "#f59e0b";
                                          } else if (val === "Pend") {
                                             color = "var(--brand-primary)";
                                          }
                                          return (
                                             <td key={i} style={{ padding: "15px", fontWeight: 800, borderRight: "1px solid var(--glass-border)", color }}>{val}</td>
                                          );
                                       })}
                                       <td style={{ padding: "15px", fontWeight: 900, color: "var(--brand-secondary)", fontSize: "1rem" }}>{row.def}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </>
                   ) : (
                     <div style={{ padding: "50px", textAlign: "center", opacity: 0.5 }}>El estudiante no está inscrito en ningún curso o no hay módulos disponibles.</div>
                  )}

                  {/* External Grades Section */}
                  {profileData && profileData.externalGrades && profileData.externalGrades.length > 0 && (
                     <div style={{ marginTop: 40 }}>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--text-main)", marginBottom: 15 }}>Calificaciones Externas / Mentor</h3>
                        <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 16 }}>
                           <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", minWidth: 900 }}>
                              <thead>
                                 <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                                    <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, textAlign: "left" }}>MATERIA</th>
                                    <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1 }}>TERM</th>
                                    <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1 }}>W1-W12 (PROMEDIO)</th>
                                    <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-main)", letterSpacing: 1 }}>DEFINITIVA</th>
                                    <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1 }}>RECUP.</th>
                                    <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, textAlign: "left" }}>COMENTARIOS</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {profileData.externalGrades.map((grade: any) => {
                                    let colorDef = "var(--text-muted)";
                                    if (grade.definitiva !== null) {
                                       if (grade.definitiva < 60) colorDef = "#ef4444";
                                       else if (grade.definitiva >= 80) colorDef = "#10b981";
                                       else colorDef = "#f59e0b";
                                    }
                                    
                                    // Calculate W1-W12 valid counts
                                    const weeks = [grade.w1, grade.w2, grade.w3, grade.w4, grade.w5, grade.w6, grade.w7, grade.w8, grade.w9, grade.w10, grade.w11, grade.w12];
                                    const validWeeks = weeks.filter(w => w !== null && w !== undefined).length;
                                    
                                    return (
                                       <tr key={grade.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                          <td style={{ padding: "15px", textAlign: "left", fontWeight: 800, fontSize: "0.9rem", color: "var(--text-main)", borderRight: "1px solid var(--glass-border)" }}>{grade.subject_code}</td>
                                          <td style={{ padding: "15px", fontWeight: 800, color: "var(--text-muted)", borderRight: "1px solid var(--glass-border)" }}>{grade.term}</td>
                                          <td style={{ padding: "15px", fontWeight: 800, color: "var(--text-muted)", borderRight: "1px solid var(--glass-border)" }}>{validWeeks} semanas registradas</td>
                                          <td style={{ padding: "15px", fontWeight: 900, color: colorDef, fontSize: "1rem", borderRight: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>{grade.definitiva ?? "-"}</td>
                                          <td style={{ padding: "15px", fontWeight: 800, color: "var(--text-muted)", borderRight: "1px solid var(--glass-border)" }}>{grade.recovery ?? "-"}</td>
                                          <td style={{ padding: "15px", textAlign: "left", fontSize: "0.85rem", color: "var(--text-muted)" }}>{grade.comments || "-"}</td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {adminProfile && <FloatingAI profile={adminProfile} />}
      {/* Modal de AI Feed */}
      {showAiModal && (
         <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShowAiModal(false)}>
            <div className="stat-card" style={{ width: "800px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: "40px", borderRadius: "24px", background: "var(--bg-card)", border: "1px solid var(--glass-border)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
               <h3 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "15px", color: "var(--text-main)" }}>Enviar Feeds de Inteligencia Artificial</h3>
               <p style={{ color: "var(--text-muted)", marginBottom: "20px", lineHeight: 1.6 }}>Configura el corte y semana actual. Puedes desmarcar a los alumnos que no deben recibir el mensaje y agregar notas especiales para la IA.</p>
               
               <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "5px" }}>Semana (Ej: Semana 7)</label>
                   <input type="text" className="form-input" value={feedConfig.week} onChange={e => setFeedConfig({...feedConfig, week: e.target.value})} placeholder="Semana actual..." style={{ width: "100%" }} />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "5px" }}>Corte (Ej: Corte 2)</label>
                   <input type="text" className="form-input" value={feedConfig.term} onChange={e => setFeedConfig({...feedConfig, term: e.target.value})} placeholder="Corte actual..." style={{ width: "100%" }} />
                 </div>
               </div>

               <div style={{ display: "flex", gap: "15px", marginBottom: "30px", background: "rgba(255,255,255,0.02)", padding: "15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>Meta Calvert</label>
                   <input type="text" className="form-input" value={feedConfig.expectedCalvert} onChange={e => setFeedConfig({...feedConfig, expectedCalvert: e.target.value})} placeholder="Ej: 45%" style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }} />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>Meta Trikele</label>
                   <input type="text" className="form-input" value={feedConfig.expectedTrikele} onChange={e => setFeedConfig({...feedConfig, expectedTrikele: e.target.value})} placeholder="Ej: 20%" style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }} />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>Meta TyT</label>
                   <input type="text" className="form-input" value={feedConfig.expectedTyT} onChange={e => setFeedConfig({...feedConfig, expectedTyT: e.target.value})} placeholder="Ej: Módulo 2" style={{ width: "100%", padding: "8px", fontSize: "0.85rem" }} />
                 </div>
               </div>

               <div style={{ maxHeight: "350px", overflowY: "auto", marginBottom: "30px", border: "1px solid var(--glass-border)", borderRadius: "12px" }}>
                 <table style={{ width: "100%", borderCollapse: "collapse" }}>
                   <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1 }}>
                     <tr>
                       <th style={{ padding: "12px 15px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", borderBottom: "1px solid var(--glass-border)" }}>Enviar</th>
                       <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", borderBottom: "1px solid var(--glass-border)" }}>Estudiante</th>
                       <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", borderBottom: "1px solid var(--glass-border)" }}>Nota Especial para IA (Opcional)</th>
                     </tr>
                   </thead>
                   <tbody>
                     {students.map(s => (
                       <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                         <td style={{ padding: "10px 15px", textAlign: "center" }}>
                           <input type="checkbox" checked={!excludedStudents[s.id]} onChange={e => setExcludedStudents({...excludedStudents, [s.id]: !e.target.checked})} style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--brand-secondary)" }} />
                         </td>
                         <td style={{ padding: "10px 15px", fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 600 }}>{s.full_name}</td>
                         <td style={{ padding: "10px 15px" }}>
                           <input type="text" className="form-input" placeholder="Ej: Está enfermo, no ser severo" value={specialNotes[s.id] || ""} onChange={e => setSpecialNotes({...specialNotes, [s.id]: e.target.value})} disabled={excludedStudents[s.id]} style={{ width: "100%", padding: "6px 12px", fontSize: "0.85rem", opacity: excludedStudents[s.id] ? 0.3 : 1 }} />
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               <button onClick={generateAndQueueFeeds} disabled={broadcasting} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "16px", fontSize: "1rem" }}>
                  {broadcasting ? "Generando y Enviando..." : "Confirmar Envío Masivo"}
               </button>
            </div>
         </div>
      )}
    </div>
  );
}
