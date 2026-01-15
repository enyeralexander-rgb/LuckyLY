-- Enums
CREATE TYPE "Role" AS ENUM ('USER', 'AGENT', 'SUPERADMIN', 'MASTER');
CREATE TYPE "DrawType" AS ENUM ('NUMBERS', 'ANIMALS', 'STATES', 'FLAGS', 'OBJECTS');
CREATE TYPE "PrizeStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'REJECTED');
CREATE TYPE "Bank" AS ENUM ('BANESCO', 'VENEZUELA', 'MERCANTIL', 'BOD', 'PROVINCIAL', 'BICENTENARIO', 'OTRA');

-- Tables
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT,
    "nationalId" TEXT,
    "bank" "Bank",
    "bankPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Raffle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "totalPaid" DECIMAL(10,2) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrizeClaim" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PrizeStatus" NOT NULL DEFAULT 'REQUESTED',
    "paymentRef" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrizeClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketItem" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "TicketItem_pkey" PRIMARY KEY ("id")
);

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

-- Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Raffle_status_closesAt_idx" ON "Raffle"("status","closesAt");
CREATE INDEX "Ticket_raffleId_idx" ON "Ticket"("raffleId");
CREATE INDEX "Ticket_userId_purchasedAt_idx" ON "Ticket"("userId","purchasedAt");
CREATE UNIQUE INDEX "PrizeClaim_ticketId_key" ON "PrizeClaim"("ticketId");
CREATE INDEX "PrizeClaim_userId_createdAt_idx" ON "PrizeClaim"("userId","createdAt");
CREATE UNIQUE INDEX "TicketItem_raffleId_value_key" ON "TicketItem"("raffleId","value");
CREATE INDEX "TicketItem_ticketId_idx" ON "TicketItem"("ticketId");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId","createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- FKs
ALTER TABLE "Raffle" ADD CONSTRAINT "Raffle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketItem" ADD CONSTRAINT "TicketItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketItem" ADD CONSTRAINT "TicketItem_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
