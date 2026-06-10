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
  ShieldAlert, Trophy, Gamepad2, Layers, Menu, CheckCircle2, Circle,
  Maximize2, Minimize2, Send, Upload, User, Video, X, Sparkles, Bot, MessageSquare, FileText, Loader2, CheckSquare,
  ChevronLeft, ChevronRight, Sun, Moon
} from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";
import { createClient } from "@/utils/supabase/client";
import { playUISound } from "@/utils/audio";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTheme } from "@/components/ThemeProvider";
import "../legacy-styles.css";

type BlockType = "video" | "audio" | "upload" | "delivery" | "label" | "quiz" | "flashcards" | "dragdrop" | "checklist" | "file_delivery";

import { AudioBlockPlayer } from "@/components/course/AudioBlockPlayer";
import { CLANEditor } from "@/components/course/CLANEditor";
import { QuizBlockEditor } from "@/components/course/QuizBlockEditor";
import { FlashCardPlayer } from "@/components/course/FlashCardPlayer";
import { DragDropEditor } from "@/components/course/DragDropEditor";
import { ChecklistBlockEditor } from "@/components/course/ChecklistBlockEditor";
import { CourseMembersView } from "@/components/course/CourseMembersView";
import { CourseGradesView } from "@/components/course/CourseGradesView";
import { CourseOverviewView } from "@/components/course/CourseOverviewView";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { FileDeliveryBlock } from "@/components/course/FileDeliveryBlock";
import ClanTemplateForm from "@/components/dashboard/ClanTemplateForm";

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
  
  const [insertModal, setInsertModal] = useState<{ type: BlockType, message: string } | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [applyLegacyCss, setApplyLegacyCss] = useState(false);
  const [showInteractive, setShowInteractive] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  // Submissions & Grading State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isEditingWelcome, setIsEditingWelcome] = useState(false);
  const [tempWelcomeMessage, setTempWelcomeMessage] = useState("");
  const [editingBlock, setEditingBlock] = useState<any>(null);

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
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showModuleCreationModal, setShowModuleCreationModal] = useState(false);
  const [bulkCreateLoading, setBulkCreateLoading] = useState(false);

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
        setCourseDescription(course.description || "Bienvenido a tu programa de transformación. Tu aprendizaje comienza aquí.");
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

  const handleCreateModules = async (mode: 'both' | 'corte1' | 'corte2') => {
    setBulkCreateLoading(true);
    try {
      const baseIndex = modules.length;
      const modulesToInsert = [];
      
      if (mode === 'both' || mode === 'corte1') {
        for (let i = 1; i <= 8; i++) {
          modulesToInsert.push({ title: `Semana ${i} Corte 1`, course_id: courseId, order_index: baseIndex + modulesToInsert.length });
        }
      }
      if (mode === 'both' || mode === 'corte2') {
        for (let i = 1; i <= 8; i++) {
          modulesToInsert.push({ title: `Semana ${i} Corte 2`, course_id: courseId, order_index: baseIndex + modulesToInsert.length });
        }
      }

      const { data: newMods, error } = await supabase.from("modules").insert(modulesToInsert).select();
      
      if (!error && newMods) {
        setModules(prev => [...prev, ...newMods]);
        setShowModuleCreationModal(false);
        playUISound("success");
      } else {
        const errMsg = error?.message || "Sin respuesta del servidor.";
        alert("Error al crear la estructura: " + errMsg);
      }
    } catch (err: any) {
      console.error("Error fatal en handleCreateModules:", err);
      alert("Error fatal: " + err.message);
    } finally {
      setBulkCreateLoading(false);
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
    return blocks.filter(b => b.screen === modId && ["quiz", "delivery", "file_delivery", "dragdrop", "checklist"].includes(b.type));
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
    setEditingBlock(null);
    setModalInput("");
    if (type === "video") setInsertModal({ type, message: "Inserta un Video (Sube MP4 o pega YouTube)" });
    else if (type === "audio") setInsertModal({ type, message: "Añade un Audio (Sube o graba)" });
    else if (type === "upload") setInsertModal({ type, message: "Añade un Recurso (Sube archivo)" });
    else if (type === "label") setInsertModal({ type, message: "Añade Contenido HTML" });
    else if (type === "delivery") executeInsert("delivery", { html: "" });
    else if (type === "quiz") { executeInsert("quiz", { questions: [] }); setShowInteractive(false); }
    else if (type === "flashcards") { executeInsert("flashcards", { cards: [] }); setShowInteractive(false); }
    else if (type === "dragdrop") { executeInsert("dragdrop", { pairs: [] }); setShowInteractive(false); }
    else if (type === "checklist") { executeInsert("checklist", { items: [] }); setShowInteractive(false); }
    else if (type === "file_delivery") executeInsert("file_delivery", { instructions: "" });
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
    if (editingBlock) {
      const { data, error } = await supabase.from("blocks").update({
        content: content
      }).eq("id", editingBlock.id).select().single();

      if (error) alert("Error actualizando bloque (" + type + ")");
      else if (data) setBlocks(prev => prev.map(b => b.id === data.id ? data : b));
      return;
    }

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
          
          setUploadStatus("Subiendo video a la nube...");
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
        if (insertModal.type === "label") {
          await executeInsert("label", { html: modalInput, use_legacy_css: applyLegacyCss });
        } else {
          await executeInsert(insertModal.type, { url: modalInput, title: modalInput });
        }
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
    setEditingBlock(null);
    setApplyLegacyCss(false);
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

      if (!res.ok) {
         const errorText = await res.text();
         throw new Error(errorText || "Error de conexión con la IA");
      }
      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      setTutorMessages(prev => [...prev, { role: "assistant", content: "" }]);

      let done = false;
      let streamedText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          streamedText += decoder.decode(value, { stream: true });
          setTutorMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content = streamedText;
            return newMsgs;
          });
        }
      }
      
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

  const requestBlockDelete = (id: string) => {
    setBlockToDelete(id);
  };

  const executeDeleteBlock = async () => {
    if (!blockToDelete) return;
    const id = blockToDelete;
    console.log("Attempting to delete block:", id);
    
    // Manual cascade: Delete all student submissions associated with this interactive block first.
    const { error: subErr } = await supabase.from("submissions").delete().eq("block_id", id);
    console.log("Submissions cascade result:", subErr);
    
    const { data, error } = await supabase.from("blocks").delete().eq("id", id).select();
    console.log("Blocks deletion result:", { data, error });
    
    if (!error) {
      if (data && data.length === 0) {
         alert("Alerta: El bloque no se pudo borrar de la base de datos (Posible bloqueo por permisos RLS).");
      } else {
         setBlocks(prev => prev.filter(b => b.id !== id));
      }
    } else {
      alert("Error al borrar el bloque: " + error.message);
      console.error("Delete Block Error:", error);
    }
    
    setBlockToDelete(null);
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
      <div className="denied-screen" style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", color: "var(--text-main)", textAlign: "center", padding: 40 }}>
        <div style={{ width: 100, height: 100, background: "rgba(239, 68, 68, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 30 }}>
          <ShieldAlert size={50} color="#ef4444" />
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", marginBottom: 15 }}>Acceso No Autorizado</h1>
        <p style={{ opacity: 0.6, maxWidth: 500, lineHeight: "1.6" }}>Esta sección de la plataforma está reservada para alumnos matriculados. Contacta con tu tutor para habilitar este curso.</p>
        <Link href="/dashboard" className="btn-primary" style={{ marginTop: 30 }}>Volver al Panel</Link>
      </div>
    );
  }

  return (
    <>
      {blockToDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.3s ease" }}>
          <div style={{ background: "var(--bg-card)", padding: 40, borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", maxWidth: 400, textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", animation: "slideUp 0.3s ease" }}>
            <div style={{ background: "rgba(239, 68, 68, 0.1)", width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
               <Trash2 size={40} color="#ef4444" />
            </div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", marginBottom: 15, color: "var(--text-main)" }}>¿Borrar este contenido?</h3>
            <p style={{ opacity: 0.6, marginBottom: 30, color: "var(--text-main)", lineHeight: 1.6 }}>Esta acción es permanente. Todo el contenido y las respuestas asociadas de los alumnos se perderán para siempre.</p>
            <div style={{ display: "flex", gap: 15, justifyContent: "center" }}>
               <button onClick={() => setBlockToDelete(null)} style={{ background: "transparent", color: "var(--text-main)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "12px 24px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>Cancelar</button>
               <button onClick={executeDeleteBlock} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)", transition: "all 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="edit-toggle-wrapper" style={{ display: isAdmin ? "flex" : "none" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: isEditMode ? "var(--brand-primary)" : "var(--text-main)" }}>{isEditMode ? "EDITOR ACTIVO" : "VISTA PÚBLICA"}</span>
        <label className="switch">
          <input type="checkbox" checked={isEditMode} onChange={(e) => setIsEditMode(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>

      <div className={`player-container ${isZenMode ? "zen-active" : ""} ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        {/* Mobile Action Controls */}
        {!isZenMode && (
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
             <Menu size={24} />
          </button>
        )}
        <div className={`mobile-overlay ${isMobileMenuOpen ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}></div>

        <CourseSidebar 
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          theme={theme}
          setTheme={setTheme}
          isAdmin={isAdmin}
          modules={modules}
          enrollment={enrollment}
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isModuleLocked={isModuleLocked}
          editingModuleId={editingModuleId}
          setEditingModuleId={setEditingModuleId}
          editingModuleTitle={editingModuleTitle}
          setEditingModuleTitle={setEditingModuleTitle}
          supabase={supabase}
          setModules={setModules}
          isEditMode={isEditMode}
          blocks={blocks}
          submissions={submissions}
          isAddingModule={isAddingModule}
          setIsAddingModule={setIsAddingModule}
          newModuleTitle={newModuleTitle}
          setNewModuleTitle={setNewModuleTitle}
          handleAddModule={handleAddModule}
          playUISound={playUISound}
          setShowModuleCreationModal={setShowModuleCreationModal}
        />

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
                color: "var(--brand-secondary)",
                backdropFilter: "blur(10px)",
                transition: "0.2s"
              }}
              title={isZenMode ? "Salir de Modo Enfoque" : "Modo Enfoque (Zen)"}
            >
              {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

            {activeScreen === "overview" ? (
              <CourseOverviewView 
                courseTitle={courseTitle}
                courseCover={courseCover}
                courseDescription={courseDescription}
                isEditMode={isEditMode}
                isEditingDescription={isEditingDescription}
                tempDescription={tempDescription}
                setTempDescription={setTempDescription}
                handleUpdateDescription={handleUpdateDescription}
                setIsEditingDescription={setIsEditingDescription}
                handleRemoveCover={handleRemoveCover}
                isUploading={isUploading}
                handleCoverUpload={handleCoverUpload}
                enrollment={enrollment}
                modules={modules}
              />
            ) : activeScreen === "members" ? (
              <CourseMembersView 
                courseEnrollments={courseEnrollments}
                allProfiles={allProfiles}
                toggleEnrollment={toggleEnrollment}
              />
            ) : activeScreen === "grades" ? (
              <CourseGradesView 
                isAdmin={isAdmin}
                submissions={submissions}
                setSubmissions={setSubmissions}
                blocks={blocks}
                modules={modules}
                setActiveScreen={setActiveScreen}
              />
            ) : (
              <div>
                <header style={{ marginBottom: 40, borderBottom: "1px solid var(--glass-border)", paddingBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "var(--brand-secondary)", margin: 0 }}>{modules.find(m => m.id === activeScreen)?.title}</h2>
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
                    <div style={{ marginBottom: 40, background: "var(--glass-bg)", padding: 30, borderRadius: 24, border: "1px solid var(--brand-secondary)", animation: "fadeIn 0.3s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                      <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--brand-secondary)", letterSpacing: 1 }}>MENSAJE DE BIENVENIDA DEL MENTOR</label>
                      <div style={{ fontSize: "0.65rem", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.2)", fontWeight: 700 }}>
                        ⚠️ ¡NO BORRES EL TAG {"{{nombre}}"}!
                      </div>
                    </div>
                    
                    <textarea 
                      value={tempWelcomeMessage}
                      onChange={(e) => setTempWelcomeMessage(e.target.value)}
                      placeholder="Ej: Hola {{nombre}}, hoy es un nuevo desafío..."
                      style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: 20, color: "var(--text-main)", fontSize: "1rem", outline: "none", resize: "none", fontFamily: "inherit" }}
                      rows={3}
                    />
                    
                    <p style={{ marginTop: 10, fontSize: "0.7rem", opacity: 0.5, fontStyle: "italic", color: "var(--text-muted)" }}>
                      * El sistema reemplaza automáticamente <b>{"{{nombre}}"}</b> por el nombre real del estudiante.
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
                          <div style={{ position: "absolute", top: 10, right: 15, fontSize: "0.6rem", fontWeight: 900, color: "var(--brand-secondary)", opacity: 0.5, letterSpacing: 1 }}>MENSAJE DEL MENTOR</div>
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
                      border: "1px solid var(--brand-secondary)", 
                      padding: "15px 25px", 
                      borderRadius: "16px", 
                      marginBottom: "30px", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "15px",
                      animation: "fadeIn 0.5s ease"
                    }}>
                      <ShieldAlert size={24} color="var(--brand-secondary)" />
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: "0.9rem", color: "white" }}>MODO VISTA PREVIA ACTIVO</p>
                        <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>Debes completar el módulo anterior para habilitar las entregas y actividades de esta sección.</p>
                      </div>
                    </div>
                  )}

                  {blocks.filter(b => b.screen === activeScreen).map(block => {
                    const isLocked = isModuleLocked(activeScreen) && ["quiz", "flashcards", "dragdrop", "delivery", "file_delivery", "checklist"].includes(block.type);
                    return (
                    <div key={block.id} style={{ position: "relative", marginBottom: 40, opacity: isLocked ? 0.6 : 1, pointerEvents: isLocked ? "none" : "auto" }}>
                      {isEditMode && (
                        <button className="del-btn" onClick={() => requestBlockDelete(block.id)} style={{ position: "absolute", top: -10, right: -10, zIndex: 10, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", backdropFilter: "blur(10px)", color: "#ef4444", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"} onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"} title="Eliminar bloque"><Trash2 size={16} /></button>
                      )}
                      
                      {isLocked && (
                        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed rgba(255,255,255,0.1)" }}>
                           <div style={{ textAlign: "center", padding: 20 }}>
                              <ShieldAlert size={32} color="var(--brand-secondary)" style={{ marginBottom: 10, margin: "0 auto" }} />
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
                              accentColor="var(--brand-secondary)"
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

                      {block.type === "file_delivery" && (
                        <FileDeliveryBlock
                          key={block.id}
                          blockId={block.id}
                          isEditMode={isEditMode}
                          isAdmin={isAdmin}
                          isLocked={isModuleLocked(activeScreen)}
                          instructions={block.content?.instructions}
                          userSubmission={submissions.find(s => s.block_id === block.id && s.student_id === currentUser?.id)}
                          currentUserId={currentUser?.id}
                          onInstructionsSave={async (text) => {
                            const { error } = await supabase.from("blocks").update({ content: { instructions: text } }).eq("id", block.id);
                            if (!error) setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: { instructions: text } } : b));
                          }}
                        />
                      )}

                      {block.type === "upload" && (
                        <div className="upload-block" onClick={() => window.open(block.content?.url)} style={{ background: "var(--glass-bg)", padding: 30, borderRadius: 24, border: "1px solid var(--glass-border)", textAlign: "center", cursor: "pointer" }}>
                          <Paperclip size={32} style={{ color: "var(--brand-secondary)", marginBottom: 15 }} />
                          <h4 style={{ margin: 0 }}>{block.content?.filename || "Recurso de Estudio"}</h4>
                        </div>
                      )}

                      {block.type === "label" && (
                        <div className="label-block" style={{ color: "white", position: "relative" }}>
                          {isEditMode && (
                             <button 
                               onClick={() => {
                                 setEditingBlock(block);
                                 setModalInput(block.content?.html || "");
                                 setApplyLegacyCss(block.content?.use_legacy_css || false);
                                 setInsertModal({ type: "label", message: "Editar Contenido HTML" });
                               }} 
                               style={{ 
                                 position: "absolute", 
                                 top: -10, 
                                 right: 30, 
                                 background: "var(--brand-primary)", 
                                 color: "black", 
                                 border: "none", 
                                 borderRadius: "50%", 
                                 width: "32px", 
                                 height: "32px", 
                                 display: "flex", 
                                 alignItems: "center", 
                                 justifyContent: "center", 
                                 zIndex: 10,
                                 cursor: "pointer",
                                 boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                               }}
                               title="Editar HTML"
                             >
                               <Code size={16} />
                             </button>
                          )}
                          <div 
                            className={`content-render ${block.content?.use_legacy_css ? "clan-week" : ""}`} 
                            dangerouslySetInnerHTML={{ __html: block.content?.html }} 
                            style={block.content?.use_legacy_css ? {} : { padding: "0 20px", fontSize: "1.1rem", lineHeight: "1.8", color: "white" }} 
                          />
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
                              <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>¡Buen trabajo! Has desbloqueado el siguiente paso.</p>
                            </div>
                          </>
                        );
                      }

                      if (requiredBlocks.length > 0) {
                        return (
                          <>
                            <div style={{ width: 60, height: 60, background: "var(--brand-glow)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                               <ClipboardList size={30} color="var(--brand-secondary)" />
                            </div>
                            <div>
                              <h3 style={{ fontSize: "1.4rem", fontFamily: "'Playfair Display', serif", marginBottom: 5 }}>Actividades Pendientes</h3>
                              <p style={{ opacity: 0.5, fontSize: "0.9rem", maxWidth: "400px" }}>Para completar este módulo, debes finalizar las siguientes actividades:</p>
                              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
                                {requiredBlocks.map(rb => {
                                  const isDone = studentSubmissions.some(s => s.block_id === rb.id);
                                  return (
                                    <div key={rb.id} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isDone ? 0.4 : 1 }}>
                                      {isDone ? <CheckCircle2 size={16} color="var(--brand-secondary)" /> : <Circle size={16} />}
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
                             <Loader2 className="animate-spin" size={30} color="var(--brand-secondary)" />
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
                          color: "var(--brand-secondary)",
                          border: "1px solid var(--brand-secondary)",
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
                      <button className="btn-secondary" onClick={() => handleInsertClick("delivery")}>+ Caja Texto</button>
                      <button className="btn-secondary" style={{ borderColor: "var(--brand-secondary)", color: "var(--brand-secondary)" }} onClick={() => handleInsertClick("file_delivery")}>+ Caja Archivo</button>
                      <button className="btn-secondary" onClick={() => handleInsertClick("label")}>+ Texto/HTML</button>
                      <button className="btn-secondary" style={{ background: "var(--brand-glow)", borderColor: "var(--brand-secondary)" }} onClick={() => setShowInteractive(!showInteractive)}>+ Actividad Interactiva</button>
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
                   <div style={{ width: "45px", height: "45px", borderRadius: "14px", background: "var(--brand-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-secondary)" }}>
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
          <div className="modal-content" style={{ background: "var(--bg-dark)", border: "1px solid var(--glass-border)", padding: 40, borderRadius: 32, maxWidth: insertModal.type === "label" ? "1000px" : "500px", width: "95%", boxShadow: "0 25px 50px rgba(0,0,0,0.8)" }}>
            <h3 style={{ color: "var(--brand-secondary)", marginBottom: 25, fontFamily: "'Playfair Display', serif", fontSize: "1.8rem" }}>{insertModal.message}</h3>
            
            <div style={{ marginBottom: 30 }}>
              {insertModal.type === "video" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                   <div style={{ background: "var(--brand-glow)", padding: 25, borderRadius: 20, border: "1px solid var(--brand-glow)", textAlign: "center" }}>
                      <div style={{ width: 60, height: 60, background: "var(--brand-glow)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px" }}>
                        <Plus size={30} style={{ color: "var(--brand-secondary)" }} />
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
                      <p style={{ fontSize: "0.8rem", color: "var(--brand-secondary)" }}>✓ Grabación lista</p>
                      <button onClick={() => setRecordedBlob(null)} style={{ background: "none", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "5px 15px", borderRadius: 8, fontSize: "0.7rem", marginTop: 10 }}>Descartar y repetir</button>
                    </div>
                  )}
                  <p style={{ margin: "20px 0", opacity: 0.3 }}>O OTRA OPCIÓN:</p>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setModalFile(e.target.files[0])} style={{ color: "white" }} />
                </div>
              ) : insertModal.type === "label" ? (
                showTemplateForm ? (
                  <ClanTemplateForm 
                    moduleTitle={modules.find(m => m.id === activeScreen)?.title || ""}
                    onGenerate={(html) => {
                      setShowTemplateForm(false);
                      executeInsert("label", { html, use_legacy_css: true });
                    }}
                    onCancel={() => setShowTemplateForm(false)}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontSize: "0.8rem", opacity: 0.6, margin: 0 }}>Pega aquí tu código HTML personalizado.</p>
                      <button 
                        onClick={() => setShowTemplateForm(true)}
                        style={{ background: "var(--brand-glow)", border: "1px solid var(--brand-secondary)", color: "var(--brand-secondary)", padding: "5px 10px", borderRadius: 8, fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        ⚡ Usar Plantilla CLAN Week
                      </button>
                    </div>
                    <textarea 
                      placeholder="<div class='mi-clase'>Hola Mundo</div>..." 
                      value={modalInput} 
                      onChange={(e) => setModalInput(e.target.value)} 
                      style={{ 
                        width: "100%", 
                        height: "300px", 
                        padding: 20, 
                        borderRadius: 20, 
                        background: "rgba(0,0,0,0.3)", 
                        border: "1px solid var(--glass-border)", 
                        color: "#10b981", 
                        fontFamily: "monospace", 
                        fontSize: "0.9rem",
                        outline: "none",
                        resize: "none"
                      }} 
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, alignSelf: "flex-start", marginTop: 10 }}>
                      <label className="switch" style={{ margin: 0 }}>
                        <input type="checkbox" checked={applyLegacyCss} onChange={(e) => setApplyLegacyCss(e.target.checked)} />
                        <span className="slider"></span>
                      </label>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-secondary)" }}>
                        Aplicar estilos de la plataforma anterior (Semana CLAN)
                      </span>
                    </div>
                  </div>
                )
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
                  <div className="loading-spinner" style={{ margin: "0 auto 15px", borderColor: "var(--brand-secondary)" }}></div>
                  <p style={{ color: "var(--brand-secondary)", fontSize: "0.9rem", fontWeight: 600 }}>{uploadStatus}</p>
               </div>
            )}

            {!showTemplateForm && (
              <div style={{ display: "flex", gap: 15, justifyContent: "center" }}>
                <button className="btn-secondary" onClick={() => { setInsertModal(null); setUploadStatus(""); setShowTemplateForm(false); }} disabled={isUploading}>Cancelar</button>
                <button className="btn-primary" onClick={confirmModal} disabled={isUploading || isRecording || (!modalFile && !modalInput && !recordedBlob)}>
                  {isUploading ? "Procesando..." : "Sincronizar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showModuleCreationModal && (
        <div className="modal-overlay forced-center">
          <div className="modal-content" style={{ background: "var(--bg-dark)", border: "1px solid var(--brand-secondary)", padding: 40, borderRadius: 32, maxWidth: "600px", width: "90%", boxShadow: "0 25px 50px rgba(0,0,0,0.8)" }}>
            <h3 style={{ color: "var(--brand-secondary)", marginBottom: 15, fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", textAlign: "center" }}>Crear Nuevo Módulo</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: 30, textAlign: "center" }}>
              ¿Qué tipo de estructura deseas crear?
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: 30 }}>
              <button 
                onClick={() => { setShowModuleCreationModal(false); setIsAddingModule(true); }}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "16px", color: "var(--text-main)", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", gap: 15 }}
                className="hover-glow"
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><Folder size={20} /></div>
                <div style={{ textAlign: "left" }}>
                  <div>1 Módulo (Manual)</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>Escribe el nombre de un módulo personalizado.</div>
                </div>
              </button>

              <button 
                onClick={() => handleCreateModules('both')}
                disabled={bulkCreateLoading}
                style={{ background: "rgba(14, 165, 233, 0.1)", border: "1px solid var(--brand-secondary)", padding: "20px", borderRadius: "16px", color: "var(--text-main)", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", gap: 15 }}
                className="hover-glow"
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-secondary)" }}><Layers size={20} /></div>
                <div style={{ textAlign: "left" }}>
                  <div>2 Cortes (16 Semanas)</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>Estructura completa: Semana 1-8 (Corte 1) y Semana 1-8 (Corte 2).</div>
                </div>
              </button>

              <div style={{ display: "flex", gap: "15px" }}>
                <button 
                  onClick={() => handleCreateModules('corte1')}
                  disabled={bulkCreateLoading}
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", padding: "15px", borderRadius: "16px", color: "var(--text-main)", fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                  className="hover-glow"
                >
                  <Folder size={18} /> Solo Corte 1
                </button>
                <button 
                  onClick={() => handleCreateModules('corte2')}
                  disabled={bulkCreateLoading}
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", padding: "15px", borderRadius: "16px", color: "var(--text-main)", fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                  className="hover-glow"
                >
                  <Folder size={18} /> Solo Corte 2
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button className="btn-secondary" onClick={() => setShowModuleCreationModal(false)} disabled={bulkCreateLoading} style={{ width: "100%" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .player-container { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); display: flex; width: 100%; }
        .player-sidebar { transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1), padding 0.4s ease; min-width: 0; flex-shrink: 0; }
        
        @media (min-width: 769px) {
          .player-sidebar.collapsed { width: 80px !important; padding: 30px 10px !important; }
          .player-sidebar.collapsed .syllabus-item { justify-content: center; padding: 15px 0; }
          .player-sidebar.collapsed .syllabus-item span { display: none; }
        }
        
        .player-main { flex: 1; min-width: 0; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); overflow-x: hidden; }

        .syllabus-nav::-webkit-scrollbar { width: 4px; }
        .syllabus-nav::-webkit-scrollbar-track { background: transparent; }
        .syllabus-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .syllabus-nav::-webkit-scrollbar-thumb:hover { background: var(--brand-primary); }

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

