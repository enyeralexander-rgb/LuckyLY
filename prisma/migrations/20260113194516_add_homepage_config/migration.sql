-- CreateTable
CREATE TABLE IF NOT EXISTS "HomePageConfig" (
    "id" TEXT NOT NULL,
    "heroImages" JSONB,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroEffect" TEXT,
    "heroAutoSlide" BOOLEAN NOT NULL DEFAULT false,
    "heroAutoSlideInterval" INTEGER NOT NULL DEFAULT 5000,
    "heroScrollFade" BOOLEAN NOT NULL DEFAULT true,
    "heroOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "heroBlur" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "instagramVideoUrl" TEXT,
    "sectionOrder" JSONB,
    "sectionVisibility" JSONB,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomePageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HomePageConfig_updatedById_idx" ON "HomePageConfig"("updatedById");
