/**
 * Utilidad compartida para calcular rangos de fechas a partir de períodos.
 * Usada por estadísticas, PDF y frontend para evitar duplicación.
 */

export type PeriodRange = {
  dateStart: Date;
  dateEnd: Date;
};

/**
 * Convierte un período predefinido (24h, 7d, 30d, etc.) en un rango de fechas.
 * @param period - Período: "24h" | "7d" | "30d" | "90d" | "180d" | "365d" | "year" | "all" | "custom"
 * @param customStart - Fecha inicio personalizada (solo si period === "custom")
 * @param customEnd - Fecha fin personalizada (solo si period === "custom")
 */
export function parsePeriodRange(
  period: string,
  customStart?: string | null,
  customEnd?: string | null
): PeriodRange {
  let dateStart: Date;
  let dateEnd: Date = new Date();

  if (period === "custom" && customStart && customEnd) {
    dateStart = new Date(customStart);
    dateStart.setHours(0, 0, 0, 0);
    dateEnd = new Date(customEnd);
    dateEnd.setHours(23, 59, 59, 999);
  } else if (period === "24h") {
    dateStart = new Date();
    dateStart.setHours(dateStart.getHours() - 24);
  } else if (period === "7d") {
    dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 7);
  } else if (period === "30d") {
    dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 30);
  } else if (period === "90d") {
    dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 90);
  } else if (period === "180d") {
    dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 180);
  } else if (period === "365d") {
    dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 365);
  } else if (period === "year") {
    dateStart = new Date(new Date().getFullYear(), 0, 1);
    dateEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (period === "all") {
    dateStart = new Date("2000-01-01T00:00:00.000Z");
  } else {
    // Default: 7 días
    dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 7);
  }

  return { dateStart, dateEnd };
}
