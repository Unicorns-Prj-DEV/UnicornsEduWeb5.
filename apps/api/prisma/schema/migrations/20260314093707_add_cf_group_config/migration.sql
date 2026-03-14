-- CreateTable
CREATE TABLE "cf_group_configs" (
    "group_code" TEXT NOT NULL,
    "website_base_url" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cf_group_configs_pkey" PRIMARY KEY ("group_code")
);
