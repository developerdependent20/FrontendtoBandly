import React from 'react';
import { Speaker, Activity, Cloud, Calendar as CalendarIcon, Music, ShieldCheck, Crown, CheckCircle2, Monitor } from 'lucide-react';

export default function LandingPage({ onGetStarted, onNavigate }) {
  const [billingPeriod, setBillingPeriod] = React.useState('annual');

  return (
    <div className="landing-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="hero-decorations">
        {/* Eliminados elementos distractores para un look más limpio */}
      </div>
      
        <nav className="landing-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img 
              src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/LOGO%20BANDLY%20SIN%20FONDO.png" 
              alt="Bandly" 
              style={{ height: '50px', width: 'auto' }}
            />
          </div>

          <div className="landing-nav-center hide-mobile">
            <a href="#multitrack">Funciones</a>
            <a href="#pricing">Planes</a>
            <a href="#community">Comunidad</a>
            <a href="#support">Soporte</a>
          </div>

          <div className="landing-nav-links">
            <button onClick={() => onGetStarted('login')} className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.2rem', border: 'none', fontSize: '0.85rem' }}>Iniciar Sesión</button>
            <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>Probar Gratis</button>
          </div>
        </nav>

      <main className="landing-hero-centered">
        <div className="hero-content-full">
          <div style={{ marginBottom: '1rem', animation: 'dropdownFadeIn 0.8s ease-out' }}>
            <img 
              src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Logotipo%20sin%20Fondo.png" 
              style={{ height: '140px', filter: 'drop-shadow(0 0 30px rgba(139, 92, 246, 0.4))' }} 
            />
          </div>
          <h1 className="hero-main-title-large" style={{ marginTop: '-1rem' }}>
            Toda tu música. <br/>
            <span className="serif-accent">Bajo control.</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--text-muted)', maxWidth: '700px', margin: '1.5rem auto 0 auto', lineHeight: '1.6', fontWeight: '500' }}>
            Organiza shows, repertorios, multitracks y secuencias <br className="hide-mobile" /> desde una sola plataforma.
          </p>
          <p className="hero-clarifier" style={{ marginTop: '2rem', opacity: 0.6 }}>
            Eventos <span className="dot">•</span> Repertorios <span className="dot">•</span> Recursos <span className="dot">•</span> Multitracks <span className="dot">•</span> Secuencias
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', marginTop: '3.5rem' }}>
            <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ padding: '1.2rem 2.5rem', fontSize: '1rem', width: 'auto', fontWeight: '800' }}>Empezar Ahora</button>
              <button onClick={() => document.getElementById('pricing').scrollIntoView({behavior:'smooth'})} className="btn-secondary" style={{ padding: '1.2rem 2.5rem', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', width: 'auto', fontWeight: '800' }}>Ver planes</button>
            </div>
          </div>
          
          <div className="compatibility-badges-centered" style={{ marginTop: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px' }}>Disponible en</span>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <img 
                src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/BadgeMacOS.png" 
                alt="MacOS" 
                style={{ height: '42px', width: 'auto', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s', opacity: 0.7 }} 
                onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.3)'; e.currentTarget.style.opacity='1'; }}
                onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.opacity='0.7'; }}
              />
              <img 
                src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/images.png" 
                alt="Windows" 
                style={{ height: '42px', width: 'auto', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s', opacity: 0.7 }} 
                onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.3)'; e.currentTarget.style.opacity='1'; }}
                onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.opacity='0.7'; }}
              />
              <img 
                src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/0w8ONb9ouWJ2GDFdyHnwlzOy90.avif" 
                alt="Google Play" 
                style={{ height: '42px', width: 'auto', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s', opacity: 0.7 }} 
                onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.3)'; e.currentTarget.style.opacity='1'; }}
                onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.opacity='0.7'; }}
              />
            </div>
            
            <div style={{ 
              marginTop: '4rem', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1.5rem', 
              maxWidth: '900px', 
              width: '100%',
              textAlign: 'left'
            }}>
              {/* Web Card */}
              <div className="hover-scale" style={{ 
                padding: '2rem', 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid rgba(255, 255, 255, 0.05)', 
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ color: 'rgba(255,255,255,0.4)' }}><Cloud size={32} strokeWidth={1.5} /></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem', color: '#fff', letterSpacing: '-0.5px' }}>Gestión & Ensayo Web</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Organiza tus eventos, planea repertorios y ensaya con tus stems desde cualquier navegador.
                  </p>
                </div>
              </div>
              
              {/* Desktop Card */}
              <div className="hover-scale" style={{ 
                padding: '2rem', 
                background: 'rgba(139, 92, 246, 0.05)', 
                border: '1px solid rgba(139, 92, 246, 0.2)', 
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ color: 'var(--primary)' }}><Monitor size={32} strokeWidth={1.5} /></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem', color: '#fff', letterSpacing: '-0.5px' }}>App Nativa (Windows / Mac)</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    La herramienta profesional para <strong>reproducir</strong> tus secuencias en vivo con latencia cero y máxima estabilidad.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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

      {/* Pro Player Showcase Section */}
      <section id="multitrack" className="pro-player-showcase">
        <div className="pro-player-flex">
          <div style={{ flex: '1', minWidth: '300px', order: 2 }}>
            <h2 className="hero-main-title-large" style={{ textAlign: 'left', marginBottom: '1.5rem', lineHeight: '1.1' }}>
              El Único Reproductor de Multitracks Nativo <br className="hide-mobile" />
              <span className="serif-accent" style={{ fontSize: '1.1em' }}>para Windows y Mac.</span>
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '2rem' }}>
              A diferencia de otras plataformas web, Bandly cuenta con su propio motor de audio instalable. Gestiona todos tus multitracks simultáneos con latencia cero. Diseñado específicamente para músicos que necesitan fiabilidad absoluta en el escenario.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { title: 'Audio Multicanal', desc: 'Control independiente de volumen y ruteo por track.' },
                { title: 'Sincronización Local', desc: 'Descarga y reproduce sin depender del internet.' },
                { title: 'Resiliencia de Hardware', desc: 'Recuperación instantánea ante desconexiones.' }
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</div>
                  <div>
                    <strong style={{ display: 'block', color: 'white' }}>{item.title}</strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: '1.2', minWidth: '300px', order: 1 }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '20px', boxShadow: '0 40px 80px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.1)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, rgba(139,92,246,0.1), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>
              <img 
                src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Captura%20de%20pantalla%202026-04-29%20121603.png" 
                alt="Pro Player Interface" 
                style={{ 
                   width: '100%', 
                   height: 'auto', 
                   objectFit: 'cover', 
                   objectPosition: 'left center', 
                   transform: 'scale(1.1) translateX(-2%)', 
                   display: 'block' 
                }} 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Virtues Showcase */}
      <section className="app-virtues-showcase" style={{ padding: '8rem 2rem', background: '#020617', overflow: 'hidden' }}>
        <style>{`
          .virtues-gallery {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }
          .virtue-img-wrapper {
            flex: 1;
            border-radius: 24px;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1);
            overflow: hidden; /* Esto asegura que el recorte del zoom funcione */
            background: #0f172a;
          }
          .virtue-img-wrapper img {
            width: 100%;
            display: block;
            border-radius: 24px;
          }
          .virtue-left {
            max-width: 280px;
            opacity: 0.7;
            transform: scale(0.9);
          }
          .virtue-right {
            max-width: 260px;
            opacity: 0.7;
            transform: scale(0.85); /* Un poco más pequeña proporcional a la izquierda */
          }
          .virtue-center {
            max-width: 320px;
            z-index: 10;
            box-shadow: 0 30px 60px rgba(139,92,246,0.3), 0 0 0 2px rgba(139,92,246,0.5);
          }
          .virtue-img-wrapper:hover {
            transform: translateY(-15px) scale(1.05);
            opacity: 1;
            z-index: 20;
            box-shadow: 0 30px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.2);
          }
          @media (max-width: 900px) {
            .virtues-gallery {
              flex-direction: column;
              gap: 3rem;
            }
            .virtue-left, .virtue-right, .virtue-center {
              max-width: 80%;
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>

        <div className="section-header-centered" style={{ marginBottom: '4rem' }}>
          <h2 className="section-title-large">Todo tu equipo, <span className="serif-accent">en tu bolsillo.</span></h2>
          <p className="section-subtitle">Visualiza la agenda, ensaya con la secuencia virtual, y revisa cada detalle desde cualquier dispositivo. La experiencia móvil definitiva para músicos.</p>
        </div>

        <div className="virtues-gallery">
          <div className="virtue-img-wrapper virtue-left">
            <img src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/WhatsApp%20Image%202026-04-30%20at%2011.13.28%20PM%20(1).jpeg" alt="Dashboard Móvil" />
          </div>

          <div className="virtue-img-wrapper virtue-center">
            <img src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/WhatsApp%20Image%202026-04-30%20at%2011.13.28%20PM.jpeg" alt="Player Móvil" />
          </div>

          <div className="virtue-img-wrapper virtue-right">
            <img src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/WhatsApp%20Image%202026-04-30%20at%2011.19.05%20PM.jpeg" alt="Repertorios Móviles" />
          </div>
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
                { feature: "Reproductor de Multitracks & DAW Nativo", bandly: true, others: "No disponible (App aparte)" },
                { feature: "Usuarios / Miembros", bandly: "Ilimitados (Elite)", others: "Limitado (Max 1000)" },
                { feature: "Almacenamiento para Stems/Pistas", bandly: "Hasta 50 GB", others: "Limitado (2GB - 11GB)" },
                { feature: "Eventos y Ensayos", bandly: "Ilimitados", others: "Limitado por plan" },
                { feature: "Charts en PDF y Letras", bandly: true, others: true },
                { feature: "Costo para Equipos Grandes", bandly: "$39/mes", others: "$135+/mes" }
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
          <h2 className="section-title-large">Planes diseñados para cada etapa de tu equipo</h2>
          <p className="section-subtitle">Empieza gratis y escala cuando necesites más usuarios, más almacenamiento y herramientas avanzadas para preparar cada presentación.</p>
          
          {/* Billing Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
            <span style={{ color: billingPeriod === 'monthly' ? '#fff' : '#666', fontWeight: 600, fontSize: '0.9rem' }}>Mensual</span>
            <div 
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
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
            <span style={{ color: billingPeriod === 'annual' ? '#fff' : '#666', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Anual
              <span style={{ background: 'var(--primary)', color: '#000', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>AHORRA 30%</span>
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
              <li><ShieldCheck size={16} /> 300 MB almacenamiento</li>
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
            <div className="price" style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
              {billingPeriod === 'monthly' ? (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$19</span>
                  $9
                </>
              ) : (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$190</span>
                  $75
                </>
              )}
              <span style={{ marginBottom: '6px' }}>/{billingPeriod === 'monthly' ? 'mes' : 'año'}</span>
            </div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>
              {billingPeriod === 'monthly' ? 'Facturado mensualmente' : 'Equivale a $6.2 / mes'}
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
            <div className="price" style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
              {billingPeriod === 'monthly' ? (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$39</span>
                  $19
                </>
              ) : (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$390</span>
                  $159
                </>
              )}
              <span style={{ marginBottom: '6px' }}>/{billingPeriod === 'monthly' ? 'mes' : 'año'}</span>
            </div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>
              {billingPeriod === 'monthly' ? 'Facturado mensualmente' : 'Equivale a $13.2 / mes'}
            </p>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--accent)" /> Hasta 10 bandas</li>
              <li><Crown size={16} color="var(--accent)" /> Hasta 75 usuarios</li>
              <li><Crown size={16} color="var(--accent)" /> 45 GB almacenamiento</li>
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
            <div className="price" style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
              {billingPeriod === 'monthly' ? (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$79</span>
                  $39
                </>
              ) : (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$790</span>
                  $329
                </>
              )}
              <span style={{ marginBottom: '6px' }}>/{billingPeriod === 'monthly' ? 'mes' : 'año'}</span>
            </div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>
              {billingPeriod === 'monthly' ? 'Facturado mensualmente' : 'Equivale a $27.4 / mes'}
            </p>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--accent)" /> Bandas ilimitadas</li>
              <li><Crown size={16} color="var(--accent)" /> Usuarios ilimitados</li>
              <li><Crown size={16} color="var(--accent)" /> 100 GB almacenamiento</li>
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

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-links" style={{ fontSize: '0.65rem' }}>
            <span onClick={() => onNavigate('legal_terms')} style={{ cursor: 'pointer' }}>Términos</span>
            <span onClick={() => onNavigate('legal_privacy')} style={{ cursor: 'pointer' }}>Privacidad</span>
            <a href="mailto:dependent.mix@gmail.com">Contacto</a>
          </div>
          <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>Operado por Johan Sebastian Jimenez Calderon • Bogotá, Colombia</p>
          <p style={{ opacity: 0.5, fontSize: '0.6rem' }}>© 2026 Bandly Live Engine. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
