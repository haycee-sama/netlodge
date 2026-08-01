CREATE TYPE "public"."amenity_category" AS ENUM('power', 'water', 'internet', 'security', 'extras');--> statement-breakpoint
CREATE TYPE "public"."bathroom_type" AS ENUM('ensuite', 'shared');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('draft', 'pending_payment', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."furnished_status" AS ENUM('yes', 'no', 'partially');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."lease_duration" AS ENUM('full_year', 'per_semester', 'half_year');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'bank_transfer', 'ussd', 'opay', 'moniepoint', 'qr', 'mobile_money');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'paid', 'failed');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('available', 'booked', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('single', 'shared', 'self_contain');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'landlord', 'admin');--> statement-breakpoint
CREATE TABLE "amenities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "amenity_category" NOT NULL,
	"label" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_ref" varchar(30) DEFAULT generate_booking_ref() NOT NULL,
	"student_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"lease_type" "lease_duration" NOT NULL,
	"room_price" numeric(12, 2) NOT NULL,
	"service_fee" numeric(12, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"move_in_date" date NOT NULL,
	"lease_end_date" date NOT NULL,
	"status" "booking_status" DEFAULT 'draft' NOT NULL,
	"agreed_to_terms_at" timestamp with time zone,
	"payment_method" "payment_method",
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_provider" varchar(50) DEFAULT 'paystack',
	"payment_reference" varchar(150),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_ref_unique" UNIQUE("booking_ref")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"state" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "landlords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_name" varchar(200),
	"verification_status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"verification_provider" varchar(50),
	"verification_reference" varchar(150),
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"bank_name" varchar(100),
	"bank_account_number_encrypted" text,
	"bank_account_name" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landlords_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landlord_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"distance_to_gate_meters" integer,
	"distance_to_faculty_meters" integer,
	"distance_to_market_meters" integer,
	"amenity_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"rules" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_lease_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"lease_type" "lease_duration" NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"block_name" varchar(100) NOT NULL,
	"room_number" varchar(20) NOT NULL,
	"room_type" "room_type" NOT NULL,
	"floor" varchar(20),
	"bathroom_type" "bathroom_type" NOT NULL,
	"furnished" "furnished_status" NOT NULL,
	"dimensions" varchar(50),
	"description" text,
	"status" "room_status" DEFAULT 'available' NOT NULL,
	"amenity_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"course" varchar(150) NOT NULL,
	"year_level" varchar(50) NOT NULL,
	"verification_status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"verification_provider" varchar(50),
	"verification_reference" varchar(150),
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"short_name" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"token" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landlords" ADD CONSTRAINT "landlords_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landlords" ADD CONSTRAINT "landlords_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlord_id_landlords_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."landlords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_lease_options" ADD CONSTRAINT "room_lease_options_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_rooms" ADD CONSTRAINT "saved_rooms_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_rooms" ADD CONSTRAINT "saved_rooms_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_amenity_category_label" ON "amenities" USING btree ("category","label");--> statement-breakpoint
CREATE INDEX "idx_bookings_student" ON "bookings" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_room" ON "bookings" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookings_payment_status" ON "bookings" USING btree ("payment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_bookings_payment_ref" ON "bookings" USING btree ("payment_reference");--> statement-breakpoint
CREATE INDEX "idx_landlords_verification" ON "landlords" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_properties_landlord" ON "properties" USING btree ("landlord_id");--> statement-breakpoint
CREATE INDEX "idx_properties_city" ON "properties" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "idx_properties_university" ON "properties" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "idx_properties_coords" ON "properties" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_lease_options_room" ON "room_lease_options" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_room_lease_type" ON "room_lease_options" USING btree ("room_id","lease_type");--> statement-breakpoint
CREATE INDEX "idx_rooms_property" ON "rooms" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "idx_rooms_status" ON "rooms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_rooms_type" ON "rooms" USING btree ("room_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_property_block_room" ON "rooms" USING btree ("property_id","block_name","room_number");--> statement-breakpoint
CREATE INDEX "idx_saved_rooms_student" ON "saved_rooms" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_saved_room_student_room" ON "saved_rooms" USING btree ("student_id","room_id");--> statement-breakpoint
CREATE INDEX "idx_students_university" ON "students" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "idx_students_verification" ON "students" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_universities_city" ON "universities" USING btree ("city_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_university_city_name" ON "universities" USING btree ("city_id","name");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_verification_tokens_user" ON "verification_tokens" USING btree ("user_id");