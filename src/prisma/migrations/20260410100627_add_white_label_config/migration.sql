-- CreateTable
CREATE TABLE "white_label_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "company_name" TEXT NOT NULL DEFAULT 'Hypothetical Publishing',
    "tagline" TEXT NOT NULL DEFAULT 'Book publishing & royalty management',
    "logo_path" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#2563eb',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "white_label_config_pkey" PRIMARY KEY ("id")
);
