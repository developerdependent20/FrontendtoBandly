"use client";

import React, { useRef, useState, useEffect } from "react";
import { MessageCircle, Heart, Share2, Plus, X, Image as ImageIcon, Smile, Trash2 } from "lucide-react";

export const CLANStoriesFeed = ({ 
  firstName, 
  profile, 
  communityPosts, 
  setCommunityPosts,
  activeAuthors,
  userLikes,
  setUserLikes,
  expandedPosts,
  setExpandedPosts,
  commentsMap,
  setCommentsMap,
  newCommentText,
  setNewCommentText,
  postText,
  setPostText,
  postMedia,
  setPostMedia,
  isExpanded,
  setIsExpanded,
  postMode,
  setPostMode,
  showEmojiPicker,
  setShowEmojiPicker,
  isPosting,
  setIsPosting,
  fetchCommunityPosts,
  toggleLike,
  toggleComments,
  handleCreateComment,
  handleCreatePost,
  handleDeletePost,
  handleDeleteComment,
  addEmoji 
}: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Para auto-play de videos y Bottom Sheet de comentarios
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState<string | null>(null);

  // Intersection Observer para Auto-play
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActivePostId(entry.target.id);
          const video = entry.target.querySelector('video');
          if (video) {
             video.play().catch(e => console.log("Auto-play prevented", e));
          }
        } else {
          const video = entry.target.querySelector('video');
          if (video) video.pause();
        }
      });
    }, { threshold: 0.6 });

    const postElements = document.querySelectorAll('.clan-post-container');
    postElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [communityPosts]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'CLAN Feed',
        text: 'Mira esta publicación en la Plataforma CLAN',
        url: window.location.origin + '/dashboard',
      }).catch(err => console.error(err));
    } else {
      navigator.clipboard.writeText(window.location.origin + '/dashboard');
      alert("Enlace copiado al portapapeles.");
    }
  };

  const StoriesBar = ({ authors, onAddClick }: { authors: any[], onAddClick: () => void }) => {
    return (
      <div className="custom-scrollbar" style={{ display: "flex", gap: "15px", overflowX: "auto", padding: "80px 20px 15px 20px", background: "linear-gradient(to bottom, #000 0%, transparent 100%)", position: "absolute", top: 0, left: 0, right: 0, zIndex: 40, pointerEvents: "auto" }}>
        {/* Tu historia */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer", flexShrink: 0 }} onClick={() => { setPostMode("story"); onAddClick(); }}>
          <div style={{ width: "65px", height: "65px", borderRadius: "50%", background: "var(--bg-darker)", border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="tu avatar" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
             ) : (
               <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "white" }}>{firstName.substring(0,2)}</span>
             )}
             <div style={{ position: "absolute", bottom: -2, right: -2, background: "#3b82f6", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #000", zIndex: 2 }}>
                <Plus size={14} color="white" />
             </div>
          </div>
          <span style={{ fontSize: "0.75rem", color: "white", opacity: 0.8, textShadow: "0 1px 2px #000" }}>Tu historia</span>
        </div>

        {/* Historias de la comunidad */}
        {authors.map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer", flexShrink: 0 }}>
            <div style={{ padding: "3px", borderRadius: "50%", background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
               <div style={{ width: "59px", height: "59px", borderRadius: "50%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #000", overflow: "hidden" }}>
                 {s.avatar_url ? (
                   <img src={s.avatar_url} alt={s.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                 ) : (
                   <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "white" }}>{s.full_name?.substring(0, 2).toUpperCase()}</span>
                 )}
               </div>
            </div>
            <span style={{ fontSize: "0.75rem", color: "white", opacity: 0.8, maxWidth: "65px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 2px #000" }}>{s.full_name?.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width: "100%", height: "100dvh", background: "#000", position: "relative", display: "flex", flexDirection: "column" }}>
      
      {/* Floating Header */}
      <header style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, padding: "20px 20px 20px 76px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", pointerEvents: "none" }}>
         <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", letterSpacing: "-1px", color: "white", margin: 0, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>CLAN Feed</h2>
         <button onClick={() => { setPostMode("post"); setIsExpanded(true); }} style={{ pointerEvents: "auto", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.3)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", padding: "8px 15px", borderRadius: "20px" }}>
            <Plus size={18} /> Crear
         </button>
      </header>

      {/* Stories Bar Superpuesta */}
      <StoriesBar authors={activeAuthors} onAddClick={() => setIsExpanded(true)} />

      {/* Vertical Snapping Feed */}
      <div className="vertical-snap-container" style={{ width: "100%", height: "100%", overflowY: "scroll", scrollSnapType: "y mandatory", scrollBehavior: "smooth" }}>
        
        {communityPosts.map((post: any) => (
          <div key={post.id} id={`post-${post.id}`} className="clan-post-container" style={{ width: "100%", height: "100dvh", scrollSnapAlign: "start", position: "relative", display: "flex", justifyContent: "center", alignItems: "center", background: "#000" }}>
            
            {/* Background Image / Video (Blurred for desktop layout aesthetics) */}
            {post.media_url && (
              <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${post.media_type === 'image' ? post.media_url : ''})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(40px) brightness(0.3)", zIndex: 0 }} />
            )}

            {/* Media Content */}
            <div style={{ position: "relative", width: "100%", maxWidth: "500px", height: "100%", zIndex: 1, display: "flex", justifyContent: "center", alignItems: "center", background: "#000" }}>
              {post.media_url ? (
                post.media_type === 'video' ? (
                  <video 
                    src={post.media_url} 
                    loop
                    controls={false}
                    muted={false} /* Permite sonido si el usuario interactuó */
                    playsInline
                    onClick={(e) => {
                       const v = e.currentTarget;
                       if(v.paused) v.play(); else v.pause();
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "pointer" }} 
                  />
                ) : (
                  <img src={post.media_url} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                )
              ) : (
                <div style={{ width: "100%", padding: "20px", display: "flex", justifyContent: "center" }}>
                   <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "25px", width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "15px", backdropFilter: "blur(10px)", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                       <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
                          {post.profiles?.avatar_url ? (
                            <img src={post.profiles.avatar_url} alt={post.profiles.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "white" }}>{post.profiles?.full_name?.substring(0, 2).toUpperCase() || "??"}</span>
                          )}
                       </div>
                       <div style={{ display: "flex", flexDirection: "column" }}>
                         <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "white" }}>{post.profiles?.full_name}</span>
                         <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>@{post.profiles?.full_name?.split(" ")[0].toLowerCase() || "usuario"}</span>
                       </div>
                     </div>
                     <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.9)", fontWeight: 400, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                       {post.content_text}
                     </p>
                   </div>
                </div>
              )}
            </div>

            {/* Overlay UI (Bottom Left - Caption) */}
            <div style={{ position: "absolute", bottom: "30px", left: "20px", zIndex: 10, maxWidth: "70%", display: "flex", flexDirection: "column", gap: "10px", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
              {post.media_url && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                   <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", overflow: "hidden" }}>
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} alt={post.profiles.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "white" }}>{post.profiles?.full_name?.substring(0, 2).toUpperCase() || "??"}</span>
                      )}
                   </div>
                   <span style={{ fontSize: "1rem", fontWeight: 700, color: "white" }}>@{post.profiles?.full_name?.split(" ")[0] || "usuario"}</span>
                </div>
              )}
              {post.media_url && post.content_text && (
                 <p style={{ color: "white", fontSize: "0.95rem", margin: 0, lineHeight: 1.4, opacity: 0.9 }}>
                   {post.content_text}
                 </p>
              )}
              {profile?.id === post.author_id && (
                 <button onClick={() => handleDeletePost(post.id)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", padding: 0, fontSize: "0.75rem", width: "fit-content", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color="#ef4444"} onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,0.3)"}>
                    <Trash2 size={14} /> Eliminar
                 </button>
              )}
            </div>

            {/* Overlay UI (Bottom Right - Actions) */}
            <div style={{ position: "absolute", bottom: "30px", right: "20px", zIndex: 10, display: "flex", flexDirection: "column", gap: "25px", alignItems: "center" }}>
               
               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                 <button onClick={() => toggleLike(post.id)} style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", border: "none", color: "white", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "0.2s transform ease" }} onMouseDown={e => e.currentTarget.style.transform="scale(0.9)"} onMouseUp={e => e.currentTarget.style.transform="scale(1)"}>
                    <Heart size={26} style={{ color: userLikes.includes(post.id) ? "#ef4444" : "white", fill: userLikes.includes(post.id) ? "#ef4444" : "none", transition: "all 0.2s" }} />
                 </button>
                 <span style={{ color: "white", fontSize: "0.85rem", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{post.likes_count}</span>
               </div>

               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                 <button onClick={() => setShowCommentsModal(post.id)} style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", border: "none", color: "white", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <MessageCircle size={26} />
                 </button>
                 <span style={{ color: "white", fontSize: "0.85rem", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{post.comments_count}</span>
               </div>

               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                 <button onClick={handleShare} style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", border: "none", color: "white", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Share2 size={26} />
                 </button>
                 <span style={{ color: "white", fontSize: "0.85rem", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>Compartir</span>
               </div>
            </div>
          </div>
        ))}

        {communityPosts.length === 0 && (
          <div style={{ width: "100%", height: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000" }}>
             <div style={{ padding: "20px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", marginBottom: "20px" }}>
                <ImageIcon size={40} color="white" />
             </div>
             <h3 style={{ fontSize: "1.5rem", marginBottom: "10px", color: "white" }}>Aún no hay publicaciones</h3>
             <p style={{ opacity: 0.5, color: "white" }}>Sé el primero en compartir algo con CLAN.</p>
          </div>
        )}
      </div>

      {/* COMMENTS BOTTOM SHEET MODAL */}
      {showCommentsModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {/* Fondo oscuro para cerrar */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCommentsModal(null)} />
          
          <div style={{ background: "var(--bg-card)", width: "100%", height: "65vh", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", position: "relative", zIndex: 1001, display: "flex", flexDirection: "column", boxShadow: "0 -10px 40px rgba(0,0,0,0.5)", animation: "slideUp 0.3s ease-out" }}>
            
            <div style={{ padding: "15px", textAlign: "center", borderBottom: "1px solid var(--glass-border)", position: "relative" }}>
               <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.2)", borderRadius: "2px", margin: "0 auto 15px auto" }} />
               <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>Comentarios</h3>
               <button onClick={() => setShowCommentsModal(null)} style={{ position: "absolute", right: "15px", top: "15px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }} className="custom-scrollbar">
               {(commentsMap[showCommentsModal] || []).length === 0 ? (
                 <p style={{ textAlign: "center", opacity: 0.5, marginTop: "50px" }}>Sé el primero en comentar.</p>
               ) : (
                 <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                   {(commentsMap[showCommentsModal] || []).map((comment: any) => (
                      <div key={comment.id} style={{ display: "flex", gap: "15px", position: "relative" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--bg-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                           <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>{comment.profiles?.full_name?.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                           <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>{comment.profiles?.full_name}</span>
                           <p style={{ fontSize: "0.95rem", margin: 0, wordBreak: "break-word" }}>{comment.content_text}</p>
                        </div>
                        {profile?.id === comment.author_id && (
                           <button 
                             onClick={() => handleDeleteComment(showCommentsModal, comment.id)}
                             style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                             className="hover-coral"
                           >
                              <Trash2 size={16} />
                           </button>
                        )}
                      </div>
                   ))}
                 </div>
               )}
            </div>

            <div style={{ padding: "15px 20px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: "10px", alignItems: "center", background: "var(--bg-page)" }}>
               <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--brand-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontWeight: "bold", fontSize: "0.8rem" }}>
                 {firstName.substring(0, 2).toUpperCase()}
               </div>
               <input 
                 type="text" 
                 placeholder="Añade un comentario..."
                 value={newCommentText[showCommentsModal] || ""}
                 onChange={(e) => setNewCommentText((prev:any) => ({ ...prev, [showCommentsModal]: e.target.value }))}
                 onKeyDown={(e) => { if (e.key === 'Enter') handleCreateComment(showCommentsModal); }}
                 style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "10px 15px", color: "var(--text-main)", fontSize: "0.9rem", outline: "none" }}
               />
               <button 
                 onClick={() => handleCreateComment(showCommentsModal)} 
                 disabled={!(newCommentText[showCommentsModal] || "").trim()}
                 style={{ background: "none", border: "none", color: "var(--brand-secondary)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", opacity: !(newCommentText[showCommentsModal] || "").trim() ? 0.5 : 1 }}
               >
                 Publicar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE POST MODAL */}
      {isExpanded && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", animation: "fadeIn 0.2s ease-out" }}>
           <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: "550px", borderRadius: "24px", border: "1px solid var(--glass-border)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
              {/* Header Modal */}
              <div style={{ borderBottom: "1px solid var(--glass-border)", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <button onClick={() => { setIsExpanded(false); setPostText(""); setPostMedia(null); setShowEmojiPicker(false); }} style={{ background: "none", border: "none", color: "var(--text-main)", cursor: "pointer", padding: 0 }}><X size={24} /></button>
                 <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>Crear Reel / Publicación</p>
                  <button 
                    onClick={handleCreatePost}
                    disabled={isPosting || (!postText.trim() && !postMedia)}
                    style={{ background: isPosting ? "rgba(0,82,255,0.1)" : "var(--brand-primary)", color: "white", border: "none", fontWeight: 800, fontSize: "0.9rem", opacity: (isPosting || (!postText.trim() && !postMedia)) ? 0.4 : 1, cursor: isPosting ? "not-allowed" : "pointer", padding: "8px 18px", borderRadius: "20px", transition: "0.2s" }}
                  >
                     {isPosting ? "⏳ Publicando..." : "Publicar"}
                  </button>
              </div>

              {/* Body Modal */}
              <div style={{ display: "flex", flexDirection: "column", maxHeight: "70vh", overflowY: "auto" }} className="custom-scrollbar">
                 <div style={{ padding: "20px", display: "flex", gap: "15px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--bg-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: "bold" }}>
                      {firstName.substring(0,2)}
                    </div>
                    <textarea 
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      placeholder="Escribe un pie de foto para tu video o foto..."
                      style={{ width: "100%", background: "none", border: "none", outline: "none", color: "var(--text-main)", fontSize: "1.1rem", resize: "none", minHeight: "100px", fontFamily: "inherit" }}
                      autoFocus
                    />
                 </div>

                 {postMedia && (
                    <div style={{ position: "relative", width: "100%", background: "#000", borderTop: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                       {postMedia.type.startsWith("video") ? (
                         <video src={URL.createObjectURL(postMedia)} style={{ maxHeight: "400px", maxWidth: "100%", objectFit: "contain" }} controls />
                       ) : (
                         <img src={URL.createObjectURL(postMedia)} style={{ maxHeight: "400px", maxWidth: "100%", objectFit: "contain" }} />
                       )}
                       <button onClick={() => setPostMedia(null)} style={{ position: "absolute", top: "15px", right: "15px", background: "rgba(0,0,0,0.6)", border: "none", color: "white", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}><Trash2 size={16} /></button>
                    </div>
                 )}
                 
                 {/* Footer Modal (Acciones adjuntar) */}
                 <div style={{ padding: "15px 20px", display: "flex", gap: "20px", alignItems: "center", position: "relative", background: "var(--bg-page)" }}>
                    <input type="file" ref={fileInputRef} accept="image/*,video/*" hidden onChange={(e) => e.target.files?.[0] && setPostMedia(e.target.files[0])} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "10px 15px", color: "var(--text-main)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }} className="hover-glow">
                       <ImageIcon size={20} /> <span style={{fontSize: "0.9rem", fontWeight: 700}}>Subir Media</span>
                    </button>
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "10px", color: "var(--text-main)", cursor: "pointer" }} className="hover-glow">
                       <Smile size={20} />
                    </button>
                 </div>

                 {showEmojiPicker && (
                    <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "10px", background: "var(--bg-page)" }}>
                       {["🔥", "🚀", "💪", "✅", "🏆", "🌟", "🎯", "⚡", "🙌", "💯", "🔥", "💻", "✨", "🏟️", "⚽", "👏", "🤩", "🤝", "🥊", "🏋️"].map((emoji, index) => (
                          <button key={index} onClick={() => addEmoji(emoji)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", transition: "0.2s" }} className="hover-scale">
                             {emoji}
                          </button>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Global Styles specific to this view */}
      <style dangerouslySetInnerHTML={{__html: `
        .vertical-snap-container::-webkit-scrollbar {
          display: none;
        }
        .vertical-snap-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />
    </div>
  );
};
