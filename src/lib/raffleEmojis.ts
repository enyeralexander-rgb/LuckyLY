// Mapeo de nombres de cupos a sus emojis correspondientes
export function getItemWithEmoji(item: string, type: string): string {
  // Para FLAGS, si ya tiene emoji de bandera (🇻🇪, 🇨🇴, etc.), retornar tal cual
  if (type === "FLAGS" && /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(item)) {
    return item;
  }
  
  // Si ya tiene emoji, retornar tal cual
  if (/[\u{1F300}-\u{1F9FF}]/u.test(item)) {
    return item;
  }

  // Mapeo de animales
  const animalEmojis: Record<string, string> = {
    "León": "🦁",
    "Tigre": "🐅",
    "Elefante": "🐘",
    "Jirafa": "🦒",
    "Cebra": "🦓",
    "Mono": "🐵",
    "Oso": "🐻",
    "Lobo": "🐺",
    "Zorro": "🦊",
    "Águila": "🦅",
    "Delfín": "🐬",
    "Ballena": "🐋",
    "Tiburón": "🦈",
    "Cocodrilo": "🐊",
    "Serpiente": "🐍",
    "Pájaro": "🐦",
    "Caballo": "🐴",
    "Vaca": "🐄",
    "Cerdo": "🐷",
    "Gato": "🐱",
    "Perro": "🐶",
    "Conejo": "🐰",
    "Ratón": "🐭",
    "Hámster": "🐹",
    "Pez": "🐟",
    "Tortuga": "🐢",
    "Rana": "🐸",
    "Mariposa": "🦋",
    "Abeja": "🐝",
    "Araña": "🕷️",
    "Escorpión": "🦂",
    "Camello": "🐫",
    "Canguro": "🦘",
    "Panda": "🐼",
    "Koala": "🐨",
    "Zebra": "🦓",
    "Hipopótamo": "🦛",
    "Rinoceronte": "🦏",
    "Jaguar": "🐆",
    "Pantera": "🐆",
    "Lince": "🐱",
    "Búfalo": "🐃",
    "Alce": "🦌",
    "Ciervo": "🦌",
    "Mapache": "🦝",
    "Mofeta": "🦨",
    "Erizo": "🦔",
    "Armadillo": "🦔",
    "Tapir": "🦏",
    "Capibara": "🐹"
  };

  // Mapeo de estados de Venezuela (usar emojis de bandera o ubicación)
  const stateEmojis: Record<string, string> = {
    "Amazonas": "🌳",
    "Anzoátegui": "🏖️",
    "Apure": "🐄",
    "Aragua": "🏔️",
    "Barinas": "🌾",
    "Bolívar": "⛰️",
    "Carabobo": "🏭",
    "Cojedes": "🐂",
    "Delta Amacuro": "🌊",
    "Distrito Capital": "🏛️",
    "Falcón": "🏖️",
    "Guárico": "🌾",
    "Lara": "🌾",
    "Mérida": "🏔️",
    "Miranda": "🏙️",
    "Monagas": "🛢️",
    "Nueva Esparta": "🏝️",
    "Portuguesa": "🌾",
    "Sucre": "🏖️",
    "Táchira": "🏔️",
    "Trujillo": "⛰️",
    "Vargas": "🌊",
    "Yaracuy": "🌾",
    "Zulia": "🛢️"
  };

  // Mapeo de signos zodiacales (ya tienen emojis en el nombre)
  const zodiacEmojis: Record<string, string> = {
    "Aries": "♈",
    "Tauro": "♉",
    "Géminis": "♊",
    "Cáncer": "♋",
    "Leo": "♌",
    "Virgo": "♍",
    "Libra": "♎",
    "Escorpio": "♏",
    "Sagitario": "♐",
    "Capricornio": "♑",
    "Acuario": "♒",
    "Piscis": "♓"
  };

  // Buscar emoji según el tipo
  let emoji = "";
  if (type === "ANIMALS") {
    emoji = animalEmojis[item] || "";
  } else if (type === "STATES") {
    emoji = stateEmojis[item] || "";
  } else if (type === "ZODIAC") {
    // Los signos zodiacales ya tienen emojis en el nombre, pero podemos extraerlo
    const signName = item.replace(/^[^\w\s]+/, "").trim();
    emoji = zodiacEmojis[signName] || "";
  }

  // Si encontramos emoji, agregarlo al nombre
  if (emoji) {
    return `${item} ${emoji}`;
  }

  // Si no hay emoji, retornar el nombre tal cual
  return item;
}
