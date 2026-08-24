"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors avoid vinext beta client-navigation failures in production. */

import { useEffect, useRef, useState } from "react";

type HeaderNavigationProps = {
  active: "builder" | "analyzer";
  language: "es" | "en";
};

const navigationCopy = {
  es: {
    label: "Herramientas",
    menu: "Menú",
    open: "Abrir menú",
    close: "Cerrar menú",
    builder: "Crear CV",
    builderDescription: "Diseña y descarga tu currículum.",
    analyzer: "Analizar CV",
    analyzerDescription: "Revisa y mejora tu CV con IA.",
  },
  en: {
    label: "Tools",
    menu: "Menu",
    open: "Open menu",
    close: "Close menu",
    builder: "Build resume",
    builderDescription: "Create and download your resume.",
    analyzer: "Analyze resume",
    analyzerDescription: "Review and improve it with AI.",
  },
} as const;

export default function HeaderNavigation({ active, language }: HeaderNavigationProps) {
  const [open, setOpen] = useState(false);
  const navigationRef = useRef<HTMLDivElement>(null);
  const copy = navigationCopy[language];

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOutside = (event: PointerEvent) => {
      if (!navigationRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  return (
    <>
      <nav className="header-nav" aria-label={copy.label}>
        <a className={active === "builder" ? "active" : ""} href="/">{copy.builder}</a>
        <a className={active === "analyzer" ? "active" : ""} href="/analizar-cv">{copy.analyzer}</a>
      </nav>

      <div className="mobile-navigation" ref={navigationRef}>
        <button
          type="button"
          className="mobile-menu-button"
          aria-expanded={open}
          aria-controls="alineacv-mobile-menu"
          aria-label={open ? copy.close : copy.open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="mobile-menu-icon" aria-hidden="true"><i /><i /><i /></span>
          <span>{copy.menu}</span>
        </button>

        {open && (
          <nav id="alineacv-mobile-menu" className="mobile-menu-panel" aria-label={copy.label}>
            <a className={active === "builder" ? "active" : ""} href="/" onClick={() => setOpen(false)}>
              <span><strong>{copy.builder}</strong><small>{copy.builderDescription}</small></span>
              <b aria-hidden="true">{active === "builder" ? "✓" : "→"}</b>
            </a>
            <a className={active === "analyzer" ? "active" : ""} href="/analizar-cv" onClick={() => setOpen(false)}>
              <span><strong>{copy.analyzer}</strong><small>{copy.analyzerDescription}</small></span>
              <b aria-hidden="true">{active === "analyzer" ? "✓" : "→"}</b>
            </a>
          </nav>
        )}
      </div>
    </>
  );
}
