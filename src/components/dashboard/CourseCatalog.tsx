"use client";

import React from "react";
import Link from "next/link";

export const CourseCatalog = ({ courses, loading }: { courses: any[], loading: boolean }) => {
  return (
    <div className="dashboard-view active">
      <h2 className="art-text" style={{ fontSize: "2.8rem", margin: "0 0 40px 0", color: "var(--text-main)" }}>
        Catálogo de <span style={{ color: "var(--brand-primary)" }}>Rutas.</span>
      </h2>
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "25px" }}>
            {[1,2,3].map(i => (
              <div key={i} className="stat-card" style={{ padding: 0, height: 260, background: "var(--bg-card)", opacity: 0.1, animation: "pulse 1.5s infinite", borderRadius: "24px" }} />
            ))}
        </div>
      ) : courses.length === 0 ? (
          <div style={{ background: "var(--bg-card)", padding: "60px 40px", borderRadius: "24px", border: "1px dashed var(--glass-border)", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ width: "80px", height: "80px", background: "rgba(0, 82, 255, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <i data-lucide="lock" aria-hidden="true" style={{ width: "35px", height: "35px", color: "var(--brand-primary)" }}></i>
            </div>
            <h3 className="art-text" style={{ fontSize: "1.8rem", marginBottom: "12px", color: "var(--text-main)" }}>Aún no tienes rutas activas</h3>
            <p style={{ opacity: 0.7, fontSize: "1rem", color: "var(--text-muted)", lineHeight: 1.6 }}>Las rutas se habilitan desde la administración del ecosistema. Pronto tendrás acceso a tu camino de desarrollo integral.</p>
          </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px" }}>
          {courses.map(course => (
            <Link href={`/course?id=${course.id}`} key={course.id} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="stat-card hover-glow" style={{ padding: 0, overflow: "hidden", borderRadius: "24px", background: "var(--bg-card)", border: "1px solid var(--glass-border)", transition: "var(--transition)" }}>
                <div style={{ height: "160px", background: course.category === "Deporte" ? "linear-gradient(to bottom right, #0052FF, #001A4D)" : "linear-gradient(to bottom right, #6366F1, #312E81)", padding: "30px", position: "relative" }}>
                  <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.2)", backdropFilter: "blur(5px)", color: "white", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>{course.category}</span>
                  <div style={{ position: "absolute", bottom: "20px", left: "30px", right: "30px" }}>
                    <h4 style={{ margin: 0, color: "white", fontSize: "1.4rem", fontWeight: 800 }}>{course.title}</h4>
                  </div>
                </div>
                <div style={{ padding: "30px" }}>
                  {(() => {
                    const total = course.actual_total_modules || 1;
                    const completed = (course.completed_modules || []).length;
                    const percent = Math.min(100, Math.round((completed / total) * 100));
                    
                    return (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                           <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>{completed} / {total} Hitos</span>
                           <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--brand-primary)" }}>{percent}%</span>
                        </div>
                        <div className="progress-bar-bg" style={{ height: "8px" }}>
                          <div className="progress-bar-fill" style={{ width: `${percent}%`, background: "var(--brand-primary)" }}></div>
                        </div>
                      </>
                    );
                  })()}
                  <div className="btn-primary" style={{ marginTop: "25px", width: "100%", justifyContent: "center", padding: "14px" }}>
                    Entrar a la Ruta
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
