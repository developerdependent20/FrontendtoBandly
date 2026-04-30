"use client";

import React, { useRef, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

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

  const StoriesBar = ({ authors, onAddClick }: { authors: any[], onAddClick: () => void }) => {
    return (
      <div className="custom-scrollbar" style={{ display: "flex", gap: "15px", overflowX: "auto", paddingBottom: "15px", marginBottom: "30px", borderBottom: "1px solid var(--glass-border)" }}>
        {/* Tu historia */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer", flexShrink: 0 }} onClick={() => { setPostMode("story"); onAddClick(); }}>
          <div style={{ width: "65px", height: "65px", borderRadius: "50%", background: "var(--bg-darker)", border: "2px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
             <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "white" }}>{firstName.substring(0,2)}</span>
             <div style={{ position: "absolute", bottom: -2, right: -2, background: "#3b82f6", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-card)" }}>
                <i data-lucide="plus" style={{width: 14, color: "white"}}></i>
             </div>
          </div>
          <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>Tu historia</span>
        </div>

        {/* Historias de la comunidad */}
        {authors.map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer", flexShrink: 0 }}>
            <div style={{ padding: "3px", borderRadius: "50%", background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
               <div style={{ width: "59px", height: "59px", borderRadius: "50%", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-card)" }}>
                 <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "white" }}>{s.full_name?.substring(0, 2).toUpperCase()}</span>
               </div>
            </div>
            <span style={{ fontSize: "0.75rem", opacity: 0.8, maxWidth: "65px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.full_name?.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    );
  };

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

  return (
    <div className="dashboard-view active">
      <header style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
         <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.8rem", letterSpacing: "-1px" }} className="text-clan-gradient">CLAN <span style={{fontStyle: "italic", fontWeight: 400}}>Feed</span></h2>
         <button onClick={() => { setPostMode("post"); setIsExpanded(true); }} style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", padding: "8px 15px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)" }}>
            <i data-lucide="plus-square" style={{width: 20}}></i> Crear
         </button>
      </header>

      <StoriesBar authors={activeAuthors} onAddClick={() => setIsExpanded(true)} />

      {/* MODAL DE PUBLICACIÓN (Estilo Instagram) */}
      {isExpanded && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", animation: "fadeIn 0.2s ease-out" }}>
           <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: "550px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
              {/* Header Modal */}
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <button onClick={() => { setIsExpanded(false); setPostText(""); setPostMedia(null); setShowEmojiPicker(false); }} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 0 }}><i data-lucide="x" style={{width: 24}}></i></button>
                 <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{postMode === "story" ? "Nueva Historia (24h)" : "Nueva Publicación"}</p>
                 <button 
                   onClick={() => { handleCreatePost(); setIsExpanded(!isPosting && postText==="" && postMedia===null); }}
                   disabled={isPosting || (!postText.trim() && !postMedia)}
                   style={{ background: "none", color: "#3b82f6", border: "none", fontWeight: 700, fontSize: "1rem", opacity: (isPosting || (!postText.trim() && !postMedia)) ? 0.4 : 1, cursor: "pointer", padding: 0 }}
                 >
                    {isPosting ? "Subiendo..." : "Compartir"}
                 </button>
              </div>

              {/* Body Modal */}
              <div style={{ display: "flex", flexDirection: "column", maxHeight: "70vh", overflowY: "auto" }} className="custom-scrollbar">
                 <div style={{ padding: "20px", display: "flex", gap: "15px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--bg-darker)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: "bold" }}>
                      {firstName.substring(0,2)}
                    </div>
                    <textarea 
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      placeholder="Escribe un pie de foto o comparte una idea..."
                      style={{ width: "100%", background: "none", border: "none", outline: "none", color: "white", fontSize: "1.1rem", resize: "none", minHeight: "100px", fontFamily: "inherit" }}
                      autoFocus
                    />
                 </div>

                 {postMedia && (
                    <div style={{ position: "relative", width: "100%", background: "#000", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                       {postMedia.type.startsWith("video") ? (
                         <video src={URL.createObjectURL(postMedia)} style={{ maxHeight: "400px", maxWidth: "100%", objectFit: "contain" }} controls />
                       ) : (
                         <img src={URL.createObjectURL(postMedia)} style={{ maxHeight: "400px", maxWidth: "100%", objectFit: "contain" }} />
                       )}
                       <button onClick={() => setPostMedia(null)} style={{ position: "absolute", top: "15px", right: "15px", background: "rgba(0,0,0,0.6)", border: "none", color: "white", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}><i data-lucide="trash-2" style={{width: 16}}></i></button>
                    </div>
                 )}
                 
                 {/* Footer Modal (Acciones adjuntar) */}
                 <div style={{ padding: "15px 20px", display: "flex", gap: "20px", alignItems: "center", position: "relative" }}>
                    <input type="file" ref={fileInputRef} accept="image/*,video/*" hidden onChange={(e) => e.target.files?.[0] && setPostMedia(e.target.files[0])} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", opacity: 0.8 }} className="hover-coral">
                       <i data-lucide="image" style={{width: 22}}></i> <span style={{fontSize: "0.9rem", fontWeight: 600}}>Foto / Video</span>
                    </button>
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.8 }} className="hover-coral">
                       <i data-lucide="smile" style={{width: 22}}></i>
                    </button>
                 </div>

                 {showEmojiPicker && (
                    <div style={{ padding: "0 20px 20px 20px", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "10px" }}>
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

      {/* Post Feed */}
      <div style={{ maxWidth: "550px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "35px" }}>
         {communityPosts.map((post: any) => (
           <article key={post.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "25px" }}>
               {/* Post Header */}
               <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "15px" }}>
                  <div style={{ padding: "2px", borderRadius: "50%", background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
                     <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--bg-darker)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-card)" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "white" }}>{post.profiles?.full_name?.substring(0, 2).toUpperCase() || "??"}</span>
                     </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                     <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "white" }}>{post.profiles?.full_name}</span>
                     <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>CLAN Feed</span>
                  </div>
                  
                  {profile?.id === post.author_id ? (
                     <button onClick={() => handleDeletePost(post.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }} className="hover-coral">
                       <i data-lucide="trash-2" style={{width: 18}}></i>
                     </button>
                  ) : (
                     <button style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                       <i data-lucide="more-horizontal" style={{width: 20}}></i>
                     </button>
                  )}
               </div>

               {/* Post Media (Impacto Visual al 100%) */}
               {post.media_url && (
                 <div style={{ width: "100%", borderRadius: "10px", overflow: "hidden", marginBottom: "15px", border: "1px solid rgba(255,255,255,0.05)", background: "#000" }}>
                    {post.media_type === 'video' ? (
                       <video src={post.media_url} controls muted style={{ width: "100%", maxHeight: "600px", display: "block", objectFit: "contain" }} />
                    ) : (
                       <img src={post.media_url} style={{ width: "100%", maxHeight: "600px", objectFit: "contain", display: "block" }} />
                    )}
                 </div>
               )}

               {/* Action Icons (Instagram Style) */}
               <div style={{ display: "flex", gap: "20px", marginBottom: "12px", color: "white" }}>
                  <button onClick={() => toggleLike(post.id)} style={{ background: "none", border: "none", color: "white", padding: 0, cursor: "pointer", transition: "0.1s transform ease" }} onMouseDown={e => e.currentTarget.style.transform="scale(0.9)"} onMouseUp={e => e.currentTarget.style.transform="scale(1)"}>
                     <i data-lucide="heart" style={{ width: "26px", color: userLikes.includes(post.id) ? "#ef4444" : "white", fill: userLikes.includes(post.id) ? "#ef4444" : "none", transition: "all 0.2s" }}></i>
                  </button>
                  <button onClick={() => toggleComments(post.id)} style={{ background: "none", border: "none", color: "white", padding: 0, cursor: "pointer" }} className="hover-scale">
                     <i data-lucide="message-circle" style={{ width: "26px" }}></i>
                  </button>
                  <button onClick={handleShare} style={{ background: "none", border: "none", color: "white", padding: 0, cursor: "pointer" }} className="hover-scale">
                     <i data-lucide="send" style={{ width: "26px" }}></i>
                  </button>
               </div>

               {/* Likes & Caption Text */}
               <div>
                  <p style={{ fontWeight: 700, fontSize: "0.85rem", margin: "0 0 6px 0", color: "white" }}>{post.likes_count} Me gusta</p>
                  
                  {post.content_text && (
                     <p style={{ margin: 0, fontSize: "0.9rem", color: "white", lineHeight: "1.4" }}>
                        <span style={{ fontWeight: 700, marginRight: "8px" }}>{post.profiles?.full_name}</span>
                        {post.content_text}
                     </p>
                  )}

                  {!expandedPosts.includes(post.id) && post.comments_count > 0 && (
                     <button onClick={() => toggleComments(post.id)} style={{ background: "none", border: "none", padding: 0, color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: "8px", cursor: "pointer" }}>
                        Ver los {post.comments_count} comentarios
                     </button>
                  )}
               </div>

               {/* Comments Dropdown */}
               {expandedPosts.includes(post.id) && (
                 <div style={{ marginTop: "15px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "15px" }}>
                    {/* Add Comment Input */}
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
                       <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--bg-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }}>
                         <span style={{ fontSize: "0.6rem", fontWeight: "bold", color: "white" }}>{firstName.substring(0, 2)}</span>
                       </div>
                       <input 
                         type="text" 
                         placeholder="Añade un comentario..."
                         value={newCommentText[post.id] || ""}
                         onChange={(e) => setNewCommentText((prev:any) => ({ ...prev, [post.id]: e.target.value }))}
                         onKeyDown={(e) => { if (e.key === 'Enter') handleCreateComment(post.id); }}
                         style={{ flex: 1, background: "transparent", border: "none", color: "white", fontSize: "0.85rem", outline: "none" }}
                       />
                       {(newCommentText[post.id] || "").trim() !== "" && (
                          <button onClick={() => handleCreateComment(post.id)} style={{ background: "none", border: "none", color: "#3b82f6", fontWeight: 700, fontSize: "0.85rem", padding: 0, cursor: "pointer" }}>Publicar</button>
                       )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                       {(commentsMap[post.id] || []).map((comment: any) => (
                          <div key={comment.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start", position: "relative", paddingRight: "30px" }}>
                             <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "white" }}>{comment.profiles?.full_name}</span>
                             <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.9)", wordBreak: "break-word" }}>{comment.content_text}</span>
                             
                             {profile?.id === comment.author_id && (
                                <button 
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", position: "absolute", right: 0, top: 0, padding: 0, cursor: "pointer" }}
                                  onMouseEnter={e => e.currentTarget.style.color="#ef4444"}
                                  onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,0.3)"}
                                >
                                   <i data-lucide="x" style={{width: 14}}></i>
                                </button>
                             )}
                          </div>
                       ))}
                    </div>
                 </div>
               )}
           </article>
         ))}
         {communityPosts.length === 0 && (
           <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ display: "inline-flex", padding: "20px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", marginBottom: "20px" }}>
                 <i data-lucide="camera" style={{ width: "40px", color: "white" }}></i>
              </div>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "10px", color: "white" }}>Aún no hay publicaciones</h3>
              <p style={{ opacity: 0.5, color: "white" }}>Sé el primero en compartir algo con CLAN.</p>
           </div>
         )}
      </div>
    </div>
  );
};

