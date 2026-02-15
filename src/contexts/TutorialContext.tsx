"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { getTutorialDone, setTutorialDone } from "../lib/tutorialCookie";

export const TUTORIAL_TOTAL_STEPS = 8;

export type TutorialStep =
  | 0   // Bienvenida: ¿Seguir tutorial? Omitir / Siguiente
  | 1   // Resaltar menú: "Presiona el menú desplegable"
  | 2   // Menú abierto: resaltar "Registrarse"
  | 3   // Paso 4: formulario paso 1 (llenar datos)
  | 4   // Paso 5: botón Siguiente del 1er paso
  | 5   // Paso 6: datos pago móvil
  | 6   // Paso 7: aceptar términos y condiciones
  | 7   // Paso 8: botón Registrarme (finalizar)
  | -1; // Cerrado (omitido o terminado)

interface TutorialContextValue {
  step: TutorialStep;
  active: boolean;
  skipTutorial: () => void;
  confirmWelcome: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (s: TutorialStep) => void;
  goToStepNumber: (s: number) => void;
  onMenuOpenChange: (open: boolean) => void;
  menuButtonRef: React.RefObject<HTMLElement | null>;
  registerLinkRef: React.RefObject<HTMLElement | null>;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  return useContext(TutorialContext);
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const safePathname = pathname ?? "";
  const [step, setStep] = useState<TutorialStep>(-1);
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuButtonRef = useRef<HTMLElement | null>(null);
  const registerLinkRef = useRef<HTMLElement | null>(null);
  const menuWasOpenRef = useRef(false);

  const skipTutorial = useCallback(() => {
    setTutorialDone();
    setActive(false);
    setStep(-1);
  }, []);

  const confirmWelcome = useCallback(() => {
    setActive(true);
    setStep(1);
  }, []);

  const nextStep = useCallback(() => {
    setStep((s) => {
      if (s === -1) return s;
      if (s + 1 >= TUTORIAL_TOTAL_STEPS) {
        setTutorialDone();
        setActive(false);
        return -1;
      }
      return (s + 1) as TutorialStep;
    });
  }, []);

  const prevStep = useCallback(() => {
    setStep((s) => {
      if (s <= 0) return s;
      return (s - 1) as TutorialStep;
    });
  }, []);

  const goToStep = useCallback((s: TutorialStep) => {
    setStep(s);
    if (s >= 0) setActive(true);
  }, []);

  const goToStepNumber = useCallback((s: number) => {
    if (s < 0 || s >= TUTORIAL_TOTAL_STEPS) return;
    setStep(s as TutorialStep);
    setActive(true);
  }, []);

  const onMenuOpenChange = useCallback((open: boolean) => {
    setStep((current) => {
      // Solo pasar al paso 2 cuando el menú pasa de cerrado a abierto (evita volver a 2 al hacer Atrás)
      if (current === 1 && open && !menuWasOpenRef.current) return 2;
      return current;
    });
    menuWasOpenRef.current = open;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !safePathname) return;
    if (safePathname.startsWith("/admin")) return;
    if (typeof document !== "undefined" && getTutorialDone()) {
      setStep(-1);
      setActive(false);
      return;
    }
    if (!active && step === -1) {
      setStep(0);
    }
  }, [mounted, safePathname]);

  useEffect(() => {
    if (safePathname === "/auth/register" && active && step === 2) {
      setStep(3);
    }
  }, [safePathname, active, step]);

  const value: TutorialContextValue = {
    step,
    active,
    skipTutorial: skipTutorial ?? (() => {}),
    confirmWelcome: confirmWelcome ?? (() => {}),
    nextStep: nextStep ?? (() => {}),
    prevStep: prevStep ?? (() => {}),
    goToStep: goToStep ?? (() => {}),
    goToStepNumber: goToStepNumber ?? (() => {}),
    onMenuOpenChange: onMenuOpenChange ?? (() => {}),
    menuButtonRef,
    registerLinkRef,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}
