import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mail, ArrowRight, Sparkles } from 'lucide-react';

// Asistente de ayuda de la landing. Habla con POST /api/assistant/chat del backend,
// que usa OpenRouter. La llave NUNCA vive aquí.
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
);
const SUPPORT_EMAIL = 'dependent.mix@gmail.com';
const MAX_CHARS = 600; // igual que el backend

const COPY = {
  es: {
    title: 'Asistente Bandly',
    sub: 'Resuelvo tus dudas antes de comprar',
    greeting: '¡Hola! Soy el asistente de Bandly. Cuéntame qué necesitas (banda, iglesia, evento) y te digo qué plan te conviene.',
    placeholder: 'Escribe tu pregunta…',
    send: 'Enviar',
    open: 'Abrir asistente',
    close: 'Cerrar',
    auto: 'Asistente automático · puede equivocarse',
    errorBusy: 'Estoy recibiendo muchas preguntas ahora mismo. Intenta en unos minutos o escríbenos.',
    errorGeneric: 'No pude responder ahora. Puedes escribirnos y te ayudamos.',
    ctaSignup: 'Crear cuenta gratis',
    ctaContact: 'Escribir al equipo',
    chips: ['¿Qué plan me conviene?', '¿Cuánto cuesta?', '¿Puedo cancelar cuando quiera?', '¿Qué incluye el plan gratis?'],
  },
  en: {
    title: 'Bandly Assistant',
    sub: 'I answer your questions before you buy',
    greeting: "Hi! I'm Bandly's assistant. Tell me what you need (band, church, event) and I'll tell you which plan fits.",
    placeholder: 'Type your question…',
    send: 'Send',
    open: 'Open assistant',
    close: 'Close',
    auto: 'Automated assistant · it can make mistakes',
    errorBusy: "I'm getting a lot of questions right now. Try again in a few minutes or write to us.",
    errorGeneric: "I couldn't answer right now. You can write to us and we'll help.",
    ctaSignup: 'Create free account',
    ctaContact: 'Email the team',
    chips: ['Which plan fits me?', 'How much does it cost?', 'Can I cancel anytime?', "What's in the free plan?"],
  },
};

export default function AssistantChat({ lang = 'es', onGetStarted }) {
  const c = COPY[lang] || COPY.es;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  // { role: 'user'|'assistant', content, cta?, error? } — el saludo no se manda al modelo
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);

  const send = async (text) => {
    const content = (text ?? input).trim().slice(0, MAX_CHARS);
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      // Solo se envían mensajes reales (sin errores); el backend recorta el historial.
      const payload = next.filter(m => !m.error).map(({ role, content: ct }) => ({ role, content: ct }));
      const r = await fetch(`${API_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });
      if (!r.ok) {
        const busyErr = r.status === 429;
        setMessages(m => [...m, { role: 'assistant', content: busyErr ? c.errorBusy : c.errorGeneric, cta: 'contact', error: true }]);
      } else {
        const data = await r.json();
        setMessages(m => [...m, { role: 'assistant', content: data.reply, cta: data.cta }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: c.errorGeneric, cta: 'contact', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const renderCta = (cta) => {
    if (cta === 'signup') {
      return (
        <button className="lp-chat-cta" onClick={() => onGetStarted?.('signup')}>
          {c.ctaSignup} <ArrowRight size={14} />
        </button>
      );
    }
    if (cta === 'contact') {
      return (
        <a className="lp-chat-cta lp-chat-cta-alt" href={`mailto:${SUPPORT_EMAIL}`}>
          <Mail size={14} /> {c.ctaContact}
        </a>
      );
    }
    return null;
  };

  return (
    <>
      {!open && (
        <button className="lp-chat-fab" onClick={() => setOpen(true)} aria-label={c.open}>
          <MessageCircle size={24} />
          <span className="lp-chat-fab-dot" />
        </button>
      )}

      {open && (
        <div className="lp-chat" role="dialog" aria-label={c.title}>
          <header className="lp-chat-head">
            <div className="lp-chat-avatar"><Sparkles size={18} /></div>
            <div className="lp-chat-head-text">
              <b>{c.title}</b>
              <small>{c.sub}</small>
            </div>
            <button className="lp-chat-x" onClick={() => setOpen(false)} aria-label={c.close}><X size={18} /></button>
          </header>

          <div className="lp-chat-body" ref={listRef} aria-live="polite">
            <div className="lp-chat-msg bot">{c.greeting}</div>

            {messages.length === 0 && (
              <div className="lp-chat-chips">
                {c.chips.map((q) => (
                  <button key={q} onClick={() => send(q)}>{q}</button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`lp-chat-row ${m.role === 'user' ? 'me' : ''}`}>
                <div className={`lp-chat-msg ${m.role === 'user' ? 'me' : 'bot'}`}>{m.content}</div>
                {m.role === 'assistant' && renderCta(m.cta)}
              </div>
            ))}

            {busy && (
              <div className="lp-chat-msg bot lp-chat-typing" aria-label="…"><i /><i /><i /></div>
            )}
          </div>

          <footer className="lp-chat-foot">
            <div className="lp-chat-input">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={MAX_CHARS}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={c.placeholder}
                aria-label={c.placeholder}
              />
              <button onClick={() => send()} disabled={busy || !input.trim()} aria-label={c.send}><Send size={16} /></button>
            </div>
            <p className="lp-chat-note">{c.auto}</p>
          </footer>
        </div>
      )}
    </>
  );
}
