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

export const TUTORIAL_TOTAL_STEPS = 6;

export type TutorialStep =
  | 0   // Bienvenida: ¿Seguir tutorial? Omitir / Siguiente
  | 1   // Resaltar menú: "Presiona el menú desplegable"
  | 2   // Menú abierto: resaltar "Registrarse"
  | 3   // Página registro: resaltar formulario (solo inputs)
  | 4   // Página registro: resaltar términos y condiciones
  | 5   // Página registro: resaltar botón Registrarme
  | -1; // Cerrado (omitido o terminado)

interface TutorialContextValue {
  step: TutorialStep;
  active: boolean;
  skipTutorial: () => void;
  confirmWelcome: () => void;
  nextStep: () => void;
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
  const [step, setStep] = useState<TutorialStep>(-1);
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuButtonRef = useRef<HTMLElement | null>(null);
  const registerLinkRef = useRef<HTMLElement | null>(null);

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
      if (current === 1 && open) return 2;
      return current;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !pathname) return;
    if (pathname.startsWith("/admin")) return;
    if (getTutorialDone()) {
      setStep(-1);
      setActive(false);
      return;
    }
    if (!active && step === -1) {
      setStep(0);
    }
  }, [mounted, pathname]);

  useEffect(() => {
    if (pathname === "/auth/register" && active && step === 2) {
      setStep(3);
    }
  }, [pathname, active, step]);

  const value: TutorialContextValue = {
    step,
    active,
    skipTutorial,
    confirmWelcome,
    nextStep,
    goToStep,
    goToStepNumber,
    onMenuOpenChange,
    menuButtonRef,
    registerLinkRef,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}
