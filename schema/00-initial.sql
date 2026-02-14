-- =============================================================================
-- LuckyLY - Esquema inicial PostgreSQL (primer despliegue)
-- Ejecutar una sola vez en una base de datos vacía (Neon, Vercel Postgres, etc.)
-- Cambios posteriores: usar archivos en schema/migrations/ (001_xxx.sql, 002_xxx.sql)
-- =============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'AGENT', 'CONTABLE', 'SUPERADMIN', 'MASTER');

-- CreateEnum
CREATE TYPE "DrawType" AS ENUM ('NUMBERS', 'ANIMALS', 'STATES', 'FLAGS', 'ZODIAC');

-- CreateEnum
CREATE TYPE "PrizeStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'REJECTED', 'INCORRECT_DATA');

-- CreateEnum
CREATE TYPE "Bank" AS ENUM ('BANESCO', 'VENEZUELA', 'MERCANTIL', 'BOD', 'PROVINCIAL', 'BICENTENARIO', 'OTRA', 'BANCO_100', 'BANCAMIGA', 'BANCARIBE', 'BANCO_ACTIVO', 'BANCO_AGRICOLA', 'BANCO_CARONI', 'BANFANB', 'BANCO_TESORO', 'BANCO_EXTERIOR', 'BFC', 'BANCO_INTERNACIONAL_DESARROLLO', 'BNC', 'BANCO_PLAZA', 'BANCO_SOFITASA', 'BANCRECER', 'BANGENTE', 'BANPLUS', 'DELSUR', 'MI_BANCO', 'N58_BANCO_DIGITAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANESCO', 'BINANCE', 'MOBILE');

-- CreateEnum
CREATE TYPE "TicketItemStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TICKET_PURCHASED', 'TICKET_CONFIRMED', 'RAFFLE_WON', 'PRIZE_CLAIMED', 'PRIZE_PAID', 'ACCOUNT_UPDATED', 'SYSTEM', 'RAFFLE_CLOSING_SOON', 'FAVORITE_RAFFLE_UPDATED', 'ADMIN_PAYMENT_ALERT', 'ADMIN_PRIZE_ALERT');

-- CreateEnum
CREATE TYPE "AutomationType" AS ENUM ('AUTO_EXECUTE_RAFFLE', 'SEND_REMINDER_24H', 'SEND_REMINDER_LOW_SLOTS', 'AUTO_EXPORT_REPORTS');

-- CreateTable
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
    "suspendedReason" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "emailUpdatedAt" TIMESTAMP(3),
    "usernameUpdatedAt" TIMESTAMP(3),
    "bankDataUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
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

-- CreateTable
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
    "paymentMobileBank" "Bank",

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeClaim" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PrizeStatus" NOT NULL DEFAULT 'REQUESTED',
    "paymentRef" TEXT,
    "paymentProof" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "paidAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketItem" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" "TicketItemStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "TicketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "TermsAndConditions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "TermsAndConditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rules" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMobile" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT,
    "cedula" TEXT,
    "telefono" TEXT,
    "destino" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PaymentMobile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMedia" (
    "id" TEXT NOT NULL,
    "facebook" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "youtube" TEXT,
    "tiktok" TEXT,
    "whatsapp" TEXT,
    "facebookEnabled" BOOLEAN NOT NULL DEFAULT true,
    "instagramEnabled" BOOLEAN NOT NULL DEFAULT true,
    "twitterEnabled" BOOLEAN NOT NULL DEFAULT true,
    "youtubeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tiktokEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "SocialMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "FavoriteRaffle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteRaffle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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
    "heroPauseOnHover" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "LiveConfig" (
    "id" TEXT NOT NULL,
    "streamUrl" TEXT,
    "chatIframeUrl" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeEmailTemplate" (
    "id" TEXT NOT NULL,
    "body" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TemplateRaffles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TemplateRaffles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_documentId_key" ON "User"("documentId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_documentId_idx" ON "User"("documentId");

-- CreateIndex
CREATE INDEX "User_suspended_idx" ON "User"("suspended");

-- CreateIndex
CREATE INDEX "User_emailVerified_idx" ON "User"("emailVerified");

-- CreateIndex
CREATE INDEX "Raffle_status_closesAt_idx" ON "Raffle"("status", "closesAt");

-- CreateIndex
CREATE INDEX "Raffle_templateId_idx" ON "Raffle"("templateId");

-- CreateIndex
CREATE INDEX "Raffle_autoExecute_idx" ON "Raffle"("autoExecute");

-- CreateIndex
CREATE INDEX "Raffle_approved_idx" ON "Raffle"("approved");

-- CreateIndex
CREATE INDEX "Ticket_raffleId_idx" ON "Ticket"("raffleId");

-- CreateIndex
CREATE INDEX "Ticket_userId_purchasedAt_idx" ON "Ticket"("userId", "purchasedAt");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex (listados y reportes por fecha y estado)
CREATE INDEX "Ticket_status_purchasedAt_idx" ON "Ticket"("status", "purchasedAt");

-- CreateIndex
CREATE INDEX "Ticket_paymentMobileBank_paymentMobileRef_purchasedAt_idx" ON "Ticket"("paymentMobileBank", "paymentMobileRef", "purchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeClaim_ticketId_key" ON "PrizeClaim"("ticketId");

-- CreateIndex
CREATE INDEX "PrizeClaim_userId_createdAt_idx" ON "PrizeClaim"("userId", "createdAt");

-- CreateIndex (egresos y reportes por estado y fecha de pago)
CREATE INDEX "PrizeClaim_status_processedAt_idx" ON "PrizeClaim"("status", "processedAt");

-- CreateIndex
CREATE INDEX "TicketItem_ticketId_idx" ON "TicketItem"("ticketId");

-- CreateIndex
CREATE INDEX "TicketItem_status_idx" ON "TicketItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TicketItem_raffleId_value_key" ON "TicketItem"("raffleId", "value");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");

-- CreateIndex
CREATE INDEX "ReferralLink_createdById_idx" ON "ReferralLink"("createdById");

-- CreateIndex
CREATE INDEX "ReferralLink_code_idx" ON "ReferralLink"("code");

-- CreateIndex
CREATE INDEX "ReferralVisit_referralLinkId_createdAt_idx" ON "ReferralVisit"("referralLinkId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralVisit_userId_idx" ON "ReferralVisit"("userId");

-- CreateIndex
CREATE INDEX "ReferralVisit_country_idx" ON "ReferralVisit"("country");

-- CreateIndex
CREATE INDEX "FavoriteRaffle_userId_idx" ON "FavoriteRaffle"("userId");

-- CreateIndex
CREATE INDEX "FavoriteRaffle_raffleId_idx" ON "FavoriteRaffle"("raffleId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRaffle_userId_raffleId_key" ON "FavoriteRaffle"("userId", "raffleId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_used_idx" ON "PasswordResetToken"("userId", "used");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_token_idx" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_used_idx" ON "EmailVerificationToken"("userId", "used");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorAuth_userId_key" ON "TwoFactorAuth"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorAuth_userId_idx" ON "TwoFactorAuth"("userId");

-- CreateIndex
CREATE INDEX "RaffleTemplate_createdById_idx" ON "RaffleTemplate"("createdById");

-- CreateIndex
CREATE INDEX "AutomationRule_enabled_idx" ON "AutomationRule"("enabled");

-- CreateIndex
CREATE INDEX "AutomationRule_type_idx" ON "AutomationRule"("type");

-- CreateIndex
CREATE INDEX "HomePageConfig_updatedById_idx" ON "HomePageConfig"("updatedById");

-- CreateIndex
CREATE INDEX "LiveConfig_updatedById_idx" ON "LiveConfig"("updatedById");

-- CreateIndex
CREATE INDEX "_TemplateRaffles_B_index" ON "_TemplateRaffles"("B");

-- AddForeignKey (política: hijos con CASCADE, referencias opcionales updatedById/actorId/createdById con SET NULL, ReferralLink/AutomationRule RESTRICT para no borrar User con datos asociados)
-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Raffle" ADD CONSTRAINT "Raffle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (CASCADE para borrado en cascada)
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketItem" ADD CONSTRAINT "TicketItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketItem" ADD CONSTRAINT "TicketItem_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAndConditions" ADD CONSTRAINT "TermsAndConditions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rules" ADD CONSTRAINT "Rules_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMobile" ADD CONSTRAINT "PaymentMobile_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMedia" ADD CONSTRAINT "SocialMedia_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteRaffle" ADD CONSTRAINT "FavoriteRaffle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteRaffle" ADD CONSTRAINT "FavoriteRaffle_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorAuth" ADD CONSTRAINT "TwoFactorAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveConfig" ADD CONSTRAINT "LiveConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomePageConfig" ADD CONSTRAINT "HomePageConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TemplateRaffles" ADD CONSTRAINT "_TemplateRaffles_A_fkey" FOREIGN KEY ("A") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TemplateRaffles" ADD CONSTRAINT "_TemplateRaffles_B_fkey" FOREIGN KEY ("B") REFERENCES "RaffleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
