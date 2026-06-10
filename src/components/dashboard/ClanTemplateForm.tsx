import React, { useState } from 'react';

interface ClanTemplateFormProps {
  moduleTitle?: string;
  onGenerate: (html: string) => void;
  onCancel: () => void;
}

export default function ClanTemplateForm({ moduleTitle = "", onGenerate, onCancel }: ClanTemplateFormProps) {
  const [mode, setMode] = useState<"magic" | "manual">("magic");
  const [magicText, setMagicText] = useState("");

  const [weekLabel, setWeekLabel] = useState(moduleTitle);
  const [title1, setTitle1] = useState("");
  const [title2, setTitle2] = useState("");
  const [subtitle, setSubtitle] = useState("");
  
  const [bannerLink, setBannerLink] = useState("");
  const [bannerCreditLink, setBannerCreditLink] = useState("");
  
  const [summaryObjective, setSummaryObjective] = useState("Objetivos y enfoque de la semana");
  const [summaryItems, setSummaryItems] = useState("");

  const [videoLink, setVideoLink] = useState("");
  const [videoCreditLink, setVideoCreditLink] = useState("");
  const [videoCreditText, setVideoCreditText] = useState("");

  const [materials, setMaterials] = useState([{ title: "", desc: "", link: "", btnText: "📖 Leer material" }]);

  const handleMagicPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMagicText(text);

    // TÍTULO
    const titleMatch = text.match(/TÍTULO:\s*\n*([^\n]+)/i);
    if (titleMatch) {
       const t = titleMatch[1].trim();
       if (t.includes(',')) {
          const parts = t.split(',');
          setTitle1(parts[0] + ',');
          setTitle2(parts.slice(1).join(',').trim());
       } else {
          setTitle1(t);
          setTitle2("");
       }
    }

    // ETIQUETA SEMANA (WEEK)
    const weekMatch = text.match(/(?:WEEK|SEMANA):\s*\n*([^\n]+)/i);
    if (weekMatch) {
      setWeekLabel(weekMatch[1].trim());
    }

    // SUBTÍTULO
    const subMatch = text.match(/SUBTÍTULO:\s*\n*([^\n]+)/i);
    if (subMatch) {
      const parts = subMatch[1].split('|');
      if (parts.length > 1) {
        if (!weekMatch) setWeekLabel(parts[0].trim());
        setSubtitle(parts.slice(1).join('|').replace(/["“”]/g, '').trim());
      } else {
        setSubtitle(subMatch[1].replace(/["“”]/g, '').trim());
      }
    }

    // BANNER
    const bannerBlock = text.match(/BANNER:([\s\S]*?)(?=RESUMEN:|$)/i);
    if (bannerBlock) {
      const urlMatch = bannerBlock[1].match(/(?:URL:\s*)?(https?:\/\/[^\s\n"\'<>\[\]()]+)/i);
      if (urlMatch) setBannerLink(urlMatch[1].trim());
      
      const creditMatch = bannerBlock[1].match(/URL CRÉDITO:\s*([^\n]+)/i);
      if (creditMatch) setBannerCreditLink(creditMatch[1].trim());
    }

    // RESUMEN
    const resumenMatch = text.match(/RESUMEN:\s*\n*([\s\S]*?)(?=CONTENIDO PRINCIPAL:|$)/i);
    if (resumenMatch) {
       const lines = resumenMatch[1].split('\n').filter(l => l.trim().length > 0);
       setSummaryItems(lines.join('\n'));
    }

    // CONTENIDO PRINCIPAL
    const contentBlock = text.match(/CONTENIDO PRINCIPAL:([\s\S]*?)(?=PROFUNDIZACIÓN:|$)/i);
    if (contentBlock) {
      const urlMatch = contentBlock[1].match(/(?:URL:\s*)?(https?:\/\/[^\s\n"\'<>\[\]()]+)/i);
      if (urlMatch) {
        let vLink = urlMatch[1].trim();
        // Simple auto-embed formatting if it's a gamma link
        if (vLink.includes("gamma.app") && !vLink.includes("embed")) {
            // Usually gamma links are like gamma.app/docs/...
        }
        setVideoLink(vLink);
      }

      const titleMatch = contentBlock[1].match(/TÍTULO:\s*([^\n]+)/i);
      if (titleMatch) setVideoCreditText(titleMatch[1].trim());
    }

    // PROFUNDIZACIÓN
    const profBlock = text.match(/PROFUNDIZACIÓN:\s*\n*([\s\S]*)/i);
    if (profBlock) {
      const matBlocks = profBlock[1].split(/Material \d+:/i).filter(b => b.trim().length > 0);
      const parsedMaterials = matBlocks.map(b => {
        const nMatch = b.match(/Nombre:\s*([^\n]+)/i);
        const dMatch = b.match(/Descripción:\s*([^\n]*)/i);
        const uMatch = b.match(/(?:URL:\s*)?(https?:\/\/[^\s\n"\'<>\[\]()]+)/i);
        const btnMatch = b.match(/Texto del botón:\s*([^\n]+)/i);

        return {
          title: nMatch ? nMatch[1].trim() : "Recurso",
          desc: dMatch ? dMatch[1].trim() : "",
          link: uMatch ? uMatch[1].trim() : "#",
          btnText: btnMatch ? btnMatch[1].trim() : "📖 Leer material"
        };
      });

      if (parsedMaterials.length > 0) {
        setMaterials(parsedMaterials);
      }
    }
  };

  const cleanUrl = (url: string) => url ? url.split('](')[0].replace(/^\[/, '') : "";

  const handleGenerate = () => {
    const itemsHtml = summaryItems.split('\n').filter(i => i.trim() !== '').map(item => `      <li>${item.trim()}</li>`).join('\n');
    
    const safeBannerLink = cleanUrl(bannerLink);
    const safeVideoLink = cleanUrl(videoLink);
    
    const materialsHtml = materials.filter(m => m.title).map(m => `
    <div class="clan-resource-inner">
      <h4>${m.title}</h4>
      ${m.desc ? `<p>${m.desc}</p>` : ''}
      <a
        class="clan-button"
        href="${cleanUrl(m.link)}"
        target="_blank"
        rel="noopener"
      >
        ${m.btnText || "📖 Leer material"}
      </a>
    </div>`).join('\n');

    const html = `<section class="clan-week">
  <!-- TÍTULO -->
  <header class="clan-header clan-card">
    <p class="clan-eyebrow">${weekLabel || 'Semana · Corte'}</p>
    <h2>
      ${title1 || 'Título'}${title2 ? `<br />\n      <span>${title2}</span>` : ''}
    </h2>
    <p class="clan-subtitle">${subtitle}</p>
  </header>

  <!-- RUTA DE APRENDIZAJE -->
  <section class="clan-learning-path clan-card">
    <p class="clan-section-label">Ruta de aprendizaje</p>
    <h3>Cómo recorrer esta semana</h3>

    <div class="clan-steps">
      <article class="clan-step">
        <span>01</span>
        <h4>Lee el resumen</h4>
        <p>Comprende el propósito de la semana y los temas que vas a explorar.</p>
      </article>

      <article class="clan-step">
        <span>02</span>
        <h4>Mira el contenido</h4>
        <p>Explora la presentación o el video para conectar con el tema central.</p>
      </article>

      <article class="clan-step">
        <span>03</span>
        <h4>Profundiza</h4>
        <p>Completa la experiencia con materiales complementarios.</p>
      </article>

      <article class="clan-step">
        <span>04</span>
        <h4>Realiza la actividad</h4>
        <p>Aplica lo aprendido en la actividad final de la semana.</p>
      </article>
    </div>
  </section>

  <!-- BANNER -->
  <section class="clan-section clan-card">
    <div class="clan-media">
      ${safeBannerLink.includes("postimg") || safeBannerLink.match(/\.(jpeg|jpg|gif|png)$/) != null ? 
        `<img src="${safeBannerLink}" alt="Banner" style="width:100%;height:100%;object-fit:cover;" />` 
        : 
        `<iframe
          loading="lazy"
          src="${safeBannerLink}"
          allowfullscreen
          allow="fullscreen"
          title="Banner de la semana"
        ></iframe>`
      }
    </div>

    ${bannerCreditLink ? `
    <p class="clan-credit">
      <a href="${bannerCreditLink}" target="_blank" rel="noopener">Diseño</a>
      de Clan Academy Creación de Contenidos
    </p>` : ''}
  </section>

  <!-- RESUMEN -->
  <section class="clan-section clan-card clan-summary">
    <p class="clan-section-label">Resumen</p>
    <h3>${summaryObjective}</h3>

    <ul class="clan-checklist">
${itemsHtml}
    </ul>
  </section>

  <!-- VIDEO O PRESENTACIÓN -->
  <section class="clan-section clan-card">
    <p class="clan-section-label">Contenido Principal</p>
    <h3>Explora el contenido</h3>

    <div class="clan-media">
      <iframe
        loading="lazy"
        src="${safeVideoLink}"
        allowfullscreen
        allow="fullscreen"
        title="Contenido de la semana"
      ></iframe>
    </div>

    ${videoCreditText ? `
    <p class="clan-credit">
      <a href="${videoCreditLink || safeVideoLink}" target="_blank" rel="noopener">
        ${videoCreditText}
      </a>
      de Clan Academy
    </p>` : ''}
  </section>

  <!-- PROFUNDIZACIÓN -->
  <section class="clan-section clan-card clan-resource">
    <p class="clan-section-label">Profundización</p>
    <h3>Material para continuar</h3>
${materialsHtml}
  </section>
</section>`;

    onGenerate(html);
  };

  const inputStyle = {
    width: "100%", padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", fontSize: "0.85rem", marginBottom: 15
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: "70vh", overflowY: "auto", padding: "10px 5px", textAlign: "left" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <button 
          onClick={() => setMode("magic")} 
          style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: mode === "magic" ? "var(--brand-primary)" : "rgba(255,255,255,0.05)", color: mode === "magic" ? "black" : "white", fontWeight: "bold", cursor: "pointer" }}
        >
          ✨ Pegado Mágico
        </button>
        <button 
          onClick={() => setMode("manual")} 
          style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: mode === "manual" ? "var(--brand-primary)" : "rgba(255,255,255,0.05)", color: mode === "manual" ? "black" : "white", fontWeight: "bold", cursor: "pointer" }}
        >
          ✍️ Llenar Manual
        </button>
      </div>

      {mode === "magic" && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <p style={{ fontSize: "0.8rem", opacity: 0.6, marginBottom: 15 }}>Copia y pega el bloque completo de texto. El sistema detectará las partes automáticamente.</p>
          <textarea 
            placeholder="TÍTULO:&#10;Derecho Deportivo&#10;&#10;SUBTÍTULO:&#10;Semana 6 - Corte 2 | Cuando la pasión..."
            value={magicText}
            onChange={handleMagicPaste}
            style={{ ...inputStyle, height: 350, resize: "vertical", fontFamily: "monospace" }} 
          />
          {title1 && (
            <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: 10, borderRadius: 8, color: "#10b981", fontSize: "0.8rem", marginBottom: 15 }}>
              ✓ Datos detectados correctamente. Puedes generar el HTML o revisar en modo manual.
            </div>
          )}
        </div>
      )}

      {mode === "manual" && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <p style={{ fontSize: "0.8rem", opacity: 0.6, marginBottom: 15 }}>Revisa o ajusta los campos detectados manualmente.</p>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Etiqueta Semana</label>
              <input type="text" value={weekLabel} onChange={e => setWeekLabel(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Subtítulo</label>
              <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Título 1 (Arriba)</label>
              <input type="text" value={title1} onChange={e => setTitle1(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Título 2 (Abajo color)</label>
              <input type="text" value={title2} onChange={e => setTitle2(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Banner Canva o Imagen (Embed URL)</label>
          <input type="text" value={bannerLink} onChange={e => setBannerLink(e.target.value)} style={inputStyle} />
          
          <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Video / Presentación (Embed URL)</label>
          <input type="text" value={videoLink} onChange={e => setVideoLink(e.target.value)} style={inputStyle} />

          <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Texto Crédito Video</label>
          <input type="text" value={videoCreditText} onChange={e => setVideoCreditText(e.target.value)} style={inputStyle} />

          <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Items del Resumen (Un punto por línea)</label>
          <textarea value={summaryItems} onChange={e => setSummaryItems(e.target.value)} style={{ ...inputStyle, height: 100, resize: "vertical" }} />
          
          <h5 style={{ margin: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 5 }}>Materiales de Profundización</h5>
          {materials.map((m, idx) => (
            <div key={idx} style={{ background: "rgba(255,255,255,0.02)", padding: 10, borderRadius: 8, marginBottom: 10 }}>
               <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Título</label>
               <input type="text" value={m.title} onChange={e => { const nm = [...materials]; nm[idx].title = e.target.value; setMaterials(nm); }} style={{...inputStyle, marginBottom: 5}} />
               <label style={{ fontSize: "0.7rem", fontWeight: "bold", opacity: 0.7 }}>Link</label>
               <input type="text" value={m.link} onChange={e => { const nm = [...materials]; nm[idx].link = e.target.value; setMaterials(nm); }} style={{...inputStyle, marginBottom: 5}} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
        <button className="btn-primary" onClick={handleGenerate} style={{ flex: 1, padding: "15px", fontSize: "1rem", boxShadow: "0 10px 20px rgba(15, 91, 255, 0.3)" }}>✨ Generar Código</button>
        <button className="btn-secondary" onClick={onCancel} style={{ padding: "15px" }}>Cancelar</button>
      </div>
    </div>
  );
}
