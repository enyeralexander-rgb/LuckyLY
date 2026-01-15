/**
 * Lista completa de bancos venezolanos con sus códigos
 * Utilizado en formularios de datos bancarios y módulos administrativos
 */

export const VENEZUELAN_BANKS = [
  { code: "0156", name: "100% BANCO" },
  { code: "0172", name: "BANCAMIGA" },
  { code: "0114", name: "BANCARIBE" },
  { code: "0171", name: "BANCO ACTIVO" },
  { code: "0166", name: "BANCO AGRÍCOLA DE VENEZUELA" },
  { code: "0175", name: "BANCO BICENTENARIO DEL PUEBLO" },
  { code: "0128", name: "BANCO CARONÍ" },
  { code: "0177", name: "BANCO DE LA FUERZA ARMADA NACIONAL BOLIVARIANA (BANFANB)" },
  { code: "0102", name: "BANCO DE VENEZUELA" },
  { code: "0163", name: "BANCO DEL TESORO" },
  { code: "0115", name: "BANCO EXTERIOR" },
  { code: "0151", name: "BANCO FONDO COMÚN (BFC)" },
  { code: "0173", name: "BANCO INTERNACIONAL DE DESARROLLO" },
  { code: "0105", name: "BANCO MERCANTIL" },
  { code: "0191", name: "BANCO NACIONAL DE CRÉDITO (BNC)" },
  { code: "0138", name: "BANCO PLAZA" },
  { code: "0137", name: "BANCO SOFITASA" },
  { code: "0168", name: "BANCRECER" },
  { code: "0134", name: "BANESCO" },
  { code: "0146", name: "BANGENTE" },
  { code: "0174", name: "BANPLUS" },
  { code: "0108", name: "BBVA PROVINCIAL" },
  { code: "0157", name: "DELSUR" },
  { code: "0169", name: "MI BANCO" },
  { code: "0196", name: "N58 BANCO DIGITAL" }
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
 * Formatea el banco para mostrar: "(CÓDIGO) NOMBRE"
 */
export function formatBankDisplay(bank: string | null): string {
  if (!bank) return "";
  const bankObj = VENEZUELAN_BANKS.find(b => b.name === bank || b.code === bank);
  if (bankObj) {
    return `(${bankObj.code}) ${bankObj.name}`;
  }
  return bank;
}
