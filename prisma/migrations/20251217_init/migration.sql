-- Create enums (defensive drop to avoid P3006 on shadow DB)
DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "DrawType" CASCADE;
DROP TYPE IF EXISTS "WalletTxnType" CASCADE;
DROP TYPE IF EXISTS "WalletTxnStatus" CASCADE;
DROP TYPE IF EXISTS "PrizeStatus" CASCADE;
DROP TYPE IF EXISTS "Bank" CASCADE;

CREATE TYPE "Role" AS ENUM ('USER', 'AGENT', 'SUPERADMIN', 'MASTER');
CREATE TYPE "DrawType" AS ENUM ('NUMBERS', 'ANIMALS', 'STATES', 'FLAGS', 'OBJECTS');
CREATE TYPE "WalletTxnType" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "WalletTxnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PrizeStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'REJECTED');
CREATE TYPE "Bank" AS ENUM ('BANESCO', 'VENEZUELA', 'MERCANTIL', 'BOD', 'PROVINCIAL', 'BICENTENARIO', 'OTRA');

-- Users
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "PrizeClaim" CASCADE;
DROP TABLE IF EXISTS "WalletTxn" CASCADE;
DROP TABLE IF EXISTS "Ticket" CASCADE;
DROP TABLE IF EXISTS "Raffle" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "birthDate" TIMESTAMPTZ NOT NULL,
  "phoneNumber" TEXT,
  "nationalId" TEXT,
  "bank" "Bank",
  "bankPhone" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "role" "Role" NOT NULL DEFAULT 'USER'
);
CREATE INDEX "User_role_idx" ON "User"("role");

-- Raffles
CREATE TABLE "Raffle" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "DrawType" NOT NULL,
  "pricePerSlot" NUMERIC(10,2) NOT NULL,
  "slots" INTEGER NOT NULL,
  "winnersCount" INTEGER NOT NULL DEFAULT 1,
  "mirrorMode" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMPTZ,
  "closesAt" TIMESTAMPTZ,
  "executedAt" TIMESTAMPTZ,
  "winningItem" TEXT,
  "createdById" TEXT REFERENCES "User"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "Raffle_status_closesAt_idx" ON "Raffle"("status","closesAt");

-- Tickets
CREATE TABLE "Ticket" (
  "id" TEXT PRIMARY KEY,
  "raffleId" TEXT NOT NULL REFERENCES "Raffle"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "items" JSONB NOT NULL,
  "totalPaid" NUMERIC(10,2) NOT NULL,
  "purchasedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "status" TEXT NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX "Ticket_raffleId_idx" ON "Ticket"("raffleId");
CREATE INDEX "Ticket_userId_purchasedAt_idx" ON "Ticket"("userId","purchasedAt");

-- Wallet transactions
CREATE TABLE "WalletTxn" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "type" "WalletTxnType" NOT NULL,
  "status" "WalletTxnStatus" NOT NULL DEFAULT 'PENDING',
  "amount" NUMERIC(12,2) NOT NULL,
  "reference" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "approvedAt" TIMESTAMPTZ,
  "approvedById" TEXT
);
CREATE INDEX "WalletTxn_userId_createdAt_idx" ON "WalletTxn"("userId","createdAt");
CREATE INDEX "WalletTxn_status_idx" ON "WalletTxn"("status");

-- Prize claims
CREATE TABLE "PrizeClaim" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL REFERENCES "Ticket"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "status" "PrizeStatus" NOT NULL DEFAULT 'REQUESTED',
  "paymentRef" TEXT,
  "processedAt" TIMESTAMPTZ,
  "processedById" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "PrizeClaim_ticketId_key" ON "PrizeClaim"("ticketId");
CREATE INDEX "PrizeClaim_userId_createdAt_idx" ON "PrizeClaim"("userId","createdAt");

-- Audit log
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT REFERENCES "User"("id"),
  "actorRole" "Role",
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "meta" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId","createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

