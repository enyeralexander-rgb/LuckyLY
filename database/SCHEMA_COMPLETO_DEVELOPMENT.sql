-- ============================================
-- ESQUEMA COMPLETO DE BASE DE DATOS
-- Entorno: Development (Neon)
-- Fecha: 2026-01-16
-- ============================================
-- Este archivo contiene el esquema completo de la base de datos
-- para el entorno de desarrollo (Development branch)
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Enum: Role
CREATE TYPE "Role" AS ENUM ('USER', 'AGENT', 'CONTABLE', 'SUPERADMIN', 'MASTER');

-- Enum: DrawType
CREATE TYPE "DrawType" AS ENUM ('NUMBERS', 'ANIMALS', 'STATES', 'FLAGS', 'ZODIAC');

-- Enum: PrizeStatus
CREATE TYPE "PrizeStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'REJECTED', 'INCORRECT_DATA');

-- Enum: Bank
CREATE TYPE "Bank" AS ENUM ('BANESCO', 'VENEZUELA', 'MERCANTIL', 'BOD', 'PROVINCIAL', 'BICENTENARIO', 'OTRA');

-- Enum: PaymentMethod
CREATE TYPE "PaymentMethod" AS ENUM ('BANESCO', 'BINANCE', 'MOBILE');

-- Enum: TicketItemStatus
CREATE TYPE "TicketItemStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- Enum: NotificationType
CREATE TYPE "NotificationType" AS ENUM ('TICKET_PURCHASED', 'TICKET_CONFIRMED', 'RAFFLE_WON', 'PRIZE_CLAIMED', 'PRIZE_PAID', 'ACCOUNT_UPDATED', 'SYSTEM', 'RAFFLE_CLOSING_SOON', 'FAVORITE_RAFFLE_UPDATED');

-- Enum: AutomationType
CREATE TYPE "AutomationType" AS ENUM ('AUTO_EXECUTE_RAFFLE', 'SEND_REMINDER_24H', 'SEND_REMINDER_LOW_SLOTS', 'AUTO_EXPORT_REPORTS');

-- ============================================
-- TABLAS
-- ============================================

-- Tabla: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "avatarUrl" TEXT,
    "documentId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "nationalId" TEXT,
    "nationalIdType" TEXT,
    "bank" "Bank",
    "bankPhone" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Tabla: Raffle
CREATE TABLE "Raffle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "DrawType" NOT NULL,
    "pricePerSlot" DECIMAL(10,2) NOT NULL,
    "slots" INTEGER NOT NULL,
    "winnersCount" INTEGER NOT NULL DEFAULT 1,
    "mirrorMode" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "winningItem" TEXT,
    "prizes" JSONB,
    "templateId" TEXT,
    "autoExecute" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Raffle_pkey" PRIMARY KEY ("id")
);

-- Tabla: Ticket
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "totalPaid" DECIMAL(10,2) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "paymentMobileRef" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- Tabla: PrizeClaim
CREATE TABLE "PrizeClaim" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PrizeStatus" NOT NULL DEFAULT 'REQUESTED',
    "paymentRef" TEXT,
    "paymentProof" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeClaim_pkey" PRIMARY KEY ("id")
);

-- Tabla: TicketItem
CREATE TABLE "TicketItem" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" "TicketItemStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "TicketItem_pkey" PRIMARY KEY ("id")
);

-- Tabla: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Tabla: TermsAndConditions
CREATE TABLE "TermsAndConditions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "TermsAndConditions_pkey" PRIMARY KEY ("id")
);

-- Tabla: Rules
CREATE TABLE "Rules" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Rules_pkey" PRIMARY KEY ("id")
);

-- Tabla: PaymentMobile
CREATE TABLE "PaymentMobile" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "cedula" TEXT,
    "telefono" TEXT,
    "destino" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PaymentMobile_pkey" PRIMARY KEY ("id")
);

-- Tabla: SocialMedia
CREATE TABLE "SocialMedia" (
    "id" TEXT NOT NULL,
    "facebook" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "youtube" TEXT,
    "tiktok" TEXT,
    "whatsapp" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "SocialMedia_pkey" PRIMARY KEY ("id")
);

-- Tabla: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Tabla: ReferralLink
CREATE TABLE "ReferralLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "registrations" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

-- Tabla: ReferralVisit
CREATE TABLE "ReferralVisit" (
    "id" TEXT NOT NULL,
    "referralLinkId" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "registered" BOOLEAN NOT NULL DEFAULT false,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralVisit_pkey" PRIMARY KEY ("id")
);

-- Tabla: FavoriteRaffle
CREATE TABLE "FavoriteRaffle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteRaffle_pkey" PRIMARY KEY ("id")
);

-- Tabla: PasswordResetToken
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- Tabla: EmailVerificationToken
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- Tabla: TwoFactorAuth
CREATE TABLE "TwoFactorAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("id")
);

-- Tabla: RaffleTemplate
CREATE TABLE "RaffleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DrawType" NOT NULL,
    "pricePerSlot" DECIMAL(10,2) NOT NULL,
    "slots" INTEGER NOT NULL,
    "winnersCount" INTEGER NOT NULL DEFAULT 1,
    "mirrorMode" BOOLEAN NOT NULL DEFAULT false,
    "prizes" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaffleTemplate_pkey" PRIMARY KEY ("id")
);

-- Tabla: AutomationRule
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AutomationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- Tabla: HomePageConfig
CREATE TABLE "HomePageConfig" (
    "id" TEXT NOT NULL,
    "heroImages" JSONB,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroEffect" TEXT,
    "heroEffectParams" JSONB,
    "heroAutoSlide" BOOLEAN NOT NULL DEFAULT false,
    "heroAutoSlideMode" TEXT,
    "heroAutoSlideInterval" INTEGER NOT NULL DEFAULT 5000,
    "heroScrollFade" BOOLEAN NOT NULL DEFAULT true,
    "heroOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "heroBlur" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "heroTextColor" TEXT,
    "heroSubtitleColor" TEXT,
    "heroOverlayColor" TEXT,
    "heroOverlayOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "heroImageSize" TEXT,
    "instagramVideoUrl" TEXT,
    "headerConfig" JSONB,
    "contactConfig" JSONB,
    "footerConfig" JSONB,
    "sectionOrder" JSONB,
    "sectionVisibility" JSONB,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomePageConfig_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- ÍNDICES
-- ============================================

-- Índices para User
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_documentId_key" ON "User"("documentId");
CREATE INDEX "User_documentId_idx" ON "User"("documentId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_suspended_idx" ON "User"("suspended");
CREATE INDEX "User_emailVerified_idx" ON "User"("emailVerified");

-- Índices para Raffle
CREATE INDEX "Raffle_status_closesAt_idx" ON "Raffle"("status", "closesAt");
CREATE INDEX "Raffle_templateId_idx" ON "Raffle"("templateId");
CREATE INDEX "Raffle_autoExecute_idx" ON "Raffle"("autoExecute");

-- Índices para Ticket
CREATE INDEX "Ticket_raffleId_idx" ON "Ticket"("raffleId");
CREATE INDEX "Ticket_userId_purchasedAt_idx" ON "Ticket"("userId", "purchasedAt");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- Índices para PrizeClaim
CREATE UNIQUE INDEX "PrizeClaim_ticketId_key" ON "PrizeClaim"("ticketId");
CREATE INDEX "PrizeClaim_userId_createdAt_idx" ON "PrizeClaim"("userId", "createdAt");

-- Índices para TicketItem
CREATE UNIQUE INDEX "TicketItem_raffleId_value_key" ON "TicketItem"("raffleId", "value");
CREATE INDEX "TicketItem_ticketId_idx" ON "TicketItem"("ticketId");
CREATE INDEX "TicketItem_status_idx" ON "TicketItem"("status");

-- Índices para AuditLog
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Índices para Notification
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- Índices para ReferralLink
CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");
CREATE INDEX "ReferralLink_createdById_idx" ON "ReferralLink"("createdById");
CREATE INDEX "ReferralLink_code_idx" ON "ReferralLink"("code");

-- Índices para ReferralVisit
CREATE INDEX "ReferralVisit_referralLinkId_createdAt_idx" ON "ReferralVisit"("referralLinkId", "createdAt");
CREATE INDEX "ReferralVisit_userId_idx" ON "ReferralVisit"("userId");
CREATE INDEX "ReferralVisit_country_idx" ON "ReferralVisit"("country");

-- Índices para FavoriteRaffle
CREATE UNIQUE INDEX "FavoriteRaffle_userId_raffleId_key" ON "FavoriteRaffle"("userId", "raffleId");
CREATE INDEX "FavoriteRaffle_userId_idx" ON "FavoriteRaffle"("userId");
CREATE INDEX "FavoriteRaffle_raffleId_idx" ON "FavoriteRaffle"("raffleId");

-- Índices para PasswordResetToken
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_userId_used_idx" ON "PasswordResetToken"("userId", "used");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- Índices para EmailVerificationToken
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");
CREATE INDEX "EmailVerificationToken_token_idx" ON "EmailVerificationToken"("token");
CREATE INDEX "EmailVerificationToken_userId_used_idx" ON "EmailVerificationToken"("userId", "used");
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- Índices para TwoFactorAuth
CREATE UNIQUE INDEX "TwoFactorAuth_userId_key" ON "TwoFactorAuth"("userId");
CREATE INDEX "TwoFactorAuth_userId_idx" ON "TwoFactorAuth"("userId");

-- Índices para RaffleTemplate
CREATE INDEX "RaffleTemplate_createdById_idx" ON "RaffleTemplate"("createdById");

-- Índices para AutomationRule
CREATE INDEX "AutomationRule_enabled_idx" ON "AutomationRule"("enabled");
CREATE INDEX "AutomationRule_type_idx" ON "AutomationRule"("type");

-- Índices para HomePageConfig
CREATE INDEX "HomePageConfig_updatedById_idx" ON "HomePageConfig"("updatedById");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- Foreign Keys para User
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para Raffle
ALTER TABLE "Raffle" ADD CONSTRAINT "Raffle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para Ticket
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para PrizeClaim
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para TicketItem
ALTER TABLE "TicketItem" ADD CONSTRAINT "TicketItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketItem" ADD CONSTRAINT "TicketItem_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para AuditLog
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para TermsAndConditions
ALTER TABLE "TermsAndConditions" ADD CONSTRAINT "TermsAndConditions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para Rules
ALTER TABLE "Rules" ADD CONSTRAINT "Rules_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para PaymentMobile
ALTER TABLE "PaymentMobile" ADD CONSTRAINT "PaymentMobile_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para SocialMedia
ALTER TABLE "SocialMedia" ADD CONSTRAINT "SocialMedia_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para Notification
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para ReferralLink
ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para ReferralVisit
ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para FavoriteRaffle
ALTER TABLE "FavoriteRaffle" ADD CONSTRAINT "FavoriteRaffle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteRaffle" ADD CONSTRAINT "FavoriteRaffle_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para PasswordResetToken
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para EmailVerificationToken
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para TwoFactorAuth
ALTER TABLE "TwoFactorAuth" ADD CONSTRAINT "TwoFactorAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para RaffleTemplate
ALTER TABLE "RaffleTemplate" ADD CONSTRAINT "RaffleTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para AutomationRule
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para HomePageConfig
ALTER TABLE "HomePageConfig" ADD CONSTRAINT "HomePageConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- FIN DEL ESQUEMA
-- ============================================
