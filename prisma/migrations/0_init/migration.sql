-- PostgreSQL Schema for RTO Pollution Van Manager
-- Complies with requirements: UUID PKs, TIMESTAMPTZ, DECIMAL(12,2), JSONB, Indexes, Foreign Keys

-- 1. Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Enums
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'VAN_OPERATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Table: "User"
CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "firebase_uid" VARCHAR(255) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "phone" VARCHAR(50),
    "role" "Role" NOT NULL DEFAULT 'VAN_OPERATOR',
    "van_id" UUID UNIQUE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Table: "Van"
CREATE TABLE IF NOT EXISTS "Van" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "van_number" VARCHAR(50) UNIQUE NOT NULL,
    "registration_number" VARCHAR(50) NOT NULL,
    "operator_id" UUID UNIQUE,
    "status" "VanStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add Foreign Key between User and Van
ALTER TABLE "User" 
    ADD CONSTRAINT "fk_user_van" 
    FOREIGN KEY ("van_id") REFERENCES "Van"("id") ON DELETE SET NULL;

ALTER TABLE "Van" 
    ADD CONSTRAINT "fk_van_operator" 
    FOREIGN KEY ("operator_id") REFERENCES "User"("id") ON DELETE SET NULL;

-- 5. Create Table: "DailyReport"
CREATE TABLE IF NOT EXISTS "DailyReport" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "report_date" DATE NOT NULL,
    "van_id" UUID NOT NULL REFERENCES "Van"("id") ON DELETE CASCADE,
    "operator_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "petrol_tests" INTEGER NOT NULL DEFAULT 0 CHECK ("petrol_tests" >= 0),
    "diesel_tests" INTEGER NOT NULL DEFAULT 0 CHECK ("diesel_tests" >= 0),
    "other_tests" INTEGER NOT NULL DEFAULT 0 CHECK ("other_tests" >= 0),
    "total_tests" INTEGER NOT NULL DEFAULT 0 CHECK ("total_tests" >= 0),
    "total_collection" DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK ("total_collection" >= 0.00),
    "expenses" DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK ("expenses" >= 0.00),
    "net_collection" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    CONSTRAINT "van_report_date_unique" UNIQUE ("van_id", "report_date"),
    CONSTRAINT "check_total_tests_sum" CHECK ("total_tests" = "petrol_tests" + "diesel_tests" + "other_tests")
);

-- 6. Create Table: "Notification"
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(100) NOT NULL DEFAULT 'DAILY_REPORT_SUBMITTED',
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Table: "DeviceToken"
CREATE TABLE IF NOT EXISTS "DeviceToken" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "token" TEXT UNIQUE NOT NULL,
    "platform" VARCHAR(50) DEFAULT 'web',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create Table: "AuditLog"
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(255),
    "metadata" JSONB,
    "ip_address" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Create Performance Indexes
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User"("email");
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "User"("role");
CREATE INDEX IF NOT EXISTS "idx_van_status" ON "Van"("status");
CREATE INDEX IF NOT EXISTS "idx_daily_report_date" ON "DailyReport"("report_date");
CREATE INDEX IF NOT EXISTS "idx_daily_report_van_id" ON "DailyReport"("van_id");
CREATE INDEX IF NOT EXISTS "idx_daily_report_operator_id" ON "DailyReport"("operator_id");
CREATE INDEX IF NOT EXISTS "idx_daily_report_status" ON "DailyReport"("status");
CREATE INDEX IF NOT EXISTS "idx_daily_report_van_date" ON "DailyReport"("van_id", "report_date");
CREATE INDEX IF NOT EXISTS "idx_daily_report_operator_date" ON "DailyReport"("operator_id", "report_date");
CREATE INDEX IF NOT EXISTS "idx_daily_report_status_date" ON "DailyReport"("status", "report_date");
CREATE INDEX IF NOT EXISTS "idx_notification_user_read" ON "Notification"("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notification_user_created" ON "Notification"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_notification_created" ON "Notification"("created_at");
CREATE INDEX IF NOT EXISTS "idx_device_token_user" ON "DeviceToken"("user_id");
CREATE INDEX IF NOT EXISTS "idx_device_token_token" ON "DeviceToken"("token");
CREATE INDEX IF NOT EXISTS "idx_audit_log_created" ON "AuditLog"("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_log_action" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_log_user" ON "AuditLog"("user_id");
