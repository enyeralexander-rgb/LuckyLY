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
  | 3   // Página registro: resaltar formulario
  | 4   // Página registro: resaltar términos y condiciones
  | 5   // Página registro: resaltar botón Registrarme
  | -1; // Cerrado (omitido o terminado)

interface TutorialContextValue {
  /** Paso actual del tutorial (-1 = no activo). */
  step: TutorialStep;
  /** Si el tutorial está activo (usuario no tiene cookie y eligió seguir). */
  active: boolean;
  /** Omitir todo y crear cookie. */
  skipTutorial: () => void;
  /** Confirmar bienvenida y pasar al paso 1 (resaltar menú). */
  confirmWelcome: () => void;
  /** Avanzar al siguiente paso. */
  nextStep: () => void;
  /** Ir a un paso concreto (útil al navegar a /auth/register). */
  goToStep: (s: TutorialStep) => void;
  /** Ir a un paso por número (3=formulario, 4=términos, 5=botón). */
  goToStepNumber: (s: number) => void;
  /** Para que el Header indique si el menú se abrió (paso 1 → 2). */
  onMenuOpenChange: (open: boolean) => void;
  /** Refs para posicionar el spotlight (menú y enlace Registrarse). */
  menuButtonRef: React.RefObject<HTMLElement | null>;
  registerLinkRef: React.RefObject<HTMLElement | null>;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  return ctx;
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

  const goToStepNumber = useCallback((s: number) => {
    if (s < 0 || s >= TUTORIAL_TOTAL_STEPS) return;
    setStep(s as TutorialStep);
    setActive(true);
  }, []);

  const goToStep = useCallback((s: TutorialStep) => {
    setStep(s);
    if (s >= 0) setActive(true);
  }, []);

  const onMenuOpenChange = useCallback((open: boolean) => {
    setStep((current) => {
      if (current === 1 && open) return 2;
      return current;
    });
  }, []);

  // Al montar: si no tiene cookie, mostrar bienvenida (paso 0)
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
    // Primera visita: mostrar modal de bienvenida (paso 0)
    if (!active && step === -1) {
      setStep(0);
    }
  }, [mounted, pathname]);

  // Al navegar a registro, pasar al paso 3 (resaltar formulario)
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
