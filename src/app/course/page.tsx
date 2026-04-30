"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  ArrowLeft, LayoutDashboard, ClipboardList, Folder, Trash2, 
  Paperclip, Plus, Bold, Italic, Underline, Eraser, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, 
  Link as LinkIcon, Image as ImageIcon, Minus, Code, Edit3,
  Mic, Square, Play, Pause, Volume2, Headphones, Palette, Type, Save,
  Users, UserPlus, UserMinus, Search, ShieldAlert, Inbox,
  Trophy, Gamepad2, Layers, Menu, CheckCircle2, Circle,
  Maximize2, Minimize2, Send, Upload, User, Video, X, Sparkles, Bot, MessageSquare, FileText, Loader2, CheckSquare
} from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";
import { createClient } from "@/utils/supabase/client";
import { playUISound } from "@/utils/audio";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import "../legacy-styles.css";

type BlockType = "video" | "audio" | "upload" | "delivery" | "label" | "quiz" | "flashcards" | "dragdrop" | "checklist";

import { AudioBlockPlayer } from "@/components/course/AudioBlockPlayer";
import { CLANEditor } from "@/components/course/CLANEditor";
import { QuizBlockEditor } from "@/components/course/QuizBlockEditor";
import { FlashCardPlayer } from "@/components/course/FlashCardPlayer";
import { DragDropEditor } from "@/components/course/DragDropEditor";
import { ChecklistBlockEditor } from "@/components/course/ChecklistBlockEditor";

function CoursePlayerContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("id");
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const [courseTitle, setCourseTitle] = useState("");
  const [courseCover, setCourseCover] = useState<string | null>(null);
  const [courseDescription, setCourseDescription] = useState<string>("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  const [activeScreen, setActiveScreen] = useState("overview");
  const [modules, setModules] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Members Management State
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [insertModal, setInsertModal] = useState<{ type: BlockType, message: string } | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInteractive, setShowInteractive] = useState(false);

  // Submissions & Grading State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isEditingWelcome, setIsEditingWelcome] = useState(false);
  const [tempWelcomeMessage, setTempWelcomeMessage] = useState("");

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Gemini Tutor AI State
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [tutorMessages, setTutorMessages] = useState<any[]>([
    { role: "assistant", content: "Hola, soy tu Tutor de CLAN. Veo que estás avanzando en tu entrega. ¿Tienes alguna duda sobre tu texto o quieres que lo analicemos juntos?" }
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const [isTutorThinking, setIsTutorThinking] = useState(false);
  const [currentDeliveryText, setCurrentDeliveryText] = useState("");

  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        const { data: profile, error: profErr } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        console.log("Profile fetched:", profile, profErr); // Debug
        setUserProfile(profile);
        
        if (profile?.role === "admin" || profile?.role === "experto" || profile?.role === "profesor") {
          setIsAdmin(true);
          setIsEnrolled(true);
          const { data: profs } = await supabase.from("profiles").select("*").order("full_name");
          if (profs) setAllProfiles(profs);
        } else {
          const { data: enroll } = await supabase.from("enrollments").select("*").match({ user_id: user.id, course_id: courseId }).single();
          if (enroll) {
            setIsEnrolled(true);
            setEnrollment(enroll);
          }
        }

        // Fetch current enrollments for this course (with profiles)
        const { data: enrolls } = await supabase
          .from("enrollments")
          .select("user_id, profiles(*)")
          .eq("course_id", courseId);
        if (enrolls) setCourseEnrollments(enrolls);
      }

      const { data: course } = await supabase.from("courses").select("title, cover_url, description").eq("id", courseId).single();
      if (course) {
        setCourseTitle(course.title);
        setCourseCover(course.cover_url || null);
        setCourseDescription(course.description || "Bienvenido a tu programa de transformación. Tu ruta hacia la maestría comienza aquí.");
      }

      const { data: mods } = await supabase.from("modules").select("*").eq("course_id", courseId).order("order_index", { ascending: true });
      if (mods) setModules(mods);

      const { data: blks } = await supabase.from("blocks").select("*").eq("course_id", courseId).order("order_index", { ascending: true });
      if (blks) {
        setBlocks(blks);
        const bIds = blks.map(b => b.id);
        if (bIds.length > 0) {
           const { data: subs } = await supabase.from("submissions").select("*, profiles!student_id(full_name)").in("block_id", bIds);
           if (subs) setSubmissions(subs);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [courseId]);

  const handleAddModule = async () => {
    console.log("Intentando añadir módulo:", newModuleTitle, "para curso:", courseId);
    if (newModuleTitle.trim() === "") return;
    try {
      const { data: newMod, error } = await supabase.from("modules").insert({ 
        title: newModuleTitle, 
        course_id: courseId,
        order_index: modules.length
      }).select();
      
      console.log("Respuesta Supabase:", { data: newMod, error });

      if (!error && newMod && newMod.length > 0) {
        setModules(prev => [...prev, newMod[0]]);
        setIsAddingModule(false);
        setNewModuleTitle("");
        playUISound("success");
      } else {
        const errMsg = error?.message || "No se recibió respuesta del servidor.";
        console.error("Error al añadir módulo:", errMsg);
        alert("Error al añadir módulo: " + errMsg);
      }
    } catch (err: any) {
      console.error("Error fatal en handleAddModule:", err);
      alert("Error fatal: " + err.message);
    }
  };

  const toggleEnrollment = async (userId: string, isCurrentlyEnrolled: boolean) => {
    if (isCurrentlyEnrolled) {
      const { error } = await supabase.from("enrollments").delete().match({ user_id: userId, course_id: courseId });
      if (!error) setCourseEnrollments(prev => prev.filter(e => e.user_id !== userId));
    } else {
      const { error } = await supabase.from("enrollments").insert({ user_id: userId, course_id: courseId });
      if (!error) {
        const profile = allProfiles.find(p => p.id === userId);
        setCourseEnrollments(prev => [...prev, { user_id: userId, profiles: profile }]);
      }
    }
  };

  const toggleModuleCompletion = async (modId: string) => {
    if (!enrollment || isAdmin || isEditMode) return;
    
    const currentCompleted = enrollment.completed_modules || [];
    const isAlreadyCompleted = currentCompleted.includes(modId);
    
    // Si ya está completado, no necesitamos hacer nada más en este flujo automático
    if (isAlreadyCompleted) return;

    const newCompleted = [...currentCompleted, modId];
    
    const { data: newEnroll, error } = await supabase
      .from("enrollments")
      .update({ completed_modules: newCompleted })
      .eq("id", enrollment.id)
      .select()
      .single();
      
    if (!error) {
      setEnrollment(newEnroll);
      playUISound("success");
    }
  };

  const isModuleLocked = (modId: string) => {
    if (isAdmin || isEditMode) return false;
    if (modId === "overview" || modId === "grades" || modId === "members") return false;
    
    const targetMod = modules.find(m => m.id === modId);
    if (!targetMod) return false;

    // Obtener todos los módulos con order_index menor al actual
    const previousModules = modules.filter(m => m.order_index < targetMod.order_index);
    const completedIds = enrollment?.completed_modules || [];

    // Si hay algún módulo previo que no está completado, está bloqueado
    return previousModules.some(m => !completedIds.includes(m.id));
  };

  // Ayudante: Obtener bloques obligatorios del módulo actual
  const getRequiredBlocksForModule = (modId: string) => {
    return blocks.filter(b => b.screen === modId && ["quiz", "delivery", "dragdrop", "checklist"].includes(b.type));
  };

  // Lógica de Autocompletado Inteligente
  useEffect(() => {
    if (activeScreen !== "overview" && activeScreen !== "grades" && activeScreen !== "members" && !isAdmin && !isEditMode) {
      const isCompleted = enrollment?.completed_modules?.includes(activeScreen);
      if (isCompleted) return;

      const requiredBlocks = getRequiredBlocksForModule(activeScreen);
      
      if (requiredBlocks.length === 0) {
        // MÓDULO INFORMATIVO: Autocompletado por tiempo (5 segundos)
        const timer = setTimeout(() => {
          toggleModuleCompletion(activeScreen);
        }, 5000);
        return () => clearTimeout(timer);
      } else {
        // MÓDULO DE ACCIÓN: Verificar si ya entregó todas las tareas
        const studentSubmissions = submissions.filter(s => s.student_id === currentUser?.id);
        const allCompleted = requiredBlocks.every(rb => 
          studentSubmissions.some(s => s.block_id === rb.id)
        );

        if (allCompleted) {
          toggleModuleCompletion(activeScreen);
        }
      }
    }
  }, [activeScreen, enrollment, isAdmin, isEditMode, blocks, submissions, currentUser]);

  const handleInsertClick = (type: BlockType) => {
    if (type === "video") setInsertModal({ type, message: "Inserta un Video (Sube MP4 o pega YouTube)" });
    else if (type === "audio") setInsertModal({ type, message: "Añade un Audio (Sube o graba)" });
    else if (type === "upload") setInsertModal({ type, message: "Añade un Recurso (Sube archivo)" });
    else if (type === "delivery") executeInsert("delivery", { html: "" });
    else if (type === "label") executeInsert("label", { html: "<p>Escribe aquí tu contenido...</p>" });
    else if (type === "quiz") { executeInsert("quiz", { questions: [] }); setShowInteractive(false); }
    else if (type === "flashcards") { executeInsert("flashcards", { cards: [] }); setShowInteractive(false); }
    else if (type === "dragdrop") { executeInsert("dragdrop", { pairs: [] }); setShowInteractive(false); }
    else if (type === "checklist") { executeInsert("checklist", { items: [] }); setShowInteractive(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Error al acceder al micrófono: " + err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const executeInsert = async (type: BlockType, content: any) => {
    const { data, error } = await supabase.from("blocks").insert({
      course_id: courseId,
      screen: activeScreen,
      type: type,
      content: content,
      order_index: blocks.length
    }).select().single();

    if (error) alert("Error insertando bloque (" + type + ")");
    else if (data) setBlocks(prev => [...prev, data]);
  };

  const confirmModal = async () => {
    if (!insertModal) return;
    setIsUploading(true);
    setUploadStatus("Iniciando proceso...");

    try {
      if (recordedBlob) {
        setUploadStatus("Subiendo audio...");
        const path = `audios/rec_${Date.now()}.webm`;
        const { error: upError } = await supabase.storage.from("course-content").upload(path, recordedBlob);
        if (!upError) {
          const { data: { publicUrl } } = supabase.storage.from("course-content").getPublicUrl(path);
          await executeInsert("audio", { url: publicUrl, title: modalInput || "Audio Grabado" });
        }
      } else if (modalFile) {
        if (insertModal.type === "video") {
          setUploadStatus("Obteniendo ticket de subida...");
          const upRes = await fetch("/api/video/upload", { method: "POST" });
          const { url, id } = await upRes.json();
          
          setUploadStatus("Subiendo video maestro a la nube...");
          await fetch(url, { method: "PUT", body: modalFile });
          
          let playbackId = "";
          let attempts = 0;
          while(!playbackId && attempts < 50) {
             setUploadStatus("Optimizando para streaming...");
             await new Promise(r => setTimeout(r, 2000));
             const stRes = await fetch(`/api/video/status?uploadId=${id}`);
             const stData = await stRes.json();
             if (stData.playback_id) playbackId = stData.playback_id;
             else if (stData.status === "errored") throw new Error("Error en Mux");
             attempts++;
          }
          await executeInsert("video", { mux_playback_id: playbackId, title: modalInput });
        } else {
          setUploadStatus("Subiendo archivo...");
          const ext = modalFile.name.split('.').pop();
          const path = `${insertModal.type}s/${Math.random().toString(36).substring(2)}_${Date.now()}.${ext}`;
          const { error: upError } = await supabase.storage.from("course-content").upload(path, modalFile);
          if (!upError) {
            const { data: { publicUrl } } = supabase.storage.from("course-content").getPublicUrl(path);
            await executeInsert(insertModal.type, { url: publicUrl, filename: modalFile.name, title: modalInput });
          }
        }
      } else if (modalInput) {
        await executeInsert(insertModal.type, { url: modalInput, title: modalInput });
      }
    } catch (err) {
      alert("Error en la subida: " + err);
    }

    setIsUploading(false);
    setUploadStatus("");
    setInsertModal(null);
    setModalInput("");
    setModalFile(null);
    setRecordedBlob(null);
  };

  const handleCoverUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus("Actualizando Portada...");
    try {
      const path = `covers/${courseId}_${Date.now()}_${file.name}`;
      const { error: upError } = await supabase.storage.from("course-content").upload(path, file);
      if (upError) throw upError;
      
      const { data: { publicUrl } } = supabase.storage.from("course-content").getPublicUrl(path);
      const { error: upDbError } = await supabase.from("courses").update({ cover_url: publicUrl }).eq("id", courseId);
      if (upDbError) throw upDbError;
      
      setCourseCover(publicUrl);
      playUISound("success");
    } catch (err: any) {
      alert("Error en portada: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  const handleUpdateWelcomeMessage = async () => {
    setIsUploading(true);
    try {
      const { error } = await supabase
        .from("modules")
        .update({ welcome_message: tempWelcomeMessage })
        .eq("id", activeScreen);
      if (error) throw error;
      
      setModules(prev => prev.map(m => m.id === activeScreen ? { ...m, welcome_message: tempWelcomeMessage } : m));
      setIsEditingWelcome(false);
      playUISound("success");
    } catch (err: any) {
      alert("Error al actualizar saludo: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartLesson = async () => {
    // 1. Marcar el módulo actual como completado (si no lo está)
    if (!enrollment?.completed_modules?.includes(activeScreen)) {
      await toggleModuleCompletion(activeScreen);
    }

    // 2. Buscar el siguiente módulo por order_index
    const sortedModules = [...modules].sort((a,b) => a.order_index - b.order_index);
    const currentIndex = sortedModules.findIndex(m => m.id === activeScreen);
    
    if (currentIndex !== -1 && currentIndex < sortedModules.length - 1) {
      const nextMod = sortedModules[currentIndex + 1];
      setActiveScreen(nextMod.id);
      playUISound("click");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setActiveScreen("grades");
    }
  };

  const handleUpdateDescription = async () => {
    setIsUploading(true);
    try {
      const { error } = await supabase.from("courses").update({ description: tempDescription }).eq("id", courseId);
      if (error) throw error;
      setCourseDescription(tempDescription);
      setIsEditingDescription(false);
      playUISound("success");
    } catch (err: any) {
      alert("Error al actualizar descripción: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTutorSend = async () => {
    if (!tutorInput.trim() || isTutorThinking) return;

    const userMsg = { role: "user", content: tutorInput };
    setTutorMessages(prev => [...prev, userMsg]);
    setTutorInput("");
    setIsTutorThinking(true);

    try {
      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...tutorMessages, userMsg],
          contextText: currentDeliveryText
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTutorMessages(prev => [...prev, data]);
      playUISound("click");
    } catch (err: any) {
      setTutorMessages(prev => [...prev, { role: "assistant", content: "Lo siento, tuve un problema de conexión con Gemini. ¿Podemos intentarlo de nuevo? Error: " + err.message }]);
    } finally {
      setIsTutorThinking(false);
    }
  };

  const handleRemoveCover = async () => {
    if (confirm("¿Seguro que deseas eliminar la portada del programa?")) {
      setIsUploading(true);
      try {
        const { error } = await supabase.from("courses").update({ cover_url: null }).eq("id", courseId);
        if (error) throw error;
        setCourseCover(null);
        playUISound("click");
      } catch (err: any) {
        alert("Error al borrar portada: " + err.message);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeBlock = async (id: string) => {
    if (confirm("¿Borrar permanentemente?")) {
      const { error } = await supabase.from("blocks").delete().eq("id", id);
      if (!error) setBlocks(prev => prev.filter(b => b.id !== id));
    }
  };

  const updateAudioTitle = async (id: string, newTitle: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const newContent = { ...block.content, title: newTitle };
    const { error } = await supabase.from("blocks").update({ content: newContent }).eq("id", id);
    if (!error) setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent } : b));
  };

  if (loading) return <LoadingScreen />;
  if (!isEnrolled && !isAdmin) {
    return (
      <div className="denied-screen" style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-darker)", color: "white", textAlign: "center", padding: 40 }}>
        <div style={{ width: 100, height: 100, background: "rgba(239, 68, 68, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 30 }}>
          <ShieldAlert size={50} color="#ef4444" />
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", marginBottom: 15 }}>Acceso No Autorizado</h1>
        <p style={{ opacity: 0.6, maxWidth: 500, lineHeight: "1.6" }}>Esta sección de la plataforma está reservada para alumnos matriculados. Contacta con tu tutor para habilitar esta competencia en tu ruta.</p>
        <Link href="/dashboard" className="btn-primary" style={{ marginTop: 30 }}>Volver al Panel</Link>
      </div>
    );
  }

  return (
    <>
      <div className="edit-toggle-wrapper" style={{ display: isAdmin ? "flex" : "none" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: isEditMode ? "var(--brand-primary)" : "white" }}>{isEditMode ? "EDITOR ACTIVO" : "VISTA PÚBLICA"}</span>
        <label className="switch">
          <input type="checkbox" checked={isEditMode} onChange={(e) => setIsEditMode(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>

      <div className={`player-container ${isZenMode ? "zen-active" : ""}`}>
        {/* Mobile Action Controls */}
        {!isZenMode && (
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
             <Menu size={24} />
          </button>
        )}
        <div className={`mobile-overlay ${isMobileMenuOpen ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}></div>

        <aside className={`player-sidebar ${isMobileMenuOpen ? "mobile-open" : ""} ${isZenMode ? "zen-hidden" : ""}`}>
          <div style={{ marginBottom:30, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link href={isAdmin ? "/admin" : "/dashboard"} className="back-btn"><ArrowLeft size={20} color="var(--text-main)" /></Link>
              <h3 style={{ fontFamily: "'Playfair Display', serif", margin: 0, fontSize: "1.2rem", color: "var(--text-main)" }}>Aula CLAN</h3>
            </div>
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "10px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-main)", cursor: "pointer" }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          {!isAdmin && modules.length > 0 && (
            <div style={{ marginBottom: 30, padding: "0 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--brand-primary)", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
                <span>PROGRESO DEL CURSO</span>
                <span>{(() => {
                  const completedCount = (enrollment?.completed_modules || []).length;
                  const total = modules.length;
                  return Math.round((completedCount / total) * 100);
                })()}%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ 
                  height: "100%", 
                  background: "var(--brand-primary)", 
                  width: `${Math.round(((enrollment?.completed_modules || []).length / modules.length) * 100)}%`,
                  transition: "width 0.5s ease"
                }}></div>
              </div>
            </div>
          )}
          
          <nav className="syllabus-nav">
            <div className={`syllabus-item ${activeScreen === "overview" ? "active" : ""}`} onClick={() => { setActiveScreen("overview"); setIsMobileMenuOpen(false); }}><LayoutDashboard size={18} /> <span>Mapa del Curso</span></div>
            {modules.map(mod => {
              const isCompleted = enrollment?.completed_modules?.includes(mod.id);
              const isLocked = isModuleLocked(mod.id);
              return (
                <div key={mod.id} className={`syllabus-item ${activeScreen === mod.id ? "active" : ""} ${isLocked ? "is-locked" : ""}`} onClick={() => {
                    setActiveScreen(mod.id);
                    setIsMobileMenuOpen(false);
                    if (isLocked) playUISound("click");
                  }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {isCompleted ? (
                        <CheckCircle2 size={18} color="var(--brand-primary)" />
                      ) : isLocked ? (
                        <ShieldAlert size={18} style={{ opacity: 0.5 }} />
                      ) : (
                        <Folder size={18} />
                      )}
                      <span style={{ opacity: isCompleted ? 0.6 : isLocked ? 0.4 : 1 }}>
                        {mod.title}
                        {isLocked && <span style={{ fontSize: "0.6rem", display: "block", color: "var(--brand-primary)", opacity: 0.8, fontWeight: 700 }}>VISTA PREVIA</span>}
                      </span>
                   </div>
                   {isEditMode && (
                      <button 
                         onClick={async (e) => { e.stopPropagation(); if(confirm('¿Seguro de borrar este módulo y todo su contenido?')) { await supabase.from('modules').delete().eq('id', mod.id); window.location.reload(); } }}
                         style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.6, padding: 0, display: "flex", alignItems: "center" }}
                         title="Borrar Módulo"
                      >
                         <Trash2 size={16} />
                      </button>
                   )}
                </div>
              );
            })}
            <div className={`syllabus-item ${activeScreen === "grades" ? "active" : ""}`} onClick={() => { setActiveScreen("grades"); setIsMobileMenuOpen(false); }}>
              <Trophy size={18} /> <span>Calificaciones {isAdmin && submissions.filter(s => s.status === 'pending').length > 0 && `(${submissions.filter(s => s.status === 'pending').length})`}</span>
            </div>
            {isAdmin && (
              <>
                <div className={`syllabus-item ${activeScreen === "members" ? "active" : ""}`} onClick={() => { setActiveScreen("members"); setIsMobileMenuOpen(false); }} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 10, paddingTop: 15 }}>
                  <Users size={18} /> <span>Miembros del Curso</span>
                </div>
              </>
            )}
            {isEditMode && (
              <div style={{ marginTop: 10 }}>
                {isAddingModule ? (
                  <div style={{ padding: "10px", background: "var(--glass-bg)", borderRadius: "12px", border: "1px solid var(--brand-primary)" }}>
                    <input 
                      autoFocus
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      placeholder="Título del módulo..."
                      style={{ width: "100%", background: "transparent", border: "none", color: "var(--text-main)", outline: "none", fontSize: "0.85rem", marginBottom: 8 }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddModule();
                        if (e.key === 'Escape') setIsAddingModule(false);
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleAddModule} style={{ background: "var(--brand-primary)", color: "black", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}>AÑADIR</button>
                      <button onClick={() => setIsAddingModule(false)} style={{ background: "transparent", color: "var(--text-muted)", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}>CANCELAR</button>
                    </div>
                  </div>
                ) : (
                  <button className="syllabus-item add-mod" onClick={() => setIsAddingModule(true)}>+ Nuevo Módulo</button>
                )}
              </div>
            )}
          </nav>

          <footer style={{ marginTop: "auto", padding: "20px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
             <Link href={isAdmin ? "/admin" : "/dashboard"} style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-main)", opacity: 0.5, textDecoration: "none", fontSize: "0.9rem" }}>
                <LayoutDashboard size={18} /> <span>Salir del curso</span>
             </Link>
          </footer>
        </aside>

        <main className={`content-viewer player-main ${isZenMode ? "zen-full" : ""}`}>
          <div className="player-content-wrapper" style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: activeScreen === "overview" ? "center" : "flex-start" }}>
            
            {/* Zen Mode Toggle Button */}
            <button 
              onClick={() => { setIsZenMode(!isZenMode); playUISound("click"); }}
              style={{
                position: "fixed",
                top: 40,
                right: 40,
                zIndex: 1000,
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: "50%",
                width: "45px",
                height: "45px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--brand-primary)",
                backdropFilter: "blur(10px)",
                transition: "0.2s"
              }}
              title={isZenMode ? "Salir de Modo Enfoque" : "Modo Enfoque (Zen)"}
            >
              {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

            {activeScreen === "overview" ? (
              <div style={{ position: "relative", marginBottom: "40px" }}>
                {/* Portada Estilo Red Social */}
                <div style={{ 
                  width: "100%", 
                  height: "350px", 
                  borderRadius: "32px", 
                  background: courseCover ? `url(${courseCover}) center/cover no-repeat` : "linear-gradient(to right, #1e1e2e, #2d2d44)",
                  border: "1px solid var(--glass-border)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
                }}>
                  {/* Overlay Gradiente para legibilidad */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)", zIndex: 1 }}></div>
                  
                  {/* Controles de Mentor (Esquina Superior Derecha) */}
                  {isEditMode && (
                    <div style={{ position: "absolute", top: "25px", right: "25px", zIndex: 20, display: "flex", gap: "10px" }}>
                       {courseCover && (
                          <button 
                            onClick={handleRemoveCover}
                            style={{ background: "rgba(239, 68, 68, 0.2)", backdropFilter: "blur(10px)", border: "1px solid rgba(239, 68, 68, 4)", borderRadius: "12px", width: "40px", height: "40px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Eliminar Portada"
                          >
                             <Trash2 size={18} />
                          </button>
                       )}
                    </div>
                  )}

                  {/* Cajita de Subida para Mentores */}
                  {isEditMode && (
                    <div style={{ position: "relative", zIndex: 10 }}>
                      <label style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "center", 
                        gap: "10px", 
                        cursor: "pointer", 
                        padding: "20px 30px", 
                        background: "rgba(0,0,0,0.4)", 
                        backdropFilter: "blur(10px)",
                        border: "2px dashed rgba(255,255,255,0.3)",
                        borderRadius: "20px",
                        color: "white",
                        transition: "0.2s"
                      }} className="hover-scale">
                        {isUploading ? (
                          <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>PROCESANDO...</span>
                        ) : (
                          <>
                            <Upload size={24} color="var(--brand-primary)" />
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "1px" }}>{courseCover ? "CAMBIAR PORTADA" : "AÑADIR PORTADA"}</span>
                          </>
                        )}
                        <input type="file" accept="image/*" hidden onChange={(e) => {
                          if (e.target.files?.[0]) handleCoverUpload(e.target.files[0]);
                        }} />
                      </label>
                    </div>
                  )}

                  {/* Contenido de Bienvenida */}
                  <div style={{ position: "absolute", bottom: "40px", left: "60px", right: "60px", zIndex: 5, textAlign: "left" }}>
                     <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "3.5rem", color: "white", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{courseTitle}</h1>
                     
                     {isEditingDescription ? (
                        <div style={{ marginTop: "15px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
                           <textarea 
                             value={tempDescription}
                             onChange={(e) => setTempDescription(e.target.value)}
                             autoFocus
                             placeholder="Escribe el mensaje de bienvenida del programa..."
                             style={{ width: "100%", maxWidth: "600px", padding: "15px", borderRadius: "12px", background: "rgba(0,0,0,0.6)", border: "1px solid var(--brand-primary)", color: "white", fontSize: "1rem", outline: "none", resize: "none" }}
                             rows={3}
                           />
                           <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              <button onClick={handleUpdateDescription} style={{ background: "var(--brand-primary)", border: "none", borderRadius: "8px", padding: "8px 15px", fontWeight: 700, color: "black", cursor: "pointer" }}><Save size={16} /></button>
                              <button onClick={() => setIsEditingDescription(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px", padding: "8px 15px", fontWeight: 700, color: "white", cursor: "pointer" }}><X size={16} /></button>
                           </div>
                        </div>
                     ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginTop: "10px" }}>
                           <p style={{ opacity: 0.8, fontSize: "1.1rem", maxWidth: 650, margin: 0, color: "white" }}>{courseDescription}</p>
                           {isEditMode && <button onClick={() => { setTempDescription(courseDescription); setIsEditingDescription(true); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}><Edit3 size={14} /></button>}
                        </div>
                     )}
                  </div>
                </div>

                {/* Medidor de Progreso Flotante / Minimalista */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "25px", marginTop: "30px" }}>
                    <div className="course-stat-card">
                      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                         <div className="vibrant-icon-bg" style={{ width: "64px", height: "64px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-primary)" }}>
                            <Trophy size={32} />
                         </div>
                         <div>
                            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", letterSpacing: "1.5px", fontWeight: 900 }}>PROGRESO ACTUAL</span>
                            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)" }}>{Math.round(((enrollment?.completed_modules || []).length / (modules.length || 1)) * 100)}%</span>
                         </div>
                      </div>
                      <div style={{ width: "250px" }}>
                        <div style={{ height: "12px", background: "var(--glass-border)", borderRadius: "20px", overflow: "hidden", position: "relative" }}>
                          <div style={{ 
                             height: "100%", 
                             width: `${Math.round(((enrollment?.completed_modules || []).length / (modules.length || 1)) * 100)}%`,
                             background: "linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))",
                             boxShadow: "0 0 20px rgba(0, 82, 255, 0.3)",
                             borderRadius: "20px",
                             transition: "width 1s ease"
                          }}></div>
                        </div>
                        <p style={{ textAlign: "right", fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "12px", fontWeight: 600 }}>
                          <strong style={{ color: "var(--brand-primary)" }}>{(enrollment?.completed_modules || []).length}</strong> de {modules.length} Módulos
                        </p>
                      </div>
                   </div>
                   <div className="course-accent-card">
                      <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "rgba(255,255,255,0.8)", letterSpacing: "1.5px" }}>SIGUIENTE PASO</span>
                      <p style={{ margin: "10px 0 0 0", fontSize: "1.1rem", fontWeight: 800, color: "white" }}>Continúa tu ruta</p>
                   </div>
                </div>
              </div>
            ) : activeScreen === "members" ? (
              <div className="members-view">
                <header style={{ marginBottom: 40, borderBottom: "1px solid var(--glass-border)", paddingBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "var(--brand-primary)", margin: 0 }}>Gestión de Miembros</h2>
                  <p style={{ opacity: 0.5, marginTop: 5 }}>Controla quién tiene acceso a este programa de estudio.</p>
                </header>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 40 }}>
                  {/* Lista Actual */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 30, borderRadius: 24, border: "1px solid var(--glass-border)" }}>
                    <h3 style={{ fontSize: "1.2rem", marginBottom: 20 }}>Alumnos Matriculados ({courseEnrollments.length})</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {courseEnrollments.length === 0 ? (
                        <p style={{ opacity: 0.3, textAlign: "center", padding: 40 }}>No hay alumnos asignados aún.</p>
                      ) : courseEnrollments.map(e => (
                        <div key={e.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 15, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-primary)", color: "black", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>{e.profiles?.full_name?.substring(0,2).toUpperCase()}</div>
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>{e.profiles?.full_name}</p>
                                <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.4 }}>ID: {e.user_id.split("-")[0]}</p>
                              </div>
                           </div>
                           <button onClick={() => toggleEnrollment(e.user_id, true)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.6 }} title="Quitar acceso"><UserMinus size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buscador para añadir */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 30, borderRadius: 24, border: "1px solid var(--glass-border)" }}>
                    <h3 style={{ fontSize: "1.2rem", marginBottom: 20 }}>Matricular Alumnos</h3>
                    <div style={{ position: "relative", marginBottom: 20 }}>
                      <Search size={18} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} />
                      <input 
                        type="text" 
                        placeholder="Buscar por nombre..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: "100%", padding: "12px 15px 12px 45px", borderRadius: 12, border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "white", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto", paddingRight: 5 }}>
                      {allProfiles.filter(p => !courseEnrollments.find(e => e.user_id === p.id) && p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                          <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>{p.full_name}</span>
                          <button onClick={() => toggleEnrollment(p.id, false)} className="btn-secondary" style={{ padding: "5px 12px", fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                            <UserPlus size={14} /> Matricular
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeScreen === "grades" ? (
              <div className="grades-summary-view" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px" }}>
                 {isAdmin ? (
                   <>
                    {/* PANEL MENTOR: DASHBOARD DE MÉTRICAS */}
                    <header style={{ marginBottom: 40, borderBottom: "1px solid var(--glass-border)", paddingBottom: 25 }}>
                       <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: "var(--brand-primary)", margin: 0 }}>Gestión Académica</h2>
                       <p style={{ opacity: 0.5, marginTop: 5 }}>Visión global del rendimiento y retroalimentación de este programa.</p>
                       
                       <div style={{ display: "flex", gap: 20, marginTop: 25 }}>
                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px 25px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)", flex: 1, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                             <label style={{ fontSize: "0.65rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, display: "block", marginBottom: 5 }}>TOTAL ENTREGAS</label>
                             <span style={{ fontSize: "2rem", fontWeight: 800 }}>{submissions.length}</span>
                          </div>
                          <div style={{ background: "var(--brand-glow)", padding: "20px 25px", borderRadius: 24, border: "1px solid var(--brand-glow)", flex: 1, boxShadow: "0 10px 30px var(--brand-glow)" }}>
                             <label style={{ fontSize: "0.65rem", fontWeight: 900, color: "var(--brand-primary)", letterSpacing: 1.5, display: "block", marginBottom: 5 }}>POR REVISAR</label>
                             <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--brand-primary)" }}>{submissions.filter(s => s.status === 'pending').length}</span>
                          </div>
                          <div style={{ background: "rgba(16, 185, 129, 0.05)", padding: "20px 25px", borderRadius: 24, border: "1px solid rgba(16, 185, 129, 0.1)", flex: 1, boxShadow: "0 10px 30px rgba(16, 185, 129, 0.05)" }}>
                             <label style={{ fontSize: "0.65rem", fontWeight: 900, color: "#10b981", letterSpacing: 1.5, display: "block", marginBottom: 5 }}>PROMEDIO CURSO</label>
                             <span style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981" }}>
                                {submissions.filter(s => s.status === 'graded').length > 0 
                                   ? (submissions.reduce((acc, s) => acc + (s.score || 0), 0) / submissions.filter(s => s.status === 'graded').length).toFixed(1)
                                   : "—"}
                             </span>
                          </div>
                       </div>
                    </header>

                    {/* LISTA DE ENTREGAS (BUZÓN) */}
                    {submissions.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "100px 40px", background: "rgba(255,255,255,0.02)", borderRadius: 40, border: "1px dashed rgba(255,255,255,0.1)" }}>
                           <Inbox size={48} style={{ opacity: 0.2, marginBottom: 20 }} />
                           <p style={{ opacity: 0.5, fontSize: "1.1rem" }}>Aún no hay trabajos para calificar en este programa.</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 30 }}>
                           {submissions.sort((a,b) => a.status === 'pending' ? -1 : 1).map(sub => {
                              const block = blocks.find(b => b.id === sub.block_id);
                              const module = modules.find(m => m.id === block?.screen);
                              return (
                                 <div key={sub.id} style={{ display: "flex", flexDirection: "column", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", borderRadius: 32, overflow: "hidden", transition: "0.3s", boxShadow: sub.status === 'pending' ? "0 15px 50px rgba(254, 220, 61, 0.08)" : "0 10px 30px rgba(0,0,0,0.1)" }}>
                                    {/* Encabezado Entrega */}
                                    <div style={{ padding: 30, borderBottom: "1px solid rgba(255,255,255,0.05)", background: sub.status === 'pending' ? "rgba(254, 220, 61, 0.02)" : "transparent" }}>
                                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                                             <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--brand-primary)", color: "black", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.1rem" }}>{sub.profiles?.full_name?.substring(0,2).toUpperCase() || "?"}</div>
                                             <div>
                                                <h4 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>{sub.profiles?.full_name || "Estudiante"}</h4>
                                                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.5, fontWeight: 600 }}>{module?.title || "Módulo General"} » {block?.type === 'delivery' ? "Proyecto Final" : "Actividad"}</p>
                                             </div>
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                             <span style={{ padding: "6px 12px", border: "1px solid", borderColor: sub.status === 'graded' ? "#10b981" : "var(--brand-primary)", borderRadius: 20, color: sub.status === 'graded' ? "#10b981" : "var(--brand-primary)", fontSize: "0.65rem", fontWeight: 900, letterSpacing: 1 }}>{sub.status.toUpperCase()}</span>
                                             <button 
                                                onClick={async () => {
                                                   if (confirm("¿Estás seguro de eliminar permanentemente esta entrega?")) {
                                                      const { error } = await supabase.from("submissions").delete().eq("id", sub.id);
                                                      if (!error) setSubmissions(prev => prev.filter(s => s.id !== sub.id));
                                                   }
                                                }}
                                                style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", borderRadius: 12, width: 40, height: 40, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                title="Eliminar Entrega"
                                             >
                                                <Trash2 size={18} />
                                             </button>
                                          </div>
                                       </div>
                                    </div>
                                    {/* Contenido con Bisturí */}
                                    <div style={{ padding: 30, flexGrow: 1, background: "rgba(255,255,255,0.01)" }}>
                                       <p style={{ fontSize: "0.7rem", opacity: 0.4, marginBottom: 15, fontWeight: 900, letterSpacing: 1 }}>TRABAJO ENTREGADO (USA EL BISTURÍ PARA RESALTAR):</p>
                                       <div className="mentor-editor-box" style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                                          <CLANEditor 
                                                blockId={block?.id || ""} 
                                                initialHtml={sub.content} 
                                                isAdmin={true} 
                                                mode="grading"
                                                onGrade={(updatedContent: string) => { (sub as any).pending_content = updatedContent; }}
                                             />
                                       </div>
                                    </div>
                                    {/* Footer Evaluación */}
                                    <div style={{ padding: 30, background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                       <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                                          <div style={{ display: "flex", gap: 20 }}>
                                             <div style={{ width: 120 }}>
                                                <label style={{ fontSize: "0.65rem", opacity: 0.5, display: "block", marginBottom: 5 }}>NOTA /100</label>
                                                <input id={`score-${sub.id}`} type="number" defaultValue={sub.score || ""} style={{ width: "100%", padding: "15px", borderRadius: 16, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", fontWeight: 800, textAlign: "center", fontSize: "1.2rem" }} />
                                             </div>
                                             <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: "0.65rem", opacity: 0.5, display: "block", marginBottom: 5 }}>RETROALIMENTACIÓN</label>
                                                <input id={`fdbk-${sub.id}`} type="text" defaultValue={sub.feedback || ""} placeholder="Excelente trabajo, pero considera..." style={{ width: "100%", padding: "15px 20px", borderRadius: 16, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
                                             </div>
                                          </div>
                                          <button onClick={async () => {
                                             const score = (document.getElementById(`score-${sub.id}`) as HTMLInputElement).value;
                                             const feedback = (document.getElementById(`fdbk-${sub.id}`) as HTMLInputElement).value;
                                             const finalContent = (sub as any).pending_content || sub.content;
                                             if (!score) return alert("Por favor asigna una nota.");
                                             const { error } = await supabase.from("submissions").update({ score: parseFloat(score), feedback, content: finalContent, status: 'graded' }).eq("id", sub.id);
                                             if (!error) {
                                                playUISound("success");
                                                setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, score: parseFloat(score), feedback, content: finalContent, status: 'graded' } : s));
                                                alert("¡Evaluación enviada con éxito!");
                                             } else alert(error.message);
                                          }} className="btn-primary" style={{ height: 50, borderRadius: 16, fontWeight: 800, fontSize: "1rem" }}>{sub.status === 'graded' ? "ACTUALIZAR NOTA" : "ENVIAR EVALUACIÓN"}</button>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                    )}
                   </>
                 ) : (
                   <>
                    {/* PANEL ALUMNO: RESUMEN DE PROGRESO */}
                    <header style={{ marginBottom: 40, borderBottom: "1px solid var(--glass-border)", paddingBottom: 25 }}>
                       <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: "var(--brand-primary)", margin: 0 }}>Mis Calificaciones</h2>
                       <p style={{ opacity: 0.5, marginTop: 5 }}>Resumen detallado de tus entregas y retroalimentación de mentores.</p>
                       
                       <div style={{ display: "flex", gap: 20, marginTop: 25 }}>
                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px 25px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)", flex: 1 }}>
                             <label style={{ fontSize: "0.65rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, display: "block", marginBottom: 5 }}>PROYECTOS ENVIADOS</label>
                             <span style={{ fontSize: "2rem", fontWeight: 800 }}>{submissions.length}</span>
                          </div>
                          <div style={{ background: "rgba(16, 185, 129, 0.05)", padding: "20px 25px", borderRadius: 24, border: "1px solid rgba(16, 185, 129, 0.1)", flex: 1 }}>
                             <label style={{ fontSize: "0.65rem", fontWeight: 900, color: "#10b981", letterSpacing: 1.5, display: "block", marginBottom: 5 }}>TU PROMEDIO</label>
                             <span style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981" }}>
                                {submissions.filter(s => s.status === 'graded').length > 0 
                                   ? (submissions.reduce((acc, s) => acc + (s.score || 0), 0) / submissions.filter(s => s.status === 'graded').length).toFixed(1)
                                   : "—"}
                             </span>
                          </div>
                       </div>
                    </header>

                    <div style={{ background: "var(--bg-dark)", border: "1px solid var(--glass-border)", borderRadius: 32, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                       <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                          <thead>
                             <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <th style={{ padding: "25px 30px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, textTransform: "uppercase" }}>Módulo & Actividad</th>
                                <th style={{ padding: "25px 30px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, textTransform: "uppercase" }}>Estado</th>
                                <th style={{ padding: "25px 30px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, textTransform: "uppercase" }}>Puntaje</th>
                                <th style={{ padding: "25px 30px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, textTransform: "uppercase" }}>Comentario del Mentor</th>
                             </tr>
                          </thead>
                          <tbody>
                             {submissions.length === 0 ? (
                                <tr>
                                   <td colSpan={4} style={{ padding: 80, textAlign: "center", opacity: 0.3, fontSize: "1.1rem" }}>Aún no has realizado ninguna entrega por calificar.</td>
                                </tr>
                             ) : submissions.map(sub => {
                                const block = blocks.find(b => b.id === sub.block_id);
                                const module = modules.find(m => m.id === block?.screen);
                                return (
                                   <tr key={sub.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", transition: "0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.01)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"} onClick={() => { if(module) { setActiveScreen(module.id); playUISound("click"); } }}>
                                      <td style={{ padding: "30px" }}>
                                         <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem", color: "white" }}>{block?.type === 'delivery' ? "Proyecto Final" : "Actividad Interactiva"}</p>
                                         <p style={{ margin: "5px 0 0", fontSize: "0.8rem", opacity: 0.4 }}>{module?.title}</p>
                                      </td>
                                      <td style={{ padding: "30px" }}>
                                         <span style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: sub.status === 'graded' ? "#10b981" : "var(--brand-primary)", color: sub.status === 'graded' ? "#10b981" : "var(--brand-primary)", fontSize: "0.6rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>{sub.status === 'graded' ? "REVISADO" : "PENDIENTE"}</span>
                                      </td>
                                      <td style={{ padding: "30px" }}>
                                         <span style={{ fontSize: "1.8rem", fontWeight: 900, color: sub.status === 'graded' ? "white" : "rgba(255,255,255,0.1)" }}>{sub.score || "—"}</span>
                                         <span style={{ opacity: 0.3, fontSize: "0.85rem", marginLeft: 6 }}>/100</span>
                                      </td>
                                      <td style={{ padding: "30px" }}>
                                         <p style={{ margin: 0, fontSize: "0.95rem", opacity: 0.7, maxWidth: 350, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontStyle: sub.feedback ? "italic" : "normal" }}>{sub.feedback || "Sin comentarios adicionales."}</p>
                                      </td>
                                   </tr>
                                );
                             })}
                          </tbody>
                       </table>
                    </div>
                   </>
                 )}
              </div>
            ) : (
              <div>
                <header style={{ marginBottom: 40, borderBottom: "1px solid var(--glass-border)", paddingBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "var(--brand-primary)", margin: 0 }}>{modules.find(m => m.id === activeScreen)?.title}</h2>
                  {isEditMode && (
                    <button 
                      onClick={() => {
                        const mod = modules.find(m => m.id === activeScreen);
                        setTempWelcomeMessage(mod?.welcome_message || "Hola {{nombre}}, hoy es un gran día para dominar esta competencia. ¡Ponte cómodo y dale con todo!");
                        setIsEditingWelcome(true);
                        playUISound("click");
                      }}
                      className="btn-secondary"
                      style={{ fontSize: "0.7rem", padding: "8px 15px", display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <MessageSquare size={14} /> {modules.find(m => m.id === activeScreen)?.welcome_message ? "EDITAR SALUDO" : "AÑADIR SALUDO"}
                    </button>
                  )}
                </header>

                {/* Mentor Welcome Message Section */}
                {isEditingWelcome ? (
                    <div style={{ marginBottom: 40, background: "var(--glass-bg)", padding: 30, borderRadius: 24, border: "1px solid var(--brand-primary)", animation: "fadeIn 0.3s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                      <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--brand-primary)", letterSpacing: 1 }}>MENSAJE DE BIENVENIDA DEL MENTOR</label>
                      <div style={{ fontSize: "0.65rem", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.2)", fontWeight: 700 }}>
                        ⚠️ ¡NO BORRES EL TAG {{nombre}}!
                      </div>
                    </div>
                    
                    <textarea 
                      value={tempWelcomeMessage}
                      onChange={(e) => setTempWelcomeMessage(e.target.value)}
                      placeholder="Ej: Hola {{nombre}}, hoy es un nuevo desafío..."
                      style={{ width: "100%", background: "var(--bg-main)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: 20, color: "var(--text-main)", fontSize: "1rem", outline: "none", resize: "none", fontFamily: "inherit" }}
                      rows={3}
                    />
                    
                    <p style={{ marginTop: 10, fontSize: "0.7rem", opacity: 0.5, fontStyle: "italic", color: "var(--text-muted)" }}>
                      * El sistema reemplaza automáticamente <b>{{nombre}}</b> por el nombre real del estudiante.
                    </p>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 15 }}>
                      <button onClick={() => setIsEditingWelcome(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
                      <button onClick={handleUpdateWelcomeMessage} className="btn-primary" style={{ padding: "8px 25px" }}>Guardar Saludo</button>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const activeMod = modules.find(m => m.id === activeScreen);
                    if (!activeMod?.welcome_message) return null;
                    const firstName = userProfile?.full_name?.split(' ')[0] || "Estudiante";
                    const formattedMsg = activeMod.welcome_message.replace(/{{nombre}}|{{name}}/gi, firstName);
                    const currentIndex = modules.findIndex(m => m.id === activeScreen);
                    
                    return (
                      <div style={{ marginBottom: 40, display: "flex", gap: 20, alignItems: "flex-start", animation: "fadeIn 0.5s ease" }}>
                        <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
                          <User size={24} color="black" />
                        </div>
                        <div style={{ background: "var(--glass-bg)", padding: "20px 25px", borderRadius: "0 24px 24px 24px", border: "1px solid var(--glass-border)", position: "relative", flex: 1 }}>
                          <div style={{ position: "absolute", top: 10, right: 15, fontSize: "0.6rem", fontWeight: 900, color: "var(--brand-primary)", opacity: 0.5, letterSpacing: 1 }}>MENSAJE DEL MENTOR</div>
                          <p style={{ margin: "0 0 15px 0", fontSize: "1.05rem", lineHeight: "1.6", color: "var(--text-main)", fontStyle: "italic" }}>"{formattedMsg}"</p>
                          
                          {/* Student Action Button */}
                          {!isAdmin && !isEditMode && (
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <button 
                                onClick={handleStartLesson}
                                className="btn-primary"
                                style={{ 
                                  padding: "8px 20px", 
                                  fontSize: "0.85rem", 
                                  borderRadius: "12px",
                                  boxShadow: "0 10px 20px rgba(254, 220, 61, 0.2)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  transition: "0.3s"
                                }}
                              >
                                {currentIndex < modules.length - 1 ? (
                                  <>🚀 Empecemos <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }} /></>
                                ) : (
                                  <>🏆 Finalizar Módulo</>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}

                <div className="blocks-list" style={{ position: "relative" }}>
                  {isModuleLocked(activeScreen) && (
                    <div style={{ 
                      background: "var(--brand-glow)", 
                      border: "1px solid var(--brand-primary)", 
                      padding: "15px 25px", 
                      borderRadius: "16px", 
                      marginBottom: "30px", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "15px",
                      animation: "fadeIn 0.5s ease"
                    }}>
                      <ShieldAlert size={24} color="var(--brand-primary)" />
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: "0.9rem", color: "white" }}>MODO VISTA PREVIA ACTIVO</p>
                        <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>Debes completar el módulo anterior para habilitar las entregas y actividades de esta sección.</p>
                      </div>
                    </div>
                  )}

                  {blocks.filter(b => b.screen === activeScreen).map(block => {
                    const isLocked = isModuleLocked(activeScreen) && ["quiz", "flashcards", "dragdrop", "delivery", "checklist"].includes(block.type);
                    return (
                    <div key={block.id} style={{ position: "relative", marginBottom: 40, opacity: isLocked ? 0.6 : 1, pointerEvents: isLocked ? "none" : "auto" }}>
                      {isEditMode && (
                        <button className="del-btn" onClick={() => removeBlock(block.id)} style={{ position: "absolute", top: -10, right: -10, zIndex: 10 }}><Trash2 size={16} /></button>
                      )}
                      
                      {isLocked && (
                        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed rgba(255,255,255,0.1)" }}>
                           <div style={{ textAlign: "center", padding: 20 }}>
                              <ShieldAlert size={32} color="var(--brand-primary)" style={{ marginBottom: 10, margin: "0 auto" }} />
                              <p style={{ fontSize: "0.8rem", fontWeight: 800, color: "white", margin: 0 }}>ACTIVIDAD BLOQUEADA</p>
                           </div>
                        </div>
                      )}

                      {block.type === "video" && (
                        <div className="video-block" style={{ aspectRatio: "16/9", background: "black", borderRadius: 24, overflow: "hidden", border: "1px solid var(--glass-border)", margin: "0 auto", width: "100%", maxWidth: "1000px" }}>
                          {block.content?.mux_playback_id ? (
                            <MuxPlayer
                              playbackId={block.content.mux_playback_id}
                              metadataVideoTitle={block.content.title || "Video de CLAN"}
                              style={{ height: '100%', width: '100%' }}
                              accentColor="var(--brand-primary)"
                            />
                          ) : block.content?.url?.includes("youtube.com") || block.content?.url?.includes("youtu.be") ? (
                            <iframe 
                              src={block.content?.url?.replace("watch?v=", "embed/")} 
                              width="100%" 
                              height="100%" 
                              frameBorder="0" 
                              allowFullScreen 
                            />
                          ) : (
                            <video src={block.content?.url} controls style={{ width: '100%', height: '100%' }} />
                          )}
                        </div>
                      )}

                      {block.type === "audio" && (
                        <AudioBlockPlayer 
                          url={block.content?.url} 
                          title={block.content?.title} 
                          isEditMode={isEditMode} 
                          onTitleSave={(t) => updateAudioTitle(block.id, t)} 
                        />
                      )}

                      {block.type === "delivery" && (
                        <div key={block.id} className="delivery-section-wrapper" style={{ margin: "40px 0" }}>
                           <CLANEditor 
                             blockId={block.id} 
                             initialHtml={block.content?.html} 
                             isEditMode={isEditMode} 
                             isAdmin={isAdmin} 
                             courseId={courseId} 
                             mode="delivery" 
                             userSubmission={submissions.find(s => s.block_id === block.id && s.student_id === currentUser?.id)} 
                             onOpenTutor={(text) => {
                               setCurrentDeliveryText(text);
                               setIsTutorOpen(true);
                               playUISound("click");
                             }}
                           />
                        </div>
                      )}

                      {block.type === "upload" && (
                        <div className="upload-block" onClick={() => window.open(block.content?.url)} style={{ background: "var(--glass-bg)", padding: 30, borderRadius: 24, border: "1px solid var(--glass-border)", textAlign: "center", cursor: "pointer" }}>
                          <Paperclip size={32} style={{ color: "var(--brand-primary)", marginBottom: 15 }} />
                          <h4 style={{ margin: 0 }}>{block.content?.filename || "Recurso de Estudio"}</h4>
                        </div>
                      )}

                      {block.type === "label" && (
                        <div className="label-block" style={{ color: "white" }}>
                          {isEditMode ? (
                            <CLANEditor 
                              blockId={block.id} 
                              initialHtml={block.content?.html} 
                              isEditMode={isEditMode} 
                              isAdmin={isAdmin} 
                              courseId={courseId} 
                              mode="content" 
                              onSave={(newHtml) => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: { html: newHtml } } : b))}
                            />
                          ) : (
                            <div 
                              className="content-render" 
                              dangerouslySetInnerHTML={{ __html: block.content?.html }} 
                              style={{ padding: "0 20px", fontSize: "1.1rem", lineHeight: "1.8", color: "white" }} 
                            />
                          )}
                        </div>
                      )}

                      {block.type === "quiz" && (
                        <QuizBlockEditor 
                          blockId={block.id} 
                          initialData={block.content} 
                          isEditMode={isEditMode} 
                          isAdmin={isAdmin} 
                          courseId={courseId} 
                          onSave={(newContent: any) => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: newContent } : b))}
                          userSubmission={submissions.find(s => s.block_id === block.id && s.student_id === currentUser?.id)}
                          currentUser={currentUser}
                        />
                      )}

                      {block.type === "flashcards" && (
                        <FlashCardPlayer 
                          blockId={block.id} 
                          initialData={block.content} 
                          isEditMode={isEditMode} 
                          isAdmin={isAdmin} 
                          courseId={courseId} 
                          onSave={(newContent: any) => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: newContent } : b))}
                        />
                      )}

                      {block.type === "dragdrop" && (
                        <DragDropEditor 
                          blockId={block.id} 
                          initialData={block.content} 
                          isEditMode={isEditMode} 
                          isAdmin={isAdmin} 
                          courseId={courseId} 
                          onSave={(newContent: any) => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: newContent } : b))}
                          userSubmission={submissions.find(s => s.block_id === block.id && s.student_id === currentUser?.id)}
                          currentUser={currentUser}
                        />
                      )}

                      {block.type === "checklist" && (
                        <ChecklistBlockEditor 
                          blockId={block.id} 
                          initialData={block.content} 
                          isEditMode={isEditMode} 
                          isAdmin={isAdmin} 
                          courseId={courseId} 
                          onSave={(newContent: any) => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: newContent } : b))}
                          userSubmission={submissions.find(s => s.block_id === block.id && s.student_id === currentUser?.id)}
                          currentUser={currentUser}
                        />
                      )}
                      </div>
                    );
                  })}
                </div>

                {/* Module Completion Status for Students */}
                {!isAdmin && activeScreen !== "overview" && activeScreen !== "members" && activeScreen !== "grades" && (
                  <div style={{ marginTop: 60, padding: 40, background: "rgba(255,255,255,0.02)", borderRadius: 32, border: "1px solid var(--glass-border)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                    {(() => {
                      const isCompleted = enrollment?.completed_modules?.includes(activeScreen);
                      const requiredBlocks = getRequiredBlocksForModule(activeScreen);
                      const studentSubmissions = submissions.filter(s => s.student_id === currentUser?.id);
                      
                      if (isCompleted) {
                        return (
                          <>
                            <div style={{ width: 60, height: 60, background: "var(--brand-primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                               <CheckCircle2 size={30} color="black" />
                            </div>
                            <div>
                              <h3 style={{ fontSize: "1.4rem", fontFamily: "'Playfair Display', serif", marginBottom: 5 }}>Módulo Finalizado</h3>
                              <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>¡Buen trabajo! Has desbloqueado el siguiente paso en tu ruta.</p>
                            </div>
                          </>
                        );
                      }

                      if (requiredBlocks.length > 0) {
                        return (
                          <>
                            <div style={{ width: 60, height: 60, background: "var(--brand-glow)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                               <ClipboardList size={30} color="var(--brand-primary)" />
                            </div>
                            <div>
                              <h3 style={{ fontSize: "1.4rem", fontFamily: "'Playfair Display', serif", marginBottom: 5 }}>Actividades Pendientes</h3>
                              <p style={{ opacity: 0.5, fontSize: "0.9rem", maxWidth: "400px" }}>Para completar este módulo, debes finalizar las siguientes actividades:</p>
                              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
                                {requiredBlocks.map(rb => {
                                  const isDone = studentSubmissions.some(s => s.block_id === rb.id);
                                  return (
                                    <div key={rb.id} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isDone ? 0.4 : 1 }}>
                                      {isDone ? <CheckCircle2 size={16} color="var(--brand-primary)" /> : <Circle size={16} />}
                                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{rb.type === 'quiz' ? 'Completar el Quiz' : rb.type === 'delivery' ? 'Enviar tu Entrega' : rb.type === 'checklist' ? 'Lista de Verificación' : 'Completar el Desafío'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        );
                      }

                      return (
                        <>
                          <div style={{ width: 60, height: 60, background: "rgba(255,255,255,0.05)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                             <Loader2 className="animate-spin" size={30} color="var(--brand-primary)" />
                          </div>
                          <div>
                            <h3 style={{ fontSize: "1.4rem", fontFamily: "'Playfair Display', serif", marginBottom: 5 }}>Analizando Progreso</h3>
                            <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>Permanece unos segundos en este módulo para marcarlo como visto.</p>
                          </div>
                        </>
                      );
                    })()}
                    
                    {enrollment?.completed_modules?.includes(activeScreen) && (
                      <button 
                        onClick={() => toggleModuleCompletion(activeScreen)}
                        className="btn-primary"
                        style={{ 
                          background: "transparent",
                          color: "var(--brand-primary)",
                          border: "1px solid var(--brand-primary)",
                          padding: "12px 30px",
                          fontSize: "0.9rem",
                          fontWeight: 700
                        }}
                      >
                        Desmarcar como pendiente
                      </button>
                    )}
                  </div>
                )}

                {isEditMode && (
                  <div className="creation-menu" style={{ marginTop: 60, padding: 30, border: "2px dashed var(--glass-border)", borderRadius: 32, textAlign: "center" }}>
                    <h4 style={{ opacity: 0.5, marginBottom: 20 }}>AÑADIR CONTENIDO</h4>
                    <div style={{ display: "flex", gap: 15, justifyContent: "center", flexWrap: "wrap" }}>
                      <button className="btn-secondary" onClick={() => handleInsertClick("video")}>+ Video</button>
                      <button className="btn-secondary" onClick={() => handleInsertClick("audio")}>+ Audio</button>
                      <button className="btn-secondary" onClick={() => handleInsertClick("upload")}>+ Archivo</button>
                      <button className="btn-secondary" onClick={() => handleInsertClick("delivery")}>+ Caja Entrega</button>
                      <button className="btn-secondary" onClick={() => handleInsertClick("label")}>+ Texto/HTML</button>
                      <button className="btn-secondary" style={{ background: "var(--brand-glow)", borderColor: "var(--brand-primary)" }} onClick={() => setShowInteractive(!showInteractive)}>+ Actividad Interactiva</button>
                    </div>

                    {showInteractive && (
                      <div style={{ marginTop: 25, display: "flex", gap: 15, justifyContent: "center", animation: "fadeIn 0.3s ease", flexWrap: "wrap" }}>
                        <button className="btn-primary" onClick={() => handleInsertClick("quiz")} style={{ padding: "10px 20px", fontSize: "0.85rem", background: "#4c1d95", borderColor: "#4c1d95" }}><Trophy size={16} style={{ marginRight: 8 }} /> Quiz</button>
                        <button className="btn-primary" onClick={() => handleInsertClick("dragdrop")} style={{ padding: "10px 20px", fontSize: "0.85rem", background: "#1e3a8a", borderColor: "#1e3a8a" }}><Gamepad2 size={16} style={{ marginRight: 8 }} /> Drag & Drop</button>
                        <button className="btn-primary" onClick={() => handleInsertClick("checklist")} style={{ padding: "10px 20px", fontSize: "0.85rem", background: "#14b8a6", borderColor: "#14b8a6", color: "black" }}><CheckSquare size={16} style={{ marginRight: 8 }} /> Checklist</button>
                        <button className="btn-primary" onClick={() => handleInsertClick("flashcards")} style={{ padding: "10px 20px", fontSize: "0.85rem", background: "#064e3b", borderColor: "#064e3b" }}><Layers size={16} style={{ marginRight: 8 }} /> Flash Cards</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Tutor AI Sidebar Panel */}
      {isTutorOpen && (
        <>
          <div 
            onClick={() => setIsTutorOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 10000, transition: "0.3s" }}
          ></div>
          <div style={{ 
            position: "fixed", 
            top: 0, 
            right: 0, 
            width: "450px", 
            height: "100vh", 
            background: "rgba(15, 15, 25, 0.95)", 
            backdropFilter: "blur(20px)",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            zIndex: 10001,
            display: "flex",
            flexDirection: "column",
            boxShadow: "-10px 0 50px rgba(0,0,0,0.5)",
            animation: "slideInRight 0.4s ease"
          }}>
             <header style={{ padding: "30px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                   <div style={{ width: "45px", height: "45px", borderRadius: "14px", background: "var(--brand-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-primary)" }}>
                      <Bot size={24} />
                   </div>
                   <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Tutor CLAN</h3>
                      <span style={{ fontSize: "0.75rem", opacity: 0.5, letterSpacing: "1.5px", fontWeight: 700 }}>GEMINI 1.5 FLASH</span>
                   </div>
                </div>
                <button 
                  onClick={() => setIsTutorOpen(false)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "10px", width: "40px", height: "40px", color: "white", cursor: "pointer" }}
                >
                   <X size={20} />
                </button>
             </header>

             <div style={{ flex: 1, overflowY: "auto", padding: "30px", display: "flex", flexDirection: "column", gap: "25px" }}>
                {tutorMessages.map((m, idx) => (
                   <div key={idx} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                      <div style={{ 
                        padding: "15px 20px", 
                        borderRadius: "18px", 
                        background: m.role === "user" ? "var(--brand-primary)" : "rgba(255,255,255,0.03)",
                        border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.05)",
                        color: m.role === "user" ? "black" : "white",
                        fontSize: "0.95rem",
                        lineHeight: "1.5",
                        fontWeight: m.role === "user" ? 600 : 400
                      }}>
                         {m.content}
                      </div>
                   </div>
                ))}
                {isTutorThinking && (
                   <div style={{ alignSelf: "flex-start", opacity: 0.5, fontSize: "0.85rem", fontStyle: "italic" }}>
                      El tutor está analizando tu texto...
                   </div>
                )}
             </div>

             <footer style={{ padding: "30px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ position: "relative" }}>
                   <textarea 
                     value={tutorInput}
                     onChange={(e) => setTutorInput(e.target.value)}
                     onKeyDown={(e) => { 
                       if (e.key === "Enter" && !e.shiftKey) { 
                         e.preventDefault(); 
                         handleTutorSend(); 
                       } 
                     }}
                     placeholder="Haz una pregunta sobre tu entrega..." 
                     style={{ width: "100%", height: "100px", padding: "20px 60px 20px 20px", borderRadius: "18px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", resize: "none" }}
                   />
                   <button 
                     onClick={handleTutorSend}
                     style={{ position: "absolute", top: "50%", right: "20px", transform: "translateY(-50%)", width: "45px", height: "45px", borderRadius: "12px", background: "var(--brand-primary)", border: "none", color: "black", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                   >
                      <Send size={20} />
                   </button>
                </div>
                <p style={{ fontSize: "0.7rem", opacity: 0.3, textAlign: "center", marginTop: "15px" }}>IA integrada para el desarrollo metacognitivo • CLAN 2026</p>
             </footer>
          </div>
        </>
      )}

      {insertModal && (
        <div className="modal-overlay forced-center">
          <div className="modal-content" style={{ background: "var(--bg-dark)", border: "1px solid var(--glass-border)", padding: 40, borderRadius: 32, maxWidth: "500px", width: "90%", boxShadow: "0 25px 50px rgba(0,0,0,0.8)" }}>
            <h3 style={{ color: "var(--brand-primary)", marginBottom: 25, fontFamily: "'Playfair Display', serif", fontSize: "1.8rem" }}>{insertModal.message}</h3>
            
            <div style={{ marginBottom: 30 }}>
              {insertModal.type === "video" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                   <div style={{ background: "var(--brand-glow)", padding: 25, borderRadius: 20, border: "1px solid var(--brand-glow)", textAlign: "center" }}>
                      <div style={{ width: 60, height: 60, background: "var(--brand-glow)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px" }}>
                        <Plus size={30} style={{ color: "var(--brand-primary)" }} />
                      </div>
                      <h4 style={{ margin: "0 0 5px 0", fontSize: "1.1rem" }}>Subir Video de Alta Fidelidad</h4>
                      <p style={{ fontSize: "0.8rem", opacity: 0.6, marginBottom: 20 }}>Optimizado automáticamente por Mux para streaming profesional.</p>
                      
                      <input type="file" id="video-file-input" accept="video/*" onChange={(e) => e.target.files?.[0] && setModalFile(e.target.files[0])} style={{ display: "none" }} />
                      <button onClick={() => document.getElementById("video-file-input")?.click()} style={{ background: modalFile ? "rgba(255,255,255,0.1)" : "var(--brand-primary)", color: modalFile ? "white" : "black", border: "none", padding: "12px 25px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
                         {modalFile ? `✓ ${modalFile.name.substring(0, 20)}...` : "Seleccionar Archivo Master"}
                      </button>
                   </div>

                   <div style={{ opacity: 0.5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
                         <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }}></div>
                         <span style={{ fontSize: "0.7rem", fontWeight: 800 }}>O ENLACE EXTERNO (OPCIONAL)</span>
                         <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }}></div>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Pega enlace de YouTube o Vimeo..." 
                        value={modalInput} 
                        onChange={(e) => setModalInput(e.target.value)} 
                        style={{ width: "100%", padding: 15, borderRadius: 15, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "white", outline: "none", fontSize: "0.9rem" }} 
                      />
                   </div>
                </div>
              ) : insertModal.type === "audio" ? (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <input type="text" placeholder="Título del audio..." value={modalInput} onChange={(e) => setModalInput(e.target.value)} style={{ width: "100%", padding: 15, borderRadius: 15, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", marginBottom: 20 }} />
                  {!recordedBlob ? (
                    <button onClick={isRecording ? stopRecording : startRecording} style={{ background: isRecording ? "#ef4444" : "var(--brand-primary)", color: "black", border: "none", padding: "15px 30px", borderRadius: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 10, margin: "0 auto" }}>
                      {isRecording ? <Square size={20} fill="black" /> : <Mic size={20} />}
                      {isRecording ? "Detener Grabación" : "Grabar Audio"}
                    </button>
                  ) : (
                    <div style={{ background: "rgba(255,255,255,0.05)", padding: 15, borderRadius: 15 }}>
                      <p style={{ fontSize: "0.8rem", color: "var(--brand-primary)" }}>✓ Grabación lista</p>
                      <button onClick={() => setRecordedBlob(null)} style={{ background: "none", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "5px 15px", borderRadius: 8, fontSize: "0.7rem", marginTop: 10 }}>Descartar y repetir</button>
                    </div>
                  )}
                  <p style={{ margin: "20px 0", opacity: 0.3 }}>O OTRA OPCIÓN:</p>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setModalFile(e.target.files[0])} style={{ color: "white" }} />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  <input type="text" placeholder="Título del contenido..." value={modalInput} onChange={(e) => setModalInput(e.target.value)} style={{ width: "100%", padding: 15, borderRadius: 15, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
                  <div style={{ marginTop: 10, padding: "30px 20px", border: "2px dashed rgba(255,255,255,0.05)", borderRadius: 15, textAlign: "center", background: "rgba(255,255,255,0.02)" }}>
                    <Plus size={24} style={{ opacity: 0.3, marginBottom: 10 }} />
                    <input type="file" onChange={(e) => e.target.files?.[0] && setModalFile(e.target.files[0])} style={{ color: "white", fontSize: "0.85rem" }} />
                  </div>
                </div>
              )}
            </div>

            {isUploading && (
               <div style={{ width: "100%", textAlign: "center", marginBottom: 25, animation: "fadeIn 0.3s ease" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 15px", borderColor: "var(--brand-primary)" }}></div>
                  <p style={{ color: "var(--brand-primary)", fontSize: "0.9rem", fontWeight: 600 }}>{uploadStatus}</p>
               </div>
            )}

            <div style={{ display: "flex", gap: 15, justifyContent: "center" }}>
              <button className="btn-secondary" onClick={() => { setInsertModal(null); setUploadStatus(""); }} disabled={isUploading}>Cancelar</button>
              <button className="btn-primary" onClick={confirmModal} disabled={isUploading || isRecording || (!modalFile && !modalInput && !recordedBlob)}>
                {isUploading ? "Procesando..." : "Sincronizar"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .player-container.zen-active { grid-template-columns: 1fr; }
        .player-sidebar.zen-hidden { display: none; }
        .player-main.zen-full { padding-left: 0; padding-right: 0; max-width: 1000px; margin: 0 auto; }
        .player-content-wrapper { position: relative; }
        .modal-overlay.forced-center {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 999999 !important;
          background: rgba(0,0,0,0.9) !important;
          backdrop-filter: blur(10px) !important;
          margin: 0 !important;
          padding: 20px !important;
        }
        .modal-content {
          margin: 0 !important;
        }
      `}} />
    </>
  );
}

export default function CoursePlayer() {
  return (
    <Suspense fallback={<div className="loading-screen">Cargando Aula...</div>}>
      <CoursePlayerContent />
    </Suspense>
  );
}

