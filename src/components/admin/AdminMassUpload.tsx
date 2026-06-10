import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, Users, CheckCircle, XCircle } from "lucide-react";

interface MassUploadProps {
  onSuccess: () => void;
}

export function AdminMassUpload({ onSuccess }: MassUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<{ total: number; success: number; failed: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        nombre_completo: "Juan Pérez",
        email: "juan@ejemplo.com",
        password: "Password123!",
        rol: "estudiante",
        rama: "Deporte",
        disciplina: "Fútbol",
        aliado: "Ej: Academia X",
        grado: "Ej: 11B",
        codigo_clan: "CLAN-072",
        capitan: "Nombre del capitán"
      },
      {
        nombre_completo: "Maria Gomez",
        email: "maria@ejemplo.com",
        password: "Password123!",
        rol: "mentor",
        rama: "Arte",
        disciplina: "Danza",
        aliado: "Ninguno",
        grado: "11",
        codigo_clan: "",
        capitan: ""
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    XLSX.writeFile(wb, "plantilla_clan_usuarios.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResults(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("El archivo Excel está vacío.");
          setIsUploading(false);
          return;
        }

        if (data.length > 200) {
          alert("El límite máximo es de 200 usuarios por subida.");
          setIsUploading(false);
          return;
        }

        // Send JSON to backend
        const res = await fetch("/api/admin/mass-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ users: data })
        });

        const resultData = await res.json();
        
        if (!res.ok) {
          throw new Error(resultData.error || "Error desconocido");
        }

        setResults(resultData);
        if (resultData.success > 0) onSuccess();

      } catch (err: any) {
        console.error("Error procesando Excel:", err);
        alert("Ocurrió un error al procesar el archivo: " + err.message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="stat-card" style={{ marginBottom: "40px", padding: "40px", borderRadius: "24px", border: "1px solid var(--brand-secondary)", background: "rgba(212,175,55,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
        <div style={{ width: "45px", height: "45px", borderRadius: "12px", background: "var(--brand-secondary)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Users size={22} />
        </div>
        <div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Carga Masiva (Excel)</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Sube hasta 200 usuarios a la vez con la Llave Maestra configurada.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
        <button onClick={handleDownloadTemplate} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px", borderRadius: "12px" }}>
          <Download size={18} /> Descargar Plantilla
        </button>

        <div>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef}
            style={{ display: "none" }} 
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            style={{ 
              background: "var(--brand-secondary)", 
              color: "#000", 
              border: "none",
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              padding: "12px 24px", 
              borderRadius: "12px",
              fontWeight: 800,
              cursor: isUploading ? "not-allowed" : "pointer",
              opacity: isUploading ? 0.7 : 1
            }}
          >
            <Upload size={18} /> {isUploading ? "Procesando..." : "Subir Excel Lleno"}
          </button>
        </div>
      </div>

      {results && (
        <div style={{ background: "var(--bg-page)", padding: "20px", borderRadius: "16px", border: "1px solid var(--glass-border)" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "var(--text-main)" }}>Resultados de la Operación</h4>
          <div style={{ display: "flex", gap: "20px" }}>
            <span style={{ color: "#22c55e", display: "flex", alignItems: "center", gap: "5px" }}><CheckCircle size={16} /> Éxitos: {results.success}</span>
            <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "5px" }}><XCircle size={16} /> Fallos: {results.failed}</span>
          </div>
          {results.errors.length > 0 && (
            <div style={{ marginTop: "15px", maxHeight: "150px", overflowY: "auto", fontSize: "0.8rem", color: "#ef4444", background: "rgba(239,68,68,0.05)", padding: "10px", borderRadius: "8px" }}>
              {results.errors.map((err, i) => (
                <div key={i}>• {err.email || "Fila"}: {err.error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
