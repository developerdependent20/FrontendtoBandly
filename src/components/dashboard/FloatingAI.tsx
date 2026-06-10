import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Maximize2, Minimize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Logo } from "@/components/Logo";

interface FloatingAIProps {
  profile: any;
}

export function FloatingAI({ profile }: FloatingAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: "assistant", content: `¡Hola ${profile?.full_name?.split(" ")[0] || ""}! Soy **CLANTech**, tu guía educativo en la plataforma. ¿En qué te puedo ayudar hoy?` }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/clantech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          studentProfile: profile
        }),
      });

      if (!response.ok) throw new Error("Error en la respuesta del agente.");

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let aiMessage = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          aiMessage += decoder.decode(value, { stream: true });
          
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content = aiMessage;
            return updated;
          });
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, tuve un problema de conexión. ¿Puedes intentar de nuevo?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="hover-glow"
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "var(--brand-glow)",
          border: "1px solid var(--brand-secondary)",
          color: "var(--brand-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 9999,
          boxShadow: "0 10px 25px rgba(212, 175, 55, 0.2)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden"
        }}
      >
        <div style={{ marginTop: "2px" }}>
          <Logo variant="stacked" sizeMultiplier={0.28} showText={false} />
        </div>
      </button>
    );
  }

  return (
    <div 
      style={{
        position: "fixed",
        bottom: isExpanded ? "0" : "30px",
        right: isExpanded ? "0" : "30px",
        width: isExpanded ? "100%" : "400px",
        height: isExpanded ? "100%" : "600px",
        maxWidth: "100%",
        maxHeight: "100%",
        background: "var(--bg-card)",
        border: isExpanded ? "none" : "1px solid var(--glass-border)",
        borderRadius: isExpanded ? "0" : "24px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 9999,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      {/* Header */}
      <div style={{
        padding: "20px",
        background: "var(--bg-page)",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "var(--brand-glow)",
            color: "var(--brand-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Bot size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>CLANTech</h3>
            <p style={{ fontSize: "0.75rem", margin: 0, color: "var(--text-muted)" }}>Tutor Educativo Virtual</p>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            className="hover-glow"
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            className="hover-glow"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        padding: "20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        background: "var(--bg-card)"
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: "flex",
            gap: "12px",
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            maxWidth: "85%"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              minWidth: "32px",
              borderRadius: "50%",
              background: msg.role === "user" ? "rgba(255,255,255,0.1)" : "var(--brand-glow)",
              color: msg.role === "user" ? "var(--text-main)" : "var(--brand-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div style={{
              background: msg.role === "user" ? "var(--text-main)" : "var(--bg-page)",
              color: msg.role === "user" ? "#000" : "var(--text-main)",
              padding: "12px 18px",
              borderRadius: "18px",
              borderTopRightRadius: msg.role === "user" ? "4px" : "18px",
              borderTopLeftRadius: msg.role === "user" ? "18px" : "4px",
              border: msg.role === "user" ? "none" : "1px solid var(--glass-border)",
              fontSize: "0.95rem",
              lineHeight: 1.5
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{
            alignSelf: "flex-start",
            display: "flex",
            gap: "12px",
            maxWidth: "85%"
          }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--brand-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={16} color="var(--brand-secondary)" />
            </div>
            <div style={{ background: "var(--bg-page)", padding: "12px 18px", borderRadius: "18px", borderTopLeftRadius: "4px", border: "1px solid var(--glass-border)" }}>
              <span className="dot-pulse">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: "20px",
        background: "var(--bg-page)",
        borderTop: "1px solid var(--glass-border)"
      }}>
        <form onSubmit={handleSubmit} style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-end"
        }}>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Escribe tu duda aquí..."
            style={{
              flex: 1,
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              padding: "14px 20px",
              color: "var(--text-main)",
              fontSize: "0.95rem",
              resize: "none",
              minHeight: "52px",
              maxHeight: "150px"
            }}
            rows={1}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              background: "var(--brand-secondary)",
              border: "none",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              opacity: input.trim() && !isLoading ? 1 : 0.5,
              transition: "0.2s"
            }}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
