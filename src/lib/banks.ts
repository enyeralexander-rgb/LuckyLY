/**
 * Lista completa de bancos venezolanos con sus códigos y valor enum
 * Utilizado en formularios de datos bancarios y módulos administrativos
 */

export type BankInfo = {
  code: string;
  name: string;
  enumValue: string;
};

/**
 * Cada banco tiene un enumValue que corresponde al enum Bank en la base de datos.
 * Ahora todos los bancos tienen un valor único en el enum.
 */
export const VENEZUELAN_BANKS: BankInfo[] = [
  { code: "0156", name: "100% BANCO", enumValue: "BANCO_100" },
  { code: "0172", name: "BANCAMIGA", enumValue: "BANCAMIGA" },
  { code: "0114", name: "BANCARIBE", enumValue: "BANCARIBE" },
  { code: "0171", name: "BANCO ACTIVO", enumValue: "BANCO_ACTIVO" },
  { code: "0166", name: "BANCO AGRÍCOLA DE VENEZUELA", enumValue: "BANCO_AGRICOLA" },
  { code: "0175", name: "BANCO BICENTENARIO DEL PUEBLO", enumValue: "BICENTENARIO" },
  { code: "0128", name: "BANCO CARONÍ", enumValue: "BANCO_CARONI" },
  { code: "0177", name: "BANCO DE LA FUERZA ARMADA NACIONAL BOLIVARIANA (BANFANB)", enumValue: "BANFANB" },
  { code: "0102", name: "BANCO DE VENEZUELA", enumValue: "VENEZUELA" },
  { code: "0163", name: "BANCO DEL TESORO", enumValue: "BANCO_TESORO" },
  { code: "0115", name: "BANCO EXTERIOR", enumValue: "BANCO_EXTERIOR" },
  { code: "0151", name: "BANCO FONDO COMÚN (BFC)", enumValue: "BFC" },
  { code: "0173", name: "BANCO INTERNACIONAL DE DESARROLLO", enumValue: "BANCO_INTERNACIONAL_DESARROLLO" },
  { code: "0105", name: "BANCO MERCANTIL", enumValue: "MERCANTIL" },
  { code: "0191", name: "BANCO NACIONAL DE CRÉDITO (BNC)", enumValue: "BNC" },
  { code: "0138", name: "BANCO PLAZA", enumValue: "BANCO_PLAZA" },
  { code: "0137", name: "BANCO SOFITASA", enumValue: "BANCO_SOFITASA" },
  { code: "0168", name: "BANCRECER", enumValue: "BANCRECER" },
  { code: "0134", name: "BANESCO", enumValue: "BANESCO" },
  { code: "0146", name: "BANGENTE", enumValue: "BANGENTE" },
  { code: "0174", name: "BANPLUS", enumValue: "BANPLUS" },
  { code: "0108", name: "BBVA PROVINCIAL", enumValue: "PROVINCIAL" },
  { code: "0157", name: "DELSUR", enumValue: "DELSUR" },
  { code: "0169", name: "MI BANCO", enumValue: "MI_BANCO" },
  { code: "0196", name: "N58 BANCO DIGITAL", enumValue: "N58_BANCO_DIGITAL" }
];

/**
 * Obtiene el nombre del banco por su código
 */
export function getBankNameByCode(code: string): string | null {
  const bank = VENEZUELAN_BANKS.find(b => b.code === code);
  return bank ? bank.name : null;
}

/**
 * Obtiene el código del banco por su nombre
 */
export function getBankCodeByName(name: string): string | null {
  const bank = VENEZUELAN_BANKS.find(b => b.name === name || b.name.toUpperCase() === name.toUpperCase());
  return bank ? bank.code : null;
}

/**
 * Obtiene info del banco por su código
 */
export function getBankByCode(code: string): BankInfo | null {
  return VENEZUELAN_BANKS.find(b => b.code === code) || null;
}

/**
 * Formatea el banco para mostrar: "(CÓDIGO) NOMBRE"
 */
export function formatBankDisplay(bank: string | null): string {
  if (!bank) return "";
  // Primero buscar por código o enum value
  const bankObj = VENEZUELAN_BANKS.find(b => b.code === bank || b.enumValue === bank);
  if (bankObj) {
    return `(${bankObj.code}) ${bankObj.name}`;
  }
  // Luego buscar por nombre
  const bankByName = VENEZUELAN_BANKS.find(b => b.name === bank);
  if (bankByName) {
    return `(${bankByName.code}) ${bankByName.name}`;
  }
  return bank;
}

/**
 * Mapea el nombre del banco al valor del enum Bank en la base de datos
 */
export function mapBankNameToEnum(bankName: string): string | null {
  if (!bankName) return null;
  
  // Si ya es un valor de enum válido, retornarlo
  const isValidEnum = VENEZUELAN_BANKS.some(b => b.enumValue === bankName);
  if (isValidEnum) return bankName;

  const upperName = bankName.toUpperCase().trim();
  
  // Buscar por nombre exacto
  const bank = VENEZUELAN_BANKS.find(b => b.name.toUpperCase() === upperName);
  if (bank) return bank.enumValue;

  // Mapeos históricos/parciales
  if (upperName.includes("BANESCO")) return "BANESCO";
  if (upperName.includes("VENEZUELA") && !upperName.includes("BICENTENARIO") && !upperName.includes("AGRICOLA")) return "VENEZUELA";
  if (upperName.includes("MERCANTIL")) return "MERCANTIL";
  if (upperName.includes("BOD") || upperName.includes("OCCIDENTAL")) return "BOD";
  if (upperName.includes("PROVINCIAL")) return "PROVINCIAL";
  if (upperName.includes("BICENTENARIO")) return "BICENTENARIO";
  
  return "OTRA";
}

/**
 * Obtiene el nombre del banco a partir del valor del enum
 */
export function getBankNameFromEnum(enumValue: string): string {
  const bank = VENEZUELAN_BANKS.find(b => b.enumValue === enumValue);
  return bank ? bank.name : enumValue;
}
