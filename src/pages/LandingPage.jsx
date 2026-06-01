import React, { useState } from 'react';
import { landingDict } from './landingDict';
import { Speaker, Activity, Cloud, Calendar as CalendarIcon, Music, ShieldCheck, Crown, CheckCircle2, Monitor } from 'lucide-react';

export default function LandingPage({ onGetStarted, onNavigate }) {
  const [billingPeriod, setBillingPeriod] = useState('annual');
  const [lang, setLang] = useState('es');
  const t = landingDict[lang];

  return (
    <div className="landing-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="hero-decorations">
        {/* Eliminados elementos distractores para un look más limpio */}
      </div>
      
        <nav className="landing-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img 
              src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Bandly%20nuevo.png" 
              alt="Bandly" 
              style={{ height: '50px', width: 'auto' }}
            />
          </div>

          <div className="landing-nav-center hide-mobile">
            <a href="#multitrack">{t.navFeatures}</a>
            <a href="#pricing">{t.navPricing}</a>
          </div>

          <div className="landing-nav-links">
            <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '50px', padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>{lang === 'es' ? 'EN' : 'ES'}</button>
            <button onClick={() => onGetStarted('login')} className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.2rem', border: 'none', fontSize: '0.85rem' }}>{t.btnLogin}</button>
            <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>{t.btnSignup}</button>
          </div>
        </nav>

      <main className="landing-hero-centered">
        <div className="hero-content-full">
          <div style={{ marginBottom: '1rem', animation: 'dropdownFadeIn 0.8s ease-out' }}>
            <img 
              src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Bandly%20nuevo.png" 
              style={{ height: '140px', filter: 'drop-shadow(0 0 30px rgba(37, 99, 235, 0.4))' }} 
            />
          </div>
          <h1 className="hero-main-title-large" style={{ marginTop: '-1rem' }}>
            {t.heroMain} <br/>
            <span className="serif-accent">{t.heroSub}</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--text-muted)', maxWidth: '700px', margin: '1.5rem auto 0 auto', lineHeight: '1.6', fontWeight: '500' }}>
            {t.heroDesc.split(' multitracks')[0]} multitracks <br className="hide-mobile" /> {t.heroDesc.split('multitracks ')[1]}
          </p>
          <p className="hero-clarifier" style={{ marginTop: '2rem', opacity: 0.6 }}>
            <span>{t.heroTags.split(' • ')[0]}</span> <span className="dot">•</span> <span>{t.heroTags.split(' • ')[1]}</span> <span className="dot">•</span> <span>{t.heroTags.split(' • ')[2]}</span> <span className="dot">•</span> <span>{t.heroTags.split(' • ')[3]}</span> <span className="dot">•</span> <span>{t.heroTags.split(' • ')[4]}</span>
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', marginTop: '3.5rem' }}>
            <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ padding: '1.2rem 2.5rem', fontSize: '1rem', width: 'auto', fontWeight: '800' }}>{t.btnStart}</button>
              <button onClick={() => document.getElementById('pricing').scrollIntoView({behavior:'smooth'})} className="btn-secondary" style={{ padding: '1.2rem 2.5rem', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', width: 'auto', fontWeight: '800' }}>{t.btnViewPlans}</button>
            </div>
          </div>
          
          <div className="compatibility-badges-centered" style={{ marginTop: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px' }}>{t.availableOn}</span>
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
            
            <div className="purpose-grid" style={{ 
              marginTop: '4rem', 
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
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem', color: '#fff', letterSpacing: '-0.5px' }}>{t.webTitle}</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    {t.webDesc}
                  </p>
                </div>
              </div>
              
              {/* Desktop Card */}
              <div className="hover-scale" style={{ 
                padding: '2rem', 
                background: 'rgba(37, 99, 235, 0.05)', 
                border: '1px solid rgba(37, 99, 235, 0.2)', 
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ color: 'var(--primary)' }}><Monitor size={32} strokeWidth={1.5} /></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem', color: '#fff', letterSpacing: '-0.5px' }}>{t.desktopTitle}</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    {lang === 'es' ? <>{t.desktopDesc.split('reproducir')[0]}<strong>reproducir</strong>{t.desktopDesc.split('reproducir')[1]}</> : <>{t.desktopDesc.split('play')[0]}<strong>play</strong>{t.desktopDesc.split('play')[1]}</>}
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
          <p className="statement-mini">{t.premiumMini}</p>
          <h2 className="statement-main">
            {t.premiumMain1} <br/>
            {t.premiumMain2} <span className="serif-accent">{t.premiumMain3}</span>
          </h2>
          <p className="statement-support">
            {t.premiumSupport1} <span className="serif-accent">{t.premiumSupport2}</span> {t.premiumSupport3}
          </p>
        </div>
      </section>

      {/* Pro Player Showcase Section */}
      <section id="multitrack" className="pro-player-showcase">
        <div className="pro-player-flex">
          <div style={{ flex: '1', minWidth: '300px', order: 2 }}>
            <h2 className="showcase-title" style={{ textAlign: 'left', marginBottom: '1.5rem', lineHeight: '1.1' }}>
              {t.proPlayerTitle1} <br className="hide-mobile" />
              <span className="serif-accent" style={{ fontSize: '1.1em' }}>{t.proPlayerTitle2}</span>
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '2rem' }}>
              {t.proPlayerDesc}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { title: t.proFeat1, desc: t.proFeat1Desc },
                { title: t.proFeat2, desc: t.proFeat2Desc },
                { title: t.proFeat3, desc: t.proFeat3Desc }
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
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, rgba(37, 99, 235,0.1), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>
              <img 
                src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Captura%20de%20pantalla%202026-04-29%20121603.png" 
                alt="Pro Player Interface" 
                style={{ 
                   width: '100%', 
                   height: 'auto', 
                   display: 'block',
                   borderRadius: '12px',
                   border: '1px solid rgba(255,255,255,0.05)'
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
            box-shadow: 0 30px 60px rgba(37, 99, 235,0.3), 0 0 0 2px rgba(37, 99, 235,0.5);
          }
          .virtue-img-wrapper:hover {
            transform: translateY(-15px) scale(1.05);
            opacity: 1;
            z-index: 20;
            box-shadow: 0 30px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.2);
          }
          @media (max-width: 1024px) {
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
          <h2 className="section-title-large">{t.mobileTitle1} <span className="serif-accent">{t.mobileTitle2}</span></h2>
          <p className="section-subtitle">{t.mobileDesc}</p>
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
            <h3>{t.feat1Title}</h3>
            <p>{t.feat1Desc}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Activity size={32} /></div>
            <h3>{t.feat2Title}</h3>
            <p>{t.feat2Desc}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Cloud size={32} /></div>
            <h3>{t.feat3Title}</h3>
            <p>{t.feat3Desc}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><CalendarIcon size={32} /></div>
            <h3>{t.feat4Title}</h3>
            <p>{t.feat4Desc}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Music size={32} /></div>
            <h3>{t.feat5Title}</h3>
            <p>{t.feat5Desc}</p>
          </div>
        </div>
      </section>

      {/* Comparison Section (The "Why Bandly" Factor) */}
      <section className="comparison-section" style={{ padding: '8rem 2rem', background: 'rgba(255,255,255,0.02)' }}>
        <div className="section-header-centered">
          <h2 className="section-title-large">{t.whyTitle} <span className="serif-accent">Bandly</span>?</h2>
          <p className="section-subtitle">{t.whyDesc}</p>
        </div>

        <div style={{ maxWidth: '1000px', margin: '4rem auto 0', overflowX: 'auto' }}>
          <table className="comparison-table" style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontSize: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '1.5rem', opacity: 0.5 }}>{t.tableFeat}</th>
                <th style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary)', fontWeight: 800 }}>BANDLY</th>
                <th style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.5 }}>{t.tableOthers}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: t.f1, bandly: true, others: t.f1O },
                { feature: t.f2, bandly: t.f2B, others: t.f2O },
                { feature: t.f3, bandly: t.f3B, others: t.f3O },
                { feature: t.f4, bandly: t.f4B, others: t.f4O },
                { feature: t.f5, bandly: true, others: true },
                { feature: t.f6, bandly: "$39/mes", others: "$135+/mes" }
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
          <h2 className="section-title-large">{t.navPricing} diseñados para cada etapa de tu equipo</h2>
          <p className="section-subtitle">{t.pricingDesc}</p>
          
          {/* Billing Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
            <span style={{ color: billingPeriod === 'monthly' ? '#fff' : '#666', fontWeight: 600, fontSize: '0.9rem' }}>{t.monthly}</span>
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
              <span style={{ background: 'var(--primary)', color: '#000', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>{t.save}</span>
            </span>
          </div>
        </div>

        <div className="pricing-grid">
          {/* Plan Básico */}
          <div className="pricing-card">
            <div className="pricing-badge">BÁSICO</div>
            <h3>{t.freePlan}</h3>
            <div className="price">0<span>{t.monthLabel}</span></div>
            <p style={{fontSize:'0.75rem', opacity:0.6, marginTop:'-1rem', marginBottom:'1.5rem'}}>{t.freeSub}</p>
            <ul className="pricing-features">
              <li><ShieldCheck size={16} /> {t.f_band1}</li>
              <li><ShieldCheck size={16} /> {t.f_user10}</li>
              <li><ShieldCheck size={16} /> {t.f_stor300}</li>
              <li><ShieldCheck size={16} /> {t.f_cal}</li>
              <li><ShieldCheck size={16} /> {t.f_rep}</li>
              <li><ShieldCheck size={16} /> Letras</li>
              <li><ShieldCheck size={16} /> {t.f_yt}</li>
            </ul>
            <button onClick={() => onGetStarted('signup')} className="btn-secondary-outline">{t.ctaBtn}</button>
          </div>

          {/* Plan Starter */}
          <div className="pricing-card featured">
            <div className="pricing-badge-popular" style={{background: '#ef4444', boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)', animation: 'pulse 2s infinite'}}>🔥 OFERTA DE LANZAMIENTO</div>
            <h3>{t.starterPlan}</h3>
            <div className="price" style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
              {billingPeriod === 'monthly' ? (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$19</span>
                  $7
                </>
              ) : (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$190</span>
                  $59
                </>
              )}
              <span style={{ marginBottom: '6px' }}>{billingPeriod === 'monthly' ? t.monthLabel : t.yearLabel}</span>
            </div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>
              {billingPeriod === 'monthly' ? t.starterSubMo : t.starterSubYr}
            </p>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--primary)" /> {t.f_band3}</li>
              <li><Crown size={16} color="var(--primary)" /> {t.f_user25}</li>
              <li><Crown size={16} color="var(--primary)" /> {t.f_stor10}</li>
              <li><Crown size={16} color="var(--primary)" /> {t.f_pdf}</li>
              <li><Crown size={16} color="var(--primary)" /> {t.f_mgr}</li>
              <li><Crown size={16} color="var(--primary)" /> {t.f_res}</li>
              <li><Crown size={16} color="var(--primary)" /> {t.f_player}</li>
            </ul>
            <button onClick={() => onGetStarted('signup')} className="btn-primary">{t.chooseStarter}</button>
          </div>

          {/* Plan Pro */}
          <div className="pricing-card">
            <div className="pricing-badge">PRO</div>
            <h3>{t.proPlan}</h3>
            <div className="price" style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
              {billingPeriod === 'monthly' ? (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$39</span>
                  $17
                </>
              ) : (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$390</span>
                  $145
                </>
              )}
              <span style={{ marginBottom: '6px' }}>{billingPeriod === 'monthly' ? t.monthLabel : t.yearLabel}</span>
            </div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>
              {billingPeriod === 'monthly' ? t.proSubMo : t.proSubYr}
            </p>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--accent)" /> {t.f_band10}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_user75}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_stor45}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_allStarter}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_preview}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_seqPlayer}</li>
            </ul>
            <button onClick={() => onGetStarted('signup')} className="btn-secondary-outline">{t.choosePro}</button>
          </div>

          {/* Plan Elite */}
          <div className="pricing-card">
            <div className="pricing-badge">ELITE</div>
            <h3>{t.elitePlan}</h3>
            <div className="price" style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
              {billingPeriod === 'monthly' ? (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$79</span>
                  $37
                </>
              ) : (
                <>
                  <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>$790</span>
                  $310
                </>
              )}
              <span style={{ marginBottom: '6px' }}>{billingPeriod === 'monthly' ? t.monthLabel : t.yearLabel}</span>
            </div>
            <p style={{fontSize:'0.75rem', opacity:0.8, marginTop:'-1rem', marginBottom:'1.5rem'}}>
              {billingPeriod === 'monthly' ? t.eliteSubMo : t.eliteSubYr}
            </p>
            <ul className="pricing-features">
              <li><Crown size={16} color="var(--accent)" /> {t.f_bandUl}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_userUl}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_stor100}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_allPro}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_roles}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_support}</li>
              <li><Crown size={16} color="var(--accent)" /> {t.f_early}</li>
            </ul>
            <button onClick={() => onGetStarted('signup')} className="btn-secondary-outline">{t.chooseElite}</button>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="landing-cta-box" style={{ padding: '8rem 2rem' }}>
        <h2 style={{ fontSize: '3rem', letterSpacing: '-2px' }}>{t.ctaTitle}</h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '2.5rem' }}>{t.ctaDesc}</p>
        <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ padding: '1.2rem 4rem', fontSize: '1.1rem', borderRadius: '50px' }}>{t.ctaBtn}</button>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-links" style={{ fontSize: '0.65rem' }}>
            <span onClick={() => onNavigate('legal_terms')} style={{ cursor: 'pointer' }}>{t.footTerms}</span>
            <span onClick={() => onNavigate('legal_privacy')} style={{ cursor: 'pointer' }}>{t.footPriv}</span>
            <a href="mailto:dependent.mix@gmail.com">{t.footContact}</a>
          </div>
          <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>{t.footOp}</p>
          <p style={{ opacity: 0.5, fontSize: '0.6rem' }}>{t.footRights}</p>
        </div>
      </footer>
    </div>
  );
}
