const TUTORIAL_DONE_KEY = "luckyly_tutorial_done";
const MAX_AGE_DAYS = 365;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === "undefined") return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getTutorialDone(): boolean {
  const value = getCookie(TUTORIAL_DONE_KEY);
  return value === "1" || value === "true";
}

export function setTutorialDone(): void {
  setCookie(TUTORIAL_DONE_KEY, "1", MAX_AGE_DAYS);
}
