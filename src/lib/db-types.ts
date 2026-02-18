/**
 * Tipos para Neon (Postgres nativo). Sustituyen a @prisma/client.
 */

export type Role = "USER" | "AGENT" | "CONTABLE" | "SUPERADMIN" | "MASTER";
export type DrawType = "NUMBERS" | "ANIMALS" | "STATES" | "FLAGS" | "ZODIAC";
export type PrizeStatus = "REQUESTED" | "PROCESSING" | "PAID" | "REJECTED" | "INCORRECT_DATA";
export type Bank =
  | "BANESCO" | "VENEZUELA" | "MERCANTIL" | "BOD" | "PROVINCIAL" | "BICENTENARIO" | "OTRA"
  | "BANCO_100" | "BANCAMIGA" | "BANCARIBE" | "BANCO_ACTIVO" | "BANCO_AGRICOLA" | "BANCO_CARONI"
  | "BANFANB" | "BANCO_TESORO" | "BANCO_EXTERIOR" | "BFC" | "BANCO_INTERNACIONAL_DESARROLLO"
  | "BNC" | "BANCO_PLAZA" | "BANCO_SOFITASA" | "BANCRECER" | "BANGENTE" | "BANPLUS"
  | "DELSUR" | "MI_BANCO" | "N58_BANCO_DIGITAL";
export type PaymentMethod = "BANESCO" | "BINANCE" | "MOBILE";
export type TicketItemStatus = "PENDING" | "CONFIRMED" | "REJECTED";
export type NotificationType =
  | "TICKET_PURCHASED" | "TICKET_CONFIRMED" | "RAFFLE_WON" | "PRIZE_CLAIMED" | "PRIZE_PAID"
  | "ACCOUNT_UPDATED" | "SYSTEM" | "RAFFLE_CLOSING_SOON" | "FAVORITE_RAFFLE_UPDATED"
  | "ADMIN_PAYMENT_ALERT" | "ADMIN_PRIZE_ALERT";
export type AutomationType = "AUTO_EXECUTE_RAFFLE" | "SEND_REMINDER_24H" | "SEND_REMINDER_LOW_SLOTS" | "AUTO_EXPORT_REPORTS";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  documentId: string;
  phoneNumber: string | null;
  nationalId: string | null;
  nationalIdType: string | null;
  bank: Bank | null;
  bankPhone: string | null;
  suspended: boolean;
  suspendedReason: string | null;
  suspendedAt: Date | null;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  emailUpdatedAt: Date | null;
  usernameUpdatedAt: Date | null;
  bankDataUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  createdById: string | null;
}

export interface Raffle {
  id: string;
  title: string;
  description: string | null;
  type: DrawType;
  pricePerSlot: string | number;
  slots: number;
  winnersCount: number;
  mirrorMode: boolean;
  status: string;
  approved: boolean;
  approvedAt: Date | null;
  approvedById: string | null;
  startsAt: Date | null;
  closesAt: Date | null;
  executedAt: Date | null;
  winningItem: string | null;
  prizes: unknown;
  templateId: string | null;
  autoExecute: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: string;
  raffleId: string;
  userId: string;
  items: unknown;
  totalPaid: string | number;
  purchasedAt: Date;
  status: string;
  paymentMethod: PaymentMethod | null;
  paymentMobileRef: string | null;
  paymentMobileBank: Bank | null;
}

export interface PrizeClaim {
  id: string;
  ticketId: string;
  userId: string;
  status: PrizeStatus;
  paymentRef: string | null;
  paymentProof: string | null;
  processedAt: Date | null;
  processedById: string | null;
  paidAmount: string | null;
  createdAt: Date;
}

export interface TicketItem {
  id: string;
  raffleId: string;
  ticketId: string;
  value: string;
  status: TicketItemStatus;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: Role | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: unknown;
  ip: string | null;
  createdAt: Date;
}

export interface TermsAndConditions {
  id: string;
  content: string;
  updatedAt: Date;
  updatedById: string | null;
}

export interface Rules {
  id: string;
  content: string;
  updatedAt: Date;
  updatedById: string | null;
}

export interface PaymentMobile {
  id: string;
  imageUrl: string | null;
  cedula: string | null;
  telefono: string | null;
  destino: string | null;
  updatedAt: Date;
  updatedById: string | null;
}

export interface SocialMedia {
  id: string;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  whatsapp: string | null;
  facebookEnabled: boolean;
  instagramEnabled: boolean;
  twitterEnabled: boolean;
  youtubeEnabled: boolean;
  tiktokEnabled: boolean;
  whatsappEnabled: boolean;
  updatedAt: Date;
  updatedById: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: unknown;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  readAt: Date | null;
}

export interface ReferralLink {
  id: string;
  code: string;
  name: string;
  createdById: string;
  clicks: number;
  registrations: number;
  purchases: number;
  revenue: string | number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralVisit {
  id: string;
  referralLinkId: string;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  registered: boolean;
  purchased: boolean;
  createdAt: Date;
}

export interface FavoriteRaffle {
  id: string;
  userId: string;
  raffleId: string;
  createdAt: Date;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface TwoFactorAuth {
  id: string;
  userId: string;
  secret: string;
  enabled: boolean;
  backupCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RaffleTemplate {
  id: string;
  name: string;
  description: string | null;
  type: DrawType;
  pricePerSlot: string | number;
  slots: number;
  winnersCount: number;
  mirrorMode: boolean;
  prizes: unknown;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationRule {
  id: string;
  name: string;
  type: AutomationType;
  enabled: boolean;
  config: unknown;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HomePageConfig {
  id: string;
  heroImages: unknown;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroEffect: string | null;
  heroEffectParams: unknown;
  heroAutoSlide: boolean;
  heroAutoSlideMode: string | null;
  heroAutoSlideInterval: number;
  heroPauseOnHover: boolean;
  heroScrollFade: boolean;
  heroOpacity: number;
  heroBlur: number;
  heroTextColor: string | null;
  heroSubtitleColor: string | null;
  heroOverlayColor: string | null;
  heroOverlayOpacity: number;
  heroImageSize: string | null;
  instagramVideoUrl: string | null;
  headerConfig: unknown;
  contactConfig: unknown;
  footerConfig: unknown;
  sectionOrder: unknown;
  sectionVisibility: unknown;
  updatedById: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface LiveConfig {
  id: string;
  streamUrl: string | null;
  chatIframeUrl: string | null;
  updatedById: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedById: string | null;
}

