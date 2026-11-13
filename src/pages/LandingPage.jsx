import React, { useState, useEffect, useRef } from 'react';
import { landingDict } from './landingDict';
import { PLANS } from '../utils/planFeatures';
import { APPS } from '../utils/downloadLinks';
import { Music, Tv, Lightbulb, Zap, Image as ImageIcon, Smartphone, Piano, FileText, CalendarCheck, Check, Crown, ShieldCheck, ArrowRight, Download, Apple } from 'lucide-react';
import './landing.css';

const SUPABASE_IMG = 'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/';
const DAW_IMG = `${SUPABASE_IMG}Captura%20de%20pantalla%202026-09-21%20093312.png`;
const PRESENTER_IMG = `${SUPABASE_IMG}Captura%20de%20pantalla%202026-09-21%20093656.png`;
const PHONE_IMGS = [
  `${SUPABASE_IMG}WhatsApp%20Image%202026-04-30%20at%2011.13.28%20PM%20(1).jpeg`,
  `${SUPABASE_IMG}WhatsApp%20Image%202026-04-30%20at%2011.13.28%20PM.jpeg`,
  `${SUPABASE_IMG}WhatsApp%20Image%202026-04-30%20at%2011.19.05%20PM.jpeg`,
];

// Puntitos de luz del hero: posiciones fijas (semilla) para que no salten entre renders
const DOT_COLORS = ['#ffffff', '#ff7aa8', '#ffb347', '#9d8cff'];
const DOTS = (() => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: 46 }, (_, i) => ({
    x: rnd() * 100, y: rnd() * 100,
    size: 2 + Math.round(rnd() * 2),
    color: DOT_COLORS[i % DOT_COLORS.length],
    dur: 3 + rnd() * 5, delay: -rnd() * 8,
  }));
})();

const PLAN_ORDER = ['free', 'starter', 'pro', 'elite'];
const PLAN_ICON_COLOR = { free: '#3ddc97', starter: '#fd429c', pro: '#7c6cff', elite: '#ffb347' };
const LANE_META = [
  { c: '#fd429c', Icon: Music },
  { c: '#7c6cff', Icon: Tv },
  { c: '#ffb347', Icon: Lightbulb },
];

const WinIcon = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5 10.5 4.4v7H3zM11.5 4.3 21 3v8.4h-9.5zM3 12.6h7.5v7L3 18.5zM11.5 12.6H21V21l-9.5-1.3z" /></svg>);
const MacIcon = () => <Apple size={14} aria-hidden="true" />;

// Revela cada bloque al entrar en pantalla (y no hace nada si el navegador no soporta IntersectionObserver)
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal, .lp-stage');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, []);
}

// Luz que sigue al cursor dentro de cada tarjeta
const spot = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

export default function LandingPage({ onGetStarted, onNavigate }) {
  const [billingPeriod, setBillingPeriod] = useState('annual');
  const [lang, setLang] = useState('es');
  const t = landingDict[lang];
  const rootRef = useRef(null);
  useReveal();

  // Mantener <html lang> sincronizado: evita que el traductor del navegador
  // intente traducir contenido ya traducido (y destroce la marca)
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Scroll a la sección del hash (ej. #pricing) al montar
  useEffect(() => {
    const hash = window.location.hash?.replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'instant' });
  }, []);

  const isAnnual = billingPeriod === 'annual';
  const chooseLabel = { starter: t.chooseStarter, pro: t.choosePro, elite: t.chooseElite };
  const goPricing = () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="lp" ref={rootRef}>
      <nav className="lp-nav">
        <img src={`${SUPABASE_IMG}Bandly%20nuevo.png`} alt="Bandly" />
        <div className="lp-nav-links">
          <a href="#multitrack">{t.navFeatures}</a>
          <a href="#downloads">{t.navDownloads}</a>
          <a href="#pricing">{t.navPricing}</a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-lang" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} aria-label="Language">
            {lang === 'es' ? <b>ES</b> : <span>ES</span>}<span>|</span>{lang === 'en' ? <b>EN</b> : <span>EN</span>}
          </button>
          <button className="lp-btn lp-btn-ghost lp-btn-sm lp-btn-login" onClick={() => onGetStarted('login')}>{t.btnLogin}</button>
          <button className="lp-btn lp-btn-primary lp-btn-sm" onClick={() => onGetStarted('signup')}>{t.btnSignup}</button>
        </div>
      </nav>

      {/* Hero */}
      <header className="lp-hero">
        <div className="lp-aurora"><i /><i /><i /></div>
        <div className="lp-dots" aria-hidden="true">
          {DOTS.map((d, i) => (
            <i key={i} style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size, height: d.size, '--dc': d.color, '--dur': `${d.dur}s`, animationDelay: `${d.delay}s` }} />
          ))}
        </div>
        <div className="lp-wrap">
          <div className="lp-pill lp-reveal"><span />{t.heroPill}</div>
          <h1 className="lp-h1 lp-reveal" style={{ '--d': '.08s' }}>
            {t.heroMain}
            <span className="lp-serif lp-grad-text">{t.heroSub}</span>
          </h1>
          <p className="lp-lead lp-reveal" style={{ '--d': '.16s' }}>{t.heroDesc}</p>
          <div className="lp-cta-row lp-reveal" style={{ '--d': '.24s' }}>
            <button className="lp-btn lp-btn-primary" onClick={() => onGetStarted('signup')}>{t.btnStart} <ArrowRight size={18} /></button>
            <button className="lp-btn lp-btn-ghost" onClick={goPricing}>{t.btnViewPlans}</button>
          </div>
          <div className="lp-os lp-reveal" style={{ '--d': '.32s' }}>
            <span><WinIcon />{t.dlWindows}</span>
            <span><MacIcon />{t.dlMac}</span>
          </div>
        </div>

        <div className="lp-stage">
          <div className="lp-window">
            <div className="lp-window-bar"><i /><i /><i /></div>
            <img src={DAW_IMG} alt={t.dawAlt} fetchpriority="high" />
          </div>
        </div>
      </header>

      {/* Cifras */}
      <section className="lp-stats">
        <div className="lp-wrap lp-stats-grid lp-reveal">
          {t.stats.map((s, i) => (
            <div className="lp-stat" key={i}><b>{s.k}</b><span>{s.v}</span></div>
          ))}
        </div>
      </section>

      {/* La diferencia: un marcador mueve todo */}
      <section className="lp-section" id="multitrack">
        <div className="lp-wrap">
          <div className="lp-head" style={{ marginBottom: 0 }}>
            <p className="lp-eyebrow lp-reveal">{t.premiumMini}</p>
            <h2 className="lp-h2 lp-reveal" style={{ maxWidth: '22ch' }}>
              {t.premiumMain1} {t.premiumMain2} <span className="lp-serif lp-grad-text">{t.premiumMain3}</span>
            </h2>
            <p className="lp-sub lp-reveal">{t.premiumSupport}</p>
          </div>

          <div className="lp-flow lp-reveal">
            <div className="lp-flow-track">
              <div className="lp-flow-sections">
                <div />
                <div>{t.flowSections.map((s, i) => <em key={i}>{s}</em>)}</div>
              </div>
              {t.flowLanes.map((name, k) => {
                const { c, Icon } = { c: LANE_META[k].c, Icon: LANE_META[k].Icon };
                return (
                  <div className="lp-lane" data-k={k} style={{ '--c': c }} key={k}>
                    <div className="lp-lane-name"><Icon />{name}</div>
                    <div className="lp-lane-body"><span /><span /><span /><span /><span /></div>
                  </div>
                );
              })}
              <div className="lp-playhead" />
            </div>
            <p className="lp-flow-cap">{t.flowCaption}</p>
          </div>

          <div className="lp-pillars">
            {[t.syncBadge1, t.syncBadge2, t.syncBadge3].map((title, i) => {
              const { c, Icon } = LANE_META[i];
              const desc = [t.syncBadge1Desc, t.syncBadge2Desc, t.syncBadge3Desc][i];
              return (
                <div className="lp-pillar lp-reveal" style={{ '--c': c, '--d': `${i * 0.08}s` }} key={i}>
                  <div className="lp-pillar-ico"><Icon size={20} /></div>
                  <div><b>{title}</b><small>{desc}</small></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Las cuatro apps */}
      <section className="lp-section" id="downloads" style={{ paddingTop: 0 }}>
        <div className="lp-wrap">
          <div className="lp-head">
            <p className="lp-eyebrow lp-reveal">{t.downloadsMini}</p>
            <h2 className="lp-h2 lp-reveal">{t.downloadsTitle1} <span className="lp-serif lp-grad-text">{t.downloadsTitle2}</span></h2>
            <p className="lp-sub lp-reveal">{t.downloadsDesc}</p>
          </div>

          <div className="lp-bento">
            {/* Tracker */}
            <article className="lp-card lp-c-tracker lp-reveal" onMouseMove={spot}>
              <div className="lp-card-top">
                <img src={APPS.daw.logo} alt="" width={52} height={52} loading="lazy" />
                <h3>{t.downloadApps[1].name}</h3>
                <span className="lp-tag">{t.downloadApps[1].plan}</span>
              </div>
              <div className="lp-tracker-body">
                <div>
                  <p style={{ fontSize: '1.05rem', color: 'var(--lp-cream)' }}>{t.dawTitle1} <span className="lp-serif">{t.dawTitle2}</span></p>
                  <p style={{ marginTop: '.5rem' }}>{t.dawDesc}</p>
                  <ul className="lp-feats" style={{ marginTop: '1.2rem' }}>
                    {t.dawFeats.map((f, i) => (
                      <li key={i}><Check /><span><b>{f.title}</b>{f.desc}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="lp-card-shot" style={{ marginBottom: '-2rem', alignSelf: 'end' }}>
                  <img src={DAW_IMG} alt={t.dawAlt} loading="lazy" />
                </div>
              </div>
            </article>

            {/* DAW gratis */}
            <article className="lp-card lp-c-free lp-reveal" style={{ '--d': '.08s' }} onMouseMove={spot}>
              <div className="lp-card-top">
                <img src="/logos/studio.png" alt="" width={52} height={52} loading="lazy" />
                <span className="lp-tag">{t.downloadApps[0].plan}</span>
              </div>
              <h3>{t.downloadApps[0].name}</h3>
              <p>{t.downloadApps[0].desc}</p>
              <span className="lp-os-line">{t.dlWindows} · {t.dlMac}</span>
              <button className="lp-btn lp-btn-primary" onClick={() => onGetStarted('signup')}><Download size={16} /> {t.ctaFree}</button>
            </article>

            {/* Presenter */}
            <article className="lp-card lp-c-presenter lp-reveal" onMouseMove={spot}>
              <div className="lp-card-top">
                <img src={APPS.presenter.logo} alt="" width={52} height={52} loading="lazy" />
                <h3>{t.downloadApps[2].name}</h3>
                <span className="lp-tag">{t.downloadApps[2].plan}</span>
              </div>
              <p>{t.presenterDesc}</p>
              <div className="lp-card-shot">
                <img src={PRESENTER_IMG} alt={t.presenterAlt} loading="lazy" />
              </div>
            </article>

            {/* Lights */}
            <article className="lp-card lp-c-lights lp-reveal" style={{ '--d': '.08s' }} onMouseMove={spot}>
              <div className="lp-glow" />
              <div className="lp-card-top">
                <img src={APPS.lights.logo} alt="" width={52} height={52} loading="lazy" />
                <h3>{t.downloadApps[3].name}</h3>
                <span className="lp-tag">{t.downloadApps[3].plan}</span>
              </div>
              <p>{t.downloadApps[3].desc}</p>
              <div className="lp-beams">
                {['#ff4d6d', '#ffb347', '#3ddc97', '#4cc9f0', '#7c6cff', '#ff4d6d'].map((b, i) => (
                  <i key={i} style={{ '--b': b, '--dl': `${i * 0.35}s` }} />
                ))}
              </div>
              <span className="lp-os-line" style={{ marginTop: 'auto' }}>{t.dlWindows} · {t.dlMac}</span>
            </article>
          </div>

          {/* Presenter: qué hace */}
          <div className="lp-stage-display">
            {[Zap, Tv, ImageIcon].map((Icon, i) => (
              <div className="lp-sd lp-reveal" style={{ '--c': '#7c6cff', '--d': `${i * 0.08}s` }} key={i}>
                <Icon />
                <b>{t.presenterFeats[i].title}</b>
                <small>{t.presenterFeats[i].desc}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipo / celular */}
      <section className="lp-section" style={{ paddingTop: '2rem' }}>
        <div className="lp-wrap">
          <div className="lp-head">
            <h2 className="lp-h2 lp-reveal">{t.teamTitle1} <span className="lp-serif lp-grad-text">{t.teamTitle2}</span></h2>
            <p className="lp-sub lp-reveal">{t.teamDesc}</p>
          </div>
          <div className="lp-phones lp-reveal">
            {PHONE_IMGS.map((src, i) => (
              <div className="lp-phone" key={i}><img src={src} alt={t.teamAlts[i]} loading="lazy" /></div>
            ))}
          </div>
          <div className="lp-chips">
            {[Smartphone, Piano, FileText, CalendarCheck].map((Icon, i) => (
              <div className="lp-chip lp-reveal" style={{ '--d': `${i * 0.06}s` }} key={i}><Icon />{t.teamChips[i]}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes */}
      <section id="pricing" className="lp-pricing">
        <div className="lp-wrap">
          <div className="lp-head" style={{ marginBottom: '2rem' }}>
            <h2 className="lp-h2 lp-reveal" style={{ maxWidth: '20ch' }}>{t.pricingTitle}</h2>
            <p className="lp-sub lp-reveal">{t.pricingDesc}</p>
            <div className="lp-toggle lp-reveal">
              <span style={{ color: !isAnnual ? '#fff' : 'rgba(255,255,255,.45)' }}>{t.monthly}</span>
              <button className={`lp-switch${isAnnual ? ' on' : ''}`} onClick={() => setBillingPeriod(isAnnual ? 'monthly' : 'annual')} aria-label={`${t.monthly} / ${t.annual}`}><i /></button>
              <span style={{ color: isAnnual ? '#fff' : 'rgba(255,255,255,.45)' }}>{t.annual}<span className="lp-save">{t.save}</span></span>
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
                    <div className="pricing-badge-popular" style={{ background: 'linear-gradient(135deg,#fd429c,#ff6a4a)', color: '#fff', boxShadow: '0 0 20px rgba(253, 66, 156, 0.5)' }}>{t.launchOffer}</div>
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
        </div>
      </section>

      {/* CTA final */}
      <section className="lp-final">
        <div className="lp-wrap">
          <div className="lp-final-box lp-reveal">
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaDesc}</p>
            <button className="lp-btn lp-btn-primary" style={{ padding: '1.1rem 2.6rem', fontSize: '1.05rem' }} onClick={() => onGetStarted('signup')}>{t.ctaBtn} <ArrowRight size={18} /></button>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-links">
            <span onClick={() => onNavigate('legal_terms')}>{t.footTerms}</span>
            <span onClick={() => onNavigate('legal_privacy')}>{t.footPriv}</span>
            <span onClick={() => onNavigate('legal_refund')}>{t.footRefund}</span>
            <a href="mailto:dependent.mix@gmail.com">{t.footContact}</a>
          </div>
          <p>{t.footOp}</p>
          <p style={{ opacity: 0.7 }}>{t.footRights}</p>
        </div>
      </footer>
    </div>
  );
}
