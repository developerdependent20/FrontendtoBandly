"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createIcons, icons } from "lucide";
import { createClient } from "@/utils/supabase/client";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { CourseCatalog } from "@/components/dashboard/CourseCatalog";
import { CLANStoriesFeed } from "@/components/dashboard/CLANStoriesFeed";
import { trackDailyActivity } from "@/utils/supabase/streakManager";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function StudentDashboard() {
  const [activeView, setActiveView] = useState("dashboard");
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [activeAuthors, setActiveAuthors] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [postMode, setPostMode] = useState<"post" | "story">("post");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [postText, setPostText] = useState("");
  const [postMedia, setPostMedia] = useState<File | null>(null);
  
  const [streakData, setStreakData] = useState<{currentStreak: number, history: string[]} | null>(null);

  // Estados para comentarios y likes persistentes
  const [userLikes, setUserLikes] = useState<string[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [commentsMap, setCommentsMap] = useState<{[key: string]: any[]}>({});
  const [newCommentText, setNewCommentText] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch Profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profileData) setProfile(profileData);

        const streak = await trackDailyActivity();
        if (streak) setStreakData(streak);

        // Fetch courses with personal progress
        const { data: myEnrollments } = await supabase
          .from("enrollments")
          .select("course_id, completed_modules")
          .eq("user_id", user.id);

        const progressMap = new Map(myEnrollments?.map(e => [e.course_id, e.completed_modules || []]) || []);

        if (profileData?.role === "admin") {
            const { data: allCourses } = await supabase
              .from("courses")
              .select("*, modules(count)")
              .eq("is_active", true)
              .order("created_at", { ascending: false });
            
            if (allCourses) {
               const mapped = allCourses.map(c => ({
                  ...c,
                  actual_total_modules: c.modules?.[0]?.count || 0,
                  completed_modules: progressMap.get(c.id) || []
               }));
               setCourses(mapped);
            }
        } else {
            const { data: enrolledData } = await supabase
              .from("enrollments")
              .select(`course_id, completed_modules, courses (*, modules(count))`)
              .eq("user_id", user.id);
              
            if (enrolledData) {
               const activeCourses = enrolledData
                  .filter((e:any) => e.courses !== null)
                  .map((e:any) => ({
                    ...e.courses,
                    actual_total_modules: e.courses.modules?.[0]?.count || 0,
                    completed_modules: e.completed_modules || []
                  }))
                  .sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
               setCourses(activeCourses);
            }
        }
      }
      setLoading(false);
    };

    fetchStudentData();
  }, []);
  
  const fetchCommunityPosts = async () => {
    const { data, error } = await supabase
      .from("community_posts")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      // Filtrar posts normales (que no son stories o stories que no expiran aquí, aunque deberíamos separar)
      const feedItems = data.filter(d => d.is_story !== true);
      setCommunityPosts(feedItems);

      // Extraemos autores reales únicos que tengan historias activas
      const now = new Date().toISOString();
      const activeStories = data.filter(d => d.is_story === true && d.expires_at && d.expires_at > now);
      
      const authors = activeStories.reduce((acc: any[], current: any) => {
        if (current.profiles && !acc.some(a => a.id === current.author_id)) {
          acc.push({ id: current.author_id, full_name: current.profiles.full_name });
        }
        return acc;
      }, []);
      setActiveAuthors(authors);

      // Detectar likes del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: likes } = await supabase.from("community_likes").select("post_id").eq("user_id", user.id);
        if (likes) setUserLikes(likes.map(l => l.post_id));
      }
    }
  };

  useEffect(() => {
    if (activeView === "community" || activeView === "dashboard") {
      fetchCommunityPosts();
    }
  }, [activeView]);

  const toggleLike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const hasLiked = userLikes.includes(postId);
    const targetPost = communityPosts.find(p => p.id === postId);
    if (!targetPost) return;

    if (hasLiked) {
      // Remover like
      const newCount = Math.max(0, targetPost.likes_count - 1);
      setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: newCount } : p));
      setUserLikes(prev => prev.filter(id => id !== postId));
      
      await supabase.from("community_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      await supabase.from("community_posts").update({ likes_count: newCount }).eq("id", postId);
    } else {
      // Añadir like
      const newCount = (targetPost.likes_count || 0) + 1;
      setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: newCount } : p));
      setUserLikes(prev => [...prev, postId]);
      
      await supabase.from("community_likes").insert({ post_id: postId, user_id: user.id });
      await supabase.from("community_posts").update({ likes_count: newCount }).eq("id", postId);
    }
  };

  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from("community_comments")
      .select("*, profiles(full_name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    
    if (!error && data) {
      setCommentsMap(prev => ({ ...prev, [postId]: data }));
    }
  };

  const toggleComments = (postId: string) => {
    if (expandedPosts.includes(postId)) {
      setExpandedPosts(prev => prev.filter(id => id !== postId));
    } else {
      setExpandedPosts(prev => [...prev, postId]);
      fetchComments(postId);
    }
  };

  const handleCreateComment = async (postId: string) => {
    const text = newCommentText[postId];
    if (!text?.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      author_id: user.id,
      content_text: text
    });

    if (error) {
      console.error("Comment error:", error);
      alert(`Error al comentar: ${error.message}`);
    } else {
      const targetPost = communityPosts.find(p => p.id === postId);
      const newCount = (targetPost?.comments_count || 0) + 1;

      setNewCommentText(prev => ({ ...prev, [postId]: "" }));
      fetchComments(postId);
      setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: newCount } : p));
      
      await supabase.from("community_posts").update({ comments_count: newCount }).eq("id", postId);
    }
  };

  const handleCreatePost = async () => {
    if (!postText.trim() && !postMedia) {
      console.log("No content to post");
      return;
    }
    setIsPosting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes iniciar sesión para publicar.");
        setIsPosting(false);
        return;
      }

      let mediaUrl = null;
      let mediaType = null;

      if (postMedia) {
        const path = `community/${Date.now()}_${postMedia.name}`;
        console.log("Uploading to community-media bucket...", path);
        
        const { error: upError } = await supabase.storage.from("community-media").upload(path, postMedia);
        
        if (upError) {
          console.error("Storage Error:", upError);
          alert(`Error al subir archivo: ${upError.message}. Verifica que el bucket 'community-media' existe en Supabase.`);
          setIsPosting(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage.from("community-media").getPublicUrl(path);
        mediaUrl = publicUrl;
        mediaType = postMedia.type.startsWith("video") ? "video" : "image";
      }

      let expiresAt = null;
      let isStory = (postMode === "story");
      if (isStory) {
         const date = new Date();
         date.setHours(date.getHours() + 24);
         expiresAt = date.toISOString();
      }

      console.log("Inserting post into community_posts...");
      const { error } = await supabase.from("community_posts").insert({
        author_id: user.id,
        content_text: postText,
        media_url: mediaUrl,
        media_type: mediaType,
        is_story: isStory,
        expires_at: expiresAt
      });

      if (error) {
        console.error("Database Error:", error);
        alert(`Error al publicar: ${error.message}`);
      } else {
        console.log("Post published successfully!");
        setPostText("");
        setPostMedia(null);
        setIsExpanded(false);
        setShowEmojiPicker(false);
        fetchCommunityPosts();
      }
    } catch (err) {
      console.error("Unexpected Error:", err);
      alert("Ocurrió un error inesperado al publicar.");
    } finally {
      setIsPosting(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setPostText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres borrar esta publicación?")) return;
    
    const { error } = await supabase.from("community_posts").delete().eq("id", postId);
    
    if (error) {
      alert(`Error al borrar: ${error.message}`);
    } else {
      setCommunityPosts(prev => prev.filter(p => p.id !== postId));
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm("¿Borrar este comentario?")) return;
    
    const { error } = await supabase.from("community_comments").delete().eq("id", commentId);
    
    if (error) {
      alert(`Error al borrar: ${error.message}`);
    } else {
      const targetPost = communityPosts.find(p => p.id === postId);
      const newCount = Math.max(0, (targetPost?.comments_count || 0) - 1);

      setCommentsMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
      }));
      setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: newCount } : p));
      
      await supabase.from("community_posts").update({ comments_count: newCount }).eq("id", postId);
    }
  };

  useEffect(() => {
    createIcons({ icons });
  }, [activeView, courses, profile, isMobileMenuOpen, communityPosts, activeAuthors, isExpanded, showEmojiPicker, expandedPosts, commentsMap]);

  const firstName = profile?.full_name ? profile.full_name.split(" ")[0] : "Estudiante";

  const calculateMastery = () => {
    const totalCourses = courses.length;
    const completedModules = courses.reduce((acc, c) => acc + (c.completed_modules?.length || 0), 0);
    const evPoints = profile?.ev_points || 0;

    return [
      Math.min(1, 0.2 + (completedModules * 0.05)),
      Math.min(1, 0.3 + (totalCourses > 0 ? 0.4 : 0)),
      Math.min(1, 0.25 + (courses.filter(c => c.category === "Deporte").length * 0.2)),
      Math.min(1, 0.2 + (courses.filter(c => (c.completed_modules?.length || 0) >= (c.total_modules || 1)).length * 0.4)),
      Math.min(1, 0.15 + ((profile?.ev_points || 0) / 1000))
    ];
  };

  const masteryData = calculateMastery();

  const SkillRadar = ({ data, size = 450 }: { data: number[], size?: number }) => {
    const labels = ["Técnica", "Constancia", "Enfoque", "Disciplina", "Proyectos"];
    const radius = size * 0.32;
    const center = { x: size / 2, y: size / 2 };
    
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0", width: "100%" }}>
        <svg width="100%" height={size} viewBox={`-45 -45 ${size + 90} ${size + 90}`} style={{ maxWidth: "100%", overflow: "visible" }}>
          {/* Hexagono Base */}
          {[0.2, 0.4, 0.6, 0.8, 1].map((r, idx) => {
            return (
              <polygon 
                key={idx}
                points={Array.from({length: 5}).map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                  return `${center.x + radius * r * Math.cos(angle)},${center.y + radius * r * Math.sin(angle)}`;
                }).join(" ")}
                fill="none" 
                stroke="var(--glass-border)" 
                strokeWidth="1"
                opacity="0.3"
              />
            );
          })}
          {/* Ejes y Etiquetas */}
          {labels.map((label, i) => {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const xVal = center.x + radius * Math.cos(angle);
            const yVal = center.y + radius * Math.sin(angle);
            const xLabel = center.x + (radius + 40) * Math.cos(angle);
            const yLabel = center.y + (radius + 25) * Math.sin(angle);
            
            return (
              <g key={i}>
                <line x1={center.x} y1={center.y} x2={xVal} y2={yVal} stroke="var(--glass-border)" strokeWidth="1" />
                <text x={xLabel} y={yLabel} fill="var(--text-main)" fontSize="12" textAnchor="middle" style={{ fontWeight: 800, opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font-outfit)" }}>
                  {label}
                </text>
              </g>
            );
          })}
          {/* Poligono de Datos */}
          <polygon 
            points={data.map((val, i) => {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              return `${center.x + radius * val * Math.cos(angle)},${center.y + radius * val * Math.sin(angle)}`;
            }).join(" ")} 
            fill="rgba(0, 82, 255, 0.2)" 
            stroke="var(--brand-primary)" 
            strokeWidth="3"
            style={{ transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
        </svg>
      </div>
    );
  };

  const StoriesBar = ({ authors, onAddClick }: { authors: any[], onAddClick: () => void }) => {
    return (
      <div className="stories-bar">
        <div className="story-item" onClick={onAddClick}>
          <div className="avatar-ring" style={{ border: "2px solid var(--accent-social)" }}>
             <div className="avatar-inner">
               <i data-lucide="plus" style={{width: 22, color: "var(--accent-social)"}}></i>
             </div>
          </div>
          <span style={{ fontSize: "0.7rem", fontWeight: 800 }}>Tú</span>
        </div>
        {authors.map((s, i) => (
          <div key={i} className="story-item">
            <div className="avatar-ring" style={{ background: "linear-gradient(45deg, var(--accent-social), var(--yellow-primary))" }}>
               <div className="avatar-inner" style={{ border: "2px solid var(--bg-dark)" }}>{s.full_name?.substring(0, 2).toUpperCase()}</div>
            </div>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.full_name?.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="dashboard-container" style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      {/* Background Ornaments */}
      <div className="bg-ornaments">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Mobile Top-Level Controls */}
      <button className="mobile-menu-btn" aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        <i data-lucide={isMobileMenuOpen ? "x" : "menu"} aria-hidden="true" style={{ width: 24, height: 24 }}></i>
      </button>
      <div className={`mobile-overlay ${isMobileMenuOpen ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}></div>

      <DashboardSidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
        activeView={activeView} 
        setActiveView={setActiveView} 
        streakData={streakData}
      />

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header" style={{ padding: "40px", background: "transparent", borderBottom: "1px solid var(--glass-border)", backdropFilter: "blur(10px)" }}>
          <div>
            <h1 style={{ fontSize: "2.4rem", marginBottom: "5px", color: "var(--text-main)", fontWeight: 800 }}>
              Bienvenid@, <span className="art-text" style={{ color: "var(--brand-primary)" }}>{firstName}.</span>
            </h1>
            <p style={{ fontSize: "1rem", opacity: 0.6, color: "var(--text-muted)", fontWeight: 500 }}>Tu ruta de desarrollo integral está activa.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {profile?.role === "admin" && (
                <button 
                  onClick={() => window.location.href = "/admin"} 
                  style={{ padding: "10px 20px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "20px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "0.2s" }}
                >
                  <i data-lucide="settings" aria-hidden="true" style={{width: "16px"}}></i> <span style={{fontSize: "0.85rem", fontWeight: "bold"}}>Panel de Control</span>
                </button>
            )}
            <button aria-label="Ver notificaciones" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "50%", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" }}>
              <i data-lucide="bell" aria-hidden="true" style={{ width: "20px" }}></i>
            </button>
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setDropdownOpen(prev => !prev)}
                title="Mi Cuenta"
                aria-label="Abrir menú de cuenta"
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                style={{ width: "48px", height: "48px", background: "var(--brand-primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", textTransform: "uppercase", border: "none", cursor: "pointer", transition: "transform 0.2s", fontSize: "0.95rem", boxShadow: "0 10px 20px rgba(0, 82, 255, 0.3)" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {firstName.substring(0, 2)}
              </button>

              {dropdownOpen && (
                <div style={{ position: "fixed", top: "70px", right: "30px", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", borderRadius: "14px", padding: "8px", minWidth: "180px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", zIndex: 9999 }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--glass-border)", marginBottom: "6px" }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{profile?.full_name || firstName}</p>
                    <p style={{ fontSize: "0.72rem", opacity: 0.5, color: "var(--text-secondary)", margin: 0, textTransform: "capitalize" }}>{profile?.role || "Estudiante"}</p>
                  </div>
                  <button 
                    onClick={async () => { 
                      setDropdownOpen(false);
                      await supabase.auth.signOut(); 
                      window.location.href = "/login"; 
                    }} 
                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "10px 14px", borderRadius: "8px", fontSize: "0.9rem", textAlign: "left", fontWeight: 600 }} 
                    onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.1)"} 
                    onMouseLeave={e => e.currentTarget.style.background="none"}
                  >
                    <i data-lucide="log-out" aria-hidden="true" style={{ width: "16px" }}></i> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeView === "dashboard" && (
          <div className="dashboard-view active">
            <div className="continue-grid">
              <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: "24px", padding: "40px" }}>
                <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "250px", height: "250px", background: "var(--brand-primary)", opacity: 0.05, filter: "blur(50px)", borderRadius: "50%" }}></div>
                <div>
                  <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: "20px", background: "rgba(0, 82, 255, 0.1)", color: "var(--brand-primary)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>Continuar donde lo dejaste</span>
                  <h2 className="art-text" style={{ fontSize: "2.4rem", marginBottom: "12px", color: "var(--text-main)" }}>
                    {courses.length > 0 ? courses[0].title : "Inicia tu primer programa"}
                  </h2>
                  <p style={{ maxWidth: "420px", marginBottom: "30px", color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.6 }}>Enfócate en tu crecimiento diario y alcanza nuevos niveles de maestría.</p>
                </div>
                {courses.length > 0 ? (
                  <Link href={`/course?id=${courses[0].id}`} className="btn-primary" style={{ width: "fit-content", padding: "14px 30px" }}>Seguir Rutas <i data-lucide="zap" aria-hidden="true" className="icon" style={{ width: "18px", marginLeft: "10px" }}></i></Link>
                ) : (
                   <button className="btn-primary" onClick={() => setActiveView("courses")} style={{ width: "fit-content", padding: "14px 30px" }}>Ver Catálogo <i data-lucide="zap" aria-hidden="true" className="icon" style={{ width: "18px", marginLeft: "10px" }}></i></button>
                )}
              </div>

              <div className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "25px" }}>
                  <div>
                    <p style={{ textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.75rem", fontWeight: 800, color: "var(--brand-primary)", marginBottom: "5px" }}>Racha Activa</p>
                    {streakData && (
                      <div className="group relative flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full cursor-default border border-white/5 transition-all hover:bg-white/10 hover:scale-105">
                        <span style={{ fontSize: "1.1rem" }}>⚡</span>
                        <span className="font-outfit font-bold text-sm tracking-wide" style={{ color: streakData.currentStreak > 0 ? "var(--brand-primary)" : "var(--text-muted)" }}>
                          {streakData.currentStreak}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "5px" }}>Maestría CLAN</p>
                    <h4 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)" }}>Nivel {Math.floor((profile?.ev_points || 0) / 100) + 1}</h4>
                  </div>
                </div>
                <p style={{ fontSize: "0.8rem", opacity: 0.5, marginBottom: "10px" }}>Nivel Actual: <strong>Desarrollador Base</strong></p>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: "15%" }}></div>
                </div>
                <p style={{ fontSize: "0.75rem", marginTop: "15px", opacity: 0.4 }}>Próximo Rango: <strong>Estratega Bronce</strong> <span>(+2,550 EV)</span></p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px", marginTop: "30px" }}>
              {/* Radar Mini Widget */}
              <div className="stat-card" style={{ padding: "40px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <h3 className="art-text" style={{ fontSize: "1.8rem", color: "var(--brand-primary)", marginBottom: "20px", textAlign: "center" }}>Tu Radar Base</h3>
                  <div className="radar-mini-container" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <SkillRadar data={masteryData} size={320} />
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", opacity: 0.7, marginTop: "20px", textAlign: "center", maxWidth: "250px", lineHeight: 1.5 }}>
                    Tu perfil se actualiza dinámicamente con cada hito completado.
                  </p>
              </div>

              {/* Feed Preview Card */}
              <div className="stat-card" style={{ padding: "40px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "30px" }}>
                  <h3 className="art-text" style={{ fontSize: "1.8rem", color: "var(--text-main)" }}>Inspiración <span style={{ color: "var(--brand-primary)" }}>Global.</span></h3>
                  <button onClick={() => setActiveView("community")} style={{ background: "none", border: "none", color: "var(--brand-primary)", fontSize: "0.85rem", fontWeight: 800, cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px" }}>Ver todo →</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {communityPosts.slice(0, 3).map(post => (
                    <div key={post.id} style={{ display: "flex", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "14px", border: "1px solid var(--glass-border)" }}>
                      <div className="avatar-ring" style={{ width: "32px", height: "32px", padding: "1.5px", flexShrink: 0 }}>
                        <div className="avatar-inner" style={{ fontSize: "0.6rem" }}>
                          {post.profiles?.full_name?.substring(0, 2).toUpperCase() || "??"}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{post.profiles?.full_name}</p>
                        <p style={{ fontSize: "0.8rem", opacity: 0.5, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.content_text}</p>
                      </div>
                    </div>
                  ))}
                  {communityPosts.filter(p => !p.is_story).length === 0 && <p style={{ opacity: 0.3, fontSize: "0.8rem", textAlign: "center", padding: "20px" }}>No hay actividad reciente.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "community" && (
          <CLANStoriesFeed 
            firstName={firstName}
            profile={profile}
            communityPosts={communityPosts}
            setCommunityPosts={setCommunityPosts}
            activeAuthors={activeAuthors}
            userLikes={userLikes}
            setUserLikes={setUserLikes}
            expandedPosts={expandedPosts}
            setExpandedPosts={setExpandedPosts}
            commentsMap={commentsMap}
            setCommentsMap={setCommentsMap}
            newCommentText={newCommentText}
            setNewCommentText={setNewCommentText}
            postText={postText}
            setPostText={setPostText}
            postMedia={postMedia}
            setPostMedia={setPostMedia}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            postMode={postMode}
            setPostMode={setPostMode}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            isPosting={isPosting}
            setIsPosting={setIsPosting}
            fetchCommunityPosts={fetchCommunityPosts}
            toggleLike={toggleLike}
            toggleComments={toggleComments}
            handleCreateComment={handleCreateComment}
            handleCreatePost={handleCreatePost}
            handleDeletePost={handleDeletePost}
            handleDeleteComment={handleDeleteComment}
            addEmoji={addEmoji}
          />
        )}

        {activeView === "courses" && (
          <CourseCatalog courses={courses} loading={loading} />
        )}

        {activeView === "certs" && (
          <div className="dashboard-view active">
            <h2 className="art-text" style={{ fontSize: "2.8rem", marginBottom: "40px", color: "var(--text-main)" }}>
              Hitos de <span style={{ color: "var(--brand-primary)" }}>Talento.</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px" }}>
              <div className="stat-card" style={{ border: "1px dashed var(--glass-border)", position: "relative", overflow: "hidden", opacity: 0.6, textAlign: "center", padding: "60px 40px", borderRadius: "24px" }}>
                <i data-lucide="lock" aria-hidden="true" style={{ width: "48px", height: "48px", marginBottom: "20px", color: "var(--brand-primary)", margin: "0 auto 20px auto" }}></i>
                <h4 style={{ margin: 0, fontSize: "1.4rem", marginBottom: "10px", color: "var(--text-main)", fontWeight: 800 }}>Aún no hay hitos registrados</h4>
                <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6 }}>Continúa tu desarrollo integral para desbloquear hitos de alto rendimiento y potenciar tu perfil profesional.</p>
              </div>
            </div>
          </div>
        )}

        {activeView !== "dashboard" && activeView !== "community" && activeView !== "courses" && activeView !== "certs" && (
           <div style={{ padding: "40px", opacity: 0.5, textAlign: "center" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif" }}>Sección en desarrollo pedagógico...</h2>
           </div>
        )}
      </main>
    </div>
  );
}


