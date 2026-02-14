/**
 * Utilidad compartida para calcular rangos de fechas a partir de períodos.
 * Usada por estadísticas, PDF y frontend para evitar duplicación.
 * Criterio: UTC para límites de día, de modo que reportes no varíen con la zona horaria del servidor.
 */

export type PeriodRange = {
  dateStart: Date;
  dateEnd: Date;
};

/**
 * Convierte un período predefinido (24h, 7d, 30d, etc.) en un rango de fechas.
 * Los rangos por días (7d, 30d, etc.) usan medianoche y fin de día en UTC para consistencia.
 * @param period - Período: "24h" | "7d" | "30d" | "90d" | "180d" | "365d" | "year" | "all" | "custom"
 * @param customStart - Fecha inicio personalizada (solo si period === "custom")
 * @param customEnd - Fecha fin personalizada (solo si period === "custom")
 */
export function parsePeriodRange(
  period: string,
  customStart?: string | null,
  customEnd?: string | null
): PeriodRange {
  const now = new Date();
  let dateStart: Date;
  let dateEnd: Date = new Date(now);

  if (period === "custom" && customStart && customEnd) {
    dateStart = new Date(customStart);
    dateStart.setUTCHours(0, 0, 0, 0);
    dateEnd = new Date(customEnd);
    dateEnd.setUTCHours(23, 59, 59, 999);
  } else if (period === "24h") {
    dateStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (period === "7d" || period === "30d" || period === "90d" || period === "180d" || period === "365d") {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : period === "180d" ? 180 : 365;
    dateStart = new Date(now);
    dateStart.setUTCDate(dateStart.getUTCDate() - days);
    dateStart.setUTCHours(0, 0, 0, 0);
    dateEnd.setUTCHours(23, 59, 59, 999);
  } else if (period === "year") {
    dateStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    dateEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
  } else if (period === "all") {
    dateStart = new Date("2000-01-01T00:00:00.000Z");
    dateEnd.setUTCHours(23, 59, 59, 999);
  } else {
    // Default: 7 días (UTC)
    dateStart = new Date(now);
    dateStart.setUTCDate(dateStart.getUTCDate() - 7);
    dateStart.setUTCHours(0, 0, 0, 0);
    dateEnd.setUTCHours(23, 59, 59, 999);
  }

  return { dateStart, dateEnd };
}
