import React from 'react';
import { Speaker, Activity, Cloud, Calendar as CalendarIcon, Music, ShieldCheck, Crown, CheckCircle2 } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  const [billingPeriod, setBillingPeriod] = React.useState('monthly');

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
          <button onClick={() => onGetStarted('login')} className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.5rem', border: 'none' }}>Iniciar Sesión</button>
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

      {/* Comparison Section (The "Why Bandly" Factor) */}
      <section className="comparison-section" style={{ padding: '8rem 2rem', background: 'rgba(255,255,255,0.02)' }}>
        <div className="section-header-centered">
          <h2 className="section-title-large">¿Por qué elegir <span className="serif-accent">Bandly</span>?</h2>
          <p className="section-subtitle">A diferencia de otras soluciones que fragmentan tus recursos y cobran por cada función, nosotros lo unificamos todo en un solo ecosistema diseñado para músicos.</p>
        </div>

        <div style={{ maxWidth: '1000px', margin: '4rem auto 0', overflowX: 'auto' }}>
          <table className="comparison-table" style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '1.5rem', opacity: 0.5 }}>CARACTERÍSTICAS</th>
                <th style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary)', fontWeight: 800 }}>BANDLY</th>
                <th style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.5 }}>OTRAS APPS</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "Reproductor de Multitracks & Secuencias", bandly: true, others: "Pago Adicional" },
                { feature: "Almacenamiento Cloud incluido", bandly: true, others: "Suscripción aparte" },
                { feature: "Gestión de Equipos y Roles", bandly: true, others: "No disponible" },
                { feature: "Calendario de Eventos y Ensayos", bandly: true, others: "App externa" },
                { feature: "Repertorios, Letras y PDF Charts", bandly: true, others: "Limitado" },
                { feature: "Precio único mensual", bandly: "Desde $12", others: "$35+ mensual" }
              ].map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1.2rem', fontWeight: 500 }}>{item.feature}</td>
                  <td style={{ padding: '1.2rem', textAlign: 'center', background: 'rgba(124, 58, 237, 0.05)' }}>
                    {item.bandly === true ? <CheckCircle2 size={20} color="var(--primary)" style={{margin:'0 auto'}} /> : <span style={{color:'var(--primary)', fontWeight: 800}}>{item.bandly}</span>}
                  </td>
                  <td style={{ padding: '1.2rem', textAlign: 'center', opacity: 0.6 }}>
                    {item.others}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="landing-pricing-section">
        <div className="section-header-centered">
          <h2 className="section-title-large">Planes simples para cada etapa de tu equipo</h2>
          <p className="section-subtitle">Empieza gratis y escala cuando necesites más usuarios, más almacenamiento y herramientas avanzadas para preparar cada presentación.</p>
          
          {/* Billing Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '3rem', marginBottom: '1rem' }}>
            <span style={{ color: billingPeriod === 'monthly' ? '#fff' : '#666', fontWeight: 600, fontSize: '0.9rem' }}>Mensual</span>
            <div 
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'semester' : 'monthly')}
              style={{ 
                width: '50px', 
                height: '26px', 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '20px', 
                position: 'relative', 
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: 'var(--primary)', 
                borderRadius: '50%', 
                position: 'absolute', 
                top: '2px', 
                left: billingPeriod === 'monthly' ? '3px' : '25px',
                transition: '0.3s ease',
                boxShadow: '0 0 10px var(--primary)'
              }} />
            </div>
            <span style={{ color: billingPeriod === 'semester' ? '#fff' : '#666', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Semestral
              <span style={{ background: 'var(--primary)', color: '#000', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>AHORRA 20%</span>
            </span>
          </div>
        </div>

        <div className="pricing-grid">
          {/* Plan Básico */}
          <div className="pricing-card">
            <div className="pricing-badge">BÁSICO</div>
            <h3>Gratis</h3>
            <div className="price">0<span>/mes</span></div>
            <p style={{fontSize:'0.75rem', opacity:0.6, marginTop:'-1rem', marginBottom:'1.5rem'}}>Ideal para bandas nuevas</p>
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
            <div className="price">
              {billingPeriod === 'monthly' ? '$12' : '$59'}
              <span>/{billingPeriod === 'monthly' ? 'mes' : 'semestre'}</span>
            </div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>
              {billingPeriod === 'monthly' ? 'Facturado mensualmente' : 'Equivale a $9.8 / mes'}
            </p>
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
            <div className="price">
              {billingPeriod === 'monthly' ? '$19' : '$99'}
              <span>/{billingPeriod === 'monthly' ? 'mes' : 'semestre'}</span>
            </div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>
              {billingPeriod === 'monthly' ? 'Facturado mensualmente' : 'Equivale a $16.5 / mes'}
            </p>
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
            <div className="price">
              {billingPeriod === 'monthly' ? '$39' : '$199'}
              <span>/{billingPeriod === 'monthly' ? 'mes' : 'semestre'}</span>
            </div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>
              {billingPeriod === 'monthly' ? 'Facturado mensualmente' : 'Equivale a $33.1 / mes'}
            </p>
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

      {/* Footer Legal Profesional */}
      <footer className="landing-footer-legal" style={{ padding: '4rem 2rem', background: '#050506', borderTop: '1px solid #111', color: '#444', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            Bandly es una plataforma para organizar shows, repertorios, multitracks y secuencias desde un solo lugar.
            Uso sujeto a nuestros <a href="/terminos" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/terminos'); window.dispatchEvent(new Event('popstate')); }} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Términos y Condiciones</a> y <a href="/privacidad" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacidad'); window.dispatchEvent(new Event('popstate')); }} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Política de Privacidad</a>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
             <span>Operado por Johan Sebastian Jimenez Calderon</span>
             <span>•</span>
             <span>Bogotá, Colombia</span>
          </div>
          <p style={{ fontSize: '0.75rem' }}>Contacto: <a href="mailto:dependent.mix@gmail.com" style={{ color: '#888' }}>dependent.mix@gmail.com</a></p>
          <p style={{ marginTop: '2rem', fontSize: '0.65rem', opacity: 0.5 }}>© 2026 Bandly Live Engine. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
