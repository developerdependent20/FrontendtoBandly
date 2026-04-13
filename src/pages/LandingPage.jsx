import React from 'react';
import { Speaker, Activity, Cloud, Calendar as CalendarIcon, Music, ShieldCheck, Crown } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="hero-decorations">
        {/* Eliminados elementos distractores para un look más limpio */}
      </div>
      
      <nav className="landing-nav">
        <div style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          <img 
            src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Logotipo%20sin%20Fondo.png" 
            alt="Bandly Logotipo" 
            className="landing-logo" 
            style={{ height: '80px', width: 'auto', padding: '5px 0', objectFit: 'contain' }}
          />
        </div>
        <div className="landing-nav-links">
          <button onClick={() => onGetStarted('login')} className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.5rem', border: 'none' }}>Ingresar</button>
          <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem' }}>Comenzar gratis</button>
        </div>
      </nav>

      <header className="landing-hero-centered">
        <div className="hero-content-full">
          <h1 className="hero-main-title-large">
            Toda tu música. <br/>
            <span className="serif-accent">Bajo control.</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.3rem)', color: 'var(--text-muted)', maxWidth: '800px', margin: '1rem auto 0 auto', lineHeight: '1.4' }}>
            Organiza shows, repertorios, multitracks y secuencias <br className="hide-mobile" /> desde una sola plataforma.
          </p>
          <p className="hero-clarifier">
            Eventos <span className="dot">•</span> Repertorios <span className="dot">•</span> Recursos <span className="dot">•</span> Multitracks <span className="dot">•</span> Secuencias
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '3.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', width: 'auto' }}>Empezar Ahora</button>
            <button onClick={() => document.getElementById('pricing').scrollIntoView({behavior:'smooth'})} className="btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', border: '1px solid rgba(255,255,255,0.1)', width: 'auto' }}>Ver planes</button>
          </div>
          
          <div className="compatibility-badges-centered" style={{ marginTop: '5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1.5rem', display: 'block', width: '100%', opacity: 0.8 }}>Disponible en</span>
            <div className="comp-item-badge"><span></span> macOS</div>
            <div className="comp-item-badge"><span>⊞</span> Windows</div>
            <div className="comp-item-badge"><span>🤖</span> Android</div>
            <div className="comp-item-badge"><span>🌐</span> Web</div>
          </div>
        </div>
      </header>

      {/* Frase Heroica Expandida (Premium Statement) */}
      <section className="premium-statement">
        <div className="statement-content">
          <p className="statement-mini">HECHO PARA EQUIPOS MUSICALES</p>
          <h2 className="statement-main">
            Organiza eventos, reúne tus recursos <br/>
            y ensaya con secuencias desde <span className="serif-accent">una sola plataforma.</span>
          </h2>
          <p className="statement-support">
            Pensado para bandas y equipos musicales que quieren trabajar con <span className="serif-accent">más orden, menos caos</span> y una experiencia más completa.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="landing-features" style={{ padding: '8rem 2rem' }}>
        <div className="features-flex-container">
          <div className="feature-card">
            <div className="feature-icon"><Speaker size={32} /></div>
            <h3>Reproductor Nativo</h3>
            <p>Reproduce multitracks y secuencias con control total desde una experiencia diseñada para músicos.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Activity size={32} /></div>
            <h3>Sala de Previsualización</h3>
            <p>Ensaya y revisa tus secuencias antes del show con una vista clara para preparar cada detalle.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Cloud size={32} /></div>
            <h3>Central de Multitracks</h3>
            <p>Sube, organiza y accede a tus pistas, stems y recursos desde un solo lugar.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><CalendarIcon size={32} /></div>
            <h3>Eventos y Shows</h3>
            <p>Organiza fechas, ensayos y presentaciones para que todo tu equipo esté alineado.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Music size={32} /></div>
            <h3>Repertorios y Recursos</h3>
            <p>Centraliza canciones, charts, letras, links y materiales clave para cada presentación.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="landing-pricing-section">
        <div className="section-header-centered">
          <h2 className="section-title-large">Planes simples para cada etapa de tu equipo</h2>
          <p className="section-subtitle">Empieza gratis y escala cuando necesites más usuarios, más almacenamiento y herramientas avanzadas para preparar cada presentación.</p>
        </div>

        <div className="pricing-grid">
          {/* Plan Básico */}
          <div className="pricing-card">
            <div className="pricing-badge">BÁSICO</div>
            <h3>Gratis</h3>
            <div className="price">0<span>/mes</span></div>
            <ul className="pricing-features">
              <li><ShieldCheck size={16} /> 1 banda u organización</li>
              <li><ShieldCheck size={16} /> Hasta 10 usuarios</li>
              <li><ShieldCheck size={16} /> 400 MB almacenamiento</li>
              <li><ShieldCheck size={16} /> Calendario de eventos</li>
              <li><ShieldCheck size={16} /> Repertorios básicos</li>
              <li><ShieldCheck size={16} /> Letras</li>
              <li><ShieldCheck size={16} /> Enlaces de YouTube</li>
            </ul>
            <button onClick={() => onGetStarted('signup')} className="btn-secondary-outline">Empezar gratis</button>
          </div>

          {/* Plan Starter */}
          <div className="pricing-card featured">
            <div className="pricing-badge-popular">RECOMENDADO</div>
            <h3>Starter</h3>
            <div className="price">$59<span>/semestre</span></div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>o $12 / mes</p>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--primary)" /> Hasta 3 bandas</li>
              <li><Crown size={16} color="var(--primary)" /> Hasta 25 usuarios</li>
              <li><Crown size={16} color="var(--primary)" /> 10 GB almacenamiento</li>
              <li><Crown size={16} color="var(--primary)" /> Charts en PDF</li>
              <li><Crown size={16} color="var(--primary)" /> Gestión de repertorios</li>
              <li><Crown size={16} color="var(--primary)" /> Recursos por canción</li>
              <li><Crown size={16} color="var(--primary)" /> Multitracks</li>
              <li><Crown size={16} color="var(--primary)" /> Reproductor en la app</li>
            </ul>
            <button onClick={() => onGetStarted('signup')} className="btn-primary">Elegir Starter</button>
          </div>

          {/* Plan Pro */}
          <div className="pricing-card">
            <div className="pricing-badge">PRO</div>
            <h3>Pro</h3>
            <div className="price">$99<span>/semestre</span></div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>o $19 / mes</p>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--accent)" /> Hasta 10 bandas</li>
              <li><Crown size={16} color="var(--accent)" /> Hasta 50 usuarios</li>
              <li><Crown size={16} color="var(--accent)" /> 30 GB almacenamiento</li>
              <li><Crown size={16} color="var(--accent)" /> Todo lo de Starter</li>
              <li><Crown size={16} color="var(--accent)" /> Sala de previsualización</li>
              <li><Crown size={16} color="var(--accent)" /> Player de secuencias</li>
            </ul>
            <button onClick={() => onGetStarted('signup')} className="btn-secondary-outline">Elegir Pro</button>
          </div>

          {/* Plan Elite */}
          <div className="pricing-card">
            <div className="pricing-badge">ELITE</div>
            <h3>Elite</h3>
            <div className="price">$179<span>/semestre</span></div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>o $34 / mes</p>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--accent)" /> Bandas ilimitadas</li>
              <li><Crown size={16} color="var(--accent)" /> Hasta 100 usuarios</li>
              <li><Crown size={16} color="var(--accent)" /> 50 GB almacenamiento</li>
              <li><Crown size={16} color="var(--accent)" /> Todo lo de Pro</li>
              <li><Crown size={16} color="var(--accent)" /> Roles y permisos</li>
              <li><Crown size={16} color="var(--accent)" /> Prioridad en soporte</li>
              <li><Crown size={16} color="var(--accent)" /> Acceso anticipado</li>
            </ul>
            <button onClick={() => onGetStarted('signup')} className="btn-secondary-outline">Elegir Elite</button>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="landing-cta-box" style={{ padding: '8rem 2rem' }}>
        <h2 style={{ fontSize: '3rem', letterSpacing: '-2px' }}>¿Listo para llevar tu banda a otro nivel?</h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '2.5rem' }}>Organiza mejor cada show, centraliza tus recursos y ensaya con más control desde una sola plataforma.</p>
        <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ padding: '1.2rem 4rem', fontSize: '1.1rem', borderRadius: '50px' }}>Comenzar gratis</button>
      </section>
    </div>
  );
}
