"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Upload, FileText, FileImage, File, CheckCircle2, Clock, Trophy, X, Paperclip, ShieldAlert } from "lucide-react";

interface FileDeliveryBlockProps {
  blockId: string;
  isEditMode: boolean;
  isAdmin: boolean;
  isLocked?: boolean;
  instructions?: string;
  userSubmission?: any;
  currentUserId?: string;
  onInstructionsSave?: (text: string) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_SIZE_MB = 100;

function getFileIcon(name: string) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return <FileImage size={22} />;
  if (ext === "pdf") return <FileText size={22} />;
  return <File size={22} />;
}

export function FileDeliveryBlock({
  blockId,
  isEditMode,
  isAdmin,
  isLocked = false,
  instructions,
  userSubmission,
  currentUserId,
  onInstructionsSave,
}: FileDeliveryBlockProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Edit mode: editable instructions
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [tempInstructions, setTempInstructions] = useState(instructions || "");

  // ─── ALREADY SUBMITTED VIEW ──────────────────────────────────────────────
  if (userSubmission && !isAdmin && !isEditMode) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--glass-border)",
        borderRadius: 32,
        padding: 40,
        margin: "40px 0",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Status ribbon */}
        <div style={{
          position: "absolute", top: 0, right: 0,
          padding: "10px 25px",
          background: userSubmission.status === "graded" ? "#10b981" : "var(--brand-primary)",
          color: userSubmission.status === "graded" ? "white" : "black",
          fontSize: "0.7rem", fontWeight: 900, letterSpacing: 1.5,
        }}>
          {userSubmission.status === "graded" ? "✓ ARCHIVO CALIFICADO" : "⏳ ARCHIVO RECIBIDO"}
        </div>

        <h3 style={{ color: "var(--brand-secondary)", marginBottom: 20, fontFamily: "'Playfair Display', serif", fontSize: "1.6rem" }}>
          Tu Entrega de Archivo
        </h3>

        {/* File card */}
        <a
          href={userSubmission.file_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 16,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--glass-border)",
            borderRadius: 16, padding: "20px 25px",
            textDecoration: "none", color: "var(--text-main)",
            marginBottom: 30,
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ color: "var(--brand-secondary)", flexShrink: 0 }}>
            {getFileIcon(userSubmission.file_name || "")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userSubmission.file_name || "Archivo adjunto"}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "0.75rem", opacity: 0.5 }}>Clic para abrir o descargar</p>
          </div>
          <Paperclip size={18} style={{ opacity: 0.4, flexShrink: 0 }} />
        </a>

        {/* Grading feedback */}
        {userSubmission.status === "graded" ? (
          <div style={{ padding: 30, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h4 style={{ color: "#10b981", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <Trophy size={20} /> Feedback del Mentor
              </h4>
              <div style={{ background: "#10b981", color: "white", padding: "8px 20px", borderRadius: 12, fontWeight: 900, fontSize: "1.4rem" }}>
                {userSubmission.score}/100
              </div>
            </div>
            <p style={{ margin: 0, fontStyle: "italic", color: "white", opacity: 0.9, lineHeight: 1.6 }}>
              "{userSubmission.feedback || "Tu archivo ha sido revisado con éxito."}"
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", padding: "15px 20px", borderRadius: 14 }}>
            <Clock size={18} style={{ color: "var(--brand-secondary)", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.7 }}>
              Tu mentor está revisando este archivo para darte retroalimentación.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ─── EDIT MODE (ADMIN CONFIGURES INSTRUCTIONS) ───────────────────────────
  if (isEditMode) {
    return (
      <div style={{
        border: "2px dashed var(--brand-secondary)",
        borderRadius: 24, padding: 30, margin: "30px 0",
        background: "rgba(0,82,255,0.03)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Upload size={20} style={{ color: "var(--brand-secondary)" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "var(--brand-secondary)", letterSpacing: 1 }}>
              CAJA DE ENTREGA — ARCHIVO
            </span>
          </div>
          {!isEditingInstructions && (
            <button
              onClick={() => { setTempInstructions(instructions || ""); setIsEditingInstructions(true); }}
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "6px 14px", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
            >
              ✏️ Editar Instrucciones
            </button>
          )}
        </div>

        {isEditingInstructions ? (
          <div>
            <textarea
              value={tempInstructions}
              onChange={e => setTempInstructions(e.target.value)}
              placeholder="Ej: Sube tu ejercicio en PDF. El archivo debe incluir tu nombre y la fecha."
              rows={3}
              style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--brand-secondary)", borderRadius: 12, padding: 16, color: "var(--text-main)", fontSize: "0.95rem", resize: "none", outline: "none", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={() => { onInstructionsSave?.(tempInstructions); setIsEditingInstructions(false); }}
                className="btn-primary"
                style={{ padding: "8px 20px", fontSize: "0.8rem" }}
              >
                Guardar
              </button>
              <button
                onClick={() => setIsEditingInstructions(false)}
                className="btn-secondary"
                style={{ padding: "8px 20px", fontSize: "0.8rem", height: "auto" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, opacity: 0.6, fontSize: "0.9rem", fontStyle: "italic" }}>
            {instructions || "Sin instrucciones configuradas. Haz clic en 'Editar Instrucciones' para añadir."}
          </p>
        )}

        {/* Preview of what student will see */}
        <div style={{ marginTop: 20, padding: 20, background: "rgba(0,0,0,0.2)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.65rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1 }}>
            VISTA PREVIA ESTUDIANTE:
          </p>
          <div style={{ height: 80, border: "2px dashed rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.5 }}>
            <Upload size={18} />
            <span style={{ fontSize: "0.85rem" }}>Zona de subida de archivo</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── STUDENT UPLOAD VIEW ──────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    setErrorMsg("");
    if (!ACCEPTED_TYPES.includes(file.type) && file.type !== "") {
      setErrorMsg("Tipo de archivo no permitido. Sube un PDF, imagen, Word o Excel.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`El archivo supera el límite de ${MAX_SIZE_MB}MB.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    if (isLocked) return;

    setIsUploading(true);
    setUploadProgress("Subiendo archivo...");
    setErrorMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No estás autenticado.");

      const ext = selectedFile.name.split(".").pop();
      const safeName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const path = `submissions/${user.id}/${blockId}/${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("course-content")
        .upload(path, selectedFile, { upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage
        .from("course-content")
        .getPublicUrl(path);

      setUploadProgress("Guardando entrega...");

      const { error: dbErr } = await supabase.from("submissions").upsert({
        student_id: user.id,
        block_id: blockId,
        content: `[Archivo adjunto: ${selectedFile.name}]`,
        file_url: publicUrl,
        file_name: selectedFile.name,
        status: "pending",
      }, { onConflict: "student_id, block_id" });
      if (dbErr) throw dbErr;

      setSuccessMsg("¡Archivo enviado con éxito! Tu mentor recibirá una notificación.");
      setSelectedFile(null);
      setTimeout(() => window.location.reload(), 1800);
    } catch (err: any) {
      setErrorMsg("Error al subir: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  return (
    <div style={{ margin: "40px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          <Upload size={20} style={{ color: "var(--brand-secondary)" }} />
          <h4 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: "var(--brand-secondary)" }}>
            Entrega de Archivo
          </h4>
        </div>
        {instructions && (
          <p style={{ margin: 0, opacity: 0.7, fontSize: "0.95rem", lineHeight: 1.6 }}>
            {instructions}
          </p>
        )}
      </div>

      {/* Locked state */}
      {isLocked ? (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed var(--glass-border)", borderRadius: 24, padding: 40, textAlign: "center", opacity: 0.5 }}>
          <ShieldAlert size={32} style={{ color: "var(--brand-secondary)", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontWeight: 700 }}>Completa los módulos anteriores para habilitar esta entrega.</p>
        </div>
      ) : successMsg ? (
        /* Success state */
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 24, padding: 40, textAlign: "center" }}>
          <CheckCircle2 size={40} style={{ color: "#10b981", margin: "0 auto 16px", display: "block" }} />
          <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem", color: "#10b981" }}>{successMsg}</p>
        </div>
      ) : (
        /* Upload zone */
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "var(--brand-primary)" : selectedFile ? "#10b981" : "var(--glass-border)"}`,
              borderRadius: 24,
              padding: "50px 30px",
              textAlign: "center",
              cursor: selectedFile ? "default" : "pointer",
              background: isDragging ? "rgba(0,82,255,0.05)" : selectedFile ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
              transition: "all 0.3s ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
            />

            {selectedFile ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ color: "#10b981" }}>{getFileIcon(selectedFile.name)}</div>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-main)" }}>{selectedFile.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                    style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.5 }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB — Listo para enviar
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Upload size={28} style={{ color: "var(--brand-secondary)" }} />
                </div>
                <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "1rem", color: "var(--text-main)", textAlign: "center" }}>
                  Arrastra tu archivo aquí o haz clic para seleccionar
                </p>
                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.5, textAlign: "center" }}>
                  PDF, imágenes, Word, Excel — Máx. {MAX_SIZE_MB}MB
                </p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{ marginTop: 12, padding: "12px 20px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#ef4444", fontSize: "0.85rem", fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {selectedFile && (
            <button
              onClick={handleSubmit}
              disabled={isUploading}
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "16px", marginTop: 20, fontSize: "1rem", fontWeight: 800, opacity: isUploading ? 0.7 : 1 }}
            >
              {isUploading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="pulse-dot" style={{ width: 10, height: 10, background: "currentColor", borderRadius: "50%", display: "inline-block" }} />
                  {uploadProgress || "Procesando..."}
                </span>
              ) : (
                <>
                  <Upload size={18} style={{ marginRight: 10 }} />
                  ENVIAR ARCHIVO AL MENTOR
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
