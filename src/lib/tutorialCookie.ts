const TUTORIAL_DONE_KEY = "TutorialDone";

/** Sin tiempo de expiración: 10 años en segundos */
const MAX_AGE_YEARS = 10 * 365 * 24 * 60 * 60;

export function getTutorialDone(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((row) => row.startsWith(`${TUTORIAL_DONE_KEY}=`));
}

export function setTutorialDone(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TUTORIAL_DONE_KEY}=1; path=/; max-age=${MAX_AGE_YEARS}; SameSite=Lax`;
}
