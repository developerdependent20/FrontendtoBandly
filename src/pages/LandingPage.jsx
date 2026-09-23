import React, { useState, useEffect } from 'react';
import { landingDict } from './landingDict';
import { PLANS } from '../utils/planFeatures';
import { Music, ShieldCheck, Crown, Zap, Tv, Image as ImageIcon, Lightbulb, Smartphone, Piano, FileText, CalendarCheck } from 'lucide-react';

const SUPABASE_IMG = 'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/';
const DAW_IMG = `${SUPABASE_IMG}Captura%20de%20pantalla%202026-09-21%20093312.png`;
const PRESENTER_IMG = `${SUPABASE_IMG}Captura%20de%20pantalla%202026-09-21%20093656.png`;

const FRAME_STYLE = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '20px',
  boxShadow: '0 40px 80px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.1)'
};

const badgeHover = {
  onMouseOver: e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.opacity = '1'; },
  onMouseOut: e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.opacity = '0.7'; }
};
const badgeStyle = { height: '42px', width: 'auto', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s', opacity: 0.7 };

const PLAN_ORDER = ['free', 'starter', 'pro', 'elite'];
const PLAN_ICON_COLOR = { starter: 'var(--primary)', pro: 'var(--accent)', elite: 'var(--accent)' };

export default function LandingPage({ onGetStarted, onNavigate }) {
  const [billingPeriod, setBillingPeriod] = useState('annual');
  const [lang, setLang] = useState('es');
  const t = landingDict[lang];

  // Mantener <html lang> sincronizado: evita que el traductor del navegador
  // intente traducir contenido ya traducido (y destroce la marca)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Scroll a la sección del hash (ej. #pricing) al montar: el auto-scroll nativo
  // del navegador ya pasó antes de que React termine de renderizar el DOM.
  useEffect(() => {
    const hash = window.location.hash?.replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'instant' });
  }, []);

  const isAnnual = billingPeriod === 'annual';
  const chooseLabel = { starter: t.chooseStarter, pro: t.choosePro, elite: t.chooseElite };

  return (
    <div className="landing-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="hero-decorations" />

      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img
            src={`${SUPABASE_IMG}Bandly%20nuevo.png`}
            alt="Bandly"
            style={{ height: '65px', width: 'auto' }}
          />
        </div>

        <div className="landing-nav-center hide-mobile">
          <a href="#multitrack">{t.navFeatures}</a>
          <a href="#pricing">{t.navPricing}</a>
        </div>

        <div className="landing-nav-links">
          {/* Selector: muestra ambos idiomas, el ACTIVO resaltado (antes mostraba el destino y confundía) */}
          <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: lang === 'es' ? 'white' : 'rgba(255,255,255,0.35)' }}>ES</span>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>|</span>
            <span style={{ color: lang === 'en' ? 'white' : 'rgba(255,255,255,0.35)' }}>EN</span>
          </button>
          <button onClick={() => onGetStarted('login')} className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.2rem', border: 'none', fontSize: '0.85rem' }}>{t.btnLogin}</button>
          <button onClick={() => onGetStarted('signup')} className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>{t.btnSignup}</button>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-hero-centered">
        <div className="hero-content-full">
          <h1 className="hero-main-title-large" style={{ marginTop: '3rem' }}>
            {t.heroMain} <br />
            <span className="serif-accent">{t.heroSub}</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--text-muted)', maxWidth: '640px', margin: '1.5rem auto 0 auto', lineHeight: '1.6', fontWeight: '500' }}>
            {t.heroDesc}
          </p>

          <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '3rem' }}>
            <button onClick={() => onGetStarted('signup')} className="btn-primary" style={{ padding: '1.2rem 2.5rem', fontSize: '1rem', width: 'auto', fontWeight: '500' }}>{t.btnStart}</button>
            <button onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })} className="btn-secondary" style={{ padding: '1.2rem 2.5rem', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', width: 'auto', fontWeight: '500' }}>{t.btnViewPlans}</button>
          </div>

          <div className="compatibility-badges-centered" style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.availableOn}</span>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <img src={`${SUPABASE_IMG}BadgeMacOS.png`} alt="macOS" style={badgeStyle} {...badgeHover} />
              <img src={`${SUPABASE_IMG}images.png`} alt="Windows" style={badgeStyle} {...badgeHover} />
              <img src={`${SUPABASE_IMG}0w8ONb9ouWJ2GDFdyHnwlzOy90.avif`} alt="Google Play" style={badgeStyle} {...badgeHover} />
            </div>
          </div>
        </div>
      </main>

      {/* La diferencia de Bandly: un marcador = audio + letra + luces */}
      <section className="premium-statement">
        <div className="statement-content">
          <p className="statement-mini">{t.premiumMini}</p>
          <h2 className="statement-main">
            {t.premiumMain1} <br />
            {t.premiumMain2} <span className="serif-accent">{t.premiumMain3}</span>
          </h2>
          <p className="statement-support">{t.premiumSupport}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', marginTop: '3.5rem' }}>
            {[
              { icon: <Music size={22} color="var(--primary)" />, title: t.syncBadge1, desc: t.syncBadge1Desc },
              { icon: <Tv size={22} color="var(--primary)" />, title: t.syncBadge2, desc: t.syncBadge2Desc },
              { icon: <Lightbulb size={22} color="var(--primary)" />, title: t.syncBadge3, desc: t.syncBadge3Desc },
            ].map((item, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'rgba(247, 244, 239, 0.03)', border: '1px solid rgba(247, 244, 239, 0.18)', borderRadius: '12px', padding: '0.9rem 1.4rem', textAlign: 'left' }}>
                  <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '12px', background: 'rgba(247, 244, 239, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: '#fff', fontSize: '0.95rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                </div>
                {i < 2 && (
                  <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 500, opacity: 0.6 }}>=</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Bandly DAW */}
      <section id="multitrack" className="pro-player-showcase">
        <div className="pro-player-flex">
          <div style={{ flex: '1', minWidth: '300px', order: 2 }}>
            <h2 className="showcase-title" style={{ textAlign: 'left', marginBottom: '1.5rem', lineHeight: '1.1' }}>
              {t.dawTitle1} <br className="hide-mobile" />
              <span className="serif-accent" style={{ fontSize: '1.1em' }}>{t.dawTitle2}</span>
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '2rem' }}>{t.dawDesc}</p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {t.dawFeats.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: '500' }}>✓</div>
                  <div>
                    <strong style={{ display: 'block', color: 'white' }}>{item.title}</strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: '1.2', minWidth: '300px', order: 1 }}>
            <div style={FRAME_STYLE}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(247, 244, 239, 0.04), rgba(247, 244, 239, 0.04))', zIndex: 2, pointerEvents: 'none' }}></div>
              <img
                src={DAW_IMG}
                alt={t.dawAlt}
                loading="lazy"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bandly Presenter */}
      <section className="presenter-showcase" style={{ padding: '8rem 2rem', background: 'rgba(247, 244, 239, 0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="section-header-centered" style={{ marginBottom: '4rem' }}>
          <p className="statement-mini">{t.presenterMini}</p>
          <h2 className="section-title-large">{t.presenterTitle1} <span className="serif-accent">{t.presenterTitle2}</span></h2>
          <p className="section-subtitle">{t.presenterDesc}</p>
        </div>

        <div style={{ ...FRAME_STYLE, maxWidth: '1100px', margin: '0 auto 4rem' }}>
          <img src={PRESENTER_IMG} alt={t.presenterAlt} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
          {[Zap, Tv, ImageIcon].map((Icon, i) => (
            <div key={i} className="hover-scale" style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(247, 244, 239, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={28} color="#f7f4ef" />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '500', margin: 0, color: '#fff' }}>{t.presenterFeats[i].title}</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', lineHeight: '1.6' }}>{t.presenterFeats[i].desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Equipo / celular */}
      <section className="app-virtues-showcase" style={{ padding: '8rem 2rem', background: '#101012', overflow: 'hidden' }}>
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
            background: #17171a;
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
            transform: scale(0.85);
          }
          .virtue-center {
            max-width: 320px;
            z-index: 10;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35), 0 0 0 2px rgba(0, 0, 0, 0.35);
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
          <h2 className="section-title-large">{t.teamTitle1} <span className="serif-accent">{t.teamTitle2}</span></h2>
          <p className="section-subtitle">{t.teamDesc}</p>
        </div>

        <div className="virtues-gallery">
          <div className="virtue-img-wrapper virtue-left">
            <img src={`${SUPABASE_IMG}WhatsApp%20Image%202026-04-30%20at%2011.13.28%20PM%20(1).jpeg`} alt={t.teamAlts[0]} loading="lazy" />
          </div>
          <div className="virtue-img-wrapper virtue-center">
            <img src={`${SUPABASE_IMG}WhatsApp%20Image%202026-04-30%20at%2011.13.28%20PM.jpeg`} alt={t.teamAlts[1]} loading="lazy" />
          </div>
          <div className="virtue-img-wrapper virtue-right">
            <img src={`${SUPABASE_IMG}WhatsApp%20Image%202026-04-30%20at%2011.19.05%20PM.jpeg`} alt={t.teamAlts[2]} loading="lazy" />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem', maxWidth: '900px', margin: '4rem auto 0' }}>
          {[Smartphone, Piano, FileText, CalendarCheck].map((Icon, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1.1rem', borderRadius: '50px', background: 'rgba(247, 244, 239, 0.03)', border: '1px solid rgba(247, 244, 239, 0.14)', color: '#fff', fontSize: '0.88rem' }}>
              <Icon size={16} color="var(--primary)" />
              {t.teamChips[i]}
            </div>
          ))}
        </div>
      </section>

      {/* Planes */}
      <section id="pricing" className="landing-pricing-section">
        <div className="section-header-centered">
          <h2 className="section-title-large">{t.pricingTitle}</h2>
          <p className="section-subtitle">{t.pricingDesc}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
            <span style={{ color: !isAnnual ? '#fff' : '#666', fontWeight: 500, fontSize: '0.9rem' }}>{t.monthly}</span>
            <div
              onClick={() => setBillingPeriod(isAnnual ? 'monthly' : 'annual')}
              style={{ width: '50px', height: '26px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', position: 'relative', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div style={{ width: '20px', height: '20px', background: 'var(--primary)', borderRadius: '50%', position: 'absolute', top: '2px', left: isAnnual ? '25px' : '3px', transition: '0.3s ease', boxShadow: '0 0 10px var(--primary)' }} />
            </div>
            <span style={{ color: isAnnual ? '#fff' : '#666', fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {t.annual}
              <span style={{ background: 'var(--primary)', color: '#000', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>{t.save}</span>
            </span>
          </div>
        </div>

        <div className="pricing-grid">
          {PLAN_ORDER.map(id => {
            const plan = PLANS.find(p => p.id === id);
            const copy = t.plans[id];
            const isFree = id === 'free';
            const featured = id === 'starter';
            const price = isAnnual ? plan.yearly : plan.monthly;
            const original = isAnnual ? plan.originalYearly : plan.originalMonthly;
            const iconColor = PLAN_ICON_COLOR[id];
            const Icon = isFree ? ShieldCheck : Crown;

            return (
              <div key={id} className={`pricing-card${featured ? ' featured' : ''}`}>
                {featured && (
                  <div className="pricing-badge-popular" style={{ background: '#ef4444', boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)', animation: 'pulse 2s infinite' }}>{t.launchOffer}</div>
                )}
                <h3>{copy.name}</h3>
                <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', minHeight: '2.6em' }}>{copy.tag}</p>

                <div className="price" style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                  {original && (
                    <span style={{ textDecoration: 'line-through', fontSize: '1.2rem', color: '#666', fontWeight: 400, marginBottom: '6px' }}>${original}</span>
                  )}
                  {isFree ? '$0' : `$${price}`}
                  <span style={{ marginBottom: '6px' }}>{isFree || !isAnnual ? t.monthLabel : t.yearLabel}</span>
                </div>
                <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '-1rem', marginBottom: '1.5rem', minHeight: '1.2em' }}>
                  {!isFree && (isAnnual ? t.equalsPerMonth((plan.yearly / 12).toFixed(1)) : t.billedMonthly)}
                </p>

                <ul className="pricing-features">
                  {copy.star && (
                    <li style={{ alignItems: 'flex-start', gap: '10px' }}>
                      <Crown size={16} color={iconColor} style={{ marginTop: '3px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 500, color: '#fff' }}>{copy.star.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: '2px' }}>{copy.star.desc}</div>
                      </div>
                    </li>
                  )}
                  {copy.features.map((f, i) => (
                    <li key={i}><Icon size={16} color={iconColor} style={{ flexShrink: 0 }} /> {f}</li>
                  ))}
                </ul>

                <button
                  onClick={() => onGetStarted('signup')}
                  className={featured ? 'btn-primary' : 'btn-secondary-outline'}
                  style={{ marginTop: 'auto' }}
                >
                  {isFree ? t.ctaFree : chooseLabel[id]}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA final */}
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
            <span onClick={() => onNavigate('legal_refund')} style={{ cursor: 'pointer' }}>{t.footRefund}</span>
            <a href="mailto:dependent.mix@gmail.com">{t.footContact}</a>
          </div>
          <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>{t.footOp}</p>
          <p style={{ opacity: 0.5, fontSize: '0.6rem' }}>{t.footRights}</p>
        </div>
      </footer>
    </div>
  );
}
