/**
 * Utilidad para obtener información de geolocalización desde una IP
 * Usa ip-api.com (gratuito, hasta 45 requests/minuto)
 * Alternativa: ipapi.co (requiere API key para más requests)
 */

export interface GeoLocationData {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
}

/**
 * Obtiene información de geolocalización desde una IP
 * @param ip - Dirección IP a geolocalizar
 * @returns Datos de geolocalización o null si falla
 */
export async function getGeoLocationFromIP(ip: string | null | undefined): Promise<GeoLocationData | null> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return null; // IPs locales o inválidas
  }

  try {
    // Limpiar IP (puede venir como "x-forwarded-for: ip1, ip2, ip3")
    const cleanIP = ip.split(",")[0].trim();

    // Usar ip-api.com (gratuito, sin API key, hasta 45 req/min)
    // Formato: http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,city,lat,lon
    const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,message,country,countryCode,region,city,lat,lon`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      // Timeout de 5 segundos
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.warn(`Error en geolocalización para IP ${cleanIP}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // ip-api.com retorna { status: "success" | "fail", ... }
    if (data.status === "success" && data.country) {
      return {
        country: data.country || "Desconocido",
        countryCode: data.countryCode || "",
        region: data.region || undefined,
        city: data.city || undefined,
        lat: data.lat || undefined,
        lon: data.lon || undefined
      };
    }

    return null;
  } catch (error) {
    // Silenciar errores de geolocalización (no es crítico)
    console.warn(`Error al obtener geolocalización para IP ${ip}:`, error);
    return null;
  }
}

/**
 * Obtiene solo el país desde una IP (versión simplificada)
 * @param ip - Dirección IP
 * @returns Nombre del país o "N/A" si no se puede determinar
 */
export async function getCountryFromIP(ip: string | null | undefined): Promise<string> {
  const geo = await getGeoLocationFromIP(ip);
  return geo?.country || "N/A";
}
