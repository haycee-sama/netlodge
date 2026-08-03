CREATE TYPE "public"."dispute_status" AS ENUM('none', 'pending', 'resolved_refund', 'resolved_release');--> statement-breakpoint
CREATE TYPE "public"."otp_purpose" AS ENUM('email_verification', 'password_reset');--> statement-breakpoint
ALTER TABLE "verification_tokens" RENAME TO "email_otps";--> statement-breakpoint
ALTER TABLE "email_otps" DROP CONSTRAINT "verification_tokens_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_verification_tokens_user";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "dispute_status" "dispute_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "dispute_reason" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "disputed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "escrow_released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "landlord_payout_reference" varchar(150);--> statement-breakpoint
ALTER TABLE "landlords" ADD COLUMN "kyc_documents" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "university_email" varchar(255);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "nin_bvn_encrypted" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "kyc_documents" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oauth_provider" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_preferences" jsonb DEFAULT '{
    "bookingUpdates": true,
    "paymentReceipts": true,
    "leaseReminders": true,
    "newListings": false,
    "promotions": false,
    "smsAlerts": true
  }'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "email_otps" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "email_otps" ADD COLUMN "purpose" "otp_purpose" NOT NULL;--> statement-breakpoint
ALTER TABLE "email_otps" ADD COLUMN "code_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "email_otps" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "email_otps" ADD COLUMN "consumed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_dispute_status" ON "bookings" USING btree ("dispute_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_active_booking_per_room" ON "bookings" USING btree ("room_id") WHERE status IN ('pending_payment','confirmed');--> statement-breakpoint
CREATE INDEX "idx_rooms_property_status" ON "rooms" USING btree ("property_id","status");--> statement-breakpoint
CREATE INDEX "idx_email_otps_user_purpose" ON "email_otps" USING btree ("user_id","purpose");--> statement-breakpoint
ALTER TABLE "email_otps" DROP COLUMN "token";