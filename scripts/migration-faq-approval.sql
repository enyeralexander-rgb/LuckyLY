-- Migration: FAQ + Approval Email Template
-- Run this against your production database

-- Create FaqItem table
CREATE TABLE IF NOT EXISTS "FaqItem" (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL
);

-- Create ApprovalEmailTemplate table
CREATE TABLE IF NOT EXISTS "ApprovalEmailTemplate" (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL
);
