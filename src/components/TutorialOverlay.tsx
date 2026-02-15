"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTutorial, TUTORIAL_TOTAL_STEPS } from "../contexts/TutorialContext";

const MOBILE_BREAKPOINT = 768;
const MESSAGE_HEIGHT_ESTIMATE = 220;

const REGISTER_SELECTORS: Record<number, string> = {
  3: "[data-tutorial-form]",        // Paso 4: formulario paso 1 (llenar datos)
  4: "[data-tutorial-submit]",      // Paso 5: botón Siguiente del 1er paso
  5: "[data-tutorial-step2-form]",  // Paso 6: datos pago móvil
  6: "[data-tutorial-terms]",       // Paso 7: aceptar términos y condiciones
  7: "[data-tutorial-register-btn]", // Paso 8: botón Registrarme (finalizar)
};

export function TutorialOverlay() {
  const pathname = usePathname();
  const tutorial = useTutorial();
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [registerRect, setRegisterRect] = useState<DOMRect | null>(null);
  const [registerPageRect, setRegisterPageRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const registerPageCleanupRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { step, active, skipTutorial, confirmWelcome, nextStep, prevStep, menuButtonRef, registerLinkRef } =
    tutorial ?? {};

  useEffect(() => {
    if (step !== 1 || !menuButtonRef?.current) {
      setMenuRect(null);
      return;
    }
    const el = menuButtonRef.current;
    const update = () => setMenuRect(el.getBoundingClientRect());
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [step, menuButtonRef]);

  useEffect(() => {
    if (step !== 2 || !registerLinkRef?.current) {
      setRegisterRect(null);
      return;
    }
    const el = registerLinkRef.current;
    const update = () => setRegisterRect(el.getBoundingClientRect());
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [step, registerLinkRef]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const stepVal = step;
    const selector =
      typeof stepVal === "number" && stepVal >= 3 && stepVal <= 7
        ? REGISTER_SELECTORS[stepVal]
        : null;
    if (!selector || pathname !== "/auth/register") {
      setRegisterPageRect(null);
      return;
    }
    let rafId = 0;
    rafId = requestAnimationFrame(() => {
      if (!isMountedRef.current) return;
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) {
        if (isMountedRef.current) setRegisterPageRect(null);
        return;
      }
      const update = () => {
        if (isMountedRef.current) setRegisterPageRect(el.getBoundingClientRect());
      };
      update();
      const obs = new ResizeObserver(update);
      obs.observe(el);
      window.addEventListener("scroll", update, true);
      window.addEventListener("resize", update);
      registerPageCleanupRef.current = () => {
        try {
          obs.disconnect();
          window.removeEventListener("scroll", update, true);
          window.removeEventListener("resize", update);
        } finally {
          registerPageCleanupRef.current = null;
        }
      };
    });
    return () => {
      cancelAnimationFrame(rafId);
      const cleanup = registerPageCleanupRef.current;
      if (typeof cleanup === "function") {
        registerPageCleanupRef.current = null;
        try {
          cleanup();
        } catch (_) {}
      }
    };
  }, [step, pathname]);

  if (!tutorial || typeof step !== "number" || step < 0) return null;

  const currentStepLabel = step + 1;

  if (step === 0) {
    return (
      <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-welcome-title">
        <div className="tutorial-modal tutorial-modal-welcome">
          <div className="tutorial-step-badge">
            Paso {currentStepLabel} de {TUTORIAL_TOTAL_STEPS}
          </div>
          <h2 id="tutorial-welcome-title" className="tutorial-title">
            ¡Bienvenido a LuckyLY!
          </h2>
          <p className="tutorial-text">
            ¿Deseas seguir un breve tutorial para registrarte en la página y poder comenzar a jugar las ruletas?
          </p>
          <div className="tutorial-actions">
            <button type="button" className="tutorial-btn tutorial-btn-skip" onClick={() => skipTutorial?.()}>
              Omitir
            </button>
            <button type="button" className="tutorial-btn tutorial-btn-primary" onClick={() => confirmWelcome?.()}>
              Siguiente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const spotlightRect =
    step === 1 ? menuRect : step === 2 ? registerRect : step >= 3 && step <= 7 ? registerPageRect : null;
  const message =
    step === 1
      ? "Presiona el menú desplegable"
      : step === 2
        ? "Haz clic en Registrarse para crear tu cuenta"
        : step === 3
          ? "Completa cada uno de los datos solicitados para crear tu cuenta."
          : step === 4
            ? "Presiona el botón Siguiente para continuar con el registro."
            : step === 5
              ? "Proporciona los datos de Pago Móvil donde serán transferidos los premios de las ruletas."
              : step === 6
                ? "Debes aceptar los términos y condiciones para continuar el registro."
                : step === 7
                  ? "Haz clic en el botón Registrarme para finalizar tu registro."
                  : "";

  const padding = 8;
  const extraBottom = step === 2 ? 14 : 0;
  const hole = spotlightRect
    ? {
        x: spotlightRect.x - padding,
        y: spotlightRect.y - padding,
        w: spotlightRect.width + padding * 2,
        h: spotlightRect.height + padding * 2 + extraBottom,
      }
    : null;

  const safe = 20;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const minTop = safe + MESSAGE_HEIGHT_ESTIMATE;
  const maxTop = vh - safe - MESSAGE_HEIGHT_ESTIMATE;

  let messageStyle: React.CSSProperties;
  let messageClass = "";

  if (!spotlightRect) {
    messageStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else if (isMobile) {
    const above = step >= 3;
    const roomAbove = spotlightRect.top - 24 >= MESSAGE_HEIGHT_ESTIMATE + safe;
    const useAbove = above && roomAbove;
    const topAbove = Math.max(minTop, spotlightRect.top - 24);
    const topBelow = Math.min(maxTop, spotlightRect.bottom + 16);
    messageStyle = {
      left: "50%",
      top: useAbove ? topAbove : topBelow,
      transform: useAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)",
    };
    messageClass = useAbove ? "tutorial-message-mobile-above" : "tutorial-message-mobile-below";
  } else {
    messageStyle =
      step >= 3 && step <= 7
        ? {
            top: spotlightRect.top - 24,
            left: spotlightRect.left + spotlightRect.width / 2,
            transform: "translate(-50%, -100%)",
          }
        : {
            top: spotlightRect.bottom + 24,
            left: spotlightRect.left + spotlightRect.width / 2,
            transform: "translateX(-50%)",
          };
  }

  return (
    <div className="tutorial-backdrop tutorial-backdrop-blur" role="dialog" aria-modal="true">
      <svg className="tutorial-spotlight-svg" aria-hidden="true">
        <defs>
          <mask id="tutorial-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {hole && (
              <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="12" fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tutorial-spotlight-mask)" />
      </svg>
      {hole && (
        <>
          <div className="tutorial-spotlight-blocker" style={{ top: 0, left: 0, right: 0, height: hole.y }} />
          <div className="tutorial-spotlight-blocker" style={{ top: hole.y, left: 0, width: hole.x, height: hole.h }} />
          <div className="tutorial-spotlight-blocker" style={{ top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }} />
          <div className="tutorial-spotlight-blocker" style={{ top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }} />
        </>
      )}
      {(spotlightRect || (step >= 1 && step <= 7)) && (
        <div className={`tutorial-spotlight-message ${messageClass}`.trim()} style={messageStyle}>
          <div className="tutorial-step-badge">
            Paso {currentStepLabel} de {TUTORIAL_TOTAL_STEPS}
          </div>
          <p className="tutorial-spotlight-text">{message}</p>
          <div className="tutorial-actions tutorial-actions-spotlight">
            {step !== 7 && (
              <button
                type="button"
                className="tutorial-btn tutorial-btn-skip tutorial-btn-skip-xs"
                onClick={() => skipTutorial?.()}
              >
                Omitir tutorial
              </button>
            )}
            <div className="tutorial-actions-main">
              {step !== 3 && step !== 5 && (
                <button
                  type="button"
                  className="tutorial-btn tutorial-btn-back"
                  onClick={() => prevStep?.()}
                >
                  Atrás
                </button>
              )}
              {(step === 3 || (step >= 5 && step <= 6)) && (
                <button type="button" className="tutorial-btn tutorial-btn-primary" onClick={() => nextStep?.()}>
                  {step === 7 ? "Finalizar tutorial" : "Siguiente"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
